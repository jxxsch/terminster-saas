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
    <NextIntlClientProvider messages={messages} locale="de" timeZone="Europe/Berlin">
      <div className="h-screen flex overflow-hidden bg-white">
        {/* Gemeinsame Sidebar - auf Mobile versteckt (erscheint als Drawer via AppSidebar selbst) */}
        <div className="hidden md:flex py-5 pl-5 pr-2">
          <AppSidebar onLogout={handleLogout} />
        </div>
        {/* Mobile Sidebar - wird als fixed overlay gerendert */}
        <div className="md:hidden">
          <AppSidebar onLogout={handleLogout} />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-2 md:py-5 md:pr-5 md:pl-0 overflow-hidden">
          {children}
        </main>
      </div>
    </NextIntlClientProvider>
  );
}
