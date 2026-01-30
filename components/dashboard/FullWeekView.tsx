'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { AddAppointmentModal } from './AddAppointmentModal';
import { DragProvider } from './DragContext';
import { DraggableSlot } from './DraggableSlot';
import { DroppableCell } from './DroppableCell';
import {
  getAppointments,
  getSeries,
  getTeam,
  getServices,
  getStaffTimeOffForDateRange,
  getClosedDates,
  Appointment,
  Series,
  TeamMember,
  Service,
  StaffTimeOff,
  ClosedDate,
} from '@/lib/supabase';

// Generiere alle Zeitslots von 9:00 bis 20:00 (30-Minuten-Intervalle)
function generateAllTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 9; hour <= 19; hour++) {
    slots.push(`${String(hour).padStart(2, '0')}:00`);
    slots.push(`${String(hour).padStart(2, '0')}:30`);
  }
  slots.push('20:00');
  return slots;
}

// Prüfe ob ein Zeitslot innerhalb der regulären Geschäftszeiten liegt (10:00 - 19:00)
function isWithinBusinessHours(slot: string): boolean {
  return slot >= '10:00' && slot < '19:00';
}

const DAY_NAMES = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const ALL_TIME_SLOTS = generateAllTimeSlots();

// Berechne den aktuellen Zeitslot (z.B. 16:10 -> "16:00")
function getCurrentTimeSlot(): string | null {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();

  // Öffnungszeiten: 9:00 - 20:00
  if (hours < 9 || hours > 20) return null;

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

// Kundenname kürzen
function truncateName(name: string, maxLength: number = 7): string {
  if (!name) return '';
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + '…';
}

interface FullWeekViewProps {
  monday: Date;
}

interface SlotInfo {
  barberId: string;
  date: string;
  timeSlot: string;
}

export function FullWeekView({ monday }: FullWeekViewProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffTimeOff, setStaffTimeOff] = useState<StaffTimeOff[]>([]);
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [currentTimeSlot, setCurrentTimeSlot] = useState<string | null>(getCurrentTimeSlot());

  // Generate week days (Mo-Sa, 6 Tage - ohne Sonntag)
  const weekDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: { date: Date; dateStr: string; dayName: string; dayNum: number; isToday: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      // Sonntag überspringen
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
  }, [monday]);

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

      const [appointmentsData, seriesData, teamData, servicesData, staffTimeOffData, closedDatesData] = await Promise.all([
        getAppointments(startDate, endDate),
        getSeries(),
        getTeam(),
        getServices(),
        getStaffTimeOffForDateRange(startDate, endDate),
        getClosedDates(),
      ]);

      setAppointments(appointmentsData);
      setSeries(seriesData);
      setTeam(teamData);
      setServices(servicesData);
      setStaffTimeOff(staffTimeOffData);
      setClosedDates(closedDatesData);
      setIsLoading(false);
    }

    loadData();
  }, [monday]);

  // Create appointment lookup map
  const appointmentMap = useMemo(() => {
    const map = new Map<string, Appointment>();
    appointments.forEach(apt => {
      const key = `${apt.barber_id}-${apt.date}-${apt.time_slot}`;
      map.set(key, apt);
    });
    return map;
  }, [appointments]);

  // Generate series appointments for the week
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
              const key = `${s.barber_id}-${day.dateStr}-${s.time_slot}`;
              map.set(key, s);
            }
          }
        }
      });
    });
    return map;
  }, [series, weekDays]);

  // Helper: Prüfe ob Barber an einem Tag abwesend ist
  const isBarberOffOnDate = (barberId: string, dateStr: string): StaffTimeOff | undefined => {
    return staffTimeOff.find(
      off => off.staff_id === barberId &&
             off.start_date <= dateStr &&
             off.end_date >= dateStr
    );
  };

  // Helper: Prüfe ob Tag geschlossen ist
  const isDayClosed = (dateStr: string): boolean => {
    return closedDates.some(cd => cd.date === dateStr);
  };

  const handleSlotClick = (barberId: string, dateStr: string, timeSlot: string) => {
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

  // Drag & Drop Handler
  const handleAppointmentMoved = useCallback((oldAppointment: Appointment, newAppointment: Appointment) => {
    setAppointments(prev => prev.map(apt => apt.id === oldAppointment.id ? newAppointment : apt));
    setToast({ message: 'Termin verschoben', type: 'success' });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleMoveError = useCallback((error: string) => {
    setToast({ message: error, type: 'error' });
    setTimeout(() => setToast(null), 3000);
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

        {/* Full Week Grid */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
          <table className="w-full h-full border-collapse" style={{ tableLayout: 'fixed' }}>
            {/* Day Headers mit Barber-Bildern */}
            <thead className="bg-gray-50">
              {/* Tages-Namen */}
              <tr>
                <th className="w-[50px] p-1 text-[10px] text-gray-400 text-center font-medium border-b border-r border-gray-200">
                  Zeit
                </th>
                {weekDays.map(day => {
                  const isClosed = isDayClosed(day.dateStr);
                  return (
                    <th
                      key={day.dateStr}
                      className={`p-1 text-center border-b border-r border-gray-200 font-normal ${
                        isClosed ? 'bg-gray-100' : ''
                      } ${day.isToday ? 'bg-gold/10' : ''}`}
                    >
                      <span className={`text-xs font-medium ${isClosed ? 'text-gray-400' : 'text-black'}`}>
                        {day.dayName} {day.dayNum}
                      </span>
                      {isClosed && (
                        <span className="block text-[8px] text-red-500">Geschlossen</span>
                      )}
                    </th>
                  );
                })}
              </tr>
              {/* Barber-Bilder - zentriert über jeweiliger Spalte */}
              <tr>
                <th className="w-[50px] p-1 border-b border-r border-gray-200 bg-gray-50"></th>
                {weekDays.map(day => {
                  const isClosed = isDayClosed(day.dateStr);
                  return (
                    <th
                      key={`barbers-${day.dateStr}`}
                      className={`p-2 border-b border-r border-gray-200 ${isClosed ? 'bg-gray-100' : 'bg-gray-50'}`}
                    >
                      <div className="flex h-full">
                        {team.map((barber) => {
                          const isOff = !!isBarberOffOnDate(barber.id, day.dateStr);
                          return (
                            <div
                              key={barber.id}
                              className="flex-1 flex justify-center items-center"
                            >
                              <div
                                className={`relative w-10 h-10 rounded-full overflow-hidden border-2 ${
                                  isOff ? 'border-red-300 opacity-50' : 'border-gold'
                                }`}
                                title={`${barber.name}${isOff ? ' (Abwesend)' : ''}`}
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
                                {isOff && (
                                  <div className="absolute inset-0 bg-red-500/20" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Time Slots */}
            <tbody>
              {ALL_TIME_SLOTS.map((slot, slotIndex) => {
                const isBusinessHours = isWithinBusinessHours(slot);
                // Prüfe ob dieser Slot der aktuelle ist (nur relevant für heute)
                const todayStr = formatDateLocal(new Date());
                const isTodayInWeek = weekDays.some(d => d.dateStr === todayStr);
                const isCurrentSlot = isTodayInWeek && slot === currentTimeSlot;

                return (
                  <tr
                    key={slot}
                    className={`${slotIndex < ALL_TIME_SLOTS.length - 1 ? 'border-b border-gray-100' : ''}`}
                    style={{ height: `${100 / ALL_TIME_SLOTS.length}%` }}
                  >
                    {/* Time Label */}
                    <td className={`text-center align-middle border-r border-gray-200 ${!isBusinessHours ? 'bg-gray-50' : ''} ${isCurrentSlot ? 'bg-red-50/50 border-y border-l border-red-400' : ''}`}>
                      <span className={`text-[10px] font-mono ${isCurrentSlot ? 'text-red-500 font-semibold' : isBusinessHours ? 'text-gray-600' : 'text-gray-400'}`}>
                        {slot}
                      </span>
                    </td>

                    {/* Day Slots - Mini-Grid pro Tag mit allen Barbern */}
                    {weekDays.map((day, dayIndex) => {
                      const isClosed = isDayClosed(day.dateStr);
                      const isCurrentSlotToday = isCurrentSlot && day.isToday;
                      const isLastDay = dayIndex === weekDays.length - 1;

                      return (
                        <td
                          key={`${day.dateStr}-${slot}`}
                          className={`border-r border-gray-200 p-0 ${isClosed ? 'bg-gray-100' : ''} ${!isBusinessHours && !isCurrentSlotToday ? 'bg-gray-50/50' : ''}`}
                          style={isCurrentSlotToday ? {
                            backgroundColor: 'rgba(254, 242, 242, 0.5)',
                            borderTopWidth: '1px',
                            borderBottomWidth: '1px',
                            borderTopColor: 'rgb(248, 113, 113)',
                            borderBottomColor: 'rgb(248, 113, 113)',
                            ...(isLastDay && { borderRightWidth: '1px', borderRightColor: 'rgb(248, 113, 113)' })
                          } : undefined}
                        >
                          {!isClosed ? (
                            <div className="flex h-full">
                              {team.map((barber) => {
                                const key = `${barber.id}-${day.dateStr}-${slot}`;
                                const dropId = `droppable|${barber.id}|${day.dateStr}|${slot}`;
                                const appointment = appointmentMap.get(key);
                                const seriesItem = seriesAppointments.get(key);
                                const barberTimeOff = isBarberOffOnDate(barber.id, day.dateStr);
                                const hasContent = appointment || seriesItem;
                                const isDisabled = !!barberTimeOff;

                                return (
                                  <div
                                    key={key}
                                    className="flex-1 border-r border-gray-100 last:border-r-0"
                                    title={`${barber.name} - ${slot}`}
                                  >
                                    <DroppableCell id={dropId} disabled={isDisabled}>
                                      {hasContent ? (
                                        appointment && appointment.status === 'confirmed' ? (
                                          <DraggableSlot id={appointment.id} disabled={appointment.customer_name?.includes('Pause')}>
                                            <CompactSlot
                                              appointment={appointment}
                                              series={seriesItem}
                                              onClick={() => handleSlotClick(barber.id, day.dateStr, slot)}
                                            />
                                          </DraggableSlot>
                                        ) : (
                                          <CompactSlot
                                            appointment={appointment}
                                            series={seriesItem}
                                            onClick={() => handleSlotClick(barber.id, day.dateStr, slot)}
                                          />
                                        )
                                      ) : isDisabled ? (
                                        <div className="h-full w-full bg-red-50/50" />
                                      ) : (
                                        <div
                                          onClick={() => handleSlotClick(barber.id, day.dateStr, slot)}
                                          className="h-full w-full cursor-pointer hover:bg-gold/10 transition-colors"
                                        />
                                      )}
                                    </DroppableCell>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="h-full w-full" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add Appointment Modal */}
        {selectedSlot && (
          <AddAppointmentModal
            barberId={selectedSlot.barberId}
            date={selectedSlot.date}
            timeSlot={selectedSlot.timeSlot}
            team={team}
            services={services}
            existingAppointments={appointments}
            onClose={handleCloseModal}
            onCreated={handleAppointmentCreated}
            onSeriesCreated={handleSeriesCreated}
          />
        )}
      </div>
    </DragProvider>
  );
}

// Kompakte Slot-Darstellung mit Kundennamen
interface CompactSlotProps {
  appointment?: Appointment;
  series?: Series;
  onClick: () => void;
}

function CompactSlot({ appointment, series, onClick }: CompactSlotProps) {
  const isPause = appointment?.customer_name?.includes('Pause');
  const isCancelled = appointment?.status === 'cancelled';
  const isSeries = series && !appointment;
  const isOnline = appointment?.source === 'online';

  if (isCancelled) {
    return (
      <div
        onClick={onClick}
        className="h-full w-full cursor-pointer bg-red-100/50 hover:bg-red-200/50 transition-colors flex items-center justify-center px-0.5"
        title={`${appointment?.customer_name} (Storniert)`}
      >
        <span className="text-[8px] text-red-400 line-through truncate">
          {truncateName(appointment?.customer_name || '')}
        </span>
      </div>
    );
  }

  if (isPause) {
    return (
      <div
        onClick={onClick}
        className="h-full w-full cursor-pointer bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center"
        title="Pause"
      >
        <span className="text-[8px] text-gray-500">Pause</span>
      </div>
    );
  }

  if (isSeries) {
    return (
      <div
        onClick={onClick}
        className="h-full w-full cursor-pointer bg-blue-100 hover:bg-blue-200 transition-colors flex items-center justify-center px-0.5"
        title={`${series.customer_name} (Serie)`}
      >
        <span className="text-[8px] text-blue-700 truncate font-medium">
          {truncateName(series.customer_name)}
        </span>
      </div>
    );
  }

  if (appointment) {
    return (
      <div
        onClick={onClick}
        className={`h-full w-full cursor-pointer transition-colors flex items-center justify-center px-0.5 ${
          isOnline ? 'bg-green-100 hover:bg-green-200' : 'bg-gold/30 hover:bg-gold/50'
        }`}
        title={`${appointment.customer_name}${isOnline ? ' (Online)' : ''}`}
      >
        <span className={`text-[8px] truncate font-medium ${isOnline ? 'text-green-700' : 'text-amber-800'}`}>
          {truncateName(appointment.customer_name)}
        </span>
      </div>
    );
  }

  return null;
}
