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
  Appointment,
  Series,
  TeamMember,
  Service,
  StaffTimeOff
} from '@/lib/supabase';

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

export function WeekView({ monday, selectedDay, closedReason }: WeekViewProps) {
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
    setSelectedSlot({ barberId, date: dateStr, timeSlot });
  };

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

  const handleAppointmentDeleted = (id: string) => {
    setAppointments(prev => prev.filter(apt => apt.id !== id));
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

        {/* Schedule Grid - Table-Layout für durchgehende Linien */}
        <div className={`bg-white rounded-lg border border-gray-200 shadow-sm flex-1 min-h-0 overflow-hidden relative ${isClosed ? 'grayscale opacity-40' : ''}`}>
          <div className="absolute inset-0 overflow-auto">
            <table className="w-full h-full border-collapse" style={{ tableLayout: 'fixed' }}>
            {/* Header mit Datum und Barber */}
            <thead>
              <tr className="bg-gray-50">
                <th className="w-[60px] p-2 text-center font-medium border-b border-gray-200">
                  <span className="text-[10px] text-gray-400">Zeit</span>
                </th>
                {team.map(barber => {
                  const timeOff = isBarberOffOnDate(barber.id, currentDay.dateStr);
                  return (
                    <th
                      key={barber.id}
                      className={`border-l border-b border-gray-200 p-2 ${timeOff ? 'bg-red-50' : ''}`}
                      style={{ height: '40.5px' }}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <div
                          className={`relative w-6 h-6 rounded-full overflow-hidden border flex-shrink-0 ${
                            timeOff ? 'border-red-200' : 'border-gray-300'
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
                        <span className={`text-xs font-medium ${timeOff ? 'text-gray-400' : 'text-gray-700'}`}>
                          {barber.name}
                        </span>
                        {timeOff && (
                          <span className="text-[8px] text-red-500 ml-1">Abwesend</span>
                        )}
                      </div>
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
                            <DraggableSlot id={appointment.id} disabled={appointment.customer_name?.includes('Pause')}>
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
                                isDisabled={!!barberTimeOff}
                                disabledReason={barberTimeOff?.reason || undefined}
                              />
                            </DraggableSlot>
                          ) : (
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
                              isDisabled={!!barberTimeOff}
                              disabledReason={barberTimeOff?.reason || undefined}
                            />
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
      </div>
    </DragProvider>
  );
}
