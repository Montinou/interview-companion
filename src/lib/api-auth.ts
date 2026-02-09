import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * Validates machine-to-machine API key for tier1 → server communication.
 * The API key should be sent as Bearer token in Authorization header
 * or as X-API-Key header.
 */
export function validateApiKey(request: NextRequest): boolean {
  const apiKey = process.env.INTERNAL_API_KEY;
  
  if (!apiKey) {
    console.error('INTERNAL_API_KEY not configured');
    return false;
  }

  // Check Authorization: Bearer <key>
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (token === apiKey) return true;
  }

  // Check X-API-Key header
  const xApiKey = request.headers.get('x-api-key');
  if (xApiKey === apiKey) return true;

  return false;
}

/**
 * Dual auth: accepts EITHER Clerk session (browser) OR API key (M2M).
 * Use this for routes that need to be accessible from both dashboard and cron agents.
 */
export async function validateDualAuth(request: NextRequest): Promise<boolean> {
  // First check API key (fast, no async)
  if (validateApiKey(request)) return true;
  
  // Then check Clerk session (browser)
  try {
    const { userId } = await auth();
    if (userId) return true;
  } catch {
    // Clerk auth failed, that's fine — might be M2M
  }
  
  return false;
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}
