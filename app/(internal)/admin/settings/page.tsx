'use client';

import { useState, useEffect } from 'react';
import { getAllSettings, updateSetting } from '@/lib/supabase';
import { BUNDESLAENDER, Bundesland } from '@/lib/holidays';

type BookingSystemType = 'standard' | 'custom';

interface BookingSettings {
  booking_advance_weeks: { value: number };
  cancellation_hours: { value: number };
  max_bookings_per_day: { value: number; enabled: boolean };
  bundesland: Bundesland;
  booking_system_type: BookingSystemType;
  allow_edit_customer_in_modal: boolean;
}

const defaultSettings: BookingSettings = {
  booking_advance_weeks: { value: 2 },
  cancellation_hours: { value: 24 },
  max_bookings_per_day: { value: 2, enabled: true },
  bundesland: 'NW',
  booking_system_type: 'standard',
  allow_edit_customer_in_modal: false,
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
        // Migration: Convert old booking_advance_days to weeks if exists
        let advanceWeeks = defaultSettings.booking_advance_weeks;
        if (settingsData.booking_advance_weeks) {
          advanceWeeks = settingsData.booking_advance_weeks as BookingSettings['booking_advance_weeks'];
        } else if (settingsData.booking_advance_days) {
          // Convert days to weeks (old format)
          const oldDays = (settingsData.booking_advance_days as { value: number }).value;
          advanceWeeks = { value: Math.round(oldDays / 7) || 2 };
        }

        // Migration: Add enabled field if missing
        let maxBookings = defaultSettings.max_bookings_per_day;
        if (settingsData.max_bookings_per_day) {
          const oldMax = settingsData.max_bookings_per_day as { value: number; enabled?: boolean };
          maxBookings = {
            value: oldMax.value,
            enabled: oldMax.enabled !== undefined ? oldMax.enabled : true
          };
        }

        setSettings({
          booking_advance_weeks: advanceWeeks,
          cancellation_hours: (settingsData.cancellation_hours as BookingSettings['cancellation_hours']) || defaultSettings.cancellation_hours,
          max_bookings_per_day: maxBookings,
          bundesland: (settingsData.bundesland as Bundesland) || defaultSettings.bundesland,
          booking_system_type: (settingsData.booking_system_type as BookingSystemType) || defaultSettings.booking_system_type,
          allow_edit_customer_in_modal: typeof settingsData.allow_edit_customer_in_modal === 'boolean'
            ? settingsData.allow_edit_customer_in_modal
            : defaultSettings.allow_edit_customer_in_modal,
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
        <div className="px-4 md:px-8 py-4 md:py-5 flex items-center gap-3 md:gap-4 flex-shrink-0">
          <div className="w-9 h-9 md:w-10 md:h-10 bg-gold/10 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Einstellungen</h3>
            <p className="text-xs text-slate-400">Buchungsregeln und Konfiguration</p>
          </div>
        </div>

        {/* Gradient Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent flex-shrink-0" />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Settings List */}
          <div className="space-y-2">
            {/* Buchungssystem-Typ */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 rounded-xl px-4 md:px-5 py-4">
              <div>
                <div className="text-sm font-medium text-slate-900">Buchungssystem</div>
                <div className="text-xs text-slate-400">Standard oder kundenspezifische Variante</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex bg-white border border-slate-200 rounded-lg p-1 flex-1 md:flex-initial">
                  <button
                    onClick={() => setSettings(s => ({ ...s, booking_system_type: 'standard' }))}
                    className={`px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-md transition-all flex-1 md:flex-initial ${
                      settings.booking_system_type === 'standard'
                        ? 'bg-gold text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => setSettings(s => ({ ...s, booking_system_type: 'custom' }))}
                    className={`px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-md transition-all flex-1 md:flex-initial ${
                      settings.booking_system_type === 'custom'
                        ? 'bg-gold text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Kundenspezifisch
                  </button>
                </div>
                <SaveButton
                  onClick={() => saveField('booking_system_type', settings.booking_system_type)}
                  saving={saving === 'booking_system_type'}
                  saved={savedFields.has('booking_system_type')}
                />
              </div>
            </div>

            {/* Buchungszeitraum */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 rounded-xl px-4 md:px-5 py-4">
              <div>
                <div className="text-sm font-medium text-slate-900">Buchungszeitraum</div>
                <div className="text-xs text-slate-400">Wie weit im Voraus buchbar</div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={settings.booking_advance_weeks.value}
                  onChange={(e) => setSettings(s => ({
                    ...s,
                    booking_advance_weeks: { value: parseInt(e.target.value) || 2 }
                  }))}
                  className="w-16 h-10 bg-white border border-slate-200 rounded-lg text-sm text-center text-slate-900 focus:ring-2 focus:ring-gold/20 focus:border-gold focus:outline-none"
                />
                <span className="text-sm text-slate-500 w-16">Wochen</span>
                <SaveButton
                  onClick={() => saveField('booking_advance_weeks', settings.booking_advance_weeks)}
                  saving={saving === 'booking_advance_weeks'}
                  saved={savedFields.has('booking_advance_weeks')}
                />
              </div>
            </div>

            {/* Stornierungsfrist */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 rounded-xl px-4 md:px-5 py-4">
              <div>
                <div className="text-sm font-medium text-slate-900">Stornierungsfrist</div>
                <div className="text-xs text-slate-400">Mindestens vorher absagen</div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="72"
                  value={settings.cancellation_hours.value}
                  onChange={(e) => setSettings(s => ({
                    ...s,
                    cancellation_hours: { value: parseInt(e.target.value) || 24 }
                  }))}
                  className="w-16 h-10 bg-white border border-slate-200 rounded-lg text-sm text-center text-slate-900 focus:ring-2 focus:ring-gold/20 focus:border-gold focus:outline-none"
                />
                <span className="text-sm text-slate-500 w-16">Stunden</span>
                <SaveButton
                  onClick={() => saveField('cancellation_hours', settings.cancellation_hours)}
                  saving={saving === 'cancellation_hours'}
                  saved={savedFields.has('cancellation_hours')}
                />
              </div>
            </div>

            {/* Max. Buchungen */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 rounded-xl px-4 md:px-5 py-4">
              <div>
                <div className="text-sm font-medium text-slate-900">Max. Buchungen pro Tag</div>
                <div className="text-xs text-slate-400">Pro Kunde (deaktivierbar)</div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.max_bookings_per_day.value}
                  onChange={(e) => setSettings(s => ({
                    ...s,
                    max_bookings_per_day: { ...s.max_bookings_per_day, value: parseInt(e.target.value) || 2 }
                  }))}
                  disabled={!settings.max_bookings_per_day.enabled}
                  className="w-16 h-10 bg-white border border-slate-200 rounded-lg text-sm text-center text-slate-900 focus:ring-2 focus:ring-gold/20 focus:border-gold focus:outline-none disabled:opacity-40 disabled:bg-slate-100"
                />
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.max_bookings_per_day.enabled}
                    onChange={(e) => setSettings(s => ({
                      ...s,
                      max_bookings_per_day: { ...s.max_bookings_per_day, enabled: e.target.checked }
                    }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow after:transition-all peer-checked:bg-gold"></div>
                </label>
                <SaveButton
                  onClick={() => saveField('max_bookings_per_day', settings.max_bookings_per_day)}
                  saving={saving === 'max_bookings_per_day'}
                  saved={savedFields.has('max_bookings_per_day')}
                />
              </div>
            </div>

            {/* Bundesland */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 rounded-xl px-4 md:px-5 py-4">
              <div>
                <div className="text-sm font-medium text-slate-900">Bundesland</div>
                <div className="text-xs text-slate-400">Für Feiertagsberechnung</div>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={settings.bundesland}
                  onChange={(e) => setSettings(s => ({ ...s, bundesland: e.target.value as Bundesland }))}
                  className="h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-gold/20 focus:border-gold focus:outline-none cursor-pointer"
                >
                  {BUNDESLAENDER.map(bl => (
                    <option key={bl.value} value={bl.value}>{bl.label}</option>
                  ))}
                </select>
                <SaveButton
                  onClick={() => saveField('bundesland', settings.bundesland)}
                  saving={saving === 'bundesland'}
                  saved={savedFields.has('bundesland')}
                />
              </div>
            </div>

            {/* Kundendaten bearbeitbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 rounded-xl px-4 md:px-5 py-4">
              <div>
                <div className="text-sm font-medium text-slate-900">Kundendaten bearbeitbar</div>
                <div className="text-xs text-slate-400">Name, Telefon & E-Mail im Kalender-Popup änderbar</div>
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allow_edit_customer_in_modal}
                    onChange={(e) => setSettings(s => ({
                      ...s,
                      allow_edit_customer_in_modal: e.target.checked
                    }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow after:transition-all peer-checked:bg-gold"></div>
                </label>
                <SaveButton
                  onClick={() => saveField('allow_edit_customer_in_modal', settings.allow_edit_customer_in_modal)}
                  saving={saving === 'allow_edit_customer_in_modal'}
                  saved={savedFields.has('allow_edit_customer_in_modal')}
                />
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
      className={`h-9 px-4 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 min-w-[90px] ${
        saved
          ? 'bg-emerald-500 text-white'
          : 'bg-gold text-white hover:bg-gold/90'
      }`}
    >
      {saving ? (
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ) : saved ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
