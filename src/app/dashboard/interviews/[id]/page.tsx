import { currentUser } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { interviews } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { updateInterviewStatus, updateInterviewLanguage } from '@/app/actions/interviews';
import { InterviewPageClient } from '@/components/interview/InterviewPageClient';

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

  // Serialize for client component
  const interviewData = {
    id: interview.id,
    status: interview.status,
    language: interview.language,
    startedAt: interview.startedAt?.toISOString() || null,
    completedAt: interview.completedAt?.toISOString() || null,
    scheduledAt: interview.scheduledAt?.toISOString() || null,
    candidate: {
      name: interview.candidate.name,
      email: interview.candidate.email,
      phone: interview.candidate.phone,
      jiraTicket: interview.candidate.jiraTicket,
    },
  };

  return (
    <InterviewPageClient
      interview={interviewData}
      updateStatusAction={updateInterviewStatus}
      updateLanguageAction={updateInterviewLanguage}
    />
  );
}
