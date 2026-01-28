import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  // Get the locale from the request
  let locale = await requestLocale;

  // If no locale is found (e.g., for /dashboard, /admin routes), use default
  if (!locale || !locales.includes(locale as typeof locales[number])) {
    locale = defaultLocale;
  }

  return {
    locale,
    timeZone: 'Europe/Berlin',
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
