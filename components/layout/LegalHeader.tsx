'use client';

import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';

export function LegalHeader() {
  const t = useTranslations('legal');
  const locale = useLocale();
  const otherLocale = locale === 'de' ? 'en' : 'de';

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Back Link */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="relative w-8 h-8">
              <Image src="/logo.png" alt="Beban" fill className="object-contain" />
            </div>
            <span className="text-sm font-light text-black tracking-[0.1em]">BEBAN</span>
          </Link>

          {/* Back to Home */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gold transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {t('backToHome')}
            </Link>

            {/* Language Switcher */}
            <Link
              href="/"
              locale={otherLocale}
              className="text-xs font-light text-gray-400 hover:text-gold transition-colors uppercase tracking-wider"
            >
              {otherLocale}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
