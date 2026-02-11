'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSectionSettings } from '@/hooks/useSiteSettings';
import { useGoogleRating } from '@/hooks/useGoogleRating';
import { useReviews } from '@/hooks/useReviews';

const CircularGallery = dynamic(() => import('@/components/ui/CircularGallery'), { ssr: false });

export function About() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const t = useTranslations('about');
  const locale = useLocale();
  const { title, subtitle, aboutText, getLocalizedText } = useSectionSettings('about');
  const { data: googleRating } = useGoogleRating();
  const { reviews } = useReviews();

  // Auto-rotate reviews
  const nextReview = useCallback(() => {
    if (reviews.length > 0) {
      setCurrentReviewIndex((prev) => (prev + 1) % reviews.length);
    }
  }, [reviews.length]);

  useEffect(() => {
    if (reviews.length <= 1) return;
    const interval = setInterval(nextReview, 6000); // Alle 6 Sekunden wechseln
    return () => clearInterval(interval);
  }, [nextReview, reviews.length]);

  // Use i18n for non-German locales, DB values only for German
  const { sectionTitle, sectionBadge, aboutContent } = useMemo(() => {
    if (locale === 'de') {
      return {
        sectionTitle: title || t('headline'),
        sectionBadge: subtitle || t('badge'),
        aboutContent: getLocalizedText(aboutText),
      };
    }
    // For non-German locales, always use i18n
    return {
      sectionTitle: t('headline'),
      sectionBadge: t('badge'),
      aboutContent: null, // Use i18n paragraphs instead
    };
  }, [locale, title, subtitle, aboutText, getLocalizedText, t]);

  // Mobile Circular Gallery: 2 About-Bilder + 3 zufällige Gallery-Bilder
  const galleryItems = useMemo(() => {
    const aboutImages = [
      { image: '/about-1.jpg', text: '' },
      { image: '/about-2.jpg', text: '' },
    ];
    const galleryPool = [
      '/gallery/1.jpg', '/gallery/2.jpg', '/gallery/3.jpg', '/gallery/4.jpg',
      '/gallery/5.jpg', '/gallery/6.jpg', '/gallery/7.jpg', '/gallery/8.jpg',
    ];
    const shuffled = [...galleryPool].sort(() => Math.random() - 0.5);
    const randomThree = shuffled.slice(0, 3).map(img => ({ image: img, text: '' }));
    return [...aboutImages, ...randomThree].sort(() => Math.random() - 0.5);
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
    <section ref={sectionRef} id="about" className="relative py-16 md:py-20 bg-stone-50 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">

        {/* Timeline Badge - Zentriert */}
        <div className={`flex items-center justify-center gap-4 mb-8 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="h-px w-12 bg-gold/30" />
          <span className="text-sm font-light tracking-[0.3em] text-gold uppercase text-center">{sectionBadge}</span>
          <div className="h-px w-12 bg-gold/30" />
        </div>

        {/* Header - Zentriert */}
        <h2 className={`text-3xl md:text-4xl lg:text-5xl font-light text-black tracking-wide mb-12 text-center transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {sectionTitle}
        </h2>

        {/* Intro Text - 3 Spalten */}
        {aboutContent ? (
          // Custom Text aus Settings - bei Zeilenumbrüchen in Spalten aufteilen
          (() => {
            const paragraphs = aboutContent.split('\n\n').filter(p => p.trim());
            return (
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                {paragraphs.slice(0, 3).map((paragraph, index) => (
                  <p key={index} className="text-gray-700 text-sm leading-relaxed font-light text-justify">
                    {paragraph}
                  </p>
                ))}
              </div>
            );
          })()
        ) : (
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
        )}

        {/* Goldene Trennlinie */}
        <div className={`flex items-center gap-6 mb-20 transition-all duration-700 delay-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
        </div>

        {/* Statistiken - Staggered */}
        <div
          className={`grid grid-cols-2 md:grid-cols-4 gap-8 mb-20 transition-all duration-700 delay-400 ${isVisible ? 'opacity-100 translate-y-0 is-visible' : 'opacity-0 translate-y-4'}`}
          data-stagger="fade-up"
        >
          <div className="text-center">
            <span className="block text-4xl md:text-5xl font-extralight text-black mb-2">8+</span>
            <span className="text-xs font-light tracking-[0.2em] text-gray-500 uppercase">{t('stats.yearsExperience')}</span>
          </div>
          <div className="text-center">
            <span className="block text-4xl md:text-5xl font-extralight text-black mb-2">5000+</span>
            <span className="text-xs font-light tracking-[0.2em] text-gray-500 uppercase">{t('stats.satisfiedCustomers')}</span>
          </div>
          <div className="text-center">
            <span className="block text-4xl md:text-5xl font-extralight text-black mb-2">
              {googleRating?.rating?.toFixed(1) || '4.9'}
            </span>
            <span className="text-xs font-light tracking-[0.2em] text-gray-500 uppercase">{t('stats.googleRating')}</span>
          </div>
          <div className="text-center">
            <span className="block text-4xl md:text-5xl font-extralight text-black mb-2">100%</span>
            <span className="text-xs font-light tracking-[0.2em] text-gray-500 uppercase">{t('stats.passion')}</span>
          </div>
        </div>

        {/* Goldene Trennlinie */}
        <div className={`flex items-center gap-6 mb-4 lg:mb-20 transition-all duration-700 delay-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
        </div>

        {/* Bilder Grid - Desktop: 2-Spalten (unverändert) */}
        <div
          className={`hidden lg:grid grid-cols-2 gap-12 mb-20 transition-all duration-700 delay-600 ${isVisible ? 'opacity-100 translate-y-0 is-visible' : 'opacity-0 translate-y-4'}`}
        >
          {/* Linkes Bild */}
          <div
            className="aspect-[4/3] bg-gray-100 overflow-hidden group img-zoom card-hover-subtle rounded-lg"
            data-animate="slide-right"
            data-delay="100"
          >
            <div className="w-full h-full relative">
              <Image
                src="/about-1.jpg"
                alt="Beban Barber Shop Interior"
                fill
                sizes="50vw"
                className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
              />
            </div>
          </div>

          {/* Rechtes Bild */}
          <div
            className="aspect-[4/3] bg-gray-100 overflow-hidden group img-zoom card-hover-subtle rounded-lg"
            data-animate="slide-left"
            data-delay="200"
          >
            <div className="w-full h-full relative">
              <Image
                src="/about-2.jpg"
                alt="Beban Barber Shop Arbeit"
                fill
                sizes="50vw"
                className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
              />
            </div>
          </div>
        </div>

        {/* Mobile: Circular Gallery — volle Viewport-Breite, kein Seitenabstand */}
        <div
          className={`lg:hidden my-4 w-screen relative left-1/2 -translate-x-1/2 transition-all duration-700 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ height: 300 }}
        >
          <CircularGallery
            items={galleryItems}
            bend={0}
            textColor="#ffffff"
            borderRadius={0.05}
            font="bold 30px sans-serif"
            scrollSpeed={2}
            scrollEase={0.05}
          />
        </div>

        {/* Rezensionen Karussell */}
        <div className={`relative py-12 transition-all duration-700 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Goldene Akzentlinien */}
          <div className="absolute left-0 top-0 w-24 h-px bg-gold" />
          <div className="absolute left-0 top-0 w-px h-24 bg-gold" />

          <div className="pl-8 md:pl-16 min-h-[200px]">
            <svg className="w-12 h-12 text-gold/30 mb-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>

            {reviews.length > 0 ? (
              <div className="relative overflow-hidden">
                {reviews.map((review, index) => (
                  <div
                    key={review.id}
                    className={`transition-all duration-700 ease-in-out ${
                      index === currentReviewIndex
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 absolute top-0 left-0 translate-x-8'
                    }`}
                  >
                    <blockquote className="text-xl md:text-2xl font-extralight text-gray-800 leading-relaxed mb-6 italic">
                      &ldquo;{review.text}&rdquo;
                    </blockquote>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 text-lg font-light">
                          {review.author_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black">{review.author_name}</p>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`w-3 h-3 ${i < review.rating ? 'text-gold' : 'text-gray-300'}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Review Navigation Dots - zentriert unter dem Content */}
                {reviews.length > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    {reviews.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentReviewIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentReviewIndex ? 'bg-gold w-6' : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                        aria-label={`Rezension ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Fallback: Zitat vom Inhaber wenn keine Rezensionen
              <>
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
              </>
            )}
          </div>

          {/* Goldene Akzentlinien unten rechts */}
          <div className="absolute right-0 bottom-0 w-24 h-px bg-gold" />
          <div className="absolute right-0 bottom-0 w-px h-24 bg-gold" />
        </div>

      </div>
    </section>
  );
}
