'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useDroppable } from '@dnd-kit/core';
import { AppointmentSlot } from './AppointmentSlot';
import { AddAppointmentModal } from './AddAppointmentModal';
import { DragProvider, useDragContext, BarberHeaderDropInfo } from './DragContext';
import { DraggableSlot } from './DraggableSlot';
import { DroppableCell } from './DroppableCell';
import { MoveToBarberModal } from './MoveToBarberModal';
import {
  getAppointments,
  getSeries,
  getTeam,
  getServices,
  getStaffTimeOffForDateRange,
  getClosedDates,
  getOpenSundays,
  deleteAppointment,
  createAppointment,
  isBarberFreeDay,
  Appointment,
  Series,
  TeamMember,
  Service,
  StaffTimeOff,
  ClosedDate,
  OpenSunday,
} from '@/lib/supabase';
import { useRealtimeAppointments } from '@/hooks/useRealtimeAppointments';
import { SelectionToolbar, SelectionFilter } from './SelectionToolbar';
import { UndoToast } from './UndoToast';

// Generiere Zeitslots nur für reguläre Öffnungszeiten (10:00 bis 18:30)
function generateAllTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 10; hour <= 18; hour++) {
    slots.push(`${String(hour).padStart(2, '0')}:00`);
    slots.push(`${String(hour).padStart(2, '0')}:30`);
  }
  return slots;
}

const DAY_NAMES = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const ALL_TIME_SLOTS = generateAllTimeSlots();

// Berechne den aktuellen Zeitslot (z.B. 16:10 -> "16:00")
function getCurrentTimeSlot(): string | null {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();

  // Öffnungszeiten: 10:00 - 18:30
  if (hours < 10 || hours > 18 || (hours === 18 && minutes > 30)) return null;

  // Runde auf den aktuellen 30-Minuten-Slot ab
  const slotMinutes = minutes < 30 ? '00' : '30';
  return `${String(hours).padStart(2, '0')}:${slotMinutes}`;
}


// Helper: Format date as YYYY-MM-DD in local timezone
function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface BarberWeekViewProps {
  monday: Date;
  initialBarberId?: string;
  formatName?: (name: string) => string;
  selectionMode?: boolean;
  selectedAppointments?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onClearSelection?: () => void;
  onExitSelectionMode?: () => void;
  onSelectedAppointmentsChange?: (ids: Set<string>) => void;
}

interface SlotInfo {
  barberId: string;
  date: string;
  timeSlot: string;
}

export function BarberWeekView({
  monday,
  initialBarberId,
  formatName = (name) => name,
  selectionMode = false,
  selectedAppointments = new Set(),
  onToggleSelect,
  onClearSelection,
  onExitSelectionMode,
  onSelectedAppointmentsChange,
}: BarberWeekViewProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffTimeOff, setStaffTimeOff] = useState<StaffTimeOff[]>([]);
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [openSundays, setOpenSundays] = useState<OpenSunday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(initialBarberId || null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [moveToBarberInfo, setMoveToBarberInfo] = useState<BarberHeaderDropInfo | null>(null);
  const [currentTimeSlot, setCurrentTimeSlot] = useState<string | null>(getCurrentTimeSlot());
  const [selectionFilter, setSelectionFilter] = useState<SelectionFilter>({
    barberId: 'all',
    timeFrom: '',
    timeTo: '',
  });
  const [multiDeleteModal, setMultiDeleteModal] = useState<{ step: 1 | 2 } | null>(null);
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // Undo-Funktionalität
  const [deletedItems, setDeletedItems] = useState<{
    appointments: Appointment[];
    seriesCancellations: string[]; // IDs der erstellten Stornierungen
  } | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);

  // Reset last selected wenn Selection Mode deaktiviert oder Auswahl geleert wird
  useEffect(() => {
    if (!selectionMode || selectedAppointments.size === 0) {
      setLastSelectedId(null);
    }
  }, [selectionMode, selectedAppointments.size]);

  // Barber-Tab wechseln wenn Barber im Filter ausgewählt wird
  useEffect(() => {
    if (selectionMode && selectionFilter.barberId !== 'all' && selectionFilter.barberId !== selectedBarberId) {
      setSelectedBarberId(selectionFilter.barberId);
    }
  }, [selectionMode, selectionFilter.barberId]); // selectedBarberId bewusst ausgelassen um Zyklus zu vermeiden

  // Generate week days (Mo-Sa + verkaufsoffene Sonntage)
  const weekDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: { date: Date; dateStr: string; dayName: string; dayNum: number; isToday: boolean; isSunday: boolean; isOpenSunday: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = formatDateLocal(date);
      const isSunday = date.getDay() === 0;
      const isOpenSunday = isSunday && openSundays.some(os => os.date === dateStr);

      // Sonntag nur einblenden wenn verkaufsoffen
      if (isSunday && !isOpenSunday) continue;

      days.push({
        date,
        dateStr,
        dayName: DAY_NAMES[date.getDay()],
        dayNum: date.getDate(),
        isToday: date.getTime() === today.getTime(),
        isSunday,
        isOpenSunday,
      });
    }
    return days;
  }, [monday, openSundays]);

  // Update current time slot every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimeSlot(getCurrentTimeSlot());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Load all data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const startDate = formatDateLocal(monday);
      const endDate = formatDateLocal(new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000));

      const [appointmentsData, seriesData, teamData, servicesData, staffTimeOffData, closedDatesData, openSundaysData] = await Promise.all([
        getAppointments(startDate, endDate),
        getSeries(),
        getTeam(),
        getServices(),
        getStaffTimeOffForDateRange(startDate, endDate),
        getClosedDates(),
        getOpenSundays(),
      ]);

      setAppointments(appointmentsData);
      setSeries(seriesData);
      setTeam(teamData);
      setServices(servicesData);
      setStaffTimeOff(staffTimeOffData);
      setOpenSundays(openSundaysData);
      setClosedDates(closedDatesData);

      // Auto-select first barber if none selected
      if (!selectedBarberId && teamData.length > 0) {
        setSelectedBarberId(teamData[0].id);
      }

      setIsLoading(false);
    }

    loadData();
  }, [monday, selectedBarberId]);

  // Realtime-Callback: Termine neu laden ohne Loading-State
  const refreshAppointments = useCallback(async () => {
    const startDate = formatDateLocal(monday);
    const endDate = formatDateLocal(new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000));
    try {
      const appointmentsData = await getAppointments(startDate, endDate);
      setAppointments(appointmentsData);
    } catch (error) {
      console.error('Error refreshing appointments:', error);
    }
  }, [monday]);

  // Realtime-Subscription für Termine
  useRealtimeAppointments({
    startDate: formatDateLocal(monday),
    endDate: formatDateLocal(new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000)),
    onUpdate: refreshAppointments,
    enabled: !isLoading,
  });

  // Get currently selected barber
  const selectedBarber = useMemo(() => {
    return team.find(b => b.id === selectedBarberId) || null;
  }, [team, selectedBarberId]);

  // Filter appointments for selected barber
  const barberAppointments = useMemo(() => {
    if (!selectedBarberId) return [];
    return appointments.filter(apt => apt.barber_id === selectedBarberId);
  }, [appointments, selectedBarberId]);

  // Create appointment lookup map for selected barber
  const appointmentMap = useMemo(() => {
    const map = new Map<string, Appointment>();
    barberAppointments.forEach(apt => {
      const key = `${apt.date}-${apt.time_slot}`;
      map.set(key, apt);
    });
    return map;
  }, [barberAppointments]);

  // Generate series appointments for the week (only for selected barber)
  const seriesAppointments = useMemo(() => {
    const map = new Map<string, Series>();
    if (!selectedBarberId) return map;

    series
      .filter(s => s.barber_id === selectedBarberId)
      .forEach(s => {
        weekDays.forEach(day => {
          const dayOfWeek = day.date.getDay() === 0 ? 7 : day.date.getDay();
          if (s.day_of_week === dayOfWeek) {
            if (s.start_date <= day.dateStr && (!s.end_date || s.end_date >= day.dateStr)) {
              const intervalType = s.interval_type || 'weekly';
              let shouldShow = false;

              if (intervalType === 'weekly') {
                shouldShow = true;
              } else if (intervalType === 'biweekly') {
                const startParts = s.start_date.split('-').map(Number);
                const currentParts = day.dateStr.split('-').map(Number);
                const startUtc = Date.UTC(startParts[0], startParts[1] - 1, startParts[2]);
                const currentUtc = Date.UTC(currentParts[0], currentParts[1] - 1, currentParts[2]);
                const diffDays = Math.round((currentUtc - startUtc) / (24 * 60 * 60 * 1000));
                const diffWeeks = Math.floor(diffDays / 7);
                shouldShow = diffWeeks >= 0 && diffWeeks % 2 === 0;
              } else if (intervalType === 'monthly') {
                const startDay = parseInt(s.start_date.split('-')[2], 10);
                shouldShow = day.date.getDate() === startDay;
              }

              if (shouldShow) {
                const key = `${day.dateStr}-${s.time_slot}`;
                map.set(key, s);
              }
            }
          }
        });
      });
    return map;
  }, [series, weekDays, selectedBarberId]);

  // Create services lookup map
  const servicesMap = useMemo(() => {
    const map: Record<string, Service> = {};
    services.forEach(s => {
      map[s.id] = s;
    });
    return map;
  }, [services]);

  // Toolbar-Filter: Direkte Auswahl (ersetzt vorherige Auswahl)
  useEffect(() => {
    if (!selectionMode || !onSelectedAppointmentsChange || !selectedBarberId) {
      return;
    }

    // Nur wenn Von oder Bis eingegeben wurde (Barber und Tag allein reichen nicht)
    if (!selectionFilter.timeFrom && !selectionFilter.timeTo) {
      return;
    }

    // Helper-Funktion für Zeit-Filter
    const matchesTimeFilter = (timeSlot: string): boolean => {
      const hasFrom = !!selectionFilter.timeFrom;
      const hasTo = !!selectionFilter.timeTo;

      if (hasFrom && hasTo) {
        return timeSlot >= selectionFilter.timeFrom && timeSlot <= selectionFilter.timeTo;
      } else if (hasFrom) {
        return timeSlot === selectionFilter.timeFrom;
      } else if (hasTo) {
        return timeSlot === selectionFilter.timeTo;
      }
      return true;
    };

    const newSelection = new Set<string>();

    // Bestimme die zu filternden Tage
    const daysToFilter = selectionFilter.dayIndex !== undefined
      ? [weekDays[selectionFilter.dayIndex]].filter(Boolean)
      : weekDays;

    // Für jeden gefilterten Tag
    daysToFilter.forEach(day => {
      if (!day) return;

      // Normale Termine filtern
      const dayAppointments = barberAppointments.filter(
        apt => apt.date === day.dateStr && apt.status === 'confirmed'
      );

      // Normale Termine
      dayAppointments.forEach(apt => {
        // Zeit-Filter
        if (!matchesTimeFilter(apt.time_slot)) {
          return;
        }
        newSelection.add(apt.id);
      });

      // Serientermine (nur wenn kein normaler Termin an dieser Stelle existiert)
      seriesAppointments.forEach((seriesItem, key) => {
        // Key format: "date-time_slot"
        const timeSlot = seriesItem.time_slot;
        const date = key.slice(0, -(timeSlot.length + 1));

        // Nur für diesen Tag
        if (date !== day.dateStr) return;

        // Prüfe ob bereits ein normaler Termin existiert
        const hasAppointment = dayAppointments.some(
          apt => apt.time_slot === seriesItem.time_slot
        );
        if (hasAppointment) return;

        // Zeit-Filter
        if (!matchesTimeFilter(seriesItem.time_slot)) {
          return;
        }

        // Serie-ID mit Datum kombinieren für eindeutige Identifikation
        const seriesKey = `series_${seriesItem.id}_${date}`;
        newSelection.add(seriesKey);
      });
    });

    // Auswahl direkt setzen (ersetzt vorherige Auswahl)
    onSelectedAppointmentsChange(newSelection);
  }, [selectionMode, selectionFilter, barberAppointments, seriesAppointments, weekDays, selectedBarberId, onSelectedAppointmentsChange]);

  // Helper: Prüfe ob Barber an einem Tag abwesend ist (Urlaub oder freier Tag)
  const isBarberOffOnDate = (dateStr: string): StaffTimeOff | undefined => {
    if (!selectedBarberId) return undefined;

    // Prüfe erst Urlaub
    const timeOff = staffTimeOff.find(
      off => off.staff_id === selectedBarberId &&
             off.start_date <= dateStr &&
             off.end_date >= dateStr
    );
    if (timeOff) return timeOff;

    // Prüfe freien Tag
    const barber = team.find(b => b.id === selectedBarberId);
    if (barber && isBarberFreeDay(barber, dateStr)) {
      return {
        id: 'free-day',
        staff_id: selectedBarberId,
        start_date: dateStr,
        end_date: dateStr,
        reason: 'Frei',
        created_at: '',
      };
    }

    return undefined;
  };

  // Helper: Prüfe ob Tag geschlossen ist
  const isDayClosed = (dateStr: string): boolean => {
    return closedDates.some(cd => cd.date === dateStr);
  };

  const handleSlotClick = (dateStr: string, timeSlot: string) => {
    if (!selectedBarberId) return;
    // Im Selection Mode nicht öffnen
    if (selectionMode) return;
    setSelectedSlot({ barberId: selectedBarberId, date: dateStr, timeSlot });
  };

  // Selection Mode: Termin auswählen/abwählen
  const handleSelectAppointment = useCallback((appointmentId: string, dateStr: string, shiftKey?: boolean) => {
    if (!onToggleSelect || !onSelectedAppointmentsChange || !selectedBarberId) return;

    if (shiftKey && lastSelectedId) {
      // Shift-Klick: Alle Termine zwischen lastSelectedId und appointmentId auswählen
      // Alle Termine des Barbers in der Woche, sortiert nach Datum und Zeit
      const allBarberAppointments = barberAppointments
        .filter(apt => apt.status === 'confirmed')
        .sort((a, b) => {
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
          return a.time_slot.localeCompare(b.time_slot);
        });

      const lastIndex = allBarberAppointments.findIndex(apt => apt.id === lastSelectedId);
      const currentIndex = allBarberAppointments.findIndex(apt => apt.id === appointmentId);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const newSelection = new Set(selectedAppointments);
        for (let i = start; i <= end; i++) {
          newSelection.add(allBarberAppointments[i].id);
        }
        onSelectedAppointmentsChange(newSelection);
        // Anker auf den neuen Termin setzen für weitere Shift-Klicks
        setLastSelectedId(appointmentId);
      }
    } else {
      // Normaler Klick: Einzelauswahl toggle
      onToggleSelect(appointmentId);
      setLastSelectedId(appointmentId);
    }
  }, [barberAppointments, lastSelectedId, onSelectedAppointmentsChange, onToggleSelect, selectedAppointments, selectedBarberId]);

  // Multi-Delete Handler
  const handleMultiDelete = async () => {
    if (selectedAppointments.size === 0) return;
    setIsDeletingMultiple(true);

    const idsToDelete = Array.from(selectedAppointments);
    const deletedAppointments: Appointment[] = [];
    const createdCancellations: string[] = [];

    for (const id of idsToDelete) {
      // Prüfe ob es ein Serientermin ist (Format: series_<seriesId>_<date>)
      if (id.startsWith('series_')) {
        const parts = id.split('_');
        // Format: series_<uuid>_<date> - UUID kann Bindestriche enthalten
        const seriesId = parts.slice(1, -1).join('_'); // Alles zwischen "series_" und letztem "_"
        const date = parts[parts.length - 1]; // Letzter Teil ist das Datum

        // Finde den Serientermin in der Map
        const seriesItem = Array.from(seriesAppointments.values()).find(s => s.id === seriesId);
        if (seriesItem) {
          // Erstelle einen stornierten Termin für dieses spezifische Datum
          const result = await createAppointment({
            barber_id: seriesItem.barber_id,
            date: date,
            time_slot: seriesItem.time_slot,
            service_id: seriesItem.service_id,
            customer_name: seriesItem.customer_name,
            customer_phone: seriesItem.customer_phone || null,
            customer_email: null,
            customer_id: null,
            source: 'manual',
            status: 'cancelled',
            series_id: seriesItem.id,
          });

          if (result.success && result.appointment) {
            handleNewAppointmentFromSeries(result.appointment);
            createdCancellations.push(result.appointment.id);
          }
        }
      } else {
        // Normaler Termin - speichern vor dem Löschen
        const appointmentToDelete = appointments.find(apt => apt.id === id);
        if (appointmentToDelete) {
          deletedAppointments.push(appointmentToDelete);
        }
        const success = await deleteAppointment(id);
        if (success) {
          handleAppointmentDeletedInternal(id);
        }
      }
    }

    // Für Undo speichern
    setDeletedItems({
      appointments: deletedAppointments,
      seriesCancellations: createdCancellations,
    });

    setIsDeletingMultiple(false);
    setMultiDeleteModal(null);
    onClearSelection?.();
    onExitSelectionMode?.();
    setShowUndoToast(true);
  };

  // Undo Handler
  const handleUndo = useCallback(async () => {
    if (!deletedItems) return;

    // Normale Termine wiederherstellen
    for (const apt of deletedItems.appointments) {
      const result = await createAppointment({
        barber_id: apt.barber_id,
        date: apt.date,
        time_slot: apt.time_slot,
        service_id: apt.service_id,
        customer_name: apt.customer_name,
        customer_phone: apt.customer_phone || null,
        customer_email: apt.customer_email || null,
        customer_id: apt.customer_id || null,
        source: apt.source,
        status: apt.status,
        series_id: apt.series_id || null,
      });
      if (result.success && result.appointment) {
        setAppointments(prev => [...prev, result.appointment!]);
      }
    }

    // Serien-Stornierungen löschen (macht Serie wieder sichtbar)
    for (const cancellationId of deletedItems.seriesCancellations) {
      const success = await deleteAppointment(cancellationId);
      if (success) {
        setAppointments(prev => prev.filter(apt => apt.id !== cancellationId));
      }
    }

    setDeletedItems(null);
    setShowUndoToast(false);
    setToast({ message: 'Wiederhergestellt', type: 'success' });
    setTimeout(() => setToast(null), 2000);
  }, [deletedItems]);

  // Undo abgelaufen
  const handleUndoExpire = useCallback(() => {
    setDeletedItems(null);
    setShowUndoToast(false);
  }, []);

  // Auswahl aufheben und Filter zurücksetzen
  const handleClearSelectionAndFilter = useCallback(() => {
    onClearSelection?.();
    setSelectionFilter({ barberId: 'all', timeFrom: '', timeTo: '', dayIndex: undefined });
  }, [onClearSelection]);

  const handleCloseModal = () => {
    setSelectedSlot(null);
  };

  const handleAppointmentCreated = (newAppointment: Appointment) => {
    setAppointments(prev => [...prev, newAppointment]);
    setSelectedSlot(null);
  };

  const handleSeriesCreated = (newSeries: Series) => {
    setSeries(prev => [...prev, newSeries]);
    setSelectedSlot(null);
  };

  // Handler für AppointmentSlot Callbacks
  // Interner Handler ohne Undo (für Multi-Delete)
  const handleAppointmentDeletedInternal = (id: string) => {
    setAppointments(prev => prev.filter(apt => apt.id !== id));
  };

  // Handler für Einzellöschung mit Undo
  const handleAppointmentDeleted = (id: string, deletedAppointment?: Appointment) => {
    setAppointments(prev => prev.filter(apt => apt.id !== id));

    // Undo-Toast nur bei Einzellöschung (nicht bei Multi-Delete)
    if (deletedAppointment && !isDeletingMultiple) {
      setDeletedItems({
        appointments: [deletedAppointment],
        seriesCancellations: [],
      });
      setShowUndoToast(true);
    }
  };

  const handleAppointmentUpdated = (updated: Appointment) => {
    setAppointments(prev => prev.map(apt => apt.id === updated.id ? updated : apt));
  };

  const handleSeriesDeleted = (id: string) => {
    setSeries(prev => prev.filter(s => s.id !== id));
  };

  const handleSeriesUpdated = (updated: Series) => {
    setSeries(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  // Handler für Serien-Einzelstornierung (für Undo)
  const handleSeriesSingleCancelled = (cancellationId: string) => {
    setDeletedItems({
      appointments: [],
      seriesCancellations: [cancellationId],
    });
    setShowUndoToast(true);
  };

  const handleNewAppointmentFromSeries = (newAppointment: Appointment) => {
    setAppointments(prev => [...prev, newAppointment]);
  };

  // Drag & Drop Handler
  const handleAppointmentMoved = useCallback((oldAppointment: Appointment, newAppointment: Appointment) => {
    setAppointments(prev => prev.map(apt => apt.id === oldAppointment.id ? newAppointment : apt));
    setMoveToBarberInfo(null); // Modal schließen
    setToast({ message: 'Termin verschoben', type: 'success' });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleMoveError = useCallback((error: string) => {
    setToast({ message: error, type: 'error' });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Handler für Barber-Wechsel (öffnet Modal mit Kalender des anderen Barbers)
  const handleBarberHeaderDrop = useCallback((info: BarberHeaderDropInfo) => {
    setMoveToBarberInfo(info);
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400">
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm">Laden...</span>
        </div>
      </div>
    );
  }

  return (
    <DragProvider
      appointments={appointments}
      onAppointmentMoved={handleAppointmentMoved}
      onMoveError={handleMoveError}
      onBarberHeaderDrop={handleBarberHeaderDrop}
      disabled={selectionMode}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }`}>
            {toast.message}
          </div>
        )}

        {/* Barber Tabs - Full Width */}
        <BarberTabs
          team={team}
          selectedBarberId={selectedBarberId}
          onSelectBarber={setSelectedBarberId}
        />

        {/* Selection Toolbar */}
        {selectionMode && (
          <SelectionToolbar
            team={team}
            timeSlots={ALL_TIME_SLOTS}
            selectedCount={selectedAppointments.size}
            filter={selectionFilter}
            onFilterChange={setSelectionFilter}
            onClearSelection={handleClearSelectionAndFilter}
            onDelete={() => setMultiDeleteModal({ step: 1 })}
            onCancel={onExitSelectionMode || (() => {})}
            weekDays={weekDays.map(d => ({ dateStr: d.dateStr, dayName: d.dayName, dayNum: d.dayNum }))}
          />
        )}

        {/* Week Grid */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 min-h-0 overflow-hidden relative">
          <div className="absolute inset-0 overflow-auto">
            <table className="w-full h-full border-collapse" style={{ tableLayout: 'fixed' }}>
            {/* Day Headers - kompakt */}
            <thead className="bg-gray-50">
              <tr className="h-[28px]">
                <th className="w-[45px] px-1 text-[9px] text-gray-400 text-center font-medium border-b border-r border-gray-200">
                  Zeit
                </th>
                {weekDays.map(day => {
                  const isClosed = isDayClosed(day.dateStr);
                  const isOff = !!isBarberOffOnDate(day.dateStr);
                  const isDisabled = day.isSunday || isClosed || isOff;
                  return (
                    <th
                      key={day.dateStr}
                      className={`px-1 text-center border-b border-r border-gray-200 font-normal ${
                        isDisabled ? 'bg-gray-100' : ''
                      } ${day.isToday && !day.isSunday ? 'bg-gold/10' : ''}`}
                    >
                      <span className={`text-[11px] font-medium ${isDisabled ? 'text-gray-400' : 'text-black'}`}>
                        {day.dayName} {day.dayNum}
                      </span>
                      {(isClosed || isOff) && !day.isSunday && (
                        <span className="ml-1 text-[8px] text-red-500">{isClosed ? '✕' : '⌀'}</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Time Slots */}
            <tbody>
              {ALL_TIME_SLOTS.map((slot, slotIndex) => {
                const isCurrentSlot = slot === currentTimeSlot;
                const todayInWeek = weekDays.find(d => d.isToday);
                const showCurrentMarker = isCurrentSlot && todayInWeek;

                return (
                <tr
                  key={slot}
                  className={slotIndex < ALL_TIME_SLOTS.length - 1 ? 'border-b border-gray-100' : ''}
                  style={{ height: `${100 / ALL_TIME_SLOTS.length}%` }}
                >
                  {/* Time Label */}
                  <td
                    className={`text-center align-middle py-0 border-r border-gray-200 ${showCurrentMarker ? 'bg-red-50/50 relative z-10' : ''}`}
                    style={showCurrentMarker ? { boxShadow: 'inset 0 0 0 1px rgb(248, 113, 113)' } : undefined}
                  >
                    <span className={`text-[10px] font-mono font-medium ${showCurrentMarker ? 'text-red-500' : 'text-gray-600'}`}>
                      {slot}
                    </span>
                  </td>

                    {/* Day Slots */}
                    {weekDays.map((day, dayIndex) => {
                      const isClosed = isDayClosed(day.dateStr);
                      const barberTimeOff = isBarberOffOnDate(day.dateStr);
                      const key = `${day.dateStr}-${slot}`;
                      const dropId = `droppable|${selectedBarberId}|${day.dateStr}|${slot}`;
                      const appointment = appointmentMap.get(key);
                      const seriesItem = seriesAppointments.get(key);
                      const isDisabled = isClosed || !!barberTimeOff;
                      const isCurrentSlotToday = isCurrentSlot && day.isToday;
                      const isLastDay = dayIndex === weekDays.length - 1;

                      return (
                        <td
                          key={key}
                          className={`border-r border-gray-200 p-0 relative ${isCurrentSlotToday ? 'bg-red-50/50 z-10' : ''}`}
                          style={isCurrentSlotToday ? { boxShadow: 'inset 0 0 0 1px rgb(248, 113, 113)' } : undefined}
                        >
                          {/* Absolut positionierter Container verhindert Zellen-Dehnung */}
                          <div className="absolute inset-0 overflow-visible">
                            <DroppableCell id={dropId} disabled={isDisabled}>
                              {appointment && appointment.status === 'confirmed' ? (
                                <DraggableSlot id={appointment.id} disabled={appointment.customer_name?.includes('Pause') || selectionMode}>
                                  <AppointmentSlot
                                    appointment={appointment}
                                    series={seriesItem}
                                    barberId={selectedBarberId || ''}
                                    date={day.dateStr}
                                    timeSlot={slot}
                                    servicesMap={servicesMap}
                                    onClick={() => handleSlotClick(day.dateStr, slot)}
                                    onDelete={handleAppointmentDeleted}
                                    onUpdate={handleAppointmentUpdated}
                                    onSeriesDelete={handleSeriesDeleted}
                                    onSeriesUpdate={handleSeriesUpdated}
                                    onAppointmentCreated={handleNewAppointmentFromSeries}
                                    onSeriesSingleCancelled={handleSeriesSingleCancelled}
                                    isDisabled={isDisabled}
                                    disabledReason={barberTimeOff?.reason || undefined}
                                    formatName={formatName}
                                    selectionMode={selectionMode}
                                    isSelected={selectedAppointments.has(appointment.id)}
                                    onToggleSelect={(shiftKey) => handleSelectAppointment(appointment.id, day.dateStr, shiftKey)}
                                  />
                                </DraggableSlot>
                              ) : (
                                (() => {
                                  // Für Serientermine: seriesKey berechnen
                                  const seriesKey = seriesItem ? `series_${seriesItem.id}_${day.dateStr}` : null;
                                  return (
                                    <AppointmentSlot
                                      appointment={appointment}
                                      series={seriesItem}
                                      barberId={selectedBarberId || ''}
                                      date={day.dateStr}
                                      timeSlot={slot}
                                      servicesMap={servicesMap}
                                      onClick={() => handleSlotClick(day.dateStr, slot)}
                                      onDelete={handleAppointmentDeleted}
                                      onUpdate={handleAppointmentUpdated}
                                      onSeriesDelete={handleSeriesDeleted}
                                      onSeriesUpdate={handleSeriesUpdated}
                                      onAppointmentCreated={handleNewAppointmentFromSeries}
                                      onSeriesSingleCancelled={handleSeriesSingleCancelled}
                                      isDisabled={isDisabled}
                                      disabledReason={barberTimeOff?.reason || undefined}
                                      formatName={formatName}
                                      selectionMode={selectionMode}
                                      isSelected={appointment ? selectedAppointments.has(appointment.id) : (seriesKey ? selectedAppointments.has(seriesKey) : false)}
                                      onToggleSelect={appointment
                                        ? (shiftKey) => handleSelectAppointment(appointment.id, day.dateStr, shiftKey)
                                        : (seriesKey ? (shiftKey) => handleSelectAppointment(seriesKey, day.dateStr, shiftKey) : undefined)}
                                    />
                                  );
                                })()
                              )}
                            </DroppableCell>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>

        </div>

        {/* Legend */}
        <div className="mt-1 flex gap-4 text-[10px] text-gray-400 justify-center items-center flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-gold/30 border border-gold/50"></div>
            <span>Manuell</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-green-100 border border-green-300"></div>
            <span>Online</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-blue-100 border border-blue-300"></div>
            <span>Serie</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-gray-200 border border-gray-400"></div>
            <span>Pause</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-red-50 border border-red-200"></div>
            <span>Storniert</span>
          </div>
        </div>

        {/* Add Appointment Modal */}
        {selectedSlot && selectedBarber && (
          <AddAppointmentModal
            barberId={selectedSlot.barberId}
            date={selectedSlot.date}
            timeSlot={selectedSlot.timeSlot}
            team={team}
            services={services}
            onClose={handleCloseModal}
            onCreated={handleAppointmentCreated}
            onSeriesCreated={handleSeriesCreated}
          />
        )}

        {/* Move to Barber Modal - Kalender-Overlay für Drag & Drop */}
        {moveToBarberInfo && (
          <MoveToBarberModal
            appointment={moveToBarberInfo.appointment}
            targetBarberId={moveToBarberInfo.targetBarberId}
            targetBarberName={moveToBarberInfo.targetBarberName}
            targetDate={moveToBarberInfo.targetDate}
            existingAppointments={appointments}
            allTimeSlots={ALL_TIME_SLOTS}
            onClose={() => setMoveToBarberInfo(null)}
            onMoved={handleAppointmentMoved}
            onError={handleMoveError}
          />
        )}

        {/* Multi-Delete Modal */}
        {multiDeleteModal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => !isDeletingMultiple && setMultiDeleteModal(null)}
            />
            <div
              className="relative bg-white rounded-2xl shadow-2xl"
              style={{ width: '420px', maxWidth: 'calc(100vw - 32px)' }}
            >
              <div className="p-6 flex flex-col" style={{ minHeight: '240px' }}>
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Termine löschen?</h3>
                    <p className="text-gray-500 text-sm">Dieser Vorgang kann nicht rückgängig gemacht werden.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-xl mb-5 flex-1">
                  <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-red-200">
                    <span className="text-xl font-bold text-red-500">
                      {selectedAppointments.size}
                    </span>
                  </div>
                  <p className="text-gray-700">
                    <strong className="text-gray-900">{selectedAppointments.size === 1 ? 'Termin' : 'Termine'}</strong> {selectedAppointments.size === 1 ? 'wird' : 'werden'} endgültig gelöscht
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setMultiDeleteModal(null)}
                    disabled={isDeletingMultiple}
                    className="flex-1 px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleMultiDelete}
                    disabled={isDeletingMultiple}
                    className="flex-1 px-5 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isDeletingMultiple ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Löschen...
                      </>
                    ) : (
                      'Endgültig löschen'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Undo Toast */}
        <UndoToast
          visible={showUndoToast}
          onUndo={handleUndo}
          onExpire={handleUndoExpire}
          duration={5000}
        />
      </div>
    </DragProvider>
  );
}

// Einzelner Barber-Tab als Droppable
interface BarberTabDroppableProps {
  barber: TeamMember;
  isSelected: boolean;
  onSelectBarber: (id: string) => void;
}

function BarberTabDroppable({ barber, isSelected, onSelectBarber }: BarberTabDroppableProps) {
  const { isDragging, activeAppointment } = useDragContext();
  const { isOver, setNodeRef } = useDroppable({
    id: `barber-switch|${barber.id}|${activeAppointment?.date || ''}`,
    disabled: isSelected || !activeAppointment || barber.id === activeAppointment?.barber_id,
    data: {
      type: 'barber-switch',
      barberId: barber.id,
      barberName: barber.name,
      date: activeAppointment?.date || '',
    },
  });

  const isValidDropTarget = isDragging && activeAppointment && barber.id !== activeAppointment.barber_id;

  return (
    <div
      ref={setNodeRef}
      onClick={() => !isDragging && onSelectBarber(barber.id)}
      className={`relative flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg transition-all cursor-pointer ${
        isSelected
          ? 'bg-gold/20 text-gold'
          : isOver
            ? 'bg-gold/30 text-black ring-2 ring-gold'
            : isValidDropTarget
              ? 'bg-gold/10 text-gray-700 border border-dashed border-gold/50'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      <div
        className={`relative w-8 h-8 rounded-full overflow-hidden border-2 flex-shrink-0 ${
          isSelected ? 'border-gold' : isOver ? 'border-gold' : 'border-gray-300'
        }`}
      >
        {barber.image ? (
          <Image
            src={barber.image}
            alt={barber.name}
            fill
            className="object-cover"
            style={{
              objectPosition: barber.image_position || 'center',
              transform: `scale(${barber.image_scale || 1})`,
            }}
          />
        ) : (
          <div className="w-full h-full bg-gray-300 flex items-center justify-center">
            <span className="text-xs text-gray-500 font-medium">
              {barber.name.charAt(0)}
            </span>
          </div>
        )}
      </div>
      <span className="text-[14px] font-medium">{barber.name}</span>
      {isOver && (
        <span className="absolute -bottom-2 text-[8px] text-gold font-medium">loslassen</span>
      )}
    </div>
  );
}

// Separate Komponente für Barber-Tabs
interface BarberTabsProps {
  team: TeamMember[];
  selectedBarberId: string | null;
  onSelectBarber: (id: string) => void;
}

function BarberTabs({ team, selectedBarberId, onSelectBarber }: BarberTabsProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-1.5 mb-1.5 flex-shrink-0">
      <div className="flex gap-1.5">
        {team.map(barber => (
          <BarberTabDroppable
            key={barber.id}
            barber={barber}
            isSelected={barber.id === selectedBarberId}
            onSelectBarber={onSelectBarber}
          />
        ))}
      </div>
    </div>
  );
}
