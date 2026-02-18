import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'chrome-extension://*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Credentials': 'true',
};

export async function OPTIONS() {
  return new Response('ok', { headers: corsHeaders });
}

export async function GET() {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated', loginUrl: '/sign-in' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Return ONLY public config. Server secrets (DEEPGRAM_API_KEY, INTERNAL_API_KEY)
    // are NEVER exposed to clients. Tauri app uses CF proxy for STT.
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.emailAddresses[0]?.emailAddress,
        email: user.emailAddresses[0]?.emailAddress,
      },
      config: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        dashboardUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://interview-companion.triqual.dev',
        sttProxyUrl: 'https://interview-stt-proxy.agusmontoya.workers.dev',
      },
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Extension config error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
