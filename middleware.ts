import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/analyze',                        // Protected by INTERNAL_API_KEY, not Clerk
  '/api/interviews/active',              // Protected by INTERNAL_API_KEY, not Clerk
  '/api/interviews/:id/transcript',      // Protected by INTERNAL_API_KEY, not Clerk
  '/api/interviews/:id/insights',        // Protected by INTERNAL_API_KEY, not Clerk
  '/api/interviews/:id/insights/:insightId/used', // Protected by INTERNAL_API_KEY
  '/api/interviews/:id/stats',           // Protected by INTERNAL_API_KEY, not Clerk
  '/api/interviews/:id/scorecard',       // Protected by INTERNAL_API_KEY, not Clerk
  '/api/interviews/:id/stream',          // SSE stream, protected by INTERNAL_API_KEY
  '/api/interview-data',                 // Unified endpoint, protected by INTERNAL_API_KEY
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
