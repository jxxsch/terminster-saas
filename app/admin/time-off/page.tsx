'use client';

import { useState, useEffect } from 'react';
import {
  getStaffTimeOff,
  createStaffTimeOff,
  deleteStaffTimeOff,
  getAllTeam,
  StaffTimeOff,
  TeamMember,
} from '@/lib/supabase';
import { ConfirmModal } from '@/components/admin/ConfirmModal';

export default function TimeOffPage() {
  const [timeOffs, setTimeOffs] = useState<StaffTimeOff[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffTimeOff | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    staff_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      const [timeOffData, teamData] = await Promise.all([
        getStaffTimeOff(),
        getAllTeam(),
      ]);
      if (mounted) {
        setTimeOffs(timeOffData);
        setTeam(teamData);
        setIsLoading(false);
      }
    }

    loadData();

    return () => { mounted = false; };
  }, []);

  function openCreateForm() {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      staff_id: team[0]?.id || '',
      start_date: today,
      end_date: today,
      reason: '',
    });
    setIsCreating(true);
  }

  function closeForm() {
    setIsCreating(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.staff_id || !formData.start_date || !formData.end_date || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    const newTimeOff = await createStaffTimeOff({
      staff_id: formData.staff_id,
      start_date: formData.start_date,
      end_date: formData.end_date,
      reason: formData.reason || null,
    });

    if (newTimeOff) {
      setTimeOffs([...timeOffs, newTimeOff].sort((a, b) =>
        a.start_date.localeCompare(b.start_date)
      ));
      closeForm();
    }

    setIsSubmitting(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    const success = await deleteStaffTimeOff(deleteTarget.id);
    if (success) {
      setTimeOffs(timeOffs.filter(t => t.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  }

  function getTeamMemberName(staffId: string): string {
    return team.find(m => m.id === staffId)?.name || staffId;
  }

  function formatDateRange(start: string, end: string): string {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    };

    if (start === end) {
      return startDate.toLocaleDateString('de-DE', options);
    }

    return `${startDate.toLocaleDateString('de-DE', options)} - ${endDate.toLocaleDateString('de-DE', options)}`;
  }

  function isUpcoming(endDate: string): boolean {
    return new Date(endDate) >= new Date();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const upcomingTimeOffs = timeOffs.filter(t => isUpcoming(t.end_date));
  const pastTimeOffs = timeOffs.filter(t => !isUpcoming(t.end_date));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-black">Urlaubs-Verwaltung</h1>
          <p className="text-sm text-gray-500 mt-1">
            {upcomingTimeOffs.length} aktive/geplante Abwesenheiten
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="px-4 py-2 bg-gold text-black text-sm font-medium tracking-wider uppercase hover:bg-gold-light transition-colors rounded-lg flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Urlaub eintragen
        </button>
      </div>

      {/* Upcoming Time Off */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h2 className="text-sm font-medium text-gray-700">Aktive & Geplante Abwesenheiten</h2>
        </div>
        {upcomingTimeOffs.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-500 text-sm">
            Keine geplanten Abwesenheiten
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {upcomingTimeOffs.map((timeOff) => (
              <div key={timeOff.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">
                      {getTeamMemberName(timeOff.staff_id)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateRange(timeOff.start_date, timeOff.end_date)}
                      {timeOff.reason && <span className="ml-2">· {timeOff.reason}</span>}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteTarget(timeOff)}
                  className="p-1.5 hover:bg-red-100 rounded text-gray-400 hover:text-red-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Time Off */}
      {pastTimeOffs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-medium text-gray-500">Vergangene Abwesenheiten</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {pastTimeOffs.slice(0, 10).map((timeOff) => (
              <div key={timeOff.id} className="px-4 py-3 flex items-center justify-between opacity-60">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {getTeamMemberName(timeOff.staff_id)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDateRange(timeOff.start_date, timeOff.end_date)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Wichtig</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Eingetragene Abwesenheiten blockieren automatisch alle Buchungen für den entsprechenden Mitarbeiter im angegebenen Zeitraum.
            </p>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeForm} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 p-8 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-black mb-4">
              Urlaub eintragen
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mitarbeiter
                </label>
                <select
                  value={formData.staff_id}
                  onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none"
                  required
                >
                  {team.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Von
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bis
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    min={formData.start_date}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grund (optional)
                </label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none"
                  placeholder="z.B. Urlaub, Krankheit, Fortbildung"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-gold text-black text-sm font-medium rounded-lg hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Wird eingetragen...' : 'Eintragen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Abwesenheit löschen"
        message={`Möchten Sie die Abwesenheit von "${deleteTarget ? getTeamMemberName(deleteTarget.staff_id) : ''}" wirklich löschen?`}
        confirmLabel="Löschen"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
