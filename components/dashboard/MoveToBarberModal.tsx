'use client';

import { useState, useMemo, useEffect } from 'react';
import { Appointment, moveAppointment, getAppointments } from '@/lib/supabase';

interface MoveToBarberModalProps {
  appointment: Appointment;
  targetBarberId: string;
  targetBarberName: string;
  targetDate: string;
  existingAppointments: Appointment[];
  allTimeSlots: string[];
  onClose: () => void;
  onMoved?: (oldAppointment: Appointment, newAppointment: Appointment) => void;
  onError?: (error: string) => void;
}

// Nur reguläre Öffnungszeiten: 10:00 bis 18:30
function generateBusinessTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 10; hour <= 18; hour++) {
    slots.push(`${String(hour).padStart(2, '0')}:00`);
    slots.push(`${String(hour).padStart(2, '0')}:30`);
  }
  return slots;
}

const BUSINESS_TIME_SLOTS = generateBusinessTimeSlots();
const DAY_NAMES = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];


// Helper: Format date as YYYY-MM-DD in local timezone
function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Montag der Woche für ein Datum finden
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper: Kalenderwoche berechnen
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function MoveToBarberModal({
  appointment,
  targetBarberId,
  targetBarberName,
  targetDate,
  existingAppointments,
  onClose,
  onMoved,
  onError,
}: MoveToBarberModalProps) {
  // Stabile Referenz für initialMonday - nur bei targetDate-Änderung neu berechnen
  const initialMondayStr = useMemo(() => {
    const monday = getMondayOfWeek(new Date(targetDate));
    return formatDateLocal(monday);
  }, [targetDate]);

  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMondayOfWeek(new Date(targetDate)));
  const [isMoving, setIsMoving] = useState(false);
  const [weekAppointments, setWeekAppointments] = useState<Appointment[]>(existingAppointments);
  const [isLoadingWeek, setIsLoadingWeek] = useState(false);

  // Termine für die aktuelle Woche laden, wenn KW gewechselt wird
  useEffect(() => {
    const startDate = formatDateLocal(currentMonday);

    // Wenn wir in der ursprünglichen Woche sind, nichts laden
    if (startDate === initialMondayStr) {
      return;
    }

    // Nur laden wenn wir in einer anderen Woche sind
    let cancelled = false;
    const loadWeekAppointments = async () => {
      setIsLoadingWeek(true);
      const endOfWeek = new Date(currentMonday);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      const endDate = formatDateLocal(endOfWeek);

      const appointments = await getAppointments(startDate, endDate);
      if (!cancelled) {
        setWeekAppointments(appointments);
        setIsLoadingWeek(false);
      }
    };

    loadWeekAppointments();

    return () => {
      cancelled = true;
    };
  }, [currentMonday, initialMondayStr]);

  // Wochentage generieren (Mo-Sa, ohne Sonntag)
  const weekDays = useMemo(() => {
    const days: { date: Date; dateStr: string; dayName: string; dayNum: number; isToday: boolean }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(currentMonday);
      date.setDate(currentMonday.getDate() + i);
      if (date.getDay() === 0) continue;
      days.push({
        date,
        dateStr: formatDateLocal(date),
        dayName: DAY_NAMES[date.getDay()],
        dayNum: date.getDate(),
        isToday: date.getTime() === today.getTime(),
      });
    }
    return days;
  }, [currentMonday]);

  // Belegte Slots für diesen Barber (mit Appointment-Daten)
  const occupiedSlots = useMemo(() => {
    const slots = new Map<string, Appointment>();
    const startDate = weekDays[0]?.dateStr;
    const endDate = weekDays[weekDays.length - 1]?.dateStr;

    weekAppointments
      .filter(apt =>
        apt.barber_id === targetBarberId &&
        apt.date >= startDate &&
        apt.date <= endDate &&
        apt.status === 'confirmed'
      )
      .forEach(apt => {
        slots.set(`${apt.date}-${apt.time_slot}`, apt);
      });
    return slots;
  }, [weekAppointments, targetBarberId, weekDays]);

  // Klick auf freien Slot - Termin verschieben
  const handleSlotClick = async (dateStr: string, timeSlot: string) => {
    if (isMoving) return;

    setIsMoving(true);
    const result = await moveAppointment(appointment.id, {
      barber_id: targetBarberId,
      date: dateStr,
      time_slot: timeSlot,
    });

    if (result.success && result.appointment) {
      onMoved?.(appointment, result.appointment);
      onClose();
    } else {
      onError?.(result.error || 'Fehler beim Verschieben');
      setIsMoving(false);
    }
  };

  // KW Navigation
  const goToPrevWeek = () => setCurrentMonday(prev => {
    const d = new Date(prev);
    d.setDate(d.getDate() - 7);
    return d;
  });

  const goToNextWeek = () => setCurrentMonday(prev => {
    const d = new Date(prev);
    d.setDate(d.getDate() + 7);
    return d;
  });

  const weekNumber = getWeekNumber(currentMonday);

  // Datum von-bis für die Woche berechnen
  const weekEndDate = new Date(currentMonday);
  weekEndDate.setDate(weekEndDate.getDate() + 5); // Samstag
  const formatShortDate = (date: Date) => `${date.getDate()}.${date.getMonth() + 1}.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - kompakt */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-black">{targetBarberName}</span>
            <span className="text-sm text-gray-400">←</span>
            <span className="text-sm text-black font-medium">{appointment.customer_name}</span>
          </div>

          {/* KW Navigation */}
          <div className="flex items-center gap-1.5">
            <button onClick={goToPrevWeek} className="p-1 rounded bg-gold/10 hover:bg-gold/20 transition-colors">
              <svg className="w-3.5 h-3.5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center px-1.5">
              <span className="text-xs font-semibold text-gold">KW {weekNumber}</span>
              <span className="text-[10px] text-gold/70 ml-1.5">({formatShortDate(currentMonday)} - {formatShortDate(weekEndDate)})</span>
            </div>
            <button onClick={goToNextWeek} className="p-1 rounded bg-gold/10 hover:bg-gold/20 transition-colors">
              <svg className="w-3.5 h-3.5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full relative">
          {isLoadingWeek && (
            <div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
              <svg className="animate-spin h-6 w-6 text-gold" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </div>
          )}
          <table className="w-full h-full border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
            <thead className="sticky top-0 bg-white z-10">
              <tr>
                <th className="w-14 p-1.5 text-[10px] text-gray-400 border-b border-r border-gray-200"></th>
                {weekDays.map(day => (
                  <th
                    key={day.dateStr}
                    className={`p-1.5 text-center border-b border-r border-gray-200 ${day.isToday ? 'bg-gold/10' : ''}`}
                  >
                    <div className="text-[10px] text-gray-500">{day.dayName}</div>
                    <div className="text-sm font-medium text-black">{day.dayNum}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BUSINESS_TIME_SLOTS.map((slot) => (
                <tr key={slot}>
                  <td className="p-1.5 text-center border-r border-b border-gray-100">
                    <span className="text-xs font-mono text-gray-600 font-medium">
                      {slot}
                    </span>
                  </td>
                  {weekDays.map(day => {
                    const key = `${day.dateStr}-${slot}`;
                    const occupyingAppointment = occupiedSlots.get(key);

                    return (
                      <td
                        key={key}
                        className={`p-0.5 border-r border-b border-gray-100 ${day.isToday ? 'bg-gold/5' : ''}`}
                      >
                        {occupyingAppointment ? (
                          <div className="h-7 rounded bg-gray-200 px-1.5 flex items-center overflow-hidden" title={occupyingAppointment.customer_name}>
                            <span className="text-[10px] text-gray-600 truncate">
                              {occupyingAppointment.customer_name}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSlotClick(day.dateStr, slot)}
                            disabled={isMoving}
                            className={`w-full h-7 rounded transition-colors bg-green-100 hover:bg-green-300 border border-green-200 hover:border-green-400 ${isMoving ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                            title="Frei - Klicken zum Verschieben"
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer - minimal */}
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-400">
          <div className="flex gap-3">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-200"></span> Frei</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-300"></span> Belegt</span>
          </div>
          <span>Klicken um zu verschieben</span>
        </div>
      </div>
    </div>
  );
}
