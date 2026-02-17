import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { interviewProfiles, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET: List all profiles for current user
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from DB
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch profiles
    const profiles = await db.query.interviewProfiles.findMany({
      where: eq(interviewProfiles.userId, dbUser.id),
      orderBy: (profiles, { desc }) => [desc(profiles.createdAt)],
    });

    return NextResponse.json({ profiles });
  } catch (error) {
    console.error('GET profiles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new profile
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        userId: dbUser.id,
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
    console.error('POST profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
