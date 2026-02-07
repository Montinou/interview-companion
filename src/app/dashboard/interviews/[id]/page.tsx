import { currentUser } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { interviews } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft, User, Calendar, Clock, Mail, Phone, FileText, Play, CheckCircle } from 'lucide-react';
import { updateInterviewStatus } from '@/app/actions/interviews';
import { LiveInsights } from '@/components/LiveInsights';
import { StatsCard } from '@/components/StatsCard';
import { Button } from '@/components/ui-button';
import { cn } from '@/lib/utils';

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

  const duration = interview.startedAt
    ? Math.floor((new Date().getTime() - new Date(interview.startedAt).getTime()) / 1000)
    : 0;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const statusConfig = {
    scheduled: { color: 'yellow', label: 'Scheduled' },
    live: { color: 'blue', label: 'Live' },
    completed: { color: 'green', label: 'Completed' },
    cancelled: { color: 'gray', label: 'Cancelled' },
  };

  const currentStatus = statusConfig[interview.status as keyof typeof statusConfig] || statusConfig.scheduled;
  
  // Helper to render status icon based on status
  const StatusIcon = ({ status, className }: { status: string; className?: string }) => {
    switch (status) {
      case 'scheduled': return <Calendar className={className} />;
      case 'live': return <Play className={className} />;
      case 'completed': return <CheckCircle className={className} />;
      case 'cancelled': return <Clock className={className} />;
      default: return <Calendar className={className} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <div className="max-w-[1600px] mx-auto p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/interviews"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Interviews
          </Link>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Sidebar - Candidate Info */}
          <div className="xl:col-span-3 space-y-6">
            {/* Candidate Card */}
            <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-6 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-2.5">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Candidate</h3>
                  <p className="text-xs text-muted-foreground">Interview #{interview.id}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Full Name</p>
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
                      Phone
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
                    <p className="text-sm font-mono font-medium">{interview.candidate.jiraTicket}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Status & Actions */}
            <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-6 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className={cn(
                  'rounded-lg p-2.5',
                  `bg-${currentStatus.color}-500/10`
                )}>
                  <StatusIcon status={interview.status} className={cn('h-5 w-5', `text-${currentStatus.color}-600`)} />
                </div>
                <div>
                  <h3 className="font-semibold">Status</h3>
                  <p className="text-xs text-muted-foreground">Interview state</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Current Status</p>
                  <span className={cn(
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
                    `bg-${currentStatus.color}-500/10 text-${currentStatus.color}-600 border border-${currentStatus.color}-500/20`
                  )}>
                    {currentStatus.label}
                  </span>
                </div>

                <div className="pt-2 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium">
                      {new Date(interview.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {interview.startedAt && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Started</span>
                      <span className="font-medium">
                        {new Date(interview.startedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  {interview.completedAt && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Completed</span>
                      <span className="font-medium">
                        {new Date(interview.completedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 space-y-2">
                {interview.status === 'scheduled' && (
                  <form action={updateInterviewStatus.bind(null, interview.id, 'live')} className="w-full">
                    <Button type="submit" className="w-full" size="lg">
                      <Play className="h-4 w-4" />
                      Start Interview
                    </Button>
                  </form>
                )}
                {interview.status === 'live' && (
                  <form action={updateInterviewStatus.bind(null, interview.id, 'completed')} className="w-full">
                    <Button type="submit" className="w-full" size="lg" variant="default">
                      <CheckCircle className="h-4 w-4" />
                      Complete Interview
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="xl:col-span-9 space-y-6">
            {/* Stats Grid */}
            {interview.status === 'live' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard
                  icon="clock"
                  label="Duration"
                  value={formatDuration(duration)}
                  color="blue"
                  delay={0}
                />
                <StatsCard
                  icon="user"
                  label="Candidate Speaking"
                  value="65%"
                  subtitle="Good balance"
                  color="green"
                  trend="up"
                  delay={0.1}
                />
                <StatsCard
                  icon="check"
                  label="Topics Covered"
                  value="3/5"
                  subtitle="On track"
                  color="purple"
                  delay={0.2}
                />
              </div>
            )}

            {/* Live Insights */}
            <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-6">
              <LiveInsights interviewId={interview.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
