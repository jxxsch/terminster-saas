'use client';

import { ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableCellProps {
  id: string;
  children: ReactNode;
  disabled?: boolean;
}

// DroppableCell - Wrapper für Drop-Zonen im Kalender
// Ermöglicht das Ablegen von gezogenen Terminen
export function DroppableCell({ id, children, disabled }: DroppableCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      className="h-full"
      style={{
        backgroundColor: isOver ? 'rgba(212, 175, 55, 0.1)' : undefined,
      }}
    >
      {children}
    </div>
  );
}
