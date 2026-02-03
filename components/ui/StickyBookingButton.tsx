'use client';

import { useState, useEffect, useRef } from 'react';
import { useBooking } from '@/context/BookingContext';
import { useTranslations } from 'next-intl';

export function StickyBookingButton() {
  const { openBooking } = useBooking();
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [bottomPx, setBottomPx] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const t = useTranslations('nav');

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrolledPastHero = window.scrollY > window.innerHeight * 0.8;
      setIsVisible(scrolledPastHero);

      // Only apply footer logic on mobile
      if (!isMobile) {
        setBottomPx(24); // md:bottom-6 = 24px
        return;
      }

      // Calculate bottom offset to avoid covering footer on mobile
      const contactSection = document.getElementById('contact');
      if (contactSection && buttonRef.current) {
        const contactRect = contactSection.getBoundingClientRect();
        const buttonHeight = buttonRef.current.offsetHeight || 56;

        // Footer links (Impressum, Datenschutz) are in the last ~100px
        const footerLinksStart = contactRect.bottom - 100;

        // Button should stop when its bottom edge reaches footer links
        const maxBottom = window.innerHeight - footerLinksStart;

        if (maxBottom > 0) {
          // Footer is visible, push button up
          setBottomPx(maxBottom);
        } else {
          // Footer not visible, button at bottom
          setBottomPx(0);
        }
      } else {
        setBottomPx(0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  if (!isVisible) return null;

  return (
    <button
      ref={buttonRef}
      onClick={() => openBooking()}
      style={{ bottom: `${bottomPx}px` }}
      className={`
        fixed z-30 transition-[bottom] duration-100 ease-out
        bg-gold text-black font-medium tracking-wider uppercase text-sm
        shadow-[0_-4px_20px_rgba(0,0,0,0.15)]
        hover:bg-gold/90

        /* Mobile: Full width */
        left-0 right-0 py-4

        /* Desktop: Centered pill button */
        md:left-1/2 md:-translate-x-1/2
        md:w-auto md:px-10 md:py-3.5 md:rounded-full
        md:shadow-lg

        ${isVisible ? 'opacity-100' : 'opacity-0'}
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
