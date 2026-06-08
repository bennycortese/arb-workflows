import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.marketping.ai'),
  title: {
    default: 'Kalshi & Polymarket Alerts | MarketPing',
    template: '%s | MarketPing',
  },
  description: 'Create automated Kalshi and Polymarket price alerts for Discord, Telegram, Slack, email, SMS, and webhooks. No-code prediction market monitoring.',
  keywords: [
    'Kalshi alerts',
    'Polymarket alerts',
    'prediction market alerts',
    'prediction market automation',
    'Kalshi price alerts',
    'Polymarket price alerts',
  ],
  applicationName: 'MarketPing',
  authors: [{ name: 'Benjamin Cortese' }],
  creator: 'MarketPing',
  publisher: 'MarketPing',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'MarketPing',
    title: 'Kalshi & Polymarket Price Alerts | MarketPing',
    description: 'Monitor prediction market prices and send automated alerts to Discord, Telegram, Slack, email, SMS, or any webhook.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kalshi & Polymarket Price Alerts | MarketPing',
    description: 'No-code prediction market monitoring and automated price alerts.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={inter.variable}>
        <body className={inter.className}>
          <NextIntlClientProvider locale="en" messages={messages}>
            {children}
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
