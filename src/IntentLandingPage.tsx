import Link from 'next/link';

type Section = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

type FAQ = {
  question: string;
  answer: string;
};

type RelatedGuide = {
  href: string;
  label: string;
  description: string;
};

type IntentLandingPageProps = {
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  canonicalPath: string;
  sections: Section[];
  faqs: FAQ[];
  relatedGuides?: RelatedGuide[];
};

const primaryButtonClass =
  'inline-flex h-11 items-center justify-center rounded-lg bg-cyan-500 px-6 text-sm font-semibold text-black shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300';

export default function IntentLandingPage({
  eyebrow,
  title,
  accent,
  description,
  canonicalPath,
  sections,
  faqs,
  relatedGuides = [],
}: IntentLandingPageProps) {
  const url = `https://www.marketping.ai${canonicalPath}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: title,
        url,
        description,
        isPartOf: {
          '@type': 'WebSite',
          name: 'MarketPing',
          url: 'https://www.marketping.ai',
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'MarketPing',
            item: 'https://www.marketping.ai',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: title,
            item: url,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
    ],
  };

  return (
    <main className="min-h-screen overflow-hidden bg-background text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <nav className="border-b border-white/[0.06]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
              ↗
            </span>
            MarketPing
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/pricing" className="text-white/70 hover:text-white">
              Pricing
            </Link>
            <Link href="/dashboard" className="text-cyan-400 hover:text-cyan-300">
              Open dashboard
            </Link>
          </div>
        </div>
      </nav>

      <header className="relative border-b border-white/[0.06] px-6 py-24 text-center">
        <div className="absolute inset-0 bg-grid-lines" />
        <div className="absolute inset-0 bg-radial-fade" />
        <div className="relative mx-auto max-w-4xl">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
            {eyebrow}
          </p>
          <h1 className="text-balance text-4xl font-bold tracking-tight md:text-6xl">
            {title} <span className="gradient-text">{accent}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/70">
            {description}
          </p>
          <div className="mt-9 flex justify-center gap-3">
            <Link href="/pricing" className={primaryButtonClass}>
              Start monitoring markets
            </Link>
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-20">
        <div className="space-y-14">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{section.title}</h2>
              <div className="mt-5 space-y-4 text-base leading-8 text-white/70">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              {section.bullets && (
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {section.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-sm leading-6 text-white/75"
                    >
                      <span className="mr-2 text-cyan-400">✓</span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <section className="mt-20 border-t border-white/[0.08] pt-14">
          <h2 className="text-2xl font-bold">Frequently asked questions</h2>
          <div className="mt-6 space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-xl border border-white/[0.08] bg-white/[0.025] p-5"
              >
                <summary className="cursor-pointer list-none font-semibold">
                  <span className="flex items-center justify-between gap-4">
                    {faq.question}
                    <span className="text-cyan-400 transition-transform group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 leading-7 text-white/70">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {relatedGuides.length > 0 && (
          <section className="mt-20 border-t border-white/[0.08] pt-14">
            <h2 className="text-2xl font-bold">Related prediction market guides</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {relatedGuides.map((guide) => (
                <Link
                  key={guide.href}
                  href={guide.href}
                  className="glass-card rounded-xl p-5 hover:border-cyan-500/30"
                >
                  <h3 className="font-semibold text-cyan-400">{guide.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/65">{guide.description}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>

      <section className="border-t border-white/[0.06] px-6 py-16 text-center">
        <h2 className="text-3xl font-bold">Build your first alert workflow</h2>
        <p className="mx-auto mt-3 max-w-xl text-white/70">
          Select a market, set a price condition, and choose where MarketPing should notify you.
        </p>
        <Link href="/pricing" className={`${primaryButtonClass} mt-7`}>
          View plans
        </Link>
      </section>

      <footer className="border-t border-white/[0.06] px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm text-white/60">
          <Link href="/" className="hover:text-white">MarketPing</Link>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
