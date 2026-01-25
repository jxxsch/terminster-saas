'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  getTeam,
  getServices,
  getTimeSlotsArray,
  getAppointments,
  createAppointment,
  formatPrice,
  resetPassword,
  getClosedDates,
  getOpenSundays,
  getStaffTimeOffForDateRange,
  getOpenHolidays,
  getSetting,
  TeamMember,
  Service,
  Appointment,
  ClosedDate,
  OpenSunday,
  OpenHoliday,
  StaffTimeOff
} from '@/lib/supabase';
import { sendBookingConfirmationEmail } from '@/lib/email-client';
import { useAuth } from '@/context/AuthContext';
import { CustomerPortal } from '@/components/sections/CustomerPortal';
import { Bundesland, isHoliday, getHolidayName } from '@/lib/holidays';

// Constants for getWeekDays function (outside component, can't use hooks)
const DAY_NAMES_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const DAY_NAMES_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

// Helper: Format date as YYYY-MM-DD in local timezone (not UTC)
function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedBarber?: string;
}

// Kalenderwoche berechnen (ISO 8601)
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Generate week days (Mo-So) for a given week offset
function getWeekDays(
  weekOffset: number,
  closedDatesList: ClosedDate[] = [],
  openSundaysList: OpenSunday[] = [],
  bundesland: Bundesland = 'NW',
  openHolidaysList: OpenHoliday[] = []
) {
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Samstag ab 18 Uhr ODER Sonntag -> nächste Woche anzeigen
  const isSaturday = now.getDay() === 6;
  const isSunday = now.getDay() === 0;
  const isAfter18 = now.getHours() >= 18;
  const autoWeekOffset = (isSunday || (isSaturday && isAfter18)) ? 1 : 0;

  // Max Buchungsdatum: 4 Wochen (28 Tage) in die Zukunft
  const maxBookingDate = new Date(today);
  maxBookingDate.setDate(today.getDate() + 28);

  // Montag der aktuellen Woche finden (mit autoWeekOffset für Samstag ab 18 Uhr)
  const monday = new Date(today);
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sonntag = 0, also -6
  monday.setDate(today.getDate() + diff + ((weekOffset + autoWeekOffset) * 7));

  const days: {
    date: Date;
    dateStr: string;
    dayNameShort: string;
    dayNameLong: string;
    dayNum: string;
    dayNumFull: string;
    isToday: boolean;
    isPast: boolean;
    isSunday: boolean;
    isOpenSunday: boolean;
    openSundayOpenTime?: string;
    openSundayCloseTime?: string;
    isTooFarInFuture: boolean;
    isClosed: boolean;
    closedReason?: string;
    isDisabled: boolean;
  }[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);

    const dateStr = formatDateLocal(date);
    const isPast = date < today;
    const isActuallySunday = date.getDay() === 0;
    const openSundayData = isActuallySunday ? openSundaysList.find(os => os.date === dateStr) : undefined;
    const isOpenSunday = !!openSundayData;
    // Sonntag ist nur disabled, wenn es KEIN verkaufsoffener Sonntag ist
    const isSunday = isActuallySunday && !isOpenSunday;
    const isTooFarInFuture = date > maxBookingDate;
    const isToday = date.toDateString() === new Date().toDateString();
    const day = date.getDate();
    const month = date.getMonth();

    // Prüfe ob Tag manuell geschlossen ist
    const closedDate = closedDatesList.find(cd => cd.date === dateStr);
    const isManualClosed = !!closedDate;

    // Prüfe ob Tag ein Feiertag ist (basierend auf Bundesland)
    const holidayName = isHoliday(dateStr, bundesland) ? getHolidayName(dateStr, bundesland) : null;
    const isHolidayOpen = openHolidaysList.some(oh => oh.date === dateStr);
    const isHolidayClosed = !!holidayName && !isHolidayOpen;

    // Tag ist geschlossen wenn manuell geschlossen ODER Feiertag (ohne Sonderöffnung)
    const isClosed = isManualClosed || isHolidayClosed;
    const closedReason = closedDate?.reason || holidayName || undefined;

    days.push({
      date,
      dateStr,
      dayNameShort: DAY_NAMES_SHORT[date.getDay()],
      dayNameLong: DAY_NAMES_LONG[date.getDay()],
      dayNum: day.toString().padStart(2, '0') + '.' + (month + 1).toString().padStart(2, '0'),
      dayNumFull: `${day}. ${MONTH_NAMES[month]}`,
      isToday,
      isPast,
      isSunday,
      isOpenSunday,
      openSundayOpenTime: openSundayData?.open_time,
      openSundayCloseTime: openSundayData?.close_time,
      isTooFarInFuture,
      isClosed,
      closedReason,
      isDisabled: isPast || isSunday || isTooFarInFuture || isClosed,
    });
  }

  return { days, weekNumber: getWeekNumber(monday), monday };
}

// Filtere verfügbare Slots basierend auf bereits gebuchten Terminen und Öffnungszeiten
function getAvailableSlots(
  barberId: string,
  dateStr: string,
  allSlots: string[],
  bookedAppointments: Appointment[],
  openTime?: string,
  closeTime?: string
): string[] {
  // Finde alle gebuchten Slots für diesen Friseur an diesem Tag
  const bookedSlots = bookedAppointments
    .filter(apt => apt.barber_id === barberId && apt.date === dateStr)
    .map(apt => apt.time_slot);

  // Filtere nach Öffnungszeiten (wenn angegeben)
  let filteredSlots = allSlots;
  if (openTime && closeTime) {
    // Konvertiere Zeiten zu Minuten für einfachen Vergleich
    const parseTime = (time: string): number => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };
    const openMinutes = parseTime(openTime);
    // Letzter Slot muss 30 Minuten vor Schließung sein (für 30 Min Termine)
    const closeMinutes = parseTime(closeTime) - 30;

    filteredSlots = allSlots.filter(slot => {
      const slotMinutes = parseTime(slot);
      return slotMinutes >= openMinutes && slotMinutes <= closeMinutes;
    });
  }

  // Gib nur die nicht gebuchten Slots zurück
  return filteredSlots.filter(slot => !bookedSlots.includes(slot));
}

export function BookingModal({ isOpen, onClose, preselectedBarber }: BookingModalProps) {
  const t = useTranslations('booking');
  const tAuth = useTranslations('auth');
  const tDays = useTranslations('days');
  const tMonths = useTranslations('months');
  const tCommon = useTranslations('common');
  const tStatus = useTranslations('status');

  // Day/Month key arrays for translation lookup
  const dayKeysShort = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
  const dayKeysLong = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
  const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;

  const { customer, isAuthenticated, signIn, signUp, signOut } = useAuth();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [bookedAppointments, setBookedAppointments] = useState<Appointment[]>([]);
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [openSundays, setOpenSundays] = useState<OpenSunday[]>([]);
  const [openHolidays, setOpenHolidays] = useState<OpenHoliday[]>([]);
  const [bundesland, setBundesland] = useState<Bundesland>('NW');
  const [maxWeeks, setMaxWeeks] = useState(2);
  const [staffTimeOff, setStaffTimeOff] = useState<StaffTimeOff[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // Contact Mode States
  const [contactMode, setContactMode] = useState<'choice' | 'guest' | 'auth'>('choice');
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [showCustomerPortal, setShowCustomerPortal] = useState(false);

  // Auth Form States
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFirstName, setAuthFirstName] = useState('');
  const [authLastName, setAuthLastName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authBirthDate, setAuthBirthDate] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Prefill customer data when authenticated
  useEffect(() => {
    if (isAuthenticated && customer) {
      setCustomerName(customer.name);
      setCustomerEmail(customer.email);
      setCustomerPhone(customer.phone || '');
    }
  }, [isAuthenticated, customer]);

  const { days, weekNumber, monday } = useMemo(() => getWeekDays(currentWeekOffset, closedDates, openSundays, bundesland, openHolidays), [currentWeekOffset, closedDates, openSundays, bundesland, openHolidays]);

  // Verhindere Scrollen der Seite wenn Modal offen ist
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Cleanup beim Unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Load data from Supabase
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);

      // Berechne Datumsbereich für Termine (4 Wochen in die Zukunft)
      const today = new Date();
      const startDate = formatDateLocal(today);
      // Load appointments for up to 12 weeks (max possible setting)
      const endDate = formatDateLocal(new Date(today.getTime() + 12 * 7 * 24 * 60 * 60 * 1000));

      const [teamData, servicesData, timeSlotsData, appointmentsData, closedDatesData, openSundaysData, openHolidaysData, bundeslandData, advanceWeeksData, staffTimeOffData] = await Promise.all([
        getTeam(),
        getServices(),
        getTimeSlotsArray(),
        getAppointments(startDate, endDate),
        getClosedDates(),
        getOpenSundays(),
        getOpenHolidays(),
        getSetting<Bundesland>('bundesland'),
        getSetting<{ value: number }>('booking_advance_weeks'),
        getStaffTimeOffForDateRange(startDate, endDate),
      ]);
      setTeam(teamData);
      setServices(servicesData);
      setTimeSlots(timeSlotsData);
      setBookedAppointments(appointmentsData);
      setClosedDates(closedDatesData);
      setOpenSundays(openSundaysData);
      setOpenHolidays(openHolidaysData);
      if (bundeslandData) setBundesland(bundeslandData);
      if (advanceWeeksData?.value) setMaxWeeks(advanceWeeksData.value);
      setStaffTimeOff(staffTimeOffData);
      setIsLoading(false);
    }

    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Wochen-Range für Header berechnen
  const weekRange = useMemo(() => {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const startDay = monday.getDate();
    const endDay = sunday.getDate();
    const startMonth = MONTH_NAMES[monday.getMonth()];
    const endMonth = MONTH_NAMES[sunday.getMonth()];

    if (monday.getMonth() === sunday.getMonth()) {
      return `${startDay}. - ${endDay}. ${startMonth}`;
    }
    return `${startDay}. ${startMonth} - ${endDay}. ${endMonth}`;
  }, [monday]);

  const handleClose = () => {
    setSelectedDay(null);
    setSelectedBarber(null);
    setSelectedSlot(null);
    setSelectedService(null);
    // Keep customer data if authenticated, otherwise reset
    if (!isAuthenticated) {
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
    }
    setCurrentWeekOffset(0);
    setBookingSuccess(false);
    setBookingError('');
    // Reset contact mode and auth states
    setContactMode('choice');
    setAuthTab('login');
    setAuthEmail('');
    setAuthPassword('');
    setAuthFirstName('');
    setAuthLastName('');
    setAuthPhone('');
    setAuthBirthDate('');
    setAuthError('');
    setAuthSuccess('');
    onClose();
  };

  // Auth Helper Functions
  const translateError = (error: string): string => {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': tAuth('errors.invalidCredentials'),
      'Email not confirmed': tAuth('errors.emailNotConfirmed'),
      'User already registered': tAuth('errors.userExists'),
      'Password should be at least 6 characters': tAuth('errors.passwordTooShort'),
      'Unable to validate email address: invalid format': tAuth('errors.invalidEmail'),
    };
    return errorMap[error] || error;
  };

  const resetAuthForm = () => {
    setAuthError('');
    setAuthSuccess('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);

    const result = await signIn(authEmail, authPassword);

    if (result.error) {
      setAuthError(translateError(result.error));
      setAuthSubmitting(false);
    } else {
      setAuthSubmitting(false);
      // Nach Login: Daten werden automatisch durch den useEffect übernommen
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!authFirstName.trim()) {
      setAuthError(tAuth('errors.enterFirstName'));
      return;
    }
    if (!authLastName.trim()) {
      setAuthError(tAuth('errors.enterLastName'));
      return;
    }
    if (!authPhone.trim()) {
      setAuthError(tAuth('errors.enterPhone'));
      return;
    }
    if (!authBirthDate) {
      setAuthError(tAuth('errors.enterBirthDate'));
      return;
    }
    if (authPassword.length < 6) {
      setAuthError(tAuth('errors.passwordTooShort'));
      return;
    }

    setAuthSubmitting(true);

    const result = await signUp({
      email: authEmail,
      password: authPassword,
      firstName: authFirstName.trim(),
      lastName: authLastName.trim(),
      phone: authPhone.trim(),
      birthDate: authBirthDate,
    });

    if (result.error) {
      setAuthError(translateError(result.error));
      setAuthSubmitting(false);
    } else {
      setAuthSuccess(tAuth('registerSuccess'));
      setAuthSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!authEmail.trim()) {
      setAuthError(tAuth('errors.enterEmail'));
      return;
    }

    setAuthSubmitting(true);

    const result = await resetPassword(authEmail);

    if (result.error) {
      setAuthError(translateError(result.error));
    } else {
      setAuthSuccess(tAuth('resetLinkSent'));
    }
    setAuthSubmitting(false);
  };

  const handleBooking = async () => {
    if (!selectedDay || !selectedBarber || !selectedSlot || !selectedService || !customerName || !customerEmail || !customerPhone) {
      return;
    }

    setIsSubmitting(true);
    setBookingError('');

    const appointment = await createAppointment({
      barber_id: selectedBarber,
      date: selectedDay,
      time_slot: selectedSlot,
      service_id: selectedService,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      customer_id: isAuthenticated && customer ? customer.id : null,
      customer_email: customerEmail.trim(),
      status: 'confirmed',
      source: 'online',
      series_id: null,
    });

    setIsSubmitting(false);

    if (appointment) {
      // Füge den neuen Termin zur Liste hinzu, damit er sofort als gebucht gilt
      setBookedAppointments(prev => [...prev, appointment]);
      setBookingSuccess(true);

      // Bestätigungs-E-Mail senden (im Hintergrund, ohne auf Ergebnis zu warten)
      const barber = team.find(b => b.id === selectedBarber);
      const service = services.find(s => s.id === selectedService);
      const dayData = days.find(d => d.dateStr === selectedDay);

      if (barber && service && dayData) {
        sendBookingConfirmationEmail({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          barberName: barber.name,
          serviceName: service.name,
          date: `${dayData.dayNameLong}, ${dayData.dayNumFull}`,
          time: selectedSlot,
          duration: service.duration,
          price: formatPrice(service.price),
        }).catch(err => {
          console.error('Failed to send confirmation email:', err);
        });
      }
    } else {
      setBookingError(t('errors.bookingFailed'));
    }
  };

  useEffect(() => {
    setSelectedBarber(null);
    setSelectedSlot(null);
    setSelectedService(null);
  }, [selectedDay]);

  const isBarberUnlocked = selectedDay !== null;
  const isServiceUnlocked = selectedBarber !== null && selectedSlot !== null;
  const isContactUnlocked = selectedService !== null;

  const selectedServiceData = services.find(s => s.id === selectedService);
  const selectedBarberData = team.find(b => b.id === selectedBarber);
  const selectedDayData = days.find(d => d.dateStr === selectedDay);

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative bg-white w-full max-w-6xl rounded-lg p-8 flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-500">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{tCommon('loading')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white w-full mx-8 max-h-[85vh] rounded-lg overflow-y-auto">
        {/* Header - immer sichtbar */}
        <div className="border-b border-gray-100 px-4 py-2 flex items-center justify-between">
          <span className="text-sm font-light text-gold tracking-[0.2em] uppercase">{t('title')}</span>
          <button onClick={handleClose} className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Erfolgs-Meldung */}
        {bookingSuccess ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center px-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-light text-black mb-2">{t('success.title')}</h3>
              <p className="text-sm text-gray-500 mb-6">
                {t('success.message', { barber: selectedBarberData?.name || '', date: `${selectedDayData?.dayNameLong || ''}, ${selectedDayData?.dayNumFull || ''}`, time: selectedSlot || '' })}
              </p>
              <button
                onClick={handleClose}
                className="px-8 py-3 bg-black text-white text-xs font-light tracking-[0.15em] uppercase hover:bg-gold transition-all"
              >
                {tCommon('close')}
              </button>
            </div>
          </div>
        ) : (
          <>

        {/* Progress Steps */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: t('steps.day'), done: selectedDay !== null },
              { num: 2, label: t('steps.barber'), done: selectedBarber !== null },
              { num: 3, label: t('steps.time'), done: selectedSlot !== null },
              { num: 4, label: t('steps.service'), done: selectedService !== null },
              { num: 5, label: t('steps.contact'), done: customerName.length > 0 && customerEmail.length > 0 && customerPhone.length > 0 },
            ].map((step, index, arr) => {
              const isActive =
                (step.num === 1 && !selectedDay) ||
                (step.num === 2 && selectedDay && !selectedBarber) ||
                (step.num === 3 && selectedBarber && !selectedSlot) ||
                (step.num === 4 && selectedSlot && !selectedService) ||
                (step.num === 5 && selectedService && (!customerName || !customerEmail || !customerPhone));
              const isPast = step.done;

              return (
                <div key={step.num} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <span className={`text-xs font-medium mb-1 transition-colors ${
                      isActive ? 'text-gold' : isPast ? 'text-gold' : 'text-gray-400'
                    }`}>
                      {step.num}. {step.label}
                    </span>
                    <div className="w-full h-1 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isPast ? 'bg-gold w-full' : 'w-0'
                        }`}
                      />
                    </div>
                  </div>
                  {index < arr.length - 1 && <div className="w-4" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content - kompakter */}
        <div className="p-4 space-y-4">

          {/* Section 1: Day Selection */}
          <div className="relative">
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-[8px] text-gray-400">1.</span>
              <h3 className="text-[8px] text-gray-500">{t('steps.day')}</h3>

              {/* Wochen-Navigation */}
              <div className="flex items-center gap-2 ml-auto bg-gray-50 rounded-full px-1 py-0.5">
                <button
                  onClick={() => setCurrentWeekOffset(prev => Math.max(0, prev - 1))}
                  disabled={currentWeekOffset === 0}
                  className="p-1 hover:bg-white rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] font-medium text-gray-700 bg-white px-1.5 py-0.5 rounded">{t('week')} {weekNumber}</span>
                  <span className="text-[10px] text-gray-400">{weekRange}</span>
                </div>

                <button
                  onClick={() => setCurrentWeekOffset(prev => Math.min(maxWeeks - 1, prev + 1))}
                  disabled={currentWeekOffset >= maxWeeks - 1}
                  className="p-1 hover:bg-white rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {days.map((day) => (
                <button
                  key={day.dateStr}
                  onClick={() => !day.isDisabled && setSelectedDay(day.dateStr)}
                  disabled={day.isDisabled}
                  title={day.isClosed ? day.closedReason : undefined}
                  className={`relative py-2 px-3 border rounded-sm text-center transition-all hover:border-gold ${
                    selectedDay === day.dateStr
                      ? 'border-gold bg-gold/10'
                      : day.isDisabled
                        ? 'opacity-40 bg-gray-50 border-gray-200 cursor-not-allowed'
                        : 'border-gray-300'
                  }`}
                >
                  <span className={`block text-xs ${day.isDisabled ? 'text-gray-400' : 'text-black/60'}`}>
                    {day.dayNameShort}
                  </span>
                  <span className={`block text-xs font-medium ${day.isDisabled ? 'text-gray-400' : 'text-black'}`}>
                    {day.dayNum}
                  </span>
                  {day.isClosed && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-400 rounded-full" title={day.closedReason}></span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Friseur */}
          <div className={`relative transition-all duration-300 ${!isBarberUnlocked ? 'pointer-events-none' : ''}`}>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className={`text-[8px] transition-colors ${isBarberUnlocked ? 'text-gray-400' : 'text-gray-300'}`}>2.</span>
              <h3 className={`text-[8px] transition-colors ${isBarberUnlocked ? 'text-gray-500' : 'text-gray-400'}`}>
                {t('steps.barber')}
              </h3>
            </div>
            <div className="grid grid-cols-4 gap-2 w-full">
              {team.map((barber) => {
                // Prüfe ob Barber an diesem Tag im Urlaub ist
                const timeOff = selectedDay && staffTimeOff.find(
                  off => off.staff_id === barber.id &&
                         off.start_date <= selectedDay &&
                         off.end_date >= selectedDay
                );
                const isOnTimeOff = !!timeOff;

                const availableSlots = selectedDay && !isOnTimeOff
                  ? getAvailableSlots(barber.id, selectedDay, timeSlots, bookedAppointments, selectedDayData?.openSundayOpenTime, selectedDayData?.openSundayCloseTime)
                  : [];
                const isSelected = selectedBarber === barber.id;
                const isOtherSelected = selectedBarber !== null && !isSelected;
                const isFullyBooked = !!(selectedDay && !isOnTimeOff && availableSlots.length === 0);
                const isUnavailable = isOnTimeOff || isFullyBooked;

                return (
                  <button
                    key={barber.id}
                    onClick={() => { if (!isUnavailable) { setSelectedBarber(barber.id); setSelectedSlot(null); }}}
                    disabled={isUnavailable}
                    className={`relative aspect-square rounded-sm overflow-hidden transition-all border-2 ${
                      isSelected ? 'border-gold' :
                      isOtherSelected ? 'opacity-30 grayscale border-transparent' :
                      isUnavailable ? 'opacity-40 border-transparent' :
                      'border-gray-300 hover:border-gold'
                    }`}
                  >
                    <Image src={barber.image || '/team/placeholder.jpg'} alt={barber.name} fill className="object-cover"
                      style={{ objectPosition: barber.image_position, transform: `scale(${barber.image_scale})` }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <span className={`absolute bottom-2 inset-x-0 text-[10px] text-white text-center truncate px-1 ${isSelected ? 'font-medium' : ''}`}>{barber.name}</span>
                    {isOnTimeOff && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-[9px] text-white/80">{tStatus('absent')}</span>
                      </div>
                    )}
                    {isFullyBooked && !isOnTimeOff && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-[9px] text-white/80">{tStatus('fullyBooked')}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Zeit */}
          <div className={`relative transition-all duration-300 ${!selectedBarber ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className={`text-[8px] transition-colors ${selectedBarber ? 'text-gray-400' : 'text-gray-300'}`}>3.</span>
              <h3 className={`text-[8px] transition-colors ${selectedBarber ? 'text-gray-500' : 'text-gray-400'}`}>
                {t('steps.time')}
              </h3>
            </div>
            {selectedBarber ? (
              <div className="grid grid-cols-8 gap-2">
                {getAvailableSlots(selectedBarber, selectedDay!, timeSlots, bookedAppointments, selectedDayData?.openSundayOpenTime, selectedDayData?.openSundayCloseTime).map((slot) => (
                  <button key={slot} onClick={() => setSelectedSlot(slot)}
                    className={`text-[11px] py-2 px-3 border rounded-sm transition-all text-center hover:border-gold ${
                      selectedSlot === slot ? 'border-gold bg-gold/10 text-black' : 'border-gray-300 text-gray-700'
                    }`}>{slot}</button>
                ))}
              </div>
            ) : (
              <div className="text-[10px] text-gray-400 text-center py-4">{t('selectBarberFirst')}</div>
            )}
          </div>

          {/* Section 4: Service */}
          <div className={`relative transition-all duration-300 ${!isServiceUnlocked ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className={`text-[8px] transition-colors ${isServiceUnlocked ? 'text-gray-400' : 'text-gray-300'}`}>4.</span>
              <h3 className={`text-[8px] transition-colors ${isServiceUnlocked ? 'text-gray-500' : 'text-gray-400'}`}>
                {t('steps.service')}
              </h3>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
                  disabled={!isServiceUnlocked}
                  className={`py-2 px-3 border rounded-sm text-center transition-all hover:border-gold ${
                    selectedService === service.id ? 'border-gold bg-gold/10' : 'border-gray-300'
                  }`}
                >
                  <span className="block text-sm font-light text-black">{service.name}</span>
                  <span className="block text-xs font-medium text-gold">{formatPrice(service.price)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 5: Kontakt */}
          <div className={`relative transition-all duration-300 ${!isContactUnlocked ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className={`text-[8px] transition-colors ${isContactUnlocked ? 'text-gray-400' : 'text-gray-300'}`}>5.</span>
              <h3 className={`text-[8px] transition-colors ${isContactUnlocked ? 'text-gray-500' : 'text-gray-400'}`}>
                {t('contactData')}
              </h3>
              {isAuthenticated && (
                <span className="text-[8px] text-gold ml-2">{t('autoFilled')}</span>
              )}
            </div>

            {/* Eingeloggt: Daten anzeigen + Aktionen */}
            {isAuthenticated ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-sm px-3 py-2">
                  <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>{t('loggedInAs')} <span className="font-medium text-black">{customer?.name}</span></span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder={t('name')}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    disabled={!isContactUnlocked}
                    className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black focus:border-gold focus:outline-none disabled:bg-gray-50 placeholder:text-gray-400"
                  />
                  <input
                    type="email"
                    placeholder={t('email')}
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    disabled={!isContactUnlocked}
                    className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black focus:border-gold focus:outline-none disabled:bg-gray-50 placeholder:text-gray-400"
                  />
                  <input
                    type="tel"
                    placeholder={t('phone')}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    disabled={!isContactUnlocked}
                    className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black focus:border-gold focus:outline-none disabled:bg-gray-50 placeholder:text-gray-400"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomerPortal(true)}
                    className="flex-1 py-2 text-xs border border-gold/60 text-gold hover:bg-gold/10 rounded-sm transition-colors"
                  >
                    {t('myAppointments')}
                  </button>
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="flex-1 py-2 text-xs border border-gray-300 text-gray-500 hover:border-red-300 hover:text-red-500 rounded-sm transition-colors"
                  >
                    {tAuth('logout')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Nicht eingeloggt: Auswahl */}
                {contactMode === 'choice' && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setContactMode('guest')}
                      className="p-4 border border-gray-300 rounded-sm hover:border-gold transition-colors text-left group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="text-sm font-medium text-black">{t('bookAsGuest')}</span>
                      </div>
                      <p className="text-[10px] text-gray-400">{t('quickWithoutAccount')}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setContactMode('auth')}
                      className="p-4 border border-gray-300 rounded-sm hover:border-gold transition-colors text-left group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-sm font-medium text-black">{tAuth('login')}</span>
                      </div>
                      <p className="text-[10px] text-gray-400">{t('manageAppointments')}</p>
                    </button>
                  </div>
                )}

                {/* Gast-Formular */}
                {contactMode === 'guest' && (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setContactMode('choice')}
                      className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gold transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      {t('back')}
                    </button>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder={t('name')}
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        disabled={!isContactUnlocked}
                        className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black focus:border-gold focus:outline-none disabled:bg-gray-50 placeholder:text-gray-400"
                      />
                      <input
                        type="email"
                        placeholder={t('email')}
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        disabled={!isContactUnlocked}
                        className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black focus:border-gold focus:outline-none disabled:bg-gray-50 placeholder:text-gray-400"
                      />
                      <input
                        type="tel"
                        placeholder={t('phone')}
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        disabled={!isContactUnlocked}
                        className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black focus:border-gold focus:outline-none disabled:bg-gray-50 placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                )}

                {/* Auth-Formular */}
                {contactMode === 'auth' && (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => { setContactMode('choice'); resetAuthForm(); }}
                      className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gold transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      {t('back')}
                    </button>

                    {/* Tabs (nur für login/register) */}
                    {authTab !== 'forgot' && (
                      <div className="flex border-b border-gray-200">
                        <button
                          type="button"
                          onClick={() => { setAuthTab('login'); resetAuthForm(); }}
                          className={`flex-1 py-2 text-[10px] font-medium tracking-wide transition-colors ${
                            authTab === 'login'
                              ? 'text-gold border-b-2 border-gold'
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          {tAuth('login')}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAuthTab('register'); resetAuthForm(); }}
                          className={`flex-1 py-2 text-[10px] font-medium tracking-wide transition-colors ${
                            authTab === 'register'
                              ? 'text-gold border-b-2 border-gold'
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          {tAuth('register')}
                        </button>
                      </div>
                    )}

                    {/* Success Message */}
                    {authSuccess && (
                      <div className="flex items-center gap-2 text-green-700 text-[10px] bg-green-50 border border-green-200 rounded-sm px-3 py-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{authSuccess}</span>
                      </div>
                    )}

                    {/* Error Message */}
                    {authError && (
                      <div className="flex items-center gap-2 text-red-600 text-[10px] bg-red-50 border border-red-200 rounded-sm px-3 py-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{authError}</span>
                      </div>
                    )}

                    {/* Login Form */}
                    {authTab === 'login' && !authSuccess && (
                      <form onSubmit={handleLogin} className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="email"
                            value={authEmail}
                            onChange={(e) => setAuthEmail(e.target.value)}
                            placeholder={tAuth('email')}
                            className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors"
                            required
                          />
                          <input
                            type="password"
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            placeholder={tAuth('password')}
                            className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors"
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={authSubmitting}
                          className="w-full py-2 bg-black text-white text-[10px] font-light tracking-[0.15em] uppercase hover:bg-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {authSubmitting ? tAuth('loggingIn') : tAuth('login')}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAuthTab('forgot'); resetAuthForm(); }}
                          className="w-full text-[9px] text-gray-400 hover:text-gold transition-colors"
                        >
                          {tAuth('forgotPassword')}
                        </button>
                      </form>
                    )}

                    {/* Register Form */}
                    {authTab === 'register' && !authSuccess && (
                      <form onSubmit={handleRegister} className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={authFirstName}
                            onChange={(e) => setAuthFirstName(e.target.value)}
                            placeholder={tAuth('firstName')}
                            className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors"
                            required
                          />
                          <input
                            type="text"
                            value={authLastName}
                            onChange={(e) => setAuthLastName(e.target.value)}
                            placeholder={tAuth('lastName')}
                            className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors"
                            required
                          />
                          <input
                            type="date"
                            value={authBirthDate}
                            onChange={(e) => setAuthBirthDate(e.target.value)}
                            placeholder={tAuth('birthDate')}
                            className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="tel"
                            value={authPhone}
                            onChange={(e) => setAuthPhone(e.target.value)}
                            placeholder={tAuth('phone')}
                            className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors"
                            required
                          />
                          <input
                            type="email"
                            value={authEmail}
                            onChange={(e) => setAuthEmail(e.target.value)}
                            placeholder={tAuth('email')}
                            className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors"
                            required
                          />
                          <input
                            type="password"
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            placeholder={tAuth('passwordMinLength')}
                            className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors"
                            required
                            minLength={6}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={authSubmitting}
                          className="w-full py-2 bg-black text-white text-[10px] font-light tracking-[0.15em] uppercase hover:bg-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {authSubmitting ? tAuth('registering') : tAuth('register')}
                        </button>
                      </form>
                    )}

                    {/* Forgot Password Form */}
                    {authTab === 'forgot' && !authSuccess && (
                      <form onSubmit={handleForgotPassword} className="space-y-2">
                        <p className="text-[10px] text-gray-500">
                          {tAuth('resetDescription')}
                        </p>
                        <input
                          type="email"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          placeholder={tAuth('email')}
                          className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors"
                          required
                        />
                        <button
                          type="submit"
                          disabled={authSubmitting}
                          className="w-full py-2 bg-black text-white text-[10px] font-light tracking-[0.15em] uppercase hover:bg-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {authSubmitting ? tAuth('sendingLink') : tAuth('sendResetLink')}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAuthTab('login'); resetAuthForm(); }}
                          className="w-full text-[9px] text-gray-400 hover:text-gold transition-colors"
                        >
                          {tAuth('goToLogin')}
                        </button>
                      </form>
                    )}

                    {/* Back to Login after success */}
                    {authSuccess && authTab !== 'login' && (
                      <button
                        type="button"
                        onClick={() => { setAuthTab('login'); resetAuthForm(); }}
                        className="w-full py-2 bg-black text-white text-[10px] font-light tracking-[0.15em] uppercase hover:bg-gold transition-colors"
                      >
                        {tAuth('goToLogin')}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-2">
            {/* Fehler-Meldung */}
            {bookingError && (
              <div className="mb-2 flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{bookingError}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-600">
                {selectedServiceData && selectedBarberData && selectedDayData && selectedSlot ? (
                  <span>
                    <span className="text-gold">{selectedServiceData.name}</span> {t('at')}{' '}
                    <span className="text-gold">{selectedBarberData.name}</span> {t('on')}{' '}
                    <span className="text-gold">{selectedDayData.dayNameLong}, {selectedDayData.dayNumFull}</span> {t('atTime')}{' '}
                    <span className="text-gold">{selectedSlot} {tCommon('oclock')}</span>
                  </span>
                ) : (
                  <span>{t('fillAllFields')}</span>
                )}
              </div>
              <button
                onClick={handleBooking}
                disabled={!isContactUnlocked || !customerName || !customerEmail || !customerPhone || isSubmitting}
                className="px-5 py-2 bg-black text-white text-xs font-light tracking-[0.15em] uppercase hover:bg-gold transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-black flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{t('booking')}</span>
                  </>
                ) : (
                  <span>{t('bookAppointment')}</span>
                )}
              </button>
            </div>
          </div>
        </>
        )}
      </div>

      {/* Customer Portal Modal */}
      {showCustomerPortal && (
        <CustomerPortal onClose={() => setShowCustomerPortal(false)} />
      )}
    </div>
  );
}
