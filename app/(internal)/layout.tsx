'use client';

import { AppSidebar } from '@/components/shared/AppSidebar';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/messages/de.json';

export default function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider messages={messages} locale="de">
      <div className="h-screen flex overflow-hidden bg-white">
        {/* Gemeinsame Sidebar - volle Höhe mit gleichmäßigen Rändern */}
        <div className="py-6 pl-6 pr-3 flex">
          <AppSidebar />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 py-6 pr-6 overflow-hidden">
          {children}
        </main>
      </div>
    </NextIntlClientProvider>
  );
}
