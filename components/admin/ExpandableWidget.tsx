'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';

interface ExpandableWidgetProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  color?: 'default' | 'amber' | 'blue' | 'green' | 'gold';
  children?: ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
}

const colorStyles = {
  default: {
    bg: 'bg-white',
    iconBg: 'bg-gray-100',
    iconText: 'text-gray-600',
    expandedBorder: 'border-gray-300',
  },
  amber: {
    bg: 'bg-white',
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-600',
    expandedBorder: 'border-amber-300',
  },
  blue: {
    bg: 'bg-white',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
    expandedBorder: 'border-blue-300',
  },
  green: {
    bg: 'bg-white',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600',
    expandedBorder: 'border-emerald-300',
  },
  gold: {
    bg: 'bg-white',
    iconBg: 'bg-gold/10',
    iconText: 'text-gold',
    expandedBorder: 'border-gold',
  },
};

export function ExpandableWidget({
  title,
  value,
  subtitle,
  icon,
  color = 'default',
  children,
  isExpanded = false,
  onToggle,
}: ExpandableWidgetProps) {
  const styles = colorStyles[color];
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [children, isExpanded]);

  return (
    <div
      className={`
        rounded-lg border transition-all duration-300 overflow-hidden
        ${isExpanded ? styles.expandedBorder + ' shadow-md' : 'border-gray-200 hover:border-gold hover:shadow-sm'}
        ${styles.bg}
      `}
    >
      {/* Header - Always visible */}
      <button
        onClick={onToggle}
        className="w-full text-left p-4 flex items-center justify-between"
      >
        {/* Left: Icon + Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${styles.iconBg} ${styles.iconText}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-gray-600">{title}</h3>
            {subtitle && (
              <p className="text-xs text-gray-400 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right: Value + Chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xl font-semibold text-black">{value}</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expandable Content */}
      <div
        className="transition-all duration-300 ease-in-out overflow-hidden"
        style={{
          maxHeight: isExpanded ? `${contentHeight}px` : '0px',
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div ref={contentRef} className="border-t border-gray-100">
          {children}
        </div>
      </div>
    </div>
  );
}
