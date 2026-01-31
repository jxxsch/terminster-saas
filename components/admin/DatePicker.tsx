'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// Ostersonntag berechnen (Gaußsche Osterformel)
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// Datum formatieren
function formatDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Tage zu Datum addieren
function addDaysToDate(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Gesetzliche Feiertage für NRW berechnen (exportiert für Wiederverwendung)
export function getHolidaysNRW(year: number): Map<string, string> {
  const holidays = new Map<string, string>();
  const easter = getEasterSunday(year);

  // Feste Feiertage
  holidays.set(`${year}-01-01`, 'Neujahr');
  holidays.set(`${year}-05-01`, 'Tag der Arbeit');
  holidays.set(`${year}-10-03`, 'Tag der Deutschen Einheit');
  holidays.set(`${year}-11-01`, 'Allerheiligen'); // NRW spezifisch
  holidays.set(`${year}-12-25`, '1. Weihnachtstag');
  holidays.set(`${year}-12-26`, '2. Weihnachtstag');

  // Bewegliche Feiertage basierend auf Ostern
  holidays.set(formatDateStr(addDaysToDate(easter, -2)), 'Karfreitag');
  holidays.set(formatDateStr(addDaysToDate(easter, 1)), 'Ostermontag');
  holidays.set(formatDateStr(addDaysToDate(easter, 39)), 'Christi Himmelfahrt');
  holidays.set(formatDateStr(addDaysToDate(easter, 50)), 'Pfingstmontag');
  holidays.set(formatDateStr(addDaysToDate(easter, 60)), 'Fronleichnam'); // NRW spezifisch

  return holidays;
}

// Alle Feiertage für Kalender-Anzeige (inkl. Ostersonntag/Pfingstsonntag)
function getGermanHolidays(year: number): Map<string, string> {
  const holidays = getHolidaysNRW(year);
  const easter = getEasterSunday(year);

  // Zusätzlich für Anzeige (keine gesetzlichen Feiertage, aber gut zu wissen)
  holidays.set(formatDateStr(easter), 'Ostersonntag');
  holidays.set(formatDateStr(addDaysToDate(easter, 49)), 'Pfingstsonntag');

  return holidays;
}

// Werktage berechnen (Mo-Sa, ohne Sonntage und Feiertage) - exportiert
export function getWorkingDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let workingDays = 0;

  // Feiertage für alle relevanten Jahre sammeln
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  const allHolidays = new Map<string, string>();

  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = getHolidaysNRW(year);
    yearHolidays.forEach((name, date) => allHolidays.set(date, name));
  }

  // Durch jeden Tag iterieren
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    const dateStr = formatDateStr(current);

    // Sonntag = 0, Samstag = 6
    // Werktage sind Mo-Sa (1-6), also nicht Sonntag (0)
    const isSunday = dayOfWeek === 0;
    const isHoliday = allHolidays.has(dateStr);

    if (!isSunday && !isHoliday) {
      workingDays++;
    }

    current.setDate(current.getDate() + 1);
  }

  return workingDays;
}

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  onClose?: () => void;
  min?: string;
  label?: string;
  autoOpen?: boolean;
  required?: boolean;
  initialMonth?: string; // YYYY-MM-DD - Kalender startet in diesem Monat
  inline?: boolean; // Nur Kalender anzeigen, ohne Input-Feld
}

export function DatePicker({
  value,
  onChange,
  onClose,
  min,
  label,
  autoOpen = false,
  required = false,
  initialMonth,
  inline = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(autoOpen || inline);
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value);
    if (initialMonth) return new Date(initialMonth);
    return new Date();
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  // Client-side only
  useEffect(() => {
    setMounted(true);
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const holidays = getGermanHolidays(viewDate.getFullYear());
  const prevYearHolidays = getGermanHolidays(viewDate.getFullYear() - 1);
  const nextYearHolidays = getGermanHolidays(viewDate.getFullYear() + 1);
  const allHolidays = new Map([...prevYearHolidays, ...holidays, ...nextYearHolidays]);

  // Auto-open when autoOpen prop changes
  useEffect(() => {
    if (autoOpen) {
      setIsOpen(true);
      // Wenn initialMonth gesetzt ist, zu diesem Monat springen
      if (initialMonth) {
        setViewDate(new Date(initialMonth));
      }
    }
  }, [autoOpen, initialMonth]);

  // Update position when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedInContainer = containerRef.current?.contains(target);
      const clickedInDropdown = dropdownRef.current?.contains(target);

      if (!clickedInContainer && !clickedInDropdown) {
        setIsOpen(false);
        onClose?.();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Montag = 0
  };

  const handleDateClick = useCallback((dateStr: string) => {
    if (min && dateStr < min) return;
    onChange(dateStr);
    setIsOpen(false);
    onClose?.();
  }, [min, onChange, onClose]);

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const daysInPrevMonth = getDaysInMonth(year, month - 1);

  const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  // Build calendar grid
  const calendarDays: { day: number; month: number; year: number; dateStr: string; isCurrentMonth: boolean }[] = [];

  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    calendarDays.push({
      day: d,
      month: m,
      year: y,
      dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({
      day: d,
      month,
      year,
      dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      isCurrentMonth: true,
    });
  }

  // Next month days
  const remaining = 42 - calendarDays.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    calendarDays.push({
      day: d,
      month: m,
      year: y,
      dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      isCurrentMonth: false,
    });
  }

  const displayValue = value
    ? new Date(value).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  // Kalender-Content als wiederverwendbare Variable
  const calendarContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-slate-800">
          {monthNames[month]} {year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-slate-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => {
          const isToday = day.dateStr === todayStr;
          const isSelected = day.dateStr === value;
          const holiday = allHolidays.get(day.dateStr);
          const isDisabled = !!(min && day.dateStr < min);
          const isWeekend = (idx % 7) >= 5;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleDateClick(day.dateStr)}
              disabled={isDisabled}
              title={holiday || undefined}
              className={`
                relative w-8 h-8 text-xs rounded-lg transition-all
                ${!day.isCurrentMonth ? 'text-slate-300' : ''}
                ${day.isCurrentMonth && !isSelected && !isToday ? 'text-slate-700 hover:bg-slate-100' : ''}
                ${isWeekend && day.isCurrentMonth && !isSelected && !isToday ? 'text-slate-400' : ''}
                ${isToday && !isSelected ? 'bg-gold/20 text-gold font-semibold ring-1 ring-gold/50' : ''}
                ${isSelected ? 'bg-gold text-black font-semibold' : ''}
                ${holiday && day.isCurrentMonth ? 'text-red-500 font-medium' : ''}
                ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {day.day}
              {holiday && day.isCurrentMonth && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-red-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-4 text-[10px] text-slate-400">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gold/20 ring-1 ring-gold/50" />
          <span>Heute</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1 h-1 bg-red-400 rounded-full" />
          <span>Feiertag</span>
        </div>
      </div>
    </>
  );

  // Inline-Modus: Nur Kalender ohne Input und Portal
  if (inline) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-3 w-[280px]">
        {calendarContent}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      )}
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onClick={() => setIsOpen(true)}
        readOnly
        required={required}
        placeholder="TT.MM.JJJJ"
        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none cursor-pointer"
      />

      {isOpen && mounted && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white rounded-xl shadow-xl border border-slate-200 p-3 w-[280px]"
          style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
        >
          {calendarContent}
        </div>,
        document.body
      )}
    </div>
  );
}
