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
  Appointment,
  Series,
  TeamMember,
  Service,
  StaffTimeOff,
  ClosedDate,
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
const ALL_TIME_SLOTS = generateAllTimeSlots();

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
}

interface SlotInfo {
  barberId: string;
  date: string;
  timeSlot: string;
}

export function BarberWeekView({ monday, initialBarberId }: BarberWeekViewProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffTimeOff, setStaffTimeOff] = useState<StaffTimeOff[]>([]);
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(initialBarberId || null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [moveToBarberInfo, setMoveToBarberInfo] = useState<BarberHeaderDropInfo | null>(null);

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

      // Auto-select first barber if none selected
      if (!selectedBarberId && teamData.length > 0) {
        setSelectedBarberId(teamData[0].id);
      }

      setIsLoading(false);
    }

    loadData();
  }, [monday, selectedBarberId]);

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

  // Helper: Prüfe ob Barber an einem Tag abwesend ist
  const isBarberOffOnDate = (dateStr: string): StaffTimeOff | undefined => {
    if (!selectedBarberId) return undefined;
    return staffTimeOff.find(
      off => off.staff_id === selectedBarberId &&
             off.start_date <= dateStr &&
             off.end_date >= dateStr
    );
  };

  // Helper: Prüfe ob Tag geschlossen ist
  const isDayClosed = (dateStr: string): boolean => {
    return closedDates.some(cd => cd.date === dateStr);
  };

  const handleSlotClick = (dateStr: string, timeSlot: string) => {
    if (!selectedBarberId) return;
    setSelectedSlot({ barberId: selectedBarberId, date: dateStr, timeSlot });
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

  // Handler für AppointmentSlot Callbacks
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

        {/* Week Grid */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
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
                  return (
                    <th
                      key={day.dateStr}
                      className={`px-1 text-center border-b border-r border-gray-200 font-normal ${
                        isClosed || isOff ? 'bg-gray-100' : ''
                      } ${day.isToday ? 'bg-gold/10' : ''}`}
                    >
                      <span className={`text-[11px] font-medium ${isClosed || isOff ? 'text-gray-400' : 'text-black'}`}>
                        {day.dayName} {day.dayNum}
                      </span>
                      {(isClosed || isOff) && (
                        <span className="ml-1 text-[8px] text-red-500">{isClosed ? '✕' : '⌀'}</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Time Slots */}
            <tbody>
              {ALL_TIME_SLOTS.map((slot, slotIndex) => (
                <tr
                  key={slot}
                  className={slotIndex < ALL_TIME_SLOTS.length - 1 ? 'border-b border-gray-100' : ''}
                  style={{ height: `${100 / ALL_TIME_SLOTS.length}%` }}
                >
                  {/* Time Label */}
                  <td className="text-center align-middle border-r border-gray-200 py-0">
                    <span className="text-[10px] font-mono text-gray-600 font-medium">
                      {slot}
                    </span>
                  </td>

                    {/* Day Slots */}
                    {weekDays.map(day => {
                      const isClosed = isDayClosed(day.dateStr);
                      const barberTimeOff = isBarberOffOnDate(day.dateStr);
                      const key = `${day.dateStr}-${slot}`;
                      const dropId = `droppable|${selectedBarberId}|${day.dateStr}|${slot}`;
                      const appointment = appointmentMap.get(key);
                      const seriesItem = seriesAppointments.get(key);
                      const isDisabled = isClosed || !!barberTimeOff;

                      return (
                        <td
                          key={key}
                          className="border-r border-gray-200 p-0 relative"
                        >
                          {/* Absolut positionierter Container verhindert Zellen-Dehnung */}
                          <div className="absolute inset-0 overflow-hidden">
                            <DroppableCell id={dropId} disabled={isDisabled}>
                              {appointment && appointment.status === 'confirmed' ? (
                                <DraggableSlot id={appointment.id} disabled={appointment.customer_name?.includes('Pause')}>
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
                                    isDisabled={isDisabled}
                                    disabledReason={barberTimeOff?.reason || undefined}
                                  />
                                </DraggableSlot>
                              ) : (
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
                                  isDisabled={isDisabled}
                                  disabledReason={barberTimeOff?.reason || undefined}
                                />
                              )}
                            </DroppableCell>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Legend - kompakt in einer Zeile */}
        <div className="flex gap-3 text-[9px] text-gray-400 justify-center items-center flex-shrink-0 py-1">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gold/30 border border-gold/50"></span>Manuell</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-100 border border-green-300"></span>Online</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-100 border border-blue-300"></span>Serie</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gray-200 border border-gray-400"></span>Pause</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-50 border border-red-200"></span>Storniert</span>
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
      <span className="text-xs font-medium">{barber.name}</span>
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
