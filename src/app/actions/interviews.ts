'use server';

import { db } from '@/lib/db';
import { interviews, candidates, users, interviewProfiles } from '@/lib/db/schema';
import { currentUser } from '@clerk/nextjs/server';
import { eq, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getOrgContext } from '@/lib/auth';

export async function createInterview(formData: FormData) {
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const { orgId } = await getOrgContext();

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

  // Resolve candidate: existing or new
  const existingCandidateId = formData.get('candidateId') as string | null;
  const candidateName = formData.get('candidateName') as string;
  const candidateEmail = formData.get('candidateEmail') as string;
  const candidatePhone = formData.get('candidatePhone') as string | null;
  const jiraTicket = formData.get('jiraTicket') as string | null;

  let candidateId: number;

  if (existingCandidateId) {
    // Verify the candidate belongs to this org
    const existing = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, parseInt(existingCandidateId)), eq(candidates.orgId, orgId)),
    });
    if (!existing) throw new Error('Candidate not found');
    candidateId = existing.id;
  } else {
    // Create or find by email
    if (!candidateName || !candidateEmail) throw new Error('Candidate name and email required');

    let candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.email, candidateEmail), eq(candidates.orgId, orgId)),
    });

    if (!candidate) {
      const [newCandidate] = await db.insert(candidates).values({
        orgId,
        name: candidateName,
        email: candidateEmail,
        phone: candidatePhone || null,
        jiraTicket: jiraTicket || null,
      }).returning();
      candidate = newCandidate;
    }
    candidateId = candidate.id;
  }

  // Profile
  const profileIdStr = formData.get('profileId') as string | null;
  let profileId: number | null = null;
  if (profileIdStr) {
    const profile = await db.query.interviewProfiles.findFirst({
      where: and(eq(interviewProfiles.id, parseInt(profileIdStr)), eq(interviewProfiles.orgId, orgId)),
    });
    if (profile) {
      profileId = profile.id;
      // Increment usage count
      await db.update(interviewProfiles)
        .set({ usageCount: sql`${interviewProfiles.usageCount} + 1`, updatedAt: new Date() })
        .where(eq(interviewProfiles.id, profile.id));
    }
  }

  // Language
  const language = (formData.get('language') as string) || 'es';

  // Create interview
  const [interview] = await db.insert(interviews).values({
    orgId,
    candidateId,
    interviewerId: dbUser.id,
    profileId,
    language,
    status: 'scheduled',
  }).returning();

  revalidatePath('/dashboard/interviews');
  revalidatePath('/dashboard/candidates');
  redirect(`/dashboard/interviews/${interview.id}`);
}

export async function updateInterviewStatus(
  interviewId: number,
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
) {
  const { orgId } = await getOrgContext();

  await db.update(interviews)
    .set({
      status,
      updatedAt: new Date(),
      ...(status === 'live' ? { startedAt: new Date() } : {}),
      ...(status === 'completed' ? { completedAt: new Date() } : {}),
    })
    .where(and(eq(interviews.id, interviewId), eq(interviews.orgId, orgId)));

  revalidatePath(`/dashboard/interviews/${interviewId}`);
  revalidatePath('/dashboard/interviews');
}

export async function updateInterviewLanguage(
  interviewId: number,
  language: string
) {
  const { orgId } = await getOrgContext();

  await db.update(interviews)
    .set({
      language,
      updatedAt: new Date(),
    })
    .where(and(eq(interviews.id, interviewId), eq(interviews.orgId, orgId)));

  revalidatePath(`/dashboard/interviews/${interviewId}`);
}
