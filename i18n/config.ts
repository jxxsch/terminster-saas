// Liste der unterstützten Locales
export const locales = ['de', 'en', 'tr'] as const;
export type Locale = (typeof locales)[number];

// Default Locale
export const defaultLocale: Locale = 'de';

// Locale Labels für UI
export const localeLabels: Record<Locale, string> = {
  de: 'Deutsch',
  en: 'English',
  tr: 'Türkçe'
};

// Locale Flags (Emoji)
export const localeFlags: Record<Locale, string> = {
  de: '🇩🇪',
  en: '🇬🇧',
  tr: '🇹🇷'
};
