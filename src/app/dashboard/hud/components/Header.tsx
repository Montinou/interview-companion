'use client';
import { useState, useEffect } from 'react';

type Props = {
  candidateName: string;
  jiraTicket: string;
  status: string;
  startTime: number | null;
  transcriptCount: number;
  insightCount: number;
};

export default function Header({ candidateName, jiraTicket, status, startTime, transcriptCount, insightCount }: Props) {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    if (!startTime) return;
    const iv = setInterval(() => {
      const s = Math.floor(Date.now() / 1000 - startTime);
      setElapsed(
        `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(iv);
  }, [startTime]);

  const isLive = status === 'live';

  return (
    <div className="h-10 flex items-center justify-between px-4 bg-[#111118] border-b border-gray-800 shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-white font-semibold">{candidateName}</span>
        <span className="text-gray-500 text-sm">
          · QA Automation{jiraTicket ? ` · ${jiraTicket}` : ''}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-500">{transcriptCount} utt · {insightCount} insights</span>
        <span className={`flex items-center gap-1 ${isLive ? 'text-green-400' : 'text-gray-400'}`}>
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
          {isLive ? 'Live' : status}
        </span>
        <span className="text-white font-mono">{elapsed}</span>
      </div>
    </div>
  );
}
