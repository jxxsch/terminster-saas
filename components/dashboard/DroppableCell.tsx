'use client';

import { useDroppable } from '@dnd-kit/core';
import { ReactNode } from 'react';
import { useDragContext } from './DragContext';

interface DroppableCellProps {
  id: string;
  children: ReactNode;
  disabled?: boolean;
}

export function DroppableCell({ id, children, disabled }: DroppableCellProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    disabled,
  });

  const { isDragging } = useDragContext();

  return (
    <div
      ref={setNodeRef}
      className={`h-full transition-colors ${
        isDragging && !disabled
          ? isOver
            ? 'bg-gold/20 ring-2 ring-gold/50 ring-inset'
            : 'bg-gold/5'
          : ''
      } ${disabled && isDragging ? 'bg-gray-200/50' : ''}`}
    >
      {children}
    </div>
  );
}
