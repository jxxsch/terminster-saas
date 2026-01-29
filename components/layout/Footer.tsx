'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useLogoUrl } from '@/hooks/useLogoUrl';
import { useContactSettings } from '@/hooks/useSiteSettings';

export function Footer() {
  const t = useTranslations('footer');
  const currentYear = new Date().getFullYear();
  const logoUrl = useLogoUrl();
  const { settings: contactSettings } = useContactSettings();

  // Format address for display
  const addressParts = [];
  if (contactSettings.address.street) addressParts.push(contactSettings.address.street);
  if (contactSettings.address.city) addressParts.push(contactSettings.address.city);
  const addressDisplay = addressParts.join(', ') || 'Adresse nicht angegeben';

  return (
    <footer className="py-4 bg-stone-50">
      <div className="container mx-auto px-4 max-w-[1104px]">
        <div className="bg-black/10 backdrop-blur-sm border border-black/10 rounded-lg px-6 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="Beban" className="w-full h-full object-contain" />
              </div>
              <span className="text-sm font-light text-black tracking-[0.1em]">BEBAN Barber Shop 2.0</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{addressDisplay}</span>
              <span className="text-gray-300">·</span>
              <span>Mo-Sa 10-19 Uhr</span>
              {contactSettings.phone && (
                <>
                  <span className="text-gray-300">·</span>
                  <a href={`tel:${contactSettings.phone.replace(/\s/g, '')}`} className="hover:text-gold transition-colors">
                    {contactSettings.phone}
                  </a>
                </>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <Link href="/impressum" className="hover:text-gold transition-colors">{t('imprint')}</Link>
              <Link href="/datenschutz" className="hover:text-gold transition-colors">{t('privacy')}</Link>
              <span className="text-gray-300">·</span>
              <span>© {currentYear}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
