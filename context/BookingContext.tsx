'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { BookingModal } from '@/components/sections/BookingModal';

interface BookingContextType {
  openBooking: (barberId?: string) => void;
  closeBooking: () => void;
}

const BookingContext = createContext<BookingContextType | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [preselectedBarber, setPreselectedBarber] = useState<string | undefined>();

  const openBooking = (barberId?: string) => {
    setPreselectedBarber(barberId);
    setIsOpen(true);
  };

  const closeBooking = () => {
    setIsOpen(false);
    setPreselectedBarber(undefined);
  };

  return (
    <BookingContext.Provider value={{ openBooking, closeBooking }}>
      {children}
      <BookingModal
        isOpen={isOpen}
        onClose={closeBooking}
        preselectedBarber={preselectedBarber}
      />
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
}
