import { useTranslations } from 'next-intl';
import { LegalLayout } from '@/components/layout/LegalLayout';

export default function DatenschutzPage() {
  const t = useTranslations('privacy');

  return (
    <LegalLayout title={t('title')} lastUpdated={t('lastUpdated')}>
      {/* Section 1: Datenschutz auf einen Blick */}
      <section className="mb-12">
        <h2 className="text-xl font-medium text-black mb-6">{t('section1.title')}</h2>

        <div className="mb-6">
          <h3 className="text-lg font-medium text-black mb-3">{t('section1.subtitle1')}</h3>
          <p className="text-gray-600 whitespace-pre-line">{t('section1.content1')}</p>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium text-black mb-4">{t('section1.subtitle2')}</h3>

          <div className="space-y-4">
            <div>
              <p className="font-medium text-black mb-1">{t('section1.question1')}</p>
              <p className="text-gray-600">{t('section1.answer1')}</p>
            </div>
            <div>
              <p className="font-medium text-black mb-1">{t('section1.question2')}</p>
              <p className="text-gray-600 whitespace-pre-line">{t('section1.answer2')}</p>
            </div>
            <div>
              <p className="font-medium text-black mb-1">{t('section1.question3')}</p>
              <p className="text-gray-600">{t('section1.answer3')}</p>
            </div>
            <div>
              <p className="font-medium text-black mb-1">{t('section1.question4')}</p>
              <p className="text-gray-600 whitespace-pre-line">{t('section1.answer4')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Hosting */}
      <section className="mb-12">
        <h2 className="text-xl font-medium text-black mb-4">{t('section2.title')}</h2>
        <p className="text-gray-600 whitespace-pre-line">{t('section2.content')}</p>
      </section>

      {/* Section 3: Allgemeine Hinweise und Pflichtinformationen */}
      <section className="mb-12">
        <h2 className="text-xl font-medium text-black mb-6">{t('section3.title')}</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-black mb-3">{t('section3.subtitle1')}</h3>
            <p className="text-gray-600 whitespace-pre-line">{t('section3.content1')}</p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-black mb-3">{t('section3.subtitle2')}</h3>
            <p className="text-gray-600 whitespace-pre-line">{t('section3.content2')}</p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-black mb-3">{t('section3.subtitle3')}</h3>
            <p className="text-gray-600 whitespace-pre-line">{t('section3.content3')}</p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-black mb-3">{t('section3.subtitle4')}</h3>
            <p className="text-gray-600 whitespace-pre-line">{t('section3.content4')}</p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-black mb-3">{t('section3.subtitle5')}</h3>
            <p className="text-gray-600 whitespace-pre-line">{t('section3.content5')}</p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-black mb-3">{t('section3.subtitle6')}</h3>
            <p className="text-gray-600 whitespace-pre-line">{t('section3.content6')}</p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-black mb-3">{t('section3.subtitle7')}</h3>
            <p className="text-gray-600 whitespace-pre-line">{t('section3.content7')}</p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-black mb-3">{t('section3.subtitle8')}</h3>
            <p className="text-gray-600 whitespace-pre-line">{t('section3.content8')}</p>
          </div>
        </div>
      </section>

      {/* Section 4: Datenerfassung auf dieser Website */}
      <section className="mb-12">
        <h2 className="text-xl font-medium text-black mb-6">{t('section4.title')}</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-black mb-3">{t('section4.subtitle1')}</h3>
            <p className="text-gray-600 whitespace-pre-line">{t('section4.content1')}</p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-black mb-3">{t('section4.subtitle2')}</h3>
            <p className="text-gray-600 whitespace-pre-line">{t('section4.content2')}</p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-black mb-3">{t('section4.subtitle3')}</h3>
            <p className="text-gray-600 whitespace-pre-line">{t('section4.content3')}</p>
          </div>
        </div>
      </section>

      {/* Section 5: Soziale Medien */}
      <section className="mb-12">
        <h2 className="text-xl font-medium text-black mb-6">{t('section5.title')}</h2>

        <div>
          <h3 className="text-lg font-medium text-black mb-3">{t('section5.subtitle1')}</h3>
          <p className="text-gray-600 whitespace-pre-line">{t('section5.content1')}</p>
        </div>
      </section>

      {/* Section 6: Plugins und Tools */}
      <section className="mb-12">
        <h2 className="text-xl font-medium text-black mb-6">{t('section6.title')}</h2>

        <div>
          <h3 className="text-lg font-medium text-black mb-3">{t('section6.subtitle1')}</h3>
          <p className="text-gray-600 whitespace-pre-line">{t('section6.content1')}</p>
        </div>
      </section>

      {/* Section 7: Widerspruch gegen Werbe-E-Mails */}
      <section className="mb-10">
        <h2 className="text-xl font-medium text-black mb-4">{t('section7.title')}</h2>
        <p className="text-gray-600 whitespace-pre-line">{t('section7.content')}</p>
      </section>
    </LegalLayout>
  );
}
