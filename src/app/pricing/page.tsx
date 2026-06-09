'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useUser, SignInButton, useAuth, UserButton } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '../../@/components/ui/button';

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5">
      <path d="M20 6L9 17l-5-5" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const FEATURES = [
  'Automated Kalshi & Polymarket monitoring',
  'Unlimited workflows',
  'Telegram, Discord, Slack, email, SMS & webhooks',
  'Reliable retries and duplicate-alert prevention',
  'Test alerts and workflow run history',
  'Cancel anytime',
];

type SubscriptionState = 'loading' | 'active' | 'inactive';

function CanceledBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get('canceled') !== 'true') return null;
  return (
    <div className="mb-6 px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm">
      Checkout canceled. Your subscription was not activated.
    </div>
  );
}

function CheckoutSuccessBanner() {
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const [timedOut, setTimedOut] = useState(false);
  const [activateError, setActivateError] = useState<string | null>(null);
  const activationStartedRef = useRef(false);
  const activationDoneRef = useRef(false);

  const isSuccess = searchParams.get('success') === 'true';
  const sessionId = searchParams.get('session_id');

  function goToDashboard() {
    window.location.href = '/dashboard';
  }

  function checkoutStorageKey(id: string) {
    return `marketping_checkout_activated:${id}`;
  }

  useEffect(() => {
    if (!isSuccess) return;
    if (activationDoneRef.current) return;
    if (activationStartedRef.current) return;
    activationStartedRef.current = true;

    let cancelled = false;

    async function refreshAuth() {
      await getToken({ skipCache: true });
    }

    async function run() {
      if (sessionId) {
        if (typeof window !== 'undefined' && sessionStorage.getItem(checkoutStorageKey(sessionId)) === '1') {
          if (!cancelled) {
            activationDoneRef.current = true;
            await refreshAuth();
            goToDashboard();
          }
          return;
        }

        try {
          const res = await fetch('/api/stripe/confirm-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });
          const data = await res.json();
          if (cancelled) return;
          if (res.ok) {
            sessionStorage.setItem(checkoutStorageKey(sessionId), '1');
            activationDoneRef.current = true;
            await refreshAuth();
            goToDashboard();
            return;
          }
          setActivateError(data.error ?? 'Activation failed');
        } catch {
          if (!cancelled) setActivateError('Activation failed');
        }
        return;
      }

      // Fallback: wait for webhook to activate, then hard-redirect
      for (let attempt = 0; attempt < 8; attempt++) {
        if (cancelled) return;
        await new Promise(r => setTimeout(r, 2000));
        try {
          await refreshAuth();
        } catch {
          // ignore
        }
        activationDoneRef.current = true;
        goToDashboard();
        return;
      }
      if (!cancelled) setTimedOut(true);
    }

    void run();

    return () => {
      cancelled = true;
      if (!activationDoneRef.current) {
        activationStartedRef.current = false;
      }
    };
  }, [isSuccess, sessionId, getToken]);

  if (!isSuccess) return null;

  if (activateError || timedOut) {
    return (
      <div className="mb-6 px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm space-y-3">
        <p>{activateError ?? 'Payment received. Your subscription should be active — continue to the dashboard.'}</p>
        <Button variant="primary" size="sm" onClick={goToDashboard}>
          Continue to dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-6 px-4 py-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-200 text-sm flex items-center gap-3">
      <span className="w-4 h-4 border border-cyan-400/40 border-t-cyan-300 rounded-full animate-spin flex-shrink-0" />
      Payment successful — redirecting to your dashboard…
    </div>
  );
}

export default function PricingPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { sessionClaims } = useAuth();
  const router = useRouter();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>('loading');

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setSubscriptionState('inactive');
      return;
    }

    const subscribed =
      (sessionClaims?.publicMetadata as Record<string, unknown> | undefined)?.subscribed === true;
    const checkoutSuccess = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('success') === 'true';

    if (subscribed) {
      setSubscriptionState('active');
      if (!checkoutSuccess) router.replace('/dashboard');
      return;
    }

    let cancelled = false;
    fetch('/api/subscription/status')
      .then(response => response.ok ? response.json() : { active: false })
      .then(data => {
        if (cancelled) return;
        const active = data.active === true;
        setSubscriptionState(active ? 'active' : 'inactive');
        if (active && !checkoutSuccess) router.replace('/dashboard');
      })
      .catch(() => {
        if (!cancelled) setSubscriptionState('inactive');
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, sessionClaims, router]);

  useEffect(() => {
    if (subscriptionState === 'active') {
      router.replace('/dashboard');
    }
  }, [subscriptionState, router]);

  async function handleSubscribe() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billing }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-white/[0.04] bg-background/80 backdrop-blur-md">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#06b6d4" />
              </svg>
            </div>
            <span className="font-semibold text-white text-sm tracking-tight">MarketPing</span>
          </button>
          <div className="flex items-center gap-3">
            {!isLoaded ? (
              <span className="text-xs text-white/40">Checking account…</span>
            ) : isSignedIn ? (
              <>
                <div className="hidden text-right sm:block">
                  <p className="text-[10px] uppercase tracking-wide text-cyan-400">Signed in</p>
                  <p className="max-w-52 truncate text-xs text-white/70">
                    {user.primaryEmailAddress?.emailAddress ?? user.fullName ?? 'MarketPing account'}
                  </p>
                </div>
                {subscriptionState === 'active' && (
                  <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
                    Dashboard
                  </Button>
                )}
                <UserButton />
              </>
            ) : (
              <SignInButton mode="modal" fallbackRedirectUrl="/pricing">
                <Button variant="outline" size="sm">Sign in</Button>
              </SignInButton>
            )}
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        {/* Background glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-lg w-full text-center">
          <div className="inline-flex items-center gap-2 badge-teal text-xs px-3 py-1.5 rounded-full mb-6 font-semibold tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse-dot" />
            MarketPing Pro
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
            Start automating your<br />
            <span className="gradient-text">prediction market edge</span>
          </h1>
          <p className="text-white/50 mb-10">
            One straightforward plan for automated market monitoring.
          </p>

          <Suspense>
            <CheckoutSuccessBanner />
            <CanceledBanner />
          </Suspense>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-1 mb-8 p-1 rounded-lg bg-white/[0.04] border border-white/[0.06] w-fit mx-auto">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                billing === 'monthly'
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                billing === 'yearly'
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              Yearly
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-semibold tracking-wide">
                SAVE 34%
              </span>
            </button>
          </div>

          {/* Pricing card */}
          <div className="glass-card rounded-2xl p-8 border border-white/[0.08] mb-6">
            <div className="flex items-end justify-center gap-1 mb-1">
              <span className="text-5xl font-bold text-white">
                {billing === 'monthly' ? '$19' : '$149'}
              </span>
              <span className="text-white/40 mb-2 text-sm">
                /{billing === 'monthly' ? 'mo' : 'yr'}
              </span>
            </div>
            {billing === 'yearly' && (
              <p className="text-white/30 text-xs mb-6">$12.42/month billed annually</p>
            )}
            {billing === 'monthly' && <div className="mb-6" />}

            <ul className="space-y-3 mb-8 text-left">
              {FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                  <CheckIcon />
                  {f}
                </li>
              ))}
            </ul>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                {error}
              </div>
            )}

            {!isLoaded || (isSignedIn && subscriptionState === 'loading') ? (
              <Button variant="primary" size="lg" className="w-full" disabled>
                Checking your account…
              </Button>
            ) : isSignedIn && subscriptionState === 'active' ? (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => router.push('/dashboard')}
              >
                Open dashboard
              </Button>
            ) : isSignedIn ? (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleSubscribe}
                disabled={loading}
              >
                {loading ? 'Opening secure checkout…' : 'Subscribe now'}
              </Button>
            ) : (
              <SignInButton mode="modal" fallbackRedirectUrl="/pricing">
                <Button variant="primary" size="lg" className="w-full">
                  Get started
                </Button>
              </SignInButton>
            )}
          </div>

          <p className="text-xs text-white/25">
            Secured by Stripe. Cancel anytime from your billing portal.
          </p>
          {isSignedIn && subscriptionState === 'inactive' && (
            <p className="mt-3 text-xs text-white/45">
              Signed in as {user?.primaryEmailAddress?.emailAddress}. Subscribe to unlock the dashboard.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
