'use client';

import { createContext, useContext, ReactNode, useState, useCallback, useRef } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  CollisionDetection,
} from '@dnd-kit/core';
import { Appointment, Series, moveAppointment, updateSeries } from '@/lib/supabase';

interface DragContextValue {
  isDragging: boolean;
  activeAppointment: Appointment | null;
  activePauseSeries: { series: Series; date: string } | null;
  overBarberHeader: { barberId: string; barberName: string; date: string } | null;
}

// Typ für Barber-Header-Drop
export interface BarberHeaderDropInfo {
  appointment: Appointment;
  targetBarberId: string;
  targetBarberName: string;
  targetDate: string;
}

const DragContextState = createContext<DragContextValue>({
  isDragging: false,
  activeAppointment: null,
  activePauseSeries: null,
  overBarberHeader: null,
});

// Custom Collision Detection: Priorisiert Barber-Headers wenn Maus darüber ist
const customCollisionDetection: CollisionDetection = (args) => {
  // Erst pointerWithin verwenden um zu sehen was unter dem Cursor ist
  const pointerCollisions = pointerWithin(args);

  // Prüfe ob ein Barber-Header unter den Collisions ist
  const headerCollision = pointerCollisions.find(
    collision => (collision.id as string).startsWith('barber-header|')
  );

  // Wenn ein Header gefunden wurde, priorisiere ihn
  if (headerCollision) {
    return [headerCollision];
  }

  // Ansonsten rectIntersection für die Zellen verwenden
  const rectCollisions = rectIntersection(args);

  // Filtere nur droppable Zellen (nicht barber-header)
  const cellCollisions = rectCollisions.filter(
    collision => (collision.id as string).startsWith('droppable|')
  );

  if (cellCollisions.length > 0) {
    return cellCollisions;
  }

  return rectCollisions;
};

export function useDragContext() {
  return useContext(DragContextState);
}

interface DragProviderProps {
  children: ReactNode;
  appointments: Appointment[];
  series?: Series[];
  onAppointmentMoved: (oldAppointment: Appointment, newAppointment: Appointment) => void;
  onSeriesUpdated?: (updatedSeries: Series) => void;
  onMoveError: (error: string) => void;
  onBarberHeaderDrop?: (info: BarberHeaderDropInfo) => void;
  disabled?: boolean;
}

export function DragProvider({
  children,
  appointments,
  series = [],
  onAppointmentMoved,
  onSeriesUpdated,
  onMoveError,
  onBarberHeaderDrop,
  disabled = false,
}: DragProviderProps) {
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [activePauseSeries, setActivePauseSeries] = useState<{ series: Series; date: string } | null>(null);
  const [overBarberHeader, setOverBarberHeader] = useState<{ barberId: string; barberName: string; date: string } | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 150, // 150ms Verzögerung bevor Drag startet - Klicks funktionieren
        tolerance: 5, // 5px Toleranz während der Verzögerung
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms Verzögerung für Touch
        tolerance: 8,
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (disabled) return;
    const { active } = event;
    const id = active.id as string;

    // Check if it's a pause series: "series-pause|{seriesId}|{date}"
    if (id.startsWith('series-pause|')) {
      const parts = id.split('|');
      if (parts.length === 3) {
        const seriesId = parts[1];
        const date = parts[2];
        const seriesItem = series.find(s => s.id === seriesId);
        if (seriesItem) {
          setActivePauseSeries({ series: seriesItem, date });
          return;
        }
      }
    }

    // Normal appointment
    const appointment = appointments.find(apt => apt.id === id);
    if (appointment) {
      setActiveAppointment(appointment);
    }
  }, [appointments, series, disabled]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over, active } = event;

    if (!over || !active) {
      // Nicht mehr über einem Drop-Target
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      setOverBarberHeader(null);
      return;
    }

    const overId = over.id as string;

    // Prüfe ob über einem Barber-Header
    if (overId.startsWith('barber-header|')) {
      const parts = overId.split('|');
      if (parts.length === 3) {
        const targetBarberId = parts[1];
        const targetDate = parts[2];
        const barberName = over.data.current?.barberName || 'Barber';

        // Hole aktiven Termin
        const appointmentId = active.id as string;
        const appointment = appointments.find(apt => apt.id === appointmentId);

        // Nur wenn anderer Barber
        if (appointment && targetBarberId !== appointment.barber_id) {
          // Prüfe ob sich der Header geändert hat
          if (!overBarberHeader || overBarberHeader.barberId !== targetBarberId) {
            // Neuer Header - Timer starten
            if (hoverTimerRef.current) {
              clearTimeout(hoverTimerRef.current);
            }

            setOverBarberHeader({ barberId: targetBarberId, barberName, date: targetDate });

            hoverTimerRef.current = setTimeout(() => {
              if (onBarberHeaderDrop && appointment) {
                onBarberHeaderDrop({
                  appointment,
                  targetBarberId,
                  targetBarberName: barberName,
                  targetDate,
                });
              }
            }, 800);
          }
          return;
        }
      }
    }

    // Nicht über einem gültigen Barber-Header
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setOverBarberHeader(null);
  }, [appointments, onBarberHeaderDrop, overBarberHeader]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    const currentPauseSeries = activePauseSeries;
    setActiveAppointment(null);
    setActivePauseSeries(null);
    setOverBarberHeader(null);

    // Timer aufräumen
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    if (!over || !active) return;

    const activeId = active.id as string;
    const dropId = over.id as string;

    // Handle pause series drag - only allow same-day time slot changes
    if (activeId.startsWith('series-pause|') && currentPauseSeries) {
      // Parse the drop zone ID: "droppable|{barberId}|{date}|{timeSlot}"
      if (!dropId.startsWith('droppable|')) return;

      const parts = dropId.split('|');
      if (parts.length !== 4) return;

      const targetBarberId = parts[1];
      const targetDate = parts[2];
      const targetTimeSlot = parts[3];

      const pauseSeries = currentPauseSeries.series;
      const pauseDate = currentPauseSeries.date;

      // Only allow moving to same barber, same day, different time slot
      if (targetBarberId !== pauseSeries.barber_id) {
        onMoveError('Pause kann nur innerhalb desselben Barbers verschoben werden');
        return;
      }
      if (targetDate !== pauseDate) {
        onMoveError('Pause kann nur innerhalb desselben Tages verschoben werden');
        return;
      }
      if (targetTimeSlot === pauseSeries.time_slot) {
        return; // No change
      }

      // Update series time_slot
      const updated = await updateSeries(pauseSeries.id, { time_slot: targetTimeSlot });
      if (updated && onSeriesUpdated) {
        onSeriesUpdated(updated);
      } else if (!updated) {
        onMoveError('Fehler beim Verschieben der Pause');
      }
      return;
    }

    // Normal appointment drag
    const appointment = appointments.find(apt => apt.id === activeId);
    if (!appointment) return;

    // Check if dropped on barber header: "barber-header|{barberId}|{date}"
    if (dropId.startsWith('barber-header|')) {
      const parts = dropId.split('|');
      if (parts.length === 3) {
        const targetBarberId = parts[1];
        const targetDate = parts[2];

        // Nur wenn auf anderen Barber gedroppt
        if (targetBarberId !== appointment.barber_id && onBarberHeaderDrop) {
          // Hole Barber-Name aus den data-Attributen
          const barberName = over.data.current?.barberName || 'Barber';

          onBarberHeaderDrop({
            appointment,
            targetBarberId,
            targetBarberName: barberName,
            targetDate,
          });
        }
      }
      return;
    }

    // Check if dropped on barber switch zone: "barber-switch|{barberId}|{date}"
    if (dropId.startsWith('barber-switch|')) {
      const parts = dropId.split('|');
      if (parts.length === 3) {
        const targetBarberId = parts[1];
        const targetDate = parts[2];

        // Nur wenn auf anderen Barber gedroppt
        if (targetBarberId !== appointment.barber_id && onBarberHeaderDrop) {
          const barberName = over.data.current?.barberName || 'Barber';

          onBarberHeaderDrop({
            appointment,
            targetBarberId,
            targetBarberName: barberName,
            targetDate,
          });
        }
      }
      return;
    }

    // Parse the drop zone ID: "droppable|{barberId}|{date}|{timeSlot}"
    if (!dropId.startsWith('droppable|')) return;

    const parts = dropId.split('|');
    if (parts.length !== 4) return;

    const barberId = parts[1];
    const date = parts[2];
    const timeSlot = parts[3];

    // Prüfen ob sich etwas geändert hat
    if (
      appointment.barber_id === barberId &&
      appointment.date === date &&
      appointment.time_slot === timeSlot
    ) {
      return; // Keine Änderung
    }

    // Termin verschieben
    const result = await moveAppointment(appointment.id, {
      barber_id: barberId,
      date,
      time_slot: timeSlot,
    });

    if (result.success && result.appointment) {
      onAppointmentMoved(appointment, result.appointment);
    } else {
      onMoveError(result.error || 'Fehler beim Verschieben');
    }
  }, [appointments, activePauseSeries, onAppointmentMoved, onSeriesUpdated, onMoveError, onBarberHeaderDrop]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <DragContextState.Provider value={{ isDragging: !!activeAppointment || !!activePauseSeries, activeAppointment, activePauseSeries, overBarberHeader }}>
        {children}
      </DragContextState.Provider>

      {/* Drag Overlay - zeigt das gezogene Element */}
      <DragOverlay dropAnimation={null}>
        {activeAppointment && (
          <div className="bg-gold/80 text-black px-2 py-1 rounded shadow-lg text-xs font-medium">
            {activeAppointment.customer_name}
          </div>
        )}
        {activePauseSeries && (
          <div className="bg-gray-300 text-gray-700 px-2 py-1 rounded shadow-lg text-xs font-medium">
            Pause
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
