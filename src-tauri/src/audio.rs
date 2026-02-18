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

#[cfg(target_os = "macos")]
use screencapturekit::prelude::*;

static IS_RECORDING: AtomicBool = AtomicBool::new(false);

lazy_static::lazy_static! {
    static ref STOP_TX: Mutex<Option<mpsc::Sender<()>>> = Mutex::new(None);
}

/// Target sample rate for Deepgram (16kHz mono PCM16)
const TARGET_SAMPLE_RATE: u32 = 16000;
const TARGET_CHANNELS: u16 = 1;

pub fn get_status() -> serde_json::Value {
    json!({ "isRecording": IS_RECORDING.load(Ordering::Acquire) })
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
    // P0 fix: atomic compare_exchange prevents race condition between concurrent calls
    if IS_RECORDING.compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire).is_err() {
        return Err(anyhow::anyhow!("Already recording"));
    }

    let auth_token = config["authToken"].as_str().unwrap_or("").to_string();
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

    // IS_RECORDING already set to true by compare_exchange above

    // Mixed audio channel — both mic and system audio send PCM16 mono 16kHz here
    let (audio_tx, audio_rx) = mpsc::channel::<Vec<u8>>(200);

    // === Audio capture strategy ===
    // macOS: ScreenCaptureKit captures BOTH system audio + mic (macOS 14+)
    // Other: cpal captures mic only (no system audio)
    
    #[cfg(target_os = "macos")]
    {
        let sck_tx = audio_tx.clone();
        let app_sck = app.clone();
        // Try ScreenCaptureKit first (captures mic + system audio together)
        tokio::spawn(async move {
            match run_system_audio_capture(sck_tx.clone(), &app_sck).await {
                Ok(()) => {
                    log::info!("ScreenCaptureKit capture ended normally");
                }
                Err(e) => {
                    log::error!("ScreenCaptureKit failed: {} — falling back to mic-only via cpal", e);
                    let _ = app_sck.emit("capture-warning", json!({ 
                        "message": format!("System audio unavailable ({}). Using mic only.", e),
                        "code": "SCK_FALLBACK"
                    }));
                    // Fallback: mic-only via cpal on a blocking thread
                    let mic_tx = sck_tx;
                    let app_mic = app_sck.clone();
                    tokio::task::spawn_blocking(move || {
                        if let Err(e2) = run_mic_capture(mic_tx, &app_mic) {
                            log::error!("Mic fallback also failed: {}", e2);
                            let _ = app_mic.emit("capture-error", json!({ "error": format!("Mic: {}", e2) }));
                        }
                    }).await.ok();
                }
            }
        });
    }

    #[cfg(not(target_os = "macos"))]
    {
        // Non-macOS: mic only via cpal
        let mic_tx = audio_tx.clone();
        let app_mic = app.clone();
        std::thread::spawn(move || {
            if let Err(e) = run_mic_capture(mic_tx, &app_mic) {
                log::error!("Mic capture error: {}", e);
                let _ = app_mic.emit("capture-error", json!({ "error": format!("Mic: {}", e) }));
            }
        });
        let _ = app.emit("capture-warning", json!({ 
            "message": "System audio capture not available — using microphone only" 
        }));
    }

    let _ = app.emit("capture-started", json!({ 
        "mic": true, 
        "systemAudio": cfg!(target_os = "macos") 
    }));

    // P0 fix: drop original audio_tx so audio_rx sees channel close when all producers finish
    drop(audio_tx);

    // === WebSocket + analysis on tokio ===
    let app_ws = app.clone();
    tokio::spawn(async move {
        if let Err(e) = run_websocket(
            audio_rx, stop_rx, &auth_token, &proxy_url,
            &language, &provider, &model,
            &supabase_url, &supabase_anon, &internal_key,
            interview_id, &app_ws,
        ).await {
            log::error!("WebSocket error: {}", e);
            let _ = app_ws.emit("capture-error", json!({ "error": e.to_string() }));
        }
        IS_RECORDING.store(false, Ordering::Release);
        let _ = app_ws.emit("capture-stopped", json!({}));
    });

    Ok("Capture started (mic + system audio)".to_string())
}

pub async fn stop_capture(_app: tauri::AppHandle) -> Result<String, anyhow::Error> {
    if !IS_RECORDING.load(Ordering::Acquire) {
        return Err(anyhow::anyhow!("Not recording"));
    }
    let tx = STOP_TX.lock().unwrap().take();
    if let Some(tx) = tx {
        let _ = tx.send(()).await;
    }
    IS_RECORDING.store(false, Ordering::Release);
    Ok("Capture stopped".to_string())
}

// ============================================================================
// Microphone capture via cpal
// ============================================================================

fn run_mic_capture(
    audio_tx: mpsc::Sender<Vec<u8>>,
    app: &tauri::AppHandle,
) -> Result<(), anyhow::Error> {
    let host = cpal::default_host();
    let device = host.default_input_device()
        .ok_or_else(|| anyhow::anyhow!("No input device found"))?;

    let device_name = device.name()?;
    log::info!("Mic device: {}", device_name);

    let supported_config = device.default_input_config()?;
    let source_rate = supported_config.sample_rate().0;
    let source_channels = supported_config.channels();
    log::info!("Mic config: {}Hz {}ch {:?}", source_rate, source_channels, supported_config.sample_format());

    let stream = match supported_config.sample_format() {
        SampleFormat::I16 => {
            let tx = audio_tx.clone();
            device.build_input_stream(
                &supported_config.into(),
                move |data: &[i16], _: &cpal::InputCallbackInfo| {
                    let resampled = resample_to_16k_mono_i16(data, source_rate, source_channels);
                    let bytes: Vec<u8> = resampled.iter().flat_map(|s| s.to_le_bytes()).collect();
                    let _ = tx.try_send(bytes);
                },
                |err| log::error!("Mic stream error: {}", err),
                None,
            )?
        }
        SampleFormat::F32 => {
            let tx = audio_tx.clone();
            device.build_input_stream(
                &supported_config.into(),
                move |data: &[f32], _: &cpal::InputCallbackInfo| {
                    // Convert f32 to i16 first
                    let i16_data: Vec<i16> = data.iter()
                        .map(|s| (*s * 32767.0).clamp(-32768.0, 32767.0) as i16)
                        .collect();
                    let resampled = resample_to_16k_mono_i16(&i16_data, source_rate, source_channels);
                    let bytes: Vec<u8> = resampled.iter().flat_map(|s| s.to_le_bytes()).collect();
                    let _ = tx.try_send(bytes);
                },
                |err| log::error!("Mic stream error: {}", err),
                None,
            )?
        }
        fmt => return Err(anyhow::anyhow!("Unsupported mic sample format: {:?}", fmt)),
    };

    stream.play()?;
    let _ = app.emit("mic-started", json!({ "device": device_name }));

    // Keep thread alive while recording
    while IS_RECORDING.load(Ordering::Acquire) {
        std::thread::sleep(std::time::Duration::from_millis(50));
    }

    drop(stream);
    Ok(())
}

// ============================================================================
// System audio capture via ScreenCaptureKit (macOS 12.3+)
// ============================================================================

#[cfg(target_os = "macos")]
struct SystemAudioHandler {
    audio_tx: mpsc::Sender<Vec<u8>>,
    source_rate: u32,
    source_channels: u16,
}

#[cfg(target_os = "macos")]
impl SCStreamOutputTrait for SystemAudioHandler {
    fn did_output_sample_buffer(&self, sample: CMSampleBuffer, output_type: SCStreamOutputType) {
        if output_type != SCStreamOutputType::Audio {
            return;
        }

        // Extract raw audio bytes from CMSampleBuffer
        if let Some(audio_data) = sample.audio_buffer_list() {
            let num = audio_data.num_buffers();
            for i in 0..num {
                if let Some(buf_ref) = audio_data.buffer(i) {
                    let raw_bytes: &[u8] = buf_ref.data();
                    if raw_bytes.is_empty() {
                        continue;
                    }

                    // ScreenCaptureKit delivers Float32 interleaved PCM
                    let f32_samples: Vec<f32> = raw_bytes
                        .chunks_exact(4)
                        .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
                        .collect();

                    // Convert to i16
                    let i16_samples: Vec<i16> = f32_samples
                        .iter()
                        .map(|s| (*s * 32767.0).clamp(-32768.0, 32767.0) as i16)
                        .collect();

                    // Resample to 16kHz mono
                    let resampled = resample_to_16k_mono_i16(
                        &i16_samples,
                        self.source_rate,
                        self.source_channels,
                    );

                    let bytes: Vec<u8> = resampled.iter().flat_map(|s| s.to_le_bytes()).collect();
                    let _ = self.audio_tx.try_send(bytes);
                }
            }
        }
    }
}

#[cfg(target_os = "macos")]
async fn run_system_audio_capture(
    audio_tx: mpsc::Sender<Vec<u8>>,
    app: &tauri::AppHandle,
) -> Result<(), anyhow::Error> {
    use screencapturekit::async_api::AsyncSCShareableContent;

    // Get shareable content (requires Screen Recording permission)
    let content = AsyncSCShareableContent::get().await
        .map_err(|e| anyhow::anyhow!("ScreenCaptureKit permission denied or unavailable: {}", e))?;

    let displays = content.displays();
    if displays.is_empty() {
        return Err(anyhow::anyhow!("No displays found for ScreenCaptureKit"));
    }
    let display = &displays[0];

    log::info!("ScreenCaptureKit: capturing system audio from display");

    // Configure for AUDIO ONLY — no video capture (saves resources)
    let filter = SCContentFilter::create()
        .with_display(display)
        .with_excluding_windows(&[])
        .build();

    let sck_sample_rate: u32 = 48000;
    let sck_channels: u16 = 1; // mono is enough for STT

    let config = SCStreamConfiguration::new()
        // Minimal video settings (can't fully disable video in SCK)
        .with_width(2)
        .with_height(2)
        .with_fps(1) // minimum fps to save resources
        // Audio settings — capture system audio + microphone
        .with_captures_audio(true)
        .with_captures_microphone(true) // macOS 14+: capture mic too!
        .with_excludes_current_process_audio(true) // exclude our own app sounds
        .with_sample_rate(sck_sample_rate as i32)
        .with_channel_count(sck_channels as i32);

    let handler = SystemAudioHandler {
        audio_tx,
        source_rate: sck_sample_rate,
        source_channels: sck_channels,
    };

    let mut stream = SCStream::new(&filter, &config);
    stream.add_output_handler(handler, SCStreamOutputType::Audio);
    stream.start_capture()
        .map_err(|e| anyhow::anyhow!("Failed to start ScreenCaptureKit: {}", e))?;

    let _ = app.emit("system-audio-started", json!({ 
        "sampleRate": sck_sample_rate,
        "channels": sck_channels 
    }));

    log::info!("ScreenCaptureKit system audio capture started ({}Hz {}ch)", sck_sample_rate, sck_channels);

    // Keep alive while recording
    while IS_RECORDING.load(Ordering::Acquire) {
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }

    stream.stop_capture()
        .map_err(|e| anyhow::anyhow!("Failed to stop ScreenCaptureKit: {}", e))?;

    Ok(())
}

// ============================================================================
// Audio utilities
// ============================================================================

/// Downsample multi-channel audio to 16kHz mono PCM16
/// Uses simple linear interpolation for resampling and channel averaging for mono
fn resample_to_16k_mono_i16(samples: &[i16], source_rate: u32, source_channels: u16) -> Vec<i16> {
    if samples.is_empty() {
        return Vec::new();
    }

    let channels = source_channels as usize;

    // Step 1: Mix to mono (average channels)
    let mono: Vec<i16> = if channels == 1 {
        samples.to_vec()
    } else {
        samples
            .chunks_exact(channels)
            .map(|frame| {
                let sum: i32 = frame.iter().map(|&s| s as i32).sum();
                (sum / channels as i32) as i16
            })
            .collect()
    };

    // Step 2: Resample if needed
    if source_rate == TARGET_SAMPLE_RATE {
        return mono;
    }

    let ratio = source_rate as f64 / TARGET_SAMPLE_RATE as f64;
    let output_len = (mono.len() as f64 / ratio) as usize;
    let mut output = Vec::with_capacity(output_len);

    for i in 0..output_len {
        let src_pos = i as f64 * ratio;
        let idx = src_pos as usize;
        let frac = src_pos - idx as f64;

        if idx + 1 < mono.len() {
            // Linear interpolation
            let a = mono[idx] as f64;
            let b = mono[idx + 1] as f64;
            output.push((a + (b - a) * frac) as i16);
        } else if idx < mono.len() {
            output.push(mono[idx]);
        }
    }

    output
}

// ============================================================================
// WebSocket — forward mixed audio to STT proxy
// ============================================================================

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
    // Build proxy WebSocket URL — encoding=linear16&sample_rate=16000 for pre-resampled audio
    let ws_url = format!(
        "{}/ws?provider={}&language={}&model={}&channels={}&sample_rate={}&encoding=linear16",
        proxy_url.replace("https://", "wss://").replace("http://", "ws://"),
        provider, language, model, TARGET_CHANNELS, TARGET_SAMPLE_RATE
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

    // P0 fix: 10s connection timeout prevents indefinite hang if proxy is unreachable
    let (ws_stream, _) = tokio::time::timeout(
        std::time::Duration::from_secs(10),
        connect_async(request),
    ).await
        .map_err(|_| anyhow::anyhow!("WebSocket connection timeout (10s) — STT proxy unreachable"))??;
    let (mut ws_tx, mut ws_rx) = ws_stream.split();

    log::info!("STT proxy connected (provider: {}, language: {}, rate: {}Hz)", provider, language, TARGET_SAMPLE_RATE);

    // Spawn transcript reader
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
                        _ => {}
                    }
                }
            }
        }
    });

    // Main loop: forward audio to proxy
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
