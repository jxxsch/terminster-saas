'use client';

import { useEffect, useRef, useState } from 'react';
import { useBooking } from '@/context/BookingContext';
import { useTranslations } from 'next-intl';
import { useLogoUrl } from '@/hooks/useLogoUrl';
import { useContactSettings } from '@/hooks/useSiteSettings';
import { openCookieSettings } from '@/components/CookieBanner';
import { openImpressum, openDatenschutz } from '@/components/LegalModal';

export function Contact() {
  const logoUrl = useLogoUrl();
  const { settings: contactSettings } = useContactSettings();
  const [isVisible, setIsVisible] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const { openBooking } = useBooking();
  const t = useTranslations('footer');
  const currentYear = new Date().getFullYear();

  // Kontaktformular State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [formError, setFormError] = useState('');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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

  // Kontaktformular absenden
  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormStatus('loading');
    setFormError('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ein Fehler ist aufgetreten');
      }

      setFormStatus('success');
      setFormData({ name: '', email: '', phone: '', message: '' });
      setCountdown(5);

      // Countdown starten
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setIsFormOpen(false);
            setFormStatus('idle');
            return 5;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error) {
      setFormStatus('error');
      setFormError(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten');
    }
  }

  // Modal schließen und Status zurücksetzen
  function closeContactForm() {
    setIsFormOpen(false);
    setFormStatus('idle');
    setFormError('');
  }

  return (
    <>
      <section ref={sectionRef} id="contact" className="relative py-20 md:py-28 bg-gray-50 overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-gold/5 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl relative">

          {/* Badge - Zentriert */}
          <div className={`flex items-center justify-center gap-4 mb-6 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="h-px w-12 bg-gold/40" />
            <span className="text-xs font-medium tracking-[0.3em] text-gold uppercase text-center">{t('badge')}</span>
            <div className="h-px w-12 bg-gold/40" />
          </div>

          {/* Header - Zentriert */}
          <h2 className={`text-3xl md:text-4xl lg:text-5xl font-light text-gray-900 tracking-wide mb-12 text-center transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {t('headline')}
          </h2>

          {/* Main Content - Floating Container */}
          <div className={`bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="grid grid-cols-1 lg:grid-cols-5">

              {/* Left: Contact Info */}
              <div className="lg:col-span-2 p-8 md:p-10 flex flex-col">

                {/* Info Cards */}
                <div className="space-y-4 mb-8">

                  {/* Adresse */}
                  <div className="group p-5 rounded-2xl bg-gray-50 hover:bg-gold/5 transition-all duration-300">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 group-hover:shadow-md transition-all duration-300">
                        <svg className="w-4.5 h-4.5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[10px] font-normal text-gray-400 tracking-[0.05em] uppercase mb-1 origin-left scale-[0.7]">{t('address.label')}</h3>
                        <p className="text-sm text-gray-700 leading-relaxed">{t('address.building')}</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{t('address.street')}</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{t('address.city')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Öffnungszeiten */}
                  <div className="group p-5 rounded-2xl bg-gray-50 hover:bg-gold/5 transition-all duration-300">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 group-hover:shadow-md transition-all duration-300">
                        <svg className="w-4.5 h-4.5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[10px] font-normal text-gray-400 tracking-[0.05em] uppercase mb-1 origin-left scale-[0.7]">{t('hours.label')}</h3>
                        <div className="space-y-0.5">
                          <div className="flex gap-4 text-sm">
                            <span className="text-gray-500 w-16">{t('hours.weekdays')}</span>
                            <span className="text-gray-700 font-medium">{t('hours.weekdaysTime')}</span>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span className="text-gray-500 w-16">{t('hours.sunday')}</span>
                            <span className="text-gray-400">{t('hours.closed')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Kontakt (Telefon & E-Mail kombiniert) */}
                  <div className="group p-5 rounded-2xl bg-gray-50 hover:bg-gold/5 transition-all duration-300">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 group-hover:shadow-md transition-all duration-300">
                        <svg className="w-4.5 h-4.5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[10px] font-normal text-gray-400 tracking-[0.05em] uppercase mb-1 origin-left scale-[0.7]">{t('badge')}</h3>
                        <div className="space-y-2">
                          {/* Telefon */}
                          <div className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {contactSettings.phone ? (
                              <a href={`tel:${contactSettings.phone.replace(/\s/g, '')}`} className="text-sm text-gray-700 hover:text-gold transition-colors">
                                {contactSettings.phone}
                              </a>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </div>
                          {/* E-Mail */}
                          <div className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                            </svg>
                            {contactSettings.email ? (
                              <a href={`mailto:${contactSettings.email}`} className="text-sm text-gray-700 hover:text-gold transition-colors break-all">
                                {contactSettings.email}
                              </a>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                  <button
                    onClick={() => openBooking()}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-900 text-white text-xs font-medium tracking-[0.15em] uppercase rounded-xl hover:bg-gold transition-all duration-300 shadow-lg shadow-gray-900/20 hover:shadow-gold/30"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {t('bookButton')}
                  </button>
                  <button
                    onClick={() => setIsFormOpen(true)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-gray-700 text-xs font-medium tracking-[0.15em] uppercase rounded-xl border border-gray-200 hover:border-gold hover:text-gold transition-all duration-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {t('messageButton')}
                  </button>
                </div>

              </div>

              {/* Right: Map */}
              <div className="lg:col-span-3 relative min-h-[400px] lg:min-h-0">
                {/* Map Container */}
                <div className="absolute inset-0">
                  <iframe
                    src="https://maps.google.com/maps?q=Beban+Barber+Shop+2.0,+Friedrich-Ebert-Platz+2,+51373+Leverkusen&z=17&ie=UTF8&iwloc=B&output=embed"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Beban Barber Shop Standort"
                  />
                </div>

                {/* Location Badge - Bottom Right */}
                <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-sm px-4 py-2.5 rounded-xl shadow-lg">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-gold" />
                    <span className="text-[10px] font-medium text-gray-500 tracking-wide uppercase">{t('location')}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Footer Section */}
          <div className={`mt-12 transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex flex-col items-center md:flex-row gap-6 py-6 border-t border-gray-200">
              {/* Logo & Name */}
              <div className="flex items-center gap-3 md:flex-1">
                <div className="relative w-8 h-8">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="Beban" className="w-full h-full object-contain" />
                </div>
                <span className="text-sm font-medium text-gray-700 tracking-wide">BEBAN Barber Shop 2.0</span>
              </div>

              {/* Social Links - zentriert */}
              <div className="flex items-center gap-3">
                {contactSettings.instagram && (
                  <a href={contactSettings.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gold/10 transition-all group">
                    <svg className="w-4 h-4 text-gray-500 group-hover:text-gold transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                )}
                {contactSettings.facebook && (
                  <a href={contactSettings.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gold/10 transition-all group">
                    <svg className="w-4 h-4 text-gray-500 group-hover:text-gold transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                )}
                {contactSettings.youtube && (
                  <a href={contactSettings.youtube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gold/10 transition-all group">
                    <svg className="w-4 h-4 text-gray-500 group-hover:text-gold transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </a>
                )}
                {contactSettings.tiktok && (
                  <a href={contactSettings.tiktok} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gold/10 transition-all group">
                    <svg className="w-4 h-4 text-gray-500 group-hover:text-gold transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                    </svg>
                  </a>
                )}
              </div>

              {/* Links & Copyright */}
              <div className="flex items-center gap-4 text-xs text-gray-500 md:flex-1 md:justify-end">
                <button onClick={openImpressum} className="hover:text-gold transition-colors">{t('imprint')}</button>
                <span className="text-gray-300">·</span>
                <button onClick={openDatenschutz} className="hover:text-gold transition-colors">{t('privacy')}</button>
                <span className="text-gray-300">·</span>
                <button onClick={openCookieSettings} className="hover:text-gold transition-colors">Cookies</button>
                <span className="text-gray-300">·</span>
                <span>© {currentYear}</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Kontaktformular Modal */}
      {isFormOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${isMobile ? 'p-0' : 'p-4'}`}>
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeContactForm}
          />

          {/* Modal */}
          <div className={`relative bg-white overflow-y-auto shadow-2xl ${
            isMobile
              ? 'w-full h-[100dvh] rounded-none'
              : 'w-[90vw] sm:w-[480px] max-h-[90vh] rounded-2xl'
          }`}>
            {/* Header - nur im Formular-Modus anzeigen */}
            {formStatus !== 'success' && (
              <div className={`sticky top-0 bg-white border-b border-gray-100 px-6 py-5 flex items-center justify-between z-10 ${isMobile ? 'rounded-none' : 'rounded-t-2xl'}`}>
                <div>
                  <span className="text-[10px] font-semibold text-gold tracking-[0.2em] uppercase">{t('form.badge')}</span>
                  <h2 className="text-lg font-medium text-gray-900 mt-1">{t('form.title')}</h2>
                </div>
                <button onClick={closeContactForm} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Success State */}
            {formStatus === 'success' ? (
              <div className="p-8 text-center relative">
                {/* Countdown Timer in der Ecke */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 text-gray-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-medium tabular-nums">{countdown}s</span>
                </div>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('form.successTitle')}</h3>
                <p className="text-gray-500 text-sm">{t('form.successMessage')}</p>
              </div>
            ) : (
              /* Form */
              <form className="p-6" onSubmit={handleContactSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">{t('form.nameLabel')}</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={formStatus === 'loading'}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 focus:border-gold focus:bg-white focus:outline-none transition-all disabled:opacity-50"
                      placeholder={t('form.namePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">{t('form.emailLabel')}</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={formStatus === 'loading'}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 focus:border-gold focus:bg-white focus:outline-none transition-all disabled:opacity-50"
                      placeholder={t('form.emailPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">{t('form.phoneLabel')}</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={formStatus === 'loading'}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 focus:border-gold focus:bg-white focus:outline-none transition-all disabled:opacity-50"
                      placeholder={t('form.phonePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">{t('form.messageLabel')}</label>
                    <textarea
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      disabled={formStatus === 'loading'}
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 focus:border-gold focus:bg-white focus:outline-none transition-all resize-none"
                    placeholder={t('form.messagePlaceholder')}
                  />
                </div>
              </div>

                {/* Error Message */}
                {formStatus === 'error' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-600">{formError}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={formStatus === 'loading'}
                    className="w-full py-3.5 bg-gray-900 text-white text-xs font-medium tracking-[0.15em] uppercase rounded-xl hover:bg-gold transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {formStatus === 'loading' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Wird gesendet...
                      </>
                    ) : (
                      t('form.submitButton')
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
