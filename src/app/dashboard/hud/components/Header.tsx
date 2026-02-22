'use client';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

type Props = {
  candidateName: string;
  jiraTicket: string;
  status: string;
  startTime: number | null;
  completedAt: number | null;
  transcriptCount: number;
  insightCount: number;
};

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function Header({ candidateName, jiraTicket, status, startTime, completedAt, transcriptCount, insightCount }: Props) {
  const isLive = status === 'live' || status === 'active';

  // For completed interviews: static duration = completedAt - startTime
  // For live interviews: elapsed ticks up from startTime to now
  const getStaticDuration = () => {
    if (!startTime) return '00:00:00';
    const endSec = completedAt || startTime;
    return formatDuration(endSec - startTime);
  };

  const [elapsed, setElapsed] = useState(isLive ? '00:00:00' : getStaticDuration());

  useEffect(() => {
    if (!isLive || !startTime) {
      // Non-live: set fixed duration and stop
      setElapsed(getStaticDuration());
      return;
    }
    // Live: tick every second
    const iv = setInterval(() => {
      setElapsed(formatDuration(Date.now() / 1000 - startTime));
    }, 1000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, startTime, completedAt]);

  return (
    <div className="h-10 flex items-center justify-between px-4 bg-card border-b border-border shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-foreground font-semibold">{candidateName}</span>
        <span className="text-muted-foreground text-sm">
          · QA Automation{jiraTicket ? ` · ${jiraTicket}` : ''}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">{transcriptCount} utt · {insightCount} insights</span>
        <Badge variant={isLive ? 'default' : 'secondary'} className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-muted-foreground'}`} />
          {isLive ? 'Live' : status}
        </Badge>
        <span className="text-foreground font-mono">{elapsed}</span>
      </div>
    </div>
  );
}
