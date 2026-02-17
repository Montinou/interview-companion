import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { interviewProfiles, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getOrgContext, AuthError } from '@/lib/auth';

// GET: List all profiles for current user
export async function GET() {
  try {
    const { orgId, userId } = await getOrgContext();

    // Fetch profiles for this org
    const profiles = await db.query.interviewProfiles.findMany({
      where: eq(interviewProfiles.orgId, orgId),
      orderBy: (profiles, { desc }) => [desc(profiles.createdAt)],
    });

    return NextResponse.json({ profiles });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET profiles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new profile
export async function POST(req: NextRequest) {
  try {
    const { orgId, userId: dbUserId } = await getOrgContext();

    const body = await req.json();
    const {
      name,
      roleType = 'technical',
      seniority,
      description,
      techStack,
      evaluationDimensions,
      interviewStructure,
      analysisInstructions,
      redFlags,
      greenFlags,
      language = 'en',
    } = body;

    // Validate required fields
    if (!name || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert profile
    const [profile] = await db
      .insert(interviewProfiles)
      .values({
        orgId,
        userId: dbUserId,
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
        isTemplate: true,
        usageCount: 0,
      })
      .returning();

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('POST profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
