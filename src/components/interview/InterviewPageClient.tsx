'use client';

import { useState, useCallback } from 'react';
import { LiveHeader } from './LiveHeader';
import { SuggestionsPanel } from './SuggestionsPanel';
import { InsightsTimeline } from './InsightsTimeline';
import { StatsPanel } from './StatsPanel';
import { TranscriptModalWrapper } from './TranscriptModalWrapper';
import { ScorecardPanel } from './ScorecardPanel';
import { RadarScorecard } from './RadarScorecard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Link from 'next/link';
import { ArrowLeft, Play, CheckCircle, User, Mail, Phone, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

type LanguageCode = 'es' | 'en' | 'multi';

interface InterviewData {
  id: number;
  status: string;
  language: string | null;
  startedAt: string | null;
  completedAt: string | null;
  scheduledAt: string | null;
  candidate: {
    name: string;
    email: string | null;
    phone: string | null;
    jiraTicket: string | null;
  };
  profile?: {
    name: string;
    seniority: string | null;
  } | null;
}

interface InterviewPageClientProps {
  interview: InterviewData;
  updateStatusAction: (id: number, status: 'scheduled' | 'live' | 'completed' | 'cancelled') => Promise<void>;
  updateLanguageAction: (id: number, language: string) => Promise<void>;
}

export function InterviewPageClient({
  interview,
  updateStatusAction,
  updateLanguageAction,
}: InterviewPageClientProps) {
  const [language, setLanguage] = useState<LanguageCode>(
    (interview.language as LanguageCode) || 'es'
  );

  const isLive = interview.status === 'live';

  const handleLanguageChange = useCallback(
    async (newLang: LanguageCode) => {
      setLanguage(newLang);
      try {
        await updateLanguageAction(interview.id, newLang);
      } catch (e) {
        console.error('Failed to update language:', e);
      }
    },
    [interview.id, updateLanguageAction]
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Fixed top section: back link + header */}
      <div className="shrink-0 px-4 lg:px-6 pt-4 space-y-4">
        <Link
          href="/dashboard/interviews"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Entrevistas
        </Link>

        <LiveHeader
          candidateName={interview.candidate.name}
          position={
            interview.candidate.jiraTicket
              ? `QA · ${interview.candidate.jiraTicket}`
              : 'QA Automation Engineer'
          }
          status={interview.status}
          startedAt={interview.startedAt}
          language={language}
          onLanguageChange={handleLanguageChange}
        />
      </div>

      {/* Main grid — fills remaining viewport, each column scrolls internally */}
      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-4 px-4 lg:px-6 py-4">

        {/* Left Column: Candidate → Radar Scorecard → Actions */}
        <div className="xl:col-span-3 min-h-0">
          <ScrollArea className="h-full">
            <div className="space-y-4 pr-3">
              {/* Candidate Card — compact */}
              <Card className="bg-card/50 backdrop-blur-sm">
                <CardContent className="pt-5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{interview.candidate.name}</p>
                      <p className="text-xs text-muted-foreground">Entrevista #{interview.id}</p>
                    </div>
                    <Badge variant={
                      interview.status === 'live' ? 'default' :
                      interview.status === 'completed' ? 'secondary' :
                      'outline'
                    }>
                      {interview.status}
                    </Badge>
                  </div>

                  {interview.candidate.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{interview.candidate.email}</span>
                    </div>
                  )}
                  {interview.candidate.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3 shrink-0" />
                      <span>{interview.candidate.phone}</span>
                    </div>
                  )}
                  {interview.candidate.jiraTicket && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <a
                        href={`https://distillery.atlassian.net/browse/${interview.candidate.jiraTicket}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-blue-500 hover:underline"
                      >
                        {interview.candidate.jiraTicket}
                      </a>
                    </div>
                  )}
                  {interview.profile && (
                    <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                      {interview.profile.name}
                      {interview.profile.seniority && ` · ${interview.profile.seniority}`}
                    </Badge>
                  )}
                </CardContent>
              </Card>

              {/* Radar Scorecard (spider chart) */}
              {interview.status !== 'scheduled' && (
                <ErrorBoundary name="Radar">
                  <RadarScorecard interviewId={interview.id} isLive={isLive} />
                </ErrorBoundary>
              )}

              {/* Actions */}
              <Card className="bg-card/50 backdrop-blur-sm">
                <CardContent className="pt-5 space-y-3">
                  {interview.status === 'scheduled' && (
                    <form
                      action={() => updateStatusAction(interview.id, 'live')}
                      className="w-full"
                    >
                      <Button type="submit" className="w-full" size="lg">
                        <Play className="h-4 w-4" />
                        Iniciar Entrevista
                      </Button>
                    </form>
                  )}

                  {interview.status === 'live' && (
                    <form
                      action={() => updateStatusAction(interview.id, 'completed')}
                      className="w-full"
                    >
                      <Button type="submit" className="w-full" size="lg" variant="default">
                        <CheckCircle className="h-4 w-4" />
                        Finalizar Entrevista
                      </Button>
                    </form>
                  )}

                  {interview.status === 'completed' && (
                    <div className="text-center py-3">
                      <CheckCircle className="h-6 w-6 mx-auto mb-1.5 text-green-500" />
                      <p className="font-medium text-green-600 text-sm">Entrevista completada</p>
                      {interview.completedAt && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(interview.completedAt).toLocaleString('es-AR')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Scorecard edit (1-10 sliders) below actions for completed interviews */}
                  {interview.status === 'completed' && (
                    <ErrorBoundary name="Scorecard">
                      <ScorecardPanel interviewId={interview.id} />
                    </ErrorBoundary>
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>

        {/* Center Column — Stats + Insights (full height for insights) */}
        <div className="xl:col-span-6 min-h-0 flex flex-col gap-4">
          <div className="shrink-0">
            <ErrorBoundary name="Stats">
              <StatsPanel
                interviewId={interview.id}
                startedAt={interview.startedAt}
                status={interview.status}
              />
            </ErrorBoundary>
          </div>

          <div className="flex-1 min-h-0">
            <ErrorBoundary name="Insights">
              <InsightsTimeline interviewId={interview.id} isLive={isLive} />
            </ErrorBoundary>
          </div>
        </div>

        {/* Right Column — Suggestions (scroll internal) */}
        <div className="xl:col-span-3 min-h-0">
          <ErrorBoundary name="Suggestions">
            <SuggestionsPanel interviewId={interview.id} isLive={isLive} />
          </ErrorBoundary>
        </div>
      </div>

      {/* Transcript Modal + Floating Button */}
      <ErrorBoundary name="Transcript">
        <TranscriptModalWrapper interviewId={interview.id} isLive={isLive} />
      </ErrorBoundary>
    </div>
  );
}
