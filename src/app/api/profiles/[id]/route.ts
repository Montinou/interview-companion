import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { interviewProfiles } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getOrgContext, AuthError } from '@/lib/auth';

// GET: Get a single profile (org-scoped)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await getOrgContext();

    const { id } = await params;
    const profileId = parseInt(id);

    if (isNaN(profileId)) {
      return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });
    }

    // Fetch profile (org-scoped: all org members can see org profiles)
    const profile = await db.query.interviewProfiles.findFirst({
      where: and(
        eq(interviewProfiles.id, profileId),
        eq(interviewProfiles.orgId, orgId)
      ),
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update a profile (org-scoped)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await getOrgContext();

    const { id } = await params;
    const profileId = parseInt(id);

    if (isNaN(profileId)) {
      return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });
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

    // Update profile (org-scoped: all org members can edit org profiles)
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
          eq(interviewProfiles.orgId, orgId)
        )
      )
      .returning();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('PATCH profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete a profile (org-scoped)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await getOrgContext();

    const { id } = await params;
    const profileId = parseInt(id);

    if (isNaN(profileId)) {
      return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });
    }

    // Delete profile (org-scoped: all org members can delete org profiles)
    const [deleted] = await db
      .delete(interviewProfiles)
      .where(
        and(
          eq(interviewProfiles.id, profileId),
          eq(interviewProfiles.orgId, orgId)
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('DELETE profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
