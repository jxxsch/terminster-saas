import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always'
});

export const config = {
  // Match all pathnames except for
  // - ... if they start with `/api`, `/_next`, `/_vercel`
  // - ... if they contain a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|_next|_vercel|admin|dashboard|.*\\..*).*)']
};
