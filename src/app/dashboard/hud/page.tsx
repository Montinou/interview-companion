'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Header from './components/Header';
import RadarScorecard from './components/RadarScorecard';
import UnifiedInsightsPanel from './components/UnifiedInsightsPanel';
import AIChatPanel from './components/AIChatPanel';
import PlanGuideTabbed from './components/PlanGuideTabbed';
import { TranscriptModalWrapper } from '@/components/interview/TranscriptModalWrapper';

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
  completedAt: string | null;
  candidateTitle?: string;
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
  const parsed: Record<string, any> = {};

  // Map suggestion field
  if (row.suggestion) parsed.follow_up = row.suggestion;
  
  // Map topic
  if (row.topic) parsed.topic = row.topic;
  
  // Map flags based on type
  if (row.type === 'red-flag') {
    parsed.flag = row.content;
    parsed.red_flags = [row.content];
  }
  if (row.type === 'green-flag') {
    parsed.green_flags = [row.content];
    parsed.insight = row.content;
  }
  if (row.type === 'contradiction') {
    parsed.red_flags = [row.content];
    parsed.flag = `⚡ ${row.content}`;
  }
  if (row.type === 'note' || row.type === 'suggestion') {
    parsed.insight = row.content;
  }
  
  // Map evidence, score, sentiment
  if (row.evidence) parsed.evidence = row.evidence;
  if (row.score) parsed.score = row.score;
  if (row.sentiment) parsed.sentiment = row.sentiment;
  if (row.response_quality) parsed.response_quality = row.response_quality;

  // Tier: flags and contradictions are "deep" (tier 2), rest are "fast" (tier 1)
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
  return (
    <Suspense fallback={<div className="h-screen bg-background flex items-center justify-center text-muted-foreground">Loading HUD...</div>}>
      <HudContent />
    </Suspense>
  );
}

function HudContent() {
  const searchParams = useSearchParams();
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [insights, setInsights] = useState<InsightEntry[]>([]);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [meta, setMeta] = useState<InterviewMeta | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [interviewId, setInterviewId] = useState<number | null>(
    searchParams?.get('interviewId') ? Number(searchParams.get('interviewId')) : null
  );

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
          setMeta({ ...d.interview, completedAt: d.interview.completedAt ?? null });
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

  // Fetch interview profile
  // NOTE: Direct Supabase queries here are SAFE because interviewId is already org-scoped
  // from getActiveInterview() (see src/lib/hud.ts which uses getOrgContext())
  useEffect(() => {
    if (!interviewId) return;
    
    const fetchProfile = async () => {
      try {
        const { data: interview } = await supabase
          .from('interviews')
          .select('profile_id, profile_override')
          .eq('id', interviewId)
          .single();

        if (interview?.profile_id) {
          const { data: profileData } = await supabase
            .from('interview_profiles')
            .select('*')
            .eq('id', interview.profile_id)
            .single();

          if (profileData) {
            // Merge override with profile
            const mergedProfile = {
              ...profileData,
              ...(interview.profile_override || {}),
            };
            setProfile(mergedProfile);
          }
        }
      } catch (e) {
        console.error('Failed to fetch profile:', e);
      }
    };

    fetchProfile();
  }, [interviewId]);

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

  const isLive = meta?.status === 'active';

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden text-foreground">
      {/* Header - fixed height */}
      <div className="shrink-0">
        <Header
          candidateName={meta?.candidateName || '...'}
          jiraTicket={meta?.jiraTicket || ''}
          status={meta?.status || 'loading'}
          startTime={startTimestamp}
          completedAt={meta?.completedAt ? new Date(meta.completedAt).getTime() / 1000 : null}
          transcriptCount={transcripts.length}
          insightCount={insights.length}
        />
      </div>

      {/* Main 3-column grid - fills remaining height */}
      <div className="flex-1 min-h-0 grid grid-cols-[25%_45%_30%] gap-2 px-2 pb-2">
        {/* LEFT COLUMN (25%) */}
        <div className="flex flex-col gap-2 min-h-0">
          {/* Radar Scorecard - 40% */}
          <div className="flex-[4] min-h-0">
            <RadarScorecard 
              scorecard={scorecard} 
              dimensions={profile?.evaluationDimensions} 
            />
          </div>
          
          {/* Plan/Guide/Notes Tabbed - 60% */}
          <div className="flex-[6] min-h-0">
            <PlanGuideTabbed
              interviewId={interviewId}
              candidateName={meta?.candidateName || '...'}
              candidateTitle={meta?.candidateTitle}
              jiraTicket={meta?.jiraTicket}
              profile={profile}
            />
          </div>
        </div>

        {/* CENTER COLUMN (45%) - Unified Insights */}
        <div className="min-h-0">
          <UnifiedInsightsPanel insights={insights} />
        </div>

        {/* RIGHT COLUMN (30%) - AI Chat */}
        <div className="min-h-0">
          <AIChatPanel interviewId={interviewId} />
        </div>
      </div>

      {/* Floating Transcript Button + Modal */}
      {interviewId && (
        <TranscriptModalWrapper
          interviewId={interviewId}
          isLive={isLive}
        />
      )}
    </div>
  );
}
