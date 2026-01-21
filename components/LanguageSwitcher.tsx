'use client';

import { useState, useRef } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { locales, Locale } from '@/i18n/config';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'globe' | 'vertical';
}

export function LanguageSwitcher({ className = '', variant = 'globe' }: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const handleLocaleChange = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
    setIsOpen(false);
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  // Variante 1: Globe mit Dropdown (öffnet nach unten, außerhalb des Headers)
  if (variant === 'globe') {
    return (
      <div
        className={`relative ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          className="flex items-center gap-2 px-2 py-1.5 text-gray-300 hover:text-gold transition-all duration-300"
          aria-label="Sprache wählen"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
          <span className="text-xs font-light tracking-wider uppercase">{locale}</span>
        </button>

        {/* Dropdown - positioniert sich unterhalb des gesamten Headers */}
        <div
          className={`fixed left-0 right-0 flex justify-center transition-all duration-200 ${
            isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
          }`}
          style={{ top: 'calc(4rem + 1rem + 16px)' }} // Header height + top offset + gap
        >
          <div className="py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg shadow-xl min-w-[100px]">
            {locales.map((loc) => (
              <button
                key={loc}
                onClick={() => handleLocaleChange(loc)}
                className={`w-full flex items-center justify-center px-4 py-2 text-sm transition-all duration-200 ${
                  loc === locale
                    ? 'text-gold bg-white/5'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="font-light tracking-wider uppercase">{loc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Variante 2: Vertical Stack - zentriert im Header
  if (variant === 'vertical') {
    return (
      <div
        className={`relative h-full flex items-center ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="flex flex-col items-center justify-center transition-all duration-300"
          style={{
            gap: isOpen ? '2px' : '0px',
          }}
        >
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => handleLocaleChange(loc)}
              className={`text-[10px] font-light tracking-[0.2em] uppercase transition-all duration-300 ${
                loc === locale
                  ? 'text-gold'
                  : isOpen
                    ? 'text-gray-400 hover:text-white'
                    : 'text-transparent'
              }`}
              style={{
                height: isOpen || loc === locale ? '14px' : '0px',
                opacity: isOpen || loc === locale ? 1 : 0,
                overflow: 'hidden',
                pointerEvents: isOpen || loc === locale ? 'auto' : 'none',
              }}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
