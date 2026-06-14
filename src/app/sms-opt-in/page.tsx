import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'SMS Alert Opt-In',
  description: 'How MarketPing users consent to receive automated prediction market SMS alerts.',
  alternates: { canonical: '/sms-opt-in' },
};

export default function SmsOptInPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 text-white/70">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-cyan-400 hover:underline">
          Back to MarketPing
        </Link>
        <h1 className="mt-8 text-4xl font-bold text-white">MarketPing SMS Opt-In</h1>
        <p className="mt-4 leading-7">
          This page documents the web-form opt-in shown inside MarketPing&apos;s authenticated
          workflow builder. A user enters their own mobile number and must actively select the
          unchecked consent box before MarketPing permits SMS alerts to be sent.
        </p>

        <section className="mt-10 rounded-xl border border-white/[0.08] bg-white/[0.025] p-6">
          <h2 className="text-lg font-semibold text-white">SMS alert configuration</h2>
          <p className="mt-1 text-sm text-white/40">Example of the form presented to users</p>

          <div className="mt-6">
            <label htmlFor="opt-in-phone" className="text-sm font-medium text-white/70">
              To Phone Number
            </label>
            <input
              id="opt-in-phone"
              type="tel"
              placeholder="+15551234567"
              readOnly
              className="mt-2 block w-full rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-white placeholder:text-white/25"
            />
          </div>

          <label
            htmlFor="opt-in-consent"
            className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4"
          >
            <input
              id="opt-in-consent"
              type="checkbox"
              className="mt-1 h-4 w-4 accent-cyan-500"
            />
            <span className="text-sm leading-6 text-white/60">
              I agree to receive recurring automated market-alert text messages from MarketPing
              at the number above. Message frequency varies based on my alerts. Message and data
              rates may apply. Reply STOP to opt out or HELP for help. Consent is not a condition
              of purchase.{' '}
              <Link href="/terms" className="text-cyan-400 hover:underline">Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-cyan-400 hover:underline">Privacy Policy</Link>.
            </span>
          </label>

          <p className="mt-5 text-sm text-white/40">
            The checkbox is unchecked by default. MarketPing stores the user&apos;s affirmative
            choice only after the user selects the checkbox and clicks the confirmation button.
            MarketPing blocks sending unless consent has been confirmed.
          </p>

          <button
            type="button"
            className="mt-5 w-full rounded-lg bg-cyan-500 px-5 py-3 text-sm font-semibold text-black"
          >
            Confirm SMS opt-in
          </button>

          <p className="mt-3 text-xs text-white/35">
            This public page is a non-submitting example of the form shown in the authenticated
            workflow builder.
          </p>
        </section>

        <section className="mt-10 space-y-3 leading-7">
          <h2 className="text-xl font-semibold text-white">Messaging program</h2>
          <p>
            Messages are transactional account notifications triggered by prediction-market
            thresholds configured by the user. Frequency varies and is expected to average
            approximately 100 messages per month across the program.
          </p>
          <p>
            Reply STOP to unsubscribe or HELP for help. Support is available at{' '}
            <a href="mailto:bennycortese@gmail.com" className="text-cyan-400 hover:underline">
              bennycortese@gmail.com
            </a>.
          </p>
        </section>
      </article>
    </main>
  );
}
