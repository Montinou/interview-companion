'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import RadarScorecard from './components/RadarScorecard';
import SuggestionsPanel from './components/SuggestionsPanel';
import InsightsTimeline from './components/InsightsTimeline';
import NotesPanel from './components/NotesPanel';
import TranscriptFooter from './components/TranscriptFooter';

export type TranscriptEntry = {
  time: string; timestamp: number; speaker: 'Host' | 'Guest';
  channel: number; text: string; confidence: number;
};

export type InsightEntry = {
  time: string; timestamp: number; tier: 1 | 2;
  trigger?: string; entry_count?: number;
  analysis: string; parsed?: Record<string, any>;
};

export type Scorecard = {
  actitud: number; comunicacion: number; tecnico: number;
  estrategico: number; liderazgo: number; ingles: number;
  recommendation?: string; justification?: string;
};

export type InterviewMeta = {
  id: number; status: string; candidateName: string;
  jiraTicket: string; startedAt: string | null;
};

export default function HudPage() {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [insights, setInsights] = useState<InsightEntry[]>([]);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [meta, setMeta] = useState<InterviewMeta | null>(null);

  const startTimestamp = meta?.startedAt
    ? new Date(meta.startedAt).getTime() / 1000
    : (transcripts[0]?.timestamp || null);

  const fetchData = useCallback(async () => {
    try {
      const [tRes, iRes, sRes] = await Promise.all([
        fetch('/api/hud/transcripts'),
        fetch('/api/hud/insights'),
        fetch('/api/hud/scorecard'),
      ]);
      if (tRes.ok) {
        const d = await tRes.json();
        setTranscripts(d.transcripts || []);
        if (d.interview) setMeta(d.interview);
      }
      if (iRes.ok) {
        const d = await iRes.json();
        setInsights(d.insights || []);
      }
      if (sRes.ok) {
        const d = await sRes.json();
        if (d.scorecard) setScorecard(d.scorecard);
      }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 2500);
    return () => clearInterval(iv);
  }, [fetchData]);

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] overflow-hidden text-gray-200">
      <Header
        candidateName={meta?.candidateName || '...'}
        jiraTicket={meta?.jiraTicket || ''}
        status={meta?.status || 'loading'}
        startTime={startTimestamp}
        transcriptCount={transcripts.length}
        insightCount={insights.length}
      />
      <div className="flex-1 grid grid-cols-[25%_40%_35%] gap-2 px-2 pt-2 min-h-0">
        <div className="flex flex-col gap-2 min-h-0">
          <RadarScorecard scorecard={scorecard} />
        </div>
        <div className="min-h-0">
          <SuggestionsPanel insights={insights.filter(i => i.tier === 1)} />
        </div>
        <div className="flex flex-col gap-2 min-h-0">
          <div className="flex-[6] min-h-0">
            <InsightsTimeline insights={insights} />
          </div>
          <div className="flex-[4] min-h-0">
            <NotesPanel />
          </div>
        </div>
      </div>
      <TranscriptFooter transcripts={transcripts} />
    </div>
  );
}
