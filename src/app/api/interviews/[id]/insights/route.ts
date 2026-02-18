import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiInsights, interviews } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { validateApiKey, validateDualAuth, unauthorizedResponse } from '@/lib/api-auth';
import { getOrgContext } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Machine-to-machine auth required for writing insights (API key only, not browser)
  if (!validateApiKey(request)) {
    return unauthorizedResponse('API key required for writing insights');
  }

  try {
    const { id } = await params;
    const interviewId = parseInt(id);
    const body = await request.json();

    const { type, content, severity, suggestion, topic, responseQuality } = body;

    if (!type || !content) {
      return NextResponse.json(
        { error: 'Missing type or content' },
        { status: 400 }
      );
    }

    // Look up interview to get orgId (M2M auth, no Clerk session)
    const interview = await db.query.interviews.findFirst({
      where: eq(interviews.id, interviewId),
    });

    if (!interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    // Save insight to database
    const [insight] = await db.insert(aiInsights).values({
      orgId: interview.orgId,
      interviewId,
      type,
      content,
      severity,
      suggestion,
      topic,
      responseQuality,
    }).returning();

    return NextResponse.json(insight);
  } catch (error) {
    console.error('Error saving insight:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateDualAuth(request))) {
    return unauthorizedResponse('Authentication required');
  }

  try {
    const { id } = await params;
    const interviewId = parseInt(id);

    let orgIdFilter: string | null = null;

    // Verify org ownership for Clerk sessions
    if (!validateApiKey(request)) {
      try {
        const { orgId } = await getOrgContext();
        orgIdFilter = orgId;
        const interview = await db.query.interviews.findFirst({
          where: and(eq(interviews.id, interviewId), eq(interviews.orgId, orgId)),
        });
        if (!interview) {
          return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
        }
      } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    // Get type filter from query params
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');

    // Build where clause with orgId filter for Clerk sessions
    let whereClause;
    if (orgIdFilter) {
      whereClause = typeFilter
        ? and(eq(aiInsights.interviewId, interviewId), eq(aiInsights.orgId, orgIdFilter), eq(aiInsights.type, typeFilter))
        : and(eq(aiInsights.interviewId, interviewId), eq(aiInsights.orgId, orgIdFilter));
    } else {
      // API key auth - no orgId filter needed
      whereClause = typeFilter
        ? and(eq(aiInsights.interviewId, interviewId), eq(aiInsights.type, typeFilter))
        : eq(aiInsights.interviewId, interviewId);
    }

    const insights = await db.query.aiInsights.findMany({
      where: whereClause,
      orderBy: [desc(aiInsights.timestamp)],
    });

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
