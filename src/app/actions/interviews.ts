'use server';

import { db } from '@/lib/db';
import { interviews, candidates, users } from '@/lib/db/schema';
import { currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createInterview(formData: FormData) {
  const user = await currentUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }

  // Get or create user in DB
  let dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, user.id),
  });

  if (!dbUser) {
    const [newUser] = await db.insert(users).values({
      clerkId: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      name: `${user.firstName} ${user.lastName}`.trim() || null,
    }).returning();
    dbUser = newUser;
  }

  // Create or get candidate
  const candidateName = formData.get('candidateName') as string;
  const candidateEmail = formData.get('candidateEmail') as string;
  const candidatePhone = formData.get('candidatePhone') as string | null;
  const jiraTicket = formData.get('jiraTicket') as string | null;

  let candidate = await db.query.candidates.findFirst({
    where: eq(candidates.email, candidateEmail),
  });

  if (!candidate) {
    const [newCandidate] = await db.insert(candidates).values({
      name: candidateName,
      email: candidateEmail,
      phone: candidatePhone,
      jiraTicket: jiraTicket,
    }).returning();
    candidate = newCandidate;
  }

  // Create interview
  const [interview] = await db.insert(interviews).values({
    candidateId: candidate.id,
    interviewerId: dbUser.id,
    status: 'scheduled',
  }).returning();

  revalidatePath('/dashboard/interviews');
  redirect(`/dashboard/interviews/${interview.id}`);
}

export async function updateInterviewStatus(
  interviewId: number,
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
) {
  const user = await currentUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }

  await db.update(interviews)
    .set({ 
      status,
      updatedAt: new Date(),
      ...(status === 'live' ? { startedAt: new Date() } : {}),
      ...(status === 'completed' ? { completedAt: new Date() } : {}),
    })
    .where(eq(interviews.id, interviewId));

  revalidatePath(`/dashboard/interviews/${interviewId}`);
  revalidatePath('/dashboard/interviews');
}
