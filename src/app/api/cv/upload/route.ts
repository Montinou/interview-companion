import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { candidates } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getOrgContext, AuthError } from '@/lib/auth';
import { uploadToR2 } from '@/lib/r2';

/**
 * POST /api/cv/upload
 * Accepts multipart form data with a CV file.
 * Uploads to R2, creates candidate if needed.
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId } = await getOrgContext();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const candidateIdStr = formData.get('candidateId') as string | null;
    const candidateName = formData.get('candidateName') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only PDF and Word files accepted' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    let candidateId: number;

    if (candidateIdStr) {
      // Verify candidate belongs to this org
      const candidate = await db.query.candidates.findFirst({
        where: and(eq(candidates.id, parseInt(candidateIdStr)), eq(candidates.orgId, orgId)),
      });
      if (!candidate) {
        return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
      }
      candidateId = candidate.id;
    } else {
      // Create new candidate
      const name = candidateName || file.name.replace(/\.[^.]+$/, '');
      const [newCandidate] = await db.insert(candidates).values({
        orgId,
        name,
      }).returning();
      candidateId = newCandidate.id;
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to R2
    const { key } = await uploadToR2(orgId, candidateId, file.name, buffer, file.type);

    // Update candidate with CV URL
    await db.update(candidates)
      .set({ cvUrl: key })
      .where(eq(candidates.id, candidateId));

    return NextResponse.json({
      ok: true,
      candidateId,
      key,
      mimeType: file.type,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('CV upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
