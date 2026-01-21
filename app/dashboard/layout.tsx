import { NextIntlClientProvider } from 'next-intl';

// Import messages directly instead of using getMessages (which requires locale param)
import messages from '@/messages/de.json';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider messages={messages} locale="de">
      <div className="dashboard-layout min-h-screen bg-stone-50 text-black">
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
