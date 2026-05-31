import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from './lib/supabase';

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
      let subscribed = (sessionClaims?.publicMetadata as Record<string, unknown> | undefined)?.subscribed === true;

      // JWT can lag after checkout — trust Supabase if subscription is active
      if (!subscribed) {
        const { data } = await getSupabaseAdmin()
          .from('subscriptions')
          .select('status')
          .eq('user_id', userId)
          .maybeSingle();
        subscribed = data?.status === 'active';
      }

      if (!subscribed) {
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
