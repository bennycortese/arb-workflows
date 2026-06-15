import type { Metadata } from 'next';
import IntentLandingPage from '../../IntentLandingPage';

export const metadata: Metadata = {
  title: 'Polymarket Alerts and Price Monitoring',
  description:
    'Set automated Polymarket price alerts for specific events and outcomes. Get notifications through Telegram, Discord, Slack, email, or webhooks.',
  alternates: { canonical: '/polymarket-alerts' },
  openGraph: {
    title: 'Polymarket Alerts and Price Monitoring | MarketPing',
    description:
      'Follow a Polymarket outcome and get notified when its probability crosses your chosen price.',
    url: '/polymarket-alerts',
  },
};

const sections = [
  {
    title: 'Follow Polymarket probabilities automatically',
    paragraphs: [
      'A Polymarket event can contain several outcomes, and each outcome has its own changing market price. MarketPing lets you choose the exact event and outcome that matters, then monitor that price against an above or below threshold.',
      'When the selected outcome crosses your condition, MarketPing routes the event to the notification channels in your workflow. You can follow a market without leaving a browser tab open or repeatedly searching for the same event.',
    ],
    bullets: [
      'Search current Polymarket events',
      'Choose a specific outcome to monitor',
      'Set an above or below price condition',
      'Send alerts to personal or team channels',
    ],
  },
  {
    title: 'How to set a Polymarket alert',
    paragraphs: [
      'Add a Polymarket source to a MarketPing workflow. Search by the event title or topic, select the event, and then choose the outcome whose price you want to track. Enter the threshold and direction that should trigger the workflow.',
      'Add one or more actions for delivery. Telegram works well for immediate personal alerts, Slack and Discord are useful for shared channels, and a generic webhook can connect the market event to your own database, automation, or trading research tool.',
    ],
  },
  {
    title: 'Monitor the outcome, not just the headline',
    paragraphs: [
      'Multi-outcome markets require more precision than a simple event-level notification. Watching the selected outcome prevents ambiguity when probabilities move differently within the same market. MarketPing stores the market and outcome identifiers in the workflow so each run evaluates the intended price.',
      'Prediction market prices are dynamic and can be volatile. An alert tells you that a configured condition was observed; it is not a guarantee that the same price remains available or advice to trade.',
    ],
    bullets: [
      'Track elections and candidate outcomes',
      'Follow sports, economic, or policy events',
      'Watch for a probability entering a target range',
      'Feed outcome changes into custom automations',
    ],
  },
];

const faqs = [
  {
    question: 'Can I monitor one outcome within a Polymarket event?',
    answer:
      'Yes. MarketPing stores the event and selected outcome, then evaluates the price for that specific outcome during each workflow run.',
  },
  {
    question: 'Can I search Polymarket markets inside MarketPing?',
    answer:
      'Yes. The Polymarket source includes market search so you can find an event, inspect its available outcomes, and select the one you want to monitor.',
  },
  {
    question: 'How often are Polymarket conditions checked?',
    answer:
      'Active workflows are checked on MarketPing’s scheduled polling cycle. Delivery timing can also depend on the response time and availability of Polymarket and your chosen notification provider.',
  },
  {
    question: 'Does MarketPing execute Polymarket trades?',
    answer:
      'No. MarketPing is a monitoring and notification service. It does not connect to your wallet, execute trades, or hold funds.',
  },
];

export default function PolymarketAlertsPage() {
  return (
    <IntentLandingPage
      eyebrow="Polymarket monitoring"
      title="Polymarket alerts for"
      accent="the outcomes you follow."
      description="Choose a Polymarket event and outcome, set a probability threshold, and receive an alert when the market crosses it."
      canonicalPath="/polymarket-alerts"
      sections={sections}
      faqs={faqs}
      relatedGuides={[
        {
          href: '/kalshi-alerts',
          label: 'Kalshi alerts',
          description: 'Monitor Kalshi YES prices with above and below threshold conditions.',
        },
        {
          href: '/prediction-market-alerts',
          label: 'Prediction market alerts',
          description: 'Explore cross-platform market monitoring and notification workflows.',
        },
        {
          href: '/telegram-prediction-market-alerts',
          label: 'Telegram market alerts',
          description: 'Send Polymarket outcome alerts directly to a Telegram chat.',
        },
      ]}
    />
  );
}
