import type { Metadata } from 'next';
import IntentLandingPage from '../../IntentLandingPage';

export const metadata: Metadata = {
  title: 'Telegram Prediction Market Alerts',
  description:
    'Send Kalshi and Polymarket price alerts to Telegram. Connect a chat, select a market threshold, and receive automated prediction market notifications.',
  alternates: { canonical: '/telegram-prediction-market-alerts' },
  openGraph: {
    title: 'Telegram Prediction Market Alerts | MarketPing',
    description:
      'Connect Telegram to a MarketPing workflow and receive Kalshi or Polymarket threshold alerts.',
    url: '/telegram-prediction-market-alerts',
  },
};

const sections = [
  {
    title: 'Fast prediction market alerts in Telegram',
    paragraphs: [
      'Telegram is a practical destination for prediction market monitoring because notifications arrive on desktop and mobile without requiring a shared workspace. MarketPing connects a Telegram chat to your account, then lets any supported Kalshi or Polymarket workflow send messages to that destination.',
      'The alert includes the market context and observed condition so you can quickly understand why the workflow triggered. You remain in control of which markets are monitored and which Telegram chat receives each notification.',
    ],
    bullets: [
      'Personal chat and group support',
      'Kalshi and Polymarket market sources',
      'Above and below price thresholds',
      'Test messages before activating a workflow',
    ],
  },
  {
    title: 'How to connect Telegram to MarketPing',
    paragraphs: [
      'Open the Telegram connection flow in MarketPing and generate a short-lived connection link. Follow that link to the MarketPing bot in Telegram and send the prepared command. MarketPing associates the resulting chat with your account without requiring you to find or paste a numeric chat ID.',
      'After the connection appears in MarketPing, add Telegram as an action in your workflow and select the connected chat. Use the test-alert control to confirm delivery before enabling your market condition.',
    ],
  },
  {
    title: 'Personal alerts and group monitoring',
    paragraphs: [
      'A private Telegram chat is useful for individual monitoring while away from a trading screen. A group can provide a shared stream for researchers or collaborators following the same market. Each workflow can be configured independently, so different conditions can route to different chats.',
      'Telegram delivery depends on the availability of Telegram’s Bot API, and market alerts can arrive after a price has changed again. Treat notifications as monitoring signals and verify live market information before making financial decisions.',
    ],
    bullets: [
      'Receive mobile alerts without email delay',
      'Share selected market events with a group',
      'Separate alerts by strategy or topic',
      'Disable a workflow without disconnecting Telegram',
    ],
  },
];

const faqs = [
  {
    question: 'Do I need to create my own Telegram bot?',
    answer:
      'No. MarketPing provides the Telegram bot used for alert delivery. You connect a chat to your MarketPing account and select it as a workflow action.',
  },
  {
    question: 'Where do I find my Telegram chat ID?',
    answer:
      'You do not need to find it manually. The MarketPing connection flow generates a Telegram link and records the chat after you send the prepared command to the bot.',
  },
  {
    question: 'Can MarketPing send alerts to a Telegram group?',
    answer:
      'Yes, provided the MarketPing bot has been added to the group and the connection flow is completed from that chat with the required permissions.',
  },
  {
    question: 'Can I test a Telegram alert?',
    answer:
      'Yes. Use the test-alert control on the Telegram action to verify that the selected chat can receive messages before relying on an active market workflow.',
  },
];

export default function TelegramPredictionMarketAlertsPage() {
  return (
    <IntentLandingPage
      eyebrow="Telegram alerts"
      title="Prediction market alerts,"
      accent="delivered to Telegram."
      description="Connect a Telegram chat and receive automated Kalshi or Polymarket notifications when your selected price condition is met."
      canonicalPath="/telegram-prediction-market-alerts"
      sections={sections}
      faqs={faqs}
      relatedGuides={[
        {
          href: '/prediction-market-alerts',
          label: 'Prediction market alerts',
          description: 'See every supported source, destination, and workflow pattern.',
        },
        {
          href: '/kalshi-alerts',
          label: 'Kalshi alerts',
          description: 'Monitor Kalshi YES prices and route threshold events to Telegram.',
        },
        {
          href: '/polymarket-alerts',
          label: 'Polymarket alerts',
          description: 'Follow a selected Polymarket outcome and receive price notifications.',
        },
      ]}
    />
  );
}
