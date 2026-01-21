'use client';

import { useState, useEffect } from 'react';
import {
  getOpeningHours,
  updateOpeningHours,
  getOpenSundays,
  createOpenSunday,
  deleteOpenSunday,
  OpeningHours,
  OpenSunday
} from '@/lib/supabase';
import { SundayPicker } from '@/components/admin/SundayPicker';

const DAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

// Sortierung: Mo-So statt So-Sa (Sonntag ans Ende)
const sortDays = (a: { day_of_week: number }, b: { day_of_week: number }) => {
  const orderA = a.day_of_week === 0 ? 7 : a.day_of_week;
  const orderB = b.day_of_week === 0 ? 7 : b.day_of_week;
  return orderA - orderB;
};

export default function OpeningHoursPage() {
  const [hours, setHours] = useState<OpeningHours[]>([]);
  const [openSundays, setOpenSundays] = useState<OpenSunday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  // Verkaufsoffene Sonntage Form
  const [newSundayDate, setNewSundayDate] = useState('');
  const [newSundayOpenTime, setNewSundayOpenTime] = useState('10:00');
  const [newSundayCloseTime, setNewSundayCloseTime] = useState('14:00');
  const [addingSunday, setAddingSunday] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      const [hoursData, sundaysData] = await Promise.all([
        getOpeningHours(),
        getOpenSundays(),
      ]);
      if (mounted) {
        setHours(hoursData);
        setOpenSundays(sundaysData);
        setIsLoading(false);
      }
    }

    loadData();

    return () => { mounted = false; };
  }, []);

  async function handleUpdate(dayOfWeek: number, updates: Partial<OpeningHours>) {
    setSaving(dayOfWeek);

    const updated = await updateOpeningHours(dayOfWeek, updates);
    if (updated) {
      setHours(hours.map(h => h.day_of_week === dayOfWeek ? updated : h));
    }

    setSaving(null);
  }

  async function handleToggleClosed(dayOfWeek: number, isClosed: boolean) {
    await handleUpdate(dayOfWeek, {
      is_closed: isClosed,
      open_time: isClosed ? null : '10:00',
      close_time: isClosed ? null : '19:00',
    });
  }

  async function handleAddOpenSunday(e: React.FormEvent) {
    e.preventDefault();
    if (!newSundayDate) return;

    // Prüfe ob das Datum ein Sonntag ist
    const date = new Date(newSundayDate);
    if (date.getDay() !== 0) {
      alert('Bitte wählen Sie einen Sonntag aus.');
      return;
    }

    setAddingSunday(true);
    const created = await createOpenSunday(newSundayDate, newSundayOpenTime, newSundayCloseTime);
    if (created) {
      setOpenSundays([...openSundays, created].sort((a, b) => a.date.localeCompare(b.date)));
      setNewSundayDate('');
      setNewSundayOpenTime('10:00');
      setNewSundayCloseTime('14:00');
    }
    setAddingSunday(false);
  }

  async function handleDeleteOpenSunday(id: number) {
    if (!confirm('Verkaufsoffenen Sonntag wirklich löschen?')) return;

    const success = await deleteOpenSunday(id);
    if (success) {
      setOpenSundays(openSundays.filter(s => s.id !== id));
    }
  }

  // Format date for display
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // Filter nur zukünftige Sonntage
  const futureSundays = openSundays.filter(s => s.date >= new Date().toISOString().split('T')[0]);
  const pastSundays = openSundays.filter(s => s.date < new Date().toISOString().split('T')[0]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-medium text-black">Öffnungszeiten</h1>
        <p className="text-sm text-gray-500 mt-1">
          Definieren Sie die Öffnungszeiten für jeden Wochentag
        </p>
      </div>

      {/* Opening Hours Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tag
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Öffnung
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Schließung
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[...hours].sort(sortDays).map((hour) => (
              <tr
                key={hour.day_of_week}
                className={`${hour.is_closed ? 'bg-gray-50' : ''} ${saving === hour.day_of_week ? 'opacity-50' : ''}`}
              >
                <td className="px-4 py-3">
                  <span className={`text-sm font-medium ${hour.is_closed ? 'text-gray-400' : 'text-black'}`}>
                    {DAY_NAMES[hour.day_of_week]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleClosed(hour.day_of_week, !hour.is_closed)}
                    disabled={saving === hour.day_of_week}
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      hour.is_closed
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {hour.is_closed ? 'Geschlossen' : 'Geöffnet'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  {!hour.is_closed && (
                    <input
                      type="time"
                      value={hour.open_time || '10:00'}
                      onChange={(e) => handleUpdate(hour.day_of_week, { open_time: e.target.value })}
                      disabled={saving === hour.day_of_week}
                      className="px-2 py-1 border border-gray-200 rounded text-sm focus:border-gold focus:outline-none"
                    />
                  )}
                </td>
                <td className="px-4 py-3">
                  {!hour.is_closed && (
                    <input
                      type="time"
                      value={hour.close_time || '19:00'}
                      onChange={(e) => handleUpdate(hour.day_of_week, { close_time: e.target.value })}
                      disabled={saving === hour.day_of_week}
                      className="px-2 py-1 border border-gray-200 rounded text-sm focus:border-gold focus:outline-none"
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Verkaufsoffene Sonntage */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-medium text-black">Verkaufsoffene Sonntage</h2>
          <p className="text-sm text-gray-500 mt-1">
            Ausnahmen für Sonntage, an denen geöffnet ist
          </p>
        </div>

        {/* Add Form */}
        <form onSubmit={handleAddOpenSunday} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex gap-4 items-end">
            {/* Date Picker Dropdown */}
            <div className="flex-1 relative">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Sonntag auswählen
              </label>
              <button
                type="button"
                onClick={() => setShowCalendar(!showCalendar)}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-left focus:border-gold focus:outline-none hover:border-gray-300 transition-colors flex items-center justify-between"
              >
                <span className={newSundayDate ? 'text-black' : 'text-gray-400'}>
                  {newSundayDate ? formatDate(newSundayDate) : 'Datum wählen...'}
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${showCalendar ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Calendar Dropdown */}
              {showCalendar && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowCalendar(false)} />
                  <div className="absolute top-full left-0 mt-1 z-20 shadow-lg">
                    <SundayPicker
                      value={newSundayDate}
                      onChange={(date) => {
                        setNewSundayDate(date);
                        setShowCalendar(false);
                      }}
                      existingDates={openSundays.map(s => s.date)}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="w-28">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Öffnung
              </label>
              <input
                type="time"
                value={newSundayOpenTime}
                onChange={(e) => setNewSundayOpenTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-gold focus:outline-none"
                required
              />
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Schließung
              </label>
              <input
                type="time"
                value={newSundayCloseTime}
                onChange={(e) => setNewSundayCloseTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-gold focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={addingSunday || !newSundayDate}
              className="px-4 py-2 bg-gold text-white text-sm font-medium rounded hover:bg-gold-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingSunday ? '...' : 'Hinzufügen'}
            </button>
          </div>
        </form>

        {/* List */}
        {futureSundays.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Datum
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Öffnung
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Schließung
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Aktion
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {futureSundays.map((sunday) => (
                  <tr key={sunday.id}>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-black">
                        {formatDate(sunday.date)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {sunday.open_time?.slice(0, 5) || '10:00'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {sunday.close_time?.slice(0, 5) || '14:00'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteOpenSunday(sunday.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500">Keine verkaufsoffenen Sonntage geplant</p>
          </div>
        )}

        {/* Vergangene Sonntage */}
        {pastSundays.length > 0 && (
          <details className="text-sm">
            <summary className="text-gray-400 cursor-pointer hover:text-gray-600">
              {pastSundays.length} vergangene{pastSundays.length === 1 ? 'r' : ''} Sonntag{pastSundays.length !== 1 ? 'e' : ''} anzeigen
            </summary>
            <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <tbody className="divide-y divide-gray-100">
                  {pastSundays.map((sunday) => (
                    <tr key={sunday.id} className="text-gray-400">
                      <td className="px-4 py-2 text-sm">{formatDate(sunday.date)}</td>
                      <td className="px-4 py-2 text-sm">{sunday.open_time?.slice(0, 5)} - {sunday.close_time?.slice(0, 5)}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => handleDeleteOpenSunday(sunday.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
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
              Die Öffnungszeiten werden im Buchungssystem angezeigt. An geschlossenen Tagen können keine Termine gebucht werden. Bei verkaufsoffenen Sonntagen werden nur Termine innerhalb der angegebenen Öffnungszeiten angeboten.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
