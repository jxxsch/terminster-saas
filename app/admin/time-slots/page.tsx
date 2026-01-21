'use client';

import { useState, useEffect } from 'react';
import {
  getAllTimeSlots,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
  TimeSlot,
} from '@/lib/supabase';
import { ConfirmModal } from '@/components/admin/ConfirmModal';

export default function TimeSlotsPage() {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TimeSlot | null>(null);
  const [newTime, setNewTime] = useState('10:00');

  useEffect(() => {
    let mounted = true;

    async function loadTimeSlots() {
      const data = await getAllTimeSlots();
      if (mounted) {
        setTimeSlots(data);
        setIsLoading(false);
      }
    }

    loadTimeSlots();

    return () => { mounted = false; };
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();

    // Check if time already exists
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
      // Sort by time
      const updated = [...timeSlots, newSlot].sort((a, b) => a.time.localeCompare(b.time));
      setTimeSlots(updated);
      setIsCreating(false);
      setNewTime('10:00');
    }
  }

  async function handleToggleActive(slot: TimeSlot) {
    const updated = await updateTimeSlot(slot.id, { active: !slot.active });
    if (updated) {
      setTimeSlots(timeSlots.map(s => s.id === updated.id ? updated : s));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    const success = await deleteTimeSlot(deleteTarget.id);
    if (success) {
      setTimeSlots(timeSlots.filter(s => s.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-black">Zeitslots-Verwaltung</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeSlots.length} aktive Zeitslots
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-gold text-black text-sm font-medium tracking-wider uppercase hover:bg-gold-light transition-colors rounded-lg flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Hinzufügen
        </button>
      </div>

      {/* Time Slots Grid */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-medium text-gray-700 mb-4">Aktive Zeitslots</h2>
        <div className="flex flex-wrap gap-2">
          {activeSlots.map((slot) => (
            <div
              key={slot.id}
              className="group relative flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg"
            >
              <span className="text-sm font-medium text-green-700">{slot.time}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleToggleActive(slot)}
                  className="p-1 hover:bg-green-100 rounded text-green-600"
                  title="Deaktivieren"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </button>
                <button
                  onClick={() => setDeleteTarget(slot)}
                  className="p-1 hover:bg-red-100 rounded text-red-600"
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
            <p className="text-sm text-gray-400">Keine aktiven Zeitslots</p>
          )}
        </div>

        {inactiveSlots.length > 0 && (
          <>
            <h2 className="text-sm font-medium text-gray-700 mt-6 mb-4">Inaktive Zeitslots</h2>
            <div className="flex flex-wrap gap-2">
              {inactiveSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="group relative flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                >
                  <span className="text-sm text-gray-500">{slot.time}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleToggleActive(slot)}
                      className="p-1 hover:bg-green-100 rounded text-green-600"
                      title="Aktivieren"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteTarget(slot)}
                      className="p-1 hover:bg-red-100 rounded text-red-600"
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
              Zeitslots definieren die buchbaren Uhrzeiten. Deaktivierte Zeitslots sind für Kunden nicht sichtbar, bleiben aber für bestehende Termine erhalten.
            </p>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsCreating(false)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 p-8 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-black mb-4">
              Neuer Zeitslot
            </h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Uhrzeit
                </label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gold text-black text-sm font-medium rounded-lg hover:bg-gold-light transition-colors"
                >
                  Erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Zeitslot löschen"
        message={`Möchten Sie den Zeitslot "${deleteTarget?.time}" wirklich löschen? Bestehende Termine mit diesem Zeitslot werden davon nicht betroffen.`}
        confirmLabel="Löschen"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
