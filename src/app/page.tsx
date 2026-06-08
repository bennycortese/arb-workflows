import LandingPage from '../LandingPage';

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://www.marketping.ai/#website',
      url: 'https://www.marketping.ai',
      name: 'MarketPing',
      alternateName: 'MarketPing AI',
      description: 'Automated Kalshi and Polymarket price alerts.',
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://www.marketping.ai/#software',
      name: 'MarketPing',
      url: 'https://www.marketping.ai',
      isPartOf: {
        '@id': 'https://www.marketping.ai/#website',
      },
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      description: 'No-code Kalshi and Polymarket monitoring with automated prediction market price alerts.',
      offers: {
        '@type': 'Offer',
        price: '19',
        priceCurrency: 'USD',
        category: 'subscription',
      },
      featureList: [
        'Kalshi price alerts',
        'Polymarket price alerts',
        'Discord, Telegram, Slack, email, SMS, and webhook notifications',
        'No-code prediction market workflows',
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Can I create price alerts for Kalshi markets?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. MarketPing monitors Kalshi market prices and sends an alert when the YES price crosses the threshold you configure.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I create Polymarket alerts?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Select a Polymarket event and outcome, choose a price threshold, and send alerts through Discord, Telegram, Slack, email, SMS, or a webhook.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do I need to write code?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. MarketPing provides a visual workflow builder for prediction market monitoring and alert automation.',
          },
        },
      ],
    },
  ],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingPage />
    </>
  );
}
