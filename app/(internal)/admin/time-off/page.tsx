'use client';

import { useState, useEffect } from 'react';
import {
  getStaffTimeOff,
  createStaffTimeOff,
  updateStaffTimeOff,
  deleteStaffTimeOff,
  getAllTeam,
  getUsedVacationDays,
  StaffTimeOff,
  TeamMember,
} from '@/lib/supabase';
import { ConfirmModal } from '@/components/admin/ConfirmModal';
import { DatePicker, getWorkingDays } from '@/components/admin/DatePicker';

const ABSENCE_TYPES = [
  { value: 'Urlaub', label: 'Urlaub' },
  { value: 'Krankheit', label: 'Krankheit' },
  { value: 'Fortbildung', label: 'Fortbildung' },
  { value: 'Sonstiges', label: 'Sonstiges' },
];

export default function TimeOffPage() {
  const [timeOffs, setTimeOffs] = useState<StaffTimeOff[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [usedVacationDays, setUsedVacationDays] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffTimeOff | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');

  // Form state
  const [formData, setFormData] = useState({
    staff_id: '',
    start_date: '',
    end_date: '',
    reason: 'Urlaub',
  });
  const [autoOpenEndDate, setAutoOpenEndDate] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      const currentYear = new Date().getFullYear();
      const [timeOffData, teamData, vacationData] = await Promise.all([
        getStaffTimeOff(),
        getAllTeam(),
        getUsedVacationDays(currentYear),
      ]);
      if (mounted) {
        // Chronologisch sortieren (nächster zuerst)
        const sorted = timeOffData.sort((a, b) => a.start_date.localeCompare(b.start_date));
        setTimeOffs(sorted);
        setTeam(teamData);
        setUsedVacationDays(vacationData);
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
      reason: 'Urlaub',
    });
    setIsCreating(true);
    setEditingId(null);
  }

  function openEditForm(timeOff: StaffTimeOff) {
    setFormData({
      staff_id: timeOff.staff_id,
      start_date: timeOff.start_date,
      end_date: timeOff.end_date,
      reason: timeOff.reason || 'Urlaub',
    });
    setEditingId(timeOff.id);
    setIsCreating(false);
  }

  function closeForm() {
    setEditingId(null);
    setIsCreating(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.staff_id || !formData.start_date || !formData.end_date) {
      return;
    }

    if (isCreating) {
      const newTimeOff = await createStaffTimeOff({
        staff_id: formData.staff_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason || null,
        start_time: null,
        end_time: null,
      });

      if (newTimeOff) {
        setTimeOffs(
          [...timeOffs, newTimeOff].sort((a, b) => a.start_date.localeCompare(b.start_date))
        );
        closeForm();
      }
    } else if (editingId) {
      const updated = await updateStaffTimeOff(editingId, {
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason || null,
      });

      if (updated) {
        setTimeOffs(
          timeOffs
            .map(t => t.id === updated.id ? updated : t)
            .sort((a, b) => a.start_date.localeCompare(b.start_date))
        );
        closeForm();
      }
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    const success = await deleteStaffTimeOff(deleteTarget.id);
    if (success) {
      setTimeOffs(timeOffs.filter(t => t.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  }

  function getTeamMember(staffId: string): TeamMember | undefined {
    return team.find(m => m.id === staffId);
  }

  function formatDateRange(start: string, end: string): string {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const formatOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };

    if (start === end) {
      return startDate.toLocaleDateString('de-DE', formatOptions);
    }

    return `${startDate.toLocaleDateString('de-DE', formatOptions)} – ${endDate.toLocaleDateString('de-DE', formatOptions)}`;
  }

  // Kalendertage (für Anzeige des Zeitraums)
  function getCalendarDays(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  // Werktage (Mo-Sa ohne Feiertage) - für Urlaubsberechnung
  function getWorkingDaysCount(start: string, end: string): number {
    return getWorkingDays(start, end);
  }

  function getTimeUntilStart(startDate: string, endDate: string): { label: string; status: 'upcoming' | 'active' | 'past' } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    // Check if currently active (today is between start and end)
    if (today >= start && today <= end) {
      return { label: 'läuft', status: 'active' };
    }

    const diffTime = start.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: 'vergangen', status: 'past' };
    } else if (diffDays === 0) {
      return { label: 'heute', status: 'active' };
    } else if (diffDays === 1) {
      return { label: 'morgen', status: 'upcoming' };
    } else if (diffDays <= 7) {
      return { label: `in ${diffDays} Tagen`, status: 'upcoming' };
    } else if (diffDays <= 30) {
      return { label: `in ${diffDays} Tagen`, status: 'upcoming' };
    } else {
      const weeks = Math.floor(diffDays / 7);
      return { label: `in ${weeks} Wochen`, status: 'upcoming' };
    }
  }

  function isUpcoming(endDate: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(endDate) >= today;
  }

  // Inline Edit Form (wie bei Team-Seite)
  const editFormContent = (
    <div className="rounded-xl border border-gold/50 shadow-md animate-slideDown mt-1">
      <div className="bg-white rounded-xl overflow-visible">
        <div className="p-4">
          <form onSubmit={handleSubmit}>
            {/* Zeile 1: Mitarbeiter, Art */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mitarbeiter</label>
                {isCreating ? (
                  <select
                    value={formData.staff_id}
                    onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                    required
                  >
                    {team.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-600">
                    {getTeamMember(formData.staff_id)?.name || formData.staff_id}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Art</label>
                <select
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                >
                  {ABSENCE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Zeile 2: Von/Bis, Werktage, Resturlaub */}
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 mb-3">
              {/* Von & Bis zusammen */}
              <div className="grid grid-cols-2 gap-2">
                <DatePicker
                  label="Von"
                  value={formData.start_date}
                  onChange={(date) => {
                    setFormData({ ...formData, start_date: date, end_date: date });
                    setAutoOpenEndDate(true);
                  }}
                  required
                />
                <DatePicker
                  label="Bis"
                  value={formData.end_date}
                  onChange={(date) => setFormData({ ...formData, end_date: date })}
                  onClose={() => setAutoOpenEndDate(false)}
                  min={formData.start_date}
                  autoOpen={autoOpenEndDate}
                  initialMonth={formData.start_date}
                  required
                />
              </div>
              {/* Werktage */}
              <div className="w-20">
                <label className="block text-xs font-medium text-slate-600 mb-1">Werktage</label>
                <div className="px-3 py-2 bg-gold/10 border border-gold/30 rounded-lg text-sm font-medium text-gold text-center">
                  {formData.start_date && formData.end_date
                    ? getWorkingDaysCount(formData.start_date, formData.end_date)
                    : '–'
                  }
                </div>
              </div>
              {/* Resturlaub */}
              <div className="w-24">
                <label className="block text-xs font-medium text-slate-600 mb-1">Resturlaub</label>
                {(() => {
                  const member = getTeamMember(formData.staff_id);
                  const total = member?.vacation_days || 0;
                  const used = usedVacationDays[formData.staff_id] || 0;
                  const current = formData.start_date && formData.end_date && formData.reason === 'Urlaub'
                    ? getWorkingDaysCount(formData.start_date, formData.end_date)
                    : 0;
                  const remaining = total - used - current;
                  const isNegative = remaining < 0;

                  return (
                    <div className={`px-3 py-2 border rounded-lg text-sm font-medium text-center ${
                      isNegative
                        ? 'bg-red-50 border-red-300 text-red-600'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-600'
                    }`}>
                      {remaining}/{total}
                    </div>
                  );
                })()}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex justify-end gap-2">
          <button type="button" onClick={closeForm} className="px-4 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">
            Abbrechen
          </button>
          <button type="button" onClick={handleSubmit} className="px-4 py-1.5 bg-gold text-black text-xs font-semibold rounded-lg hover:bg-gold/90">
            Speichern
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 400px; }
        }
        .animate-slideDown { animation: slideDown 0.25s ease-out; }
      `}</style>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Sortierte Listen
  const upcomingTimeOffs = timeOffs.filter(t => isUpcoming(t.end_date)).sort((a, b) => {
    if (sortBy === 'name') {
      const nameA = getTeamMember(a.staff_id)?.name || '';
      const nameB = getTeamMember(b.staff_id)?.name || '';
      return nameA.localeCompare(nameB);
    }
    // Default: nach Datum (kommende zuerst)
    return a.start_date.localeCompare(b.start_date);
  });
  const pastTimeOffs = timeOffs.filter(t => !isUpcoming(t.end_date)).sort((a, b) => {
    if (sortBy === 'name') {
      const nameA = getTeamMember(a.staff_id)?.name || '';
      const nameB = getTeamMember(b.staff_id)?.name || '';
      return nameA.localeCompare(nameB);
    }
    // Default: nach Datum (neueste zuerst)
    return b.start_date.localeCompare(a.start_date);
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Floating Panel - alles in einem Container */}
      <div className="flex-1 bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-200/50 overflow-hidden flex flex-col min-h-0">
        {/* Header */}
        <div className="px-4 md:px-8 py-4 md:py-5 flex flex-col md:flex-row md:items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-9 h-9 md:w-10 md:h-10 bg-gold/10 rounded-xl flex items-center justify-center">
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
            className="flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 bg-gold text-black text-xs font-semibold rounded-xl hover:bg-gold/90 transition-colors w-full md:w-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="md:hidden">Neu</span>
            <span className="hidden md:inline">Neue Abwesenheit</span>
          </button>
        </div>

        {/* Gradient Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent flex-shrink-0" />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Create Form - erscheint oben wenn isCreating */}
          {isCreating && <div className="mb-4">{editFormContent}</div>}

          {upcomingTimeOffs.length === 0 && !isCreating ? (
            <div className="py-12 text-center text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">Keine geplanten Abwesenheiten</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {upcomingTimeOffs.map((timeOff) => {
                  const member = getTeamMember(timeOff.staff_id);
                  const days = getWorkingDaysCount(timeOff.start_date, timeOff.end_date);
                  const timeInfo = getTimeUntilStart(timeOff.start_date, timeOff.end_date);

                  return (
                    <div key={timeOff.id}>
                      <div className={`bg-white border rounded-xl p-4 ${editingId === timeOff.id ? 'border-gold/50 bg-gold/5' : 'border-slate-200'}`}>
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0">
                            {member?.image ? (
                              <img
                                src={member.image}
                                alt={member.name}
                                className="w-full h-full object-cover"
                                style={{ objectPosition: member.image_position || 'center' }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white font-bold text-sm">
                                {member?.name?.charAt(0) || '?'}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-slate-900 truncate">{member?.name || timeOff.staff_id}</span>
                              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${
                                timeOff.reason === 'Krankheit'
                                  ? 'bg-red-50 text-red-600'
                                  : timeOff.reason === 'Fortbildung'
                                  ? 'bg-blue-50 text-blue-600'
                                  : timeOff.reason === 'Sonstiges'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-emerald-50 text-emerald-600'
                              }`}>
                                {timeOff.reason || 'Urlaub'}
                              </span>
                            </div>
                            <div className="text-sm text-slate-600 mt-1">
                              {formatDateRange(timeOff.start_date, timeOff.end_date)}
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                              <span>{days} Werktage</span>
                              <span className={timeInfo.status === 'active' ? 'text-emerald-600 font-medium' : ''}>
                                {timeInfo.label}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
                          <button
                            onClick={() => openEditForm(timeOff)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => setDeleteTarget(timeOff)}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            Löschen
                          </button>
                        </div>
                      </div>
                      {editingId === timeOff.id && editFormContent}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block">
                {/* Header-Zeile */}
                <div className="grid grid-cols-[40px_minmax(100px,1fr)_200px_80px_100px_72px] gap-4 px-4 py-1.5 text-[11px] font-medium text-slate-400 border-b border-slate-100">
                  <div></div>
                  <button
                    onClick={() => setSortBy('name')}
                    className={`flex items-center gap-1 hover:text-slate-600 transition-colors text-left ${sortBy === 'name' ? 'text-gold' : ''}`}
                  >
                    Mitarbeiter
                    <svg className={`w-3 h-3 ${sortBy === 'name' ? 'text-gold' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setSortBy('date')}
                    className={`flex items-center gap-1 hover:text-slate-600 transition-colors text-left ${sortBy === 'date' ? 'text-gold' : ''}`}
                  >
                    Zeitraum
                    <svg className={`w-3 h-3 ${sortBy === 'date' ? 'text-gold' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div>Werktage</div>
                  <div>Art</div>
                  <div></div>
                </div>

                {/* Liste */}
                <div className="divide-y divide-slate-50">
                  {upcomingTimeOffs.map((timeOff) => {
                    const member = getTeamMember(timeOff.staff_id);
                    const days = getWorkingDaysCount(timeOff.start_date, timeOff.end_date);
                    const timeInfo = getTimeUntilStart(timeOff.start_date, timeOff.end_date);

                    return (
                      <div key={timeOff.id}>
                        <div className={`grid grid-cols-[40px_minmax(100px,1fr)_200px_80px_100px_72px] gap-4 items-center px-4 py-3 transition-colors ${editingId === timeOff.id ? 'bg-gold/5' : 'hover:bg-slate-50'}`}>
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0">
                            {member?.image ? (
                              <img
                                src={member.image}
                                alt={member.name}
                                className="w-full h-full object-cover"
                                style={{ objectPosition: member.image_position || 'center' }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white font-bold text-sm">
                                {member?.name?.charAt(0) || '?'}
                              </div>
                            )}
                          </div>

                          {/* Name */}
                          <div className="font-medium text-slate-900 truncate">
                            {member?.name || timeOff.staff_id}
                          </div>

                          {/* Zeitraum */}
                          <div>
                            <div className="text-sm text-slate-700">
                              {formatDateRange(timeOff.start_date, timeOff.end_date)}
                            </div>
                            <div className={`text-[10px] ${
                              timeInfo.status === 'active'
                                ? 'text-emerald-600 font-medium'
                                : 'text-slate-400'
                            }`}>
                              {timeInfo.label}
                            </div>
                          </div>

                          {/* Werktage */}
                          <div className="text-sm text-slate-700">
                            {days}
                          </div>

                          {/* Art */}
                          <div>
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                              timeOff.reason === 'Krankheit'
                                ? 'bg-red-50 text-red-600'
                                : timeOff.reason === 'Fortbildung'
                                ? 'bg-blue-50 text-blue-600'
                                : timeOff.reason === 'Sonstiges'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-emerald-50 text-emerald-600'
                            }`}>
                              {timeOff.reason || 'Urlaub'}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => openEditForm(timeOff)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteTarget(timeOff)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        {/* Edit Form - erscheint unter dem bearbeiteten Eintrag */}
                        {editingId === timeOff.id && editFormContent}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Vergangene Abwesenheiten */}
          {pastTimeOffs.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-slate-400">Vergangene Abwesenheiten ({pastTimeOffs.length})</span>
              </div>

              {/* Mobile Cards für vergangene */}
              <div className="md:hidden space-y-2">
                {pastTimeOffs.slice(0, 10).map((timeOff) => {
                  const member = getTeamMember(timeOff.staff_id);
                  const days = getWorkingDaysCount(timeOff.start_date, timeOff.end_date);

                  return (
                    <div key={timeOff.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 opacity-60">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
                          {member?.image ? (
                            <img
                              src={member.image}
                              alt={member.name}
                              className="w-full h-full object-cover grayscale"
                              style={{ objectPosition: member.image_position || 'center' }}
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-300 flex items-center justify-center text-white font-bold text-xs">
                              {member?.name?.charAt(0) || '?'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-slate-600 truncate">{member?.name}</span>
                            <span className="text-xs text-slate-400">{days} Tage</span>
                          </div>
                          <div className="text-xs text-slate-400">{formatDateRange(timeOff.start_date, timeOff.end_date)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table für vergangene */}
              <div className="hidden md:block divide-y divide-slate-50">
                {pastTimeOffs.slice(0, 10).map((timeOff) => {
                  const member = getTeamMember(timeOff.staff_id);
                  const days = getWorkingDaysCount(timeOff.start_date, timeOff.end_date);

                  return (
                    <div
                      key={timeOff.id}
                      className="grid grid-cols-[40px_minmax(100px,1fr)_200px_80px_100px_72px] gap-4 items-center px-4 py-2.5 opacity-50"
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200">
                        {member?.image ? (
                          <img
                            src={member.image}
                            alt={member.name}
                            className="w-full h-full object-cover grayscale"
                            style={{ objectPosition: member.image_position || 'center' }}
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-300 flex items-center justify-center text-white font-bold text-sm">
                            {member?.name?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>

                      {/* Name */}
                      <div className="font-medium text-slate-600 truncate">
                        {member?.name || timeOff.staff_id}
                      </div>

                      {/* Zeitraum */}
                      <div className="text-sm text-slate-500">
                        {formatDateRange(timeOff.start_date, timeOff.end_date)}
                      </div>

                      {/* Werktage */}
                      <div className="text-sm text-slate-500">
                        {days}
                      </div>

                      {/* Art */}
                      <div>
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-500">
                          {timeOff.reason || 'Urlaub'}
                        </span>
                      </div>

                      {/* Leer (Aktionen-Spalte) */}
                      <div></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Abwesenheit löschen"
        message={`Möchten Sie die Abwesenheit von "${getTeamMember(deleteTarget?.staff_id || '')?.name || deleteTarget?.staff_id}" wirklich löschen?`}
        confirmLabel="Löschen"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
