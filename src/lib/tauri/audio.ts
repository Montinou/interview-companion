/**
 * Tauri Audio Bridge — calls Rust backend for native audio capture
 * Falls back gracefully when not running in Tauri (e.g., web browser)
 */

// Check if we're running inside Tauri
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

interface AudioDevice {
  name: string;
  sampleRate: number | null;
  channels: number | null;
}

interface CaptureConfig {
  deepgramApiKey: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  internalApiKey: string;
  language: string;
}

interface CaptureStatus {
  isRecording: boolean;
}

/**
 * List available audio input devices
 */
export async function listAudioDevices(): Promise<AudioDevice[]> {
  if (!isTauri()) return [];
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<AudioDevice[]>('list_audio_devices');
}

/**
 * Start audio capture → Deepgram → analyze-chunk
 */
export async function startCapture(
  interviewId: number,
  config: CaptureConfig
): Promise<string> {
  if (!isTauri()) throw new Error('Not running in Tauri');
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<string>('start_capture', {
    interviewId,
    config,
  });
}

/**
 * Stop audio capture
 */
export async function stopCapture(): Promise<string> {
  if (!isTauri()) throw new Error('Not running in Tauri');
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<string>('stop_capture');
}

/**
 * Get capture status
 */
export async function getCaptureStatus(): Promise<CaptureStatus> {
  if (!isTauri()) return { isRecording: false };
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<CaptureStatus>('get_capture_status');
}

/**
 * Listen for transcript events from Rust
 */
export async function onTranscript(
  callback: (chunk: { speaker: string; text: string; timestamp: string; confidence: number }) => void
): Promise<() => void> {
  if (!isTauri()) return () => {};
  const { listen } = await import('@tauri-apps/api/event');
  const unlisten = await listen('transcript', (event) => {
    callback(event.payload as any);
  });
  return unlisten;
}

/**
 * Listen for capture error events
 */
export async function onCaptureError(
  callback: (error: { error: string }) => void
): Promise<() => void> {
  if (!isTauri()) return () => {};
  const { listen } = await import('@tauri-apps/api/event');
  const unlisten = await listen('capture-error', (event) => {
    callback(event.payload as any);
  });
  return unlisten;
}
