import type { Metadata } from 'next';
import IntentLandingPage from '../../IntentLandingPage';

export const metadata: Metadata = {
  title: 'Prediction Market Alerts and Automation',
  description:
    'Automate prediction market alerts across Kalshi and Polymarket. Monitor price thresholds and notify Telegram, Discord, Slack, email, SMS, or webhooks.',
  alternates: { canonical: '/prediction-market-alerts' },
  openGraph: {
    title: 'Prediction Market Alerts and Automation | MarketPing',
    description:
      'Build no-code workflows that monitor prediction market prices and route alerts to the tools you use.',
    url: '/prediction-market-alerts',
  },
};

const sections = [
  {
    title: 'One workflow for market monitoring and notification',
    paragraphs: [
      'Prediction markets turn changing expectations into observable prices, but following those prices manually does not scale. MarketPing separates monitoring into two simple parts: a source that defines the market condition and an action that defines where the resulting alert should go.',
      'Sources currently support Kalshi and Polymarket. Actions include Telegram, Discord, Slack, email, SMS, and generic webhooks. This makes it possible to use the same workflow model for a personal notification, a shared research channel, or a custom downstream system.',
    ],
    bullets: [
      'No-code threshold conditions',
      'Kalshi and Polymarket sources',
      'Personal, team, and developer destinations',
      'Workflow run history and test alerts',
    ],
  },
  {
    title: 'How prediction market price alerts work',
    paragraphs: [
      'Choose a market and specify whether its price should be above or below your target. MarketPing polls active workflows, evaluates the current market value, and sends the configured actions when the condition crosses the threshold.',
      'Threshold state helps prevent a workflow from sending the same alert on every polling cycle. If the market moves back across the reset point and later satisfies the condition again, the workflow can alert on the new crossing.',
    ],
  },
  {
    title: 'From a notification to a complete automation',
    paragraphs: [
      'A simple workflow might send a Telegram message when a market reaches 60 cents. A team could post the same event to Slack or Discord. A developer can use the webhook action to write the event to a database, trigger an n8n or Make scenario, or connect an unsupported destination.',
      'MarketPing provides monitoring infrastructure rather than investment advice or trade execution. Prediction market prices can change between a polling event, notification delivery, and any action you independently choose to take.',
    ],
    bullets: [
      'Follow economic and political probabilities',
      'Notify a research or trading team',
      'Connect market events to Zapier, Make, or n8n',
      'Keep an auditable history of workflow runs',
    ],
  },
];

const faqs = [
  {
    question: 'What is a prediction market alert?',
    answer:
      'A prediction market alert is a notification generated when a selected market price meets a condition, such as moving above or below a probability threshold.',
  },
  {
    question: 'Which prediction markets does MarketPing support?',
    answer:
      'MarketPing currently supports market search and price monitoring for Kalshi and Polymarket.',
  },
  {
    question: 'Where can prediction market alerts be sent?',
    answer:
      'Workflows can send alerts to Telegram, Discord, Slack, email, SMS, or a generic webhook for custom integrations.',
  },
  {
    question: 'Do I need to write code to create an alert?',
    answer:
      'No. The visual workflow builder lets you choose a source, configure a price condition, and connect an action without writing code. Webhooks remain available for developers who want custom behavior.',
  },
];

export default function PredictionMarketAlertsPage() {
  return (
    <IntentLandingPage
      eyebrow="Prediction market automation"
      title="Prediction market alerts,"
      accent="routed anywhere."
      description="Monitor Kalshi and Polymarket price thresholds with no-code workflows, then send each market event to the channel or system that needs it."
      canonicalPath="/prediction-market-alerts"
      sections={sections}
      faqs={faqs}
      relatedGuides={[
        {
          href: '/kalshi-alerts',
          label: 'Kalshi alerts',
          description: 'Create threshold alerts for specific Kalshi market tickers.',
        },
        {
          href: '/polymarket-alerts',
          label: 'Polymarket alerts',
          description: 'Monitor the price of a selected outcome within a Polymarket event.',
        },
        {
          href: '/telegram-prediction-market-alerts',
          label: 'Telegram market alerts',
          description: 'Connect a Telegram chat for immediate market threshold notifications.',
        },
      ]}
    />
  );
}
