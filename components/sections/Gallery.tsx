'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSectionSettings } from '@/hooks/useSiteSettings';

const IMAGES = [
  '/gallery/1.jpg',
  '/gallery/2.jpg',
  '/gallery/3.jpg',
  '/gallery/4.jpg',
  '/gallery/5.jpg',
  '/gallery/6.jpg',
  '/gallery/7.jpg',
  '/gallery/8.jpg',
];

export function Gallery() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const t = useTranslations('gallery');
  const { title, subtitle } = useSectionSettings('gallery');

  // Use settings if available, fallback to i18n
  const sectionTitle = title || t('headline');
  const sectionBadge = subtitle || t('badge');

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
    <section ref={sectionRef} id="gallery" className="relative py-16 md:py-20 bg-gray-50 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">

        {/* Badge */}
        <div className={`flex items-center justify-center gap-4 mb-8 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="h-px w-12 bg-gold/30" />
          <span className="text-sm font-light tracking-[0.3em] text-gold uppercase">{sectionBadge}</span>
          <div className="h-px w-12 bg-gold/30" />
        </div>

        {/* Header */}
        <h2 className={`text-3xl md:text-4xl lg:text-5xl font-light text-black tracking-wide mb-16 text-center transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {sectionTitle}
        </h2>

        {/* Fullwidth Abwechselnd */}
        <div className={`space-y-4 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Große Zeile */}
          <div className="aspect-[21/9] relative bg-gray-100 overflow-hidden group">
            <Image src={IMAGES[0]} alt="Gallery 1" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>

          {/* 3er Zeile */}
          <div className="grid grid-cols-3 gap-4">
            {IMAGES.slice(1, 4).map((src, i) => (
              <div key={`row1-${i}`} className="aspect-square relative bg-gray-100 overflow-hidden group">
                <Image src={src} alt={`Gallery ${i + 2}`} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
            ))}
          </div>

          {/* Große Zeile */}
          <div className="aspect-[21/9] relative bg-gray-100 overflow-hidden group">
            <Image src={IMAGES[4]} alt="Gallery 5" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>

          {/* 3er Zeile */}
          <div className="grid grid-cols-3 gap-4">
            {IMAGES.slice(5, 8).map((src, i) => (
              <div key={`row2-${i}`} className="aspect-square relative bg-gray-100 overflow-hidden group">
                <Image src={src} alt={`Gallery ${i + 6}`} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
