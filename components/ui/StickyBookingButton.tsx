'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useBooking } from '@/context/BookingContext';
import { useHeroContent } from '@/hooks/useSiteSettings';
import { useTranslations, useLocale } from 'next-intl';

export function StickyBookingButton() {
  const { openBooking } = useBooking();
  const [isVisible, setIsVisible] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // DB-CTA-Text für Deutsch, i18n für andere Sprachen
  const { content: dbContent } = useHeroContent();
  const t = useTranslations('hero');
  const locale = useLocale();

  const ctaText = useMemo(() => {
    if (locale === 'de') {
      return dbContent.ctaText;
    }
    return t('cta');
  }, [locale, dbContent.ctaText, t]);

  // Scroll-Visibility: Button erscheint nach 80% Hero-Scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrolledPastHero = window.scrollY > window.innerHeight * 0.8;
      setIsVisible(scrolledPastHero);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const shouldShow = isVisible;

  return (
    <button
      ref={buttonRef}
      onClick={() => openBooking()}
      className={`
        fixed z-30
        bg-gold text-black font-medium tracking-wider uppercase text-sm
        shadow-[0_-4px_20px_rgba(0,0,0,0.15)]
        hover:bg-gold/90

        /* Transition für sanftes Ein-/Ausblenden */
        transition-[opacity,transform] duration-300 ease-out

        /* Mobile: Full width am unteren Rand */
        left-0 right-0 bottom-0 py-4

        /* Desktop: Zentrierter Pill-Button */
        md:left-1/2 md:-translate-x-1/2
        md:w-auto md:px-10 md:py-3.5 md:rounded-full
        md:shadow-lg md:bottom-6

        ${shouldShow
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none'
        }
      `}
    >
      <span className="flex items-center justify-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {ctaText}
      </span>
    </button>
  );
}
