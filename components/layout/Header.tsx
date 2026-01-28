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

export function Header() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const { openBooking } = useBooking();
  const { isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolledPastHero, setIsScrolledPastHero] = useState(false);
  const [showCustomerPortal, setShowCustomerPortal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Check if on legal pages (always light mode)
  const isLegalPage = pathname.includes('/impressum') || pathname.includes('/datenschutz');

  useEffect(() => {
    const handleScroll = () => {
      // Farbwechsel exakt wenn Hero-Bereich verlassen wird (100% viewport height)
      const heroHeight = window.innerHeight;
      setIsScrolledPastHero(window.scrollY >= heroHeight);
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
      ? 'header-glass-light border-b border-gray-200/50'
      : 'header-glass-dark border-b border-white/10'
  );

  const navLinkClass = cn(
    'px-3 py-2 text-xs font-light tracking-[0.12em] uppercase transition-all duration-300 rounded-sm',
    isLightMode
      ? 'text-gray-600 hover:text-gold'
      : 'text-gray-300 hover:text-gold'
  );

  const ctaButtonClass = cn(
    'h-9 px-4 text-xs font-medium tracking-[0.1em] uppercase rounded-sm transition-all duration-300 flex items-center justify-center border',
    isLightMode
      ? 'bg-black/10 text-gray-800 border-black/30 hover:bg-gold hover:text-black hover:border-gold'
      : 'bg-white/10 text-white border-white/30 hover:bg-gold hover:text-black hover:border-gold'
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
                  <Image
                    src="/logo.png"
                    alt="Beban Barber Shop Logo"
                    fill
                    className="object-contain"
                    priority
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

            {/* Right: Language + CTA + Separator + Auth */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Language Switcher */}
              <LanguageSwitcher variant="vertical" isDark={!isLightMode} />

              {/* CTA Button */}
              <button
                onClick={() => openBooking()}
                className={ctaButtonClass}
              >
                {t('bookNow')}
              </button>

              {/* Separator */}
              <div className={separatorClass} />

              {/* User Icon */}
              <button
                onClick={() => isAuthenticated ? setShowCustomerPortal(true) : setShowLoginModal(true)}
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

        {/* Mobile Menu */}
        <div
          className={cn(
            'lg:hidden fixed inset-x-0 top-14 bottom-0 z-40 transition-all duration-300',
            isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
          )}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Menu Content */}
          <div
            className={cn(
              'relative mx-4 mt-4 rounded-lg overflow-hidden',
              isLightMode
                ? 'bg-white/95 backdrop-blur-md border border-gray-200'
                : 'bg-black/90 backdrop-blur-md border border-white/10'
            )}
          >
            <nav className="p-6 flex flex-col gap-2">
              {/* Navigation Links */}
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'py-3 text-center text-sm tracking-[0.15em] uppercase transition-colors',
                    isLightMode ? 'text-gray-700 hover:text-gold' : 'text-white hover:text-gold'
                  )}
                >
                  {item.label}
                </a>
              ))}

              {/* Divider */}
              <div className={cn('h-px my-3', isLightMode ? 'bg-gray-200' : 'bg-white/20')} />

              {/* CTA Button */}
              <button
                onClick={() => {
                  openBooking();
                  setIsMobileMenuOpen(false);
                }}
                className="py-3 bg-gold text-black text-sm font-medium tracking-[0.15em] uppercase rounded"
              >
                {t('bookNow')}
              </button>

              {/* User Button */}
              <button
                onClick={() => {
                  isAuthenticated ? setShowCustomerPortal(true) : setShowLoginModal(true);
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  'py-3 text-sm tracking-[0.15em] uppercase border rounded transition-colors flex items-center justify-center gap-2',
                  isAuthenticated
                    ? 'text-gold border-gold/50'
                    : isLightMode
                      ? 'text-gray-700 border-gray-300 hover:border-gold hover:text-gold'
                      : 'text-gray-300 border-white/30 hover:border-gold hover:text-gold'
                )}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {isAuthenticated ? t('myArea') : t('login')}
              </button>

              {/* Language Switcher */}
              <div className="flex justify-center pt-3">
                <LanguageSwitcher variant="vertical" />
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Customer Portal Modal */}
      {showCustomerPortal && (
        <CustomerPortal
          onClose={() => setShowCustomerPortal(false)}
          onBookNow={() => openBooking()}
        />
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => {
            setShowLoginModal(false);
            setShowCustomerPortal(true);
          }}
        />
      )}
    </>
  );
}
