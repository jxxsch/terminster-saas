import { useTranslations } from 'next-intl';
import { LegalLayout } from '@/components/layout/LegalLayout';

export default function ImpressumPage() {
  const t = useTranslations('imprint');

  return (
    <LegalLayout title={t('title')} lastUpdated={t('lastUpdated')}>
      {/* Section 1: Angaben gemäß § 5 TMG */}
      <section className="mb-10">
        <h2 className="text-xl font-medium text-black mb-4">{t('section1.title')}</h2>
        <p className="text-gray-600 whitespace-pre-line">{t('section1.content')}</p>
      </section>

      {/* Section 2: Kontakt */}
      <section className="mb-10">
        <h2 className="text-xl font-medium text-black mb-4">{t('section2.title')}</h2>
        <div className="text-gray-600 space-y-1">
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

      {/* Section 3: Steuernummer */}
      <section className="mb-10">
        <h2 className="text-xl font-medium text-black mb-4">{t('section3.title')}</h2>
        <p className="text-gray-600 whitespace-pre-line">{t('section3.content')}</p>
      </section>

      {/* Section 4: Aufsichtsbehörde */}
      <section className="mb-10">
        <h2 className="text-xl font-medium text-black mb-4">{t('section4.title')}</h2>
        <p className="text-gray-600 whitespace-pre-line">{t('section4.content')}</p>
      </section>

      {/* Section 5: Haftung für Inhalte */}
      <section className="mb-10">
        <h2 className="text-xl font-medium text-black mb-4">{t('section5.title')}</h2>
        <p className="text-gray-600 whitespace-pre-line">{t('section5.content')}</p>
      </section>

      {/* Section 6: Haftung für Links */}
      <section className="mb-10">
        <h2 className="text-xl font-medium text-black mb-4">{t('section6.title')}</h2>
        <p className="text-gray-600 whitespace-pre-line">{t('section6.content')}</p>
      </section>

      {/* Section 7: Urheberrecht */}
      <section className="mb-10">
        <h2 className="text-xl font-medium text-black mb-4">{t('section7.title')}</h2>
        <p className="text-gray-600 whitespace-pre-line">{t('section7.content')}</p>
      </section>
    </LegalLayout>
  );
}
