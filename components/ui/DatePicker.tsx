'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  required?: boolean;
  style?: React.CSSProperties;
}

const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

// Generate years for dropdown (1920 to current year)
function getYearOptions(minYear: number, maxYear: number): number[] {
  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) {
    years.push(y);
  }
  return years;
}

export function DatePicker({ value, onChange, placeholder = 'tt.mm.jjjj', min, max, required, style }: DatePickerProps) {
  const tMonths = useTranslations('months');
  const tDays = useTranslations('days');

  const MONTHS = useMemo(() => MONTH_KEYS.map(key => tMonths(key)), [tMonths]);
  const MONTHS_SHORT = useMemo(() => MONTH_KEYS.map(key => tMonths(`short.${key}`)), [tMonths]);
  const WEEKDAYS = useMemo(() => DAY_KEYS.map(key => tDays(`short.${key}`)), [tDays]);

  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const [year, month] = value.split('-').map(Number);
      return { year, month: month - 1 };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [dropdownPosition, setDropdownPosition] = useState({ top: -9999, left: -9999 });
  const [mounted, setMounted] = useState(false);
  const [typedText, setTypedText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const calendarBtnRef = useRef<HTMLButtonElement>(null);

  // Parse min/max dates
  const minDate = min ? new Date(min + 'T00:00:00') : null;
  const maxDate = max ? new Date(max + 'T00:00:00') : null;

  // Year range for dropdown
  const minYear = min ? parseInt(min.split('-')[0]) : 1920;
  const maxYear = max ? parseInt(max.split('-')[0]) : new Date().getFullYear();
  const yearOptions = getYearOptions(minYear, maxYear);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate dropdown position when opening or when month changes
  useEffect(() => {
    if (!isOpen) {
      setDropdownPosition({ top: -9999, left: -9999 });
      return;
    }
    if (!inputRef.current) return;

    const rect = inputRef.current.getBoundingClientRect();
    const dropdownWidth = 280;
    const padding = 8;

    // Fixed height: 6 rows always
    const dropdownHeight = dropdownRef.current?.offsetHeight || (130 + 6 * 38);

    // Calculate left position - check if it goes off screen to the right
    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - padding) {
      left = window.innerWidth - dropdownWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }

    // Prefer opening above to avoid covering form fields below the input
    let top: number;
    const spaceAbove = rect.top;

    if (spaceAbove >= dropdownHeight + padding) {
      top = rect.top - dropdownHeight - 4;
    } else {
      top = rect.bottom + 4;
    }
    if (top < padding) {
      top = padding;
    }

    setDropdownPosition({ top, left });
  }, [isOpen, viewDate.year, viewDate.month]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        inputRef.current && !inputRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        calendarBtnRef.current && !calendarBtnRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Sync typedText when value changes externally (e.g. from calendar click)
  useEffect(() => {
    const formatted = value ? value.split('-').reverse().join('.') : '';
    setTypedText(formatted);
  }, [value]);

  // Handle keyboard input in tt.mm.jjjj format
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // Only allow digits and dots
    const cleaned = raw.replace(/[^\d.]/g, '');

    // Auto-insert dots after day (2 digits) and month (2 digits)
    let formatted = '';
    const digits = cleaned.replace(/\./g, '');
    for (let i = 0; i < digits.length && i < 8; i++) {
      if (i === 2 || i === 4) formatted += '.';
      formatted += digits[i];
    }

    setTypedText(formatted);

    // Try to parse complete date tt.mm.jjjj
    const match = formatted.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const year = parseInt(match[3], 10);

      // Basic validation
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
        const date = new Date(year, month - 1, day);
        // Verify the date is valid (e.g. not Feb 30)
        if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
          const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          if (!isDateDisabled(year, month - 1, day)) {
            onChange(isoDate);
            setViewDate({ year, month: month - 1 });
          }
        }
      }
    } else if (formatted === '') {
      onChange('');
    }
  }

  // Format display value
  const displayValue = typedText;

  // Get days in month
  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  function getFirstDayOfMonth(year: number, month: number) {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Convert to Monday-based
  }

  // Check if date is disabled
  function isDateDisabled(year: number, month: number, day: number) {
    const date = new Date(year, month, day);
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  }

  // Check if date is selected
  function isDateSelected(year: number, month: number, day: number) {
    if (!value) return false;
    const [selYear, selMonth, selDay] = value.split('-').map(Number);
    return year === selYear && month === selMonth - 1 && day === selDay;
  }

  // Check if date is today
  function isToday(year: number, month: number, day: number) {
    const today = new Date();
    return year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
  }

  // Handle date selection
  function selectDate(day: number) {
    const month = String(viewDate.month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    onChange(`${viewDate.year}-${month}-${dayStr}`);
    setIsOpen(false);
  }

  // Navigate months
  function prevMonth() {
    setViewDate(prev => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { ...prev, month: prev.month - 1 };
    });
  }

  function nextMonth() {
    setViewDate(prev => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { ...prev, month: prev.month + 1 };
    });
  }


  // Generate calendar days
  const daysInMonth = getDaysInMonth(viewDate.year, viewDate.month);
  const firstDay = getFirstDayOfMonth(viewDate.year, viewDate.month);
  const days: (number | null)[] = [];

  // Add empty slots for days before first day
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  // Add actual days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  // Pad to 42 cells (6 rows × 7 columns) for consistent height
  while (days.length < 42) {
    days.push(null);
  }

  const styles: Record<string, React.CSSProperties> = {
    container: {
      position: 'relative',
      display: 'inline-block',
      width: '100%',
    },
    input: {
      width: '100%',
      padding: '0.625rem 0.75rem',
      fontSize: '0.8125rem',
      border: '1px solid #e2e8f0',
      borderRadius: '0.5rem',
      backgroundColor: '#ffffff',
      color: '#0f172a',
      cursor: 'pointer',
      outline: 'none',
      transition: 'border-color 0.15s, box-shadow 0.15s',
      ...style,
    },
    inputFocused: {
      borderColor: '#d4a853',
      boxShadow: '0 0 0 3px rgba(212, 168, 83, 0.1)',
    },
    dropdown: {
      position: 'fixed',
      zIndex: 99999,
      backgroundColor: '#ffffff',
      borderRadius: '0.75rem',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
      border: '1px solid #e2e8f0',
      padding: '0.75rem',
      width: '280px',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '0.75rem',
      padding: '0 0.25rem',
    },
    selectContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    select: {
      padding: '0.375rem 0.5rem',
      fontSize: '0.8125rem',
      fontWeight: 600,
      color: '#0f172a',
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '0.375rem',
      cursor: 'pointer',
      outline: 'none',
      transition: 'all 0.15s',
    },
    navButtons: {
      display: 'flex',
      gap: '0.25rem',
    },
    navBtn: {
      width: '28px',
      height: '28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      backgroundColor: 'transparent',
      borderRadius: '0.375rem',
      cursor: 'pointer',
      color: '#64748b',
      transition: 'all 0.15s',
    },
    weekdays: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '2px',
      marginBottom: '0.5rem',
    },
    weekday: {
      textAlign: 'center',
      fontSize: '0.6875rem',
      fontWeight: 600,
      color: '#94a3b8',
      padding: '0.25rem',
    },
    daysGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '2px',
    },
    day: {
      width: '36px',
      height: '36px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      backgroundColor: 'transparent',
      borderRadius: '0.5rem',
      cursor: 'pointer',
      fontSize: '0.8125rem',
      fontWeight: 500,
      color: '#0f172a',
      transition: 'all 0.15s',
    },
    dayDisabled: {
      color: '#cbd5e1',
      cursor: 'not-allowed',
    },
    daySelected: {
      backgroundColor: '#d4a853',
      color: '#ffffff',
      fontWeight: 600,
    },
    dayToday: {
      border: '2px solid #d4a853',
    },
  };

  const dropdown = (
    <div
      ref={dropdownRef}
      style={{
        ...styles.dropdown,
        top: dropdownPosition.top,
        left: dropdownPosition.left,
      }}
    >
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.selectContainer}>
          <select
            value={viewDate.month}
            onChange={(e) => setViewDate(prev => ({ ...prev, month: parseInt(e.target.value) }))}
            style={styles.select}
            onFocus={(e) => e.currentTarget.style.borderColor = '#d4a853'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
          >
            {MONTHS.map((month, idx) => (
              <option key={month} value={idx}>{MONTHS_SHORT[idx]}</option>
            ))}
          </select>
          <select
            value={viewDate.year}
            onChange={(e) => setViewDate(prev => ({ ...prev, year: parseInt(e.target.value) }))}
            style={styles.select}
            onFocus={(e) => e.currentTarget.style.borderColor = '#d4a853'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
          >
            {yearOptions.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div style={styles.navButtons}>
          <button
            type="button"
            onClick={prevMonth}
            style={styles.navBtn}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={nextMonth}
            style={styles.navBtn}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Weekdays */}
      <div style={styles.weekdays}>
        {WEEKDAYS.map(day => (
          <div key={day} style={styles.weekday}>{day}</div>
        ))}
      </div>

      {/* Days */}
      <div style={styles.daysGrid}>
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} style={{ width: '36px', height: '36px' }} />;
          }

          const disabled = isDateDisabled(viewDate.year, viewDate.month, day);
          const selected = isDateSelected(viewDate.year, viewDate.month, day);
          const today = isToday(viewDate.year, viewDate.month, day);

          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && selectDate(day)}
              style={{
                ...styles.day,
                ...(disabled ? styles.dayDisabled : {}),
                ...(selected ? styles.daySelected : {}),
                ...(today && !selected ? styles.dayToday : {}),
              }}
              onMouseEnter={(e) => {
                if (!disabled && !selected) {
                  e.currentTarget.style.backgroundColor = 'rgba(212, 168, 83, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled && !selected) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

    </div>
  );

  return (
    <div style={styles.container}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          placeholder={placeholder}
          onChange={handleInputChange}
          onFocus={() => {
            // Don't auto-open calendar on focus — user might want to type
          }}
          style={{
            ...styles.input,
            paddingRight: '2.25rem',
            ...(isOpen ? styles.inputFocused : {}),
          }}
          required={required}
        />
        <button
          ref={calendarBtnRef}
          type="button"
          tabIndex={-1}
          onClick={() => setIsOpen(!isOpen)}
          style={{
            position: 'absolute',
            right: '0.5rem',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
          </svg>
        </button>
      </div>

      {mounted && isOpen && createPortal(dropdown, document.body)}
    </div>
  );
}
