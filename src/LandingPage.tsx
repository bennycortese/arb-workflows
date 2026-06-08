'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { Button } from './@/components/ui/button';
import { Card } from './@/components/ui/card';

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const t = useTranslations('nav');
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.04] bg-background/80 backdrop-blur-md">
      <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#06b6d4"/>
            </svg>
          </div>
          <span className="font-semibold text-white text-sm tracking-tight">{t('brand')}</span>
          <span className="badge-teal text-[10px] px-1.5 py-0.5 rounded font-semibold tracking-wide ml-1" title="Early access — features and pricing may change">{t('beta')}</span>
        </div>
        <div className="flex items-center gap-2">
          <a href="#nodes" className="text-white/70 hover:text-white text-sm transition-colors px-3 py-1.5">{t('nodes')}</a>
          <a href="#how-it-works" className="text-white/70 hover:text-white text-sm transition-colors px-3 py-1.5">{t('howItWorks')}</a>
          {isSignedIn ? (
            <Button variant="primary" size="sm" onClick={() => router.push('/dashboard')}>
              {t('dashboard')}
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={() => router.push('/pricing')}>
              {t('getStarted')}
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const t = useTranslations('landing');
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-14">
      {/* Grid background */}
      <div className="absolute inset-0 bg-grid-lines" />
      <div className="absolute inset-0 bg-radial-fade" />
      {/* Glow orbs */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl" />

      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 badge-teal text-xs px-3 py-1.5 rounded-full mb-8 font-semibold tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse-dot" />
          {t('badge')}
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.05]">
          {t('heroTitle').split('prediction markets').map((part, i) =>
            i === 0 ? (
              <React.Fragment key={i}>
                {part}<span className="gradient-text">prediction markets</span>
              </React.Fragment>
            ) : part
          )}
        </h1>

        <p className="text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed">
          {t('heroSubtitle')}
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          {isSignedIn ? (
            <Button variant="primary" size="lg" onClick={() => router.push('/dashboard')}>
              {t('openDashboard')}
            </Button>
          ) : (
            <>
              <Button variant="primary" size="lg" onClick={() => router.push('/pricing')}>
                {t('ctaPrimary')}
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="#how-it-works">{t('ctaSecondary')}</a>
              </Button>
            </>
          )}
        </div>

        {/* Mini market ticker */}
        <div className="mt-16 flex flex-col items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-white/60 font-semibold">Example markets</span>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {[
              { label: 'Fed rate cut by June', price: '58¢', change: '+4', color: 'text-emerald-400' },
              { label: 'US recession in 2026', price: '35¢', change: '+2', color: 'text-emerald-400' },
              { label: 'S&P 500 above 5,500 EOY', price: '44¢', change: '-3', color: 'text-red-400' },
            ].map(m => (
              <div key={m.label} className="glass-card px-4 py-2.5 rounded-lg flex items-center gap-3">
                <span className="text-xs text-white/70">{m.label}</span>
                <span className="font-mono font-semibold text-sm text-white">{m.price}</span>
                <span className={`font-mono text-xs ${m.color}`}>{m.change}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Nodes showcase ────────────────────────────────────────────────────────────
const NODE_TYPES = [
  {
    id: 'kalshi',
    label: 'Kalshi',
    badgeClass: 'badge-kalshi',
    role: 'Source',
    color: '#4ade80',
    bg: 'bg-emerald-500/5',
    border: 'border-emerald-500/15',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M3 3v18h18" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="m7 16 4-4 4 4 4-4" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    description: 'Create Kalshi price alerts for any market. Monitor the YES price and trigger notifications when it moves above or below your threshold.',
    features: ['Kalshi market monitoring', 'Price threshold alerts', 'Multi-market support'],
  },
  {
    id: 'polymarket',
    label: 'Polymarket',
    badgeClass: 'badge-polymarket',
    role: 'Source',
    color: '#60a5fa',
    bg: 'bg-blue-500/5',
    border: 'border-blue-500/15',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="#60a5fa" strokeWidth="2"/>
        <path d="M12 3c0 0 4 3 4 9s-4 9-4 9" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
        <path d="M12 3c0 0-4 3-4 9s4 9 4 9" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
        <path d="M3 12h18" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    description: 'Create Polymarket price alerts for individual outcomes. Search events, choose an outcome, and monitor it without an API key.',
    features: ['Polymarket event search', 'Outcome-level alerts', 'No API key required'],
  },
  {
    id: 'discord',
    label: 'Discord',
    badgeClass: 'badge-discord',
    role: 'Action',
    color: '#818cf8',
    bg: 'bg-indigo-500/5',
    border: 'border-indigo-500/15',
    icon: (
      <svg width="20" height="16" viewBox="0 0 71 55" fill="none">
        <path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.9a.2.2 0 0 0-.2.1 40.8 40.8 0 0 0-1.8 3.7 54 54 0 0 0-16.2 0A37.3 37.3 0 0 0 25.5 1a.2.2 0 0 0-.2-.1A58.4 58.4 0 0 0 10.7 4.9a.2.2 0 0 0-.1.1C1.6 18.1-.9 31 .3 43.7a.2.2 0 0 0 .1.1 58.8 58.8 0 0 0 17.7 8.9.2.2 0 0 0 .2-.1 42 42 0 0 0 3.6-5.9.2.2 0 0 0-.1-.3 38.7 38.7 0 0 1-5.5-2.6.2.2 0 0 1 0-.4c.4-.3.7-.6 1.1-.9a.2.2 0 0 1 .2 0c11.5 5.3 24 5.3 35.4 0a.2.2 0 0 1 .2 0c.4.3.7.6 1.1.9a.2.2 0 0 1 0 .4 36.1 36.1 0 0 1-5.5 2.6.2.2 0 0 0-.1.3 47 47 0 0 0 3.6 5.9.2.2 0 0 0 .2.1 58.6 58.6 0 0 0 17.8-8.9.2.2 0 0 0 .1-.1C72.9 29.3 70 16.5 60.2 5a.2.2 0 0 0-.1-.1ZM23.7 36.3c-3.5 0-6.4-3.2-6.4-7.1 0-4 2.8-7.1 6.4-7.1 3.6 0 6.5 3.2 6.4 7.1 0 4-2.8 7.1-6.4 7.1Zm23.7 0c-3.5 0-6.4-3.2-6.4-7.1 0-4 2.8-7.1 6.4-7.1 3.6 0 6.5 3.2 6.4 7.1 0 4-2.8 7.1-6.4 7.1Z" fill="#818cf8"/>
      </svg>
    ),
    description: 'Send formatted alerts to any Discord channel via webhook. Use templates with market data variables.',
    features: ['Webhook integration', 'Custom message templates', 'Instant delivery'],
  },
  {
    id: 'email',
    label: 'Email',
    badgeClass: 'badge-email',
    role: 'Action',
    color: '#f87171',
    bg: 'bg-red-500/5',
    border: 'border-red-500/15',
    icon: (
      <svg width="20" height="16" viewBox="0 0 24 20" fill="none">
        <rect x="1" y="1" width="22" height="18" rx="2" stroke="#f87171" strokeWidth="1.5"/>
        <path d="M1 4l11 8 11-8" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    description: 'Email alerts with rich templates. Send to yourself or a team distribution list when thresholds are crossed.',
    features: ['Subject + body templates', 'Powered by AgentMail', 'Instant delivery'],
  },
  {
    id: 'sms',
    label: 'SMS',
    badgeClass: 'badge-sms',
    role: 'Action',
    color: '#4ade80',
    bg: 'bg-green-500/5',
    border: 'border-green-500/15',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="5" y="2" width="14" height="20" rx="2" stroke="#4ade80" strokeWidth="1.5"/>
        <path d="M9 18h6" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M8 7h8M8 11h5" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    description: 'Text alerts to your phone the moment a threshold is crossed. Powered by Twilio.',
    features: ['E.164 phone numbers', 'Custom message templates', 'Instant delivery'],
  },
  {
    id: 'webhook',
    label: 'Webhook',
    badgeClass: 'badge-webhook',
    role: 'Action',
    color: '#22d3ee',
    bg: 'bg-cyan-500/5',
    border: 'border-cyan-500/15',
    icon: <span className="font-mono text-sm font-bold text-cyan-400">{'{ }'}</span>,
    description: 'POST structured market events to Zapier, Make, n8n, databases, or your own services.',
    features: ['Structured JSON payload', 'Optional secret header', 'HTTPS endpoints'],
  },
  {
    id: 'telegram',
    label: 'Telegram',
    badgeClass: 'badge-telegram',
    role: 'Action',
    color: '#38bdf8',
    bg: 'bg-sky-500/5',
    border: 'border-sky-500/15',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M21 4L3 11l7 2.5M21 4l-4 16-7-6.5M21 4L10 13.5M10 13.5V19l3-3" stroke="#38bdf8" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
    description: 'Send instant alerts to a private chat or group through the MarketPing Telegram bot.',
    features: ['Private chats and groups', 'Custom message templates', 'Bot API delivery'],
  },
  {
    id: 'slack',
    label: 'Slack',
    badgeClass: 'badge-slack',
    role: 'Action',
    color: '#c084fc',
    bg: 'bg-purple-500/5',
    border: 'border-purple-500/15',
    icon: <span className="text-xl font-bold text-purple-400">#</span>,
    description: 'Post market alerts to a Slack channel using an incoming webhook.',
    features: ['Channel delivery', 'Custom message templates', 'Incoming webhooks'],
  },
];

function NodesSection() {
  const t = useTranslations('landing');
  return (
    <section id="nodes" className="section-border py-24 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-16">
          <div className="badge-teal inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-semibold tracking-wide mb-4">
            {t('nodesSectionBadge')}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t('nodesSectionTitle')}
          </h2>
          <p className="text-white/70 max-w-lg mx-auto">
            {t('nodesSectionSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {NODE_TYPES.map(node => (
            <Card key={node.id} className={`p-6 ${node.bg} ${node.border} hover:scale-[1.01] transition-transform`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${node.bg} border ${node.border}`}>
                  {node.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white">{node.label}</span>
                    <span className={`${node.badgeClass} text-[10px] px-1.5 py-0.5 rounded font-semibold tracking-wide`}>
                      {node.role.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-white/70 mb-3 leading-relaxed">{node.description}</p>
                  <ul className="space-y-1">
                    {node.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-white/70">
                        <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: node.color }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const t = useTranslations('landing');
  const steps = [
    { n: '01', title: t('step1Title'), body: t('step1Body'), color: 'text-cyan-400' },
    { n: '02', title: t('step2Title'), body: t('step2Body'), color: 'text-blue-400' },
    { n: '03', title: t('step3Title'), body: t('step3Body'), color: 'text-indigo-400' },
  ];

  return (
    <section id="how-it-works" className="section-border py-24 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t('howItWorksTitle')}
          </h2>
          <p className="text-white/70 max-w-lg mx-auto">
            {t('howItWorksSubtitle')}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div key={step.n} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-5 left-[calc(100%+12px)] right-0 h-px bg-white/[0.06] z-10" style={{ width: 'calc(100% - 32px)', left: 'calc(100% + 16px)' }} />
              )}
              <div className="glass-card rounded-xl p-6">
                <div className={`text-4xl font-bold mb-4 tabular-nums ${step.color} opacity-70`}>{step.n}</div>
                <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    question: 'Can I create price alerts for Kalshi markets?',
    answer: 'Yes. Search for a Kalshi event or paste its URL, choose a market, and set an above, below, or any-price threshold. MarketPing monitors the market and sends the alert through your selected action.',
  },
  {
    question: 'Can I create Polymarket alerts?',
    answer: 'Yes. MarketPing lets you search Polymarket events, select an outcome, and receive an alert when its price crosses your threshold.',
  },
  {
    question: 'Where can prediction market alerts be sent?',
    answer: 'MarketPing supports Discord, Telegram, Slack, email, SMS, and generic HTTPS webhooks for tools such as Zapier, Make, and n8n.',
  },
  {
    question: 'Do I need to write code or use an API?',
    answer: 'No. The visual workflow builder handles market monitoring, threshold logic, retries, and duplicate-alert prevention without code.',
  },
];

function FAQSection() {
  return (
    <section className="section-border px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <div className="badge-teal mb-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-wide">
            Prediction market alert FAQ
          </div>
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            Kalshi and Polymarket alert questions
          </h2>
          <p className="mx-auto max-w-xl text-white/70">
            How MarketPing monitors prediction market prices and routes alerts.
          </p>
        </div>
        <div className="space-y-3">
          {FAQS.map(item => (
            <details
              key={item.question}
              className="group rounded-xl border border-white/[0.08] bg-white/[0.025] p-5"
            >
              <summary className="cursor-pointer list-none font-semibold text-white">
                <span className="flex items-center justify-between gap-4">
                  {item.question}
                  <span className="text-cyan-400 transition-transform group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-white/70">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────
function CTA() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const t = useTranslations('landing');
  return (
    <section className="section-border py-24 px-6">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          {t('ctaSectionTitle')}
        </h2>
        <p className="text-white/70 mb-8">{t('ctaSectionSubtitle')}</p>
        {isSignedIn ? (
          <Button variant="primary" size="lg" onClick={() => router.push('/dashboard')}>
            {t('openDashboard')}
          </Button>
        ) : (
          <Button variant="primary" size="lg" onClick={() => router.push('/pricing')}>
            {t('ctaFree')}
          </Button>
        )}
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  const t = useTranslations('landing');
  const tn = useTranslations('nav');
  return (
    <footer className="section-border py-10 px-6">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#06b6d4"/>
            </svg>
          </div>
          <span className="text-sm text-white/70">{tn('brand')}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-white/65">
          <a href="/privacy" className="hover:text-white">Privacy</a>
          <a href="/terms" className="hover:text-white">Terms</a>
          <a href="mailto:bennycortese@gmail.com" className="hover:text-white">Support</a>
        </div>
        <p className="text-xs text-white/60">{t('footerDisclaimer')}</p>
      </div>
    </footer>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <NodesSection />
      <HowItWorks />
      <FAQSection />
      <CTA />
      <Footer />
    </div>
  );
}
