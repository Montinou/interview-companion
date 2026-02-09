import { currentUser } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { interviews } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Play, CheckCircle } from 'lucide-react';
import { updateInterviewStatus } from '@/app/actions/interviews';
import { RadarScorecard } from '@/components/interview/RadarScorecard';
import { SuggestionsPanel } from '@/components/interview/SuggestionsPanel';
import { InsightsTimeline } from '@/components/interview/InsightsTimeline';
import { TranscriptPanel } from '@/components/interview/TranscriptPanel';
import { NotesPanel } from '@/components/interview/NotesPanel';
import { InterviewPlan } from '@/components/interview/InterviewPlan';
import { LiveTimer } from '@/components/interview/LiveTimer';
import { Button } from '@/components/ui-button';

export const dynamic = 'force-dynamic';

/**
 * Live Interview HUD — Single screen, no scroll.
 * Optimized for 3440px ultrawide (32").
 * Version: 3
 */
export default async function InterviewDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const user = await currentUser();
  const { id } = await searchParams;

  if (!user) redirect('/sign-in');
  if (!id) redirect('/dashboard/interviews');

  const interview = await db.query.interviews.findFirst({
    where: eq(interviews.id, parseInt(id)),
    with: { candidate: true, interviewer: true },
  });

  if (!interview) notFound();

  const isLive = interview.status === 'live';
  const c = interview.candidate;

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] text-gray-200 overflow-hidden">
      {/* Compact top bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800/50 bg-[#0d0d14] shrink-0">
        <div className="flex items-center gap-4">
          {/* Status dot + name */}
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${
              isLive ? 'bg-red-500 animate-pulse' : 
              interview.status === 'scheduled' ? 'bg-yellow-500' : 'bg-green-500'
            }`} />
            <h1 className="text-base font-semibold text-white">{c.name}</h1>
            <span className="text-xs text-gray-500">#{interview.id}</span>
          </div>

          {/* Candidate meta - compact */}
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {c.jiraTicket && (
              <a
                href={`https://distillery.atlassian.net/browse/${c.jiraTicket}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-blue-400 hover:underline"
              >
                {c.jiraTicket}
              </a>
            )}
            <span>{c.email}</span>
            {c.phone && <span>{c.phone}</span>}
            {interview.scheduledAt && (
              <span>
                📅 {new Date(interview.scheduledAt).toLocaleDateString('es-AR', {
                  weekday: 'short', day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Timer */}
          {interview.status !== 'scheduled' && (
            <LiveTimer
              startedAt={interview.startedAt?.toISOString() || null}
              status={interview.status}
            />
          )}

          {/* Action buttons */}
          {interview.status === 'scheduled' && (
            <form action={updateInterviewStatus.bind(null, interview.id, 'live')}>
              <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700">
                <Play className="h-3 w-3" /> Iniciar
              </Button>
            </form>
          )}
          {interview.status === 'live' && (
            <form action={updateInterviewStatus.bind(null, interview.id, 'completed')}>
              <Button type="submit" size="sm" variant="destructive">
                <CheckCircle className="h-3 w-3" /> Finalizar
              </Button>
            </form>
          )}
          {interview.status === 'completed' && (
            <span className="text-xs text-green-400 font-medium">✓ Completada</span>
          )}
        </div>
      </header>

      {/* Main 5-column grid — fills remaining height */}
      <div className="flex-1 grid grid-cols-[16%_18%_24%_22%_20%] gap-2 p-2 min-h-0">

        {/* Col 1: AI Radar + Notes */}
        <div className="flex flex-col gap-2 min-h-0">
          <div className="shrink-0">
            <RadarScorecard interviewId={interview.id} isLive={isLive} />
          </div>
          <div className="flex-1 min-h-0">
            <NotesPanel interviewId={interview.id} />
          </div>
        </div>

        {/* Col 2: Interview Plan */}
        <div className="min-h-0">
          <InterviewPlan interviewId={interview.id} />
        </div>

        {/* Col 3: Insights Timeline */}
        <div className="min-h-0">
          <InsightsTimeline interviewId={interview.id} isLive={isLive} />
        </div>

        {/* Col 4: Suggestions */}
        <div className="min-h-0">
          <SuggestionsPanel interviewId={interview.id} isLive={isLive} />
        </div>

        {/* Col 5: Transcript */}
        <div className="min-h-0">
          <TranscriptPanel interviewId={interview.id} isLive={isLive} />
        </div>
      </div>
    </div>
  );
}
