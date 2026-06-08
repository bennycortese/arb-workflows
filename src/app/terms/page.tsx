import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms for using MarketPing prediction market monitoring and notification services.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 text-white/70">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-cyan-400 hover:underline">
          Back to MarketPing
        </Link>
        <h1 className="mt-8 text-4xl font-bold text-white">Terms of Service</h1>
        <p className="mt-3 text-sm text-white/40">Effective June 6, 2026</p>

        <div className="mt-10 space-y-8 leading-7">
          <section>
            <h2 className="text-xl font-semibold text-white">Service</h2>
            <p className="mt-2">
              MarketPing, operated by Benjamin Cortese, provides automated monitoring and
              notification tools for prediction markets. MarketPing does not provide
              investment, financial, legal, or tax advice. Alerts may be delayed, incomplete,
              or unavailable and should not be the sole basis for any financial decision.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Accounts and acceptable use</h2>
            <p className="mt-2">
              You are responsible for your account, workflow settings, and destination
              addresses. You may not use MarketPing unlawfully, disrupt the service, attempt
              unauthorized access, or send messages to anyone who has not consented to receive
              them.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">MarketPing SMS alerts</h2>
            <p className="mt-2">
              By checking the SMS consent box and saving or enabling an SMS workflow, you agree
              to receive recurring automated market-alert text messages from MarketPing at the
              phone number you provide. Messages are triggered by the alerts you configure, so
              message frequency varies. Message and data rates may apply. Consent is not a
              condition of purchase.
            </p>
            <p className="mt-2">
              Reply STOP to cancel SMS messages. After opting out, you may receive one final
              confirmation message. Reply HELP for help or contact{' '}
              <a className="text-cyan-400 hover:underline" href="mailto:bennycortese@gmail.com">
                bennycortese@gmail.com
              </a>{' '}
              or +1 (813) 347-8943. Carriers are not liable for delayed or undelivered messages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Subscriptions</h2>
            <p className="mt-2">
              Paid features are billed at the price and interval shown at checkout. Unless
              otherwise stated, subscriptions renew automatically until canceled. Fees already
              incurred are nonrefundable except where required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Disclaimer and liability</h2>
            <p className="mt-2">
              The service is provided on an “as is” and “as available” basis to the extent
              permitted by law. MarketPing does not guarantee uninterrupted service, market
              data accuracy, alert delivery, or any trading outcome. To the extent permitted
              by law, MarketPing will not be liable for indirect, incidental, special, or
              consequential damages arising from use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Contact</h2>
            <p className="mt-2">
              Questions about these terms may be sent to bennycortese@gmail.com.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
