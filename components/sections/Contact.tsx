'use client';

import { useEffect, useRef, useState } from 'react';
import { useBooking } from '@/context/BookingContext';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useLogoUrl } from '@/hooks/useLogoUrl';
import { useContactSettings } from '@/hooks/useSiteSettings';

export function Contact() {
  const logoUrl = useLogoUrl();
  const { settings: contactSettings } = useContactSettings();
  const [isVisible, setIsVisible] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const { openBooking } = useBooking();
  const t = useTranslations('footer');
  const currentYear = new Date().getFullYear();

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
    <>
      <section ref={sectionRef} id="contact" className="relative py-16 md:py-20 bg-white overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">

          {/* Badge - Zentriert */}
          <div className={`flex items-center justify-center gap-4 mb-8 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="h-px w-12 bg-gold/30" />
            <span className="text-sm font-light tracking-[0.3em] text-gold uppercase">{t('badge')}</span>
            <div className="h-px w-12 bg-gold/30" />
          </div>

          {/* Header - Zentriert */}
          <h2 className={`text-3xl md:text-4xl lg:text-5xl font-light text-black tracking-wide mb-16 text-center transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {t('headline')}
          </h2>

          {/* Content Grid */}
          <div className={`grid grid-cols-1 lg:grid-cols-2 gap-16 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

            {/* Left: Contact Info - Höhe angepasst an Map */}
            <div className="flex flex-col justify-between h-full lg:aspect-[4/5]">

              {/* Adresse */}
              <div className="group">
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 border border-gold/30 flex items-center justify-center flex-shrink-0 group-hover:border-gold transition-colors">
                    <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xs font-light text-gold tracking-[0.2em] uppercase mb-3">{t('address.label')}</h3>
                    <p className="text-sm font-light text-black leading-relaxed">{t('address.building')}</p>
                    <p className="text-sm font-light text-black leading-relaxed">{t('address.street')}</p>
                    <p className="text-sm font-light text-black leading-relaxed">{t('address.city')}</p>
                  </div>
                </div>
              </div>

              {/* Öffnungszeiten */}
              <div className="group">
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 border border-gold/30 flex items-center justify-center flex-shrink-0 group-hover:border-gold transition-colors">
                    <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xs font-light text-gold tracking-[0.2em] uppercase mb-3">{t('hours.label')}</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between gap-8">
                        <span className="text-sm font-light text-gray-500">{t('hours.weekdays')}</span>
                        <span className="text-sm font-light text-black">{t('hours.weekdaysTime')}</span>
                      </div>
                      <div className="flex justify-between gap-8">
                        <span className="text-sm font-light text-gray-500">{t('hours.saturday')}</span>
                        <span className="text-sm font-light text-black">{t('hours.saturdayTime')}</span>
                      </div>
                      <div className="flex justify-between gap-8">
                        <span className="text-sm font-light text-gray-500">{t('hours.sunday')}</span>
                        <span className="text-sm font-light text-black">{t('hours.closed')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Telefon */}
              <div className="group">
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 border border-gold/30 flex items-center justify-center flex-shrink-0 group-hover:border-gold transition-colors">
                    <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xs font-light text-gold tracking-[0.2em] uppercase mb-3">{t('phone.label')}</h3>
                    {contactSettings.phone ? (
                      <a href={`tel:${contactSettings.phone.replace(/\s/g, '')}`} className="text-sm font-light text-black hover:text-gold transition-colors">
                        {contactSettings.phone}
                      </a>
                    ) : (
                      <span className="text-sm font-light text-gray-400">Nicht angegeben</span>
                    )}
                  </div>
                </div>
              </div>

              {/* E-Mail */}
              <div className="group">
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 border border-gold/30 flex items-center justify-center flex-shrink-0 group-hover:border-gold transition-colors">
                    <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xs font-light text-gold tracking-[0.2em] uppercase mb-3">{t('email.label')}</h3>
                    {contactSettings.email ? (
                      <a href={`mailto:${contactSettings.email}`} className="text-sm font-light text-black hover:text-gold transition-colors">
                        {contactSettings.email}
                      </a>
                    ) : (
                      <span className="text-sm font-light text-gray-400">Nicht angegeben</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => openBooking()}
                  className="inline-flex items-center justify-center px-8 py-3 bg-black text-white text-xs font-light tracking-[0.2em] uppercase hover:bg-gold transition-all duration-300"
                >
                  {t('bookButton')}
                </button>
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="inline-flex items-center justify-center px-8 py-3 border border-black text-black text-xs font-light tracking-[0.2em] uppercase hover:bg-gold hover:border-gold transition-all duration-300"
                >
                  {t('messageButton')}
                </button>
              </div>

            </div>

            {/* Right: Map */}
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-16 h-16 border-t-2 border-l-2 border-gold" />
              <div className="absolute -bottom-4 -right-4 w-16 h-16 border-b-2 border-r-2 border-gold" />

              <div className="bg-gray-100 aspect-square lg:aspect-[4/5] overflow-hidden">
                <iframe
                  src="https://maps.google.com/maps?q=Beban+Barber+Shop+2.0+Leverkusen&t=&z=17&ie=UTF8&iwloc=&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0, filter: 'grayscale(100%)' }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Beban Barber Shop Standort"
                />
              </div>

              <div className="mt-6 text-center">
                <p className="text-xs font-light text-gray-400 tracking-[0.15em] uppercase">{t('location')}</p>
              </div>
            </div>

          </div>

          {/* Trennlinie */}
          <div className="h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent my-16" />

          {/* Footer Content */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo & Name */}
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="Beban" className="w-full h-full object-contain" />
              </div>
              <span className="text-sm font-light text-black tracking-[0.1em]">BEBAN Barber Shop 2.0</span>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              {contactSettings.instagram && (
                <a href={contactSettings.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-gray-300 flex items-center justify-center hover:border-gold transition-all group">
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-gold transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              )}
              {contactSettings.facebook && (
                <a href={contactSettings.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-gray-300 flex items-center justify-center hover:border-gold transition-all group">
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-gold transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
              )}
              {contactSettings.youtube && (
                <a href={contactSettings.youtube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-gray-300 flex items-center justify-center hover:border-gold transition-all group">
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-gold transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
              )}
              {contactSettings.tiktok && (
                <a href={contactSettings.tiktok} target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-gray-300 flex items-center justify-center hover:border-gold transition-all group">
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-gold transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                  </svg>
                </a>
              )}
            </div>

            {/* Links & Copyright */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <Link href="/impressum" className="hover:text-gold transition-colors">{t('imprint')}</Link>
              <Link href="/datenschutz" className="hover:text-gold transition-colors">{t('privacy')}</Link>
              <span className="text-gray-300">·</span>
              <span>© {currentYear}</span>
            </div>
          </div>

        </div>
      </section>

      {/* Kontaktformular Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsFormOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-lg">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <span className="text-xs font-light text-gold tracking-[0.2em] uppercase">{t('form.badge')}</span>
                <h2 className="text-xl font-light text-black">{t('form.title')}</h2>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form className="p-6" onSubmit={(e) => { e.preventDefault(); setIsFormOpen(false); }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-2">{t('form.nameLabel')}</label>
                  <input
                    type="text"
                    required
                    className="w-full p-4 border border-gray-200 rounded-lg text-sm font-light focus:border-gold focus:outline-none"
                    placeholder={t('form.namePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2">{t('form.emailLabel')}</label>
                  <input
                    type="email"
                    required
                    className="w-full p-4 border border-gray-200 rounded-lg text-sm font-light focus:border-gold focus:outline-none"
                    placeholder={t('form.emailPlaceholder')}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-2">{t('form.phoneLabel')}</label>
                <input
                  type="tel"
                  className="w-full p-4 border border-gray-200 rounded-lg text-sm font-light focus:border-gold focus:outline-none"
                  placeholder={t('form.phonePlaceholder')}
                />
              </div>

              <div className="mb-6">
                <label className="block text-xs text-gray-500 mb-2">{t('form.messageLabel')}</label>
                <textarea
                  required
                  rows={5}
                  className="w-full p-4 border border-gray-200 rounded-lg text-sm font-light focus:border-gold focus:outline-none resize-none"
                  placeholder={t('form.messagePlaceholder')}
                />
              </div>

              {/* Footer */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-8 py-3 bg-black text-white text-xs font-light tracking-[0.2em] uppercase hover:bg-gold transition-all"
                >
                  {t('form.submitButton')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
