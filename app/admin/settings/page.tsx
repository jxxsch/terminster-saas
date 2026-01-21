'use client';

import { useState, useEffect } from 'react';
import {
  getAllSettings,
  updateSetting,
  getClosedDates,
  createClosedDate,
  deleteClosedDate,
  ClosedDate,
} from '@/lib/supabase';
import { ConfirmModal } from '@/components/admin/ConfirmModal';

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
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedFields, setSavedFields] = useState<Set<string>>(new Set());

  // Closed date form
  const [newClosedDate, setNewClosedDate] = useState('');
  const [newClosedReason, setNewClosedReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ClosedDate | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      const [settingsData, closedDatesData] = await Promise.all([
        getAllSettings(),
        getClosedDates(),
      ]);

      if (mounted) {
        setSettings({
          booking_advance_days: (settingsData.booking_advance_days as BookingSettings['booking_advance_days']) || defaultSettings.booking_advance_days,
          cancellation_hours: (settingsData.cancellation_hours as BookingSettings['cancellation_hours']) || defaultSettings.cancellation_hours,
          max_bookings_per_day: (settingsData.max_bookings_per_day as BookingSettings['max_bookings_per_day']) || defaultSettings.max_bookings_per_day,
        });
        setClosedDates(closedDatesData);
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

  async function handleAddClosedDate(e: React.FormEvent) {
    e.preventDefault();
    if (!newClosedDate) return;

    const created = await createClosedDate(newClosedDate, newClosedReason || undefined);
    if (created) {
      setClosedDates([...closedDates, created].sort((a, b) => a.date.localeCompare(b.date)));
      setNewClosedDate('');
      setNewClosedReason('');
    }
  }

  async function handleDeleteClosedDate() {
    if (!deleteTarget) return;

    const success = await deleteClosedDate(deleteTarget.id);
    if (success) {
      setClosedDates(closedDates.filter(d => d.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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
          Buchungsregeln und geschlossene Tage verwalten
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

      {/* Closed Dates */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-black mb-4">Geschlossene Tage</h2>
        <p className="text-sm text-gray-500 mb-4">
          Feiertage, Betriebsurlaub oder andere Tage, an denen der Laden geschlossen ist.
        </p>

        {/* Add Closed Date Form */}
        <form onSubmit={handleAddClosedDate} className="flex gap-3 mb-6">
          <input
            type="date"
            value={newClosedDate}
            onChange={(e) => setNewClosedDate(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none"
            required
          />
          <input
            type="text"
            value={newClosedReason}
            onChange={(e) => setNewClosedReason(e.target.value)}
            placeholder="Grund (optional)"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gold text-black text-sm font-medium rounded-lg hover:bg-gold-light transition-colors"
          >
            Hinzufügen
          </button>
        </form>

        {/* Closed Dates List */}
        {closedDates.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            Keine geschlossenen Tage eingetragen
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {closedDates.map((closedDate) => (
              <div
                key={closedDate.id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="text-sm font-medium text-black">
                    {formatDate(closedDate.date)}
                  </p>
                  {closedDate.reason && (
                    <p className="text-xs text-gray-500">{closedDate.reason}</p>
                  )}
                </div>
                <button
                  onClick={() => setDeleteTarget(closedDate)}
                  className="p-1.5 hover:bg-red-100 rounded text-gray-400 hover:text-red-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Geschlossenen Tag löschen"
        message={`Möchten Sie den ${deleteTarget ? formatDate(deleteTarget.date) : ''} wirklich aus der Liste entfernen?`}
        confirmLabel="Löschen"
        variant="danger"
        onConfirm={handleDeleteClosedDate}
        onCancel={() => setDeleteTarget(null)}
      />
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
