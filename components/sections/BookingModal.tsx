'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  getTeam,
  getTimeSlotsArray,
  getAppointments,
  createAppointment,
  resetPassword,
  setNewPassword,
  getClosedDates,
  getOpenSundays,
  getOpenSundayStaff,
  getStaffTimeOffForDateRange,
  getOpenHolidays,
  getSetting,
  isBarberFreeDay,
  getStaffWorkingHours,
  getFreeDayExceptions,
  getOpeningHours,
  TeamMember,
  Appointment,
  ClosedDate,
  OpenSunday,
  OpenSundayStaff,
  OpenHoliday,
  StaffTimeOff,
  StaffWorkingHours,
  FreeDayException,
  OpeningHours
} from '@/lib/supabase';
import { sendBookingConfirmationEmail } from '@/lib/email-client';
import { useAuth } from '@/context/AuthContext';
import { CustomerPortal } from '@/components/sections/CustomerPortal';
import { Bundesland, isHoliday, getHolidayName } from '@/lib/holidays';
import { DatePicker } from '@/components/ui/DatePicker';
import { useRealtimeAppointments } from '@/hooks/useRealtimeAppointments';

const DAY_NAMES_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const DAY_NAMES_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

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
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedBarber?: string;
  passwordSetupData?: PasswordSetupData | null;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

interface DayInfo {
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
}

function getWeekDays(
  weekOffset: number,
  closedDatesList: ClosedDate[] = [],
  openSundaysList: OpenSunday[] = [],
  bundesland: Bundesland = 'NW',
  openHolidaysList: OpenHoliday[] = [],
  maxWeeks: number = 4
): { days: DayInfo[]; weekNumber: number; monday: Date } {
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isSaturday = now.getDay() === 6;
  const isSunday = now.getDay() === 0;
  const isAfter18 = now.getHours() >= 18;
  const autoWeekOffset = (isSunday || (isSaturday && isAfter18)) ? 1 : 0;

  const maxBookingDate = new Date(today);
  maxBookingDate.setDate(today.getDate() + maxWeeks * 7);

  const monday = new Date(today);
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setDate(today.getDate() + diff + ((weekOffset + autoWeekOffset) * 7));

  const days: DayInfo[] = [];

  // 7 Tage durchgehen (Mo-So), aber Sonntag nur anzeigen wenn verkaufsoffen
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);

    const dateStr = formatDateLocal(date);
    const isPast = date < today;
    const isActuallySunday = date.getDay() === 0;
    const openSundayData = isActuallySunday ? openSundaysList.find(os => os.date === dateStr) : undefined;
    const isOpenSunday = !!openSundayData;

    // Sonntag nur anzeigen, wenn er verkaufsoffen ist
    if (isActuallySunday && !isOpenSunday) {
      continue; // Normalen Sonntag überspringen
    }

    const isTooFarInFuture = date > maxBookingDate;
    const isToday = date.toDateString() === new Date().toDateString();
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();

    const closedDate = closedDatesList.find(cd => cd.date === dateStr);
    const isManualClosed = !!closedDate;
    const holidayName = isHoliday(dateStr, bundesland) ? getHolidayName(dateStr, bundesland) : null;
    const isHolidayOpen = openHolidaysList.some(oh => oh.date === dateStr);
    const isHolidayClosed = !!holidayName && !isHolidayOpen;
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
      isSunday: false, // Wird nur noch angezeigt wenn verkaufsoffen
      isOpenSunday,
      openSundayOpenTime: openSundayData?.open_time?.slice(0, 5),
      openSundayCloseTime: openSundayData?.close_time?.slice(0, 5),
      isTooFarInFuture,
      isClosed,
      closedReason,
      isDisabled: isPast || isTooFarInFuture || isClosed,
    });
  }

  return { days, weekNumber: getWeekNumber(monday), monday };
}

function isSlotInPast(slot: string, dateStr: string): boolean {
  const today = new Date();
  const todayStr = formatDateLocal(today);
  if (dateStr !== todayStr) return false;

  const [slotHour, slotMinute] = slot.split(':').map(Number);
  const currentHour = today.getHours();
  const currentMinute = today.getMinutes();

  if (slotHour < currentHour) return true;
  if (slotHour === currentHour && slotMinute <= currentMinute) return true;
  return false;
}

function getAvailableSlots(
  barberId: string,
  dateStr: string,
  allSlots: string[],
  bookedAppointments: Appointment[],
  openTime?: string,
  closeTime?: string
): string[] {
  const bookedSlots = bookedAppointments
    .filter(apt => apt.barber_id === barberId && apt.date === dateStr)
    .map(apt => apt.time_slot);

  let filteredSlots = allSlots.filter(slot => !bookedSlots.includes(slot));
  filteredSlots = filteredSlots.filter(slot => !isSlotInPast(slot, dateStr));

  if (openTime && closeTime) {
    filteredSlots = filteredSlots.filter(slot => slot >= openTime && slot < closeTime);
  }

  return filteredSlots;
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  modal: {
    width: '100%',
    maxWidth: '1100px',
    maxHeight: '90vh',
    backgroundColor: '#ffffff',
    borderRadius: '1.5rem',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  header: {
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#d4a853',
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
  },
  closeBtn: {
    width: '2rem',
    height: '2rem',
    borderRadius: '0.5rem',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
    transition: 'all 0.15s',
  },
  progressContainer: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    borderBottom: '1px solid #f1f5f9',
    flexShrink: 0,
  },
  progressStep: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
  },
  progressLabel: {
    fontSize: '0.625rem',
    fontWeight: 500,
    transition: 'color 0.2s',
  },
  progressBar: {
    width: '100%',
    height: '2px',
    backgroundColor: '#e2e8f0',
    borderRadius: '1px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#d4a853',
    transition: 'width 0.3s ease',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem 1.5rem',
  },
  section: {
    marginBottom: '1.5rem',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem',
  },
  sectionNum: {
    fontSize: '0.625rem',
    color: '#94a3b8',
    fontWeight: 500,
  },
  sectionTitle: {
    fontSize: '0.6875rem',
    color: '#64748b',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  barbersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0.75rem',
  },
  barberBtn: {
    position: 'relative',
    aspectRatio: '1',
    borderRadius: '0.75rem',
    overflow: 'hidden',
    border: '2px solid #e2e8f0',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: 'transparent',
    padding: 0,
  },
  barberBtnSelected: {
    border: '2px solid #d4a853',
    boxShadow: '0 0 0 2px rgba(212, 168, 83, 0.2)',
  },
  barberBtnOther: {
    opacity: 0.5,
  },
  barberOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)',
  },
  barberName: {
    position: 'absolute',
    bottom: '0.5rem',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#ffffff',
    fontSize: '0.6875rem',
    fontWeight: 400,
  },
  weekNav: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginLeft: 'auto',
  },
  weekNavBtn: {
    width: '1.5rem',
    height: '1.5rem',
    borderRadius: '0.375rem',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
  },
  weekInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '80px',
  },
  weekLabel: {
    fontSize: '0.625rem',
    fontWeight: 600,
    color: '#0f172a',
  },
  weekRange: {
    fontSize: '0.5625rem',
    color: '#64748b',
  },
  weekDaysContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
    gap: '0.5rem',
  },
  dayCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '0.75rem',
    padding: '0.5rem',
    border: '1px solid #e2e8f0',
    minWidth: 0,
  },
  dayCardDisabled: {
    opacity: 0.5,
    backgroundColor: '#f1f5f9',
  },
  dayCardHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  dayCardTitle: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: '#0f172a',
  },
  dayCardDate: {
    fontSize: '0.5625rem',
    color: '#64748b',
  },
  slotsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.25rem',
  },
  slotBtn: {
    padding: '0.375rem 0.25rem',
    borderRadius: '0.375rem',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    fontSize: '0.625rem',
    fontWeight: 500,
    color: '#0f172a',
    cursor: 'pointer',
    transition: 'all 0.15s',
    textAlign: 'center',
  },
  slotBtnSelected: {
    border: '1px solid #d4a853',
    backgroundColor: '#d4a853',
    color: '#ffffff',
  },
  expandBtn: {
    width: '100%',
    padding: '0.25rem',
    marginTop: '0.25rem',
    borderRadius: '0.375rem',
    border: 'none',
    backgroundColor: '#f1f5f9',
    fontSize: '0.5625rem',
    color: '#64748b',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.125rem',
    transition: 'all 0.15s',
  },
  noSlotsMsg: {
    fontSize: '0.5625rem',
    color: '#94a3b8',
    textAlign: 'center',
    padding: '0.375rem',
  },
  disabledSection: {
    opacity: 0.4,
    pointerEvents: 'none',
  },
  placeholder: {
    fontSize: '0.625rem',
    color: '#94a3b8',
    textAlign: 'center',
    padding: '1rem',
  },
  choiceGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
  },
  choiceBtn: {
    padding: '1rem',
    borderRadius: '0.75rem',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s',
  },
  choiceBtnHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.25rem',
  },
  choiceBtnTitle: {
    fontSize: '0.6875rem',
    fontWeight: 500,
    color: '#0f172a',
  },
  choiceBtnDesc: {
    fontSize: '0.5625rem',
    color: '#64748b',
    margin: 0,
  },
  inputGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
  },
  inputGridTwo: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.5rem',
  },
  input: {
    padding: '0.625rem 0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid #e2e8f0',
    fontSize: '0.6875rem',
    color: '#0f172a',
    backgroundColor: '#ffffff',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.375rem 0',
    marginBottom: '0.5rem',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '0.625rem',
    color: '#64748b',
    cursor: 'pointer',
  },
  loggedInInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    backgroundColor: 'rgba(212, 168, 83, 0.1)',
    borderRadius: '0.5rem',
    marginBottom: '0.75rem',
    fontSize: '0.625rem',
    color: '#64748b',
  },
  loggedInActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  actionBtn: {
    flex: 1,
    padding: '0.5rem',
    borderRadius: '0.5rem',
    border: '1px solid #e2e8f0',
    backgroundColor: 'transparent',
    fontSize: '0.5625rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  authTabs: {
    display: 'flex',
    gap: '0.25rem',
    marginBottom: '0.75rem',
  },
  authTab: {
    flex: 1,
    padding: '0.5rem',
    borderRadius: '0.5rem',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '0.625rem',
    fontWeight: 500,
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  authTabActive: {
    backgroundColor: '#f1f5f9',
    color: '#0f172a',
  },
  errorMsg: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: '0.5rem',
    marginBottom: '0.5rem',
    fontSize: '0.625rem',
    color: '#ef4444',
  },
  successMsg: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: '0.5rem',
    marginBottom: '0.5rem',
    fontSize: '0.625rem',
    color: '#22c55e',
  },
  footer: {
    padding: '1rem 1.5rem',
    borderTop: '1px solid #f1f5f9',
    flexShrink: 0,
  },
  footerActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
  },
  footerSummary: {
    flex: 1,
    fontSize: '0.625rem',
    color: '#64748b',
  },
  gold: {
    color: '#d4a853',
    fontWeight: 500,
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.5rem',
    border: 'none',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontSize: '0.6875rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  },
  submitBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  successContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 1.5rem',
    textAlign: 'center',
    flex: 1,
  },
  successIcon: {
    width: '4rem',
    height: '4rem',
    borderRadius: '50%',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
  },
  successTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '0.5rem',
  },
  successText: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginBottom: '1.5rem',
  },
};

export function BookingModal({ isOpen, onClose, preselectedBarber, passwordSetupData }: BookingModalProps) {
  const t = useTranslations('booking');
  const tAuth = useTranslations('auth');
  const tCommon = useTranslations('common');

  const { customer, isAuthenticated, signIn, signUp, signOut } = useAuth();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [bookedAppointments, setBookedAppointments] = useState<Appointment[]>([]);
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [openSundays, setOpenSundays] = useState<OpenSunday[]>([]);
  const [openSundayStaff, setOpenSundayStaff] = useState<OpenSundayStaff[]>([]);
  const [openHolidays, setOpenHolidays] = useState<OpenHoliday[]>([]);
  const [bundesland, setBundesland] = useState<Bundesland>('NW');
  const [maxWeeks, setMaxWeeks] = useState(4);
  const [staffTimeOff, setStaffTimeOff] = useState<StaffTimeOff[]>([]);
  const [staffWorkingHours, setStaffWorkingHours] = useState<StaffWorkingHours[]>([]);
  const [freeDayExceptions, setFreeDayExceptions] = useState<FreeDayException[]>([]);
  const [openingHours, setOpeningHours] = useState<OpeningHours[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const [contactMode, setContactMode] = useState<'choice' | 'guest' | 'auth'>('choice');
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'forgot' | 'password-setup'>('login');
  const [showCustomerPortal, setShowCustomerPortal] = useState(false);
  const [isPasswordSetupMode, setIsPasswordSetupMode] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated && customer) {
      setCustomerName(customer.name);
      setCustomerEmail(customer.email);
      setCustomerPhone(customer.phone || '');
    }
  }, [isAuthenticated, customer]);

  // Password Setup Mode: Vorausfüllen der Daten wenn von Einladungslink kommend
  useEffect(() => {
    if (passwordSetupData && isOpen) {
      setIsPasswordSetupMode(true);
      setContactMode('auth');
      setAuthTab('password-setup');
      setAuthFirstName(passwordSetupData.firstName);
      setAuthLastName(passwordSetupData.lastName);
      setAuthEmail(passwordSetupData.email);
      setAuthPhone(passwordSetupData.phone || '');
    }
  }, [passwordSetupData, isOpen]);

  const { days, weekNumber } = useMemo(
    () => getWeekDays(currentWeekOffset, closedDates, openSundays, bundesland, openHolidays, maxWeeks),
    [currentWeekOffset, closedDates, openSundays, bundesland, openHolidays, maxWeeks]
  );

  const weekRange = useMemo(() => {
    if (days.length === 0) return '';
    const first = days[0];
    const last = days[days.length - 1];
    return `${first.date.getDate()}. - ${last.date.getDate()}. ${MONTH_NAMES[last.date.getMonth()]}`;
  }, [days]);

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

  const isLoadingRef = useRef(false);

  const loadData = async (retryCount = 0): Promise<boolean> => {
    if (isLoadingRef.current && retryCount === 0) return false;

    const maxRetries = 3;
    isLoadingRef.current = true;
    setIsLoading(true);
    setLoadError(false);

    try {
      const today = new Date();
      const startDate = formatDateLocal(today);
      const endDate = formatDateLocal(new Date(today.getTime() + 12 * 7 * 24 * 60 * 60 * 1000));

      const [teamData, timeSlotsData, appointmentsData, closedDatesData, openSundaysData, openSundayStaffData, openHolidaysData, bundeslandData, advanceWeeksData, staffTimeOffData, workingHoursData, exceptionsData, openingHoursData] = await Promise.all([
        getTeam(),
        getTimeSlotsArray(),
        getAppointments(startDate, endDate),
        getClosedDates(),
        getOpenSundays(),
        getOpenSundayStaff(),
        getOpenHolidays(),
        getSetting<Bundesland>('bundesland'),
        getSetting<{ value: number }>('booking_advance_weeks'),
        getStaffTimeOffForDateRange(startDate, endDate),
        getStaffWorkingHours(),
        getFreeDayExceptions(),
        getOpeningHours(),
      ]);

      setTeam(teamData);
      setTimeSlots(timeSlotsData);
      setBookedAppointments(appointmentsData);
      setClosedDates(closedDatesData);
      setOpenSundays(openSundaysData);
      setOpenSundayStaff(openSundayStaffData);
      setOpenHolidays(openHolidaysData);
      if (bundeslandData) setBundesland(bundeslandData);
      if (advanceWeeksData?.value) setMaxWeeks(advanceWeeksData.value);
      setStaffTimeOff(staffTimeOffData);
      setStaffWorkingHours(workingHoursData);
      setFreeDayExceptions(exceptionsData);
      setOpeningHours(openingHoursData);
      setIsLoading(false);
      isLoadingRef.current = false;

      if (preselectedBarber && teamData.some(b => b.id === preselectedBarber)) {
        setSelectedBarber(preselectedBarber);
      }

      return true;
    } catch (error) {
      console.error(`Fehler beim Laden (Versuch ${retryCount + 1}/${maxRetries}):`, error);
      if (retryCount < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return loadData(retryCount + 1);
      } else {
        setLoadError(true);
        setIsLoading(false);
        isLoadingRef.current = false;
        return false;
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      isLoadingRef.current = false;
      loadData();
    }
  }, [isOpen]);

  const refreshAppointments = useCallback(async () => {
    const today = new Date();
    const startDate = formatDateLocal(today);
    const endDate = formatDateLocal(new Date(today.getTime() + 12 * 7 * 24 * 60 * 60 * 1000));
    try {
      const appointmentsData = await getAppointments(startDate, endDate);
      setBookedAppointments(appointmentsData);

      if (selectedSlot && selectedBarber && selectedDay) {
        const isNowBooked = appointmentsData.some(
          apt => apt.barber_id === selectedBarber && apt.date === selectedDay && apt.time_slot === selectedSlot && apt.status === 'confirmed'
        );
        if (isNowBooked) {
          setSelectedSlot(null);
          setSelectedDay(null);
        }
      }
    } catch (error) {
      console.error('Error refreshing appointments:', error);
    }
  }, [selectedSlot, selectedBarber, selectedDay]);

  useRealtimeAppointments({ onUpdate: refreshAppointments, enabled: isOpen });

  useEffect(() => {
    if (selectedBarber) {
      setSelectedDay(null);
      setSelectedSlot(null);
      setExpandedDays(new Set());
    }
  }, [selectedBarber]);

  const resetForm = () => {
    setSelectedBarber(null);
    setSelectedDay(null);
    setSelectedSlot(null);
    setExpandedDays(new Set());
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setContactMode('choice');
    setBookingSuccess(false);
    setBookingError('');
    setCurrentWeekOffset(0);
    resetAuthForm();
  };

  const resetAuthForm = () => {
    setAuthEmail('');
    setAuthPassword('');
    setAuthConfirmPassword('');
    setAuthFirstName('');
    setAuthLastName('');
    setAuthPhone('');
    setAuthBirthDate('');
    setAuthError('');
    setAuthSuccess('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);

    try {
      const result = await signIn(authEmail, authPassword);
      if (result.error) {
        setAuthError(result.error || tAuth('loginFailed'));
      } else {
        resetAuthForm();
        setContactMode('choice');
      }
    } catch {
      setAuthError(tAuth('loginFailed'));
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (authPassword !== authConfirmPassword) {
      setAuthError(tAuth('passwordsNotMatch'));
      return;
    }
    if (authPassword.length < 6) {
      setAuthError(tAuth('passwordTooShort'));
      return;
    }

    setAuthSubmitting(true);

    try {
      const result = await signUp({
        email: authEmail,
        password: authPassword,
        firstName: authFirstName,
        lastName: authLastName,
        phone: authPhone,
        birthDate: authBirthDate,
      });

      if (result.error) {
        setAuthError(result.error || tAuth('registrationFailed'));
      } else {
        setAuthSuccess(tAuth('registrationSuccess'));
      }
    } catch {
      setAuthError(tAuth('registrationFailed'));
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);

    try {
      const result = await resetPassword(authEmail);
      if (result.error) {
        setAuthError(result.error || tAuth('resetFailed'));
      } else {
        setAuthSuccess(tAuth('resetEmailSent'));
      }
    } catch {
      setAuthError(tAuth('resetFailed'));
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Passwort setzen (für Einladungslinks vom Barber)
  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (authPassword !== authConfirmPassword) {
      setAuthError(tAuth('passwordsNotMatch'));
      return;
    }
    if (authPassword.length < 6) {
      setAuthError(tAuth('passwordTooShort'));
      return;
    }

    setAuthSubmitting(true);

    try {
      const result = await setNewPassword(authPassword);
      if (result.error) {
        setAuthError(result.error || 'Passwort konnte nicht gesetzt werden');
      } else {
        // Erfolg: Customer Portal öffnen
        setIsPasswordSetupMode(false);
        setShowCustomerPortal(true);
      }
    } catch {
      setAuthError('Passwort konnte nicht gesetzt werden');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const selectedBarberData = team.find(b => b.id === selectedBarber);
  const selectedDayData = days.find(d => d.dateStr === selectedDay);

  const isTimeUnlocked = selectedBarber !== null;
  const isContactUnlocked = selectedBarber !== null && selectedDay !== null && selectedSlot !== null;
  const canSubmit = isContactUnlocked && customerName.trim() && customerEmail.trim() && customerPhone.trim();

  const handleBooking = async () => {
    if (!canSubmit || !selectedBarber || !selectedDay || !selectedSlot) return;

    setIsSubmitting(true);
    setBookingError('');

    try {
      const result = await createAppointment({
        barber_id: selectedBarber,
        date: selectedDay!,
        time_slot: selectedSlot!,
        service_id: null,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || null,
        customer_phone: customerPhone.trim() || null,
        customer_id: customer?.id || null,
        status: 'confirmed',
        source: 'online',
        series_id: null,
      });

      if (result.success && result.appointment) {
        try {
          await sendBookingConfirmationEmail({
            customerName: customerName.trim(),
            customerEmail: customerEmail.trim(),
            barberName: selectedBarberData?.name || '',
            serviceName: '',
            date: selectedDay!,
            time: selectedSlot!,
            duration: 30,
            price: '',
            appointmentId: result.appointment.id.toString(),
          });
        } catch (emailError) {
          console.error('Email send error:', emailError);
        }

        setBookingSuccess(true);
        await refreshAppointments();
      } else {
        setBookingError(result.error === 'conflict' ? t('slotTaken') : t('bookingFailed'));
      }
    } catch (error) {
      console.error('Booking error:', error);
      setBookingError(t('bookingFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToSection = (sectionId: string) => {
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };

  const toggleDayExpanded = (dateStr: string) => {
    const isCurrentlyExpanded = expandedDays.size > 0;

    if (isCurrentlyExpanded) {
      // Alle einklappen
      setExpandedDays(new Set());
    } else {
      // Alle ausklappen
      setExpandedDays(new Set(days.map(d => d.dateStr)));
      scrollToSection(`day-card-${dateStr}`);
    }
  };

  const handleBarberSelect = (barberId: string) => {
    setSelectedBarber(barberId);
    scrollToSection('booking-section-time');
  };

  const handleSlotSelect = (dateStr: string, slot: string) => {
    setSelectedDay(dateStr);
    setSelectedSlot(slot);
    scrollToSection('booking-section-contact');
  };

  if (!mounted) return null;

  const modalContent = (
    <>
      <div
        style={{
          ...styles.overlay,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.2s ease',
        }}
        onClick={handleClose}
      >
        <div
          style={{
            ...styles.modal,
            maxWidth: bookingSuccess ? '500px' : '1100px',
            transform: isOpen ? 'scale(1)' : 'scale(0.95)',
            transition: 'all 0.3s ease',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={styles.header}>
            <span style={styles.title}>{t('title')}</span>
            <button style={styles.closeBtn} onClick={handleClose}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isLoading ? (
            <div style={{ ...styles.content, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
              <div style={{ width: '2rem', height: '2rem', border: '2px solid #d4a853', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : loadError ? (
            <div style={{ ...styles.content, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{t('loadError')}</p>
              <button onClick={() => loadData()} style={{ ...styles.submitBtn, backgroundColor: '#d4a853' }}>
                {t('retry')}
              </button>
            </div>
          ) : bookingSuccess ? (
            <div style={styles.successContainer}>
              <div style={styles.successIcon}>
                <svg width="32" height="32" fill="none" stroke="#22c55e" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 style={styles.successTitle}>{t('bookingSuccess')}</h3>
              <p style={styles.successText}>
                {t('confirmationSent')} <span style={styles.gold}>{customerEmail}</span>
              </p>
              <button
                onClick={handleClose}
                style={{ ...styles.submitBtn, backgroundColor: '#d4a853' }}
              >
                {tCommon('close')}
              </button>
            </div>
          ) : isPasswordSetupMode ? (
            /* Password Setup Mode - Nur Auth-Formular */
            <div style={{ ...styles.content, padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <div style={{ width: '4rem', height: '4rem', margin: '0 auto 1rem', backgroundColor: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="28" height="28" fill="none" stroke="#22c55e" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 600, color: '#1a1a1a' }}>Konto aktivieren</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Lege dein Passwort fest, um dein Konto zu aktivieren.</p>
              </div>

              {authError && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: '0.5rem', border: '1px solid #fecaca' }}>
                  <p style={{ fontSize: '0.75rem', color: '#dc2626', margin: 0 }}>{authError}</p>
                </div>
              )}

              <form onSubmit={handlePasswordSetup}>
                <div style={{ ...styles.inputGridTwo, marginBottom: '0.75rem' }}>
                  <input type="text" value={authFirstName} onChange={(e) => setAuthFirstName(e.target.value)} placeholder={tAuth('firstName')} style={styles.input} required />
                  <input type="text" value={authLastName} onChange={(e) => setAuthLastName(e.target.value)} placeholder={tAuth('lastName')} style={styles.input} required />
                </div>
                <div style={{ ...styles.inputGridTwo, marginBottom: '0.75rem' }}>
                  <DatePicker value={authBirthDate} onChange={setAuthBirthDate} placeholder={tAuth('birthDate')} style={styles.input} max={new Date().toISOString().split('T')[0]} min="1920-01-01" />
                  <input
                    type="tel"
                    value={authPhone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d+\-\s]/g, '');
                      if (value.length <= 20) setAuthPhone(value);
                    }}
                    placeholder={tAuth('phone')}
                    style={styles.input}
                    maxLength={20}
                  />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <input
                    type="email"
                    value={authEmail}
                    placeholder={tAuth('email')}
                    style={{ ...styles.input, width: '100%', backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }}
                    disabled
                  />
                </div>
                <div style={{ ...styles.inputGridTwo, marginBottom: '1rem' }}>
                  <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Passwort (min. 6 Zeichen)" autoComplete="new-password" style={styles.input} required minLength={6} />
                  <input type="password" value={authConfirmPassword} onChange={(e) => setAuthConfirmPassword(e.target.value)} placeholder="Passwort bestätigen" autoComplete="new-password" style={styles.input} required minLength={6} />
                </div>
                <button type="submit" disabled={authSubmitting} style={{ ...styles.submitBtn, width: '100%', justifyContent: 'center', opacity: authSubmitting ? 0.5 : 1, backgroundColor: '#d4a853' }}>
                  {authSubmitting ? 'Wird aktiviert...' : 'Konto aktivieren'}
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* Progress Bar - 3 Steps */}
              <div style={styles.progressContainer}>
                {[
                  { num: 1, label: t('steps.barber'), done: selectedBarber !== null },
                  { num: 2, label: t('steps.time'), done: selectedSlot !== null },
                  { num: 3, label: t('steps.contact'), done: canSubmit },
                ].map((step) => {
                  const isActive =
                    (step.num === 1 && !selectedBarber) ||
                    (step.num === 2 && selectedBarber && !selectedSlot) ||
                    (step.num === 3 && selectedSlot && !canSubmit);

                  return (
                    <div key={step.num} style={styles.progressStep}>
                      <span style={{ ...styles.progressLabel, color: isActive || step.done ? '#d4a853' : '#94a3b8' }}>
                        {step.num}
                      </span>
                      <div style={styles.progressBar}>
                        <div style={{ ...styles.progressFill, width: step.done ? '100%' : '0%' }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Content */}
              <div style={styles.content} ref={contentRef}>
                {/* Section 1: Barber Selection */}
                <div id="booking-section-barber" style={styles.section}>
                  <div style={styles.sectionHeader}>
                    <span style={styles.sectionNum}>1.</span>
                    <span style={styles.sectionTitle}>{t('steps.barber')}</span>
                  </div>
                  <div style={styles.barbersGrid}>
                    {team.map((barber) => {
                      const isSelected = selectedBarber === barber.id;
                      const isOtherSelected = selectedBarber !== null && !isSelected;

                      return (
                        <button
                          key={barber.id}
                          onClick={() => handleBarberSelect(barber.id)}
                          style={{
                            ...styles.barberBtn,
                            ...(isSelected ? styles.barberBtnSelected : {}),
                            ...(isOtherSelected ? styles.barberBtnOther : {}),
                          }}
                        >
                          <Image
                            src={barber.image || '/team/placeholder.jpg'}
                            alt={barber.name}
                            fill
                            style={{
                              objectFit: 'cover',
                              objectPosition: barber.image_position,
                              transform: `scale(${barber.image_scale})`,
                            }}
                          />
                          <div style={styles.barberOverlay} />
                          <span style={{ ...styles.barberName, fontWeight: isSelected ? 500 : 400 }}>{barber.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section 2: Week View with Slots */}
                <div id="booking-section-time" style={{ ...styles.section, ...(isTimeUnlocked ? {} : styles.disabledSection) }}>
                  <div style={styles.sectionHeader}>
                    <span style={{ ...styles.sectionNum, color: isTimeUnlocked ? '#94a3b8' : '#cbd5e1' }}>2.</span>
                    <span style={{ ...styles.sectionTitle, color: isTimeUnlocked ? '#64748b' : '#cbd5e1' }}>{t('steps.time')}</span>
                    {/* Week Navigation */}
                    <div style={styles.weekNav}>
                      <button
                        style={{ ...styles.weekNavBtn, opacity: currentWeekOffset === 0 ? 0.3 : 1 }}
                        onClick={() => setCurrentWeekOffset(prev => Math.max(0, prev - 1))}
                        disabled={currentWeekOffset === 0}
                      >
                        <svg width="12" height="12" fill="none" stroke="#64748b" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <div style={styles.weekInfo}>
                        <span style={styles.weekLabel}>KW {weekNumber}</span>
                        <span style={styles.weekRange}>{weekRange}</span>
                      </div>
                      <button
                        style={{ ...styles.weekNavBtn, opacity: currentWeekOffset >= maxWeeks - 1 ? 0.3 : 1 }}
                        onClick={() => setCurrentWeekOffset(prev => Math.min(maxWeeks - 1, prev + 1))}
                        disabled={currentWeekOffset >= maxWeeks - 1}
                      >
                        <svg width="12" height="12" fill="none" stroke="#64748b" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {selectedBarber ? (
                    <div style={styles.weekDaysContainer}>
                      {days.map((day) => {
                        const barberData = team.find(b => b.id === selectedBarber);
                        const dayOfWeek = new Date(day.dateStr).getDay();

                        // Prüfe ob freier Tag und ob es eine Ausnahme gibt
                        const isFreeDay = barberData ? isBarberFreeDay(barberData, day.dateStr) : false;
                        const hasException = freeDayExceptions.some(
                          ex => ex.staff_id === selectedBarber && ex.date === day.dateStr
                        );
                        const freeDayException = freeDayExceptions.find(
                          ex => ex.staff_id === selectedBarber && ex.date === day.dateStr
                        );

                        // Prüfe ob dieses Datum ein Ersatztag ist (dann ist Barber frei)
                        const isReplacementDay = freeDayExceptions.some(
                          ex => ex.staff_id === selectedBarber && ex.replacement_date === day.dateStr
                        );

                        // Bei verkaufsoffenem Sonntag: Prüfe ob Barber eingetragen ist
                        const openSundayData = day.isOpenSunday ? openSundays.find(os => os.date === day.dateStr) : undefined;
                        const barberSundayAssignment = openSundayData
                          ? openSundayStaff.find(s => s.open_sunday_id === openSundayData.id && s.staff_id === selectedBarber)
                          : undefined;
                        const isBarberNotAssignedToSunday = day.isOpenSunday && !barberSundayAssignment;

                        // Barber ist nicht verfügbar, wenn: freier Tag ohne Ausnahme ODER Urlaub ODER Ersatztag ODER nicht für Sonntag eingeteilt
                        const isBarberUnavailable = barberData && (
                          (isFreeDay && !hasException) ||
                          isReplacementDay ||
                          isBarberNotAssignedToSunday ||
                          staffTimeOff.some(off => off.staff_id === selectedBarber && off.start_date <= day.dateStr && off.end_date >= day.dateStr)
                        );

                        // Effektive Arbeitszeiten ermitteln (Priorität: Ausnahme > individuell > global)
                        let effectiveOpenTime: string | undefined;
                        let effectiveCloseTime: string | undefined;

                        if (day.isOpenSunday && barberSundayAssignment) {
                          // Verkaufsoffener Sonntag - individuelle Barber-Zeiten verwenden
                          effectiveOpenTime = barberSundayAssignment.start_time?.slice(0, 5);
                          effectiveCloseTime = barberSundayAssignment.end_time?.slice(0, 5);
                        } else if (hasException && freeDayException) {
                          // Freier-Tag-Ausnahme
                          effectiveOpenTime = freeDayException.start_time?.slice(0, 5);
                          effectiveCloseTime = freeDayException.end_time?.slice(0, 5);
                        } else {
                          // Individuelle Arbeitszeiten für diesen Tag
                          const individualHours = staffWorkingHours.find(
                            wh => wh.staff_id === selectedBarber && wh.day_of_week === dayOfWeek
                          );
                          if (individualHours) {
                            effectiveOpenTime = individualHours.start_time?.slice(0, 5);
                            effectiveCloseTime = individualHours.end_time?.slice(0, 5);
                          } else {
                            // Fallback auf globale Öffnungszeiten
                            const globalHours = openingHours.find(h => h.day_of_week === dayOfWeek);
                            if (globalHours && !globalHours.is_closed) {
                              effectiveOpenTime = globalHours.open_time?.slice(0, 5);
                              effectiveCloseTime = globalHours.close_time?.slice(0, 5);
                            }
                          }
                        }

                        const availableSlots = day.isDisabled || isBarberUnavailable
                          ? []
                          : getAvailableSlots(
                              selectedBarber,
                              day.dateStr,
                              timeSlots,
                              bookedAppointments,
                              effectiveOpenTime,
                              effectiveCloseTime
                            );

                        const isExpanded = expandedDays.has(day.dateStr);
                        const visibleSlots = isExpanded ? availableSlots : availableSlots.slice(0, 6);
                        const hasMoreSlots = availableSlots.length > 6;
                        const isDayDisabled = day.isDisabled || isBarberUnavailable || availableSlots.length === 0;

                        return (
                          <div
                            key={day.dateStr}
                            id={`day-card-${day.dateStr}`}
                            style={{
                              ...styles.dayCard,
                              ...(isDayDisabled ? styles.dayCardDisabled : {}),
                              ...(selectedDay === day.dateStr ? { border: '1px solid #d4a853' } : {}),
                            }}
                          >
                            <div style={styles.dayCardHeader}>
                              <span style={styles.dayCardTitle}>{day.dayNameShort}</span>
                              <span style={styles.dayCardDate}>{day.dayNum}</span>
                            </div>

                            {isDayDisabled ? (
                              <div style={styles.noSlotsMsg}>
                                {day.isClosed ? day.closedReason || t('closed') :
                                 isBarberUnavailable ? t('barberUnavailable') :
                                 day.isDisabled ? t('notAvailable') :
                                 t('noSlotsAvailable')}
                              </div>
                            ) : (
                              <>
                                <div style={styles.slotsGrid}>
                                  {visibleSlots.map((slot) => (
                                    <button
                                      key={slot}
                                      onClick={() => handleSlotSelect(day.dateStr, slot)}
                                      style={{
                                        ...styles.slotBtn,
                                        ...(selectedDay === day.dateStr && selectedSlot === slot ? styles.slotBtnSelected : {}),
                                      }}
                                    >
                                      {slot}
                                    </button>
                                  ))}
                                </div>
                                {hasMoreSlots && (
                                  <button
                                    style={styles.expandBtn}
                                    onClick={() => toggleDayExpanded(day.dateStr)}
                                  >
                                    {isExpanded ? (
                                      <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                      </svg>
                                    ) : (
                                      <span>+{availableSlots.length - 6}</span>
                                    )}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={styles.placeholder}>{t('selectBarberFirst')}</div>
                  )}
                </div>

                {/* Section 3: Contact */}
                <div id="booking-section-contact" style={{ ...styles.section, ...(isContactUnlocked ? {} : styles.disabledSection), marginBottom: 0 }}>
                  <div style={styles.sectionHeader}>
                    <span style={{ ...styles.sectionNum, color: isContactUnlocked ? '#94a3b8' : '#cbd5e1' }}>3.</span>
                    <span style={{ ...styles.sectionTitle, color: isContactUnlocked ? '#64748b' : '#cbd5e1' }}>{t('contactData')}</span>
                    {isAuthenticated && (
                      <span style={{ fontSize: '0.5625rem', color: '#d4a853', marginLeft: '0.5rem' }}>{t('autoFilled')}</span>
                    )}
                  </div>

                  {isAuthenticated ? (
                    <div>
                      <div style={styles.loggedInInfo}>
                        <svg width="16" height="16" fill="none" stroke="#d4a853" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>{t('loggedInAs')} <span style={{ fontWeight: 500, color: '#0f172a' }}>{customer?.name}</span></span>
                      </div>
                      <div style={styles.inputGrid}>
                        <input type="text" placeholder={t('name')} value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={styles.input} />
                        <input type="email" placeholder={t('email')} value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} style={styles.input} />
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
                        <button type="button" onClick={() => setShowCustomerPortal(true)} style={{ ...styles.actionBtn, border: '1px solid rgba(212, 168, 83, 0.6)', color: '#d4a853' }}>
                          {t('myAppointments')}
                        </button>
                        <button type="button" onClick={() => signOut()} style={{ ...styles.actionBtn, color: '#64748b' }}>
                          {tAuth('logout')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {contactMode === 'choice' && (
                        <div style={styles.choiceGrid}>
                          <button type="button" onClick={() => { setContactMode('guest'); scrollToSection('contact-form-guest'); }} style={styles.choiceBtn}>
                            <div style={styles.choiceBtnHeader}>
                              <svg width="18" height="18" fill="none" stroke="#94a3b8" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span style={styles.choiceBtnTitle}>{t('bookAsGuest')}</span>
                            </div>
                            <p style={styles.choiceBtnDesc}>{t('quickWithoutAccount')}</p>
                          </button>
                          <button type="button" onClick={() => { setContactMode('auth'); scrollToSection('contact-form-auth'); }} style={styles.choiceBtn}>
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

                      {contactMode === 'guest' && (
                        <div id="contact-form-guest">
                          <button type="button" onClick={() => setContactMode('choice')} style={styles.backBtn}>
                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            {t('back')}
                          </button>
                          <div style={styles.inputGrid}>
                            <input type="text" placeholder={t('name')} value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={styles.input} />
                            <input type="email" placeholder={t('email')} value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} style={styles.input} />
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

                      {contactMode === 'auth' && (
                        <div id="contact-form-auth">
                          <button type="button" onClick={() => setContactMode('choice')} style={styles.backBtn}>
                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            {t('back')}
                          </button>

                          <div style={styles.authTabs}>
                            <button
                              type="button"
                              onClick={() => { setAuthTab('login'); resetAuthForm(); }}
                              style={{ ...styles.authTab, ...(authTab === 'login' ? styles.authTabActive : {}) }}
                            >
                              {tAuth('login')}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setAuthTab('register'); resetAuthForm(); scrollToSection('auth-form-register'); }}
                              style={{ ...styles.authTab, ...(authTab === 'register' ? styles.authTabActive : {}) }}
                            >
                              {tAuth('register')}
                            </button>
                          </div>

                          {authError && <div style={styles.errorMsg}><span>{authError}</span></div>}
                          {authSuccess && <div style={styles.successMsg}><span>{authSuccess}</span></div>}

                          {authTab === 'login' && !authSuccess && (
                            <form onSubmit={handleLogin}>
                              <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder={tAuth('email')} autoComplete="email" style={{ ...styles.input, width: '100%', marginBottom: '0.5rem' }} required />
                              <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder={tAuth('password')} autoComplete="current-password" style={{ ...styles.input, width: '100%', marginBottom: '0.5rem' }} required />
                              <button type="submit" disabled={authSubmitting} style={{ ...styles.submitBtn, width: '100%', justifyContent: 'center', opacity: authSubmitting ? 0.5 : 1 }}>
                                {authSubmitting ? tAuth('loggingIn') : tAuth('login')}
                              </button>
                              <button type="button" onClick={() => { setAuthTab('forgot'); resetAuthForm(); }} style={{ ...styles.backBtn, width: '100%', justifyContent: 'center', marginTop: '0.5rem', marginBottom: 0 }}>
                                {tAuth('forgotPassword')}
                              </button>
                            </form>
                          )}

                          {authTab === 'register' && !authSuccess && (
                            <form id="auth-form-register" onSubmit={handleRegister}>
                              <div style={{ ...styles.inputGridTwo, marginBottom: '0.5rem' }}>
                                <input type="text" value={authFirstName} onChange={(e) => setAuthFirstName(e.target.value)} placeholder={tAuth('firstName')} style={styles.input} required />
                                <input type="text" value={authLastName} onChange={(e) => setAuthLastName(e.target.value)} placeholder={tAuth('lastName')} style={styles.input} required />
                              </div>
                              <div style={{ ...styles.inputGridTwo, marginBottom: '0.5rem' }}>
                                <DatePicker value={authBirthDate} onChange={setAuthBirthDate} placeholder={tAuth('birthDate')} style={styles.input} required max={new Date().toISOString().split('T')[0]} min="1920-01-01" />
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
                              <div style={{ ...styles.inputGridTwo, marginBottom: '0.5rem' }}>
                                <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder={tAuth('email')} autoComplete="email" style={styles.input} required />
                                <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder={tAuth('passwordMinLength')} autoComplete="new-password" style={styles.input} required minLength={6} />
                              </div>
                              <div style={{ marginBottom: '0.5rem' }}>
                                <input type="password" value={authConfirmPassword} onChange={(e) => setAuthConfirmPassword(e.target.value)} placeholder={tAuth('confirmPassword')} autoComplete="new-password" style={{ ...styles.input, width: '100%' }} required minLength={6} />
                              </div>
                              <button type="submit" disabled={authSubmitting} style={{ ...styles.submitBtn, width: '100%', justifyContent: 'center', opacity: authSubmitting ? 0.5 : 1 }}>
                                {authSubmitting ? tAuth('registering') : tAuth('register')}
                              </button>
                            </form>
                          )}

                          {authTab === 'forgot' && !authSuccess && (
                            <form onSubmit={handleForgotPassword}>
                              <p style={{ fontSize: '0.625rem', color: '#64748b', marginBottom: '0.5rem' }}>{tAuth('resetDescription')}</p>
                              <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder={tAuth('email')} style={{ ...styles.input, marginBottom: '0.5rem' }} required />
                              <button type="submit" disabled={authSubmitting} style={{ ...styles.submitBtn, width: '100%', justifyContent: 'center', opacity: authSubmitting ? 0.5 : 1 }}>
                                {authSubmitting ? tAuth('sendingLink') : tAuth('sendResetLink')}
                              </button>
                              <button type="button" onClick={() => { setAuthTab('login'); resetAuthForm(); }} style={{ ...styles.backBtn, width: '100%', justifyContent: 'center', marginTop: '0.5rem', marginBottom: 0 }}>
                                {tAuth('goToLogin')}
                              </button>
                            </form>
                          )}

                          {/* Passwort festlegen (für Einladungslinks) */}
                          {authTab === 'password-setup' && (
                            <form onSubmit={handlePasswordSetup}>
                              <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '0.5rem', border: '1px solid #bbf7d0' }}>
                                <p style={{ fontSize: '0.75rem', color: '#166534', margin: 0, fontWeight: 500 }}>
                                  Willkommen! Bitte lege ein Passwort für dein Konto fest.
                                </p>
                              </div>
                              <div style={{ ...styles.inputGridTwo, marginBottom: '0.5rem' }}>
                                <input type="text" value={authFirstName} onChange={(e) => setAuthFirstName(e.target.value)} placeholder={tAuth('firstName')} style={styles.input} required />
                                <input type="text" value={authLastName} onChange={(e) => setAuthLastName(e.target.value)} placeholder={tAuth('lastName')} style={styles.input} required />
                              </div>
                              <div style={{ ...styles.inputGridTwo, marginBottom: '0.5rem' }}>
                                <DatePicker value={authBirthDate} onChange={setAuthBirthDate} placeholder={tAuth('birthDate')} style={styles.input} max={new Date().toISOString().split('T')[0]} min="1920-01-01" />
                                <input
                                  type="tel"
                                  value={authPhone}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^\d+\-\s]/g, '');
                                    if (value.length <= 20) setAuthPhone(value);
                                  }}
                                  placeholder={tAuth('phone')}
                                  style={styles.input}
                                  maxLength={20}
                                />
                              </div>
                              <div style={{ marginBottom: '0.5rem' }}>
                                <input
                                  type="email"
                                  value={authEmail}
                                  placeholder={tAuth('email')}
                                  style={{ ...styles.input, width: '100%', backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                                  disabled
                                />
                              </div>
                              <div style={{ ...styles.inputGridTwo, marginBottom: '0.5rem' }}>
                                <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder={tAuth('passwordMinLength')} autoComplete="new-password" style={styles.input} required minLength={6} />
                                <input type="password" value={authConfirmPassword} onChange={(e) => setAuthConfirmPassword(e.target.value)} placeholder={tAuth('confirmPassword')} autoComplete="new-password" style={styles.input} required minLength={6} />
                              </div>
                              <button type="submit" disabled={authSubmitting} style={{ ...styles.submitBtn, width: '100%', justifyContent: 'center', opacity: authSubmitting ? 0.5 : 1 }}>
                                {authSubmitting ? 'Wird gespeichert...' : 'Passwort festlegen'}
                              </button>
                            </form>
                          )}

                          {authSuccess && authTab !== 'login' && authTab !== 'password-setup' && (
                            <button type="button" onClick={() => { setAuthTab('login'); resetAuthForm(); }} style={{ ...styles.submitBtn, width: '100%', justifyContent: 'center' }}>
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
                    {selectedBarberData && selectedDayData && selectedSlot ? (
                      <span>
                        {t('at')} <span style={styles.gold}>{selectedBarberData.name}</span> {t('on')}{' '}
                        <span style={styles.gold}>{selectedDayData.dayNameLong}, {selectedDayData.dayNumFullDate}</span> {t('atTime')}{' '}
                        <span style={styles.gold}>{selectedSlot} {tCommon('oclock')}</span>
                      </span>
                    ) : (
                      <span>{t('fillAllFields')}</span>
                    )}
                  </div>
                  <button
                    onClick={handleBooking}
                    disabled={!canSubmit || isSubmitting}
                    style={{
                      ...styles.submitBtn,
                      ...(!canSubmit || isSubmitting ? styles.submitBtnDisabled : {}),
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <svg style={{ animation: 'spin 1s linear infinite', width: '1rem', height: '1rem' }} fill="none" viewBox="0 0 24 24">
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

      {showCustomerPortal && <CustomerPortal onClose={() => setShowCustomerPortal(false)} />}
    </>
  );

  return createPortal(modalContent, document.body);
}
