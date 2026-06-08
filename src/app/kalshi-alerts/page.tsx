import type { Metadata } from 'next';
import IntentLandingPage from '../../IntentLandingPage';

export const metadata: Metadata = {
  title: 'Kalshi Alerts and Price Monitoring',
  description:
    'Create automated Kalshi price alerts without code. Monitor market probabilities and send notifications to Telegram, Discord, Slack, email, SMS, or webhooks.',
  alternates: { canonical: '/kalshi-alerts' },
  openGraph: {
    title: 'Kalshi Alerts and Price Monitoring | MarketPing',
    description:
      'Monitor Kalshi markets and receive an alert when a YES price crosses your chosen threshold.',
    url: '/kalshi-alerts',
  },
};

const sections = [
  {
    title: 'Automated price alerts for Kalshi markets',
    paragraphs: [
      'Kalshi prices can change quickly as new information enters a market. MarketPing continuously checks the contract you select and evaluates its YES price against a threshold you control. When the condition is met, the workflow sends an alert to your configured destination.',
      'This replaces repeated tab refreshing with a simple monitoring rule. You can watch for a price moving above a level when conviction increases or below a level when the implied probability falls.',
    ],
    bullets: [
      'Monitor a specific Kalshi market ticker',
      'Trigger above or below a chosen YES price',
      'Route one condition to multiple alert channels',
      'Pause or update workflows without code',
    ],
  },
  {
    title: 'How to create a Kalshi alert',
    paragraphs: [
      'Start a workflow and add Kalshi as the source. Search available markets by event, topic, or ticker, then select the contract you want to monitor. Choose an above or below condition and enter the price threshold.',
      'Connect an action such as Telegram, Discord, Slack, email, SMS, or a generic webhook. Once the workflow is active, MarketPing polls the market and records each run so you can see what happened.',
    ],
  },
  {
    title: 'Useful Kalshi monitoring strategies',
    paragraphs: [
      'Threshold alerts are useful for following macroeconomic releases, elections, weather events, sports, and other time-sensitive contracts. A trader can watch for a market to break through a target probability, while a researcher can monitor a collection of contracts without keeping every market open.',
      'Alerts are informational signals, not trading instructions. Market prices can move through a threshold briefly, and prediction markets involve financial risk. Confirm the current market state before making a decision.',
    ],
    bullets: [
      'Watch an event before a scheduled announcement',
      'Track probability changes while away from your desk',
      'Send market events into an internal webhook',
      'Notify a team through Slack or Discord',
    ],
  },
];

const faqs = [
  {
    question: 'Can MarketPing monitor any Kalshi market?',
    answer:
      'MarketPing can search and monitor available Kalshi markets exposed through the supported market data API. Closed, settled, or unavailable contracts may no longer appear in search.',
  },
  {
    question: 'How does a Kalshi price alert work?',
    answer:
      'You choose a market, a YES price threshold, and whether the alert should trigger above or below that level. MarketPing checks the condition during scheduled workflow runs and notifies the destinations you configured.',
  },
  {
    question: 'Will the same condition send duplicate alerts?',
    answer:
      'MarketPing tracks threshold state to avoid repeatedly notifying you while a market remains on the same side of the threshold. A new alert can occur after the condition resets and crosses again.',
  },
  {
    question: 'Does MarketPing place Kalshi trades?',
    answer:
      'No. MarketPing monitors market data and sends notifications. It does not place orders or manage funds in your Kalshi account.',
  },
];

export default function KalshiAlertsPage() {
  return (
    <IntentLandingPage
      eyebrow="Kalshi monitoring"
      title="Kalshi price alerts,"
      accent="without constant refreshing."
      description="Monitor Kalshi market probabilities and receive an alert when the YES price moves above or below the threshold you choose."
      canonicalPath="/kalshi-alerts"
      sections={sections}
      faqs={faqs}
      relatedGuides={[
        {
          href: '/prediction-market-alerts',
          label: 'Prediction market alerts',
          description: 'Compare sources and send market events to any supported destination.',
        },
        {
          href: '/polymarket-alerts',
          label: 'Polymarket alerts',
          description: 'Monitor a selected outcome within a Polymarket event.',
        },
        {
          href: '/telegram-prediction-market-alerts',
          label: 'Telegram market alerts',
          description: 'Deliver Kalshi and Polymarket threshold alerts to Telegram.',
        },
      ]}
    />
  );
}
