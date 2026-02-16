'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
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

// Transform DB transcript row to HUD format
function dbTranscriptToHud(row: any): TranscriptEntry {
  const ts = new Date(row.timestamp);
  return {
    time: ts.toISOString().substring(11, 19),
    timestamp: ts.getTime() / 1000,
    speaker: (row.speaker_role === 'guest' || row.speaker === 'candidate') ? 'Guest' : 'Host',
    channel: (row.speaker_role === 'guest' || row.speaker === 'candidate') ? 1 : 0,
    text: row.text,
    confidence: (row.confidence || 95) / 100,
  };
}

// Transform DB insight row to HUD format
function dbInsightToHud(row: any): InsightEntry {
  const ts = new Date(row.timestamp);
  const isSuggestion = row.type === 'suggestion';
  const parsed: Record<string, any> = {};

  if (isSuggestion && row.suggestion) parsed.follow_up = row.suggestion;
  if (row.topic) parsed.topic = row.topic;
  if (row.type === 'red-flag') {
    parsed.flag = row.content;
    parsed.red_flags = [row.content];
  }
  if (row.type === 'green-flag') {
    parsed.green_flags = [row.content];
    parsed.insight = row.content;
  }
  if (row.evidence) parsed.evidence = row.evidence;
  if (row.score) parsed.score = row.score;
  if (row.sentiment) parsed.sentiment = row.sentiment;

  const tier = (row.type === 'red-flag' || row.type === 'green-flag' || row.type === 'contradiction') ? 2 : 1;

  return {
    time: ts.toISOString().substring(11, 19),
    timestamp: ts.getTime() / 1000,
    tier,
    trigger: row.content?.substring(0, 100) || '',
    analysis: JSON.stringify(parsed),
    parsed,
  };
}

export default function HudPage() {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [insights, setInsights] = useState<InsightEntry[]>([]);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [meta, setMeta] = useState<InterviewMeta | null>(null);
  const [interviewId, setInterviewId] = useState<number | null>(null);

  const startTimestamp = meta?.startedAt
    ? new Date(meta.startedAt).getTime() / 1000
    : (transcripts[0]?.timestamp || null);

  // Initial load via API (keeps existing HUD API routes working)
  const fetchInitialData = useCallback(async () => {
    try {
      const [tRes, iRes, sRes] = await Promise.all([
        fetch('/api/hud/transcripts'),
        fetch('/api/hud/insights'),
        fetch('/api/hud/scorecard'),
      ]);
      if (tRes.ok) {
        const d = await tRes.json();
        setTranscripts(d.transcripts || []);
        if (d.interview) {
          setMeta(d.interview);
          setInterviewId(d.interview.id);
        }
      }
      if (iRes.ok) {
        const d = await iRes.json();
        setInsights(d.insights || []);
      }
      if (sRes.ok) {
        const d = await sRes.json();
        if (d.scorecard) setScorecard(d.scorecard);
      }
    } catch (e) { console.error('Initial fetch error:', e); }
  }, []);

  // Initial load
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Supabase Realtime subscriptions — once we know the interview ID
  useEffect(() => {
    if (!interviewId) return;

    // Subscribe to new transcripts
    const transcriptChannel = supabase
      .channel(`transcripts-${interviewId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'transcripts',
        filter: `interview_id=eq.${interviewId}`,
      }, (payload) => {
        const newEntry = dbTranscriptToHud(payload.new);
        setTranscripts(prev => [...prev, newEntry]);
      })
      .subscribe();

    // Subscribe to new insights
    const insightChannel = supabase
      .channel(`insights-${interviewId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_insights',
        filter: `interview_id=eq.${interviewId}`,
      }, (payload) => {
        const newEntry = dbInsightToHud(payload.new);
        setInsights(prev => [...prev, newEntry]);
      })
      .subscribe();

    // Subscribe to scorecard changes (upsert)
    const scorecardChannel = supabase
      .channel(`scorecard-${interviewId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'scorecards',
        filter: `interview_id=eq.${interviewId}`,
      }, (payload) => {
        const s = payload.new as any;
        if (s) {
          setScorecard({
            actitud: s.attitude,
            comunicacion: s.communication,
            tecnico: s.technical,
            estrategico: s.strategic,
            liderazgo: s.leadership,
            ingles: s.english,
            recommendation: s.recommendation,
            justification: s.summary,
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(transcriptChannel);
      supabase.removeChannel(insightChannel);
      supabase.removeChannel(scorecardChannel);
    };
  }, [interviewId]);

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
