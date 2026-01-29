'use client';

import { ReactNode } from 'react';
import { Header } from './Header';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useLogoUrl } from '@/hooks/useLogoUrl';

interface LegalLayoutProps {
  children: ReactNode;
  title: string;
  lastUpdated?: string;
}

export function LegalLayout({ children, title, lastUpdated }: LegalLayoutProps) {
  const t = useTranslations('legal');
  const logoUrl = useLogoUrl();
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <Header />

      {/* Spacer for fixed header */}
      <div className="h-14 lg:h-16" />

      <main className="flex-grow py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Title */}
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-light text-black tracking-wide mb-3">
              {title}
            </h1>
            {lastUpdated && (
              <p className="text-sm text-gray-400">
                {t('lastUpdated')}: {lastUpdated}
              </p>
            )}
          </div>

          {/* Content */}
          <div className="prose prose-stone max-w-none">
            {children}
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="py-6 bg-white border-t border-gray-100">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-6 h-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="Beban" className="w-full h-full object-contain" />
              </div>
              <span className="text-xs font-light text-gray-500 tracking-[0.1em]">
                BEBAN Barber Shop 2.0
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-400">
              <Link href="/impressum" className="hover:text-gold transition-colors">
                {t('imprint')}
              </Link>
              <Link href="/datenschutz" className="hover:text-gold transition-colors">
                {t('privacy')}
              </Link>
              <span>© {currentYear}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
