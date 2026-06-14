'use client';

import { SignInButton, UserButton, useUser } from '@clerk/nextjs';

const primaryClass =
  'inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg bg-cyan-500 px-6 text-base font-semibold text-black shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_28px_rgba(6,182,212,0.5)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';
const smallPrimaryClass =
  'inline-flex h-8 items-center justify-center whitespace-nowrap rounded-lg bg-cyan-500 px-3 text-xs font-semibold text-black shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_28px_rgba(6,182,212,0.5)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export function LandingNavAccount({ initialSignedIn }: { initialSignedIn: boolean }) {
  const { isLoaded, isSignedIn } = useUser();
  const signedIn = isLoaded ? isSignedIn : initialSignedIn;

  if (signedIn) {
    return (
      <div className="flex items-center gap-2">
        <a href="/pricing" className="hidden px-3 py-1.5 text-sm text-white/70 transition-colors hover:text-white sm:inline-flex">
          Pricing
        </a>
        <a href="/dashboard" className={smallPrimaryClass}>Open dashboard</a>
        {isLoaded && <UserButton />}
      </div>
    );
  }

  if (!isLoaded) {
    return <a href="/pricing" className={smallPrimaryClass}>Start free</a>;
  }

  return (
    <div className="flex items-center gap-2">
      <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
        <button className="hidden px-3 py-1.5 text-sm text-white/70 transition-colors hover:text-white sm:inline-flex">
          Sign in
        </button>
      </SignInButton>
      <a href="/pricing" className={smallPrimaryClass}>Start free</a>
    </div>
  );
}

export function LandingPrimaryCta({
  className = primaryClass,
  initialSignedIn,
}: {
  className?: string;
  initialSignedIn: boolean;
}) {
  const { isLoaded, isSignedIn } = useUser();
  const signedIn = isLoaded ? isSignedIn : initialSignedIn;

  if (signedIn) {
    return <a href="/dashboard" className={className}>Open dashboard</a>;
  }

  return <a href="/pricing" className={className}>Start free</a>;
}
