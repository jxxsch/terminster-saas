'use client';

import { useState, useMemo } from 'react';

interface SundayPickerProps {
  value: string;
  onChange: (date: string) => void;
  existingDates?: string[]; // Already selected open sundays
}

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function SundayPicker({ value, onChange, existingDates = [] }: SundayPickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const date = new Date(value);
      return { year: date.getFullYear(), month: date.getMonth() };
    }
    return { year: today.getFullYear(), month: today.getMonth() };
  });

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const { year, month } = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: { date: Date; dateStr: string; isCurrentMonth: boolean; isSunday: boolean; isPast: boolean; isSelected: boolean; isExisting: boolean }[] = [];

    // Find the Monday before or on the first day of the month
    const startDate = new Date(firstDay);
    const dayOfWeek = startDate.getDay();
    // Convert to Monday-based (0 = Monday, 6 = Sunday)
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(startDate.getDate() + mondayOffset);

    // Generate 6 weeks (42 days)
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = formatDateLocal(date);

      days.push({
        date,
        dateStr,
        isCurrentMonth: date.getMonth() === month,
        isSunday: date.getDay() === 0,
        isPast: date < today,
        isSelected: dateStr === value,
        isExisting: existingDates.includes(dateStr),
      });
    }

    return days;
  }, [currentMonth, value, existingDates, today]);

  const goToPrevMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const handleDayClick = (day: typeof calendarDays[0]) => {
    if (!day.isSunday || day.isPast || day.isExisting) return;
    onChange(day.dateStr);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 w-[280px]">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={goToPrevMonth}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-medium text-black">
          {MONTH_NAMES[currentMonth.month]} {currentMonth.year}
        </span>
        <button
          type="button"
          onClick={goToNextMonth}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day names header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_NAMES.map((name, i) => (
          <div
            key={name}
            className={`text-center text-[10px] font-medium py-1 ${
              i === 6 ? 'text-gold' : 'text-gray-400'
            }`}
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, i) => {
          const isClickable = day.isSunday && !day.isPast && !day.isExisting;

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleDayClick(day)}
              disabled={!isClickable}
              className={`
                relative w-8 h-8 text-xs rounded-full flex items-center justify-center transition-all
                ${!day.isCurrentMonth ? 'text-gray-300' : ''}
                ${day.isSunday && day.isCurrentMonth ? 'bg-gold/10 font-medium' : ''}
                ${day.isSunday && !day.isPast && !day.isExisting && day.isCurrentMonth ? 'text-gold hover:bg-gold hover:text-white cursor-pointer' : ''}
                ${day.isPast && day.isSunday ? 'text-gray-300 bg-gray-50' : ''}
                ${!day.isSunday ? 'text-gray-300 cursor-not-allowed' : ''}
                ${day.isSelected ? 'bg-gold text-white ring-2 ring-gold ring-offset-1' : ''}
                ${day.isExisting && !day.isSelected ? 'bg-green-100 text-green-600 cursor-not-allowed' : ''}
              `}
            >
              {day.date.getDate()}
              {day.isExisting && !day.isSelected && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-[10px] text-gray-500">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-gold/20 border border-gold/30" />
          <span>Sonntag</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-100 border border-green-300" />
          <span>Bereits geplant</span>
        </div>
      </div>
    </div>
  );
}
