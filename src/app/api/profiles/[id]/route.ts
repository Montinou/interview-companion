import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { interviewProfiles, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET: Get a single profile
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const profileId = parseInt(id);

    if (isNaN(profileId)) {
      return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });
    }

    // Get user from DB
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch profile
    const profile = await db.query.interviewProfiles.findFirst({
      where: and(
        eq(interviewProfiles.id, profileId),
        eq(interviewProfiles.userId, dbUser.id)
      ),
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('GET profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update a profile
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const profileId = parseInt(id);

    if (isNaN(profileId)) {
      return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });
    }

    // Get user from DB
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      roleType,
      seniority,
      description,
      techStack,
      evaluationDimensions,
      interviewStructure,
      analysisInstructions,
      redFlags,
      greenFlags,
      language,
    } = body;

    // Update profile
    const [profile] = await db
      .update(interviewProfiles)
      .set({
        ...(name !== undefined && { name }),
        ...(roleType !== undefined && { roleType }),
        ...(seniority !== undefined && { seniority }),
        ...(description !== undefined && { description }),
        ...(techStack !== undefined && { techStack }),
        ...(evaluationDimensions !== undefined && { evaluationDimensions }),
        ...(interviewStructure !== undefined && { interviewStructure }),
        ...(analysisInstructions !== undefined && { analysisInstructions }),
        ...(redFlags !== undefined && { redFlags }),
        ...(greenFlags !== undefined && { greenFlags }),
        ...(language !== undefined && { language }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(interviewProfiles.id, profileId),
          eq(interviewProfiles.userId, dbUser.id)
        )
      )
      .returning();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('PATCH profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete a profile
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const profileId = parseInt(id);

    if (isNaN(profileId)) {
      return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });
    }

    // Get user from DB
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete profile
    const [deleted] = await db
      .delete(interviewProfiles)
      .where(
        and(
          eq(interviewProfiles.id, profileId),
          eq(interviewProfiles.userId, dbUser.id)
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
