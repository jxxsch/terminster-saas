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
  const [scrollY, setScrollY] = useState(0);
  const [heroHeight, setHeroHeight] = useState(800);
  const [showCustomerPortal, setShowCustomerPortal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    setHeroHeight(window.innerHeight);

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

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

  // Header nur im Hero-Bereich sichtbar
  const inHero = scrollY < heroHeight * 0.8;

  const headerStyles = {
    opacity: inHero ? 1 : 0,
    transform: `translate(-50%, ${inHero ? 0 : -100}px)`,
    pointerEvents: inHero ? 'auto' as const : 'none' as const,
  };

  // Navigation
  const navItemsLeft = [
    { href: '#about', label: t('about') },
    { href: '#services', label: t('services') },
    { href: '#team', label: t('team') },
  ];

  const navItemsRight = [
    { href: '#products', label: t('products') },
    { href: '#gallery', label: t('gallery') },
    { href: '#contact', label: t('contact') },
  ];

  const allNavItems = [...navItemsLeft, ...navItemsRight];

  const navLinkClass = `
    relative px-4 py-2
    text-sm font-light tracking-[0.2em] uppercase text-gray-300
    transition-all duration-300
    border border-transparent
    hover:border-gold/60
    whitespace-nowrap
    rounded-sm
  `;

  const navButtonClass = `
    relative px-5 py-2
    text-sm font-light tracking-[0.2em] uppercase
    transition-all duration-300
    bg-white/10 text-gray-300
    hover:bg-gold hover:text-black hover:border-gold
    whitespace-nowrap
    rounded-sm
    border border-white/30
  `;

  return (
    <header
      className="fixed top-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-[1104px] bg-black/20 border border-white/20 backdrop-blur-sm rounded-lg transition-all duration-300"
      style={headerStyles}
    >
      <nav className="px-4 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Navigation - Desktop */}
          <div className="hidden lg:flex items-center gap-1 flex-1">
            {/* User Button / Login - Links */}
            {isAuthenticated ? (
              <button
                onClick={() => setShowCustomerPortal(true)}
                className="p-2 text-gold border border-gold/60 rounded-sm transition-all duration-300 hover:bg-gold/10"
                aria-label="Mein Bereich"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="p-2 text-gray-300 hover:text-gold border border-transparent hover:border-gold/60 rounded-sm transition-all duration-300"
                aria-label="Anmelden"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            )}

            {/* Language Switcher */}
            <LanguageSwitcher variant="vertical" className="ml-2" />

            {navItemsLeft.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={navLinkClass}
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Center Logo */}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="lg:mx-8 group cursor-pointer flex-shrink-0"
          >
            <div className="relative w-14 h-14 transition-all duration-300 group-hover:[filter:drop-shadow(0_0_8px_rgba(212,175,55,0.5))]">
              <Image
                src="/logo.png"
                alt="Beban Barber Shop Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </a>

          {/* Right Navigation - Desktop */}
          <div className="hidden lg:flex items-center justify-end gap-1 flex-1">
            {navItemsRight.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={navLinkClass}
              >
                {item.label}
              </a>
            ))}
            <button
              onClick={() => openBooking()}
              className={navButtonClass}
            >
              {t('bookNow')}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden absolute right-8 p-2 text-gray-300 hover:text-white transition-colors"
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
          'lg:hidden absolute inset-x-0 top-full mt-2 bg-black/20 backdrop-blur-sm border border-white/20 rounded-lg transition-all duration-300',
          isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        )}
      >
        <div className="px-4 py-8">
          <nav className="flex flex-col items-center space-y-4">
            {allNavItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="px-6 py-3 text-base font-light tracking-[0.2em] uppercase text-gray-300 border border-transparent hover:border-gold/60 transition-all duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <button
              onClick={() => {
                openBooking();
                setIsMobileMenuOpen(false);
              }}
              className="px-6 py-3 text-base font-light tracking-[0.2em] uppercase bg-gold text-black hover:bg-gold-light transition-all duration-300"
            >
              {t('bookNow')}
            </button>

            {/* Mobile User Button */}
            {isAuthenticated ? (
              <button
                onClick={() => {
                  setShowCustomerPortal(true);
                  setIsMobileMenuOpen(false);
                }}
                className="px-6 py-3 text-base font-light tracking-[0.2em] uppercase text-gold border border-gold/60 transition-all duration-300"
              >
                {t('myArea')}
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowLoginModal(true);
                  setIsMobileMenuOpen(false);
                }}
                className="px-6 py-3 text-base font-light tracking-[0.2em] uppercase text-gray-300 border border-gold/60 transition-all duration-300"
              >
                {t('login')}
              </button>
            )}

            {/* Mobile Language Switcher */}
            <div className="pt-4 border-t border-white/20 mt-4">
              <LanguageSwitcher />
            </div>
          </nav>
        </div>
      </div>

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
    </header>
  );
}
