import { NextRequest, NextResponse } from 'next/server';

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

export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}
