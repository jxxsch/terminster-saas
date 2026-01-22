'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  getAllTimeSlots,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
  TimeSlot,
  getOpeningHours,
  updateOpeningHours,
  getOpenSundays,
  createOpenSunday,
  deleteOpenSunday,
  OpeningHours,
  OpenSunday,
  getClosedDates,
  createClosedDate,
  deleteClosedDate,
  ClosedDate,
} from '@/lib/supabase';
import { ConfirmModal } from '@/components/admin/ConfirmModal';
import { SundayPicker } from '@/components/admin/SundayPicker';

type TabId = 'slots' | 'hours' | 'special';

const TABS: { id: TabId; label: string }[] = [
  { id: 'slots', label: 'Zeitslots' },
  { id: 'hours', label: 'Öffnungszeiten' },
  { id: 'special', label: 'Sondertage' },
];

const DAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

const sortDays = (a: { day_of_week: number }, b: { day_of_week: number }) => {
  const orderA = a.day_of_week === 0 ? 7 : a.day_of_week;
  const orderB = b.day_of_week === 0 ? 7 : b.day_of_week;
  return orderA - orderB;
};

export default function ZeitenPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab') as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(tabParam && TABS.some(t => t.id === tabParam) ? tabParam : 'slots');

  // Zeitslots State
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isCreatingSlot, setIsCreatingSlot] = useState(false);
  const [deleteSlotTarget, setDeleteSlotTarget] = useState<TimeSlot | null>(null);
  const [newTime, setNewTime] = useState('10:00');

  // Öffnungszeiten State
  const [hours, setHours] = useState<OpeningHours[]>([]);
  const [savingHour, setSavingHour] = useState<number | null>(null);

  // Sondertage State
  const [openSundays, setOpenSundays] = useState<OpenSunday[]>([]);
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [newSundayDate, setNewSundayDate] = useState('');
  const [newSundayOpenTime, setNewSundayOpenTime] = useState('10:00');
  const [newSundayCloseTime, setNewSundayCloseTime] = useState('14:00');
  const [addingSunday, setAddingSunday] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [newClosedDate, setNewClosedDate] = useState('');
  const [newClosedReason, setNewClosedReason] = useState('');
  const [deleteClosedTarget, setDeleteClosedTarget] = useState<ClosedDate | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [slotsData, hoursData, sundaysData, closedData] = await Promise.all([
        getAllTimeSlots(),
        getOpeningHours(),
        getOpenSundays(),
        getClosedDates(),
      ]);
      setTimeSlots(slotsData);
      setHours(hoursData);
      setOpenSundays(sundaysData);
      setClosedDates(closedData);
      setIsLoading(false);
    }
    loadData();
  }, []);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    router.replace(`/admin/zeiten?tab=${tab}`, { scroll: false });
  };

  // === Zeitslots Handlers ===
  async function handleCreateSlot(e: React.FormEvent) {
    e.preventDefault();
    if (timeSlots.some(s => s.time === newTime)) {
      alert('Dieser Zeitslot existiert bereits');
      return;
    }
    const newSlot = await createTimeSlot({
      time: newTime,
      sort_order: timeSlots.length,
      active: true,
    });
    if (newSlot) {
      const updated = [...timeSlots, newSlot].sort((a, b) => a.time.localeCompare(b.time));
      setTimeSlots(updated);
      setIsCreatingSlot(false);
      setNewTime('10:00');
    }
  }

  async function handleToggleSlotActive(slot: TimeSlot) {
    const updated = await updateTimeSlot(slot.id, { active: !slot.active });
    if (updated) {
      setTimeSlots(timeSlots.map(s => s.id === updated.id ? updated : s));
    }
  }

  async function handleDeleteSlot() {
    if (!deleteSlotTarget) return;
    const success = await deleteTimeSlot(deleteSlotTarget.id);
    if (success) {
      setTimeSlots(timeSlots.filter(s => s.id !== deleteSlotTarget.id));
    }
    setDeleteSlotTarget(null);
  }

  // === Öffnungszeiten Handlers ===
  async function handleUpdateHours(dayOfWeek: number, updates: Partial<OpeningHours>) {
    setSavingHour(dayOfWeek);
    const updated = await updateOpeningHours(dayOfWeek, updates);
    if (updated) {
      setHours(hours.map(h => h.day_of_week === dayOfWeek ? updated : h));
    }
    setSavingHour(null);
  }

  async function handleToggleClosed(dayOfWeek: number, isClosed: boolean) {
    await handleUpdateHours(dayOfWeek, {
      is_closed: isClosed,
      open_time: isClosed ? null : '10:00',
      close_time: isClosed ? null : '19:00',
    });
  }

  // === Sondertage Handlers ===
  async function handleAddOpenSunday(e: React.FormEvent) {
    e.preventDefault();
    if (!newSundayDate) return;
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
    if (!deleteClosedTarget) return;
    const success = await deleteClosedDate(deleteClosedTarget.id);
    if (success) {
      setClosedDates(closedDates.filter(d => d.id !== deleteClosedTarget.id));
    }
    setDeleteClosedTarget(null);
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeSlots = timeSlots.filter(s => s.active);
  const inactiveSlots = timeSlots.filter(s => !s.active);
  const futureSundays = openSundays.filter(s => s.date >= new Date().toISOString().split('T')[0]);
  const pastSundays = openSundays.filter(s => s.date < new Date().toISOString().split('T')[0]);

  return (
    <div className="h-full">
      {/* Floating Panel - alles in einem Container */}
      <div className="bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-200/50 overflow-hidden">
        {/* Header */}
        <div className="px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Zeiten-Verwaltung</h3>
              <p className="text-xs text-slate-400">Zeitslots, Öffnungszeiten und Sondertage</p>
            </div>
          </div>
          {activeTab === 'slots' && (
            <button
              onClick={() => setIsCreatingSlot(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gold text-black text-xs font-semibold rounded-xl hover:bg-gold/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Hinzufügen
            </button>
          )}
        </div>

        {/* Gradient Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        {/* Tabs */}
        <div className="px-8 flex gap-6 border-b border-slate-100">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-gold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'slots' && (
          <div className="p-6">
            <h2 className="text-xs font-medium text-slate-500 mb-4">Aktive Zeitslots</h2>
            <div className="flex flex-wrap gap-2">
              {activeSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="group relative flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl"
                >
                  <span className="text-sm font-medium text-emerald-700">{slot.time}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleToggleSlotActive(slot)}
                      className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-600"
                      title="Deaktivieren"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteSlotTarget(slot)}
                      className="p-1 hover:bg-red-100 rounded-lg text-red-500"
                      title="Löschen"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {activeSlots.length === 0 && (
                <p className="text-sm text-slate-400">Keine aktiven Zeitslots</p>
              )}
            </div>

            {inactiveSlots.length > 0 && (
              <>
                <h2 className="text-xs font-medium text-slate-500 mt-6 mb-4">Inaktive Zeitslots</h2>
                <div className="flex flex-wrap gap-2">
                  {inactiveSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="group relative flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <span className="text-sm text-slate-500">{slot.time}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleToggleSlotActive(slot)}
                          className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-600"
                          title="Aktivieren"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteSlotTarget(slot)}
                          className="p-1 hover:bg-red-100 rounded-lg text-red-500"
                          title="Löschen"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Info Box - Slate Design */}
            <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-xs font-medium text-slate-700">Hinweis</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Zeitslots definieren die buchbaren Uhrzeiten. Deaktivierte Zeitslots sind für Kunden nicht sichtbar, bleiben aber für bestehende Termine erhalten.
                  </p>
                </div>
              </div>
            </div>
            {/* Create Modal */}
            {isCreatingSlot && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/50" onClick={() => setIsCreatingSlot(false)} />
                <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">Neuer Zeitslot</h3>
                  <form onSubmit={handleCreateSlot} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Uhrzeit</label>
                      <input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsCreatingSlot(false)}
                        className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Abbrechen
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-gold text-black text-xs font-semibold rounded-lg hover:bg-gold/90 transition-colors"
                      >
                        Erstellen
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <ConfirmModal
              isOpen={!!deleteSlotTarget}
              title="Zeitslot löschen"
              message={`Möchten Sie den Zeitslot "${deleteSlotTarget?.time}" wirklich löschen?`}
              confirmLabel="Löschen"
              variant="danger"
              onConfirm={handleDeleteSlot}
              onCancel={() => setDeleteSlotTarget(null)}
            />
          </div>
        )}

      {activeTab === 'hours' && (
        <div className="p-6">
          {/* Header-Zeile */}
          <div className="grid grid-cols-[1fr_120px_120px_120px] gap-4 px-4 py-3 text-[11px] font-medium text-slate-400 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
            <div>Tag</div>
            <div>Status</div>
            <div>Öffnung</div>
            <div>Schließung</div>
          </div>

          {/* Tage-Liste */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-b-xl overflow-hidden">
            {[...hours].sort(sortDays).map((hour) => (
              <div
                key={hour.day_of_week}
                className={`grid grid-cols-[1fr_120px_120px_120px] gap-4 items-center px-4 py-3 transition-colors ${hour.is_closed ? 'bg-slate-50/50' : 'bg-white hover:bg-slate-50/50'} ${savingHour === hour.day_of_week ? 'opacity-50' : ''}`}
              >
                <div>
                  <span className={`text-sm font-medium ${hour.is_closed ? 'text-slate-400' : 'text-slate-900'}`}>
                    {DAY_NAMES[hour.day_of_week]}
                  </span>
                </div>
                <div>
                  <button
                    onClick={() => handleToggleClosed(hour.day_of_week, !hour.is_closed)}
                    disabled={savingHour === hour.day_of_week}
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      hour.is_closed
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    }`}
                  >
                    {hour.is_closed ? 'Geschlossen' : 'Geöffnet'}
                  </button>
                </div>
                <div>
                  {!hour.is_closed && (
                    <input
                      type="time"
                      value={hour.open_time || '10:00'}
                      onChange={(e) => handleUpdateHours(hour.day_of_week, { open_time: e.target.value })}
                      disabled={savingHour === hour.day_of_week}
                      className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                    />
                  )}
                </div>
                <div>
                  {!hour.is_closed && (
                    <input
                      type="time"
                      value={hour.close_time || '19:00'}
                      onChange={(e) => handleUpdateHours(hour.day_of_week, { close_time: e.target.value })}
                      disabled={savingHour === hour.day_of_week}
                      className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-xs font-medium text-slate-700">Hinweis</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Die Öffnungszeiten werden im Buchungssystem angezeigt. An geschlossenen Tagen können keine Termine gebucht werden.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'special' && (
        <div className="p-6 space-y-8">
          {/* Verkaufsoffene Sonntage */}
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Verkaufsoffene Sonntage</h3>
              <p className="text-xs text-slate-400 mt-0.5">Ausnahmen für Sonntage, an denen geöffnet ist</p>
            </div>

            <div>
              {/* Add Form */}
              <form onSubmit={handleAddOpenSunday} className="flex gap-3 items-end mb-6">
                <div className="flex-1 relative">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Sonntag auswählen</label>
                  <button
                    type="button"
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none hover:border-slate-300 transition-colors flex items-center justify-between"
                  >
                    <span className={newSundayDate ? 'text-slate-900' : 'text-slate-400'}>
                      {newSundayDate ? formatDate(newSundayDate) : 'Datum wählen...'}
                    </span>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${showCalendar ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
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
                  <label className="block text-xs font-medium text-slate-600 mb-1">Öffnung</label>
                  <input
                    type="time"
                    value={newSundayOpenTime}
                    onChange={(e) => setNewSundayOpenTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                    required
                  />
                </div>
                <div className="w-28">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Schließung</label>
                  <input
                    type="time"
                    value={newSundayCloseTime}
                    onChange={(e) => setNewSundayCloseTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={addingSunday || !newSundayDate}
                  className="px-5 py-2.5 bg-gold text-black text-xs font-semibold rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingSunday ? '...' : 'Hinzufügen'}
                </button>
              </form>

              {futureSundays.length > 0 ? (
                <>
                  {/* Header-Zeile */}
                  <div className="grid grid-cols-[1fr_100px_100px_60px] gap-4 px-4 py-1.5 text-[11px] font-medium text-slate-400 border-b border-slate-100">
                    <div>Datum</div>
                    <div>Öffnung</div>
                    <div>Schließung</div>
                    <div></div>
                  </div>

                  {/* Liste */}
                  <div className="divide-y divide-slate-50">
                    {futureSundays.map((sunday) => (
                      <div key={sunday.id} className="grid grid-cols-[1fr_100px_100px_60px] gap-4 items-center px-4 py-3 hover:bg-slate-50/50 transition-colors">
                        <div className="text-sm font-medium text-slate-900">{formatDate(sunday.date)}</div>
                        <div className="text-sm text-slate-600">{sunday.open_time?.slice(0, 5) || '10:00'}</div>
                        <div className="text-sm text-slate-600">{sunday.close_time?.slice(0, 5) || '14:00'}</div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleDeleteOpenSunday(sunday.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">Keine verkaufsoffenen Sonntage geplant</p>
                </div>
              )}

              {pastSundays.length > 0 && (
                <details className="mt-4 text-sm">
                  <summary className="text-slate-400 cursor-pointer hover:text-slate-600">
                    {pastSundays.length} vergangene{pastSundays.length === 1 ? 'r' : ''} Sonntag{pastSundays.length !== 1 ? 'e' : ''} anzeigen
                  </summary>
                  <div className="mt-2 divide-y divide-slate-50 opacity-50">
                    {pastSundays.map((sunday) => (
                      <div key={sunday.id} className="grid grid-cols-[1fr_150px_60px] gap-4 items-center px-4 py-2">
                        <div className="text-sm text-slate-500">{formatDate(sunday.date)}</div>
                        <div className="text-sm text-slate-400">{sunday.open_time?.slice(0, 5)} - {sunday.close_time?.slice(0, 5)}</div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleDeleteOpenSunday(sunday.id)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>

          {/* Trennlinie */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          {/* Geschlossene Tage */}
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Geschlossene Tage</h3>
              <p className="text-xs text-slate-400 mt-0.5">Feiertage, Betriebsurlaub oder andere Schließtage</p>
            </div>

            <div>
              {/* Add Form */}
              <form onSubmit={handleAddClosedDate} className="flex gap-3 mb-6">
                <input
                  type="date"
                  value={newClosedDate}
                  onChange={(e) => setNewClosedDate(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                  required
                />
                <input
                  type="text"
                  value={newClosedReason}
                  onChange={(e) => setNewClosedReason(e.target.value)}
                  placeholder="Grund (optional)"
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gold text-black text-xs font-semibold rounded-xl hover:bg-gold/90 transition-colors"
                >
                  Hinzufügen
                </button>
              </form>

              {closedDates.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Keine geschlossenen Tage eingetragen</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {closedDates.map((closedDate) => (
                    <div key={closedDate.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50/50 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{formatDate(closedDate.date)}</p>
                        {closedDate.reason && <p className="text-xs text-slate-500">{closedDate.reason}</p>}
                      </div>
                      <button
                        onClick={() => setDeleteClosedTarget(closedDate)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <ConfirmModal
            isOpen={!!deleteClosedTarget}
            title="Geschlossenen Tag löschen"
            message={`Möchten Sie den ${deleteClosedTarget ? formatDate(deleteClosedTarget.date) : ''} wirklich aus der Liste entfernen?`}
            confirmLabel="Löschen"
            variant="danger"
            onConfirm={handleDeleteClosedDate}
            onCancel={() => setDeleteClosedTarget(null)}
          />
        </div>
        )}
      </div>
    </div>
  );
}
