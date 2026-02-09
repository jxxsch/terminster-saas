'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BookingModal } from '@/components/sections/BookingModal';
import { BookingModalClassic } from '@/components/sections/BookingModalClassic';
import { getSetting } from '@/lib/supabase';

type BookingSystemType = 'standard' | 'custom';

export interface PasswordSetupData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isRecovery?: boolean;
}

interface BookingContextType {
  openBooking: (barberId?: string) => void;
  closeBooking: () => void;
  // Login Modal Control
  showLoginModal: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  loginPasswordSetupData: PasswordSetupData | null;
  openLoginPasswordSetup: (data: PasswordSetupData) => void;
  // Customer Portal Control
  showCustomerPortal: boolean;
  openCustomerPortal: () => void;
  closeCustomerPortal: () => void;
  // Legacy (für BookingModal - wird nicht mehr verwendet)
  openPasswordSetup: (data: PasswordSetupData) => void;
  passwordSetupData: PasswordSetupData | null;
  clearPasswordSetup: () => void;
}

const BookingContext = createContext<BookingContextType | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [preselectedBarber, setPreselectedBarber] = useState<string | undefined>();
  const [bookingSystemType, setBookingSystemType] = useState<BookingSystemType>('standard');
  const [passwordSetupData, setPasswordSetupData] = useState<PasswordSetupData | null>(null);

  // Login Modal State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPasswordSetupData, setLoginPasswordSetupData] = useState<PasswordSetupData | null>(null);

  // Customer Portal State
  const [showCustomerPortal, setShowCustomerPortal] = useState(false);

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
    setPasswordSetupData(null);
  };

  // Legacy - wird nicht mehr verwendet
  const openPasswordSetup = (data: PasswordSetupData) => {
    setPasswordSetupData(data);
    setIsOpen(true);
  };

  const clearPasswordSetup = () => {
    setPasswordSetupData(null);
  };

  // Login Modal Controls
  const openLogin = () => {
    setShowLoginModal(true);
  };

  const closeLogin = () => {
    setShowLoginModal(false);
    setLoginPasswordSetupData(null);
  };

  const openLoginPasswordSetup = (data: PasswordSetupData) => {
    setLoginPasswordSetupData(data);
    setShowLoginModal(true);
  };

  // Customer Portal Controls
  const openCustomerPortal = () => {
    setShowCustomerPortal(true);
  };

  const closeCustomerPortal = () => {
    setShowCustomerPortal(false);
  };

  // Standard = BookingModalClassic (das aktuelle, gesicherte System)
  // Custom = BookingModal (das neue, anpassbare System)
  const BookingModalComponent = bookingSystemType === 'standard' ? BookingModalClassic : BookingModal;

  return (
    <BookingContext.Provider value={{
      openBooking,
      closeBooking,
      showLoginModal,
      openLogin,
      closeLogin,
      loginPasswordSetupData,
      openLoginPasswordSetup,
      showCustomerPortal,
      openCustomerPortal,
      closeCustomerPortal,
      openPasswordSetup,
      passwordSetupData,
      clearPasswordSetup
    }}>
      {children}
      <BookingModalComponent
        isOpen={isOpen}
        onClose={closeBooking}
        preselectedBarber={preselectedBarber}
        passwordSetupData={passwordSetupData}
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
