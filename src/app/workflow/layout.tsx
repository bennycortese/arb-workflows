import { ClerkProvider } from '@clerk/nextjs';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../../messages/en.json';

export default function WorkflowLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <NextIntlClientProvider locale="en" messages={messages}>
        {children}
      </NextIntlClientProvider>
    </ClerkProvider>
  );
}
