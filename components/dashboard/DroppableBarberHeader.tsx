'use client';

import { useDroppable } from '@dnd-kit/core';
import { ReactNode } from 'react';
import { useDragContext } from './DragContext';

interface DroppableBarberHeaderProps {
  barberId: string;
  barberName: string;
  date: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function DroppableBarberHeader({
  barberId,
  barberName,
  date,
  children,
  disabled,
  className,
}: DroppableBarberHeaderProps) {
  // ID-Format: "barber-header|{barberId}|{date}"
  const id = `barber-header|${barberId}|${date}`;

  const { setNodeRef } = useDroppable({
    id,
    disabled,
    data: {
      type: 'barber-header',
      barberId,
      barberName,
      date,
    },
  });

  const { isDragging, activeAppointment, overBarberHeader } = useDragContext();

  // Berechne ob dies ein gültiges Drop-Target ist
  const isValidDropTarget = isDragging && !disabled && activeAppointment && activeAppointment.barber_id !== barberId;

  // Ist der Cursor gerade über diesem Header?
  const isOver = overBarberHeader?.barberId === barberId;
  const shouldShowProgress = isOver && isValidDropTarget;

  return (
    <div
      ref={setNodeRef}
      className={`relative transition-all duration-200 ${
        isValidDropTarget
          ? isOver
            ? 'bg-gold/30 ring-2 ring-gold ring-inset'
            : 'bg-gold/10'
          : ''
      } ${disabled && isDragging ? 'opacity-50' : ''} ${className || ''}`}
    >
      {children}

      {/* Progress-Indikator beim Hovern */}
      {shouldShowProgress && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gold/30 overflow-hidden">
          <div
            className="h-full bg-gold"
            style={{
              animation: 'progress-fill 800ms linear forwards'
            }}
          />
        </div>
      )}
    </div>
  );
}
