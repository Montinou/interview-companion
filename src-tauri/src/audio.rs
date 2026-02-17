use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::SampleFormat;
use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::Emitter;
use tokio::sync::mpsc;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;

static IS_RECORDING: AtomicBool = AtomicBool::new(false);

lazy_static::lazy_static! {
    static ref STOP_TX: Mutex<Option<mpsc::Sender<()>>> = Mutex::new(None);
}

pub fn get_status() -> serde_json::Value {
    json!({ "isRecording": IS_RECORDING.load(Ordering::Relaxed) })
}

pub fn list_devices() -> Result<Vec<serde_json::Value>, anyhow::Error> {
    let host = cpal::default_host();
    let mut devices = Vec::new();
    for device in host.input_devices()? {
        if let Ok(name) = device.name() {
            let cfg = device.default_input_config().ok();
            devices.push(json!({
                "name": name,
                "sampleRate": cfg.as_ref().map(|c| c.sample_rate().0),
                "channels": cfg.as_ref().map(|c| c.channels()),
            }));
        }
    }
    Ok(devices)
}

pub async fn start_capture(
    app: tauri::AppHandle,
    interview_id: i64,
    config: serde_json::Value,
) -> Result<String, anyhow::Error> {
    if IS_RECORDING.load(Ordering::Relaxed) {
        return Err(anyhow::anyhow!("Already recording"));
    }

    // Auth token (Clerk JWT) for the STT proxy
    let auth_token = config["authToken"].as_str().unwrap_or("").to_string();
    // STT proxy URL (Cloudflare Worker)
    let proxy_url = config["sttProxyUrl"].as_str()
        .unwrap_or("https://interview-stt-proxy.agusmontoya.workers.dev")
        .to_string();
    let language = config["language"].as_str().unwrap_or("en").to_string();
    let provider = config["provider"].as_str().unwrap_or("deepgram").to_string();
    let model = config["model"].as_str().unwrap_or("nova-3").to_string();
    let supabase_url = config["supabaseUrl"].as_str().unwrap_or("").to_string();
    let supabase_anon = config["supabaseAnonKey"].as_str().unwrap_or("").to_string();
    let internal_key = config["internalApiKey"].as_str().unwrap_or("").to_string();

    let (stop_tx, stop_rx) = mpsc::channel::<()>(1);
    *STOP_TX.lock().unwrap() = Some(stop_tx);

    IS_RECORDING.store(true, Ordering::Relaxed);

    // Audio capture channel — audio thread sends bytes here
    let (audio_tx, audio_rx) = mpsc::channel::<Vec<u8>>(100);

    // Spawn audio capture on a dedicated OS thread (cpal::Stream is !Send)
    let app_clone = app.clone();
    std::thread::spawn(move || {
        if let Err(e) = run_audio_thread(audio_tx, &app_clone) {
            log::error!("Audio thread error: {}", e);
            let _ = app_clone.emit("capture-error", json!({ "error": e.to_string() }));
            IS_RECORDING.store(false, Ordering::Relaxed);
        }
    });

    // Spawn WebSocket + analysis on tokio
    let app_clone2 = app.clone();
    tokio::spawn(async move {
        if let Err(e) = run_websocket(
            audio_rx, stop_rx, &auth_token, &proxy_url,
            &language, &provider, &model,
            &supabase_url, &supabase_anon, &internal_key,
            interview_id, &app_clone2,
        ).await {
            log::error!("WebSocket error: {}", e);
            let _ = app_clone2.emit("capture-error", json!({ "error": e.to_string() }));
        }
        IS_RECORDING.store(false, Ordering::Relaxed);
        let _ = app_clone2.emit("capture-stopped", json!({}));
    });

    Ok("Capture started".to_string())
}

pub async fn stop_capture(_app: tauri::AppHandle) -> Result<String, anyhow::Error> {
    if !IS_RECORDING.load(Ordering::Relaxed) {
        return Err(anyhow::anyhow!("Not recording"));
    }
    let tx = STOP_TX.lock().unwrap().take();
    if let Some(tx) = tx {
        let _ = tx.send(()).await;
    }
    IS_RECORDING.store(false, Ordering::Relaxed);
    Ok("Capture stopped".to_string())
}

/// Runs on a dedicated OS thread — captures audio via cpal and sends PCM bytes
fn run_audio_thread(
    audio_tx: mpsc::Sender<Vec<u8>>,
    app: &tauri::AppHandle,
) -> Result<(), anyhow::Error> {
    let host = cpal::default_host();
    let device = host.default_input_device()
        .ok_or_else(|| anyhow::anyhow!("No input device"))?;

    let device_name = device.name()?;
    log::info!("Audio device: {}", device_name);
    let _ = app.emit("capture-started", json!({ "device": device_name }));

    let config = device.default_input_config()?;
    log::info!("Audio: {}Hz {}ch {:?}", config.sample_rate().0, config.channels(), config.sample_format());

    let stream = match config.sample_format() {
        SampleFormat::I16 => {
            let tx = audio_tx.clone();
            device.build_input_stream(
                &config.into(),
                move |data: &[i16], _: &cpal::InputCallbackInfo| {
                    let bytes: Vec<u8> = data.iter().flat_map(|s| s.to_le_bytes()).collect();
                    let _ = tx.try_send(bytes);
                },
                |err| log::error!("Audio error: {}", err),
                None,
            )?
        }
        SampleFormat::F32 => {
            let tx = audio_tx.clone();
            device.build_input_stream(
                &config.into(),
                move |data: &[f32], _: &cpal::InputCallbackInfo| {
                    let bytes: Vec<u8> = data.iter()
                        .map(|s| (*s * 32767.0) as i16)
                        .flat_map(|s| s.to_le_bytes())
                        .collect();
                    let _ = tx.try_send(bytes);
                },
                |err| log::error!("Audio error: {}", err),
                None,
            )?
        }
        fmt => return Err(anyhow::anyhow!("Unsupported format: {:?}", fmt)),
    };

    stream.play()?;

    // Keep thread alive while recording
    while IS_RECORDING.load(Ordering::Relaxed) {
        std::thread::sleep(std::time::Duration::from_millis(100));
    }

    drop(stream);
    log::info!("Audio thread stopped");
    Ok(())
}

/// Runs on tokio — connects to STT proxy (Cloudflare Worker), forwards audio, dispatches transcripts
async fn run_websocket(
    mut audio_rx: mpsc::Receiver<Vec<u8>>,
    mut stop_rx: mpsc::Receiver<()>,
    auth_token: &str,
    proxy_url: &str,
    language: &str,
    provider: &str,
    model: &str,
    supabase_url: &str,
    supabase_anon: &str,
    internal_key: &str,
    interview_id: i64,
    app: &tauri::AppHandle,
) -> Result<(), anyhow::Error> {
    // Build proxy WebSocket URL
    let ws_url = format!(
        "{}/ws?provider={}&language={}&model={}&channels=1",
        proxy_url.replace("https://", "wss://").replace("http://", "ws://"),
        provider, language, model
    );

    let request = tokio_tungstenite::tungstenite::http::Request::builder()
        .uri(&ws_url)
        .header("Authorization", format!("Bearer {}", auth_token))
        .header("Host", proxy_url.replace("https://", "").replace("http://", ""))
        .header("Connection", "Upgrade")
        .header("Upgrade", "websocket")
        .header("Sec-WebSocket-Version", "13")
        .header("Sec-WebSocket-Key", tokio_tungstenite::tungstenite::handshake::client::generate_key())
        .body(())?;

    let (ws_stream, _) = connect_async(request).await?;
    let (mut ws_tx, mut ws_rx) = ws_stream.split();

    log::info!("STT proxy connected (provider: {}, language: {})", provider, language);

    // Spawn transcript reader — proxy normalizes all providers to same format
    let supabase_url = supabase_url.to_string();
    let supabase_anon = supabase_anon.to_string();
    let internal_key = internal_key.to_string();
    let app_clone = app.clone();

    let reader = tokio::spawn(async move {
        let client = reqwest::Client::new();
        while let Some(Ok(msg)) = ws_rx.next().await {
            if let Message::Text(text) = msg {
                if let Ok(data) = serde_json::from_str::<serde_json::Value>(&text) {
                    match data["type"].as_str() {
                        Some("transcript") if data["is_final"] == true => {
                            let transcript = data["text"].as_str().unwrap_or("");
                            if transcript.is_empty() { continue; }

                            // Extract speaker from words array (Deepgram diarization)
                            let speaker = data["words"]
                                .as_array()
                                .and_then(|w| w.first())
                                .and_then(|w| w["speaker"].as_i64())
                                .unwrap_or(0);

                            let chunk = json!({
                                "speaker": format!("speaker_{}", speaker),
                                "text": transcript,
                                "timestamp": chrono::Utc::now().to_rfc3339(),
                                "confidence": data["confidence"].as_f64().unwrap_or(0.9),
                                "provider": data["provider"],
                            });

                            let _ = app_clone.emit("transcript", &chunk);

                            // Send to analyze-chunk Edge Function
                            let _ = client.post(format!("{}/functions/v1/analyze-chunk", supabase_url))
                                .header("Authorization", format!("Bearer {}", supabase_anon))
                                .header("x-internal-key", &internal_key)
                                .json(&json!({ "interviewId": interview_id, "chunk": chunk }))
                                .send()
                                .await;
                        }
                        Some("provider_switch") => {
                            log::warn!("STT provider failover: {} → {}",
                                data["from"].as_str().unwrap_or("?"),
                                data["to"].as_str().unwrap_or("?"));
                            let _ = app_clone.emit("provider-switch", &data);
                        }
                        Some("error") => {
                            log::error!("STT proxy error: {}", data["message"].as_str().unwrap_or("unknown"));
                            let _ = app_clone.emit("capture-error", &data);
                        }
                        Some("connected") => {
                            log::info!("STT proxy confirmed connection: provider={}", 
                                data["provider"].as_str().unwrap_or("?"));
                        }
                        _ => {} // ignore interim results, metadata, etc.
                    }
                }
            }
        }
    });

    // Main loop: forward audio to proxy → provider
    loop {
        tokio::select! {
            Some(audio) = audio_rx.recv() => {
                if ws_tx.send(Message::Binary(audio)).await.is_err() { break; }
            }
            _ = stop_rx.recv() => {
                log::info!("Stop signal received");
                let _ = ws_tx.close().await;
                break;
            }
        }
    }

    reader.abort();
    Ok(())
}
