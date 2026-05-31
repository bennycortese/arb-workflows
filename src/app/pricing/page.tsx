'use client';

import { useState, useEffect, Suspense } from 'react';
import { useUser, SignInButton, useAuth, useSession } from '@clerk/nextjs';
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
  'Live Kalshi & Polymarket price feeds',
  'Unlimited workflows',
  'Discord & Email alert actions',
  'Price threshold automation',
  'Real-time notifications',
  'Priority support',
];

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
  const router = useRouter();
  const { sessionClaims } = useAuth();
  const { session } = useSession();
  const [timedOut, setTimedOut] = useState(false);

  const isSuccess = searchParams.get('success') === 'true';
  const subscribed = (sessionClaims?.publicMetadata as Record<string, unknown> | undefined)?.subscribed === true;

  useEffect(() => {
    if (!isSuccess || subscribed) return;

    let attempts = 0;
    const maxAttempts = 15;

    const poll = setInterval(async () => {
      attempts++;
      try {
        await session?.reload();
      } catch {
        // ignore reload errors; will retry
      }
      if (attempts >= maxAttempts) {
        clearInterval(poll);
        setTimedOut(true);
      }
    }, 2000);

    return () => clearInterval(poll);
  }, [isSuccess, subscribed, session]);

  useEffect(() => {
    if (isSuccess && subscribed) {
      router.replace('/dashboard');
    }
  }, [isSuccess, subscribed, router]);

  if (!isSuccess || subscribed) return null;

  if (timedOut) {
    return (
      <div className="mb-6 px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm">
        Payment received — your subscription is still activating. Try refreshing in a minute, or sign out and back in.
      </div>
    );
  }

  return (
    <div className="mb-6 px-4 py-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-200 text-sm flex items-center gap-3">
      <span className="w-4 h-4 border border-cyan-400/40 border-t-cyan-300 rounded-full animate-spin flex-shrink-0" />
      Payment successful — activating your subscription…
    </div>
  );
}

export default function PricingPage() {
  const { isSignedIn } = useUser();
  const { sessionClaims } = useAuth();
  const router = useRouter();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect already-subscribed users straight to dashboard (skip if post-checkout polling)
  useEffect(() => {
    const subscribed = (sessionClaims?.publicMetadata as Record<string, unknown> | undefined)?.subscribed;
    const checkoutSuccess = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('success') === 'true';
    if (isSignedIn && subscribed === true && !checkoutSuccess) {
      router.replace('/dashboard');
    }
  }, [isSignedIn, sessionClaims, router]);

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
          {isSignedIn && (
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
              Dashboard
            </Button>
          )}
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
            No free tier. No trial. Serious traders only.
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

            {isSignedIn ? (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleSubscribe}
                disabled={loading}
              >
                {loading ? 'Redirecting…' : 'Subscribe now'}
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
        </div>
      </main>
    </div>
  );
}
