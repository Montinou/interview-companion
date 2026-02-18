'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import CaptureControl from './CaptureControl';
import { isTauri } from '@/lib/tauri/audio';

interface LiveCaptureWrapperProps {
  interviewId: number;
  language: string;
}

/**
 * Wraps CaptureControl with Clerk auth context.
 * Only renders in Tauri (desktop app) — invisible in browser.
 * Gets a fresh JWT token for the STT proxy authentication.
 */
export function LiveCaptureWrapper({ interviewId, language }: LiveCaptureWrapperProps) {
  const { getToken } = useAuth();
  const [config, setConfig] = useState<{
    authToken: string;
    supabaseUrl: string;
    supabaseAnonKey: string;
    internalApiKey: string;
  } | null>(null);
  const [isTauriApp, setIsTauriApp] = useState(false);

  useEffect(() => {
    setIsTauriApp(isTauri());
  }, []);

  useEffect(() => {
    if (!isTauriApp) return;

    async function loadConfig() {
      try {
        const token = await getToken();
        if (!token) return;

        // Fetch config from our own API (same as extension config but with auth)
        const res = await fetch('/api/extension/config', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;
        const data = await res.json();

        setConfig({
          authToken: token,
          supabaseUrl: data.config.supabaseUrl,
          supabaseAnonKey: data.config.supabaseAnonKey,
          // internalApiKey is NOT exposed to clients — analyze-chunk uses supabase anon key
          internalApiKey: '',
        });
      } catch (err) {
        console.error('Failed to load capture config:', err);
      }
    }

    loadConfig();
  }, [isTauriApp, getToken]);

  // Don't render anything in browser
  if (!isTauriApp) return null;

  return (
    <CaptureControl
      interviewId={interviewId}
      config={config}
      language={language}
    />
  );
}
