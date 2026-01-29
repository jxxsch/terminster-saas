'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BookingModal } from '@/components/sections/BookingModal';
import { BookingModalClassic } from '@/components/sections/BookingModalClassic';
import { getSetting } from '@/lib/supabase';

type BookingSystemType = 'standard' | 'custom';

interface BookingContextType {
  openBooking: (barberId?: string) => void;
  closeBooking: () => void;
}

const BookingContext = createContext<BookingContextType | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [preselectedBarber, setPreselectedBarber] = useState<string | undefined>();
  const [bookingSystemType, setBookingSystemType] = useState<BookingSystemType>('standard');

  useEffect(() => {
    async function loadBookingSystemType() {
      const systemType = await getSetting<BookingSystemType>('booking_system_type');
      if (systemType) {
        setBookingSystemType(systemType);
      }
    }
    loadBookingSystemType();
  }, []);

  const openBooking = (barberId?: string) => {
    setPreselectedBarber(barberId);
    setIsOpen(true);
  };

  const closeBooking = () => {
    setIsOpen(false);
    setPreselectedBarber(undefined);
  };

  // Standard = BookingModalClassic (das aktuelle, gesicherte System)
  // Custom = BookingModal (das neue, anpassbare System)
  const BookingModalComponent = bookingSystemType === 'standard' ? BookingModalClassic : BookingModal;

  return (
    <BookingContext.Provider value={{ openBooking, closeBooking }}>
      {children}
      <BookingModalComponent
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
