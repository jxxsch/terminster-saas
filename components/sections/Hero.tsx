'use client';

import { useMemo } from 'react';
import { useBooking } from '@/context/BookingContext';
import { useHeroSettings, useHeroContent } from '@/hooks/useSiteSettings';

// Filter-CSS-Mappings
const FILTER_CSS: Record<string, (intensity: number) => string> = {
  darken: (i) => `brightness(${1 - i * 0.007})`,
  blur: (i) => `blur(${i * 0.15}px)`,
  grayscale: (i) => `grayscale(${i}%)`,
  sepia: (i) => `sepia(${i}%)`,
};

export function Hero() {
  const { openBooking } = useBooking();
  const { settings: heroSettings } = useHeroSettings();
  const { content } = useHeroContent();
  const { background } = heroSettings;

  // Build YouTube embed URL
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

  // Build CSS filter string
  const filterStyle = useMemo(() => {
    if (!background.filters || Object.keys(background.filters).length === 0) return '';
    return Object.entries(background.filters)
      .map(([key, intensity]) => FILTER_CSS[key] ? FILTER_CSS[key](intensity) : '')
      .filter(Boolean)
      .join(' ');
  }, [background.filters]);

  return (
    <section id="hero" className="relative h-screen w-full overflow-hidden">
      {/* Video/Image Background */}
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
          className="absolute inset-0 bg-cover"
          style={{
            backgroundImage: `url(${background.image_url})`,
            backgroundPosition: background.image_position || '50% 50%',
            filter: filterStyle || undefined
          }}
        />
      ) : (
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

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Main Content */}
      <main className="relative z-10 h-full flex flex-col justify-center px-4 sm:px-6 lg:px-8">
        {/* Social Links - Left Side (Desktop only) - Absolute positioned */}
        <div className="hidden lg:flex flex-col items-center space-y-6 absolute left-8 top-1/2 -translate-y-1/2">
            <a
              href={content.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 hover:text-white transition-colors duration-300"
              aria-label="Instagram"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>

            <div className="h-24 w-[1px] bg-white/20" />

            <a
              href={content.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 hover:text-white transition-colors duration-300"
              aria-label="Facebook"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </a>
        </div>

        {/* Content Container */}
        <div className="w-full mt-12">
          {/* Center Content */}
          <div className="space-y-8 text-center">
            <div className="space-y-4">
              {/* Badge */}
              <p className="text-xs uppercase tracking-[0.5em] font-medium text-white/60 mb-6">
                {content.badge}
              </p>

              {/* Headline */}
              <h1
                className="font-display text-3xl md:text-5xl lg:text-[2.75rem] xl:text-[3.25rem] text-white leading-tight"
                style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
              >
                {content.headline.split('\n').map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < content.headline.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </h1>
            </div>

            {/* Subtext */}
            <p className="text-white/60 text-sm md:text-base font-light tracking-wide whitespace-nowrap">
              {content.subtext}
            </p>

            {/* CTA Button */}
            <div className="pt-8">
              <button
                onClick={() => openBooking()}
                className="hero-cta-btn"
              >
                {content.ctaText}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar - aligned with frame */}
        <div className="absolute bottom-8 left-8 right-8 z-20 hidden lg:flex justify-between items-end">
          {/* Location - Left */}
          <div className="flex flex-col space-y-1 text-left">
            <span className="text-[10px] uppercase tracking-widest text-white/40">
              {content.locationLabel}
            </span>
            <span className="text-xs tracking-wide text-white whitespace-nowrap">
              {content.locationValue}
            </span>
          </div>

          {/* Hours - Right */}
          <div className="flex flex-col space-y-1 text-right">
            <span className="text-[10px] uppercase tracking-widest text-white/40">
              {content.hoursLabel}
            </span>
            <span className="text-xs tracking-wide text-white">
              {content.hoursValue}
            </span>
          </div>
        </div>
      </main>
    </section>
  );
}
