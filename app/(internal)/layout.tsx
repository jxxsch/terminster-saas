'use client';

import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/shared/AppSidebar';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/messages/de.json';

export default function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleLogout = () => {
    // Sessions löschen
    localStorage.removeItem('dashboard_session');
    localStorage.removeItem('admin_pin_session');
    localStorage.removeItem('admin_previous_path');
    // Zur Startseite weiterleiten
    router.push('/');
  };

  return (
    <NextIntlClientProvider messages={messages} locale="de">
      <div className="h-screen flex overflow-hidden bg-white">
        {/* Gemeinsame Sidebar - volle Höhe mit gleichmäßigen Rändern */}
        <div className="py-6 pl-6 pr-3 flex">
          <AppSidebar onLogout={handleLogout} />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 py-6 pr-6 overflow-hidden">
          {children}
        </main>
      </div>
    </NextIntlClientProvider>
  );
}
