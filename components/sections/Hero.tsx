'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useBooking } from '@/context/BookingContext';
import { useTranslations } from 'next-intl';
import { useHeroSettings } from '@/hooks/useSiteSettings';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

// Filter-CSS-Mappings
const FILTER_CSS: Record<string, (intensity: number) => string> = {
  darken: (i) => `brightness(${1 - i * 0.006})`,  // 0.4-1.0
  blur: (i) => `blur(${i * 0.1}px)`,  // 0-10px
  glass: (i) => `saturate(${1 + i * 0.01}) contrast(${1 + i * 0.005})`,
  grayscale: (i) => `grayscale(${i}%)`,
  sepia: (i) => `sepia(${i * 0.5}%)`,  // 0-50%
  contrast: (i) => `contrast(${100 + i * 0.5}%)`,  // 100-150%
  desaturate: (i) => `saturate(${100 - i * 0.7}%)`,  // 30-100%
  vignette: () => '',  // Vignette wird per CSS umgesetzt
  gradient: () => '',  // Gradient wird per Overlay umgesetzt
  warm: (i) => `sepia(${i * 0.2}%) saturate(${100 + i * 0.3}%)`,
};

export function Hero() {
  const [status, setStatus] = useState<{ isOpen: boolean; message: string } | null>(null);
  const { openBooking } = useBooking();
  const t = useTranslations('hero');
  const tDays = useTranslations('days');
  const { settings: heroSettings, getLocalizedText, isLoading } = useHeroSettings();

  const { background } = heroSettings;

  // Build YouTube embed URL dynamically
  const youtubeEmbedUrl = useMemo(() => {
    if (background.type !== 'video' || !background.youtube_id) return null;

    const params = new URLSearchParams({
      autoplay: '1',
      mute: '1',
      controls: '0',
      showinfo: '0',
      modestbranding: '1',
      rel: '0',
      iv_load_policy: '3',
      disablekb: '1',
      playsinline: '1',
    });

    if (background.video_start > 0) {
      params.set('start', background.video_start.toString());
    }
    if (background.video_end > 0) {
      params.set('end', background.video_end.toString());
    }
    if (background.video_loop) {
      params.set('loop', '1');
      params.set('playlist', background.youtube_id);
    }

    return `https://www.youtube.com/embed/${background.youtube_id}?${params.toString()}`;
  }, [background]);

  // Build CSS filter string from selected filters
  const filterStyle = useMemo(() => {
    if (!background.filters || background.filters.length === 0) return '';

    const intensity = background.filter_intensity || 50;
    const filterStrings = background.filters
      .filter(f => FILTER_CSS[f] && f !== 'vignette' && f !== 'gradient')
      .map(f => FILTER_CSS[f](intensity))
      .filter(Boolean);

    return filterStrings.join(' ');
  }, [background.filters, background.filter_intensity]);

  // Check for vignette and gradient
  const hasVignette = background.filters?.includes('vignette');
  const hasGradient = background.filters?.includes('gradient');
  const vignetteIntensity = (background.filter_intensity || 50) / 100;

  // Get title and subtitle from settings, fallback to defaults
  const heroTitle = getLocalizedText(heroSettings.title) || 'BEBAN BARBER SHOP 2.0';
  const heroSubtitle = getLocalizedText(heroSettings.subtitle) || t('slogan');

  const getShopStatus = useCallback((): { isOpen: boolean; message: string } => {
    const now = new Date();
    const germanTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));

    const day = germanTime.getDay();
    const hours = germanTime.getHours();
    const minutes = germanTime.getMinutes();
    const currentTime = hours * 60 + minutes;

    const openTime = 10 * 60;
    const closeTime = 19 * 60;

    const isOpen = day !== 0 && currentTime >= openTime && currentTime < closeTime;

    if (isOpen) {
      return { isOpen: true, message: t('status.openUntil', { time: '19:00' }) };
    }

    if (day !== 0 && currentTime < openTime) {
      return { isOpen: false, message: t('status.opensToday', { time: '10:00' }) };
    }

    let nextDay = day;
    do {
      nextDay = (nextDay + 1) % 7;
    } while (nextDay === 0);

    const nextDayName = tDays(`short.${DAY_KEYS[nextDay]}`);
    return { isOpen: false, message: t('status.opensOn', { day: nextDayName, time: '10:00' }) };
  }, [t, tDays]);

  useEffect(() => {
    setStatus(getShopStatus());

    const interval = setInterval(() => {
      setStatus(getShopStatus());
    }, 60000);

    return () => clearInterval(interval);
  }, [getShopStatus]);

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Dynamischer Hintergrund: Video oder Bild */}
      {background.type === 'video' && youtubeEmbedUrl ? (
        <div
          className="absolute inset-0 pointer-events-none scale-150"
          style={{ filter: filterStyle || undefined }}
        >
          <iframe
            src={youtubeEmbedUrl}
            allow="autoplay; encrypted-media"
            allowFullScreen
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300vw] h-[300vh] md:w-[200vw] md:h-[200vh]"
            style={{ border: 'none' }}
          />
        </div>
      ) : background.type === 'image' && background.image_url ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${background.image_url})`,
            filter: filterStyle || undefined
          }}
        />
      ) : (
        // Fallback: Standard-Video
        <div className="absolute inset-0 pointer-events-none scale-150">
          <iframe
            src="https://www.youtube.com/embed/3vCGQvscX34?start=24&end=54&autoplay=1&mute=1&loop=1&playlist=3vCGQvscX34&controls=0&showinfo=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&playsinline=1"
            allow="autoplay; encrypted-media"
            allowFullScreen
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300vw] h-[300vh] md:w-[200vw] md:h-[200vh]"
            style={{ border: 'none' }}
          />
        </div>
      )}

      {/* Vignette Overlay */}
      {hasVignette && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,${vignetteIntensity * 0.8}) 100%)`
          }}
        />
      )}

      {/* Gradient Overlay */}
      {hasGradient && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to bottom, rgba(0,0,0,${vignetteIntensity * 0.5}) 0%, transparent 30%, transparent 70%, rgba(0,0,0,${vignetteIntensity * 0.7}) 100%)`
          }}
        />
      )}

      {/* Standard-Overlay für Lesbarkeit */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/70" />
      <div className="absolute inset-0 bg-[#1a1510]/50" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
        {/* Titel */}
        <h1 className="text-4xl md:text-6xl font-light text-white/85 tracking-[0.6em] mb-4">
          {heroTitle.includes('2.0') ? (
            <>
              {heroTitle.replace('2.0', '').trim()} <span className="text-gold/85">2.0</span>
            </>
          ) : (
            heroTitle
          )}
        </h1>

        {/* Slogan */}
        <p className="text-lg md:text-xl text-gray-300 font-light tracking-wide mb-12 whitespace-nowrap">
          {heroSubtitle}
        </p>

        {/* Action Buttons - Footer Style */}
        <div className="flex items-center gap-4">
          {/* Telefon */}
          <div className="relative group">
            <a
              href="#contact"
              className="w-12 h-12 border border-white/40 rounded-sm flex items-center justify-center hover:border-gold transition-all"
              aria-label={t('aria.contact')}
            >
              <svg className="w-5 h-5 text-white/70 group-hover:text-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </a>
            {/* Tooltip */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 px-4 py-2 bg-black/50 border border-white/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              <span className="text-xs font-light tracking-wide text-white/80">
                {heroSettings.phone || '+49 214 123 4567'}
              </span>
            </div>
          </div>

          {/* Standort */}
          <div className="relative group">
            <a
              href="#contact"
              className="w-12 h-12 border border-white/40 rounded-sm flex items-center justify-center hover:border-gold transition-all"
              aria-label={t('aria.location')}
            >
              <svg className="w-5 h-5 text-white/70 group-hover:text-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </a>
            {/* Tooltip */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 px-4 py-2 bg-black/50 border border-white/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              <span className="text-xs font-light tracking-wide text-white/80">
                {t('tooltips.location')}
              </span>
            </div>
          </div>

          {/* Öffnungszeiten */}
          <div className="relative group">
            <a
              href="#contact"
              className="w-12 h-12 border border-white/40 rounded-sm flex items-center justify-center hover:border-gold transition-all"
              aria-label={status?.isOpen ? t('aria.open') : t('aria.closed')}
            >
              <svg className="w-5 h-5 text-white/70 group-hover:text-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </a>

            {/* Tooltip bei Hover */}
            {status && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 px-4 py-2 bg-black/50 border border-white/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                <span className="text-xs font-light tracking-wide text-white/80">
                  {status.message}
                </span>
              </div>
            )}
          </div>

          {/* Termin buchen */}
          <div className="relative group">
            <button
              onClick={() => openBooking()}
              className="w-12 h-12 border border-white/40 rounded-sm flex items-center justify-center hover:border-gold transition-all"
              aria-label={t('aria.bookAppointment')}
            >
              <svg className="w-5 h-5 text-white/70 group-hover:text-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            {/* Tooltip bei Hover */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 px-4 py-2 bg-black/50 border border-white/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              <span className="text-xs font-light tracking-wide text-white/80">
                {t('tooltips.slotsAvailable', { count: 5 })}
              </span>
            </div>
          </div>
        </div>

        {/* Scroll Down Indicator */}
        <a
          href="#services"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"
          aria-label={t('aria.scrollDown')}
        >
          <svg className="w-8 h-8 text-white/60 hover:text-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </a>
      </div>
    </section>
  );
}
