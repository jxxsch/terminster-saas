'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

export function About() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const t = useTranslations('about');

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
    <section ref={sectionRef} id="about" className="relative py-16 md:py-20 bg-stone-50 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">

        {/* Timeline Badge - Zentriert */}
        <div className={`flex items-center justify-center gap-4 mb-8 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="h-px w-12 bg-gold/30" />
          <span className="text-sm font-light tracking-[0.3em] text-gold uppercase">{t('badge')}</span>
          <div className="h-px w-12 bg-gold/30" />
        </div>

        {/* Header - Zentriert */}
        <h2 className={`text-3xl md:text-4xl lg:text-5xl font-light text-black tracking-wide mb-12 text-center transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {t('headline')}
        </h2>

        {/* Intro Text - 3 Spalten, Blocksatz */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-gray-700 text-sm leading-relaxed font-light text-justify">
            {t('intro.paragraph1')}
          </p>
          <p className="text-gray-700 text-sm leading-relaxed font-light text-justify">
            {t('intro.paragraph2')}
          </p>
          <p className="text-gray-700 text-sm leading-relaxed font-light text-justify">
            {t('intro.paragraph3')}
          </p>
        </div>

        {/* Goldene Trennlinie */}
        <div className={`flex items-center gap-6 mb-20 transition-all duration-700 delay-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
        </div>

        {/* Statistiken */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-8 mb-20 transition-all duration-700 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="text-center">
            <span className="block text-4xl md:text-5xl font-extralight text-black mb-2">8+</span>
            <span className="text-xs font-light tracking-[0.2em] text-gray-500 uppercase">{t('stats.yearsExperience')}</span>
          </div>
          <div className="text-center">
            <span className="block text-4xl md:text-5xl font-extralight text-black mb-2">5000+</span>
            <span className="text-xs font-light tracking-[0.2em] text-gray-500 uppercase">{t('stats.satisfiedCustomers')}</span>
          </div>
          <div className="text-center">
            <span className="block text-4xl md:text-5xl font-extralight text-black mb-2">4.9</span>
            <span className="text-xs font-light tracking-[0.2em] text-gray-500 uppercase">{t('stats.googleRating')}</span>
          </div>
          <div className="text-center">
            <span className="block text-4xl md:text-5xl font-extralight text-black mb-2">100%</span>
            <span className="text-xs font-light tracking-[0.2em] text-gray-500 uppercase">{t('stats.passion')}</span>
          </div>
        </div>

        {/* Goldene Trennlinie */}
        <div className={`flex items-center gap-6 mb-20 transition-all duration-700 delay-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
        </div>

        {/* Bilder Grid */}
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20 transition-all duration-700 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Linkes Bild */}
          <div className="aspect-[4/3] bg-gray-100 overflow-hidden group">
            <div className="w-full h-full relative">
              <Image
                src="/about-1.jpg"
                alt="Beban Barber Shop Interior"
                fill
                className="object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
              />
            </div>
          </div>

          {/* Rechtes Bild */}
          <div className="aspect-[4/3] bg-gray-100 overflow-hidden group">
            <div className="w-full h-full relative">
              <Image
                src="/about-2.jpg"
                alt="Beban Barber Shop Arbeit"
                fill
                className="object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
              />
            </div>
          </div>
        </div>

        {/* Zitat vom Inhaber */}
        <div className={`relative py-12 transition-all duration-700 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Goldene Akzentlinien */}
          <div className="absolute left-0 top-0 w-24 h-px bg-gold" />
          <div className="absolute left-0 top-0 w-px h-24 bg-gold" />

          <div className="pl-8 md:pl-16">
            <svg className="w-12 h-12 text-gold/30 mb-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
            <blockquote className="text-2xl md:text-3xl font-extralight text-gray-800 leading-relaxed mb-6 italic">
              {t('quote')}
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500 text-lg font-light">B</span>
              </div>
              <div>
                <p className="text-sm font-medium text-black">Beban</p>
                <p className="text-xs text-gray-500 tracking-wide">{t('ownerTitle')}</p>
              </div>
            </div>
          </div>

          {/* Goldene Akzentlinien unten rechts */}
          <div className="absolute right-0 bottom-0 w-24 h-px bg-gold" />
          <div className="absolute right-0 bottom-0 w-px h-24 bg-gold" />
        </div>

      </div>
    </section>
  );
}
