'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { AppointmentSlot } from './AppointmentSlot';
import { AddAppointmentModal } from './AddAppointmentModal';
import { DragProvider, BarberHeaderDropInfo } from './DragContext';
import { DraggableSlot } from './DraggableSlot';
import { DroppableCell } from './DroppableCell';
import { MoveToBarberModal } from './MoveToBarberModal';
import {
  getAppointments,
  getSeries,
  getTeam,
  getServices,
  getStaffTimeOffForDateRange,
  deleteAppointment,
  createAppointment,
  Appointment,
  Series,
  TeamMember,
  Service,
  StaffTimeOff
} from '@/lib/supabase';
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

// Helper: Format date as YYYY-MM-DD in local timezone (not UTC)
function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface WeekViewProps {
  monday: Date;
  selectedDay: number;
  closedReason?: string;
  selectionMode?: boolean;
  selectedAppointments?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onClearSelection?: () => void;
  onExitSelectionMode?: () => void;
  onSelectedAppointmentsChange?: (ids: Set<string>) => void;
  formatName?: (name: string) => string;
}

interface SlotInfo {
  barberId: string;
  date: string;
  timeSlot: string;
}

// Alle Zeitslots von 9:00 bis 20:00
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

export function WeekView({
  monday,
  selectedDay,
  closedReason,
  selectionMode = false,
  selectedAppointments = new Set(),
  onToggleSelect,
  onClearSelection,
  onExitSelectionMode,
  onSelectedAppointmentsChange,
  formatName = (name) => name,
}: WeekViewProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffTimeOff, setStaffTimeOff] = useState<StaffTimeOff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [moveToBarberInfo, setMoveToBarberInfo] = useState<BarberHeaderDropInfo | null>(null);
  const [currentTimeSlot, setCurrentTimeSlot] = useState<string | null>(getCurrentTimeSlot());
  const [deleteAllModal, setDeleteAllModal] = useState<{ barberId: string; barberName: string; step: 1 | 2 } | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [selectionFilter, setSelectionFilter] = useState<SelectionFilter>({
    barberId: 'all',
    timeFrom: '',
    timeTo: '',
  });
  const [multiDeleteModal, setMultiDeleteModal] = useState<{ step: 1 | 2 } | null>(null);
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [lastSelectedBarberId, setLastSelectedBarberId] = useState<string | null>(null);

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
      setLastSelectedBarberId(null);
    }
  }, [selectionMode, selectedAppointments.size]);

  const tableBodyRef = useRef<HTMLTableSectionElement>(null);

  // Generate week days (Mo-So, 7 Tage)
  const weekDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: { date: Date; dateStr: string; dayName: string; dayNum: number; isToday: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      days.push({
        date,
        dateStr: formatDateLocal(date),
        dayName: DAY_NAMES[date.getDay()],
        dayNum: date.getDate(),
        isToday: date.getTime() === today.getTime(),
      });
    }
    return days;
  }, [monday]);

  // Update current time slot every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimeSlot(getCurrentTimeSlot());
    }, 60000); // Jede Minute

    return () => clearInterval(interval);
  }, []);

  // Load all data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const startDate = weekDays[0].dateStr;
      const endDate = weekDays[weekDays.length - 1].dateStr;

      const [appointmentsData, seriesData, teamData, servicesData, staffTimeOffData] = await Promise.all([
        getAppointments(startDate, endDate),
        getSeries(),
        getTeam(),
        getServices(),
        getStaffTimeOffForDateRange(startDate, endDate),
      ]);

      setAppointments(appointmentsData);
      setSeries(seriesData);
      setTeam(teamData);
      setServices(servicesData);
      setStaffTimeOff(staffTimeOffData);
      setIsLoading(false);
    }

    loadData();
  }, [weekDays]);

  // Create appointment lookup map
  const appointmentMap = useMemo(() => {
    const map = new Map<string, Appointment>();
    appointments.forEach(apt => {
      const key = `${apt.barber_id}-${apt.date}-${apt.time_slot}`;
      map.set(key, apt);
    });
    return map;
  }, [appointments]);

  // Generate series appointments for the week (mit Intervall-Unterstützung)
  const seriesAppointments = useMemo(() => {
    const map = new Map<string, Series>();
    series.forEach(s => {
      weekDays.forEach(day => {
        const dayOfWeek = day.date.getDay() === 0 ? 7 : day.date.getDay();
        if (s.day_of_week === dayOfWeek) {
          if (s.start_date <= day.dateStr && (!s.end_date || s.end_date >= day.dateStr)) {
            const intervalType = s.interval_type || 'weekly';
            let shouldShow = false;

            if (intervalType === 'weekly') {
              // Jede Woche
              shouldShow = true;
            } else if (intervalType === 'biweekly') {
              // Alle 2 Wochen: Berechne Wochen seit Startdatum (UTC-basiert)
              const startParts = s.start_date.split('-').map(Number);
              const currentParts = day.dateStr.split('-').map(Number);
              const startUtc = Date.UTC(startParts[0], startParts[1] - 1, startParts[2]);
              const currentUtc = Date.UTC(currentParts[0], currentParts[1] - 1, currentParts[2]);
              const diffDays = Math.round((currentUtc - startUtc) / (24 * 60 * 60 * 1000));
              const diffWeeks = Math.floor(diffDays / 7);
              shouldShow = diffWeeks >= 0 && diffWeeks % 2 === 0;
            } else if (intervalType === 'monthly') {
              // Monatlich: Gleicher Tag des Monats wie Startdatum
              const startDay = parseInt(s.start_date.split('-')[2], 10);
              shouldShow = day.date.getDate() === startDay;
            }

            if (shouldShow) {
              const key = `${s.barber_id}-${day.dateStr}-${s.time_slot}`;
              map.set(key, s);
            }
          }
        }
      });
    });
    return map;
  }, [series, weekDays]);

  // Toolbar-Filter: Direkte Auswahl (ersetzt vorherige Auswahl)
  useEffect(() => {
    if (!selectionMode || !onSelectedAppointmentsChange) {
      return;
    }

    const selectedDayData = weekDays[selectedDay] || weekDays[0];
    if (!selectedDayData) {
      return;
    }

    // Nur wenn Von oder Bis eingegeben wurde (nicht nur Barber)
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

    // Normale Termine filtern
    const currentDayAppointments = appointments.filter(
      apt => apt.date === selectedDayData.dateStr && apt.status === 'confirmed'
    );

    const newSelection = new Set<string>();

    // Normale Termine
    currentDayAppointments.forEach(apt => {
      // Barber-Filter
      if (selectionFilter.barberId !== 'all' && apt.barber_id !== selectionFilter.barberId) {
        return;
      }
      // Zeit-Filter
      if (!matchesTimeFilter(apt.time_slot)) {
        return;
      }
      newSelection.add(apt.id);
    });

    // Serientermine (nur wenn kein normaler Termin an dieser Stelle existiert)
    seriesAppointments.forEach((seriesItem, key) => {
      // Key format: "barber_id-date-time_slot"
      // Da barber_id (UUID) und date beide Bindestriche enthalten,
      // extrahieren wir das Datum über die bekannten Teile
      const barberId = seriesItem.barber_id;
      const timeSlot = seriesItem.time_slot;
      // Key: "uuid-date-time" -> date ist zwischen barber_id und time_slot
      const date = key.slice(barberId.length + 1, -(timeSlot.length + 1));

      // Nur für den aktuellen Tag
      if (date !== selectedDayData.dateStr) return;

      // Prüfe ob bereits ein normaler Termin existiert
      const hasAppointment = currentDayAppointments.some(
        apt => apt.barber_id === seriesItem.barber_id && apt.time_slot === seriesItem.time_slot
      );
      if (hasAppointment) return;

      // Barber-Filter
      if (selectionFilter.barberId !== 'all' && seriesItem.barber_id !== selectionFilter.barberId) {
        return;
      }
      // Zeit-Filter
      if (!matchesTimeFilter(seriesItem.time_slot)) {
        return;
      }

      // Serie-ID mit Datum kombinieren für eindeutige Identifikation
      const seriesKey = `series_${seriesItem.id}_${date}`;
      newSelection.add(seriesKey);
    });

    // Auswahl direkt setzen (ersetzt vorherige Auswahl)
    onSelectedAppointmentsChange(newSelection);
  }, [selectionMode, selectionFilter, appointments, seriesAppointments, weekDays, selectedDay, onSelectedAppointmentsChange]);

  // Create services lookup map
  const servicesMap = useMemo(() => {
    const map: Record<string, Service> = {};
    services.forEach(s => {
      map[s.id] = s;
    });
    return map;
  }, [services]);

  // Helper: Prüfe ob Barber an einem Tag abwesend ist
  const isBarberOffOnDate = (barberId: string, dateStr: string): StaffTimeOff | undefined => {
    return staffTimeOff.find(
      off => off.staff_id === barberId &&
             off.start_date <= dateStr &&
             off.end_date >= dateStr
    );
  };

  const handleSlotClick = (barberId: string, dateStr: string, timeSlot: string) => {
    // Keine Termine an Feiertagen
    if (closedReason) return;
    // Im Selection Mode nicht öffnen
    if (selectionMode) return;
    setSelectedSlot({ barberId, date: dateStr, timeSlot });
  };

  // Selection Mode: Termin auswählen/abwählen
  const handleSelectAppointment = useCallback((appointmentId: string, barberId: string, shiftKey?: boolean) => {
    if (!onToggleSelect || !onSelectedAppointmentsChange) return;

    const selectedDayData = weekDays[selectedDay] || weekDays[0];
    if (!selectedDayData) return;

    if (shiftKey && lastSelectedId && lastSelectedBarberId === barberId) {
      // Shift-Klick: Alle Termine zwischen lastSelectedId und appointmentId auswählen
      // NUR Termine des gleichen Barbers!
      const barberAppointments = appointments
        .filter(apt =>
          apt.date === selectedDayData.dateStr &&
          apt.status === 'confirmed' &&
          apt.barber_id === barberId
        )
        .sort((a, b) => a.time_slot.localeCompare(b.time_slot));

      const lastIndex = barberAppointments.findIndex(apt => apt.id === lastSelectedId);
      const currentIndex = barberAppointments.findIndex(apt => apt.id === appointmentId);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const newSelection = new Set(selectedAppointments);
        for (let i = start; i <= end; i++) {
          newSelection.add(barberAppointments[i].id);
        }
        onSelectedAppointmentsChange(newSelection);
        // Anker auf den neuen Termin setzen für weitere Shift-Klicks
        setLastSelectedId(appointmentId);
      }
    } else {
      // Normaler Klick: Einzelauswahl toggle
      onToggleSelect(appointmentId);
      setLastSelectedId(appointmentId);
      setLastSelectedBarberId(barberId);
    }
  }, [appointments, weekDays, selectedDay, lastSelectedId, lastSelectedBarberId, onSelectedAppointmentsChange, onToggleSelect, selectedAppointments]);


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
          const cancelledAppointment = await createAppointment({
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

          if (cancelledAppointment) {
            handleNewAppointmentFromSeries(cancelledAppointment);
            createdCancellations.push(cancelledAppointment.id);
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
      const restored = await createAppointment({
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
      if (restored) {
        setAppointments(prev => [...prev, restored]);
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
    setMoveToBarberInfo(null); // Modal schließen nach erfolgreichem Drop
    setToast({ message: 'Termin verschoben', type: 'success' });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleMoveError = useCallback((error: string) => {
    setToast({ message: error, type: 'error' });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Handler für Drop auf Barber-Header
  const handleBarberHeaderDrop = useCallback((info: BarberHeaderDropInfo) => {
    setMoveToBarberInfo(info);
  }, []);

  const currentDay = weekDays[selectedDay] || weekDays[0];

  // Handler für "Alle Termine löschen" eines Barbers
  const handleDeleteAllForBarber = async () => {
    if (!deleteAllModal) return;
    setIsDeletingAll(true);

    // Finde alle Termine des Barbers am aktuellen Tag
    const barberAppointments = appointments.filter(
      apt => apt.barber_id === deleteAllModal.barberId &&
             apt.date === currentDay.dateStr &&
             apt.status === 'confirmed'
    );

    // Kopiere für Undo
    const deletedAppointmentsCopy = [...barberAppointments];

    // Lösche alle Termine
    for (const apt of barberAppointments) {
      await deleteAppointment(apt.id);
      handleAppointmentDeletedInternal(apt.id);
    }

    // Für Undo speichern
    setDeletedItems({
      appointments: deletedAppointmentsCopy,
      seriesCancellations: [],
    });

    setIsDeletingAll(false);
    setDeleteAllModal(null);
    setShowUndoToast(true);
  };

  // Auswahl aufheben und Filter zurücksetzen
  const handleClearSelectionAndFilter = useCallback(() => {
    onClearSelection?.();
    setSelectionFilter({ barberId: 'all', timeFrom: '', timeTo: '' });
  }, [onClearSelection]);

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

  // Wenn Feiertag: Kalender anzeigen aber ausgegraut mit Overlay
  const isClosed = !!closedReason;

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
          />
        )}

        {/* Schedule Grid - Table-Layout für durchgehende Linien */}
        <div className={`bg-white rounded-lg border border-gray-200 shadow-sm flex-1 min-h-0 overflow-hidden relative ${isClosed ? 'grayscale opacity-40' : ''}`}>
          <div className="absolute inset-0 overflow-auto">
            <table className="w-full h-full border-collapse select-none" style={{ tableLayout: 'fixed' }}>
            {/* Header mit Datum und Barber */}
            <thead>
              <tr className="bg-gray-50">
                <th className="w-[60px] p-2 text-center font-medium border-b border-gray-200">
                  <span className="text-[10px] text-gray-400">Zeit</span>
                </th>
                {team.map(barber => {
                  const timeOff = isBarberOffOnDate(barber.id, currentDay.dateStr);
                  // Prüfe ob dieser Barber ausgewählte Termine hat
                  const hasSelectedAppointments = selectionMode && (
                    // Normale Termine
                    appointments.some(apt =>
                      apt.barber_id === barber.id &&
                      apt.date === currentDay.dateStr &&
                      selectedAppointments.has(apt.id)
                    ) ||
                    // Serientermine
                    Array.from(seriesAppointments.entries()).some(([key, s]) => {
                      if (s.barber_id !== barber.id) return false;
                      const date = key.slice(s.barber_id.length + 1, -(s.time_slot.length + 1));
                      if (date !== currentDay.dateStr) return false;
                      const seriesKey = `series_${s.id}_${date}`;
                      return selectedAppointments.has(seriesKey);
                    })
                  );
                  const isBarberHighlighted = selectionMode && (selectionFilter.barberId === barber.id || hasSelectedAppointments);
                  return (
                    <th
                      key={barber.id}
                      className={`relative border-l border-b border-gray-200 p-2 transition-colors ${
                        isBarberHighlighted
                          ? 'bg-red-100'
                          : timeOff
                          ? 'bg-red-50'
                          : ''
                      }`}
                      style={{ height: '40.5px' }}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <div
                          className={`relative w-6 h-6 rounded-full overflow-hidden border flex-shrink-0 ${
                            isBarberHighlighted
                              ? 'border-red-400 ring-2 ring-red-300'
                              : timeOff
                              ? 'border-red-200'
                              : 'border-gray-300'
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
                              <span className="text-[8px] text-gray-500 font-medium">
                                {barber.name.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className={`text-[14px] font-medium ${
                          isBarberHighlighted
                            ? 'text-red-700'
                            : timeOff
                            ? 'text-gray-400'
                            : 'text-gray-700'
                        }`}>
                          {barber.name}
                        </span>
                        {timeOff && (
                          <span className="text-[8px] text-red-500 ml-1">Abwesend</span>
                        )}
                      </div>
                      {/* Delete-All Icon - absolut rechts positioniert, bündig mit X-Buttons */}
                      {!timeOff && appointments.some(apt =>
                        apt.barber_id === barber.id &&
                        apt.date === currentDay.dateStr &&
                        apt.status === 'confirmed'
                      ) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteAllModal({ barberId: barber.id, barberName: barber.name, step: 1 });
                          }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded border border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-red-300 hover:bg-red-50 transition-colors group"
                          title="Alle Termine löschen"
                        >
                          <svg className="w-2.5 h-2.5 text-gray-400 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Time Slots */}
            <tbody ref={tableBodyRef}>
              {ALL_TIME_SLOTS.map((slot, index) => {
                const isCurrentSlot = currentDay.isToday && slot === currentTimeSlot && !isClosed;
                return (
                <tr
                  key={slot}
                  className={`${index < ALL_TIME_SLOTS.length - 1 ? 'border-b border-gray-100' : ''} ${
                    isCurrentSlot ? 'relative' : ''
                  }`}
                  style={{ height: `${100 / ALL_TIME_SLOTS.length}%` }}
                >
                  {/* Time Label */}
                  <td className={`text-center align-middle ${isCurrentSlot ? 'bg-red-50/50 border-y border-l border-red-400' : ''}`}>
                    <span className={`text-xs font-mono font-medium ${isCurrentSlot ? 'text-red-500' : 'text-gray-600'}`}>
                      {slot}
                    </span>
                  </td>

                  {/* Barber Slots */}
                  {team.map((barber, barberIndex) => {
                    const key = `${barber.id}-${currentDay.dateStr}-${slot}`;
                    const dropId = `droppable|${barber.id}|${currentDay.dateStr}|${slot}`;
                    const appointment = appointmentMap.get(key);
                    const seriesItem = seriesAppointments.get(key);
                    const barberTimeOff = isBarberOffOnDate(barber.id, currentDay.dateStr);
                    const isLastBarber = barberIndex === team.length - 1;

                    return (
                      <td
                        key={key}
                        className="border-l border-gray-200 p-0 align-middle"
                        style={isCurrentSlot ? {
                          backgroundColor: 'rgba(254, 242, 242, 0.5)',
                          borderTopWidth: '1px',
                          borderBottomWidth: '1px',
                          borderTopColor: 'rgb(248, 113, 113)',
                          borderBottomColor: 'rgb(248, 113, 113)',
                          ...(isLastBarber && { borderRightWidth: '1px', borderRightColor: 'rgb(248, 113, 113)' })
                        } : undefined}
                      >
                        <DroppableCell id={dropId} disabled={!!barberTimeOff || isClosed}>
                          {appointment && appointment.status === 'confirmed' ? (
                            <DraggableSlot id={appointment.id} disabled={appointment.customer_name?.includes('Pause') || selectionMode}>
                              <AppointmentSlot
                                appointment={appointment}
                                series={seriesItem}
                                barberId={barber.id}
                                date={currentDay.dateStr}
                                timeSlot={slot}
                                servicesMap={servicesMap}
                                onClick={() => handleSlotClick(barber.id, currentDay.dateStr, slot)}
                                onDelete={handleAppointmentDeleted}
                                onUpdate={handleAppointmentUpdated}
                                onSeriesDelete={handleSeriesDeleted}
                                onSeriesUpdate={handleSeriesUpdated}
                                onAppointmentCreated={handleNewAppointmentFromSeries}
                                onSeriesSingleCancelled={handleSeriesSingleCancelled}
                                isDisabled={!!barberTimeOff}
                                disabledReason={barberTimeOff?.reason || undefined}
                                selectionMode={selectionMode}
                                isSelected={selectedAppointments.has(appointment.id)}
                                onToggleSelect={(shiftKey) => handleSelectAppointment(appointment.id, barber.id, shiftKey)}
                                formatName={formatName}
                              />
                            </DraggableSlot>
                          ) : (
                            (() => {
                              // Für Serientermine: seriesKey berechnen
                              const seriesKey = seriesItem ? `series_${seriesItem.id}_${currentDay.dateStr}` : null;
                              return (
                                <AppointmentSlot
                                  appointment={appointment}
                                  series={seriesItem}
                                  barberId={barber.id}
                                  date={currentDay.dateStr}
                                  timeSlot={slot}
                                  servicesMap={servicesMap}
                                  onClick={() => handleSlotClick(barber.id, currentDay.dateStr, slot)}
                                  onDelete={handleAppointmentDeleted}
                                  onUpdate={handleAppointmentUpdated}
                                  onSeriesDelete={handleSeriesDeleted}
                                  onSeriesUpdate={handleSeriesUpdated}
                                  onAppointmentCreated={handleNewAppointmentFromSeries}
                                  onSeriesSingleCancelled={handleSeriesSingleCancelled}
                                  isDisabled={!!barberTimeOff}
                                  disabledReason={barberTimeOff?.reason || undefined}
                                  selectionMode={selectionMode}
                                  isSelected={appointment ? selectedAppointments.has(appointment.id) : (seriesKey ? selectedAppointments.has(seriesKey) : false)}
                                  onToggleSelect={appointment
                                    ? (shiftKey) => handleSelectAppointment(appointment.id, barber.id, shiftKey)
                                    : (seriesKey ? (shiftKey) => handleSelectAppointment(seriesKey, barber.id, shiftKey) : undefined)}
                                  formatName={formatName}
                                />
                              );
                            })()
                          )}
                        </DroppableCell>
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

        {/* Feiertag Overlay */}
        {isClosed && closedReason && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 rounded-lg">
            <div className="bg-white/95 backdrop-blur-sm px-8 py-6 rounded-xl shadow-xl border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{closedReason}</h3>
                  <p className="text-sm text-gray-500 mt-1">Geschlossen</p>
                </div>
              </div>
            </div>
          </div>
        )}

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
        {selectedSlot && (
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

        {/* Delete All Appointments Modal - Doppelte Sicherheit */}
        {deleteAllModal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => !isDeletingAll && setDeleteAllModal(null)}
            />
            <div
              className="relative bg-white rounded-2xl shadow-2xl"
              style={{ width: '420px', maxWidth: 'calc(100vw - 32px)' }}
            >
              {/* Schritt 1: Erste Bestätigung */}
              {deleteAllModal.step === 1 && (
                <div className="p-6 flex flex-col" style={{ minHeight: '280px' }}>
                  <div className="flex items-start gap-3 mb-5">
                    <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Alle Termine löschen?</h3>
                      <p className="text-gray-500 text-sm">{deleteAllModal.barberName} · {currentDay.dayName} {currentDay.dayNum}.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-xl mb-5 flex-1">
                    <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-gold/30">
                      <span className="text-xl font-bold text-gold">
                        {appointments.filter(apt => apt.barber_id === deleteAllModal.barberId && apt.date === currentDay.dateStr && apt.status === 'confirmed').length}
                      </span>
                    </div>
                    <p className="text-gray-700">Termine werden unwiderruflich gelöscht</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteAllModal(null)}
                      className="flex-1 px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={() => setDeleteAllModal({ ...deleteAllModal, step: 2 })}
                      className="flex-1 px-5 py-2.5 bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors"
                    >
                      Weiter
                    </button>
                  </div>
                </div>
              )}

              {/* Schritt 2: Finale Bestätigung */}
              {deleteAllModal.step === 2 && (
                <div className="p-6 flex flex-col" style={{ minHeight: '280px' }}>
                  <div className="flex items-start gap-3 mb-5">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Letzte Warnung!</h3>
                      <p className="text-gray-500 text-sm">Nicht rückgängig machbar.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-xl mb-5 flex-1">
                    <p className="text-gray-700">
                      Alle <strong className="text-gray-900">{appointments.filter(apt => apt.barber_id === deleteAllModal.barberId && apt.date === currentDay.dateStr && apt.status === 'confirmed').length} Termine</strong> von <strong className="text-gray-900">{deleteAllModal.barberName}</strong> am {currentDay.dayName} {currentDay.dayNum}. werden endgültig gelöscht.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteAllModal({ ...deleteAllModal, step: 1 })}
                      disabled={isDeletingAll}
                      className="flex-1 px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors"
                    >
                      Zurück
                    </button>
                    <button
                      onClick={handleDeleteAllForBarber}
                      disabled={isDeletingAll}
                      className="flex-1 px-5 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {isDeletingAll ? (
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
              )}
            </div>
          </div>
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
