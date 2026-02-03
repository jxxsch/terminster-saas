'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authState, setAuthState] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');

  const checkAuth = useCallback(() => {
    const pinSession = localStorage.getItem('admin_pin_session');
    if (pinSession === 'unlocked') {
      setAuthState('authorized');
    } else {
      setAuthState('unauthorized');
      router.push('/dashboard');
    }
  }, [router]);

  // Prüfe PIN-Session beim Mount
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Loading state
  if (authState === 'loading') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Nicht autorisiert → nichts anzeigen (wird zum Dashboard weitergeleitet)
  if (authState === 'unauthorized') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Admin Content (Sidebar kommt aus dem übergeordneten Layout)
  return (
    <div className="h-full md:h-[calc(100vh-40px)] bg-slate-50 rounded-2xl md:rounded-3xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] border border-slate-200/50 flex flex-col overflow-auto pt-14 md:pt-0">
      <div className="p-3 md:p-4 flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
