import { NextRequest, NextResponse } from 'next/server';

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip for dashboard, admin, api, static files
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Redirect root to /de
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/de', request.url));
  }

  // If no locale prefix, redirect to /de
  if (!pathname.startsWith('/de') && !pathname.startsWith('/en') && !pathname.startsWith('/tr')) {
    return NextResponse.redirect(new URL(`/de${pathname}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
