'use client';

import { useState, useEffect, ReactNode } from 'react';
import { hasConsent, ConsentCategory } from '@/lib/consent';
import { openCookieSettings } from './CookieBanner';

interface ConsentGateProps {
  /** Required consent category to show children */
  category: ConsentCategory;
  /** Content to render when consent is given */
  children: ReactNode;
  /** Placeholder to render when consent is NOT given. If omitted, uses default. */
  fallback?: ReactNode;
  /** CSS classes for the fallback wrapper */
  className?: string;
}

/**
 * ConsentGate: Renders children only if the user has consented to the given category.
 * Otherwise shows a placeholder with a button to open cookie settings.
 *
 * Usage:
 * ```tsx
 * <ConsentGate category="functional" className="absolute inset-0">
 *   <iframe src="https://www.youtube.com/embed/..." />
 * </ConsentGate>
 * ```
 */
export function ConsentGate({ category, children, fallback, className }: ConsentGateProps) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(hasConsent(category));

    const handler = () => {
      setAllowed(hasConsent(category));
    };
    window.addEventListener('consent-changed', handler);
    return () => window.removeEventListener('consent-changed', handler);
  }, [category]);

  if (allowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Default fallback: click-to-consent placeholder
  return (
    <div className={`flex flex-col items-center justify-center bg-gray-900/80 text-white ${className || ''}`}>
      <div className="text-center px-6 py-8">
        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-sm font-medium mb-1">Externer Inhalt blockiert</p>
        <p className="text-xs text-white/60 mb-4 max-w-xs">
          Dieser Inhalt benötigt Ihre Zustimmung für funktionale Cookies.
        </p>
        <button
          onClick={() => openCookieSettings()}
          className="px-4 py-2 bg-white text-black text-xs font-semibold rounded-lg hover:bg-gray-100 transition-colors"
        >
          Cookie-Einstellungen öffnen
        </button>
      </div>
    </div>
  );
}
