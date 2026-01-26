'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  required?: boolean;
  style?: React.CSSProperties;
}

const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'
];

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

// Generate years for dropdown (1920 to current year)
function getYearOptions(minYear: number, maxYear: number): number[] {
  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) {
    years.push(y);
  }
  return years;
}

export function DatePicker({ value, onChange, placeholder = 'tt.mm.jjjj', min, max, required, style }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const [year, month] = value.split('-').map(Number);
      return { year, month: month - 1 };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const dropdownWidth = 280;
      const dropdownHeight = 340;
      const padding = 8;

      // Calculate left position - check if it goes off screen to the right
      let left = rect.left;
      if (left + dropdownWidth > window.innerWidth - padding) {
        left = window.innerWidth - dropdownWidth - padding;
      }
      // Make sure it doesn't go off screen to the left
      if (left < padding) {
        left = padding;
      }

      // Calculate top position - check if it goes off screen at the bottom
      let top = rect.bottom + 4;
      if (top + dropdownHeight > window.innerHeight - padding) {
        // Show above the input instead
        top = rect.top - dropdownHeight - 4;
      }
      // Make sure it doesn't go off screen at the top
      if (top < padding) {
        top = padding;
      }

      setDropdownPosition({ top, left });
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        inputRef.current && !inputRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
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

  // Format display value
  const displayValue = value
    ? value.split('-').reverse().join('.')
    : '';

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

  // Go to today
  function goToToday() {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${today.getFullYear()}-${month}-${day}`;

    if (!isDateDisabled(today.getFullYear(), today.getMonth(), today.getDate())) {
      onChange(dateStr);
    }
    setViewDate({ year: today.getFullYear(), month: today.getMonth() });
    setIsOpen(false);
  }

  // Clear date
  function clearDate() {
    onChange('');
    setIsOpen(false);
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
    footer: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '0.75rem',
      paddingTop: '0.75rem',
      borderTop: '1px solid #f1f5f9',
    },
    footerBtn: {
      padding: '0.375rem 0.75rem',
      fontSize: '0.75rem',
      fontWeight: 500,
      border: 'none',
      backgroundColor: 'transparent',
      borderRadius: '0.375rem',
      cursor: 'pointer',
      color: '#64748b',
      transition: 'all 0.15s',
    },
    footerBtnPrimary: {
      color: '#d4a853',
      fontWeight: 600,
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

      {/* Footer */}
      <div style={styles.footer}>
        <button
          type="button"
          onClick={clearDate}
          style={styles.footerBtn}
          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
        >
          Löschen
        </button>
        <button
          type="button"
          onClick={goToToday}
          style={{ ...styles.footerBtn, ...styles.footerBtnPrimary }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(212, 168, 83, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          Heute
        </button>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <input
        ref={inputRef}
        type="text"
        readOnly
        value={displayValue}
        placeholder={placeholder}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...styles.input,
          ...(isOpen ? styles.inputFocused : {}),
        }}
        required={required}
      />

      {mounted && isOpen && createPortal(dropdown, document.body)}
    </div>
  );
}
