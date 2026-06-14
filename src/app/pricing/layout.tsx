import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'MarketPing pricing for unlimited Kalshi and Polymarket monitoring workflows, price alerts, and notification integrations.',
  alternates: { canonical: '/pricing' },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
