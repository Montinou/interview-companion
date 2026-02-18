import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { interviews } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { updateInterviewStatus, updateInterviewLanguage } from '@/app/actions/interviews';
import { InterviewPageClient } from '@/components/interview/InterviewPageClient';
import { getOrgContext, AuthError } from '@/lib/auth';

export default async function InterviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let orgId: string;
  try {
    const ctx = await getOrgContext();
    orgId = ctx.orgId;
  } catch (e) {
    if (e instanceof AuthError) redirect('/sign-in');
    throw e;
  }

  const { id } = await params;

  const interview = await db.query.interviews.findFirst({
    where: and(eq(interviews.id, parseInt(id)), eq(interviews.orgId, orgId)),
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
