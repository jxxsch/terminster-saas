'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getConsent,
  saveConsent,
  CONSENT_CATEGORIES,
  ConsentCategory,
} from '@/lib/consent';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export function CookieSettingsModal({ onClose, onSaved }: Props) {
  const existing = getConsent();

  const [categories, setCategories] = useState<Record<ConsentCategory, boolean>>({
    necessary: true,
    functional: existing?.categories.functional ?? false,
    analytics: existing?.categories.analytics ?? false,
    marketing: existing?.categories.marketing ?? false,
  });

  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  // Focus trap: focus first element on mount
  useEffect(() => {
    firstFocusRef.current?.focus();
  }, []);

  // ESC closes modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleToggle = useCallback((id: ConsentCategory) => {
    if (id === 'necessary') return; // Cannot disable necessary
    setCategories(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleSave = useCallback(() => {
    saveConsent(categories);
    onSaved();
  }, [categories, onSaved]);

  const handleAcceptAll = useCallback(() => {
    const all: Record<ConsentCategory, boolean> = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
    saveConsent(all);
    onSaved();
  }, [onSaved]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Cookie-Einstellungen"
    >
      <div className="bg-white rounded-2xl shadow-2xl overflow-y-auto" style={{ width: '100%', maxWidth: 512, maxHeight: '85vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Cookie-Einstellungen</h2>
          <button
            ref={firstFocusRef}
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Schließen"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Description */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-xs text-gray-500 leading-relaxed">
            Hier können Sie festlegen, welche Cookie-Kategorien Sie zulassen möchten.
            Notwendige Cookies sind immer aktiv, da sie für die Grundfunktionen der Website erforderlich sind.
          </p>
        </div>

        {/* Categories */}
        <div className="px-5 py-3 space-y-2">
          {CONSENT_CATEGORIES.map(cat => (
            <div
              key={cat.id}
              className={`rounded-xl border p-4 transition-colors ${
                categories[cat.id]
                  ? 'border-gold/30 bg-gold/5'
                  : 'border-gray-100 bg-gray-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{cat.labelDe}</span>
                    {cat.required && (
                      <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        Immer aktiv
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{cat.descriptionDe}</p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(cat.id)}
                    disabled={cat.required}
                    role="switch"
                    aria-checked={categories[cat.id]}
                    aria-label={`${cat.labelDe} ${categories[cat.id] ? 'deaktivieren' : 'aktivieren'}`}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      cat.required
                        ? 'bg-gold cursor-not-allowed'
                        : categories[cat.id]
                        ? 'bg-gold cursor-pointer'
                        : 'bg-gray-300 cursor-pointer hover:bg-gray-400'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                        categories[cat.id] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-2 p-5 border-t border-gray-100">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 bg-black text-white text-xs font-semibold rounded-xl hover:bg-gray-800 transition-colors"
          >
            Auswahl speichern
          </button>
          <button
            onClick={handleAcceptAll}
            className="flex-1 px-4 py-2.5 bg-gold/10 text-gold-dark text-xs font-semibold rounded-xl hover:bg-gold/20 transition-colors border border-gold/30"
          >
            Alle akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
}
