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

  useEffect(() => {
    if (!hasAnyConsent()) {
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
  }, []);

  const handleNecessaryOnly = useCallback(() => {
    acceptNecessaryOnly();
    setVisible(false);
  }, []);

  const handleSettingsSaved = useCallback(() => {
    setShowSettings(false);
    setVisible(false);
  }, []);

  // Settings modal can be opened independently (from footer)
  if (showSettings) {
    return (
      <CookieSettingsModal
        onClose={() => setShowSettings(false)}
        onSaved={handleSettingsSaved}
      />
    );
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 pointer-events-none">
      <div
        role="dialog"
        aria-label="Cookie-Einstellungen"
        className="pointer-events-auto animate-in slide-in-from-bottom duration-500"
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
        }}
      >
        {/* Cookie SVG */}
        <svg
          width="50"
          viewBox="0 0 122.88 122.25"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g>
            <path
              fill="rgb(97, 81, 81)"
              d="M101.77,49.38c2.09,3.1,4.37,5.11,6.86,5.74c-4.67,1.23-8.23,4.19-10.58,8.44 c-0.13-4.78-1.27-9.53-4.42-12.52C96.77,48.56,99.65,47.93,101.77,49.38L101.77,49.38z M21.58,66.35 c0.96,1.75,1.77,3.82,2.28,5.84c0.5,2.01,0.71,3.97,0.52,5.56c-0.5,4.06-2.11,7.26-4.67,9.53c1.42-3.56,1.32-7.43-0.17-11.48 c-1.22-3.32-3.3-6.78-6.08-10.22C16.32,64.62,19.17,63.16,21.58,66.35L21.58,66.35z M42.03,44.71 c3.33,4.94,6.97,8.16,10.93,9.15c-7.44,1.96-13.13,6.69-16.87,13.47c-0.2-7.63-2.03-15.2-7.05-19.97 C34.06,43.4,38.92,42.11,42.03,44.71L42.03,44.71z M99.2,27.39c2.09,3.1,4.37,5.11,6.86,5.74c-4.67,1.23-8.23,4.19-10.58,8.44 c-0.13-4.78-1.27-9.53-4.42-12.52C94.2,26.56,97.08,25.93,99.2,27.39L99.2,27.39z M61.44,0c16.97,0,32.33,6.88,43.44,18 c11.12,11.12,18,26.48,18,43.44c0,16.97-6.88,32.33-18,43.44c-11.12,11.12-26.48,18-43.44,18c-16.97,0-32.33-6.88-43.44-18 C6.88,93.77,0,78.41,0,61.44C0,44.47,6.88,29.11,18,18C29.11,6.88,44.47,0,61.44,0L61.44,0z M97.6,22.61 c-9.72-9.72-23.14-15.73-37.96-15.73S29.37,12.89,19.65,22.61c-9.72,9.72-15.73,23.14-15.73,37.96 c-0.78,22.46,12.34,43.92,34.37,50.73c-6.07-4.37-12.46-4.27-14.44-7.96c-2.82-5.27,3.74-10.97,1.48-15.1 c-2.39-4.37-11.07-3.47-11.07-14.95c0-2.82,0.71-4.83,1.8-6.42c-2.04-2.72-1.2-7.62,3.26-9.38c2.89-1.14,5.53-1,7.78,0.12 c5.14-5.26,12.08-8.6,19.46-9.97c-0.12-1.54-0.56-3.15-1.42-4.88c-3.42-0.41-5.63-3.01-5.81-7.02 c-0.09-2.07,0.44-4.32,1.58-6.49c2.13-4.07,6.37-7.31,12.22-6.75c3.42,0.33,6.2,1.98,8.36,4.15 c5.8-1.9,12.39-0.62,17.07,4.32c3.65,3.85,5.41,8.71,5.66,13.54c0.39-0.03,0.78-0.05,1.17-0.05c4.37,0,8.13,1.98,10.63,5.03 c5.24,2.88,7.75,8.02,7.66,12.79c-0.08,3.88-1.67,7.51-4.74,9.65c0.15,1.14,0.22,2.29,0.22,3.44 c0,6.87-2.62,13.12-6.93,17.82c-0.05,3.85-1.07,6.97-2.84,9.43c7.05-10.4,10.75-22.29,10.75-34.53 C113.33,45.75,107.32,32.33,97.6,22.61L97.6,22.61z M65.04,55.96c4.24,0.53,7.67,2.78,10.32,6.07c1.37-0.83,3-1.27,4.69-1.27 c2.2,0,4.37,0.81,6.14,2.42c1.66,1.5,2.79,3.52,3.28,5.79c2.4,0.21,4.57,1.21,6.2,2.78c1.79,1.72,2.91,4.1,3.02,6.77 c0.08,2.03-0.47,4.19-1.79,6.15c2.35,2.96,2.96,6.63,1.76,9.75c-1.1,2.84-3.52,5.21-7.14,6.32c0.18,3.65-0.98,6.64-2.93,8.77 c-2.26,2.47-5.63,3.75-9.36,3.38c-2.48,3.37-5.99,4.88-9.67,4.67c-3.33-0.2-6.73-1.84-9.57-4.86 c-3.4,0.89-6.47,0.23-9.02-1.47c-2.87-1.91-5.03-5.14-6.07-8.92c-3.42-0.26-6.16-1.79-8.03-4.14 c-2.07-2.6-3.09-6.1-2.74-9.81c-3.1-1.64-5.08-4.27-5.79-7.34c-0.78-3.36-0.06-7.2,2.31-10.72c-1.7-3.57-1.68-7.2-0.13-10.22 c1.68-3.27,5.04-5.8,9.53-6.8c0.18-3.61,1.66-6.56,3.95-8.6c2.59-2.31,6.23-3.49,10.13-2.87c2.12-3.4,5.25-5.35,8.69-5.73 c3.19-0.35,6.53,0.7,9.42,3.3c3.44-1.15,6.6-0.74,9.22,0.72c2.88,1.61,5.08,4.47,6.11,7.97c1.56,0.37,3.01,0.99,4.34,1.81 c-2.37-4.47-5.74-7.55-10.31-8.48C70.77,51.96,68.78,53.32,65.04,55.96L65.04,55.96z"
            />
          </g>
        </svg>

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
              backgroundColor: '#c8a45e',
              border: 'none',
              color: 'rgb(241, 241, 241)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.7em',
              borderRadius: 20,
              boxShadow: '0 4px 6px -1px rgba(200,164,94,0.5), 0 2px 4px -1px rgba(200,164,94,0.4)',
              transition: 'all .3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#d4b36e';
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(200,164,94,0.5), 0 4px 6px -2px rgba(200,164,94,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#c8a45e';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(200,164,94,0.5), 0 2px 4px -1px rgba(200,164,94,0.4)';
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

/**
 * Helper: Opens the cookie settings modal from anywhere.
 * Use this in Footer or other components.
 */
export function openCookieSettings(): void {
  window.dispatchEvent(new Event('open-cookie-settings'));
}
