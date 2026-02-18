import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext, AuthError } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';

const limiter = createRateLimiter({ windowMs: 60_000, max: 5, name: 'cv-analyze' });
import { getFileBuffer } from '@/lib/r2';
import { extractText, analyzeCvWithAI, matchProfiles } from '@/lib/cv-parser';
import { db } from '@/lib/db';
import { candidates, interviewProfiles } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/cv/analyze
 * 
 * Analyze a candidate's uploaded CV:
 * 1. Fetch CV from R2
 * 2. Extract text (PDF/DOCX)
 * 3. Send to Kimi for structured analysis
 * 4. Match against existing interview profiles
 * 5. Save cv_data to candidate record
 * 
 * Body: { candidateId: number, roleHint?: string }
 * Returns: { cvData: CvData, matches: ProfileMatch[] }
 */
export async function POST(req: NextRequest) {
  try {
    const { orgId, userId } = await getOrgContext();

    // Rate limit: 5 req/min per user (heavy AI operation)
    const limited = limiter.check(String(userId));
    if (limited) return limited;

    const { candidateId, roleHint } = await req.json();

    if (!candidateId) {
      return NextResponse.json({ error: 'Missing candidateId' }, { status: 400 });
    }

    // Get candidate (verify org ownership)
    const candidate = await db.query.candidates.findFirst({
      where: and(
        eq(candidates.id, candidateId),
        eq(candidates.orgId, orgId),
      ),
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    if (!candidate.cvUrl) {
      return NextResponse.json({ error: 'No CV uploaded for this candidate' }, { status: 400 });
    }

    // Extract R2 key from cv_url (format: r2://key)
    const r2Key = candidate.cvUrl.replace('r2://', '');

    // Fetch file from R2
    const buffer = await getFileBuffer(r2Key);

    // Determine mime type from extension
    const ext = r2Key.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      txt: 'text/plain',
    };
    const mimeType = mimeMap[ext || ''] || 'text/plain';

    // Extract text
    const text = await extractText(buffer, mimeType);

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: 'Could not extract meaningful text from CV. Try a different format.' },
        { status: 422 },
      );
    }

    // Analyze with AI
    const { cvData } = await analyzeCvWithAI(text, roleHint);

    // Get existing profiles for matching
    const profiles = await db.query.interviewProfiles.findMany({
      where: eq(interviewProfiles.orgId, orgId),
      columns: {
        id: true,
        name: true,
        techStack: true,
        seniority: true,
      },
    });

    // Match profiles
    const matches = matchProfiles(
      cvData,
      profiles.map((p) => ({
        id: p.id,
        name: p.name,
        techStack: p.techStack,
        seniority: p.seniority,
      })),
    );

    // Add matches to cvData for storage
    (cvData.analysis as any).profile_matches = matches;

    // Save to candidate record
    await db
      .update(candidates)
      .set({ cvData: cvData as any })
      .where(
        and(
          eq(candidates.id, candidateId),
          eq(candidates.orgId, orgId),
        ),
      );

    return NextResponse.json({ cvData, matches });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('CV analyze error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
