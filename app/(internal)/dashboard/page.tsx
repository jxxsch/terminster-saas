'use client';

import { useState, useEffect, useMemo } from 'react';
import { WeekView } from '@/components/dashboard/WeekView';
import { BarberWeekView } from '@/components/dashboard/BarberWeekView';
import Image from 'next/image';
import { getClosedDates, getOpenSundays, ClosedDate, OpenSunday } from '@/lib/supabase';
import { useTranslations } from 'next-intl';

type ViewMode = 'day' | 'barber';

const DASHBOARD_PASSWORD = 'beban2024';

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
  const t = useTranslations('dashboard');
  const tDays = useTranslations('days');
  const tMonths = useTranslations('months');

  useEffect(() => {
    const session = localStorage.getItem('dashboard_session');
    if (session === 'authenticated') {
      setIsAuthenticated(true);
    }

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
      if (todayIndex !== -1 && !weekDays[todayIndex].isSunday) {
        setSelectedDay(todayIndex);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, []);

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-white border border-slate-200/50 rounded-3xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] p-8 w-full max-w-sm">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-gold rounded-xl flex items-center justify-center shadow-sm">
              <Image
                src="/logo.png"
                alt="Beban Logo"
                width={32}
                height={32}
                className="object-contain"
                priority
              />
            </div>
          </div>

          <h1 className="text-xl font-bold text-center mb-1 text-slate-900">
            Willkommen zurück
          </h1>
          <p className="text-sm text-slate-400 text-center mb-6">
            Melde dich im Dashboard an
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('password')}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none transition-all"
            />
            {error && (
              <p className="text-red-500 text-xs text-center">{error}</p>
            )}
            <button
              type="submit"
              className="w-full py-3 bg-gold text-slate-900 text-sm font-bold tracking-wide uppercase hover:bg-gold/90 transition-colors rounded-xl shadow-sm"
            >
              {t('login')}
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
        <div className="flex items-center bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => setViewMode('day')}
            className={`px-3 py-2 text-[11px] font-bold rounded-lg transition-all ${
              viewMode === 'day'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Tag
          </button>
          <button
            onClick={() => setViewMode('barber')}
            className={`px-3 py-2 text-[11px] font-bold rounded-lg transition-all ${
              viewMode === 'barber'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Woche
          </button>
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
          />
        ) : (
          <BarberWeekView monday={monday} />
        )}
      </main>
    </div>
  );
}
