'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSectionSettings } from '@/hooks/useSiteSettings';
import { getServices, Service, formatPrice } from '@/lib/supabase';

// Icon-Mapping basierend auf Service-Name (lowercase, ohne Umlaute)
const SERVICE_ICONS: Record<string, React.ReactNode> = {
  haarschnitt: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0 0L12 12" />
    </svg>
  ),
  bartrasur: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  'haare & bart': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  kids: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  augenbrauen: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  clipper: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  maschinenschnitt: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  waschen: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  haarwäsche: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  komplett: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
};

// Default Icon wenn kein Mapping gefunden
const DEFAULT_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0 0L12 12" />
  </svg>
);

// Kurze Beschreibungen für Services
const SERVICE_DESCRIPTIONS: Record<string, string> = {
  haarschnitt: 'Modern & Klassisch',
  bartrasur: 'Nassrasur & Hot Towel',
  'haare & bart': 'Das Kombi-Paket',
  kids: 'Kinderhaarschnitt',
  augenbrauen: 'Präzise Formung',
  clipper: 'Maschinenschnitt',
  maschinenschnitt: 'Schnell & Sauber',
  waschen: 'Mit Kopfmassage',
  haarwäsche: 'Mit Kopfmassage',
  komplett: 'Vollständiges Paket',
};

function getIcon(serviceName: string): React.ReactNode {
  const key = serviceName.toLowerCase();
  return SERVICE_ICONS[key] || DEFAULT_ICON;
}

function getDescription(serviceName: string): string {
  const key = serviceName.toLowerCase();
  return SERVICE_DESCRIPTIONS[key] || '';
}

export function Services() {
  const [isVisible, setIsVisible] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const sectionRef = useRef<HTMLElement>(null);
  const t = useTranslations('services');
  const { title, subtitle } = useSectionSettings('services');

  // Use settings if available, fallback to i18n
  const sectionTitle = title || t('headline');
  const sectionBadge = subtitle || t('badge');

  // Services aus Supabase laden
  useEffect(() => {
    async function loadServices() {
      const data = await getServices();
      setServices(data);
    }
    loadServices();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="services" className="relative py-16 md:py-20 bg-white overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">

        {/* Badge - Zentriert */}
        <div className={`flex items-center justify-center gap-4 mb-8 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="h-px w-12 bg-gold/30" />
          <span className="text-sm font-light tracking-[0.3em] text-gold uppercase">{sectionBadge}</span>
          <div className="h-px w-12 bg-gold/30" />
        </div>

        {/* Header - Zentriert */}
        <h2 className={`text-3xl md:text-4xl lg:text-5xl font-light text-black tracking-wide mb-16 text-center transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {sectionTitle}
        </h2>

        {/* Services Grid - Kompakte Icon-Karten */}
        <div className={`grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

          {services.map((service) => (
            <div
              key={service.id}
              className="group relative bg-white p-4 flex flex-col items-center text-center rounded-2xl shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-10px_rgba(201,168,108,0.15)]"
            >
              {/* Gold Inner Glow */}
              <div
                className="absolute inset-0 pointer-events-none opacity-100"
                style={{
                  background: 'radial-gradient(circle at top right, rgba(201, 168, 108, 0.06) 0%, transparent 50%)'
                }}
              />

              {/* Content */}
              <div className="relative z-10 w-full flex flex-col items-center">
                {/* Icon Container */}
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gold/10 text-gold mb-2 transition-colors group-hover:bg-gold group-hover:text-white">
                  {getIcon(service.name)}
                </div>

                {/* Service Name */}
                <div
                  className="font-semibold uppercase tracking-wider mb-0.5 text-gray-600"
                  style={{ fontSize: '11px' }}
                >
                  {service.name}
                </div>

                {/* Description */}
                <p className="text-gray-400 text-[11px] mb-2 leading-tight">
                  {getDescription(service.name)}
                </p>

                {/* Price */}
                <div className="text-gold font-semibold text-base">
                  {formatPrice(service.price)}
                </div>
              </div>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}
