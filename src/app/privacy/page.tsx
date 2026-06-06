import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | MarketPing',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 text-white/70">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-cyan-400 hover:underline">
          Back to MarketPing
        </Link>
        <h1 className="mt-8 text-4xl font-bold text-white">Privacy Policy</h1>
        <p className="mt-3 text-sm text-white/40">Effective June 6, 2026</p>

        <div className="mt-10 space-y-8 leading-7">
          <section>
            <h2 className="text-xl font-semibold text-white">Who we are</h2>
            <p className="mt-2">
              MarketPing is operated by Benjamin Cortese, a sole proprietor. Questions about
              this policy may be sent to{' '}
              <a className="text-cyan-400 hover:underline" href="mailto:bennycortese@gmail.com">
                bennycortese@gmail.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Information we collect</h2>
            <p className="mt-2">
              We collect account details, workflow configuration, destination email addresses
              and phone numbers, payment and subscription status, and technical information
              needed to operate, secure, and improve MarketPing. Payment card details are
              processed by our payment provider and are not stored by MarketPing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">How we use information</h2>
            <p className="mt-2">
              We use information to provide market monitoring and alerts, authenticate users,
              process subscriptions, provide support, prevent abuse, and comply with legal
              obligations. We retain information only as long as reasonably necessary for
              these purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">SMS privacy</h2>
            <p className="mt-2">
              Mobile phone numbers, SMS opt-in records, and consent information are used only
              to deliver the alerts a user requests and to support the messaging program.
              Mobile information will not be sold, rented, or shared with third parties or
              affiliates for marketing or promotional purposes. We may share it with service
              providers, such as telecommunications providers, solely to deliver messages and
              operate the service. Text messaging originator opt-in data and consent will not
              be shared with any third parties for their own purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Your choices</h2>
            <p className="mt-2">
              You may update or remove workflow data in MarketPing. To stop SMS messages, reply
              STOP to any message or disable the relevant SMS workflow. Reply HELP for help.
              You may request access, correction, or deletion of personal information by
              emailing us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Changes</h2>
            <p className="mt-2">
              We may update this policy as the service changes. The effective date above
              identifies the latest revision.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
