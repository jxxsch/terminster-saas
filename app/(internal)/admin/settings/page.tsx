'use client';

import { useState, useEffect } from 'react';
import { getAllSettings, updateSetting } from '@/lib/supabase';

interface BookingSettings {
  booking_advance_days: { value: number };
  cancellation_hours: { value: number };
  max_bookings_per_day: { value: number };
}

const defaultSettings: BookingSettings = {
  booking_advance_days: { value: 14 },
  cancellation_hours: { value: 24 },
  max_bookings_per_day: { value: 2 },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<BookingSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedFields, setSavedFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      const settingsData = await getAllSettings();

      if (mounted) {
        setSettings({
          booking_advance_days: (settingsData.booking_advance_days as BookingSettings['booking_advance_days']) || defaultSettings.booking_advance_days,
          cancellation_hours: (settingsData.cancellation_hours as BookingSettings['cancellation_hours']) || defaultSettings.cancellation_hours,
          max_bookings_per_day: (settingsData.max_bookings_per_day as BookingSettings['max_bookings_per_day']) || defaultSettings.max_bookings_per_day,
        });
        setIsLoading(false);
      }
    }

    loadData();

    return () => { mounted = false; };
  }, []);

  async function saveField(key: string, value: unknown) {
    setSaving(key);
    const success = await updateSetting(key, value);
    setSaving(null);

    if (success) {
      setSavedFields(prev => new Set(prev).add(key));
      setTimeout(() => {
        setSavedFields(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }, 2000);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Floating Panel */}
      <div className="flex-1 bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-200/50 overflow-hidden flex flex-col min-h-0">
        {/* Header */}
        <div className="px-8 py-5 flex items-center gap-4 flex-shrink-0">
          <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Einstellungen</h3>
            <p className="text-xs text-slate-400">Buchungsregeln und System-Einstellungen</p>
          </div>
        </div>

        {/* Gradient Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent flex-shrink-0" />

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* Header-Zeile */}
          <div className="grid grid-cols-[1fr_70px_70px_80px] gap-4 px-4 py-1.5 text-[11px] font-medium text-slate-400 border-b border-slate-100">
            <div>Einstellung</div>
            <div className="text-center">Wert</div>
            <div>Einheit</div>
            <div></div>
          </div>

          {/* Settings List */}
          <div className="divide-y divide-slate-100">
            {/* Booking Advance Days */}
            <div className="grid grid-cols-[1fr_70px_70px_80px] gap-4 items-center px-4 py-3">
              <div>
                <span className="text-sm font-medium text-slate-900">Buchungszeitraum</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Wie weit im Voraus buchbar</p>
              </div>
              <div>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={settings.booking_advance_days.value}
                  onChange={(e) => setSettings(s => ({
                    ...s,
                    booking_advance_days: { value: parseInt(e.target.value) || 14 }
                  }))}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-right text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                />
              </div>
              <div className="text-xs text-slate-500">Tage</div>
              <div className="flex justify-end">
                <SaveButton
                  onClick={() => saveField('booking_advance_days', settings.booking_advance_days)}
                  saving={saving === 'booking_advance_days'}
                  saved={savedFields.has('booking_advance_days')}
                />
              </div>
            </div>

            {/* Max Bookings per Day */}
            <div className="grid grid-cols-[1fr_70px_70px_80px] gap-4 items-center px-4 py-3">
              <div>
                <span className="text-sm font-medium text-slate-900">Max. Buchungen</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Pro Kunde pro Tag</p>
              </div>
              <div>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.max_bookings_per_day.value}
                  onChange={(e) => setSettings(s => ({
                    ...s,
                    max_bookings_per_day: { value: parseInt(e.target.value) || 2 }
                  }))}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-right text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                />
              </div>
              <div className="text-xs text-slate-500">pro Tag</div>
              <div className="flex justify-end">
                <SaveButton
                  onClick={() => saveField('max_bookings_per_day', settings.max_bookings_per_day)}
                  saving={saving === 'max_bookings_per_day'}
                  saved={savedFields.has('max_bookings_per_day')}
                />
              </div>
            </div>

            {/* Cancellation Hours */}
            <div className="grid grid-cols-[1fr_70px_70px_80px] gap-4 items-center px-4 py-3">
              <div>
                <span className="text-sm font-medium text-slate-900">Stornierungsfrist</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Mindestens vorher absagen</p>
              </div>
              <div>
                <input
                  type="number"
                  min="0"
                  max="72"
                  value={settings.cancellation_hours.value}
                  onChange={(e) => setSettings(s => ({
                    ...s,
                    cancellation_hours: { value: parseInt(e.target.value) || 24 }
                  }))}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-right text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                />
              </div>
              <div className="text-xs text-slate-500">Stunden</div>
              <div className="flex justify-end">
                <SaveButton
                  onClick={() => saveField('cancellation_hours', settings.cancellation_hours)}
                  saving={saving === 'cancellation_hours'}
                  saved={savedFields.has('cancellation_hours')}
                />
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex gap-3">
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-[11px] text-slate-500">
                  Geschlossene Tage und Öffnungszeiten können unter <span className="font-medium">Zeiten</span> → <span className="font-medium">Sondertage</span> verwaltet werden.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SaveButtonProps {
  onClick: () => void;
  saving: boolean;
  saved: boolean;
}

function SaveButton({ onClick, saving, saved }: SaveButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        saved
          ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
          : 'bg-gold/5 border border-gold/30 text-gold hover:bg-gold/15 hover:border-gold/50'
      }`}
    >
      {saving ? (
        <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ) : saved ? (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Gespeichert</span>
        </>
      ) : (
        <span>Speichern</span>
      )}
    </button>
  );
}
