'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  getOpenHolidays,
  createOpenHoliday,
  deleteOpenHoliday,
  OpenHoliday,
  getSetting,
  updateSetting,
  getAllTeam,
  updateTeamMember,
  TeamMember,
  // Arbeitszeiten
  StaffWorkingHours,
  FreeDayException,
  getStaffWorkingHours,
  setStaffWorkingHours as upsertStaffWorkingHours,
  deleteStaffWorkingHours,
  getFreeDayExceptions,
  createFreeDayException,
  deleteFreeDayException,
  // Verkaufsoffene Sonntage - Mitarbeiter
  OpenSundayStaff,
  getOpenSundayStaff,
  createOpenSundayStaff,
  updateOpenSundayStaff,
  deleteOpenSundayStaff,
  deleteOpenSundayStaffByOpenSunday,
} from '@/lib/supabase';
import { ConfirmModal } from '@/components/admin/ConfirmModal';
import { SundayPicker } from '@/components/admin/SundayPicker';
import { DatePicker } from '@/components/admin/DatePicker';
import { BUNDESLAENDER, Bundesland, getHolidaysList } from '@/lib/holidays';

type TabId = 'slots' | 'hours' | 'special' | 'working';

const TABS: { id: TabId; label: string }[] = [
  { id: 'slots', label: 'Zeitslots' },
  { id: 'hours', label: 'Öffnungszeiten' },
  { id: 'special', label: 'Sondertage' },
  { id: 'working', label: 'Arbeitszeiten' },
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
  const [openSundayStaff, setOpenSundayStaff] = useState<OpenSundayStaff[]>([]);
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [newSundayDate, setNewSundayDate] = useState('');
  const [newSundayOpenTime, setNewSundayOpenTime] = useState('10:00');
  const [newSundayCloseTime, setNewSundayCloseTime] = useState('14:00');
  const [newSundayStaff, setNewSundayStaff] = useState<{ staffId: string; startTime: string; endTime: string }[]>([]);
  const [addingSunday, setAddingSunday] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [editingSundayId, setEditingSundayId] = useState<number | null>(null);
  const [editingSundayStaff, setEditingSundayStaff] = useState<{ id: string; staff_id: string; start_time: string; end_time: string }[]>([]);
  const [savingSundayStaff, setSavingSundayStaff] = useState(false);
  const [newClosedDate, setNewClosedDate] = useState('');
  const [newClosedReason, setNewClosedReason] = useState('');
  const [deleteClosedTarget, setDeleteClosedTarget] = useState<ClosedDate | null>(null);

  // Bundesland & Feiertage State
  const [bundesland, setBundesland] = useState<Bundesland>('NW');
  const [openHolidays, setOpenHolidays] = useState<OpenHoliday[]>([]);
  const [savingBundesland, setSavingBundesland] = useState(false);

  // Team & Freie Tage State
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [savingFreeDay, setSavingFreeDay] = useState<string | null>(null);

  // Arbeitszeiten State
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [staffWorkingHours, setStaffWorkingHours] = useState<StaffWorkingHours[]>([]);
  const [freeDayExceptions, setFreeDayExceptions] = useState<FreeDayException[]>([]);
  const [editingWorkDay, setEditingWorkDay] = useState<number | null>(null);
  const [workStartTime, setWorkStartTime] = useState('10:00');
  const [workEndTime, setWorkEndTime] = useState('19:00');
  const [savingWorkHours, setSavingWorkHours] = useState<number | null>(null);
  const [newExceptionDate, setNewExceptionDate] = useState('');
  const [newExceptionStartTime, setNewExceptionStartTime] = useState('10:00');
  const [newExceptionEndTime, setNewExceptionEndTime] = useState('19:00');
  const [newExceptionReplacementDate, setNewExceptionReplacementDate] = useState('');
  const [addingException, setAddingException] = useState(false);
  const [exceptionBarber, setExceptionBarber] = useState<string | null>(null);
  const [showExceptionBarberDropdown, setShowExceptionBarberDropdown] = useState(false);
  const [showExceptionDatePicker, setShowExceptionDatePicker] = useState(false);
  const [showReplacementDatePicker, setShowReplacementDatePicker] = useState(false);

  // Refs für Portal-Positionierung
  const barberDropdownRef = useRef<HTMLButtonElement>(null);
  const datePickerRef = useRef<HTMLButtonElement>(null);
  const replacementDatePickerRef = useRef<HTMLButtonElement>(null);
  const datePickerContainerRef = useRef<HTMLDivElement>(null);
  const replacementDatePickerContainerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-Scroll wenn DatePicker geöffnet wird
  useEffect(() => {
    if (showExceptionDatePicker && datePickerContainerRef.current) {
      setTimeout(() => {
        // Scroll den Kalender-Bereich ins Sichtfeld
        const container = datePickerContainerRef.current?.querySelector('.absolute');
        if (container) {
          container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  }, [showExceptionDatePicker]);

  // Auto-Scroll wenn Ersatztag-DatePicker geöffnet wird
  useEffect(() => {
    if (showReplacementDatePicker && replacementDatePickerContainerRef.current) {
      setTimeout(() => {
        const container = replacementDatePickerContainerRef.current?.querySelector('.absolute');
        if (container) {
          container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  }, [showReplacementDatePicker]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [slotsData, hoursData, sundaysData, closedData, openHolidaysData, bundeslandData, teamData, workHoursData, exceptionsData, sundayStaffData] = await Promise.all([
        getAllTimeSlots(),
        getOpeningHours(),
        getOpenSundays(),
        getClosedDates(),
        getOpenHolidays(),
        getSetting<Bundesland>('bundesland'),
        getAllTeam(),
        getStaffWorkingHours(),
        getFreeDayExceptions(),
        getOpenSundayStaff(),
      ]);
      setTimeSlots(slotsData);
      setHours(hoursData);
      setOpenSundays(sundaysData);
      setOpenSundayStaff(sundayStaffData);
      setClosedDates(closedData);
      setOpenHolidays(openHolidaysData);
      if (bundeslandData) setBundesland(bundeslandData);
      const activeTeam = teamData.filter(m => m.active);
      setTeam(activeTeam);
      setStaffWorkingHours(workHoursData);
      setFreeDayExceptions(exceptionsData);
      // Ersten Mitarbeiter auswählen falls vorhanden
      if (activeTeam.length > 0 && !selectedStaffId) {
        setSelectedStaffId(activeTeam[0].id);
      }
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
    if (newSundayStaff.length === 0) {
      alert('Bitte wählen Sie mindestens einen Mitarbeiter aus.');
      return;
    }
    const date = new Date(newSundayDate);
    if (date.getDay() !== 0) {
      alert('Bitte wählen Sie einen Sonntag aus.');
      return;
    }
    setAddingSunday(true);
    const created = await createOpenSunday(newSundayDate, newSundayOpenTime, newSundayCloseTime);
    if (created) {
      // Mitarbeiter-Zuweisungen speichern
      const staffPromises = newSundayStaff.map(s =>
        createOpenSundayStaff(created.id, s.staffId, s.startTime, s.endTime)
      );
      const createdStaff = await Promise.all(staffPromises);
      const validStaff = createdStaff.filter(s => s !== null) as OpenSundayStaff[];

      setOpenSundays([...openSundays, created].sort((a, b) => a.date.localeCompare(b.date)));
      setOpenSundayStaff([...openSundayStaff, ...validStaff]);
      setNewSundayDate('');
      setNewSundayOpenTime('10:00');
      setNewSundayCloseTime('14:00');
      setNewSundayStaff([]);
    }
    setAddingSunday(false);
  }

  async function handleDeleteOpenSunday(id: number) {
    const success = await deleteOpenSunday(id);
    if (success) {
      setOpenSundays(openSundays.filter(s => s.id !== id));
      // Mitarbeiter-Zuweisungen werden durch CASCADE automatisch gelöscht
      setOpenSundayStaff(openSundayStaff.filter(s => s.open_sunday_id !== id));
    }
  }

  // Mitarbeiter zum Sonntag hinzufügen
  function handleAddSundayStaff() {
    if (team.length === 0) return;
    // Finde ersten Mitarbeiter, der noch nicht hinzugefügt wurde
    const availableStaff = team.filter(m => !newSundayStaff.some(s => s.staffId === m.id));
    if (availableStaff.length === 0) return;

    setNewSundayStaff([
      ...newSundayStaff,
      {
        staffId: availableStaff[0].id,
        startTime: newSundayOpenTime,
        endTime: newSundayCloseTime
      }
    ]);
  }

  // Mitarbeiter aus der Liste entfernen
  function handleRemoveSundayStaff(index: number) {
    setNewSundayStaff(newSundayStaff.filter((_, i) => i !== index));
  }

  // Mitarbeiter-Daten aktualisieren
  function handleUpdateSundayStaff(index: number, field: 'staffId' | 'startTime' | 'endTime', value: string) {
    setNewSundayStaff(newSundayStaff.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    ));
  }

  // === Bearbeiten bestehender Sonntage ===

  // Bearbeitung starten - lokale Kopie der Mitarbeiter erstellen
  function startEditingSunday(sundayId: number) {
    const sundayStaff = openSundayStaff.filter(s => s.open_sunday_id === sundayId);
    setEditingSundayStaff(sundayStaff.map(s => ({
      id: s.id,
      staff_id: s.staff_id,
      start_time: s.start_time,
      end_time: s.end_time,
    })));
    setEditingSundayId(sundayId);
  }

  // Bearbeitung abbrechen
  function cancelEditingSunday() {
    setEditingSundayId(null);
    setEditingSundayStaff([]);
  }

  // Lokale Änderungen an Mitarbeiter-Zeiten
  function updateEditingStaffTime(staffId: string, field: 'start_time' | 'end_time', value: string) {
    setEditingSundayStaff(editingSundayStaff.map(s =>
      s.id === staffId ? { ...s, [field]: value } : s
    ));
  }

  // Mitarbeiter aus lokaler Liste entfernen
  function removeEditingStaff(staffId: string) {
    setEditingSundayStaff(editingSundayStaff.filter(s => s.id !== staffId));
  }

  // Neuen Mitarbeiter zur lokalen Liste hinzufügen
  function addEditingStaff(openTime: string, closeTime: string) {
    const usedStaffIds = editingSundayStaff.map(s => s.staff_id);
    const availableStaff = team.filter(m => !usedStaffIds.includes(m.id));
    if (availableStaff.length === 0) return;

    setEditingSundayStaff([
      ...editingSundayStaff,
      {
        id: `new-${Date.now()}`, // Temporäre ID für neue Einträge
        staff_id: availableStaff[0].id,
        start_time: openTime,
        end_time: closeTime,
      }
    ]);
  }

  // Mitarbeiter in lokaler Liste ändern
  function changeEditingStaffMember(oldStaffId: string, newStaffId: string) {
    setEditingSundayStaff(editingSundayStaff.map(s =>
      s.id === oldStaffId ? { ...s, staff_id: newStaffId } : s
    ));
  }

  // Alle Änderungen speichern
  async function saveEditingSunday() {
    if (!editingSundayId) return;
    setSavingSundayStaff(true);

    const originalStaff = openSundayStaff.filter(s => s.open_sunday_id === editingSundayId);
    const originalIds = originalStaff.map(s => s.id);
    const editingIds = editingSundayStaff.filter(s => !s.id.startsWith('new-')).map(s => s.id);

    // Gelöschte Mitarbeiter entfernen
    const deletedIds = originalIds.filter(id => !editingIds.includes(id));
    for (const id of deletedIds) {
      await deleteOpenSundayStaff(id);
    }

    // Bestehende Mitarbeiter aktualisieren
    for (const staff of editingSundayStaff.filter(s => !s.id.startsWith('new-'))) {
      const original = originalStaff.find(s => s.id === staff.id);
      if (original && (original.start_time !== staff.start_time || original.end_time !== staff.end_time)) {
        await updateOpenSundayStaff(staff.id, {
          start_time: staff.start_time,
          end_time: staff.end_time,
        });
      }
    }

    // Neue Mitarbeiter hinzufügen
    for (const staff of editingSundayStaff.filter(s => s.id.startsWith('new-'))) {
      await createOpenSundayStaff(editingSundayId, staff.staff_id, staff.start_time, staff.end_time);
    }

    // Daten neu laden
    const updatedStaff = await getOpenSundayStaff();
    setOpenSundayStaff(updatedStaff);

    setSavingSundayStaff(false);
    setEditingSundayId(null);
    setEditingSundayStaff([]);
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

  // === Bundesland & Feiertage Handlers ===
  async function handleBundeslandChange(newBundesland: Bundesland) {
    setBundesland(newBundesland);
    setSavingBundesland(true);
    await updateSetting('bundesland', newBundesland);
    setSavingBundesland(false);
  }

  async function handleAddOpenHoliday(date: string, holidayName: string) {
    const created = await createOpenHoliday(date, holidayName);
    if (created) {
      setOpenHolidays([...openHolidays, created].sort((a, b) => a.date.localeCompare(b.date)));
    }
  }

  async function handleDeleteOpenHoliday(id: number) {
    const success = await deleteOpenHoliday(id);
    if (success) {
      setOpenHolidays(openHolidays.filter(h => h.id !== id));
    }
  }

  // === Freie Tage Handlers ===
  async function handleFreeDayChange(memberId: string, freeDay: number | null) {
    setSavingFreeDay(memberId);
    const updated = await updateTeamMember(memberId, { free_day: freeDay });
    if (updated) {
      setTeam(team.map(m => m.id === memberId ? updated : m));
    }
    setSavingFreeDay(null);
  }

  // === Arbeitszeiten Handlers ===
  const selectedStaff = team.find(m => m.id === selectedStaffId);
  const selectedStaffWorkHours = staffWorkingHours.filter(wh => wh.staff_id === selectedStaffId);
  const selectedStaffExceptions = freeDayExceptions.filter(ex => ex.staff_id === selectedStaffId);

  function getWorkHoursForDay(dayOfWeek: number): StaffWorkingHours | undefined {
    return selectedStaffWorkHours.find(wh => wh.day_of_week === dayOfWeek);
  }

  function getGlobalHoursForDay(dayOfWeek: number): OpeningHours | undefined {
    return hours.find(h => h.day_of_week === dayOfWeek);
  }

  async function handleSaveWorkHours(dayOfWeek: number) {
    if (!selectedStaffId) return;
    setSavingWorkHours(dayOfWeek);
    const result = await upsertStaffWorkingHours(selectedStaffId, dayOfWeek, workStartTime, workEndTime);
    if (result) {
      // Update oder hinzufügen
      const exists = staffWorkingHours.find(wh => wh.staff_id === selectedStaffId && wh.day_of_week === dayOfWeek);
      if (exists) {
        setStaffWorkingHours(staffWorkingHours.map(wh =>
          wh.staff_id === selectedStaffId && wh.day_of_week === dayOfWeek ? result : wh
        ));
      } else {
        setStaffWorkingHours([...staffWorkingHours, result]);
      }
    }
    setEditingWorkDay(null);
    setSavingWorkHours(null);
  }

  async function handleResetWorkHours(dayOfWeek: number) {
    if (!selectedStaffId) return;
    setSavingWorkHours(dayOfWeek);
    const success = await deleteStaffWorkingHours(selectedStaffId, dayOfWeek);
    if (success) {
      setStaffWorkingHours(staffWorkingHours.filter(wh =>
        !(wh.staff_id === selectedStaffId && wh.day_of_week === dayOfWeek)
      ));
    }
    setSavingWorkHours(null);
  }

  function handleStartEditWorkHours(dayOfWeek: number) {
    const existing = getWorkHoursForDay(dayOfWeek);
    const global = getGlobalHoursForDay(dayOfWeek);
    if (existing) {
      setWorkStartTime(existing.start_time);
      setWorkEndTime(existing.end_time);
    } else if (global && !global.is_closed) {
      setWorkStartTime(global.open_time || '10:00');
      setWorkEndTime(global.close_time || '19:00');
    } else {
      setWorkStartTime('10:00');
      setWorkEndTime('19:00');
    }
    setEditingWorkDay(dayOfWeek);
  }

  async function handleAddFreeDayException(e: React.FormEvent) {
    e.preventDefault();
    const staffId = exceptionBarber || selectedStaffId;
    if (!staffId || !newExceptionDate) return;
    setAddingException(true);
    const result = await createFreeDayException(
      staffId,
      newExceptionDate,
      newExceptionStartTime,
      newExceptionEndTime,
      newExceptionReplacementDate || undefined
    );
    if (result) {
      setFreeDayExceptions([...freeDayExceptions, result].sort((a, b) => a.date.localeCompare(b.date)));
      setNewExceptionDate('');
      setNewExceptionReplacementDate('');
      setNewExceptionStartTime('10:00');
      setNewExceptionEndTime('19:00');
    }
    setAddingException(false);
  }

  async function handleDeleteFreeDayException(id: string) {
    const success = await deleteFreeDayException(id);
    if (success) {
      setFreeDayExceptions(freeDayExceptions.filter(ex => ex.id !== id));
    }
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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Floating Panel - alles in einem Container */}
      <div className="flex-1 bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-200/50 overflow-hidden flex flex-col min-h-0">
        {/* Header */}
        <div className="px-8 py-5 flex items-center justify-between flex-shrink-0">
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
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent flex-shrink-0" />

        {/* Tabs */}
        <div className="px-8 flex gap-6 border-b border-slate-100 flex-shrink-0">
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
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'slots' && (
            <div className="px-8 py-6">
            <div className="grid grid-cols-8 gap-2">
              {activeSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="group relative flex items-center justify-between px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl"
                >
                  <span className="text-sm font-medium text-emerald-700">{slot.time}</span>
                  <div className="flex items-center gap-0.5 ml-3">
                    <button
                      onClick={() => handleToggleSlotActive(slot)}
                      className="p-[3px] border border-slate-200 rounded text-slate-400 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50 transition-colors"
                      title="Deaktivieren"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteSlotTarget(slot)}
                      className="p-[3px] border border-slate-200 rounded text-slate-400 hover:text-red-500 hover:border-red-300 hover:bg-red-50 transition-colors"
                      title="Löschen"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {activeSlots.length === 0 && (
                <p className="text-sm text-slate-400 col-span-8">Keine aktiven Zeitslots</p>
              )}
            </div>

            {inactiveSlots.length > 0 && (
              <>
                <h2 className="text-xs font-medium text-slate-500 mt-6 mb-4">Inaktive Zeitslots</h2>
                <div className="grid grid-cols-8 gap-2">
                  {inactiveSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="group relative flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <span className="text-sm text-slate-500">{slot.time}</span>
                      <div className="flex items-center gap-0.5 ml-3">
                        <button
                          onClick={() => handleToggleSlotActive(slot)}
                          className="p-[3px] border border-slate-200 rounded text-slate-400 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
                          title="Aktivieren"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteSlotTarget(slot)}
                          className="p-[3px] border border-slate-200 rounded text-slate-400 hover:text-red-500 hover:border-red-300 hover:bg-red-50 transition-colors"
                          title="Löschen"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Info Box */}
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
                <div className="relative bg-white rounded-2xl shadow-xl mx-4 p-5 animate-in zoom-in-95 fade-in duration-200">
                  <form onSubmit={handleCreateSlot}>
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gold/20 text-gold">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-slate-900">Neuer Zeitslot</h3>
                        <p className="text-sm text-slate-500 mt-1">Uhrzeit für den neuen Slot wählen</p>
                      </div>
                      {/* Time Select */}
                      <select
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-9"
                        required
                      >
                        {Array.from({ length: 25 }, (_, i) => {
                          const hour = Math.floor(i / 2) + 8;
                          const minute = i % 2 === 0 ? '00' : '30';
                          const time = `${hour.toString().padStart(2, '0')}:${minute}`;
                          return (
                            <option key={time} value={time}>{time} Uhr</option>
                          );
                        })}
                      </select>
                    </div>
                    {/* Buttons */}
                    <div className="flex justify-end gap-2 mt-5">
                      <button
                        type="button"
                        onClick={() => setIsCreatingSlot(false)}
                        className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Abbrechen
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-gold text-black text-sm font-medium rounded-lg hover:bg-gold/90 transition-colors"
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
            <div className="px-8 py-6">
          {/* Header */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Öffnungszeiten</h3>
            <p className="text-xs text-slate-400 mt-0.5">Reguläre Öffnungszeiten pro Wochentag</p>
          </div>

          {/* Tabelle im grauen Container */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-1">
            {/* Header-Zeile */}
            <div className="grid grid-cols-[1fr_120px_120px_120px] gap-4 px-4 py-3 text-[11px] font-medium text-slate-400 border-b border-slate-200">
              <div>Tag</div>
              <div>Status</div>
              <div>Öffnung</div>
              <div>Schließung</div>
            </div>

            {/* Tage-Liste */}
            <div className="divide-y divide-slate-200">
              {[...hours].sort(sortDays).map((hour) => (
                <div
                  key={hour.day_of_week}
                  className={`grid grid-cols-[1fr_120px_120px_120px] gap-4 items-center px-4 py-3 transition-colors ${hour.is_closed ? 'bg-slate-100/50' : 'bg-white/50 hover:bg-white'} ${savingHour === hour.day_of_week ? 'opacity-50' : ''}`}
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
                    <select
                      value={hour.open_time?.slice(0, 5) || '10:00'}
                      onChange={(e) => handleUpdateHours(hour.day_of_week, { open_time: e.target.value })}
                      disabled={savingHour === hour.day_of_week}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem] bg-[right_0.4rem_center] bg-no-repeat pr-7"
                    >
                      {Array.from({ length: 29 }, (_, i) => {
                        const h = Math.floor(i / 2) + 6;
                        const minute = i % 2 === 0 ? '00' : '30';
                        const time = `${h.toString().padStart(2, '0')}:${minute}`;
                        return <option key={time} value={time}>{time}</option>;
                      })}
                    </select>
                  )}
                </div>
                <div>
                  {!hour.is_closed && (
                    <select
                      value={hour.close_time?.slice(0, 5) || '19:00'}
                      onChange={(e) => handleUpdateHours(hour.day_of_week, { close_time: e.target.value })}
                      disabled={savingHour === hour.day_of_week}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem] bg-[right_0.4rem_center] bg-no-repeat pr-7"
                    >
                      {Array.from({ length: 29 }, (_, i) => {
                        const h = Math.floor(i / 2) + 6;
                        const minute = i % 2 === 0 ? '00' : '30';
                        const time = `${h.toString().padStart(2, '0')}:${minute}`;
                        return <option key={time} value={time}>{time}</option>;
                      })}
                    </select>
                  )}
                </div>
              </div>
              ))}
            </div>
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
            <div className="px-8 py-6 space-y-8">
          {/* Wöchentliche freie Tage */}
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Wöchentliche freie Tage</h3>
              <p className="text-xs text-slate-400 mt-0.5">Fester freier Tag pro Barber (da samstags gearbeitet wird)</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-1">
              {/* Header-Zeile */}
              <div className="grid grid-cols-[1fr_200px] gap-4 px-4 py-2 text-[11px] font-medium text-slate-400 border-b border-slate-200">
                <div>Mitarbeiter</div>
                <div>Freier Tag</div>
              </div>

              {/* Mitarbeiter-Liste */}
              <div className="divide-y divide-slate-200">
                {team.map(member => (
                  <div
                    key={member.id}
                    className={`grid grid-cols-[1fr_200px] gap-4 items-center px-4 py-3 transition-colors ${
                      savingFreeDay === member.id ? 'opacity-50' : 'hover:bg-white/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{member.name}</span>
                    </div>
                    <div>
                      <select
                        value={member.free_day ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          handleFreeDayChange(member.id, value === '' ? null : parseInt(value, 10));
                        }}
                        disabled={savingFreeDay === member.id}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem] bg-[right_0.5rem_center] bg-no-repeat pr-8"
                      >
                        <option value="">Kein freier Tag</option>
                        <option value="1">Montag</option>
                        <option value="2">Dienstag</option>
                        <option value="3">Mittwoch</option>
                        <option value="4">Donnerstag</option>
                        <option value="5">Freitag</option>
                      </select>
                    </div>
                  </div>
                ))}
                {team.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">Keine aktiven Mitarbeiter</p>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-xs font-medium text-slate-700">Hinweis</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    An seinem freien Tag ist der Barber im Buchungssystem und Kalender als nicht verfügbar markiert. Samstag und Sonntag werden nicht angeboten.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Trennlinie */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          {/* Verkaufsoffene Sonntage */}
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Verkaufsoffene Sonntage</h3>
              <p className="text-xs text-slate-400 mt-0.5">Ausnahmen für Sonntage, an denen geöffnet ist</p>
            </div>

            <div>
              {/* Add Form */}
              <form onSubmit={handleAddOpenSunday} className="space-y-4 mb-6">
                {/* Erste Zeile: Datum und Öffnungszeiten */}
                <div className="flex gap-3 items-end">
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
                    <select
                      value={newSundayOpenTime}
                      onChange={(e) => {
                        setNewSundayOpenTime(e.target.value);
                        // Aktualisiere Mitarbeiter-Zeiten, wenn noch nicht angepasst
                        setNewSundayStaff(newSundayStaff.map(s => ({ ...s, startTime: e.target.value })));
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem] bg-[right_0.5rem_center] bg-no-repeat pr-7"
                      required
                    >
                      {Array.from({ length: 29 }, (_, i) => {
                        const hour = Math.floor(i / 2) + 6;
                        const minute = i % 2 === 0 ? '00' : '30';
                        const time = `${hour.toString().padStart(2, '0')}:${minute}`;
                        return <option key={time} value={time}>{time}</option>;
                      })}
                    </select>
                  </div>
                  <div className="w-28">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Schließung</label>
                    <select
                      value={newSundayCloseTime}
                      onChange={(e) => {
                        setNewSundayCloseTime(e.target.value);
                        // Aktualisiere Mitarbeiter-Zeiten
                        setNewSundayStaff(newSundayStaff.map(s => ({ ...s, endTime: e.target.value })));
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem] bg-[right_0.5rem_center] bg-no-repeat pr-7"
                      required
                    >
                      {Array.from({ length: 29 }, (_, i) => {
                        const hour = Math.floor(i / 2) + 6;
                        const minute = i % 2 === 0 ? '00' : '30';
                        const time = `${hour.toString().padStart(2, '0')}:${minute}`;
                        return <option key={time} value={time}>{time}</option>;
                      })}
                    </select>
                  </div>
                </div>

                {/* Mitarbeiter-Auswahl */}
                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-medium text-slate-600">Anwesende Mitarbeiter</label>
                    <button
                      type="button"
                      onClick={handleAddSundayStaff}
                      disabled={newSundayStaff.length >= team.length}
                      className="text-xs text-gold hover:text-gold/80 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Mitarbeiter hinzufügen
                    </button>
                  </div>

                  {newSundayStaff.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-3">
                      Bitte mindestens einen Mitarbeiter hinzufügen
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {newSundayStaff.map((staffEntry, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <select
                            value={staffEntry.staffId}
                            onChange={(e) => handleUpdateSundayStaff(index, 'staffId', e.target.value)}
                            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none cursor-pointer"
                          >
                            {team.map(m => (
                              <option key={m.id} value={m.id} disabled={newSundayStaff.some((s, i) => i !== index && s.staffId === m.id)}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={staffEntry.startTime}
                            onChange={(e) => handleUpdateSundayStaff(index, 'startTime', e.target.value)}
                            className="w-20 px-2 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none cursor-pointer"
                          >
                            {(() => {
                              const options: React.ReactElement[] = [];
                              const [openH, openM] = newSundayOpenTime.split(':').map(Number);
                              const [closeH, closeM] = newSundayCloseTime.split(':').map(Number);
                              const openMins = openH * 60 + openM;
                              const closeMins = closeH * 60 + closeM;
                              for (let mins = openMins; mins <= closeMins; mins += 30) {
                                const h = Math.floor(mins / 60);
                                const m = mins % 60;
                                const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                                options.push(<option key={time} value={time}>{time}</option>);
                              }
                              return options;
                            })()}
                          </select>
                          <span className="text-slate-400 text-xs">bis</span>
                          <select
                            value={staffEntry.endTime}
                            onChange={(e) => handleUpdateSundayStaff(index, 'endTime', e.target.value)}
                            className="w-20 px-2 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none cursor-pointer"
                          >
                            {(() => {
                              const options: React.ReactElement[] = [];
                              const [openH, openM] = newSundayOpenTime.split(':').map(Number);
                              const [closeH, closeM] = newSundayCloseTime.split(':').map(Number);
                              const openMins = openH * 60 + openM;
                              const closeMins = closeH * 60 + closeM;
                              for (let mins = openMins; mins <= closeMins; mins += 30) {
                                const h = Math.floor(mins / 60);
                                const m = mins % 60;
                                const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                                options.push(<option key={time} value={time}>{time}</option>);
                              }
                              return options;
                            })()}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleRemoveSundayStaff(index)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addingSunday || !newSundayDate || newSundayStaff.length === 0}
                    className="px-5 py-2.5 bg-gold text-black text-xs font-semibold rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingSunday ? '...' : 'Hinzufügen'}
                  </button>
                </div>
              </form>

              {futureSundays.length > 0 ? (
                <>
                  {/* Header-Zeile */}
                  <div className="grid grid-cols-[140px_80px_80px_1fr_80px] gap-4 px-4 py-1.5 text-[11px] font-medium text-slate-400 border-b border-slate-100">
                    <div>Datum</div>
                    <div>Öffnung</div>
                    <div>Schließung</div>
                    <div>Mitarbeiter</div>
                    <div></div>
                  </div>

                  {/* Liste */}
                  <div className="divide-y divide-slate-50">
                    {futureSundays.map((sunday) => {
                      const sundayStaff = openSundayStaff.filter(s => s.open_sunday_id === sunday.id);
                      const isEditing = editingSundayId === sunday.id;
                      const openTime = sunday.open_time?.slice(0, 5) || '10:00';
                      const closeTime = sunday.close_time?.slice(0, 5) || '14:00';

                      return (
                        <div key={sunday.id}>
                          {/* Hauptzeile */}
                          <div className="grid grid-cols-[140px_80px_80px_1fr_80px] gap-4 items-center px-4 py-3 hover:bg-slate-50/50 transition-colors">
                            <div className="text-sm font-medium text-slate-900">{formatDate(sunday.date)}</div>
                            <div className="text-sm text-slate-600">{openTime}</div>
                            <div className="text-sm text-slate-600">{closeTime}</div>
                            <div className="flex flex-wrap gap-1.5">
                              {sundayStaff.length > 0 ? (
                                sundayStaff.map(staff => {
                                  const member = team.find(m => m.id === staff.staff_id);
                                  return (
                                    <span
                                      key={staff.id}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-gold/10 text-gold text-xs rounded-full"
                                      title={`${staff.start_time} - ${staff.end_time}`}
                                    >
                                      {member?.name || 'Unbekannt'}
                                      <span className="text-gold/60 text-[10px]">
                                        {staff.start_time}-{staff.end_time}
                                      </span>
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-xs text-slate-400">Keine Mitarbeiter</span>
                              )}
                            </div>
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => isEditing ? cancelEditingSunday() : startEditingSunday(sunday.id)}
                                className={`p-1.5 rounded-lg transition-colors ${isEditing ? 'text-gold bg-gold/10' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                                title="Bearbeiten"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteOpenSunday(sunday.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Löschen"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Bearbeitungs-Bereich */}
                          {isEditing && (
                            <div className="px-4 pb-4 bg-slate-50/50 border-t border-slate-100">
                              <div className="pt-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-slate-600">Mitarbeiter bearbeiten</span>
                                  <button
                                    type="button"
                                    onClick={() => addEditingStaff(openTime, closeTime)}
                                    disabled={editingSundayStaff.length >= team.length}
                                    className="text-xs text-gold hover:text-gold/80 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Hinzufügen
                                  </button>
                                </div>
                                <div className="space-y-2">
                                  {(() => {
                                    // Generiere Zeitoptionen innerhalb der Öffnungszeiten
                                    const timeOptions: string[] = [];
                                    const [openHour, openMin] = openTime.split(':').map(Number);
                                    const [closeHour, closeMin] = closeTime.split(':').map(Number);
                                    const openMinutes = openHour * 60 + openMin;
                                    const closeMinutes = closeHour * 60 + closeMin;

                                    for (let mins = openMinutes; mins <= closeMinutes; mins += 30) {
                                      const h = Math.floor(mins / 60);
                                      const m = mins % 60;
                                      timeOptions.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
                                    }

                                    return editingSundayStaff.map(staff => {
                                      const usedStaffIds = editingSundayStaff.filter(s => s.id !== staff.id).map(s => s.staff_id);
                                      return (
                                        <div key={staff.id} className="flex gap-2 items-center">
                                          <select
                                            value={staff.staff_id}
                                            onChange={(e) => changeEditingStaffMember(staff.id, e.target.value)}
                                            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none cursor-pointer"
                                          >
                                            {team.map(m => (
                                              <option key={m.id} value={m.id} disabled={usedStaffIds.includes(m.id)}>
                                                {m.name}
                                              </option>
                                            ))}
                                          </select>
                                          <select
                                            value={staff.start_time}
                                            onChange={(e) => updateEditingStaffTime(staff.id, 'start_time', e.target.value)}
                                            className="w-20 px-2 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none cursor-pointer"
                                          >
                                            {timeOptions.map(time => (
                                              <option key={time} value={time}>{time}</option>
                                            ))}
                                          </select>
                                          <span className="text-slate-400 text-xs">bis</span>
                                          <select
                                            value={staff.end_time}
                                            onChange={(e) => updateEditingStaffTime(staff.id, 'end_time', e.target.value)}
                                            className="w-20 px-2 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none cursor-pointer"
                                          >
                                            {timeOptions.map(time => (
                                              <option key={time} value={time}>{time}</option>
                                            ))}
                                          </select>
                                          <button
                                            type="button"
                                            onClick={() => removeEditingStaff(staff.id)}
                                            disabled={editingSundayStaff.length <= 1}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                            title={editingSundayStaff.length <= 1 ? 'Mindestens ein Mitarbeiter erforderlich' : 'Entfernen'}
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                          </button>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>

                                {/* Speichern / Abbrechen Buttons */}
                                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-200">
                                  <button
                                    type="button"
                                    onClick={cancelEditingSunday}
                                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                  >
                                    Abbrechen
                                  </button>
                                  <button
                                    type="button"
                                    onClick={saveEditingSunday}
                                    disabled={savingSundayStaff || editingSundayStaff.length === 0}
                                    className="px-4 py-2 text-xs font-semibold text-black bg-gold hover:bg-gold/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {savingSundayStaff ? 'Speichert...' : 'Speichern'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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

          {/* Feiertage */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Feiertage</h3>
                <p className="text-xs text-slate-400 mt-0.5">Automatisch blockiert im Buchungssystem</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={bundesland}
                  onChange={(e) => handleBundeslandChange(e.target.value as Bundesland)}
                  disabled={savingBundesland}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem] bg-[right_0.4rem_center] bg-no-repeat pr-7"
                >
                  {BUNDESLAENDER.map(bl => (
                    <option key={bl.value} value={bl.value}>{bl.label}</option>
                  ))}
                </select>
                {savingBundesland && (
                  <svg className="w-4 h-4 text-gold animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </div>
            </div>

            {/* Feiertage Liste */}
            {(() => {
              const currentYear = new Date().getFullYear();
              const todayStr = new Date().toISOString().split('T')[0];
              const holidays = [
                ...getHolidaysList(currentYear, bundesland),
                ...getHolidaysList(currentYear + 1, bundesland),
              ].filter(h => h.date >= todayStr);
              const openHolidayDates = new Set(openHolidays.map(h => h.date));

              return holidays.length > 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-1">
                  <div className="divide-y divide-slate-200">
                    {holidays.map(holiday => {
                      const isOpen = openHolidayDates.has(holiday.date);
                      return (
                        <div key={holiday.date} className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${isOpen ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-900">{holiday.name}</span>
                            <span className="text-xs text-slate-400">
                              {new Date(holiday.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                            </span>
                          </div>
                          {isOpen ? (
                            <button
                              onClick={() => {
                                const oh = openHolidays.find(h => h.date === holiday.date);
                                if (oh) handleDeleteOpenHoliday(oh.id);
                              }}
                              className="px-2.5 py-1 text-xs font-medium text-emerald-600 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
                            >
                              Geöffnet
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAddOpenHoliday(holiday.date, holiday.name)}
                              className="px-2.5 py-1 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              Geschlossen
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">Keine kommenden Feiertage gefunden.</p>
              );
            })()}
          </div>
            </div>
          )}

          {activeTab === 'working' && (
            <div className="px-8 py-6 space-y-8">
              {/* Mitarbeiter-Auswahl */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Individuelle Arbeitszeiten</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Abweichende Arbeitszeiten pro Mitarbeiter festlegen</p>
                </div>
                <select
                  value={selectedStaffId || ''}
                  onChange={(e) => setSelectedStaffId(e.target.value || null)}
                  className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-9 min-w-[180px]"
                >
                  {team.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>

              {selectedStaff && (
                <>
                  {/* Wochentags-Grid */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-1">
                    {/* Header-Zeile */}
                    <div className="grid grid-cols-[1fr_120px_120px_120px_100px] gap-4 px-4 py-2 text-[11px] font-medium text-slate-400 border-b border-slate-200">
                      <div>Tag</div>
                      <div>Status</div>
                      <div>Von</div>
                      <div>Bis</div>
                      <div></div>
                    </div>

                    {/* Tage-Liste (Mo-Sa) */}
                    <div className="divide-y divide-slate-200">
                      {[1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
                        const workHours = getWorkHoursForDay(dayOfWeek);
                        const globalHours = getGlobalHoursForDay(dayOfWeek);
                        const isFreeDay = selectedStaff.free_day === dayOfWeek;
                        const isEditing = editingWorkDay === dayOfWeek;
                        const isSaving = savingWorkHours === dayOfWeek;

                        // Status bestimmen
                        let status: 'free' | 'individual' | 'global';
                        if (isFreeDay) {
                          status = 'free';
                        } else if (workHours) {
                          status = 'individual';
                        } else {
                          status = 'global';
                        }

                        // Angezeigte Zeiten
                        const displayStart = workHours?.start_time || globalHours?.open_time?.slice(0, 5) || '10:00';
                        const displayEnd = workHours?.end_time || globalHours?.close_time?.slice(0, 5) || '19:00';

                        return (
                          <div
                            key={dayOfWeek}
                            className={`grid grid-cols-[1fr_120px_120px_120px_100px] gap-4 items-center px-4 py-3 transition-colors ${
                              isFreeDay ? 'bg-red-50/50' : status === 'individual' ? 'bg-gold/5' : 'bg-white/50 hover:bg-white'
                            } ${isSaving ? 'opacity-50' : ''}`}
                          >
                            <div>
                              <span className={`text-sm font-medium ${isFreeDay ? 'text-red-400' : 'text-slate-900'}`}>
                                {DAY_NAMES[dayOfWeek]}
                              </span>
                            </div>
                            <div>
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                status === 'free'
                                  ? 'bg-red-100 text-red-600'
                                  : status === 'individual'
                                  ? 'bg-gold/20 text-amber-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}>
                                {status === 'free' ? 'Frei' : status === 'individual' ? 'Individuell' : 'Global'}
                              </span>
                            </div>
                            <div>
                              {!isFreeDay && (
                                isEditing ? (
                                  <select
                                    value={workStartTime}
                                    onChange={(e) => setWorkStartTime(e.target.value)}
                                    className="w-full px-2 py-1.5 bg-white border border-gold rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem] bg-[right_0.4rem_center] bg-no-repeat pr-7"
                                  >
                                    {Array.from({ length: 29 }, (_, i) => {
                                      const h = Math.floor(i / 2) + 6;
                                      const minute = i % 2 === 0 ? '00' : '30';
                                      const time = `${h.toString().padStart(2, '0')}:${minute}`;
                                      return <option key={time} value={time}>{time}</option>;
                                    })}
                                  </select>
                                ) : (
                                  <span className={`text-sm ${status === 'individual' ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                                    {displayStart}
                                  </span>
                                )
                              )}
                            </div>
                            <div>
                              {!isFreeDay && (
                                isEditing ? (
                                  <select
                                    value={workEndTime}
                                    onChange={(e) => setWorkEndTime(e.target.value)}
                                    className="w-full px-2 py-1.5 bg-white border border-gold rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem] bg-[right_0.4rem_center] bg-no-repeat pr-7"
                                  >
                                    {Array.from({ length: 29 }, (_, i) => {
                                      const h = Math.floor(i / 2) + 6;
                                      const minute = i % 2 === 0 ? '00' : '30';
                                      const time = `${h.toString().padStart(2, '0')}:${minute}`;
                                      return <option key={time} value={time}>{time}</option>;
                                    })}
                                  </select>
                                ) : (
                                  <span className={`text-sm ${status === 'individual' ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                                    {displayEnd}
                                  </span>
                                )
                              )}
                            </div>
                            <div className="flex justify-end gap-1">
                              {!isFreeDay && (
                                isEditing ? (
                                  <>
                                    <button
                                      onClick={() => handleSaveWorkHours(dayOfWeek)}
                                      disabled={isSaving}
                                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                      title="Speichern"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => setEditingWorkDay(null)}
                                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                      title="Abbrechen"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleStartEditWorkHours(dayOfWeek)}
                                      className="p-1.5 text-slate-400 hover:text-gold hover:bg-gold/10 rounded-lg transition-colors"
                                      title="Bearbeiten"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                    </button>
                                    {status === 'individual' && (
                                      <button
                                        onClick={() => handleResetWorkHours(dayOfWeek)}
                                        disabled={isSaving}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Auf Global zurücksetzen"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                      </button>
                                    )}
                                  </>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <div className="flex gap-3">
                      <svg className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h3 className="text-xs font-medium text-slate-700">Hinweis</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          <strong>Global:</strong> Nutzt die allgemeinen Öffnungszeiten. <strong>Individuell:</strong> Abweichende Zeiten für diesen Mitarbeiter.
                          <strong> Frei:</strong> Wöchentlicher freier Tag (unter Sondertage einstellbar).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Trennlinie */}
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

                  {/* Freier-Tag-Ausnahmen - unabhängiger Block */}
                  <div>
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-slate-900">Ausnahmen für freie Tage</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Mitarbeiter kann an seinem freien Tag ausnahmsweise arbeiten und optional einen Ersatztag erhalten.
                      </p>
                    </div>

                    {/* Formular für neue Ausnahme */}
                    <form onSubmit={handleAddFreeDayException} className={`grid grid-cols-[180px_1fr_90px_90px_1fr_auto] gap-3 items-end ${(showExceptionDatePicker || showReplacementDatePicker) ? 'mb-[355px]' : 'mb-6'}`}>
                      {/* Barber-Auswahl (Custom Dropdown mit Portal) */}
                      <div className="relative">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Mitarbeiter</label>
                        <button
                          ref={barberDropdownRef}
                          type="button"
                          onClick={() => setShowExceptionBarberDropdown(!showExceptionBarberDropdown)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none hover:border-slate-300 transition-colors flex items-center justify-between"
                        >
                          <span className={exceptionBarber ? 'text-slate-900' : 'text-slate-400'}>
                            {exceptionBarber ? team.find(m => m.id === exceptionBarber)?.name : 'Auswählen...'}
                          </span>
                          <svg className={`w-4 h-4 text-slate-400 transition-transform ${showExceptionBarberDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {showExceptionBarberDropdown && mounted && barberDropdownRef.current && createPortal(
                          <>
                            <div className="fixed inset-0 z-[9998]" onClick={() => setShowExceptionBarberDropdown(false)} />
                            <div
                              className="fixed z-[9999] bg-white rounded-xl shadow-lg border border-slate-200 py-1 max-h-48 overflow-y-auto"
                              style={{
                                top: barberDropdownRef.current.getBoundingClientRect().bottom + 4,
                                left: barberDropdownRef.current.getBoundingClientRect().left,
                                width: barberDropdownRef.current.getBoundingClientRect().width,
                              }}
                            >
                              {team.filter(m => m.free_day !== null).map(member => (
                                <button
                                  key={member.id}
                                  type="button"
                                  onClick={() => {
                                    setExceptionBarber(member.id);
                                    setShowExceptionBarberDropdown(false);
                                  }}
                                  className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors ${exceptionBarber === member.id ? 'bg-gold/10 text-gold' : 'text-slate-700'}`}
                                >
                                  <span className="font-medium">{member.name}</span>
                                  <span className="text-slate-400 ml-1">({DAY_NAMES[member.free_day!]} frei)</span>
                                </button>
                              ))}
                              {team.filter(m => m.free_day !== null).length === 0 && (
                                <div className="px-3 py-2 text-sm text-slate-400">Keine Mitarbeiter mit freiem Tag</div>
                              )}
                            </div>
                          </>,
                          document.body
                        )}
                      </div>

                      {/* Datum - Arbeitet am */}
                      <div ref={datePickerContainerRef} className="relative">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Arbeitet am</label>
                        <button
                          ref={datePickerRef}
                          type="button"
                          onClick={() => setShowExceptionDatePicker(!showExceptionDatePicker)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none hover:border-slate-300 transition-colors flex items-center justify-between"
                        >
                          <span className={newExceptionDate ? 'text-slate-900' : 'text-slate-400'}>
                            {newExceptionDate ? formatDate(newExceptionDate) : 'Datum wählen...'}
                          </span>
                          <svg className={`w-4 h-4 text-slate-400 transition-transform ${showExceptionDatePicker ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {showExceptionDatePicker && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowExceptionDatePicker(false)} />
                            <div className="absolute top-full left-0 mt-1 z-20 shadow-lg">
                              <DatePicker
                                value={newExceptionDate}
                                onChange={(date) => {
                                  setNewExceptionDate(date);
                                  setShowExceptionDatePicker(false);
                                }}
                                inline
                              />
                            </div>
                          </>
                        )}
                      </div>

                      {/* Von */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Von</label>
                        <select
                          id="exception-start-time"
                          value={newExceptionStartTime}
                          onChange={(e) => {
                            setNewExceptionStartTime(e.target.value);
                            // Auto-Jump zu Bis
                            setTimeout(() => {
                              document.getElementById('exception-end-time')?.focus();
                            }, 0);
                          }}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem] bg-[right_0.5rem_center] bg-no-repeat pr-8"
                        >
                          {Array.from({ length: 29 }, (_, i) => {
                            const h = Math.floor(i / 2) + 6;
                            const minute = i % 2 === 0 ? '00' : '30';
                            const time = `${h.toString().padStart(2, '0')}:${minute}`;
                            return <option key={time} value={time}>{time}</option>;
                          })}
                        </select>
                      </div>

                      {/* Bis */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Bis</label>
                        <select
                          id="exception-end-time"
                          value={newExceptionEndTime}
                          onChange={(e) => setNewExceptionEndTime(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem] bg-[right_0.5rem_center] bg-no-repeat pr-8"
                        >
                          {Array.from({ length: 29 }, (_, i) => {
                            const h = Math.floor(i / 2) + 6;
                            const minute = i % 2 === 0 ? '00' : '30';
                            const time = `${h.toString().padStart(2, '0')}:${minute}`;
                            return <option key={time} value={time}>{time}</option>;
                          })}
                        </select>
                      </div>

                      {/* Ersatztag */}
                      <div ref={replacementDatePickerContainerRef} className="relative">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Ersatztag frei (optional)</label>
                        <button
                          ref={replacementDatePickerRef}
                          type="button"
                          onClick={() => setShowReplacementDatePicker(!showReplacementDatePicker)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none hover:border-slate-300 transition-colors flex items-center justify-between"
                        >
                          <span className={newExceptionReplacementDate ? 'text-slate-900' : 'text-slate-400'}>
                            {newExceptionReplacementDate ? formatDate(newExceptionReplacementDate) : 'Optional...'}
                          </span>
                          <svg className={`w-4 h-4 text-slate-400 transition-transform ${showReplacementDatePicker ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {showReplacementDatePicker && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowReplacementDatePicker(false)} />
                            <div className="absolute top-full left-0 mt-1 z-20 shadow-lg">
                              <DatePicker
                                value={newExceptionReplacementDate}
                                onChange={(date) => {
                                  setNewExceptionReplacementDate(date);
                                  setShowReplacementDatePicker(false);
                                }}
                                inline
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={addingException || !newExceptionDate || !exceptionBarber}
                        className="px-5 py-2.5 bg-gold text-black text-xs font-semibold rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addingException ? '...' : 'Hinzufügen'}
                      </button>
                    </form>

                    {/* Liste aller Ausnahmen */}
                    {(() => {
                      const allExceptions = freeDayExceptions
                        .filter(ex => ex.date >= new Date().toISOString().split('T')[0])
                        .sort((a, b) => a.date.localeCompare(b.date));

                      return allExceptions.length > 0 ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-1">
                          <div className="grid grid-cols-[120px_1fr_70px_70px_1fr_60px] gap-4 px-4 py-2 text-[11px] font-medium text-slate-400 border-b border-slate-200">
                            <div>Mitarbeiter</div>
                            <div>Arbeitet am</div>
                            <div>Von</div>
                            <div>Bis</div>
                            <div>Ersatztag frei</div>
                            <div></div>
                          </div>
                          <div className="divide-y divide-slate-200">
                            {allExceptions.map(exception => {
                              const barber = team.find(m => m.id === exception.staff_id);
                              return (
                                <div key={exception.id} className="grid grid-cols-[120px_1fr_70px_70px_1fr_60px] gap-4 items-center px-4 py-3 bg-emerald-50/50 hover:bg-emerald-50 transition-colors">
                                  <div className="text-sm font-medium text-slate-900">{barber?.name || 'Unbekannt'}</div>
                                  <div className="text-sm text-slate-700">{formatDate(exception.date)}</div>
                                  <div className="text-sm text-slate-600">{exception.start_time}</div>
                                  <div className="text-sm text-slate-600">{exception.end_time}</div>
                                  <div className="text-sm text-slate-500">
                                    {exception.replacement_date ? formatDate(exception.replacement_date) : '-'}
                                  </div>
                                  <div className="flex justify-end">
                                    <button
                                      onClick={() => handleDeleteFreeDayException(exception.id)}
                                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="py-8 text-center text-slate-400 bg-slate-50 border border-slate-200 rounded-xl">
                          <svg className="w-10 h-10 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-sm">Keine Ausnahmen eingetragen</p>
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}

              {!selectedStaff && (
                <div className="py-12 text-center text-slate-400">
                  <p>Bitte wählen Sie einen Mitarbeiter aus.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
