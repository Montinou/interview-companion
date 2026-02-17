import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * Public routes bypass Clerk middleware.
 * ONLY routes that genuinely need no Clerk session should be here.
 * M2M routes validate API key in their handlers.
 */
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sitemap.xml',
  '/robots.txt',
  '/api/webhooks(.*)',              // Clerk + other webhooks (verified by signature)
  // M2M routes — API key validated in handlers, no Clerk session available
  '/api/analyze',                   // Capture script → AI analysis
  '/api/interviews/active',         // Capture script polls for live interviews
  '/api/interviews/:id/transcript', // Capture script writes transcripts (dual auth in handler)
  '/api/interviews/:id/insights',   // Analyzer writes insights (dual auth in handler)
  '/api/interview-data',            // Unified endpoint (dual auth in handler)
  // Extension config has CORS + internal auth check
  '/api/extension/config',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
