/**
 * CORS utility for API routes that need cross-origin access.
 * 
 * Usage:
 *   import { corsHeaders, handleCors } from '@/lib/cors'
 *   
 *   export async function OPTIONS() { return handleCors() }
 *   export async function POST(req) {
 *     // ... handler
 *     return NextResponse.json(data, { headers: corsHeaders })
 *   }
 * 
 * Routes that DON'T need CORS (same-origin dashboard, M2M with API key):
 *   - Don't import this. Browser same-origin policy handles it.
 * 
 * Routes that DO need CORS:
 *   - /api/extension/config (browser extension)
 *   - Any future public API endpoints
 */

import { NextResponse } from 'next/server';

/** Allowed origins. Extend as needed. */
const ALLOWED_ORIGINS = [
  'https://interview-companion.triqual.dev',
  'chrome-extension://*', // Browser extension
];

/** Standard CORS headers for API responses */
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*', // Permissive for now; tighten per-route if needed
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-internal-key, x-client-info, apikey',
  'Access-Control-Max-Age': '86400', // Cache preflight for 24h
};

/** Handle CORS preflight (OPTIONS) requests */
export function handleCors(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/** Create CORS headers restricted to specific origin */
export function corsHeadersForOrigin(origin: string | null): Record<string, string> {
  if (!origin) return corsHeaders;
  
  const isAllowed = ALLOWED_ORIGINS.some(allowed => {
    if (allowed.includes('*')) {
      const pattern = allowed.replace('*', '');
      return origin.startsWith(pattern);
    }
    return origin === allowed;
  });

  return {
    ...corsHeaders,
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
  };
}
