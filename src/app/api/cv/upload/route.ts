import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext, AuthError } from '@/lib/auth';
import { getUploadUrl } from '@/lib/r2';
import { db } from '@/lib/db';
import { candidates } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/cv/upload
 * 
 * Generate a pre-signed URL for uploading a CV to R2.
 * Optionally creates a new candidate if candidateId is not provided.
 * 
 * Body: { candidateId?: number, candidateName?: string, filename: string, contentType: string }
 * Returns: { uploadUrl: string, key: string, candidateId: number }
 */
export async function POST(req: NextRequest) {
  try {
    const { orgId } = await getOrgContext();
    const { candidateId, candidateName, filename, contentType } = await req.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Missing filename or contentType' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ];
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Accepted: PDF, DOCX, DOC, TXT' },
        { status: 400 },
      );
    }

    let resolvedCandidateId = candidateId;

    // If no candidateId, create a new candidate
    if (!resolvedCandidateId) {
      if (!candidateName) {
        return NextResponse.json(
          { error: 'Either candidateId or candidateName is required' },
          { status: 400 },
        );
      }

      const [newCandidate] = await db
        .insert(candidates)
        .values({
          orgId,
          name: candidateName,
        })
        .returning({ id: candidates.id });

      resolvedCandidateId = newCandidate.id;
    } else {
      // Verify candidate belongs to this org
      const candidate = await db.query.candidates.findFirst({
        where: and(
          eq(candidates.id, resolvedCandidateId),
          eq(candidates.orgId, orgId),
        ),
      });

      if (!candidate) {
        return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
      }
    }

    // Generate pre-signed upload URL
    const { uploadUrl, key } = await getUploadUrl(
      orgId,
      resolvedCandidateId,
      filename,
      contentType,
    );

    // Save the R2 key as cv_url (will be resolved to signed URL when needed)
    await db
      .update(candidates)
      .set({ cvUrl: `r2://${key}` })
      .where(
        and(
          eq(candidates.id, resolvedCandidateId),
          eq(candidates.orgId, orgId),
        ),
      );

    return NextResponse.json({
      uploadUrl,
      key,
      candidateId: resolvedCandidateId,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('CV upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
