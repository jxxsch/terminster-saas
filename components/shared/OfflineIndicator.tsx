'use client';

import { useOnlineStatus } from '@/hooks/swr/use-dashboard-data';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800 font-medium">
      <span className="inline-flex items-center gap-2">
        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
        Offline – Gespeicherte Daten werden angezeigt
      </span>
    </div>
  );
}
