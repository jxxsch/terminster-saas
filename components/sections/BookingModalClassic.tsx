'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  isBarberFreeDay,
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
import { DatePicker } from '@/components/ui/DatePicker';
import { useRealtimeAppointments } from '@/hooks/useRealtimeAppointments';

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

interface PasswordSetupData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isRecovery?: boolean;
}

interface BookingModalClassicProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedBarber?: string;
  passwordSetupData?: PasswordSetupData | null;
}

// Kalenderwoche berechnen (ISO 8601)
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Generate week days (Mo-Sa, ohne Sonntag für mobile) for a given week offset
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
    dayNumFullDate: string;
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

  // Mo-Sa (6 Tage, ohne Sonntag)
  for (let i = 0; i < 6; i++) {
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
    const year = date.getFullYear();

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
      dayNumFullDate: `${day.toString().padStart(2, '0')}.${(month + 1).toString().padStart(2, '0')}.${year}`,
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

// Prüft ob ein Zeitslot am heutigen Tag bereits vergangen ist
function isSlotInPast(slot: string, dateStr: string): boolean {
  const today = new Date();
  const todayStr = formatDateLocal(today);

  // Nur am heutigen Tag prüfen
  if (dateStr !== todayStr) return false;

  // Slot-Zeit parsen (z.B. "14:30")
  const [slotHour, slotMinute] = slot.split(':').map(Number);
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Slot ist vergangen, wenn die Zeit vor der aktuellen Zeit liegt
  if (slotHour < currentHour) return true;
  if (slotHour === currentHour && slotMinute <= currentMinute) return true;

  return false;
}

// Filtere verfügbare Slots basierend auf bereits gebuchten Terminen, Öffnungszeiten UND vergangene Slots
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

  // Filtere gebuchte UND vergangene Slots heraus
  return filteredSlots.filter(slot =>
    !bookedSlots.includes(slot) && !isSlotInPast(slot, dateStr)
  );
}

// Hilfsfunktion: Zeit in Minuten umwandeln
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// Typ für Alternativen
interface SlotAlternative {
  type: 'nextDay' | 'otherBarber';
  barberId: string;
  barberName: string;
  barberImage?: string;
  date: string;
  dateDisplay: string;
  slot: string;
}

// Finde Alternativen wenn keine Slots verfügbar sind
function findAlternatives(
  currentBarberId: string,
  currentDateStr: string,
  preferredSlot: string | null,
  allSlots: string[],
  bookedAppointments: Appointment[],
  team: TeamMember[],
  staffTimeOff: StaffTimeOff[],
  closedDates: ClosedDate[],
  openSundays: OpenSunday[],
  bundesland: Bundesland,
  openHolidays: OpenHoliday[],
  maxWeeks: number
): SlotAlternative[] {
  const alternatives: SlotAlternative[] = [];
  const currentBarber = team.find(b => b.id === currentBarberId);
  if (!currentBarber) return alternatives;

  // Helper: Prüfe ob Tag buchbar ist
  const isDayBookable = (dateStr: string): boolean => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Vergangen?
    if (date < today) return false;

    // Sonntag (außer verkaufsoffen)?
    const isSunday = date.getDay() === 0;
    const isOpenSunday = openSundays.some(os => os.date === dateStr);
    if (isSunday && !isOpenSunday) return false;

    // Geschlossen?
    if (closedDates.some(cd => cd.date === dateStr)) return false;

    // Feiertag (ohne Sonderöffnung)?
    if (isHoliday(dateStr, bundesland) && !openHolidays.some(oh => oh.date === dateStr)) return false;

    // Max Buchungsdatum
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + maxWeeks * 7);
    if (date > maxDate) return false;

    return true;
  };

  // Helper: Prüfe ob Barber an Tag verfügbar ist
  const isBarberAvailable = (barberId: string, dateStr: string): boolean => {
    const barber = team.find(b => b.id === barberId);
    if (!barber) return false;

    // Ganztägiger Urlaub? (nur Einträge ohne start_time)
    const onTimeOff = staffTimeOff.some(
      off => off.staff_id === barberId && off.start_date <= dateStr && off.end_date >= dateStr && !off.start_time
    );
    if (onTimeOff) return false;

    // Freier Tag?
    if (isBarberFreeDay(barber, dateStr)) return false;

    return true;
  };

  // Alternative 1: Nächster buchbarer Tag (gleicher Barber)
  const today = new Date();
  for (let i = 1; i <= maxWeeks * 7; i++) {
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + i);
    const nextDateStr = formatDateLocal(nextDate);

    if (nextDateStr === currentDateStr) continue;
    if (!isDayBookable(nextDateStr)) continue;
    if (!isBarberAvailable(currentBarberId, nextDateStr)) continue;

    const availableSlots = getAvailableSlots(currentBarberId, nextDateStr, allSlots, bookedAppointments);
    if (availableSlots.length > 0) {
      // Finde besten Slot (ähnlich zur bevorzugten Zeit oder erster verfügbarer)
      let bestSlot = availableSlots[0];
      if (preferredSlot) {
        const preferredMinutes = timeToMinutes(preferredSlot);
        bestSlot = availableSlots.reduce((best, slot) => {
          const bestDiff = Math.abs(timeToMinutes(best) - preferredMinutes);
          const slotDiff = Math.abs(timeToMinutes(slot) - preferredMinutes);
          return slotDiff < bestDiff ? slot : best;
        }, availableSlots[0]);
      }

      alternatives.push({
        type: 'nextDay',
        barberId: currentBarberId,
        barberName: currentBarber.name,
        barberImage: currentBarber.image || undefined,
        date: nextDateStr,
        dateDisplay: `${String(nextDate.getDate()).padStart(2, '0')}.${String(nextDate.getMonth() + 1).padStart(2, '0')}.${nextDate.getFullYear()}`,
        slot: bestSlot,
      });
      break;
    }
  }

  // Alternative 2: Anderer Barber am gleichen Tag
  const currentDate = new Date(currentDateStr + 'T00:00:00');
  for (const barber of team) {
    if (barber.id === currentBarberId) continue;
    if (!isBarberAvailable(barber.id, currentDateStr)) continue;

    const availableSlots = getAvailableSlots(barber.id, currentDateStr, allSlots, bookedAppointments);
    if (availableSlots.length === 0) continue;

    // Nimm den ersten verfügbaren Slot
    alternatives.push({
      type: 'otherBarber',
      barberId: barber.id,
      barberName: barber.name,
      barberImage: barber.image || undefined,
      date: currentDateStr,
      dateDisplay: `${String(currentDate.getDate()).padStart(2, '0')}.${String(currentDate.getMonth() + 1).padStart(2, '0')}.${currentDate.getFullYear()}`,
      slot: availableSlots[0],
    });
    break;
  }

  return alternatives;
}

// Typ für Barber-Overlay Alternativen
interface BarberOverlayAlternatives {
  nextDay: { date: string; dateDisplay: string; slot: string; weekOffset: number } | null;
  otherBarber: { barberId: string; barberName: string; slot: string } | null;
}

// Finde Alternativen für einen ausgebuchten Barber (für Anzeige im Overlay)
function findBarberAlternatives(
  barberId: string,
  currentDateStr: string,
  allSlots: string[],
  bookedAppointments: Appointment[],
  team: TeamMember[],
  staffTimeOff: StaffTimeOff[],
  closedDates: ClosedDate[],
  openSundays: OpenSunday[],
  bundesland: Bundesland,
  openHolidays: OpenHoliday[],
  maxWeeks: number
): BarberOverlayAlternatives {
  const result: BarberOverlayAlternatives = { nextDay: null, otherBarber: null };
  const barber = team.find(b => b.id === barberId);
  if (!barber) return result;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateLocal(today);

  // Max Buchungsdatum
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + maxWeeks * 7);

  // Montag der aktuellen Woche berechnen (für weekOffset)
  const monday = new Date(today);
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setDate(today.getDate() + diffToMonday);

  // Helper: Prüfe ob Tag buchbar ist
  const isDayBookable = (dateStr: string): boolean => {
    const date = new Date(dateStr + 'T00:00:00');
    if (date < today || date > maxDate) return false;
    const isSunday = date.getDay() === 0;
    const isOpenSunday = openSundays.some(os => os.date === dateStr);
    if (isSunday && !isOpenSunday) return false;
    if (closedDates.some(cd => cd.date === dateStr)) return false;
    if (isHoliday(dateStr, bundesland) && !openHolidays.some(oh => oh.date === dateStr)) return false;
    return true;
  };

  // Helper: Prüfe ob Barber an Tag verfügbar ist
  const isBarberAvailableOnDay = (bId: string, dateStr: string): boolean => {
    const b = team.find(t => t.id === bId);
    if (!b) return false;
    const onTimeOff = staffTimeOff.some(
      off => off.staff_id === bId && off.start_date <= dateStr && off.end_date >= dateStr && !off.start_time
    );
    if (onTimeOff) return false;
    if (isBarberFreeDay(b, dateStr)) return false;
    return true;
  };

  // 1. Nächster freier Tag (gleicher Barber) - starte ab MORGEN (nicht heute, da wir ja auf dem aktuellen Tag sind)
  for (let i = 1; i <= maxWeeks * 7; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + i);
    const checkDateStr = formatDateLocal(checkDate);

    // Skip den aktuellen ausgewählten Tag (da dort ja ausgebucht)
    if (checkDateStr === currentDateStr) continue;

    if (!isDayBookable(checkDateStr)) continue;
    if (!isBarberAvailableOnDay(barberId, checkDateStr)) continue;

    const availableSlots = getAvailableSlots(barberId, checkDateStr, allSlots, bookedAppointments);
    if (availableSlots.length > 0) {
      // Berechne weekOffset
      const diffDays = Math.floor((checkDate.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24));
      const weekOffset = Math.floor(diffDays / 7);

      result.nextDay = {
        date: checkDateStr,
        dateDisplay: `${String(checkDate.getDate()).padStart(2, '0')}.${String(checkDate.getMonth() + 1).padStart(2, '0')}.${checkDate.getFullYear()}`,
        slot: availableSlots[0],
        weekOffset: Math.max(0, weekOffset),
      };
      break;
    }
  }

  // 2. Anderer Barber am gleichen Tag (currentDateStr)
  if (isDayBookable(currentDateStr)) {
    for (const otherBarber of team) {
      if (otherBarber.id === barberId) continue;
      if (!isBarberAvailableOnDay(otherBarber.id, currentDateStr)) continue;

      const availableSlots = getAvailableSlots(otherBarber.id, currentDateStr, allSlots, bookedAppointments);
      if (availableSlots.length > 0) {
        result.otherBarber = {
          barberId: otherBarber.id,
          barberName: otherBarber.name,
          slot: availableSlots[0],
        };
        break;
      }
    }
  }

  return result;
}

// Finde den nächsten freien Termin für einen Barber (für Anzeige im Overlay) - Legacy, wird noch verwendet
function findNextAvailableDate(
  barberId: string,
  currentDateStr: string,
  allSlots: string[],
  bookedAppointments: Appointment[],
  team: TeamMember[],
  staffTimeOff: StaffTimeOff[],
  closedDates: ClosedDate[],
  openSundays: OpenSunday[],
  bundesland: Bundesland,
  openHolidays: OpenHoliday[],
  maxWeeks: number
): { date: string; dateDisplay: string; slot: string } | null {
  const barber = team.find(b => b.id === barberId);
  if (!barber) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateLocal(today);

  // Max Buchungsdatum
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + maxWeeks * 7);

  for (let i = 0; i <= maxWeeks * 7; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + i);
    const checkDateStr = formatDateLocal(checkDate);

    // Skip aktuellen Tag wenn explizit angegeben
    if (checkDateStr === currentDateStr) continue;

    // Vergangen oder zu weit in der Zukunft?
    if (checkDate < today || checkDate > maxDate) continue;

    // Sonntag (außer verkaufsoffen)?
    const isSunday = checkDate.getDay() === 0;
    const isOpenSunday = openSundays.some(os => os.date === checkDateStr);
    if (isSunday && !isOpenSunday) continue;

    // Geschlossen?
    if (closedDates.some(cd => cd.date === checkDateStr)) continue;

    // Feiertag (ohne Sonderöffnung)?
    if (isHoliday(checkDateStr, bundesland) && !openHolidays.some(oh => oh.date === checkDateStr)) continue;

    // Barber im Urlaub? (ganztägig)
    const onTimeOff = staffTimeOff.some(
      off => off.staff_id === barberId && off.start_date <= checkDateStr && off.end_date >= checkDateStr && !off.start_time
    );
    if (onTimeOff) continue;

    // Freier Tag?
    if (isBarberFreeDay(barber, checkDateStr)) continue;

    // Verfügbare Slots?
    const availableSlots = getAvailableSlots(barberId, checkDateStr, allSlots, bookedAppointments);
    if (availableSlots.length > 0) {
      return {
        date: checkDateStr,
        dateDisplay: `${String(checkDate.getDate()).padStart(2, '0')}.${String(checkDate.getMonth() + 1).padStart(2, '0')}.${checkDate.getFullYear()}`,
        slot: availableSlots[0],
      };
    }
  }

  return null;
}

export function BookingModalClassic({ isOpen, onClose, preselectedBarber, passwordSetupData }: BookingModalClassicProps) {
  const t = useTranslations('booking');
  const tAuth = useTranslations('auth');
  const tCommon = useTranslations('common');
  const tStatus = useTranslations('status');

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
  const [loadError, setLoadError] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  // Ref um zu tracken, ob wir von den Alternativen kommen (dann soll der useEffect nicht resetten)
  const skipDayChangeReset = useRef(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookedAppointmentId, setBookedAppointmentId] = useState<string | null>(null);

  // Contact Mode States
  const [contactMode, setContactMode] = useState<'choice' | 'guest' | 'auth'>('choice');
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [showCustomerPortal, setShowCustomerPortal] = useState(false);
  const authFormRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll helper
  const scrollToTop = () => {
    setTimeout(() => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };
  const scrollToBottom = () => {
    setTimeout(() => contentRef.current?.scrollTo({ top: contentRef.current.scrollHeight, behavior: 'smooth' }), 50);
  };

  // Auth Form States
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authFirstName, setAuthFirstName] = useState('');
  const [authLastName, setAuthLastName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authBirthDate, setAuthBirthDate] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Mount state for portal
  useEffect(() => {
    setMounted(true);
  }, []);

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

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Ref to track if loading is in progress (prevents duplicate calls)
  const isLoadingRef = useRef(false);

  // Load data from Supabase with auto-retry
  const loadData = async (retryCount = 0): Promise<boolean> => {
    // Prevent duplicate calls
    if (isLoadingRef.current && retryCount === 0) {
      console.log('loadData already in progress, skipping...');
      return false;
    }

    const maxRetries = 3;
    const retryDelay = 1000; // 1 Sekunde zwischen Versuchen

    isLoadingRef.current = true;
    setIsLoading(true);
    setLoadError(false);

    try {
      const today = new Date();
      const startDate = formatDateLocal(today);
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
      isLoadingRef.current = false;
      return true;
    } catch (error) {
      console.error(`Fehler beim Laden (Versuch ${retryCount + 1}/${maxRetries}):`, error);

      if (retryCount < maxRetries - 1) {
        // Auto-Retry nach kurzer Verzögerung
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return loadData(retryCount + 1);
      } else {
        // Alle Versuche fehlgeschlagen
        setLoadError(true);
        setIsLoading(false);
        isLoadingRef.current = false;
        return false;
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Reset ref when modal opens to allow fresh load
      isLoadingRef.current = false;
      loadData();
    }
  }, [isOpen]);

  // Realtime-Callback: Termine neu laden wenn sich etwas ändert
  const refreshAppointments = useCallback(async () => {
    const today = new Date();
    const startDate = formatDateLocal(today);
    const endDate = formatDateLocal(new Date(today.getTime() + 12 * 7 * 24 * 60 * 60 * 1000));
    try {
      const appointmentsData = await getAppointments(startDate, endDate);
      setBookedAppointments(appointmentsData);

      // Wenn aktuell ausgewählter Slot jetzt gebucht ist, Auswahl aufheben
      if (selectedSlot && selectedBarber && selectedDay) {
        const isNowBooked = appointmentsData.some(
          apt => apt.barber_id === selectedBarber &&
                 apt.date === selectedDay &&
                 apt.time_slot === selectedSlot &&
                 apt.status === 'confirmed'
        );
        if (isNowBooked) {
          setSelectedSlot(null);
        }
      }
    } catch (error) {
      console.error('Error refreshing appointments:', error);
    }
  }, [selectedSlot, selectedBarber, selectedDay]);

  // Realtime-Subscription für Termine im BookingModal
  useRealtimeAppointments({
    onUpdate: refreshAppointments,
    enabled: isOpen && !isLoading,
  });

  // Wochen-Range für Header berechnen
  const weekRange = useMemo(() => {
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5); // Mo + 5 = Sa
    const startDay = monday.getDate();
    const endDay = saturday.getDate();
    const startMonth = MONTH_NAMES[monday.getMonth()];
    const endMonth = MONTH_NAMES[saturday.getMonth()];

    if (monday.getMonth() === saturday.getMonth()) {
      return `${startDay}. - ${endDay}. ${startMonth}`;
    }
    return `${startDay}. ${startMonth} - ${endDay}. ${endMonth}`;
  }, [monday]);

  const handleClose = () => {
    setSelectedDay(null);
    setSelectedBarber(null);
    setSelectedSlot(null);
    setSelectedService(null);
    if (!isAuthenticated) {
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
    }
    setCurrentWeekOffset(0);
    setBookingSuccess(false);
    setBookedAppointmentId(null);
    setBookingError('');
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
    // Reset loading state for next open
    setIsLoading(true);
    setLoadError(false);
    isLoadingRef.current = false;
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
    if (authPassword !== authConfirmPassword) {
      setAuthError(tAuth('errors.passwordMismatch'));
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

    const result = await createAppointment({
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
      is_pause: false,
    });

    setIsSubmitting(false);

    if (result.success && result.appointment) {
      setBookedAppointments(prev => [...prev, result.appointment!]);
      setBookedAppointmentId(result.appointment.id);
      setBookingSuccess(true);

      const barber = team.find(b => b.id === selectedBarber);
      const service = services.find(s => s.id === selectedService);

      if (barber && service && selectedDay && selectedSlot) {
        sendBookingConfirmationEmail({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          barberName: barber.name,
          barberImage: barber.image || undefined,
          imagePosition: barber.image_position || undefined,
          imageScale: barber.image_scale || undefined,
          serviceName: service.name,
          date: selectedDay,
          time: selectedSlot,
          duration: service.duration,
          price: formatPrice(service.price),
          appointmentId: result.appointment.id,
        }).catch(err => {
          console.error('Failed to send confirmation email:', err);
        });
      }
    } else if (result.error === 'conflict') {
      // Slot wurde inzwischen gebucht - Termine neu laden
      const today = new Date();
      const startDate = formatDateLocal(today);
      const endDate = formatDateLocal(new Date(today.getTime() + 12 * 7 * 24 * 60 * 60 * 1000));
      const freshAppointments = await getAppointments(startDate, endDate);
      setBookedAppointments(freshAppointments);
      setSelectedSlot(null);
      setBookingError(t('errors.slotUnavailable'));
    } else {
      setBookingError(t('errors.bookingFailed'));
    }
  };

  useEffect(() => {
    // Überspringe Reset wenn wir von den Alternativen kommen
    if (skipDayChangeReset.current) {
      skipDayChangeReset.current = false;
      return;
    }
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

  // Kalender-Dropdown State
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);

  // Kalender-Hilfsfunktionen
  const getCalendarData = () => {
    if (!selectedDay || !selectedSlot || !selectedServiceData || !selectedBarberData) return null;

    const [hour, minute] = selectedSlot.split(':').map(Number);
    const startDate = new Date(selectedDay + 'T00:00:00');
    startDate.setHours(hour, minute, 0, 0);

    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + (selectedServiceData.duration || 30));

    const title = `${selectedServiceData.name} bei ${selectedBarberData.name} - Beban Barbershop`;
    const location = 'Beban Barbershop, Friedrich-Ebert-Platz 3a, 51373 Leverkusen';
    const details = `Dein Termin im Beban Barbershop:\n${selectedServiceData.name} bei ${selectedBarberData.name}\n\nAdresse: ${location}`;

    return { startDate, endDate, title, location, details };
  };

  // Google Calendar
  const addToGoogleCalendar = () => {
    const data = getCalendarData();
    if (!data) return;

    const formatDate = (date: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
    };

    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.set('action', 'TEMPLATE');
    url.searchParams.set('text', data.title);
    url.searchParams.set('dates', `${formatDate(data.startDate)}/${formatDate(data.endDate)}`);
    url.searchParams.set('location', data.location);
    url.searchParams.set('details', data.details);

    window.open(url.toString(), '_blank');
    setShowCalendarOptions(false);
  };

  // Apple Calendar (ICS Download)
  const addToAppleCalendar = () => {
    const data = getCalendarData();
    if (!data) return;

    const formatICSDate = (date: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Beban Barbershop//Booking//DE',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${bookedAppointmentId || Date.now()}@terminster.com`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${formatICSDate(data.startDate)}`,
      `DTEND:${formatICSDate(data.endDate)}`,
      `SUMMARY:${data.title}`,
      `LOCATION:${data.location}`,
      `DESCRIPTION:${data.details.replace(/\n/g, '\\n')}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT1H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Terminerinnerung',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `beban-termin-${selectedDay}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowCalendarOptions(false);
  };

  // Outlook Calendar
  const addToOutlookCalendar = () => {
    const data = getCalendarData();
    if (!data) return;

    const formatOutlookDate = (date: Date) => date.toISOString();

    const url = new URL('https://outlook.live.com/calendar/0/action/compose');
    url.searchParams.set('rru', 'addevent');
    url.searchParams.set('subject', data.title);
    url.searchParams.set('startdt', formatOutlookDate(data.startDate));
    url.searchParams.set('enddt', formatOutlookDate(data.endDate));
    url.searchParams.set('location', data.location);
    url.searchParams.set('body', data.details);

    window.open(url.toString(), '_blank');
    setShowCalendarOptions(false);
  };

  // Inline Styles
  const styles = {
    overlay: {
      position: 'fixed' as const,
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    },
    backdrop: {
      position: 'absolute' as const,
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
    },
    modal: {
      position: 'relative' as const,
      zIndex: 10,
      backgroundColor: '#f8fafc',
      width: '100%',
      maxWidth: '52rem',
      maxHeight: '85vh',
      borderRadius: '1rem',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden',
      animation: 'modalFadeIn 0.2s ease-out',
    },
    header: {
      padding: '1rem 1.25rem',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#ffffff',
    },
    headerTitle: {
      fontSize: '0.75rem',
      fontWeight: 300,
      color: '#d4a853',
      letterSpacing: '0.2em',
      textTransform: 'uppercase' as const,
    },
    closeBtn: {
      padding: '0.375rem',
      color: '#64748b',
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: '0.5rem',
      cursor: 'pointer',
      transition: 'all 0.15s',
    },
    content: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '1rem 1.25rem',
    },
    section: {
      marginBottom: '1.25rem',
    },
    sectionHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.375rem',
      marginBottom: '0.75rem',
    },
    sectionNum: {
      fontSize: '0.625rem',
      color: '#94a3b8',
    },
    sectionTitle: {
      fontSize: '0.625rem',
      color: '#64748b',
      fontWeight: 500,
    },
    // Progress bar
    progressContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
      padding: '0.75rem 1.25rem',
      borderBottom: '1px solid #e2e8f0',
      backgroundColor: '#ffffff',
    },
    progressStep: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
    },
    progressLabel: {
      fontSize: '0.625rem',
      marginBottom: '0.25rem',
      fontWeight: 500,
    },
    progressBar: {
      width: '100%',
      height: '3px',
      borderRadius: '2px',
      backgroundColor: '#e2e8f0',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#d4a853',
      transition: 'width 0.3s',
    },
    // Days grid (6 columns)
    daysGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gap: '0.5rem',
    },
    dayBtn: {
      padding: '0.5rem 0.25rem',
      border: '1px solid #e2e8f0',
      borderRadius: '0.5rem',
      backgroundColor: '#ffffff',
      textAlign: 'center' as const,
      cursor: 'pointer',
      transition: 'all 0.15s',
      position: 'relative' as const,
    },
    dayBtnSelected: {
      borderColor: '#d4a853',
      backgroundColor: 'rgba(212, 168, 83, 0.1)',
    },
    dayBtnDisabled: {
      opacity: 0.4,
      backgroundColor: '#f1f5f9',
      cursor: 'not-allowed',
    },
    dayName: {
      display: 'block',
      fontSize: '0.6875rem',
      color: '#64748b',
    },
    dayNum: {
      display: 'block',
      fontSize: '0.75rem',
      fontWeight: 500,
      color: '#0f172a',
    },
    // Week nav
    weekNav: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginLeft: 'auto',
      backgroundColor: '#f1f5f9',
      borderRadius: '1rem',
      padding: '0.25rem',
    },
    weekNavBtn: {
      padding: '0.25rem',
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: '50%',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background-color 0.15s',
    },
    weekInfo: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      padding: '0 0.5rem',
      minWidth: '11rem',
    },
    weekLabel: {
      fontSize: '0.625rem',
      fontWeight: 500,
      color: '#374151',
      backgroundColor: '#ffffff',
      padding: '0.125rem 0.5rem',
      borderRadius: '0.25rem',
      whiteSpace: 'nowrap',
      minWidth: '2.75rem',
      textAlign: 'center' as const,
    },
    weekRange: {
      fontSize: '0.625rem',
      color: '#94a3b8',
      whiteSpace: 'nowrap',
      minWidth: '6rem',
      textAlign: 'center' as const,
    },
    // Barbers grid (4 columns on desktop, 2x2 on mobile via maxWidth)
    barbersGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '0.75rem',
    },
    barberBtn: {
      position: 'relative' as const,
      aspectRatio: '1',
      borderRadius: '0.5rem',
      overflow: 'hidden',
      border: '2px solid #e2e8f0',
      cursor: 'pointer',
      transition: 'all 0.15s',
    },
    barberBtnSelected: {
      borderColor: '#d4a853',
    },
    barberBtnOther: {
      opacity: 0.3,
      filter: 'grayscale(1)',
    },
    barberBtnDisabled: {
      opacity: 0.4,
    },
    barberOverlay: {
      position: 'absolute' as const,
      inset: 0,
      background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent 60%)',
    },
    barberName: {
      position: 'absolute' as const,
      bottom: '0.5rem',
      left: 0,
      right: 0,
      textAlign: 'center' as const,
      fontSize: '0.6875rem',
      color: '#ffffff',
      padding: '0 0.25rem',
    },
    barberStatus: {
      position: 'absolute' as const,
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    barberStatusText: {
      fontSize: '0.5625rem',
      color: 'rgba(255,255,255,0.8)',
    },
    // Time slots grid (5 columns)
    slotsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: '0.5rem',
    },
    slotBtn: {
      padding: '0.5rem 0.25rem',
      border: '1px solid #e2e8f0',
      borderRadius: '0.5rem',
      backgroundColor: '#ffffff',
      fontSize: '0.75rem',
      fontWeight: 500,
      color: '#374151',
      cursor: 'pointer',
      transition: 'all 0.15s',
      textAlign: 'center' as const,
    },
    slotBtnSelected: {
      borderColor: '#d4a853',
      backgroundColor: 'rgba(212, 168, 83, 0.1)',
      color: '#0f172a',
    },
    // Services grid (4 columns)
    servicesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '0.75rem',
    },
    serviceBtn: {
      padding: '0.5rem 0.25rem',
      border: '1px solid #e2e8f0',
      borderRadius: '0.5rem',
      backgroundColor: '#ffffff',
      textAlign: 'center' as const,
      cursor: 'pointer',
      transition: 'all 0.15s',
    },
    serviceBtnSelected: {
      borderColor: '#d4a853',
      backgroundColor: 'rgba(212, 168, 83, 0.1)',
    },
    serviceName: {
      display: 'block',
      fontSize: '0.8125rem',
      fontWeight: 300,
      color: '#0f172a',
    },
    servicePrice: {
      display: 'block',
      fontSize: '0.75rem',
      fontWeight: 500,
      color: '#d4a853',
    },
    // Contact
    input: {
      width: '100%',
      padding: '0.625rem',
      border: '1px solid #e2e8f0',
      borderRadius: '0.5rem',
      fontSize: '0.8125rem',
      fontWeight: 300,
      color: '#0f172a',
      backgroundColor: '#ffffff',
      outline: 'none',
      transition: 'border-color 0.15s',
    },
    inputGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '0.5rem',
    },
    inputGridTwo: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '0.5rem',
    },
    inputGridFull: {
      gridColumn: 'span 3',
    },
    // Footer
    footer: {
      padding: '0.75rem 1.25rem',
      borderTop: '1px solid #e2e8f0',
      backgroundColor: '#ffffff',
    },
    footerSummary: {
      fontSize: '0.6875rem',
      color: '#64748b',
      marginBottom: '0.5rem',
    },
    footerActions: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
    },
    submitBtn: {
      padding: '0.625rem 1.25rem',
      backgroundColor: '#0f172a',
      color: '#ffffff',
      border: 'none',
      borderRadius: '0.5rem',
      fontSize: '0.6875rem',
      fontWeight: 400,
      letterSpacing: '0.1em',
      textTransform: 'uppercase' as const,
      cursor: 'pointer',
      transition: 'background-color 0.15s',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    submitBtnDisabled: {
      opacity: 0.4,
      cursor: 'not-allowed',
    },
    // Choice buttons
    choiceGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '0.75rem',
    },
    choiceBtn: {
      padding: '1rem',
      border: '1px solid #e2e8f0',
      borderRadius: '0.5rem',
      backgroundColor: '#ffffff',
      textAlign: 'left' as const,
      cursor: 'pointer',
      transition: 'all 0.15s',
    },
    choiceBtnHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: '0.375rem',
    },
    choiceBtnTitle: {
      fontSize: '0.8125rem',
      fontWeight: 500,
      color: '#0f172a',
    },
    choiceBtnDesc: {
      fontSize: '0.625rem',
      color: '#94a3b8',
    },
    // Back button
    backBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
      fontSize: '0.625rem',
      color: '#94a3b8',
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      padding: '0',
      marginBottom: '0.75rem',
      transition: 'color 0.15s',
    },
    // Auth tabs
    authTabs: {
      display: 'flex',
      borderBottom: '1px solid #e2e8f0',
      marginBottom: '0.75rem',
    },
    authTab: {
      flex: 1,
      padding: '0.5rem',
      fontSize: '0.625rem',
      fontWeight: 500,
      backgroundColor: 'transparent',
      border: 'none',
      borderBottom: '2px solid transparent',
      cursor: 'pointer',
      transition: 'all 0.15s',
      color: '#94a3b8',
    },
    authTabActive: {
      color: '#d4a853',
      borderBottomColor: '#d4a853',
    },
    // Messages
    errorMsg: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem 0.75rem',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.2)',
      borderRadius: '0.5rem',
      fontSize: '0.625rem',
      color: '#dc2626',
      marginBottom: '0.5rem',
    },
    successMsg: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem 0.75rem',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      border: '1px solid rgba(34, 197, 94, 0.2)',
      borderRadius: '0.5rem',
      fontSize: '0.625rem',
      color: '#16a34a',
      marginBottom: '0.5rem',
    },
    // Success state
    successContainer: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2.5rem',
      textAlign: 'center' as const,
    },
    successIcon: {
      width: '4rem',
      height: '4rem',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '1rem',
    },
    successTitle: {
      fontSize: '1.125rem',
      fontWeight: 300,
      color: '#0f172a',
      marginBottom: '0.5rem',
    },
    successText: {
      fontSize: '0.8125rem',
      color: '#64748b',
      marginBottom: '1.5rem',
    },
    // Logged in info
    loggedInInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.625rem 0.75rem',
      backgroundColor: '#f1f5f9',
      borderRadius: '0.5rem',
      fontSize: '0.75rem',
      color: '#64748b',
      marginBottom: '0.75rem',
    },
    loggedInActions: {
      display: 'flex',
      gap: '0.5rem',
    },
    actionBtn: {
      flex: 1,
      padding: '0.5rem',
      fontSize: '0.6875rem',
      border: '1px solid #e2e8f0',
      borderRadius: '0.5rem',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      transition: 'all 0.15s',
    },
    // Disabled section
    disabledSection: {
      opacity: 0.4,
      pointerEvents: 'none' as const,
    },
    placeholder: {
      textAlign: 'center' as const,
      padding: '1rem',
      fontSize: '0.625rem',
      color: '#94a3b8',
    },
    gold: {
      color: '#d4a853',
    },
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <>
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div style={styles.overlay}>
        <div style={styles.backdrop} onClick={handleClose} />
        <div style={{
          ...styles.modal,
          ...(bookingSuccess ? { maxWidth: '400px' } : {})
        }} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div style={styles.header}>
            <span style={styles.headerTitle}>{t('title')}</span>
            <button style={styles.closeBtn} onClick={handleClose}>
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div style={{ ...styles.content, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#64748b' }}>
                <svg style={{ animation: 'spin 1s linear infinite', width: '1.25rem', height: '1.25rem' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span style={{ fontSize: '0.8125rem' }}>{tCommon('loading')}</span>
              </div>
            </div>
          ) : loadError ? (
            /* Error State - Verbindungsfehler */
            <div style={{ ...styles.content, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', gap: '1rem', textAlign: 'center', padding: '2rem' }}>
              <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" fill="none" stroke="#ef4444" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.25rem' }}>Verbindungsfehler</p>
                <p style={{ fontSize: '0.8125rem', color: '#6b7280' }}>Daten konnten nicht geladen werden</p>
              </div>
              <button
                onClick={() => loadData()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  backgroundColor: '#d4a853',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Erneut versuchen
              </button>
            </div>
          ) : bookingSuccess ? (
            /* Success State */
            <div style={styles.successContainer}>
              <div style={styles.successIcon}>
                <svg width="32" height="32" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 style={styles.successTitle}>{t('success.title')}</h3>
              <p style={styles.successText}>
                {t('success.message', { barber: selectedBarberData?.name || '', date: `${selectedDayData?.dayNameLong || ''}, ${selectedDayData?.dayNumFullDate || ''}`, time: selectedSlot || '' })}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', marginTop: '0.5rem' }}>
                {/* Kalender-Dropdown */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowCalendarOptions(!showCalendarOptions)}
                    style={{ ...styles.submitBtn, backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d4a853'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0f172a'}
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {t('success.addToCalendar')}
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginLeft: '0.25rem', transform: showCalendarOptions ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Kalender-Optionen Grid */}
                  {showCalendarOptions && (
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: 0,
                      right: 0,
                      marginBottom: '0.5rem',
                      backgroundColor: '#ffffff',
                      borderRadius: '1rem',
                      boxShadow: '0 -8px 30px rgba(0,0,0,0.12)',
                      padding: '0.75rem',
                      zIndex: 10,
                    }}>
                      {/* 3er Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.625rem', marginBottom: '0.625rem' }}>
                        {/* Google */}
                        <button
                          onClick={addToGoogleCalendar}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.625rem',
                            padding: '1rem 0.75rem',
                            backgroundColor: '#f8fafc',
                            border: 'none',
                            borderRadius: '0.875rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                            e.currentTarget.style.backgroundColor = '#ffffff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                          }}
                        >
                          <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #fff8f8 0%, #fff0f0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="22" height="22" viewBox="0 0 24 24">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <span style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b' }}>Google</span>
                            <small style={{ fontSize: '0.625rem', color: '#94a3b8' }}>Im Browser</small>
                          </div>
                        </button>

                        {/* Apple */}
                        <button
                          onClick={addToAppleCalendar}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.625rem',
                            padding: '1rem 0.75rem',
                            backgroundColor: '#f8fafc',
                            border: 'none',
                            borderRadius: '0.875rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                            e.currentTarget.style.backgroundColor = '#ffffff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                          }}
                        >
                          <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #f8f8f8 0%, #f0f0f0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="22" height="22" viewBox="0 0 24 24">
                              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83" fill="#333"/>
                              <path d="M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="#333"/>
                            </svg>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <span style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b' }}>Apple</span>
                            <small style={{ fontSize: '0.625rem', color: '#94a3b8' }}>Download</small>
                          </div>
                        </button>

                        {/* Outlook */}
                        <button
                          onClick={addToOutlookCalendar}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.625rem',
                            padding: '1rem 0.75rem',
                            backgroundColor: '#f8fafc',
                            border: 'none',
                            borderRadius: '0.875rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                            e.currentTarget.style.backgroundColor = '#ffffff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                          }}
                        >
                          <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f2ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="22" height="22" viewBox="0 0 24 24">
                              <path d="M24 7.387v10.478c0 .23-.08.424-.238.576-.158.154-.352.23-.58.23h-8.547v-6.959l1.6 1.229c.102.086.227.127.378.127.152 0 .277-.041.378-.127l6.77-5.197c.094-.07.17-.14.227-.213.056-.073.094-.153.113-.24h.047c-.014.065-.02.13-.02.196v-.1zm-.238-1.24c.115 0 .22.023.313.07l-7.577 5.822c-.227.18-.507.27-.84.27-.332 0-.612-.09-.84-.27l-7.577-5.821c.094-.047.199-.071.313-.071h16.208zm-9.055 6.885v5.64H.762c-.227 0-.42-.077-.576-.23-.158-.152-.238-.346-.238-.576V5.147c0-.23.08-.424.238-.576.156-.154.349-.23.576-.23h13.945v7.69z" fill="#0072C6"/>
                            </svg>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <span style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b' }}>Outlook</span>
                            <small style={{ fontSize: '0.625rem', color: '#94a3b8' }}>Im Browser</small>
                          </div>
                        </button>
                      </div>

                      {/* Download Button für andere Apps */}
                      <button
                        onClick={addToAppleCalendar}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          padding: '0.75rem',
                          backgroundColor: '#f8fafc',
                          border: '1px dashed #e2e8f0',
                          borderRadius: '0.75rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f1f5f9';
                          e.currentTarget.style.borderColor = '#d4a853';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                          e.currentTarget.style.borderColor = '#e2e8f0';
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                        </svg>
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>Andere Kalender-App (.ics)</span>
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleClose}
                  style={{ ...styles.submitBtn, backgroundColor: 'transparent', border: '1px solid #e2e8f0', color: '#64748b', justifyContent: 'center' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d4a853'; e.currentTarget.style.color = '#d4a853'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
                >
                  {tCommon('close')}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Progress Bar */}
              <div style={styles.progressContainer}>
                {[
                  { num: 1, label: t('steps.day'), done: selectedDay !== null },
                  { num: 2, label: t('steps.barber'), done: selectedBarber !== null },
                  { num: 3, label: t('steps.time'), done: selectedSlot !== null },
                  { num: 4, label: t('steps.service'), done: selectedService !== null },
                  { num: 5, label: t('steps.contact'), done: selectedService !== null && customerName.length > 0 && customerEmail.length > 0 && customerPhone.length > 0 },
                ].map((step) => {
                  const isActive =
                    (step.num === 1 && !selectedDay) ||
                    (step.num === 2 && selectedDay && !selectedBarber) ||
                    (step.num === 3 && selectedBarber && !selectedSlot) ||
                    (step.num === 4 && selectedSlot && !selectedService) ||
                    (step.num === 5 && selectedService && (!customerName || !customerEmail || !customerPhone));
                  const isPast = step.done;

                  return (
                    <div key={step.num} style={styles.progressStep}>
                      <span style={{
                        ...styles.progressLabel,
                        color: isActive || isPast ? '#d4a853' : '#94a3b8',
                      }}>
                        {step.num}
                      </span>
                      <div style={styles.progressBar}>
                        <div style={{
                          ...styles.progressFill,
                          width: isPast ? '100%' : '0%',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Content */}
              <div style={styles.content} ref={contentRef}>
                {/* Section 1: Day Selection */}
                <div style={styles.section}>
                  <div style={styles.sectionHeader}>
                    <span style={styles.sectionNum}>1.</span>
                    <span style={styles.sectionTitle}>{t('steps.day')}</span>
                    {/* Week Navigation */}
                    <div style={styles.weekNav}>
                      <button
                        style={{
                          ...styles.weekNavBtn,
                          opacity: currentWeekOffset === 0 ? 0.3 : 1,
                          cursor: currentWeekOffset === 0 ? 'not-allowed' : 'pointer',
                        }}
                        onClick={() => setCurrentWeekOffset(prev => Math.max(0, prev - 1))}
                        disabled={currentWeekOffset === 0}
                      >
                        <svg width="12" height="12" fill="none" stroke="#64748b" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <div style={styles.weekInfo}>
                        <span style={styles.weekLabel}>{t('week')} {weekNumber}</span>
                        <span style={styles.weekRange}>{weekRange}</span>
                      </div>
                      <button
                        style={{
                          ...styles.weekNavBtn,
                          opacity: currentWeekOffset >= maxWeeks - 1 ? 0.3 : 1,
                          cursor: currentWeekOffset >= maxWeeks - 1 ? 'not-allowed' : 'pointer',
                        }}
                        onClick={() => setCurrentWeekOffset(prev => Math.min(maxWeeks - 1, prev + 1))}
                        disabled={currentWeekOffset >= maxWeeks - 1}
                      >
                        <svg width="12" height="12" fill="none" stroke="#64748b" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div style={styles.daysGrid}>
                    {days.map((day) => (
                      <button
                        key={day.dateStr}
                        onClick={() => { if (!day.isDisabled) { setSelectedDay(day.dateStr); scrollToBottom(); } }}
                        disabled={day.isDisabled}
                        title={day.isClosed ? day.closedReason : undefined}
                        style={{
                          ...styles.dayBtn,
                          ...(selectedDay === day.dateStr ? styles.dayBtnSelected : {}),
                          ...(day.isDisabled ? styles.dayBtnDisabled : {}),
                          borderColor: selectedDay === day.dateStr ? '#d4a853' : '#e2e8f0',
                        }}
                        onMouseEnter={(e) => {
                          if (!day.isDisabled && selectedDay !== day.dateStr) {
                            e.currentTarget.style.borderColor = '#d4a853';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!day.isDisabled && selectedDay !== day.dateStr) {
                            e.currentTarget.style.borderColor = '#e2e8f0';
                          }
                        }}
                      >
                        <span style={{ ...styles.dayName, color: day.isDisabled ? '#94a3b8' : '#64748b' }}>
                          {day.dayNameShort}
                        </span>
                        <span style={{ ...styles.dayNum, color: day.isDisabled ? '#94a3b8' : '#0f172a' }}>
                          {day.dayNum}
                        </span>
                        {day.isClosed && (
                          <span style={{
                            position: 'absolute',
                            top: '-2px',
                            right: '-2px',
                            width: '6px',
                            height: '6px',
                            backgroundColor: '#f87171',
                            borderRadius: '50%',
                          }} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 2: Barber */}
                <div style={{ ...styles.section, ...(isBarberUnlocked ? {} : styles.disabledSection) }}>
                  <div style={styles.sectionHeader}>
                    <span style={{ ...styles.sectionNum, color: isBarberUnlocked ? '#94a3b8' : '#cbd5e1' }}>2.</span>
                    <span style={{ ...styles.sectionTitle, color: isBarberUnlocked ? '#64748b' : '#cbd5e1' }}>{t('steps.barber')}</span>
                  </div>
                  <div style={styles.barbersGrid}>
                    {team.map((barber) => {
                      const isSelected = selectedBarber === barber.id;
                      const isOtherSelected = selectedBarber !== null && !isSelected;

                      return (
                        <button
                          key={barber.id}
                          onClick={() => {
                            setSelectedBarber(barber.id);
                            setSelectedSlot(null);
                            scrollToBottom();
                          }}
                          style={{
                            ...styles.barberBtn,
                            ...(isSelected ? styles.barberBtnSelected : {}),
                            ...(isOtherSelected ? styles.barberBtnOther : {}),
                            borderColor: isSelected ? '#d4a853' : '#e2e8f0',
                          }}
                        >
                          {barber.image && (
                            <Image
                              src={barber.image}
                              alt=""
                              fill
                              style={{ objectFit: 'cover', filter: 'blur(8px)', transform: 'scale(1.1)' }}
                              aria-hidden="true"
                            />
                          )}
                          <Image
                            src={barber.image || '/team/placeholder.jpg'}
                            alt={barber.name}
                            fill
                            style={{
                              objectFit: 'contain',
                              transform: (() => { const m = (barber.image_position || '50% 50%').match(/(-?\d+)%\s+(-?\d+)%/); const x = m ? parseInt(m[1]) : 50; const y = m ? parseInt(m[2]) : 50; const s = barber.image_scale || 1; return `scale(${s}) translate(${(50 - x) * 0.5}%, ${(50 - y) * 0.5}%)`; })(),
                            }}
                          />
                          <div style={styles.barberOverlay} />
                          <span style={{ ...styles.barberName, fontWeight: isSelected ? 500 : 400 }}>{barber.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section 3: Time Slots */}
                <div style={{ ...styles.section, ...(selectedBarber ? {} : styles.disabledSection) }}>
                  <div style={styles.sectionHeader}>
                    <span style={{ ...styles.sectionNum, color: selectedBarber ? '#94a3b8' : '#cbd5e1' }}>3.</span>
                    <span style={{ ...styles.sectionTitle, color: selectedBarber ? '#64748b' : '#cbd5e1' }}>{t('steps.time')}</span>
                  </div>
                  {selectedBarber ? (() => {
                    // Prüfe ob Barber am ausgewählten Tag verfügbar ist (freier Tag / Urlaub)
                    const selectedBarberData2 = team.find(b => b.id === selectedBarber);
                    const barberUnavailable = selectedBarberData2 && selectedDay && (
                      isBarberFreeDay(selectedBarberData2, selectedDay) ||
                      staffTimeOff.some(off => off.staff_id === selectedBarber && off.start_date <= selectedDay && off.end_date >= selectedDay && !off.start_time)
                    );

                    // Partielle Blockierungen für Slot-Filter
                    const partialBlocks2 = selectedDay ? staffTimeOff.filter(off =>
                      off.staff_id === selectedBarber &&
                      off.start_date <= selectedDay &&
                      off.end_date >= selectedDay &&
                      off.start_time != null && off.end_time != null
                    ) : [];

                    const availableSlots = barberUnavailable ? [] : getAvailableSlots(
                      selectedBarber,
                      selectedDay!,
                      timeSlots,
                      bookedAppointments,
                      selectedDayData?.openSundayOpenTime,
                      selectedDayData?.openSundayCloseTime
                    ).filter(slot =>
                      !partialBlocks2.some(block => block.start_time && block.end_time && slot >= block.start_time && slot <= block.end_time)
                    );

                    // Wenn keine Slots verfügbar sind, zeige Alternativen
                    if (availableSlots.length === 0) {
                      const alternatives = findAlternatives(
                        selectedBarber,
                        selectedDay!,
                        selectedSlot,
                        timeSlots,
                        bookedAppointments,
                        team,
                        staffTimeOff,
                        closedDates,
                        openSundays,
                        bundesland,
                        openHolidays,
                        maxWeeks
                      );

                      return (
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>
                            {t('noSlotsAvailable')}
                          </p>
                          {alternatives.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                              {alternatives.map((alt, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    if (alt.type === 'nextDay') {
                                      // Berechne Wochen-Offset für das Datum
                                      const altDate = new Date(alt.date + 'T00:00:00');
                                      const today = new Date();
                                      today.setHours(0, 0, 0, 0);
                                      const monday = new Date(today);
                                      const dayOfWeek = today.getDay();
                                      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                                      monday.setDate(today.getDate() + diff);

                                      const diffDays = Math.floor((altDate.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24));
                                      const weekOffset = Math.floor(diffDays / 7);

                                      // Skip den Reset-useEffect da wir alles manuell setzen
                                      skipDayChangeReset.current = true;

                                      // Setze Tag, Barber UND Slot
                                      setCurrentWeekOffset(Math.max(0, weekOffset));
                                      setSelectedDay(alt.date);
                                      setSelectedBarber(alt.barberId);
                                      setSelectedSlot(alt.slot);
                                      scrollToBottom();
                                    } else {
                                      // Anderer Barber am gleichen Tag
                                      setSelectedBarber(alt.barberId);
                                      setSelectedSlot(alt.slot);
                                      scrollToBottom();
                                    }
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem 0.75rem',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '2rem',
                                    backgroundColor: '#ffffff',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    fontSize: '0.6875rem',
                                    color: '#374151',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#d4a853';
                                    e.currentTarget.style.backgroundColor = 'rgba(212, 168, 83, 0.1)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                    e.currentTarget.style.backgroundColor = '#ffffff';
                                  }}
                                >
                                  {/* Barber-Bild für beide Typen */}
                                  {alt.barberImage && (
                                    <div style={{
                                      width: '1.5rem',
                                      height: '1.5rem',
                                      borderRadius: '50%',
                                      overflow: 'hidden',
                                      position: 'relative',
                                      flexShrink: 0,
                                    }}>
                                      <Image
                                        src={alt.barberImage}
                                        alt={alt.barberName}
                                        fill
                                        style={{ objectFit: 'cover' }}
                                      />
                                    </div>
                                  )}
                                  <span>
                                    {alt.type === 'nextDay' ? (
                                      <>{alt.barberName} · {alt.dateDisplay} · {alt.slot}</>
                                    ) : (
                                      <>{alt.barberName} · {alt.dateDisplay} · {alt.slot}</>
                                    )}
                                  </span>
                                  <svg width="12" height="12" fill="none" stroke="#d4a853" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Normale Slot-Anzeige
                    return (
                      <div style={styles.slotsGrid}>
                        {availableSlots.map((slot) => (
                          <button
                            key={slot}
                            onClick={() => { setSelectedSlot(slot); scrollToBottom(); }}
                            style={{
                              ...styles.slotBtn,
                              ...(selectedSlot === slot ? styles.slotBtnSelected : {}),
                              borderColor: selectedSlot === slot ? '#d4a853' : '#e2e8f0',
                            }}
                            onMouseEnter={(e) => {
                              if (selectedSlot !== slot) {
                                e.currentTarget.style.borderColor = '#d4a853';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (selectedSlot !== slot) {
                                e.currentTarget.style.borderColor = '#e2e8f0';
                              }
                            }}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    );
                  })() : (
                    <div style={styles.placeholder}>{t('selectBarberFirst')}</div>
                  )}
                </div>

                {/* Section 4: Service */}
                <div style={{ ...styles.section, ...(isServiceUnlocked ? {} : styles.disabledSection) }}>
                  <div style={styles.sectionHeader}>
                    <span style={{ ...styles.sectionNum, color: isServiceUnlocked ? '#94a3b8' : '#cbd5e1' }}>4.</span>
                    <span style={{ ...styles.sectionTitle, color: isServiceUnlocked ? '#64748b' : '#cbd5e1' }}>{t('steps.service')}</span>
                  </div>
                  <div style={styles.servicesGrid}>
                    {services.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => { setSelectedService(service.id); scrollToBottom(); }}
                        disabled={!isServiceUnlocked}
                        style={{
                          ...styles.serviceBtn,
                          ...(selectedService === service.id ? styles.serviceBtnSelected : {}),
                          borderColor: selectedService === service.id ? '#d4a853' : '#e2e8f0',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedService !== service.id && isServiceUnlocked) {
                            e.currentTarget.style.borderColor = '#d4a853';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedService !== service.id && isServiceUnlocked) {
                            e.currentTarget.style.borderColor = '#e2e8f0';
                          }
                        }}
                      >
                        <span style={styles.serviceName}>{service.name}</span>
                        <span style={styles.servicePrice}>{formatPrice(service.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 5: Contact */}
                <div style={{ ...styles.section, ...(isContactUnlocked ? {} : styles.disabledSection), marginBottom: 0 }}>
                  <div style={styles.sectionHeader}>
                    <span style={{ ...styles.sectionNum, color: isContactUnlocked ? '#94a3b8' : '#cbd5e1' }}>5.</span>
                    <span style={{ ...styles.sectionTitle, color: isContactUnlocked ? '#64748b' : '#cbd5e1' }}>{t('contactData')}</span>
                    {isAuthenticated && (
                      <span style={{ fontSize: '0.5625rem', color: '#d4a853', marginLeft: '0.5rem' }}>{t('autoFilled')}</span>
                    )}
                  </div>

                  {/* Logged In */}
                  {isAuthenticated ? (
                    <div>
                      <div style={styles.loggedInInfo}>
                        <svg width="16" height="16" fill="none" stroke="#d4a853" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>{t('loggedInAs')} <span style={{ fontWeight: 500, color: '#0f172a' }}>{customer?.name}</span></span>
                      </div>
                      <div style={styles.inputGrid}>
                        <input
                          type="text"
                          placeholder={t('name')}
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          style={styles.input}
                        />
                        <input
                          type="email"
                          placeholder={t('email')}
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          style={styles.input}
                        />
                        <input
                          type="tel"
                          placeholder={t('phone')}
                          value={customerPhone}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^\d+\-\s]/g, '');
                            if (value.length <= 20) setCustomerPhone(value);
                          }}
                          style={styles.input}
                          maxLength={20}
                        />
                      </div>
                      <div style={{ ...styles.loggedInActions, marginTop: '0.75rem' }}>
                        <button
                          type="button"
                          onClick={() => setShowCustomerPortal(true)}
                          style={{ ...styles.actionBtn, borderColor: 'rgba(212, 168, 83, 0.6)', color: '#d4a853' }}
                        >
                          {t('myAppointments')}
                        </button>
                        <button
                          type="button"
                          onClick={() => signOut()}
                          style={{ ...styles.actionBtn, color: '#64748b' }}
                        >
                          {tAuth('logout')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Choice Mode */}
                      {contactMode === 'choice' && (
                        <div style={styles.choiceGrid}>
                          <button
                            type="button"
                            onClick={() => { setContactMode('guest'); scrollToBottom(); }}
                            style={styles.choiceBtn}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#d4a853'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                          >
                            <div style={styles.choiceBtnHeader}>
                              <svg width="18" height="18" fill="none" stroke="#94a3b8" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span style={styles.choiceBtnTitle}>{t('bookAsGuest')}</span>
                            </div>
                            <p style={styles.choiceBtnDesc}>{t('quickWithoutAccount')}</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setContactMode('auth'); scrollToBottom(); }}
                            style={styles.choiceBtn}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#d4a853'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                          >
                            <div style={styles.choiceBtnHeader}>
                              <svg width="18" height="18" fill="none" stroke="#94a3b8" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span style={styles.choiceBtnTitle}>{tAuth('login')}</span>
                            </div>
                            <p style={styles.choiceBtnDesc}>{t('manageAppointments')}</p>
                          </button>
                        </div>
                      )}

                      {/* Guest Mode */}
                      {contactMode === 'guest' && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setContactMode('choice')}
                            style={styles.backBtn}
                          >
                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            {t('back')}
                          </button>
                          <div style={styles.inputGrid}>
                            <input
                              type="text"
                              placeholder={t('name')}
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              style={styles.input}
                            />
                            <input
                              type="email"
                              placeholder={t('email')}
                              value={customerEmail}
                              onChange={(e) => setCustomerEmail(e.target.value)}
                              style={styles.input}
                            />
                            <input
                              type="tel"
                              placeholder={t('phone')}
                              value={customerPhone}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^\d+\-\s]/g, '');
                                if (value.length <= 20) setCustomerPhone(value);
                              }}
                              style={styles.input}
                              maxLength={20}
                            />
                          </div>
                        </div>
                      )}

                      {/* Auth Mode */}
                      {contactMode === 'auth' && (
                        <div>
                          <button
                            type="button"
                            onClick={() => { setContactMode('choice'); resetAuthForm(); }}
                            style={styles.backBtn}
                          >
                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            {t('back')}
                          </button>

                          {/* Auth Tabs */}
                          {authTab !== 'forgot' && (
                            <div style={styles.authTabs} ref={authFormRef}>
                              <button
                                type="button"
                                onClick={() => { setAuthTab('login'); resetAuthForm(); scrollToBottom(); }}
                                style={{ ...styles.authTab, ...(authTab === 'login' ? styles.authTabActive : {}) }}
                              >
                                {tAuth('login')}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAuthTab('register');
                                  resetAuthForm();
                                  setTimeout(() => authFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                                }}
                                style={{ ...styles.authTab, ...(authTab === 'register' ? styles.authTabActive : {}) }}
                              >
                                {tAuth('register')}
                              </button>
                            </div>
                          )}

                          {/* Success Message */}
                          {authSuccess && <div style={styles.successMsg}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>{authSuccess}</span>
                          </div>}

                          {/* Error Message */}
                          {authError && <div style={styles.errorMsg}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{authError}</span>
                          </div>}

                          {/* Login Form */}
                          {authTab === 'login' && !authSuccess && (
                            <form onSubmit={handleLogin}>
                              <div style={{ ...styles.inputGridTwo, marginBottom: '0.5rem' }}>
                                <input
                                  type="email"
                                  value={authEmail}
                                  onChange={(e) => setAuthEmail(e.target.value)}
                                  placeholder={tAuth('email')}
                                  style={styles.input}
                                  required
                                />
                                <input
                                  type="password"
                                  value={authPassword}
                                  onChange={(e) => setAuthPassword(e.target.value)}
                                  placeholder={tAuth('password')}
                                  style={styles.input}
                                  required
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={authSubmitting}
                                style={{
                                  ...styles.submitBtn,
                                  width: '100%',
                                  justifyContent: 'center',
                                  opacity: authSubmitting ? 0.5 : 1,
                                }}
                              >
                                {authSubmitting ? tAuth('loggingIn') : tAuth('login')}
                              </button>
                              <button
                                type="button"
                                onClick={() => { setAuthTab('forgot'); resetAuthForm(); }}
                                style={{ ...styles.backBtn, width: '100%', justifyContent: 'center', marginTop: '0.5rem', marginBottom: 0 }}
                              >
                                {tAuth('forgotPassword')}
                              </button>
                            </form>
                          )}

                          {/* Register Form */}
                          {authTab === 'register' && !authSuccess && (
                            <form onSubmit={handleRegister}>
                              {/* Zeile 1: Vorname, Nachname */}
                              <div style={{ ...styles.inputGridTwo, marginBottom: '0.5rem' }}>
                                <input
                                  type="text"
                                  value={authFirstName}
                                  onChange={(e) => setAuthFirstName(e.target.value)}
                                  placeholder={tAuth('firstName')}
                                  style={styles.input}
                                  required
                                />
                                <input
                                  type="text"
                                  value={authLastName}
                                  onChange={(e) => setAuthLastName(e.target.value)}
                                  placeholder={tAuth('lastName')}
                                  style={styles.input}
                                  required
                                />
                              </div>
                              {/* Zeile 2: Geburtsdatum, Telefon */}
                              <div style={{ ...styles.inputGridTwo, marginBottom: '0.5rem' }}>
                                <DatePicker
                                  value={authBirthDate}
                                  onChange={setAuthBirthDate}
                                  placeholder={tAuth('birthDate')}
                                  style={styles.input}
                                  required
                                  max={new Date().toISOString().split('T')[0]}
                                  min="1920-01-01"
                                />
                                <input
                                  type="tel"
                                  value={authPhone}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^\d+\-\s]/g, '');
                                    if (value.length <= 20) setAuthPhone(value);
                                  }}
                                  placeholder={tAuth('phone')}
                                  style={styles.input}
                                  required
                                  maxLength={20}
                                />
                              </div>
                              {/* Zeile 3: E-Mail, Passwort */}
                              <div style={{ ...styles.inputGridTwo, marginBottom: '0.5rem' }}>
                                <input
                                  type="email"
                                  value={authEmail}
                                  onChange={(e) => setAuthEmail(e.target.value)}
                                  placeholder={tAuth('email')}
                                  style={styles.input}
                                  required
                                />
                                <input
                                  type="password"
                                  value={authPassword}
                                  onChange={(e) => setAuthPassword(e.target.value)}
                                  placeholder={tAuth('passwordMinLength')}
                                  style={styles.input}
                                  required
                                  minLength={6}
                                />
                              </div>
                              {/* Zeile 4: Passwort bestätigen */}
                              <div style={{ marginBottom: '0.5rem' }}>
                                <input
                                  type="password"
                                  value={authConfirmPassword}
                                  onChange={(e) => setAuthConfirmPassword(e.target.value)}
                                  placeholder={tAuth('confirmPassword')}
                                  style={{ ...styles.input, width: '100%' }}
                                  required
                                  minLength={6}
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={authSubmitting}
                                style={{
                                  ...styles.submitBtn,
                                  width: '100%',
                                  justifyContent: 'center',
                                  opacity: authSubmitting ? 0.5 : 1,
                                }}
                              >
                                {authSubmitting ? tAuth('registering') : tAuth('register')}
                              </button>
                            </form>
                          )}

                          {/* Forgot Password Form */}
                          {authTab === 'forgot' && !authSuccess && (
                            <form onSubmit={handleForgotPassword}>
                              <p style={{ fontSize: '0.625rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                {tAuth('resetDescription')}
                              </p>
                              <input
                                type="email"
                                value={authEmail}
                                onChange={(e) => setAuthEmail(e.target.value)}
                                placeholder={tAuth('email')}
                                style={{ ...styles.input, marginBottom: '0.5rem' }}
                                required
                              />
                              <button
                                type="submit"
                                disabled={authSubmitting}
                                style={{
                                  ...styles.submitBtn,
                                  width: '100%',
                                  justifyContent: 'center',
                                  opacity: authSubmitting ? 0.5 : 1,
                                }}
                              >
                                {authSubmitting ? tAuth('sendingLink') : tAuth('sendResetLink')}
                              </button>
                              <button
                                type="button"
                                onClick={() => { setAuthTab('login'); resetAuthForm(); }}
                                style={{ ...styles.backBtn, width: '100%', justifyContent: 'center', marginTop: '0.5rem', marginBottom: 0 }}
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
                              style={{
                                ...styles.submitBtn,
                                width: '100%',
                                justifyContent: 'center',
                              }}
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
              <div style={styles.footer}>
                {bookingError && (
                  <div style={styles.errorMsg}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{bookingError}</span>
                  </div>
                )}
                <div style={styles.footerActions}>
                  <div style={styles.footerSummary}>
                    {selectedServiceData && selectedBarberData && selectedDayData && selectedSlot ? (
                      <span>
                        <span style={styles.gold}>{selectedServiceData.name}</span> {t('at')}{' '}
                        <span style={styles.gold}>{selectedBarberData.name}</span> {t('on')}{' '}
                        <span style={styles.gold}>{selectedDayData.dayNameLong}, {selectedDayData.dayNumFullDate}</span> {t('atTime')}{' '}
                        <span style={styles.gold}>{selectedSlot} {tCommon('oclock')}</span>
                      </span>
                    ) : (
                      <span>{t('fillAllFields')}</span>
                    )}
                  </div>
                  <button
                    onClick={handleBooking}
                    disabled={!isContactUnlocked || !customerName || !customerEmail || !customerPhone || isSubmitting}
                    style={{
                      ...styles.submitBtn,
                      ...(!isContactUnlocked || !customerName || !customerEmail || !customerPhone || isSubmitting ? styles.submitBtnDisabled : {}),
                    }}
                    onMouseEnter={(e) => {
                      if (isContactUnlocked && customerName && customerEmail && customerPhone && !isSubmitting) {
                        e.currentTarget.style.backgroundColor = '#d4a853';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#0f172a';
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <svg style={{ animation: 'spin 1s linear infinite', width: '1rem', height: '1rem' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
      </div>

      {/* Customer Portal Modal */}
      {showCustomerPortal && (
        <CustomerPortal onClose={() => setShowCustomerPortal(false)} />
      )}
    </>
  );

  return createPortal(modalContent, document.body);
}
