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

  function getTeamMemberImage(staffId: string): string | null {
    return team.find(m => m.id === staffId)?.image || null;
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

    return `${startDate.toLocaleDateString('de-DE', options)} – ${endDate.toLocaleDateString('de-DE', options)}`;
  }

  function getDaysCount(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
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
      {/* Active/Upcoming Panel */}
      <div className="bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-200/50 overflow-hidden">
        {/* Header */}
        <div className="px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Abwesenheiten verwalten</h3>
              <p className="text-xs text-slate-400">{upcomingTimeOffs.length} aktive/geplante Einträge</p>
            </div>
          </div>
          <button
            onClick={openCreateForm}
            className="flex items-center gap-2 px-5 py-2.5 bg-gold text-black text-xs font-semibold rounded-xl hover:bg-gold/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Urlaub eintragen
          </button>
        </div>

        {/* Gradient Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        {/* Time Off List */}
        <div className="divide-y divide-slate-100">
          {upcomingTimeOffs.length === 0 ? (
            <div className="px-8 py-16 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">Keine geplanten Abwesenheiten</p>
              <button
                onClick={openCreateForm}
                className="mt-4 text-xs font-medium text-gold hover:text-gold/80 transition-colors"
              >
                Erste Abwesenheit eintragen
              </button>
            </div>
          ) : (
            upcomingTimeOffs.map((timeOff) => {
              const memberImage = getTeamMemberImage(timeOff.staff_id);
              const days = getDaysCount(timeOff.start_date, timeOff.end_date);

              return (
                <div
                  key={timeOff.id}
                  className="group px-8 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-5">
                    {/* Avatar */}
                    {memberImage ? (
                      <div className="w-10 h-10 rounded-xl overflow-hidden">
                        <img
                          src={memberImage}
                          alt={getTeamMemberName(timeOff.staff_id)}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center">
                        <span className="text-sm font-semibold text-gold">
                          {getTeamMemberName(timeOff.staff_id).charAt(0)}
                        </span>
                      </div>
                    )}

                    {/* Info */}
                    <div>
                      <p className="text-sm font-medium text-slate-900">{getTeamMemberName(timeOff.staff_id)}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-500">{formatDateRange(timeOff.start_date, timeOff.end_date)}</span>
                        <span className="text-xs text-slate-300">•</span>
                        <span className="text-xs font-medium text-gold">{days} {days === 1 ? 'Tag' : 'Tage'}</span>
                        {timeOff.reason && (
                          <>
                            <span className="text-xs text-slate-300">•</span>
                            <span className="text-xs text-slate-400">{timeOff.reason}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => setDeleteTarget(timeOff)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Past Time Off Panel */}
      {pastTimeOffs.length > 0 && (
        <div className="bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-200/50 overflow-hidden">
          {/* Header */}
          <div className="px-8 py-4 flex items-center gap-4">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-500">Vergangene Abwesenheiten</h3>
              <p className="text-xs text-slate-400">{pastTimeOffs.length} Einträge</p>
            </div>
          </div>

          {/* Gradient Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          {/* List */}
          <div className="divide-y divide-slate-100">
            {pastTimeOffs.slice(0, 10).map((timeOff) => {
              const memberImage = getTeamMemberImage(timeOff.staff_id);

              return (
                <div
                  key={timeOff.id}
                  className="px-8 py-3 flex items-center gap-5 opacity-50"
                >
                  {/* Avatar */}
                  {memberImage ? (
                    <div className="w-8 h-8 rounded-lg overflow-hidden">
                      <img
                        src={memberImage}
                        alt={getTeamMemberName(timeOff.staff_id)}
                        className="w-full h-full object-cover grayscale"
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-medium text-slate-400">
                        {getTeamMemberName(timeOff.staff_id).charAt(0)}
                      </span>
                    </div>
                  )}

                  {/* Info */}
                  <div>
                    <p className="text-sm font-medium text-slate-600">{getTeamMemberName(timeOff.staff_id)}</p>
                    <p className="text-xs text-slate-400">{formatDateRange(timeOff.start_date, timeOff.end_date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-amber-50/50 rounded-2xl border border-amber-200/50 p-5">
        <div className="flex gap-4">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-amber-800">Hinweis</h3>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              Eingetragene Abwesenheiten blockieren automatisch alle Buchungen für den entsprechenden Mitarbeiter im angegebenen Zeitraum.
            </p>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeForm} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">Urlaub eintragen</h3>
              <p className="text-xs text-slate-400 mt-0.5">Mitarbeiter-Abwesenheit hinzufügen</p>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Mitarbeiter
                  </label>
                  <select
                    value={formData.staff_id}
                    onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-gold focus:bg-white focus:outline-none transition-colors"
                    required
                  >
                    {team.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Von
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-gold focus:bg-white focus:outline-none transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Bis
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      min={formData.start_date}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-gold focus:bg-white focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Grund (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-gold focus:bg-white focus:outline-none transition-colors"
                    placeholder="z.B. Urlaub, Krankheit, Fortbildung"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gold text-black text-sm font-semibold rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Wird eingetragen...' : 'Eintragen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">Abwesenheit löschen</h3>
              <p className="text-sm text-slate-500">
                Möchten Sie die Abwesenheit von <span className="font-medium text-slate-700">&quot;{getTeamMemberName(deleteTarget.staff_id)}&quot;</span> wirklich löschen?
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition-colors"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
