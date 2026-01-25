'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { WeekView } from '@/components/dashboard/WeekView';
import { BarberWeekView } from '@/components/dashboard/BarberWeekView';
import Image from 'next/image';
import { getClosedDates, getOpenSundays, ClosedDate, OpenSunday } from '@/lib/supabase';
import { useTranslations } from 'next-intl';

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

export default function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [openSundays, setOpenSundays] = useState<OpenSunday[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedAppointments, setSelectedAppointments] = useState<Set<string>>(new Set());
  const [nameDisplayMode, setNameDisplayMode] = useState<NameDisplayMode>('lastName');
  const [showNameDropdown, setShowNameDropdown] = useState(false);
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

    getClosedDates().then(setClosedDates);
    getOpenSundays().then(setOpenSundays);
  }, []);

  // Namensanzeige speichern wenn geändert
  const handleNameDisplayChange = useCallback((mode: NameDisplayMode) => {
    setNameDisplayMode(mode);
    localStorage.setItem('dashboard_name_display', mode);
    setShowNameDropdown(false);
  }, []);

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
    if (currentWeekOffset === 0) {
      const todayIndex = weekDays.findIndex(d => d.isToday);
      if (todayIndex !== -1) {
        const today = weekDays[todayIndex];
        // Wenn heute Sonntag ist und kein verkaufsoffener Sonntag, zum nächsten offenen Tag wechseln
        if (today.isSunday) {
          // Nächste Woche, Montag (oder nächster offener Tag)
          setCurrentWeekOffset(1);
          setSelectedDay(0); // Montag der nächsten Woche
        } else if (today.isClosed) {
          // Wenn heute geschlossen ist (Feiertag), nächsten offenen Tag finden
          const nextOpenDay = weekDays.findIndex((d, i) => i > todayIndex && !d.isSunday && !d.isClosed);
          if (nextOpenDay !== -1) {
            setSelectedDay(nextOpenDay);
          } else {
            // Kein offener Tag mehr diese Woche, nächste Woche Montag
            setCurrentWeekOffset(1);
            setSelectedDay(0);
          }
        } else {
          setSelectedDay(todayIndex);
        }
      }
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
              <Image
                src="/logo.png"
                alt="Beban"
                width={28}
                height={28}
                className="object-contain"
                priority
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
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <header className="bg-slate-50 px-5 py-3 flex items-center rounded-2xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] border border-slate-200/50 shrink-0">
        {/* View Toggle - Links */}
        <div className="flex items-center gap-2">
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
        </div>

        {/* Day Tabs - Mitte (zentriert) */}
        <div className="flex-1 flex items-center justify-center gap-1">
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
                className={`w-12 py-2 rounded-xl text-[11px] font-semibold transition-all relative ${
                  isSundayDisabled
                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    : isClosedDay
                    ? isSelected
                      ? 'bg-red-100 text-red-600 border border-red-200'
                      : 'bg-slate-100 text-slate-400'
                    : isSelected
                    ? 'bg-white text-slate-900 shadow-sm border-2 border-gold'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
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
              setCurrentWeekOffset(0);
              const today = new Date();
              const dayOfWeek = today.getDay();
              const todayIndex = dayOfWeek === 0 ? 0 : dayOfWeek - 1;
              setSelectedDay(todayIndex);
            }}
            className={`ml-1 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              currentWeekOffset !== 0 || !weekDays[selectedDay]?.isToday
                ? 'bg-gold/20 text-gold hover:bg-gold/30'
                : 'bg-slate-100 text-slate-400 cursor-default'
            }`}
            disabled={currentWeekOffset === 0 && weekDays[selectedDay]?.isToday}
          >
            {t('today')}
          </button>
        </div>

        {/* KW Navigation - Rechts (feste Breite) */}
        <div className="flex items-center gap-1 w-[160px] justify-end">
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
      </header>

      {/* Main Calendar View */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 rounded-2xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] border border-slate-200/50 p-4">
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
          />
        )}
      </main>
    </div>
  );
}
