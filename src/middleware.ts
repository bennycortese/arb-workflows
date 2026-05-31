import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/api/stripe/webhook',
  '/api/poll-all',
]);

const isSubscribedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/workflow/(.*)',
  '/api/workflows(.*)',
  '/api/kalshi(.*)',
  '/api/polymarket(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  if (isSubscribedRoute(request)) {
    const { userId, sessionClaims } = await auth();
    if (userId) {
      const subscribed = (sessionClaims?.publicMetadata as Record<string, unknown> | undefined)?.subscribed;
      if (subscribed !== true) {
        if (request.nextUrl.pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Subscription required' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/pricing', request.url));
      }
    }
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
