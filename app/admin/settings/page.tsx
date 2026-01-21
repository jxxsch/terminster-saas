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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium text-black">Einstellungen</h1>
        <p className="text-sm text-gray-500 mt-1">
          Buchungsregeln und System-Einstellungen
        </p>
      </div>

      {/* Booking Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-black mb-4">Buchungseinstellungen</h2>
        <div className="space-y-6">
          {/* Booking Advance Days */}
          <div className="flex items-start justify-between gap-8">
            <div>
              <h3 className="text-sm font-medium text-black">Buchungszeitraum</h3>
              <p className="text-xs text-gray-500 mt-1">
                Wie viele Tage im Voraus können Kunden buchen?
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="90"
                value={settings.booking_advance_days.value}
                onChange={(e) => setSettings(s => ({
                  ...s,
                  booking_advance_days: { value: parseInt(e.target.value) || 14 }
                }))}
                className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm text-center focus:border-gold focus:outline-none"
              />
              <span className="text-sm text-gray-500">Tage</span>
              <SaveButton
                onClick={() => saveField('booking_advance_days', settings.booking_advance_days)}
                saving={saving === 'booking_advance_days'}
                saved={savedFields.has('booking_advance_days')}
              />
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Cancellation Hours */}
          <div className="flex items-start justify-between gap-8">
            <div>
              <h3 className="text-sm font-medium text-black">Stornierungsfrist</h3>
              <p className="text-xs text-gray-500 mt-1">
                Bis wie viele Stunden vorher können Termine storniert werden?
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="72"
                value={settings.cancellation_hours.value}
                onChange={(e) => setSettings(s => ({
                  ...s,
                  cancellation_hours: { value: parseInt(e.target.value) || 24 }
                }))}
                className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm text-center focus:border-gold focus:outline-none"
              />
              <span className="text-sm text-gray-500">Stunden</span>
              <SaveButton
                onClick={() => saveField('cancellation_hours', settings.cancellation_hours)}
                saving={saving === 'cancellation_hours'}
                saved={savedFields.has('cancellation_hours')}
              />
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Max Bookings per Day */}
          <div className="flex items-start justify-between gap-8">
            <div>
              <h3 className="text-sm font-medium text-black">Max. Buchungen pro Tag</h3>
              <p className="text-xs text-gray-500 mt-1">
                Wie viele Termine kann ein Kunde pro Tag buchen?
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="10"
                value={settings.max_bookings_per_day.value}
                onChange={(e) => setSettings(s => ({
                  ...s,
                  max_bookings_per_day: { value: parseInt(e.target.value) || 2 }
                }))}
                className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm text-center focus:border-gold focus:outline-none"
              />
              <span className="text-sm text-gray-500">pro Tag</span>
              <SaveButton
                onClick={() => saveField('max_bookings_per_day', settings.max_bookings_per_day)}
                saving={saving === 'max_bookings_per_day'}
                saved={savedFields.has('max_bookings_per_day')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-blue-800">Hinweis</h3>
            <p className="text-sm text-blue-700 mt-1">
              Geschlossene Tage und Öffnungszeiten können jetzt unter <strong>Zeiten</strong> → <strong>Sondertage</strong> verwaltet werden.
            </p>
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
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        saved
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {saving ? (
        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ) : saved ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        'Speichern'
      )}
    </button>
  );
}
