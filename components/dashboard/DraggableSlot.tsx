'use client';

import { ReactNode } from 'react';
import { useDraggable } from '@dnd-kit/core';

interface DraggableSlotProps {
  id: string;
  children: ReactNode;
  disabled?: boolean;
}

// DraggableSlot - Wrapper für ziehbare Termine
// Durch die PointerSensor Konfiguration in DragContext (150ms delay)
// funktionieren schnelle Klicks weiterhin für Popups
export function DraggableSlot({ id, children, disabled }: DraggableSlotProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="h-full"
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: disabled ? 'default' : 'grab',
      }}
    >
      {children}
    </div>
  );
}
