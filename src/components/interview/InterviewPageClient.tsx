'use client';

import { useState, useCallback } from 'react';
import { LiveHeader } from './LiveHeader';
import { SuggestionsPanel } from './SuggestionsPanel';
import { InsightsTimeline } from './InsightsTimeline';
import { StatsPanel } from './StatsPanel';
import { TranscriptModalWrapper } from './TranscriptModalWrapper';
import { ScorecardPanel } from './ScorecardPanel';
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

        {/* Left Column - Candidate Info & Actions (scroll on small screens) */}
        <div className="xl:col-span-3 min-h-0">
          <ScrollArea className="h-full">
            <div className="space-y-4 pr-3">
              {/* Candidate Card */}
              <Card className="bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-2.5">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">Candidato</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Entrevista #{interview.id}
                      </p>
                    </div>
                    <Badge variant={
                      interview.status === 'live' ? 'default' :
                      interview.status === 'completed' ? 'secondary' :
                      'outline'
                    }>
                      {interview.status}
                    </Badge>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Nombre</p>
                    <p className="font-medium">{interview.candidate.name}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Mail className="h-3 w-3" />
                      Email
                    </div>
                    <p className="text-sm font-medium break-all">
                      {interview.candidate.email}
                    </p>
                  </div>
                  {interview.candidate.phone && (
                    <div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Phone className="h-3 w-3" />
                        Teléfono
                      </div>
                      <p className="text-sm font-medium">
                        {interview.candidate.phone}
                      </p>
                    </div>
                  )}
                  {interview.candidate.jiraTicket && (
                    <div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <FileText className="h-3 w-3" />
                        Jira Ticket
                      </div>
                      <a
                        href={`https://distillery.atlassian.net/browse/${interview.candidate.jiraTicket}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-mono font-medium text-blue-600 hover:underline"
                      >
                        {interview.candidate.jiraTicket}
                      </a>
                    </div>
                  )}
                  {interview.scheduledAt && (
                    <div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Calendar className="h-3 w-3" />
                        Agendada
                      </div>
                      <p className="text-sm font-medium">
                        {new Date(interview.scheduledAt).toLocaleDateString(
                          'es-AR',
                          {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </p>
                    </div>
                  )}
                  {interview.profile && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Perfil</p>
                      <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                        {interview.profile.name}
                        {interview.profile.seniority && ` · ${interview.profile.seniority}`}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <Card className="bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Acciones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                      <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        variant="default"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Finalizar Entrevista
                      </Button>
                    </form>
                  )}

                  {interview.status === 'completed' && (
                    <div className="text-center py-4 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p className="font-medium text-green-600">
                        Entrevista completada
                      </p>
                      {interview.completedAt && (
                        <p className="text-sm">
                          {new Date(interview.completedAt).toLocaleString('es-AR')}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>

        {/* Center Column — Insights + Scorecard with internal scroll */}
        <div className="xl:col-span-6 min-h-0 flex flex-col gap-4">
          {/* Stats — compact, no scroll needed */}
          <div className="shrink-0">
            <ErrorBoundary name="Stats">
              <StatsPanel
                interviewId={interview.id}
                startedAt={interview.startedAt}
                status={interview.status}
              />
            </ErrorBoundary>
          </div>

          {/* Insights + Scorecard — share remaining space, each scrolls internally */}
          <div className="flex-1 min-h-0 flex flex-col gap-4">
            <div className="flex-1 min-h-0">
              <ErrorBoundary name="Insights">
                <InsightsTimeline interviewId={interview.id} isLive={isLive} />
              </ErrorBoundary>
            </div>

            {interview.status !== 'scheduled' && (
              <div className="shrink-0 max-h-[40%] overflow-y-auto rounded-lg">
                <ErrorBoundary name="Scorecard">
                  <ScorecardPanel interviewId={interview.id} />
                </ErrorBoundary>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Suggestions (scroll internal) */}
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
