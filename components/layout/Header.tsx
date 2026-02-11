'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useBooking } from '@/context/BookingContext';
import { useAuth } from '@/context/AuthContext';
import { CustomerPortal } from '@/components/sections/CustomerPortal';
import { LoginModal } from '@/components/sections/LoginModal';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLogoUrl } from '@/hooks/useLogoUrl';

export function Header() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const {
    openBooking,
    showLoginModal,
    openLogin,
    closeLogin,
    loginPasswordSetupData,
    showCustomerPortal,
    openCustomerPortal,
    closeCustomerPortal
  } = useBooking();
  const { isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolledPastHero, setIsScrolledPastHero] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const logoUrl = useLogoUrl();

  // Check if on legal pages (always light mode)
  const isLegalPage = pathname.includes('/impressum') || pathname.includes('/datenschutz');

  useEffect(() => {
    const handleScroll = () => {
      // Farbwechsel exakt wenn Hero-Bereich verlassen wird (100% viewport height)
      const heroHeight = window.innerHeight;
      setIsScrolledPastHero(window.scrollY >= heroHeight);

      // Determine active section
      const sections = ['about', 'services', 'team', 'products', 'gallery', 'contact'];
      const scrollPosition = window.scrollY + 150; // Offset for header

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(`#${section}`);
            return;
          }
        }
      }

      // If at top, no active section
      if (window.scrollY < heroHeight) {
        setActiveSection('');
      }
    };

    // Initial check
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Determine if we should use light mode
  const isLightMode = isLegalPage || isScrolledPastHero;

  // Navigation items
  const navItems = [
    { href: '#about', label: t('about') },
    { href: '#services', label: t('services') },
    { href: '#team', label: t('team') },
    { href: '#products', label: t('products') },
    { href: '#gallery', label: t('gallery') },
    { href: '#contact', label: t('contact') },
  ];

  // Dynamic classes based on light/dark mode
  const headerClass = cn(
    'fixed top-0 left-0 right-0 z-50 header-transition',
    isLightMode
      ? 'header-glass-light'
      : 'header-glass-dark'
  );

  const navLinkClass = cn(
    'px-3 py-2 text-xs font-light tracking-[0.12em] uppercase transition-all duration-300 rounded-sm',
    isLightMode
      ? 'text-gray-600 hover:text-gold'
      : 'text-gray-300 hover:text-gold'
  );

  const userIconClass = cn(
    'h-9 w-9 rounded-sm border transition-all duration-300 flex items-center justify-center',
    isLightMode
      ? 'text-gray-600 border-gray-300 hover:text-gold hover:border-gold'
      : 'text-gray-300 border-white/30 hover:text-gold hover:border-gold'
  );

  const separatorClass = cn(
    'header-separator',
    isLightMode ? 'bg-black/30' : 'bg-white/30'
  );

  return (
    <>
      <header className={headerClass}>
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="flex items-center justify-between h-14 lg:h-16">
            {/* Left: Logo + Separator + Navigation */}
            <div className="flex items-center gap-3 lg:gap-4">
              {/* Logo */}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="group cursor-pointer flex-shrink-0"
              >
                <div className={cn(
                  "relative w-10 h-10 lg:w-12 lg:h-12 transition-all duration-300",
                  isLightMode
                    ? "group-hover:[filter:drop-shadow(0_0_8px_rgba(212,175,55,0.5))]"
                    : "[filter:drop-shadow(0_0_8px_rgba(212,175,55,0.5))]"
                )}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoUrl}
                    alt="Beban Barber Shop Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
              </a>

              {/* Separator */}
              <div className={cn(separatorClass, 'hidden lg:block')} />

              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center gap-1">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className={navLinkClass}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Right: Language + Auth */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Language Switcher */}
              <LanguageSwitcher variant="vertical" isDark={!isLightMode} />

              {/* User Icon */}
              <button
                onClick={() => isAuthenticated ? openCustomerPortal() : openLogin()}
                className={isAuthenticated
                  ? cn(
                      'h-9 w-9 rounded-sm border transition-all duration-300 flex items-center justify-center',
                      isLightMode
                        ? 'text-gold border-gold/50 hover:bg-gold/10'
                        : 'text-gold border-gold/50 hover:bg-white/10'
                    )
                  : userIconClass
                }
                aria-label={isAuthenticated ? t('myArea') : t('login')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={cn(
                'lg:hidden p-2 transition-colors',
                isLightMode ? 'text-gray-700 hover:text-gold' : 'text-gray-300 hover:text-white'
              )}
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu - Fullscreen (outside header) */}
      <div
        className={cn(
          'lg:hidden fixed inset-0 z-[100] bg-black transition-all duration-300',
          isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        )}
      >
          {/* Header Bar - same positioning as main header */}
          <div className="flex items-center justify-between px-4 sm:px-6 h-14">
            {/* Logo */}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setIsMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex-shrink-0"
            >
              <div className="relative w-10 h-10 [filter:drop-shadow(0_0_8px_rgba(212,175,55,0.5))]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt="Beban Barber Shop Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </a>

            {/* Close Button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-gold p-2"
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Menu Content */}
          <nav className="flex flex-col justify-between h-[calc(100%-3.5rem)] px-12 pb-6">
            {/* Navigation Links - Block zentriert, Text linksbündig */}
            <div className="flex flex-col items-center justify-center flex-1">
              <div className="flex flex-col">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      'py-2 text-left text-4xl font-light tracking-wide transition-colors',
                      activeSection === item.href ? 'text-white' : 'text-white/40 hover:text-white'
                    )}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Trennlinie + Konto & Buchen als Pill-Buttons */}
            <div>
              <div className="h-px bg-gold/30 my-4" />
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    isAuthenticated ? openCustomerPortal() : openLogin();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 rounded-full border border-white/20 text-sm font-light tracking-[0.15em] uppercase text-white/60 hover:text-white hover:border-white/40 transition-all"
                >
                  {isAuthenticated ? t('myArea') : t('login')}
                </button>
                <button
                  onClick={() => {
                    openBooking();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 rounded-full bg-gold text-sm font-light tracking-[0.15em] uppercase text-black hover:bg-gold/80 transition-all"
                >
                  {t('bookNow')}
                </button>
              </div>
            </div>
          </nav>
      </div>

      {/* Customer Portal Modal */}
      {showCustomerPortal && (
        <CustomerPortal
          onClose={closeCustomerPortal}
          onBookNow={() => openBooking()}
        />
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal
          onClose={closeLogin}
          onSuccess={() => {
            closeLogin();
            openCustomerPortal();
          }}
          passwordSetupData={loginPasswordSetupData}
        />
      )}
    </>
  );
}
