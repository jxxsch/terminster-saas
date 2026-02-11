'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SWRConfig, useSWRConfig } from 'swr';
import { AppSidebar } from '@/components/shared/AppSidebar';
import { OfflineIndicator } from '@/components/shared/OfflineIndicator';
import { localStorageCacheProvider } from '@/hooks/swr/cache-provider';
import { setScopedMutate } from '@/hooks/swr/use-dashboard-data';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/messages/de.json';

// Synct den scoped mutate aus SWRConfig in die Modul-Referenz,
// damit alle Mutation-Helpers (mutateAppointments, etc.) den richtigen Cache erreichen.
function SWRMutateSync() {
  const { mutate } = useSWRConfig();
  useEffect(() => {
    setScopedMutate(mutate);
  }, [mutate]);
  return null;
}

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
      <SWRConfig
        value={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          provider: localStorageCacheProvider as any,
          revalidateOnFocus: true,
          revalidateOnReconnect: true,
          onError: (error) => {
            // Ignore network errors when offline
            if (!navigator.onLine) return;
            console.error('SWR Error:', error);
          },
        }}
      >
        <SWRMutateSync />
        <OfflineIndicator />
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
      </SWRConfig>
    </NextIntlClientProvider>
  );
}
