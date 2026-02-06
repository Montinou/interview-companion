import { currentUser } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { interviews } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { updateInterviewStatus } from '@/app/actions/interviews';

export default async function InterviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await currentUser();
  const { id } = await params;
  
  if (!user) {
    redirect('/sign-in');
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

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link
            href="/dashboard/interviews"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Interviews
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Candidate Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="p-6 rounded-xl border bg-card">
              <h2 className="text-xl font-semibold mb-4">👤 Candidate</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{interview.candidate.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{interview.candidate.email}</p>
                </div>
                {interview.candidate.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{interview.candidate.phone}</p>
                  </div>
                )}
                {interview.candidate.jiraTicket && (
                  <div>
                    <p className="text-sm text-muted-foreground">Jira Ticket</p>
                    <p className="font-medium">{interview.candidate.jiraTicket}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 rounded-xl border bg-card">
              <h2 className="text-xl font-semibold mb-4">📅 Status</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Current Status</p>
                  <span
                    className={`inline-flex mt-1 px-3 py-1 rounded-full text-xs font-medium ${
                      interview.status === 'completed'
                        ? 'bg-green-500/10 text-green-500'
                        : interview.status === 'live'
                        ? 'bg-blue-500/10 text-blue-500'
                        : interview.status === 'scheduled'
                        ? 'bg-yellow-500/10 text-yellow-500'
                        : 'bg-gray-500/10 text-gray-500'
                    }`}
                  >
                    {interview.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {new Date(interview.createdAt).toLocaleString()}
                  </p>
                </div>
                {interview.startedAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Started</p>
                    <p className="font-medium">
                      {new Date(interview.startedAt).toLocaleString()}
                    </p>
                  </div>
                )}
                {interview.completedAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="font-medium">
                      {new Date(interview.completedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-xl border bg-card">
              <h2 className="text-xl font-semibold mb-4">Interview Controls</h2>
              <div className="grid grid-cols-2 gap-4">
                {interview.status === 'scheduled' && (
                  <form action={updateInterviewStatus.bind(null, interview.id, 'live')}>
                    <button
                      type="submit"
                      className="w-full px-6 py-3 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors"
                    >
                      🔴 Start Interview
                    </button>
                  </form>
                )}
                {interview.status === 'live' && (
                  <form action={updateInterviewStatus.bind(null, interview.id, 'completed')}>
                    <button
                      type="submit"
                      className="w-full px-6 py-3 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors"
                    >
                      ✅ Complete Interview
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="p-6 rounded-xl border bg-card">
              <h2 className="text-xl font-semibold mb-4">🎤 Transcription</h2>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-6xl mb-4">🔊</div>
                <h3 className="text-lg font-semibold mb-2">Real-time transcription</h3>
                <p className="text-muted-foreground">
                  Coming in Etapa 4 - Pusher integration
                </p>
              </div>
            </div>

            <div className="p-6 rounded-xl border bg-card">
              <h2 className="text-xl font-semibold mb-4">🤖 AI Insights</h2>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-6xl mb-4">💡</div>
                <h3 className="text-lg font-semibold mb-2">Smart suggestions</h3>
                <p className="text-muted-foreground">
                  Coming in Etapa 5 - OpenAI integration
                </p>
              </div>
            </div>

            <div className="p-6 rounded-xl border bg-card">
              <h2 className="text-xl font-semibold mb-4">📊 Scorecard</h2>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-lg font-semibold mb-2">Live scoring</h3>
                <p className="text-muted-foreground">
                  Coming in Etapa 6 - Scorecard component
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
