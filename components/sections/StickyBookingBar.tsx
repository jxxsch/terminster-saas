'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useBooking } from '@/context/BookingContext';
import { useHeroContent } from '@/hooks/useSiteSettings';
import { useTranslations, useLocale } from 'next-intl';

export function StickyBookingBar() {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, scale: 1 });
  const [isReady, setIsReady] = useState(false);
  const [isInLightArea, setIsInLightArea] = useState(false);
  const { openBooking } = useBooking();
  const { content: dbContent } = useHeroContent();
  const t = useTranslations('hero');
  const locale = useLocale();

  // Use i18n for non-German locales
  const ctaText = useMemo(() => {
    if (locale === 'de') {
      return dbContent.ctaText;
    }
    return t('cta');
  }, [locale, dbContent.ctaText, t]);
  const rafRef = useRef<number | null>(null);

  // Speichere initiale Werte
  const initialValues = useRef<{
    buttonTopInDocument: number;
    buttonLeft: number;
    buttonWidth: number;
    buttonHeight: number;
  } | null>(null);

  const captureInitialPosition = useCallback(() => {
    const heroButton = document.querySelector('#hero .hero-cta-btn') as HTMLElement;
    if (!heroButton || initialValues.current) return;

    const rect = heroButton.getBoundingClientRect();
    initialValues.current = {
      buttonTopInDocument: rect.top + window.scrollY,
      buttonLeft: rect.left,
      buttonWidth: rect.width,
      buttonHeight: rect.height,
    };

    // Jetzt erst den Hero-Button verstecken
    heroButton.style.opacity = '0';
  }, []);

  const updateButtonPosition = useCallback(() => {
    const heroSection = document.getElementById('hero');
    if (!heroSection || !initialValues.current) return;

    const { buttonTopInDocument, buttonLeft, buttonWidth, buttonHeight } = initialValues.current;
    const windowHeight = window.innerHeight;
    const scrollY = window.scrollY;

    const stickyBottom = 48; // Höher positioniert
    const stickyTop = windowHeight - stickyBottom - buttonHeight;

    // FIXE Startposition (ursprüngliche Button-Position im Viewport bei scrollY=0)
    const startTop = buttonTopInDocument;
    // FIXE Endposition (sticky am unteren Rand)
    const endTop = stickyTop;
    // Zentrierte X-Position für End
    const centeredLeft = (window.innerWidth - buttonWidth) / 2;

    // Einfache lineare Interpolation basierend auf Scroll
    // Der Button bewegt sich genau proportional zum Scroll
    const heroHeight = heroSection.offsetHeight;
    const scrollEnd = heroHeight * 0.7; // Bei 70% des Hero-Scrolls ist der Button unten

    // Linearer Progress (0 bis 1)
    const progress = Math.min(Math.max(scrollY / scrollEnd, 0), 1);

    // Rein lineare Interpolation - kein Easing, kein Springen
    const currentTop = startTop + (endTop - startTop) * progress;
    const currentLeft = buttonLeft + (centeredLeft - buttonLeft) * progress;

    // Scale interpoliert auch mit dem Progress (1.0 -> 1.12)
    const startScale = 1;
    const endScale = 1.12;
    const currentScale = startScale + (endScale - startScale) * progress;

    // Prüfe ob der Button den Hero-Bereich verlassen hat
    const heroBottom = heroSection.getBoundingClientRect().bottom;
    setIsInLightArea(currentTop > heroBottom - 50);

    setPosition({
      top: currentTop,
      left: currentLeft,
      width: buttonWidth,
      scale: currentScale,
    });

    setIsReady(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateButtonPosition);
    };

    // Erst Position erfassen, dann updaten
    const timeout = setTimeout(() => {
      captureInitialPosition();
      updateButtonPosition();
    }, 150);

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', () => {
      initialValues.current = null;
      const heroButton = document.querySelector('#hero .hero-cta-btn') as HTMLElement;
      if (heroButton) heroButton.style.opacity = '1';
      setTimeout(() => {
        captureInitialPosition();
        updateButtonPosition();
      }, 50);
    });

    return () => {
      clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('scroll', handleScroll);

      const heroButton = document.querySelector('#hero .hero-cta-btn') as HTMLElement;
      if (heroButton) heroButton.style.opacity = '1';
    };
  }, [captureInitialPosition, updateButtonPosition]);

  if (!isReady) return null;

  return (
    <button
      onClick={() => openBooking()}
      className="sticky-btn-base fixed z-50"
      style={{
        top: position.top,
        left: '50%',
        width: `${position.width}px`,
        transform: `translateX(-50%) scale(${position.scale})`,
        willChange: 'transform',
        background: isInLightArea ? 'var(--color-gold)' : 'transparent',
        color: isInLightArea ? '#ffffff' : 'rgba(212, 175, 55, 0.7)',
        border: isInLightArea ? '1px solid var(--color-gold)' : '1px solid rgba(212, 175, 55, 0.7)',
      }}
    >
      {ctaText}
    </button>
  );
}
