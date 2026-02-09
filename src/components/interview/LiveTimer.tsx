'use client';

import { useEffect, useState } from 'react';

interface LiveTimerProps {
  startedAt: string | null;
  status: string;
}

export function LiveTimer({ startedAt, status }: LiveTimerProps) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!startedAt) return;

    const startTime = new Date(startedAt).getTime();

    if (status === 'live') {
      const tick = () => setDuration(Math.floor((Date.now() - startTime) / 1000));
      tick();
      const iv = setInterval(tick, 1000);
      return () => clearInterval(iv);
    } else {
      // completed — show final duration
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }
  }, [startedAt, status]);

  const mins = Math.floor(duration / 60);
  const secs = duration % 60;

  return (
    <div className={`font-mono text-sm tabular-nums px-3 py-1 rounded-md ${
      status === 'live' 
        ? 'bg-red-500/10 text-red-400 border border-red-500/30' 
        : 'bg-gray-800 text-gray-400'
    }`}>
      ⏱ {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </div>
  );
}
