/**
 * Tauri Audio Bridge — calls Rust backend for native audio capture
 * Audio → CF Worker (STT Proxy) → STT Provider → Transcripts → analyze-chunk
 * Falls back gracefully when not running in Tauri (e.g., web browser)
 */

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

interface AudioDevice {
  name: string;
  sampleRate: number | null;
  channels: number | null;
}

interface CaptureConfig {
  /** Clerk JWT for authenticating with the STT proxy */
  authToken: string;
  /** STT proxy URL (Cloudflare Worker) */
  sttProxyUrl?: string;
  /** STT provider: deepgram | assemblyai | revai */
  provider?: string;
  /** STT model (e.g., nova-3 for Deepgram) */
  model?: string;
  /** Transcription language */
  language: string;
  /** Supabase project URL */
  supabaseUrl: string;
  /** Supabase publishable key */
  supabaseAnonKey: string;
  /** Internal API key for Edge Functions */
  internalApiKey: string;
}

interface CaptureStatus {
  isRecording: boolean;
}

interface TranscriptChunk {
  speaker: string;
  text: string;
  timestamp: string;
  confidence: number;
  provider?: string;
}

interface ProviderSwitch {
  from: string;
  to: string;
  reason: string;
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
 * Start audio capture → STT Proxy → Provider → analyze-chunk
 */
export async function startCapture(
  interviewId: number,
  config: CaptureConfig
): Promise<string> {
  if (!isTauri()) throw new Error('Not running in Tauri');
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<string>('start_capture', {
    interviewId,
    config: {
      authToken: config.authToken,
      sttProxyUrl: config.sttProxyUrl || 'https://interview-stt-proxy.agusmontoya.workers.dev',
      provider: config.provider || 'deepgram',
      model: config.model || 'nova-3',
      language: config.language,
      supabaseUrl: config.supabaseUrl,
      supabaseAnonKey: config.supabaseAnonKey,
      internalApiKey: config.internalApiKey,
    },
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
  callback: (chunk: TranscriptChunk) => void
): Promise<() => void> {
  if (!isTauri()) return () => {};
  const { listen } = await import('@tauri-apps/api/event');
  const unlisten = await listen('transcript', (event) => {
    callback(event.payload as TranscriptChunk);
  });
  return unlisten;
}

/**
 * Listen for provider failover events
 */
export async function onProviderSwitch(
  callback: (data: ProviderSwitch) => void
): Promise<() => void> {
  if (!isTauri()) return () => {};
  const { listen } = await import('@tauri-apps/api/event');
  const unlisten = await listen('provider-switch', (event) => {
    callback(event.payload as ProviderSwitch);
  });
  return unlisten;
}

/**
 * Listen for capture error events
 */
export async function onCaptureError(
  callback: (error: { error?: string; message?: string; code?: string }) => void
): Promise<() => void> {
  if (!isTauri()) return () => {};
  const { listen } = await import('@tauri-apps/api/event');
  const unlisten = await listen('capture-error', (event) => {
    callback(event.payload as any);
  });
  return unlisten;
}
