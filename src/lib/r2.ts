/**
 * R2 storage client using Cloudflare API (not S3-compatible).
 * Uses the existing CLOUDFLARE_API_TOKEN for auth.
 * 
 * For uploads: client uploads to our API → we stream to R2
 * For downloads: we fetch from R2 → return to client
 */

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '1154ac48d60dfeb452e573ed0be70bd6';
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!;
const R2_BUCKET = 'interview-companion-cvs';

const R2_BASE = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects`;

/**
 * Upload a file buffer to R2.
 * Path convention: {orgId}/{candidateId}/{filename}
 */
export async function uploadToR2(
  orgId: string,
  candidateId: number,
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<{ key: string }> {
  const key = `${orgId}/${candidateId}/${filename}`;

  const res = await fetch(`${R2_BASE}/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': contentType,
    },
    body: new Uint8Array(buffer),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`R2 upload failed: ${res.status} ${text}`);
  }

  return { key };
}

/**
 * Fetch file content from R2 as a Buffer (for server-side text extraction).
 */
export async function getFileBuffer(key: string): Promise<Buffer> {
  const res = await fetch(`${R2_BASE}/${encodeURIComponent(key)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
    },
  });

  if (!res.ok) {
    throw new Error(`R2 download failed: ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Delete a file from R2.
 */
export async function deleteFromR2(key: string): Promise<void> {
  await fetch(`${R2_BASE}/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
    },
  });
}
