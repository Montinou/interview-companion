mod audio;

#[tauri::command]
async fn start_capture(
    app: tauri::AppHandle,
    interview_id: i64,
    config: serde_json::Value,
) -> Result<String, String> {
    audio::start_capture(app, interview_id, config)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn stop_capture(app: tauri::AppHandle) -> Result<String, String> {
    audio::stop_capture(app).await.map_err(|e| e.to_string())
}

#[tauri::command]
fn get_capture_status() -> serde_json::Value {
    audio::get_status()
}

#[tauri::command]
fn list_audio_devices() -> Result<Vec<serde_json::Value>, String> {
    audio::list_devices().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        // updater disabled until signing is configured
        // .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            start_capture,
            stop_capture,
            get_capture_status,
            list_audio_devices,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
