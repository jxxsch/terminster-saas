'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSectionSettings } from '@/hooks/useSiteSettings';
import { getServices, Service, formatPrice } from '@/lib/supabase';

// Einheitliches Scheren-Icon für alle Services
const SCISSORS_ICON = (
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

function getIcon(): React.ReactNode {
  return SCISSORS_ICON;
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

        {/* Services Grid - 3D Karten mit Perspektive */}
        <div
          className={`grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ perspective: '1000px' }}
        >

          {services.map((service) => (
            <div
              key={service.id}
              className="group"
              style={{ perspective: '1000px' }}
            >
              <div
                className="relative bg-white p-5 flex flex-col items-center text-center rounded-2xl border border-gray-100 overflow-hidden transition-all duration-500 ease-out cursor-pointer
                  shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)]
                  group-hover:shadow-[0_15px_35px_-5px_rgba(201,168,108,0.25),0_10px_20px_-5px_rgba(201,168,108,0.1)]
                  group-hover:border-gold/30"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: 'rotateX(0deg) rotateY(0deg)',
                  transition: 'transform 0.5s ease, box-shadow 0.5s ease, border-color 0.5s ease',
                }}
                onMouseEnter={(e) => {
                  const card = e.currentTarget;
                  card.style.transform = 'rotateX(5deg) rotateY(-5deg) translateY(-8px)';
                }}
                onMouseLeave={(e) => {
                  const card = e.currentTarget;
                  card.style.transform = 'rotateX(0deg) rotateY(0deg) translateY(0px)';
                }}
              >
                {/* Gold Gradient Glow - verstärkt beim Hover */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: 'linear-gradient(135deg, rgba(201, 168, 108, 0.15) 0%, transparent 50%, rgba(201, 168, 108, 0.05) 100%)'
                  }}
                />

                {/* Content */}
                <div className="relative z-10 w-full flex flex-col items-center" style={{ transform: 'translateZ(20px)' }}>
                  {/* Icon Container */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gold/10 text-gold mb-3 transition-all duration-300 group-hover:bg-gold group-hover:text-white group-hover:scale-110 group-hover:shadow-lg">
                    {getIcon()}
                  </div>

                  {/* Service Name */}
                  <div
                    className="font-semibold uppercase tracking-wider mb-1 text-gray-700 transition-colors duration-300 group-hover:text-gray-900"
                    style={{ fontSize: '11px' }}
                  >
                    {service.name}
                  </div>

                  {/* Description */}
                  <p className="text-gray-400 text-[11px] mb-3 leading-tight transition-colors duration-300 group-hover:text-gray-500">
                    {getDescription(service.name)}
                  </p>

                  {/* Price */}
                  <div className="text-gold font-semibold text-lg transition-transform duration-300 group-hover:scale-105">
                    {formatPrice(service.price)}
                  </div>
                </div>

                {/* Subtle shine effect on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                  style={{
                    background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.4) 55%, transparent 60%)',
                    transform: 'translateX(-100%)',
                    animation: 'none',
                  }}
                />
              </div>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}
