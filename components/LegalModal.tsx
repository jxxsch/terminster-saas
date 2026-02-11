'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';

type LegalType = 'impressum' | 'datenschutz' | 'newsletter' | null;

export function LegalModal() {
  const t = useTranslations('footer');
  const [type, setType] = useState<LegalType>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<LegalType>).detail;
      setType(detail);
    };
    window.addEventListener('open-legal-modal', handler);
    return () => window.removeEventListener('open-legal-modal', handler);
  }, []);

  useEffect(() => {
    if (type) {
      document.body.style.overflow = 'hidden';
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setType(null);
      };
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [type]);

  if (!type) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setType(null)}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-none md:rounded-xl shadow-none md:shadow-2xl w-full h-full md:h-auto md:max-h-[85vh] flex flex-col" style={{ maxWidth: '768px' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <span className="text-xl font-light text-black tracking-wide">
            {type === 'impressum' ? <ImpressumTitle /> : type === 'datenschutz' ? <DatenschutzTitle /> : <NewsletterTitle />}
          </span>
          <button
            onClick={() => setType(null)}
            className="text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg hover:bg-gray-100"
            aria-label="Schließen"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-6 py-6 flex-1">
          {type === 'impressum' ? <ImpressumContent /> : type === 'datenschutz' ? <DatenschutzContent /> : <NewsletterContent />}
        </div>

        {/* Footer with toggle (not for newsletter) */}
        {type !== 'newsletter' && (
          <div className="flex items-center justify-center gap-4 px-6 py-3 border-t border-gray-100 shrink-0">
            <button
              onClick={() => setType('impressum')}
              className={`text-xs transition-colors ${type === 'impressum' ? 'text-gold font-medium' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {t('imprint')}
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => setType('datenschutz')}
              className={`text-xs transition-colors ${type === 'datenschutz' ? 'text-gold font-medium' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {t('privacy')}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// Section heading (replaces h3 to avoid global heading styles)
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-base font-semibold text-black mb-3">{children}</div>;
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-semibold text-black mb-2">{children}</div>;
}

// --- Impressum Content ---
function ImpressumTitle() {
  const t = useTranslations('imprint');
  return <>{t('title')}</>;
}

function ImpressumContent() {
  const t = useTranslations('imprint');

  return (
    <div className="space-y-8">
      <p className="text-xs text-gray-400">{t('lastUpdated')}</p>

      <section>
        <SectionTitle>{t('section1.title')}</SectionTitle>
        <p className="text-gray-600 text-sm whitespace-pre-line">{t('section1.content')}</p>
      </section>

      <section>
        <SectionTitle>{t('section2.title')}</SectionTitle>
        <div className="text-gray-600 text-sm space-y-1">
          <p>
            <span className="font-medium">{t('section2.phone')}:</span>{' '}
            <a href={`tel:${t('section2.phoneValue').replace(/\s/g, '')}`} className="hover:text-gold transition-colors">
              {t('section2.phoneValue')}
            </a>
          </p>
          <p>
            <span className="font-medium">{t('section2.email')}:</span>{' '}
            <a href={`mailto:${t('section2.emailValue')}`} className="hover:text-gold transition-colors">
              {t('section2.emailValue')}
            </a>
          </p>
        </div>
      </section>

      <section>
        <SectionTitle>{t('section3.title')}</SectionTitle>
        <p className="text-gray-600 text-sm whitespace-pre-line">{t('section3.content')}</p>
      </section>

      <section>
        <SectionTitle>{t('section4.title')}</SectionTitle>
        <p className="text-gray-600 text-sm whitespace-pre-line">{t('section4.content')}</p>
      </section>

      <section>
        <SectionTitle>{t('section5.title')}</SectionTitle>
        <p className="text-gray-600 text-sm whitespace-pre-line">{t('section5.content')}</p>
      </section>

      <section>
        <SectionTitle>{t('section6.title')}</SectionTitle>
        <p className="text-gray-600 text-sm whitespace-pre-line">{t('section6.content')}</p>
      </section>

      <section>
        <SectionTitle>{t('section7.title')}</SectionTitle>
        <p className="text-gray-600 text-sm whitespace-pre-line">{t('section7.content')}</p>
      </section>
    </div>
  );
}

// --- Datenschutz Content ---
function DatenschutzTitle() {
  const t = useTranslations('privacy');
  return <>{t('title')}</>;
}

function DatenschutzContent() {
  const t = useTranslations('privacy');

  return (
    <div className="space-y-10">
      <p className="text-xs text-gray-400">{t('lastUpdated')}</p>

      {/* Section 1 */}
      <section>
        <SectionTitle>{t('section1.title')}</SectionTitle>
        <div className="mb-4">
          <SubTitle>{t('section1.subtitle1')}</SubTitle>
          <p className="text-gray-600 text-sm whitespace-pre-line">{t('section1.content1')}</p>
        </div>
        <div>
          <SubTitle>{t('section1.subtitle2')}</SubTitle>
          <div className="space-y-3">
            <div>
              <p className="font-medium text-black text-sm mb-1">{t('section1.question1')}</p>
              <p className="text-gray-600 text-sm">{t('section1.answer1')}</p>
            </div>
            <div>
              <p className="font-medium text-black text-sm mb-1">{t('section1.question2')}</p>
              <p className="text-gray-600 text-sm whitespace-pre-line">{t('section1.answer2')}</p>
            </div>
            <div>
              <p className="font-medium text-black text-sm mb-1">{t('section1.question3')}</p>
              <p className="text-gray-600 text-sm">{t('section1.answer3')}</p>
            </div>
            <div>
              <p className="font-medium text-black text-sm mb-1">{t('section1.question4')}</p>
              <p className="text-gray-600 text-sm whitespace-pre-line">{t('section1.answer4')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 */}
      <section>
        <SectionTitle>{t('section2.title')}</SectionTitle>
        <p className="text-gray-600 text-sm whitespace-pre-line">{t('section2.content')}</p>
      </section>

      {/* Section 3 */}
      <section>
        <SectionTitle>{t('section3.title')}</SectionTitle>
        <div className="space-y-4">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i}>
              <SubTitle>{t(`section3.subtitle${i}`)}</SubTitle>
              <p className="text-gray-600 text-sm whitespace-pre-line">{t(`section3.content${i}`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 4 */}
      <section>
        <SectionTitle>{t('section4.title')}</SectionTitle>
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i}>
              <SubTitle>{t(`section4.subtitle${i}`)}</SubTitle>
              <p className="text-gray-600 text-sm whitespace-pre-line">{t(`section4.content${i}`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 5 */}
      <section>
        <SectionTitle>{t('section5.title')}</SectionTitle>
        <div>
          <SubTitle>{t('section5.subtitle1')}</SubTitle>
          <p className="text-gray-600 text-sm whitespace-pre-line">{t('section5.content1')}</p>
        </div>
      </section>

      {/* Section 6 */}
      <section>
        <SectionTitle>{t('section6.title')}</SectionTitle>
        <div>
          <SubTitle>{t('section6.subtitle1')}</SubTitle>
          <p className="text-gray-600 text-sm whitespace-pre-line">{t('section6.content1')}</p>
        </div>
      </section>

      {/* Section 7 */}
      <section>
        <SectionTitle>{t('section7.title')}</SectionTitle>
        <p className="text-gray-600 text-sm whitespace-pre-line">{t('section7.content')}</p>
      </section>
    </div>
  );
}

// --- Newsletter Content ---
function NewsletterTitle() {
  const t = useTranslations('auth');
  return <>{t('newsletterModalTitle')}</>;
}

function NewsletterContent() {
  const t = useTranslations('auth');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-gold">
        <svg className="w-8 h-8 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
        <span className="text-lg font-medium text-black">Beban Barbershop Newsletter</span>
      </div>
      <p className="text-gray-600 text-sm leading-relaxed">{t('newsletterModalText')}</p>
      <div className="bg-stone-50 rounded-lg p-4 text-sm text-gray-500 space-y-2">
        <p className="font-medium text-gray-700">Du erhältst Infos zu:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Sonderangebote & Rabattaktionen</li>
          <li>Verkaufsoffene Sonntage</li>
          <li>Neue Produkte & Services</li>
        </ul>
      </div>
    </div>
  );
}

// --- Helper-Funktionen (exportiert wie openCookieSettings) ---
export function openImpressum(): void {
  window.dispatchEvent(new CustomEvent('open-legal-modal', { detail: 'impressum' }));
}

export function openDatenschutz(): void {
  window.dispatchEvent(new CustomEvent('open-legal-modal', { detail: 'datenschutz' }));
}

export function openNewsletter(): void {
  window.dispatchEvent(new CustomEvent('open-legal-modal', { detail: 'newsletter' }));
}
