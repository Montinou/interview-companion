import { currentUser } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { interviews } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft, Play, CheckCircle, User, Mail, Phone, FileText, Calendar } from 'lucide-react';
import { updateInterviewStatus } from '@/app/actions/interviews';
import { LiveHeader } from '@/components/interview/LiveHeader';
import { SuggestionsPanel } from '@/components/interview/SuggestionsPanel';
import { InsightsTimeline } from '@/components/interview/InsightsTimeline';
import { StatsPanel } from '@/components/interview/StatsPanel';
import { TranscriptPanel } from '@/components/interview/TranscriptPanel';
import { ScorecardPanel } from '@/components/interview/ScorecardPanel';
import { RadarScorecard } from '@/components/interview/RadarScorecard';
import { Button } from '@/components/ui-button';

// Force dynamic rendering — never cache this page
export const dynamic = 'force-dynamic';

/**
 * Interview detail page using query params instead of dynamic route.
 * Workaround for Vercel [id] route 404 issue.
 * URL: /dashboard/interview?id=4
 * Version: 2
 */
export default async function InterviewDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const user = await currentUser();
  const { id } = await searchParams;
  
  if (!user) {
    redirect('/sign-in');
  }

  if (!id) {
    redirect('/dashboard/interviews');
  }

  const interview = await db.query.interviews.findFirst({
    where: eq(interviews.id, parseInt(id)),
    with: {
      candidate: true,
      interviewer: true,
    },
  });

  if (!interview) {
    notFound();
  }

  const isLive = interview.status === 'live';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <div className="max-w-[1800px] mx-auto p-4 lg:p-6 space-y-6">
        {/* Back Link */}
        <Link
          href="/dashboard/interviews"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Entrevistas
        </Link>

        {/* Live Header */}
        <LiveHeader
          candidateName={interview.candidate.name}
          position={interview.candidate.jiraTicket ? `QA · ${interview.candidate.jiraTicket}` : 'QA Automation Engineer'}
          status={interview.status}
          startedAt={interview.startedAt?.toISOString() || null}
        />

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column - Candidate Info & Actions */}
          <div className="xl:col-span-3 space-y-6">
            {/* Candidate Card */}
            <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-6 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-2.5">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Candidato</h3>
                  <p className="text-xs text-muted-foreground">Entrevista #{interview.id}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Nombre</p>
                  <p className="font-medium">{interview.candidate.name}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </div>
                  <p className="text-sm font-medium break-all">{interview.candidate.email}</p>
                </div>
                {interview.candidate.phone && (
                  <div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Phone className="h-3 w-3" />
                      Teléfono
                    </div>
                    <p className="text-sm font-medium">{interview.candidate.phone}</p>
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
                      {new Date(interview.scheduledAt).toLocaleDateString('es-AR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-6 space-y-4">
              <h3 className="font-semibold">Acciones</h3>
              
              {interview.status === 'scheduled' && (
                <form action={updateInterviewStatus.bind(null, interview.id, 'live')} className="w-full">
                  <Button type="submit" className="w-full" size="lg">
                    <Play className="h-4 w-4" />
                    Iniciar Entrevista
                  </Button>
                </form>
              )}
              
              {interview.status === 'live' && (
                <form action={updateInterviewStatus.bind(null, interview.id, 'completed')} className="w-full">
                  <Button type="submit" className="w-full" size="lg" variant="default">
                    <CheckCircle className="h-4 w-4" />
                    Finalizar Entrevista
                  </Button>
                </form>
              )}

              {interview.status === 'completed' && (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="font-medium text-green-600">Entrevista completada</p>
                  {interview.completedAt && (
                    <p className="text-sm">
                      {new Date(interview.completedAt).toLocaleString('es-AR')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* AI Radar Scorecard */}
            {interview.status !== 'scheduled' && (
              <RadarScorecard
                interviewId={interview.id}
                isLive={isLive}
              />
            )}
          </div>

          {/* Center Column - Main Content */}
          <div className="xl:col-span-6 space-y-6">
            <StatsPanel
              interviewId={interview.id}
              startedAt={interview.startedAt?.toISOString() || null}
              status={interview.status}
            />

            <InsightsTimeline
              interviewId={interview.id}
              isLive={isLive}
            />

            <TranscriptPanel
              interviewId={interview.id}
              isLive={isLive}
            />

            {interview.status !== 'scheduled' && (
              <ScorecardPanel interviewId={interview.id} />
            )}
          </div>

          {/* Right Column - Suggestions */}
          <div className="xl:col-span-3">
            <div className="sticky top-6">
              <SuggestionsPanel
                interviewId={interview.id}
                isLive={isLive}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
