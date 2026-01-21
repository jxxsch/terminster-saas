'use client';

import { useState, useEffect, useMemo } from 'react';
import { WeekView } from '@/components/dashboard/WeekView';
import { BarberWeekView } from '@/components/dashboard/BarberWeekView';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import Image from 'next/image';
import { getClosedDates, getOpenSundays, ClosedDate, OpenSunday } from '@/lib/supabase';
import { useTranslations } from 'next-intl';

type ViewMode = 'day' | 'barber';

const DASHBOARD_PASSWORD = 'beban2024';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;

// Helper: Format date as YYYY-MM-DD in local timezone (not UTC)
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
  const t = useTranslations('dashboard');
  const tDays = useTranslations('days');
  const tMonths = useTranslations('months');

  useEffect(() => {
    const session = localStorage.getItem('dashboard_session');
    if (session === 'authenticated') {
      setIsAuthenticated(true);
    }
    // Load closed dates and open sundays
    getClosedDates().then(setClosedDates);
    getOpenSundays().then(setOpenSundays);
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

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('dashboard_session');
  };

  const monday = useMemo(() => getMondayOfWeek(currentWeekOffset), [currentWeekOffset]);
  const weekNumber = useMemo(() => getWeekNumber(monday), [monday]);

  // Week date range for display
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

  // Generate week days for tabs (Mo-So)
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
      // Sonntag ist nur disabled, wenn es KEIN verkaufsoffener Sonntag ist
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

  // Auto-select today only on initial load
  useEffect(() => {
    if (currentWeekOffset === 0) {
      const todayIndex = weekDays.findIndex(d => d.isToday);
      if (todayIndex !== -1 && !weekDays[todayIndex].isSunday) {
        setSelectedDay(todayIndex);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard navigation for days
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedDay(prev => {
          if (prev === 0) {
            setCurrentWeekOffset(w => w - 1);
            return 5; // Samstag
          } else if (prev === 6) {
            return 5; // Sonntag -> Samstag
          }
          return prev - 1;
        });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedDay(prev => {
          if (prev === 5 || prev === 6) {
            setCurrentWeekOffset(w => w + 1);
            return 0; // Montag
          }
          return prev + 1;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative w-16 h-16">
              <Image
                src="/logo.png"
                alt="Beban Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-lg">
            <h1 className="text-lg font-light text-center mb-6 tracking-wide text-black">
              Dashboard <span className="text-gold">Login</span>
            </h1>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('password')}
                  className="w-full p-3 bg-white border border-gray-200 rounded text-sm text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors"
                />
              </div>
              {error && (
                <p className="text-red-500 text-xs text-center">{error}</p>
              )}
              <button
                type="submit"
                className="w-full py-3 bg-gold text-black text-sm font-medium tracking-wider uppercase hover:bg-gold-light transition-colors rounded"
              >
                {t('login')}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Compact Header */}
      <header className="bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800 px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 w-full">
          {/* Logo */}
          <div className="relative w-8 h-8 flex-shrink-0">
            <Image
              src="/logo.png"
              alt="Beban Logo"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Day Tabs with Navigation - immer sichtbar */}
          <div className="flex items-center gap-1 flex-1 justify-center">
            {/* Vorheriger Tag - nur in Tagesansicht aktiv */}
            <button
              onClick={() => {
                if (viewMode !== 'day') return;
                if (selectedDay === 0) {
                  setCurrentWeekOffset(prev => prev - 1);
                  setSelectedDay(5);
                } else if (selectedDay === 6) {
                  setSelectedDay(5);
                } else {
                  setSelectedDay(prev => prev - 1);
                }
              }}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'day'
                  ? 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                  : 'text-gray-200 cursor-default'
              }`}
              aria-label={t('previousDay')}
              disabled={viewMode !== 'day'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {weekDays.map((day, index) => {
              const isDisabled = day.isSunday;
              const isClosedDay = day.isClosed;
              const isWeekView = viewMode === 'barber';
              // In Wochen-/Barber-Ansicht: alle Tage markiert (außer Sonntag)
              const isSelected = isWeekView ? !isDisabled : selectedDay === index;

              return (
                <button
                  key={day.dateStr}
                  onClick={() => {
                    if (isDisabled) return;
                    if (isWeekView) {
                      // Bei Klick in Wochen-/Barber-Ansicht: zur Tagesansicht wechseln
                      setViewMode('day');
                    }
                    setSelectedDay(index);
                  }}
                  disabled={isDisabled}
                  title={day.isClosed ? day.closedReason : undefined}
                  className={`w-14 py-1.5 rounded text-xs font-medium transition-all relative text-center ${
                    isDisabled
                      ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      : isClosedDay
                      ? isSelected
                        ? 'bg-red-100 text-red-600 border border-red-300'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      : day.isToday
                      ? 'bg-gold/20 text-gold'
                      : isSelected
                      ? isWeekView
                        ? 'bg-gold/20 text-gold border border-gold/30'
                        : 'bg-gold text-black'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  <span>{day.dayName}</span>
                  <span className="ml-1">{day.dayNum}</span>
                  {day.isToday && !isSelected && !isClosedDay && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-gold rounded-full"></span>
                  )}
                  {isClosedDay && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                  )}
                </button>
              );
            })}

            {/* Nächster Tag - nur in Tagesansicht aktiv */}
            <button
              onClick={() => {
                if (viewMode !== 'day') return;
                if (selectedDay === 5) {
                  setCurrentWeekOffset(prev => prev + 1);
                  setSelectedDay(0);
                } else if (selectedDay === 6) {
                  setCurrentWeekOffset(prev => prev + 1);
                  setSelectedDay(0);
                } else {
                  setSelectedDay(prev => prev + 1);
                }
              }}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'day'
                  ? 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                  : 'text-gray-200 cursor-default'
              }`}
              aria-label={t('nextDay')}
              disabled={viewMode !== 'day'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* View Toggle Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('day')}
              className={`w-20 flex items-center justify-center gap-1.5 py-1.5 text-[11px] rounded font-medium transition-colors ${
                viewMode === 'day'
                  ? 'bg-gold/20 text-gold'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {/* Team Icon - alle Barber an einem Tag */}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Tag</span>
            </button>
            <button
              onClick={() => setViewMode('barber')}
              className={`w-20 flex items-center justify-center gap-1.5 py-1.5 text-[11px] rounded font-medium transition-colors ${
                viewMode === 'barber'
                  ? 'bg-gold/20 text-gold'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {/* User + Calendar Icon - ein Barber über die Woche */}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Woche</span>
            </button>
          </div>

          {/* Week Info with Navigation */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setCurrentWeekOffset(prev => prev - 1)}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-400 hover:text-gray-600"
              aria-label={t('previousWeek')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <span className="text-xs font-medium text-gray-600 text-center whitespace-nowrap w-[140px]">
              {t('week')} {weekNumber} · {weekRange}
            </span>

            <button
              onClick={() => setCurrentWeekOffset(prev => prev + 1)}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-400 hover:text-gray-600"
              aria-label={t('nextWeek')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => {
                setCurrentWeekOffset(0);
                const today = new Date();
                const dayOfWeek = today.getDay();
                // Sonntag (0) -> Montag (0), sonst Tag - 1 (weil Array bei Montag=0 startet)
                const todayIndex = dayOfWeek === 0 ? 0 : dayOfWeek - 1;
                setSelectedDay(todayIndex);
              }}
              className={`ml-1 px-2 py-1 text-[10px] rounded font-medium transition-colors ${
                currentWeekOffset !== 0 || !weekDays[selectedDay]?.isToday
                  ? 'bg-gold/20 text-gold hover:bg-gold/30'
                  : 'bg-gray-100 text-gray-400 cursor-default'
              }`}
              disabled={currentWeekOffset === 0 && weekDays[selectedDay]?.isToday}
            >
              {t('today')}
            </button>
          </div>

          {/* Dark Mode Toggle */}
          <DarkModeToggle />

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
            aria-label={t('logout')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content - fills remaining space */}
      <main className="flex-1 px-4 pb-3 pt-3 overflow-hidden flex flex-col">
        {viewMode === 'day' ? (
          <WeekView
            monday={monday}
            selectedDay={selectedDay}
            closedReason={weekDays[selectedDay]?.closedReason}
          />
        ) : (
          <BarberWeekView monday={monday} />
        )}
      </main>
    </div>
  );
}
