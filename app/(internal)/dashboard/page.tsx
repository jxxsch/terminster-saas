'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { WeekView } from '@/components/dashboard/WeekView';
import { BarberWeekView } from '@/components/dashboard/BarberWeekView';
import { useClosedDates, useOpenSundays } from '@/hooks/swr/use-dashboard-data';
import { useTranslations } from 'next-intl';
import { useLogoUrl } from '@/hooks/useLogoUrl';
import { AppointmentSearch } from '@/components/dashboard/AppointmentSearch';

type ViewMode = 'day' | 'barber';
type NameDisplayMode = 'firstName' | 'lastName' | 'fullName';

const DASHBOARD_PASSWORD = 'beban2024';

// Helper: Kundenname formatieren
function formatCustomerName(fullName: string, mode: NameDisplayMode): string {
  if (!fullName) return fullName;
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName; // Nur ein Wort → unverändert

  const firstName = parts[0];
  const lastName = parts.slice(1).join(' '); // Rest ist Nachname

  switch (mode) {
    case 'firstName':
      return `${firstName} ${lastName.charAt(0)}.`; // Jan S.
    case 'lastName':
      return `${firstName.charAt(0)}. ${lastName}`; // J. Scheuer
    case 'fullName':
    default:
      return fullName; // Jan Scheuer
  }
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getMondayOfWeek(weekOffset: number): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setDate(today.getDate() + diff + (weekOffset * 7));
  return monday;
}

// Ab Ladenschluss (19:00) → nächster Arbeitstag anzeigen
function getEffectiveToday(): { weekOffset: number; dayIndex: number } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=So, 1=Mo, ..., 6=Sa
  const afterClose = now.getHours() >= 19;

  // Sonntag → Montag nächste Woche
  if (dayOfWeek === 0) {
    return { weekOffset: 1, dayIndex: 0 };
  }

  // Samstag nach Ladenschluss → Montag nächste Woche
  if (dayOfWeek === 6 && afterClose) {
    return { weekOffset: 1, dayIndex: 0 };
  }

  // Samstag vor Ladenschluss → Samstag (dayIndex 5)
  if (dayOfWeek === 6) {
    return { weekOffset: 0, dayIndex: 5 };
  }

  // Mo-Fr nach Ladenschluss → nächster Tag
  if (afterClose) {
    // Freitag nach 19:00 → Samstag (dayIndex 5)
    // Mo-Do nach 19:00 → nächster Tag
    return { weekOffset: 0, dayIndex: dayOfWeek }; // dayOfWeek 1=Mo→dayIndex 1=Di, ..., 5=Fr→dayIndex 5=Sa
  }

  // Mo-Fr vor Ladenschluss → heute
  return { weekOffset: 0, dayIndex: dayOfWeek - 1 };
}

export default function DashboardPage() {
  const logoUrl = useLogoUrl();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(() => getEffectiveToday().weekOffset);
  const [selectedDay, setSelectedDay] = useState(0);
  const { data: closedDates = [] } = useClosedDates();
  const { data: openSundays = [] } = useOpenSundays();
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedAppointments, setSelectedAppointments] = useState<Set<string>>(new Set());
  const [nameDisplayMode, setNameDisplayMode] = useState<NameDisplayMode>('lastName');
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [searchHighlightIds, setSearchHighlightIds] = useState<Set<string>>(new Set());
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [desktopSearchState, setDesktopSearchState] = useState<'closed' | 'open' | 'closing'>('closed');
  const [showCancelledModal, setShowCancelledModal] = useState(false);
  const [closeButtonHover, setCloseButtonHover] = useState(false);
  const [cancelledAppointments, setCancelledAppointments] = useState<Array<{
    id: string;
    customer_name: string;
    date: string;
    time_slot: string;
    barber_name: string;
    cancelled_at: string;
    cancelled_by: 'customer' | 'barber' | null;
  }>>([]);
  const t = useTranslations('dashboard');
  const tDays = useTranslations('days');
  const tMonths = useTranslations('months');

  useEffect(() => {
    const session = localStorage.getItem('dashboard_session');
    if (session === 'authenticated') {
      setIsAuthenticated(true);
    }

    // Namensanzeige aus localStorage laden
    const savedNameMode = localStorage.getItem('dashboard_name_display') as NameDisplayMode;
    if (savedNameMode && ['firstName', 'lastName', 'fullName'].includes(savedNameMode)) {
      setNameDisplayMode(savedNameMode);
    }
  }, []);

  // Namensanzeige speichern wenn geändert
  const handleNameDisplayChange = useCallback((mode: NameDisplayMode) => {
    setNameDisplayMode(mode);
    localStorage.setItem('dashboard_name_display', mode);
    setShowNameDropdown(false);
  }, []);

  // Stornierte Termine laden
  const loadCancelledAppointments = useCallback(async () => {
    try {
      const response = await fetch('/api/appointments/cancelled');
      const data = await response.json();
      if (data.appointments) {
        setCancelledAppointments(data.appointments);
      }
    } catch (error) {
      console.error('Failed to load cancelled appointments:', error);
    }
  }, []);

  const handleShowCancelled = useCallback(() => {
    loadCancelledAppointments();
    setShowCancelledModal(true);
  }, [loadCancelledAppointments]);

  // Suche: Zum Termin navigieren
  const handleSearchNavigate = useCallback((date: string, _appointmentIds: string[]) => {
    // Berechne weekOffset und dayIndex für das Datum
    const targetDate = new Date(date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Montag der Zielwoche berechnen
    const targetDay = targetDate.getDay(); // 0=So, 1=Mo, ...
    const targetMonday = new Date(targetDate);
    const diffToMonday = targetDay === 0 ? -6 : 1 - targetDay;
    targetMonday.setDate(targetDate.getDate() + diffToMonday);

    // Montag der aktuellen Woche
    const currentMonday = getMondayOfWeek(0);

    // Wochendifferenz
    const diffWeeks = Math.round((targetMonday.getTime() - currentMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
    setCurrentWeekOffset(diffWeeks);

    // Tag innerhalb der Woche (0=Mo, 1=Di, ..., 6=So)
    const dayIndex = targetDay === 0 ? 6 : targetDay - 1;
    setSelectedDay(dayIndex);
  }, []);

  // Suche: Highlighting aktualisieren
  const handleSearchHighlightChange = useCallback((ids: Set<string>) => {
    setSearchHighlightIds(ids);
  }, []);

  // Desktop-Suchpanel schließen (mit Animation)
  const closeDesktopSearch = useCallback(() => {
    setDesktopSearchState('closing');
    setSearchHighlightIds(new Set());
  }, []);

  // Click-Outside: Suchfeld schließen
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (desktopSearchState !== 'open') return;
    const handleClickOutside = (e: MouseEvent) => {
      if (desktopSearchRef.current && !desktopSearchRef.current.contains(e.target as Node)) {
        closeDesktopSearch();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [desktopSearchState, closeDesktopSearch]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === DASHBOARD_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('dashboard_session', 'authenticated');
      setError('');
    } else {
      setError(t('wrongPassword'));
    }
  };

  const monday = useMemo(() => getMondayOfWeek(currentWeekOffset), [currentWeekOffset]);
  const weekNumber = useMemo(() => getWeekNumber(monday), [monday]);

  const weekRange = useMemo(() => {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const startDay = monday.getDate();
    const endDay = sunday.getDate();
    const startMonth = tMonths(`short.${MONTH_KEYS[monday.getMonth()]}`);
    const endMonth = tMonths(`short.${MONTH_KEYS[sunday.getMonth()]}`);

    if (monday.getMonth() === sunday.getMonth()) {
      return `${startDay}.-${endDay}. ${startMonth}`;
    }
    return `${startDay}. ${startMonth} - ${endDay}. ${endMonth}`;
  }, [monday, tMonths]);

  const weekDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: { date: Date; dateStr: string; dayName: string; dayNum: number; isToday: boolean; isSunday: boolean; isOpenSunday: boolean; isClosed: boolean; closedReason?: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = formatDateLocal(date);
      const isToday = date.getTime() === today.getTime();
      const isActuallySunday = date.getDay() === 0;
      const isOpenSunday = isActuallySunday && openSundays.some(os => os.date === dateStr);
      const isSunday = isActuallySunday && !isOpenSunday;
      const closedDate = closedDates.find(cd => cd.date === dateStr);
      days.push({
        date,
        dateStr,
        dayName: tDays(`short.${DAY_KEYS[date.getDay()]}`),
        dayNum: date.getDate(),
        isToday,
        isSunday,
        isOpenSunday,
        isClosed: !!closedDate,
        closedReason: closedDate?.reason || undefined,
      });
    }
    return days;
  }, [monday, closedDates, openSundays, tDays]);

  useEffect(() => {
    const effective = getEffectiveToday();
    setCurrentWeekOffset(effective.weekOffset);

    if (effective.weekOffset === 0) {
      const effectiveDay = weekDays[effective.dayIndex];
      if (effectiveDay) {
        if (effectiveDay.isSunday) {
          setCurrentWeekOffset(1);
          setSelectedDay(0);
        } else if (effectiveDay.isClosed) {
          const nextOpenDay = weekDays.findIndex((d, i) => i > effective.dayIndex && !d.isSunday && !d.isClosed);
          if (nextOpenDay !== -1) {
            setSelectedDay(nextOpenDay);
          } else {
            setCurrentWeekOffset(1);
            setSelectedDay(0);
          }
        } else {
          setSelectedDay(effective.dayIndex);
        }
      } else {
        setSelectedDay(effective.dayIndex);
      }
    } else {
      setSelectedDay(effective.dayIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Selection Mode Handlers
  const handleToggleSelect = useCallback((appointmentId: string) => {
    setSelectedAppointments(prev => {
      const next = new Set(prev);
      if (next.has(appointmentId)) {
        next.delete(appointmentId);
      } else {
        next.add(appointmentId);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedAppointments(new Set());
  }, []);

  const handleExitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedAppointments(new Set());
  }, []);

  const handleBulkDelete = useCallback(() => {
    // Dies wird in WeekView behandelt - wir geben nur die IDs weiter
  }, []);

  // Escape-Taste zum Beenden des Selection Mode
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectionMode) {
        handleExitSelectionMode();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectionMode, handleExitSelectionMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Im Selection Mode keine Pfeiltasten-Navigation
      if (selectionMode) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedDay(prev => {
          if (prev === 0) {
            setCurrentWeekOffset(w => w - 1);
            return 5;
          } else if (prev === 6) {
            return 5;
          }
          return prev - 1;
        });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedDay(prev => {
          if (prev === 5 || prev === 6) {
            setCurrentWeekOffset(w => w + 1);
            return 0;
          }
          return prev + 1;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectionMode]);

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 min-w-[320px]">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-gold rounded-xl flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt="Beban"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
          </div>

          {/* Text */}
          <h1 className="text-lg font-semibold text-slate-900 text-center whitespace-nowrap">
            Willkommen zurück
          </h1>
          <p className="text-sm text-slate-400 text-center mt-1 mb-6 whitespace-nowrap">
            Melde dich im Dashboard an
          </p>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('password')}
              autoComplete="current-password"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
            />
            {error && (
              <p className="text-red-500 text-xs text-center">{error}</p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 bg-gold text-slate-900 text-sm font-semibold rounded-lg hover:bg-gold/90 transition-colors"
            >
              Anmelden
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard Content (ohne Sidebar - kommt aus Layout)
  return (
    <div className="h-full flex flex-col gap-2 md:gap-4 overflow-hidden pt-14 md:pt-0">
      {/* Header - Mobile: zwei Zeilen, Desktop: eine Zeile */}
      <header className="bg-slate-50 px-3 md:px-5 py-2 md:py-3 rounded-2xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] border border-slate-200/50 shrink-0">
        {/* Mobile: Erste Zeile - Aktionen und KW */}
        <div className="flex md:hidden items-center justify-between mb-2">
          {/* View Toggle */}
          <div className="flex items-center gap-1">
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => {
                  setViewMode('day');
                  if (selectionMode) handleExitSelectionMode();
                }}
                className={`px-2 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                  viewMode === 'day'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Tag
              </button>
              <button
                onClick={() => {
                  setViewMode('barber');
                  if (selectionMode) handleExitSelectionMode();
                }}
                className={`px-2 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                  viewMode === 'barber'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Woche
              </button>
            </div>

            {/* Selection Mode - Mobile */}
            <button
              onClick={() => selectionMode ? handleExitSelectionMode() : setSelectionMode(true)}
              className={`p-1.5 rounded-lg transition-all ${
                selectionMode ? 'bg-gold text-slate-900' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>

            {/* More Actions Dropdown - Mobile */}
            <button
              onClick={handleShowCancelled}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l16 16" />
              </svg>
            </button>

            {/* Suche - Mobile (Lupe-Icon) */}
            <button
              onClick={() => setShowMobileSearch(true)}
              className={`p-1.5 rounded-lg transition-all ${
                searchHighlightIds.size > 0 ? 'bg-gold text-slate-900' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          {/* KW Navigation - Mobile */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentWeekOffset(prev => prev - 1)}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center w-[60px]">
              <p className="text-[10px] font-bold text-slate-900">KW {weekNumber}</p>
            </div>
            <button
              onClick={() => setCurrentWeekOffset(prev => prev + 1)}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile: Zweite Zeile - Day Tabs (scrollbar) */}
        <div className="flex md:hidden items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => {
              if (viewMode === 'barber') {
                setCurrentWeekOffset(prev => prev - 1);
              } else {
                if (selectedDay === 0) {
                  setCurrentWeekOffset(prev => prev - 1);
                  setSelectedDay(5);
                } else if (selectedDay === 6) {
                  setSelectedDay(5);
                } else {
                  setSelectedDay(prev => prev - 1);
                }
              }
            }}
            className="w-6 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {weekDays.map((day, index) => {
            const isWeekView = viewMode === 'barber';
            const isSundayDisabled = day.isSunday || (isWeekView && day.date.getDay() === 0 && !day.isOpenSunday);
            const isClosedDay = day.isClosed;
            const isSelected = isWeekView ? !isSundayDisabled && !isClosedDay : selectedDay === index;

            return (
              <button
                key={day.dateStr}
                onClick={() => {
                  if (isSundayDisabled) return;
                  if (isWeekView) return;
                  setSelectedDay(index);
                }}
                disabled={isSundayDisabled || isWeekView}
                className={`flex-shrink-0 w-10 py-1.5 rounded-lg text-[10px] font-semibold transition-all relative border-2 ${
                  isSundayDisabled
                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed border-transparent'
                    : isClosedDay
                    ? isSelected
                      ? 'bg-red-100 text-red-600 border-red-200'
                      : 'bg-slate-100 text-slate-400 border-transparent'
                    : isSelected
                    ? 'bg-white text-slate-900 shadow-sm border-gold'
                    : 'bg-slate-100 text-slate-500 border-transparent'
                }`}
              >
                <span className="block text-[9px]">{day.dayName}</span>
                <span className="block text-[10px] font-bold">{day.dayNum}</span>
                {day.isToday && !isSelected && !isSundayDisabled && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-gold rounded-full" />
                )}
              </button>
            );
          })}

          <button
            onClick={() => {
              if (viewMode === 'barber') {
                setCurrentWeekOffset(prev => prev + 1);
              } else {
                if (selectedDay === 5 || selectedDay === 6) {
                  setCurrentWeekOffset(prev => prev + 1);
                  setSelectedDay(0);
                } else {
                  setSelectedDay(prev => prev + 1);
                }
              }
            }}
            className="w-6 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Heute Button - Mobile */}
          <button
            onClick={() => {
              const effective = getEffectiveToday();
              setCurrentWeekOffset(effective.weekOffset);
              setSelectedDay(effective.dayIndex);
            }}
            className={`flex-shrink-0 px-2 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
              currentWeekOffset !== getEffectiveToday().weekOffset || selectedDay !== getEffectiveToday().dayIndex
                ? 'bg-gold/20 text-gold'
                : 'bg-slate-100 text-slate-400'
            }`}
            disabled={currentWeekOffset === getEffectiveToday().weekOffset && selectedDay === getEffectiveToday().dayIndex}
          >
            Heute
          </button>
        </div>

        {/* Desktop: Original Layout */}
        <div className="hidden md:flex items-center">
          {/* View Toggle - Links */}
          <div className="flex-1 flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => {
                  setViewMode('day');
                  if (selectionMode) handleExitSelectionMode();
                }}
                className={`px-3 py-2 text-[11px] font-bold rounded-lg transition-all ${
                  viewMode === 'day'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Tag
              </button>
              <button
                onClick={() => {
                  setViewMode('barber');
                  if (selectionMode) handleExitSelectionMode();
                }}
                className={`px-3 py-2 text-[11px] font-bold rounded-lg transition-all ${
                  viewMode === 'barber'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Woche
              </button>
            </div>

            {/* Selection Mode Toggle */}
            <button
                onClick={() => {
                  if (selectionMode) {
                    handleExitSelectionMode();
                  } else {
                    setSelectionMode(true);
                  }
                }}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                  selectionMode
                    ? 'bg-gold text-slate-900 shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                }`}
                title={selectionMode ? 'Auswahl-Modus beenden' : 'Mehrere Termine löschen'}
              >
                {/* Doppel-Häkchen */}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 13l4 4L15 7" opacity="0.5" />
                </svg>
                {/* Mülleimer */}
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {selectedAppointments.size > 0 && (
                  <span className="px-1.5 py-0.5 bg-white/80 rounded text-[10px] font-bold">
                    {selectedAppointments.size}
                  </span>
                )}
              </button>

            {/* Cancelled Appointments Button */}
            <button
              onClick={handleShowCancelled}
              className="flex items-center justify-center px-3 py-2 rounded-xl transition-all bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200"
              title="Stornierte Termine"
            >
              {/* Durchgestrichener Kalender */}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l16 16" />
              </svg>
            </button>

            {/* Name Display Mode Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNameDropdown(!showNameDropdown)}
                className={`flex items-center justify-center px-3 py-2 rounded-xl transition-all ${
                  showNameDropdown
                    ? 'bg-gold text-slate-900 shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                }`}
                title="Namensanzeige ändern"
              >
                {/* Eye-Off Icon */}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showNameDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowNameDropdown(false)} />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20 min-w-[130px]">
                    <button
                      onClick={() => handleNameDisplayChange('firstName')}
                      className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-50 ${
                        nameDisplayMode === 'firstName' ? 'text-gold font-medium' : 'text-slate-700'
                      }`}
                    >
                      Vorname
                    </button>
                    <button
                      onClick={() => handleNameDisplayChange('lastName')}
                      className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-50 ${
                        nameDisplayMode === 'lastName' ? 'text-gold font-medium' : 'text-slate-700'
                      }`}
                    >
                      Nachname
                    </button>
                    <button
                      onClick={() => handleNameDisplayChange('fullName')}
                      className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-50 ${
                        nameDisplayMode === 'fullName' ? 'text-gold font-medium' : 'text-slate-700'
                      }`}
                    >
                      Vor- & Nachname
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Terminsuche - Desktop: Lupen-Icon expandiert zu Suchfeld */}
            {desktopSearchState !== 'closed' ? (
              <div
                ref={desktopSearchRef}
                className={`overflow-hidden ${
                  desktopSearchState === 'open'
                    ? 'animate-[expandSearch_0.25s_ease-out_forwards]'
                    : 'animate-[collapseSearch_0.2s_ease-in_forwards]'
                }`}
                onAnimationEnd={() => {
                  if (desktopSearchState === 'closing') {
                    setDesktopSearchState('closed');
                  }
                }}
              >
                <AppointmentSearch
                  onNavigate={(date, ids) => {
                    handleSearchNavigate(date, ids);
                    closeDesktopSearch();
                  }}
                  onHighlightChange={handleSearchHighlightChange}
                  onClose={closeDesktopSearch}
                />
              </div>
            ) : (
              <button
                onClick={() => setDesktopSearchState('open')}
                className={`flex items-center justify-center px-3 py-2 rounded-xl transition-all ${
                  searchHighlightIds.size > 0
                    ? 'bg-gold text-slate-900 shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                }`}
                title="Kunde suchen"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}
          </div>

          {/* Day Tabs - Mitte (zentriert, visuell nach rechts versetzt für Kalender-Ausrichtung) */}
          <div className="flex items-center justify-center gap-1 translate-x-[65px]">
          <button
            onClick={() => {
              if (viewMode === 'barber') {
                setCurrentWeekOffset(prev => prev - 1);
              } else {
                if (selectedDay === 0) {
                  setCurrentWeekOffset(prev => prev - 1);
                  setSelectedDay(5);
                } else if (selectedDay === 6) {
                  setSelectedDay(5);
                } else {
                  setSelectedDay(prev => prev - 1);
                }
              }
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-slate-400 hover:text-slate-600 hover:ring-2 hover:ring-gold transition-all shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {weekDays.map((day, index) => {
            const isWeekView = viewMode === 'barber';
            const isSundayDisabled = day.isSunday || (isWeekView && day.date.getDay() === 0 && !day.isOpenSunday);
            const isClosedDay = day.isClosed;
            const isSelected = isWeekView ? !isSundayDisabled && !isClosedDay : selectedDay === index;

            return (
              <button
                key={day.dateStr}
                onClick={() => {
                  if (isSundayDisabled) return;
                  if (isWeekView) return;
                  setSelectedDay(index);
                }}
                disabled={isSundayDisabled || isWeekView}
                title={day.isClosed ? day.closedReason : undefined}
                className={`w-12 py-2 rounded-xl text-[11px] font-semibold transition-all relative border-2 ${
                  isSundayDisabled
                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed border-transparent'
                    : isClosedDay
                    ? isSelected
                      ? 'bg-red-100 text-red-600 border-red-200'
                      : 'bg-slate-100 text-slate-400 border-transparent'
                    : isSelected
                    ? 'bg-white text-slate-900 shadow-sm border-gold'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border-transparent'
                }`}
              >
                <span className="block">{day.dayName}</span>
                <span className="block text-[10px] font-bold">{day.dayNum}</span>
                {isClosedDay && !isSundayDisabled && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-400 rounded-full" />
                )}
                {day.isToday && !isSelected && !isSundayDisabled && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gold rounded-full" />
                )}
              </button>
            );
          })}

          <button
            onClick={() => {
              if (viewMode === 'barber') {
                setCurrentWeekOffset(prev => prev + 1);
              } else {
                if (selectedDay === 5 || selectedDay === 6) {
                  setCurrentWeekOffset(prev => prev + 1);
                  setSelectedDay(0);
                } else {
                  setSelectedDay(prev => prev + 1);
                }
              }
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-slate-400 hover:text-slate-600 hover:ring-2 hover:ring-gold transition-all shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Heute Button */}
          <button
            onClick={() => {
              const effective = getEffectiveToday();
              setCurrentWeekOffset(effective.weekOffset);
              setSelectedDay(effective.dayIndex);
            }}
            className={`ml-1 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              currentWeekOffset !== getEffectiveToday().weekOffset || selectedDay !== getEffectiveToday().dayIndex
                ? 'bg-gold/20 text-gold hover:bg-gold/30'
                : 'bg-slate-100 text-slate-400 cursor-default'
            }`}
            disabled={currentWeekOffset === getEffectiveToday().weekOffset && selectedDay === getEffectiveToday().dayIndex}
          >
            {t('today')}
          </button>
        </div>

          {/* KW Navigation - Rechts */}
          <div className="flex-1 flex items-center gap-1 justify-end">
            <button
              onClick={() => setCurrentWeekOffset(prev => prev - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-slate-400 hover:text-slate-600 hover:ring-2 hover:ring-gold transition-all shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center w-[80px] leading-tight">
              <p className="text-xs font-bold text-slate-900 whitespace-nowrap">
                {t('week')} {weekNumber}
              </p>
              <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                {weekRange}
              </p>
            </div>
            <button
              onClick={() => setCurrentWeekOffset(prev => prev + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-slate-400 hover:text-slate-600 hover:ring-2 hover:ring-gold transition-all shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Calendar View */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 rounded-2xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] border border-slate-200/50 p-2 md:p-4">
        {viewMode === 'day' ? (
          <WeekView
            monday={monday}
            selectedDay={selectedDay}
            closedReason={weekDays[selectedDay]?.closedReason}
            selectionMode={selectionMode}
            selectedAppointments={selectedAppointments}
            onToggleSelect={handleToggleSelect}
            onClearSelection={handleClearSelection}
            onExitSelectionMode={handleExitSelectionMode}
            onSelectedAppointmentsChange={setSelectedAppointments}
            formatName={(name) => formatCustomerName(name, nameDisplayMode)}
            searchHighlightIds={searchHighlightIds}
          />
        ) : (
          <BarberWeekView
            monday={monday}
            formatName={(name) => formatCustomerName(name, nameDisplayMode)}
            selectionMode={selectionMode}
            selectedAppointments={selectedAppointments}
            onToggleSelect={handleToggleSelect}
            onClearSelection={handleClearSelection}
            onExitSelectionMode={handleExitSelectionMode}
            onSelectedAppointmentsChange={setSelectedAppointments}
            searchHighlightIds={searchHighlightIds}
          />
        )}
      </main>

      {/* Mobile Suche Overlay */}
      {showMobileSearch && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => {
            setShowMobileSearch(false);
            setSearchHighlightIds(new Set());
          }} />
          <div className="absolute top-0 left-0 right-0 bg-white p-3 shadow-lg">
            <AppointmentSearch
              onNavigate={(date, ids) => {
                handleSearchNavigate(date, ids);
                setShowMobileSearch(false);
              }}
              onHighlightChange={handleSearchHighlightChange}
              onClose={() => {
                setShowMobileSearch(false);
                setSearchHighlightIds(new Set());
              }}
              isMobile
            />
          </div>
        </div>
      )}

      {/* Stornierte Termine Modal - via Portal */}
      {showCancelledModal && typeof document !== 'undefined' && createPortal(
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 9999,
            }}
            onClick={() => setShowCancelledModal(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '1rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                maxWidth: '32rem',
                width: '100%',
                maxHeight: '80vh',
                overflow: 'hidden',
                pointerEvents: 'auto',
                animation: 'modalFadeIn 0.2s ease-out',
              }}
            >
              <style>{`
                @keyframes modalFadeIn {
                  from { opacity: 0; transform: scale(0.95); }
                  to { opacity: 1; transform: scale(1); }
                }
              `}</style>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>Stornierte Termine</h2>
                <button
                  onClick={() => setShowCancelledModal(false)}
                  onMouseEnter={() => setCloseButtonHover(true)}
                  onMouseLeave={() => setCloseButtonHover(false)}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    background: closeButtonHover ? '#f1f5f9' : 'transparent',
                    border: 'none',
                    transition: 'background-color 0.15s ease, transform 0.15s ease',
                    transform: closeButtonHover ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  <svg style={{ width: '1.25rem', height: '1.25rem', color: closeButtonHover ? '#ef4444' : '#64748b', transition: 'color 0.15s ease' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div style={{ overflowY: 'auto', maxHeight: '60vh' }}>
                {cancelledAppointments.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    <svg style={{ width: '3rem', height: '3rem', margin: '0 auto 0.75rem', color: '#cbd5e1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>Keine stornierten Termine</p>
                  </div>
                ) : (
                  <div>
                    {cancelledAppointments.map((apt, index) => {
                      const date = new Date(apt.date);
                      const cancelledAt = new Date(apt.cancelled_at);
                      const dateStr = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
                      const cancelledStr = `${String(cancelledAt.getDate()).padStart(2, '0')}.${String(cancelledAt.getMonth() + 1).padStart(2, '0')}. ${String(cancelledAt.getHours()).padStart(2, '0')}:${String(cancelledAt.getMinutes()).padStart(2, '0')}`;

                      return (
                        <div key={apt.id} style={{ padding: '1rem', borderTop: index > 0 ? '1px solid #f1f5f9' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <div>
                              <p style={{ fontWeight: 600, color: '#0f172a' }}>{apt.customer_name}</p>
                              <p style={{ fontSize: '0.875rem', color: '#475569' }}>{dateStr} · {apt.time_slot} Uhr</p>
                              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Barber: {apt.barber_name}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, minWidth: '10rem', backgroundColor: apt.cancelled_by === 'customer' ? '#fef3c7' : '#fee2e2', color: apt.cancelled_by === 'customer' ? '#92400e' : '#b91c1c' }}>
                                {apt.cancelled_by === 'customer' ? 'Vom Kunden storniert' : apt.cancelled_by === 'barber' ? 'Vom Barber storniert' : 'Storniert'}
                              </span>
                              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>{cancelledStr}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>Letzte 10 stornierte Termine</p>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
