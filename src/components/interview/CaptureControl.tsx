'use client';

import { useState, useEffect, useCallback } from 'react';
import { isTauri, startCapture, stopCapture, getCaptureStatus, onCaptureError } from '@/lib/tauri/audio';

interface CaptureControlProps {
  interviewId: number | null;
  config: {
    authToken: string;
    sttProxyUrl?: string;
    provider?: string;
    model?: string;
    supabaseUrl: string;
    supabaseAnonKey: string;
    internalApiKey: string;
  } | null;
  language?: string;
  onStarted?: () => void;
  onStopped?: () => void;
  onError?: (error: string) => void;
}

export default function CaptureControl({
  interviewId,
  config,
  language = 'en',
  onStarted,
  onStopped,
  onError,
}: CaptureControlProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTauriApp, setIsTauriApp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsTauriApp(isTauri());

    // Check current status
    getCaptureStatus().then((status) => {
      setIsRecording(status.isRecording);
    });

    // Listen for errors
    let cleanup: (() => void) | undefined;
    onCaptureError((err) => {
      setError(err.error || err.message || 'Unknown capture error');
      setIsRecording(false);
      onError?.(err.error || err.message || 'Unknown capture error');
    }).then((fn) => { cleanup = fn; });

    return () => cleanup?.();
  }, [onError]);

  const handleStart = useCallback(async () => {
    if (!interviewId || !config) return;

    setError(null);
    try {
      await startCapture(interviewId, { ...config, language });
      setIsRecording(true);
      onStarted?.();
    } catch (err: any) {
      setError(err.message || String(err));
      onError?.(err.message || String(err));
    }
  }, [interviewId, config, language, onStarted, onError]);

  const handleStop = useCallback(async () => {
    try {
      await stopCapture();
      setIsRecording(false);
      onStopped?.();
    } catch (err: any) {
      setError(err.message || String(err));
    }
  }, [onStopped]);

  if (!isTauriApp) {
    return (
      <div className="text-xs text-gray-500 px-2 py-1">
        Audio capture available in desktop app
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isRecording ? (
        <button
          onClick={handleStop}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <span className="w-2 h-2 bg-white rounded-sm" />
          Stop Recording
        </button>
      ) : (
        <button
          onClick={handleStart}
          disabled={!interviewId || !config}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
          Start Recording
        </button>
      )}
      {error && (
        <span className="text-xs text-red-400">{error}</span>
      )}
    </div>
  );
}
