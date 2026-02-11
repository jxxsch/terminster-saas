'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  acceptAll,
  acceptNecessaryOnly,
  hasAnyConsent,
} from '@/lib/consent';
import { CookieSettingsModal } from './CookieSettingsModal';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    if (hasAnyConsent()) {
      setConsentGiven(true);
    } else {
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for external "open settings" events (e.g. from footer link)
  useEffect(() => {
    const handler = () => setShowSettings(true);
    window.addEventListener('open-cookie-settings', handler);
    return () => window.removeEventListener('open-cookie-settings', handler);
  }, []);

  const handleAcceptAll = useCallback(() => {
    acceptAll();
    setVisible(false);
    setConsentGiven(true);
  }, []);

  const handleNecessaryOnly = useCallback(() => {
    acceptNecessaryOnly();
    setVisible(false);
    setConsentGiven(true);
  }, []);

  const handleSettingsSaved = useCallback(() => {
    setShowSettings(false);
    setVisible(false);
    setConsentGiven(true);
  }, []);

  // Settings modal
  if (showSettings) {
    return (
      <>
        <CookieSettingsModal
          onClose={() => setShowSettings(false)}
          onSaved={handleSettingsSaved}
        />
      </>
    );
  }

  // Banner (first visit, no consent yet)
  if (visible) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[9999] flex justify-center p-4 pb-6 pointer-events-none">
        <div
          role="dialog"
          aria-label="Cookie-Einstellungen"
          className="pointer-events-auto"
          style={{
            width: 320,
            backgroundColor: '#fff',
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px 30px',
            gap: 13,
            boxShadow: '2px 2px 20px rgba(0, 0, 0, 0.062)',
            animation: 'cookieBannerSlideUp 0.5s ease-out',
          }}
        >
          {/* Heading */}
          <span
            style={{
              fontSize: '1.2em',
              fontWeight: 800,
              color: 'rgb(26, 26, 26)',
            }}
          >
            Cookies
          </span>

          {/* Description */}
          <p
            style={{
              textAlign: 'center',
              fontSize: '0.7em',
              fontWeight: 600,
              color: 'rgb(99, 99, 99)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Wir nutzen Cookies für die Grundfunktionen der Website.
            Weitere werden nur mit Ihrer Zustimmung gesetzt.{' '}
            <button
              onClick={() => setShowSettings(true)}
              style={{
                color: 'rgb(59, 130, 246)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 'inherit',
              }}
              className="hover:underline"
            >
              Einstellungen
            </button>
          </p>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 20, flexDirection: 'row' }}>
            <button
              onClick={handleAcceptAll}
              style={{
                height: 30,
                paddingInline: 16,
                backgroundColor: '#D4AF37',
                border: 'none',
                color: 'rgb(241, 241, 241)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.7em',
                borderRadius: 20,
                boxShadow: '0 4px 6px -1px rgba(212,175,55,0.5), 0 2px 4px -1px rgba(212,175,55,0.4)',
                transition: 'all .3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E5C158';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(212,175,55,0.5), 0 4px 6px -2px rgba(212,175,55,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#D4AF37';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(212,175,55,0.5), 0 2px 4px -1px rgba(212,175,55,0.4)';
              }}
            >
              Akzeptieren
            </button>
            <button
              onClick={handleNecessaryOnly}
              style={{
                height: 30,
                paddingInline: 16,
                backgroundColor: '#dadada',
                border: 'none',
                color: 'rgb(46, 46, 46)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.7em',
                borderRadius: 20,
                boxShadow: '0 4px 6px -1px #bebdbd, 0 2px 4px -1px #bebdbd',
                transition: 'all .3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#ebebeb';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px #bebdbd, 0 4px 6px -2px #bebdbd';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#dadada';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px #bebdbd, 0 2px 4px -1px #bebdbd';
              }}
            >
              Ablehnen
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Floating cookie icon (after consent given, always visible)
  if (consentGiven) {
    return (
      <button
        onClick={() => setShowSettings(true)}
        aria-label="Cookie-Einstellungen öffnen"
        className="hidden lg:flex fixed bottom-20 left-5 z-[9998] w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 items-center justify-center cursor-pointer hover:shadow-xl hover:scale-110 transition-all duration-200"
        style={{ animation: 'cookieBannerSlideUp 0.3s ease-out' }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#D4AF37"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
          <path d="M8.5 8.5v.01" />
          <path d="M16 15.5v.01" />
          <path d="M12 12v.01" />
          <path d="M11 17v.01" />
          <path d="M7 14v.01" />
        </svg>
      </button>
    );
  }

  return null;
}

/**
 * Helper: Opens the cookie settings modal from anywhere.
 * Use this in Footer or other components.
 */
export function openCookieSettings(): void {
  window.dispatchEvent(new Event('open-cookie-settings'));
}
