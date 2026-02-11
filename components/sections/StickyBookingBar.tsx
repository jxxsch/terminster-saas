'use client';

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useBooking } from '@/context/BookingContext';
import { useHeroContent } from '@/hooks/useSiteSettings';
import { useTranslations, useLocale } from 'next-intl';

export function StickyBookingBar() {
  const { openBooking } = useBooking();
  const { content: dbContent } = useHeroContent();
  const t = useTranslations('hero');
  const locale = useLocale();

  const ctaText = useMemo(() => {
    if (locale === 'de') {
      return dbContent.ctaText;
    }
    return t('cta');
  }, [locale, dbContent.ctaText, t]);

  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const isFooterVisibleRef = useRef(false);

  // Einmalig erfasste Werte — kein State, kein Re-Render
  const initialValues = useRef<{
    buttonTopInDocument: number;
    buttonLeft: number;
    buttonWidth: number;
    buttonHeight: number;
    heroHeight: number;
  } | null>(null);

  const captureInitialPosition = useCallback(() => {
    const heroButton = document.querySelector('#hero .hero-cta-btn') as HTMLElement;
    const heroSection = document.getElementById('hero');
    if (!heroButton || !heroSection || initialValues.current) return;

    const rect = heroButton.getBoundingClientRect();
    initialValues.current = {
      buttonTopInDocument: rect.top + window.scrollY,
      buttonLeft: rect.left,
      buttonWidth: rect.width,
      buttonHeight: rect.height,
      heroHeight: heroSection.offsetHeight,
    };

    // Hero-Button verstecken — der Klon übernimmt
    heroButton.style.opacity = '0';
    heroButton.style.pointerEvents = 'none';
  }, []);

  // Direkte DOM-Manipulation — kein setState, kein React-Re-Render
  const updatePosition = useCallback(() => {
    const el = containerRef.current;
    const vals = initialValues.current;
    if (!el || !vals) return;

    const { buttonTopInDocument, buttonLeft, buttonWidth, buttonHeight, heroHeight } = vals;
    const windowHeight = window.innerHeight;
    const scrollY = window.scrollY;

    const stickyBottom = 48;
    const stickyTop = windowHeight - stickyBottom - buttonHeight;
    const centeredLeft = (window.innerWidth - buttonWidth) / 2;

    const scrollEnd = heroHeight * 0.7;
    const progress = Math.min(Math.max(scrollY / scrollEnd, 0), 1);

    // Viewport-relative Position (fixed Element = viewport-Koordinaten)
    const currentTop = buttonTopInDocument + (stickyTop - buttonTopInDocument) * progress;
    const currentLeft = buttonLeft + (centeredLeft - buttonLeft) * progress;
    const currentScale = 1 + 0.12 * progress;

    // Footer erreicht → sanft ausblenden
    const hide = isFooterVisibleRef.current;

    el.style.transform = `translate(${currentLeft}px, ${currentTop}px) scale(${currentScale})`;
    el.style.opacity = hide ? '0' : '1';
    el.style.pointerEvents = hide ? 'none' : '';
  }, []);

  // IntersectionObserver für Footer — kein getBoundingClientRect pro Frame
  useEffect(() => {
    const contactSection = document.getElementById('contact');
    if (!contactSection) return;

    const observer = new IntersectionObserver(
      (entries) => {
        isFooterVisibleRef.current = entries[0].isIntersecting;
        // Sofort Position/Sichtbarkeit aktualisieren
        updatePosition();
      },
      { threshold: 0.1 }
    );

    observer.observe(contactSection);
    return () => observer.disconnect();
  }, [updatePosition]);

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updatePosition);
    };

    const handleResize = () => {
      initialValues.current = null;
      const heroButton = document.querySelector('#hero .hero-cta-btn') as HTMLElement;
      if (heroButton) {
        heroButton.style.opacity = '1';
        heroButton.style.pointerEvents = '';
      }
      requestAnimationFrame(() => {
        captureInitialPosition();
        updatePosition();
      });
    };

    // Init: Position erfassen sobald Hero gerendert ist
    requestAnimationFrame(() => {
      captureInitialPosition();
      updatePosition();
    });

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);

      const heroButton = document.querySelector('#hero .hero-cta-btn') as HTMLElement;
      if (heroButton) {
        heroButton.style.opacity = '1';
        heroButton.style.pointerEvents = '';
      }
    };
  }, [captureInitialPosition, updatePosition]);

  return (
    <div
      ref={containerRef}
      className="fixed top-0 left-0 z-30 transition-opacity duration-300"
      style={{ opacity: 0, willChange: 'transform' }}
    >
      <button
        onClick={() => openBooking()}
        className="hero-cta-btn"
        style={{
          background: 'var(--color-gold)',
          color: '#ffffff',
        }}
      >
        {ctaText}
      </button>
    </div>
  );
}
