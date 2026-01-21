'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ReactNode } from 'react';

interface DraggableSlotProps {
  id: string;
  children: ReactNode;
  disabled?: boolean;
}

export function DraggableSlot({ id, children, disabled }: DraggableSlotProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: disabled ? 'default' : 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="h-full"
    >
      {children}
    </div>
  );
}
