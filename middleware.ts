import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed'
});

export const config = {
  // Match all pathnames except for
  // - API routes
  // - Static files
  // - Internal routes (dashboard, admin)
  matcher: [
    '/((?!api|_next|_vercel|dashboard|admin|dev|.*\\..*).*)',
    // Include locale prefixed paths
    '/(de|en|tr)/:path*'
  ]
};
