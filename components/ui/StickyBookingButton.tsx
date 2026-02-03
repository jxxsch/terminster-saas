'use client';

import { useState, useEffect } from 'react';
import { useBooking } from '@/context/BookingContext';
import { useTranslations } from 'next-intl';

export function StickyBookingButton() {
  const { openBooking } = useBooking();
  const [isVisible, setIsVisible] = useState(false);
  const t = useTranslations('nav');

  useEffect(() => {
    const handleScroll = () => {
      // Show button after scrolling past 80% of viewport height
      setIsVisible(window.scrollY > window.innerHeight * 0.8);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <button
      onClick={() => openBooking()}
      className={`
        fixed z-40 transition-all duration-300
        bg-gold text-black font-medium tracking-wider uppercase text-sm
        shadow-[0_-4px_20px_rgba(0,0,0,0.15)]
        hover:bg-gold/90

        /* Mobile: Full width at bottom */
        bottom-0 left-0 right-0 py-4

        /* Desktop: Centered pill button */
        md:bottom-6 md:left-1/2 md:-translate-x-1/2
        md:w-auto md:px-10 md:py-3.5 md:rounded-full
        md:shadow-lg

        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
      `}
    >
      <span className="flex items-center justify-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {t('bookNow')}
      </span>
    </button>
  );
}
