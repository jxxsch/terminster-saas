'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

// Hauptmenü - nur Kalender
const mainNavItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Kalender',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
];

// Verwaltung Items - PIN-geschützt
const verwaltungItems: NavItem[] = [
  {
    href: '/admin/team',
    label: 'Team',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    href: '/admin/services',
    label: 'Services',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
      </svg>
    ),
  },
  {
    href: '/admin/time-off',
    label: 'Urlaube',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
      </svg>
    ),
  },
  {
    href: '/admin/zeiten',
    label: 'Zeiten',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/admin/content',
    label: 'Content',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/admin',
    label: 'Statistiken',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: '/admin/settings',
    label: 'Einstellungen',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

// PIN wird über API validiert (Umgebungsvariable ADMIN_PIN)

interface AppSidebarProps {
  onLogout?: () => void;
}

export function AppSidebar({ onLogout }: AppSidebarProps) {
  const pathname = usePathname();

  // Initiale States basierend auf localStorage (nur client-side)
  const getInitialStates = () => {
    if (typeof window === 'undefined') {
      return { expanded: false, unlocked: false, menuOpen: false };
    }
    const pinSession = localStorage.getItem('admin_pin_session');
    const previousPath = localStorage.getItem('admin_previous_path') || '';

    // Prüfen ob Session gelöscht werden soll
    if (previousPath.startsWith('/admin') && pathname === '/dashboard') {
      localStorage.removeItem('admin_pin_session');
      localStorage.removeItem('admin_previous_path');
      return { expanded: false, unlocked: false, menuOpen: false };
    }

    const unlocked = pinSession === 'unlocked';
    const inAdmin = pathname.startsWith('/admin');
    return {
      expanded: unlocked && inAdmin,
      unlocked: unlocked,
      menuOpen: unlocked && inAdmin
    };
  };

  const initialStates = getInitialStates();
  const [isExpanded, setIsExpanded] = useState(initialStates.expanded);
  const [verwaltungOpen, setVerwaltungOpen] = useState(initialStates.menuOpen);
  const [isPinUnlocked, setIsPinUnlocked] = useState(initialStates.unlocked);
  const [showPinInput, setShowPinInput] = useState(false);
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [pinError, setPinError] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const previousPathRef = useRef<string>(pathname);

  // PIN und Menü-Status basierend auf Navigation steuern
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const wasInAdmin = previousPathRef.current.startsWith('/admin');
    const isNowOnDashboard = pathname === '/dashboard';

    // Session löschen wenn man VOM Admin-Bereich ZUM Dashboard navigiert
    if (wasInAdmin && isNowOnDashboard) {
      setIsPinUnlocked(false);
      setVerwaltungOpen(false);
      setIsExpanded(false);
      localStorage.removeItem('admin_pin_session');
    } else if (pathname.startsWith('/admin') && isPinUnlocked) {
      // Im Admin-Bereich und PIN entsperrt → Menü offen halten
      setVerwaltungOpen(true);
      setIsExpanded(true);
    }

    // Vorherigen Pfad aktualisieren
    previousPathRef.current = pathname;
    localStorage.setItem('admin_previous_path', pathname);
  }, [pathname, isPinUnlocked]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isActive = (href: string) => {
    if (href === '/admin' && pathname === '/admin') return true;
    if (href === '/dashboard' && pathname === '/dashboard') return true;
    if (href !== '/admin' && href !== '/dashboard' && pathname.startsWith(href)) return true;
    return false;
  };

  // Prüfen ob ein Verwaltungs-Item aktiv ist
  const isVerwaltungActive = verwaltungItems.some(item => isActive(item.href));

  const handleVerwaltungClick = () => {
    if (isPinUnlocked) {
      setVerwaltungOpen(!verwaltungOpen);
    } else {
      // PIN-Eingabe anzeigen/verstecken
      const newShowPinInput = !showPinInput;
      setShowPinInput(newShowPinInput);
      if (newShowPinInput) {
        setIsExpanded(true); // Sidebar ausfahren
        setShowForgotPin(false);
        setResetEmail('');
        setPin(['', '', '', '']);
        setPinError(false);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      }
    }
  };

  const handlePinChange = (index: number, value: string) => {
    // Nur Zahlen erlauben
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setPinError(false);

    // Automatisch zum nächsten Feld wechseln
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // PIN prüfen wenn alle 4 Ziffern eingegeben
    if (index === 3 && value) {
      const enteredPin = newPin.join('');
      verifyPin(enteredPin);
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Escape') {
      setShowPinInput(false);
      setShowForgotPin(false);
    }
  };

  const verifyPin = async (enteredPin: string) => {
    try {
      const response = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: enteredPin }),
      });
      const data = await response.json();

      if (data.success) {
        setIsPinUnlocked(true);
        setShowPinInput(false);
        setVerwaltungOpen(true);
        setIsExpanded(true); // Sidebar ausfahren
        // PIN-Session in localStorage speichern
        localStorage.setItem('admin_pin_session', 'unlocked');
      } else {
        setPinError(true);
        setPin(['', '', '', '']);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      }
    } catch {
      setPinError(true);
      setPin(['', '', '', '']);
    }
  };

  const handleForgotPin = async () => {
    if (!resetEmail || !resetEmail.includes('@')) {
      return;
    }
    try {
      await fetch('/api/admin/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
    } catch {
      // Ignorieren - immer gleiche Nachricht anzeigen
    }
    alert(`Falls diese E-Mail registriert ist, wurde die PIN gesendet.`);
    setShowForgotPin(false);
    setResetEmail('');
  };

  return (
    <>
      <aside
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => {
          // Sidebar bleibt ausgefahren wenn PIN entsperrt ist oder PIN-Eingabe offen ist
          if (!isPinUnlocked && !showPinInput) {
            setIsExpanded(false);
            setVerwaltungOpen(false);
          }
        }}
        className={`
          h-full bg-slate-50 flex flex-col py-5 rounded-3xl
          shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] border border-slate-200/50
          shrink-0 overflow-hidden
          transition-all duration-300 ease-in-out
          ${isExpanded ? 'w-64 px-4' : 'w-[72px] px-3'}
        `}
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Link href="/dashboard" className="w-10 h-10 flex items-center justify-center flex-shrink-0">
            <Image
              src="/logo.png"
              alt="Beban"
              width={32}
              height={32}
              className="object-contain"
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {/* Hauptmenü Items */}
          {mainNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={!isExpanded ? item.label : undefined}
                className={`
                  flex items-center py-2.5 rounded-xl transition-all group no-underline
                  ${isExpanded ? 'px-4 gap-3' : 'justify-center'}
                  ${active
                    ? 'bg-white text-slate-900 font-semibold shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
                  }
                `}
              >
                <span className={`flex-shrink-0 ${active ? 'text-gold' : 'text-slate-400 group-hover:text-slate-600'}`}>
                  {item.icon}
                </span>
                {isExpanded && (
                  <span className="text-sm whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Verwaltung - PIN-geschützte Gruppe */}
          <div className="pt-4">
            {/* Verwaltung Header (klickbar zum Ausklappen/PIN eingeben) */}
            <button
              onClick={handleVerwaltungClick}
              title={!isExpanded ? 'Verwaltung' : undefined}
              className={`
                w-full flex items-center py-2.5 rounded-xl transition-all group
                ${isExpanded ? 'px-4 gap-3' : 'justify-center'}
                ${isVerwaltungActive && !verwaltungOpen
                  ? 'bg-white text-slate-900 font-semibold shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
                }
              `}
            >
              <span className={`flex-shrink-0 ${isVerwaltungActive ? 'text-gold' : 'text-slate-400 group-hover:text-slate-600'}`}>
                {isPinUnlocked ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </span>
              {isExpanded && (
                <>
                  <span className="text-sm whitespace-nowrap flex-1 text-left">
                    Verwaltung
                  </span>
                  {isPinUnlocked ? (
                    <svg
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${verwaltungOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                </>
              )}
            </button>

            {/* Inline PIN-Eingabe (nur sichtbar wenn nicht entsperrt und showPinInput aktiv) */}
            <div
              className={`
                overflow-hidden transition-all duration-200 ease-in-out
                ${showPinInput && isExpanded && !isPinUnlocked ? 'max-h-[140px] opacity-100 mt-2' : 'max-h-0 opacity-0'}
              `}
            >
              <div className="px-3 py-3">
                {showForgotPin ? (
                  /* PIN vergessen Ansicht - inline */
                  <div className="space-y-2">
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="E-Mail-Adresse"
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold bg-white"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={handleForgotPin}
                        className="flex-1 py-1.5 bg-gold text-black text-xs font-medium rounded-lg hover:bg-gold/90 transition-colors"
                      >
                        Senden
                      </button>
                      <button
                        onClick={() => setShowForgotPin(false)}
                        className="px-2 py-1.5 text-slate-400 text-xs hover:text-slate-600 transition-colors"
                      >
                        Zurück
                      </button>
                    </div>
                  </div>
                ) : (
                  /* PIN Eingabe - inline */
                  <div className="space-y-2">
                    <div className="flex justify-center gap-1.5">
                      {[0, 1, 2, 3].map((index) => (
                        <input
                          key={index}
                          ref={(el) => { inputRefs.current[index] = el; }}
                          type="password"
                          inputMode="numeric"
                          maxLength={1}
                          value={pin[index]}
                          onChange={(e) => handlePinChange(index, e.target.value)}
                          onKeyDown={(e) => handlePinKeyDown(index, e)}
                          className={`
                            w-10 h-10 text-center text-lg font-bold rounded-lg border-2
                            focus:outline-none focus:ring-1 focus:ring-gold/50 transition-all
                            ${pinError
                              ? 'border-red-300 bg-red-50 text-red-600 animate-shake'
                              : 'border-slate-200 bg-white text-slate-900 focus:border-gold'
                            }
                          `}
                          style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
                        />
                      ))}
                    </div>
                    {pinError && (
                      <p className="text-[10px] text-red-500 text-center">Falsche PIN</p>
                    )}
                    <button
                      onClick={() => setShowForgotPin(true)}
                      className="w-full text-[10px] text-slate-400 hover:text-gold transition-colors"
                    >
                      PIN vergessen?
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Verwaltung Unterpunkte (nur sichtbar wenn PIN eingegeben und ausgeklappt) */}
            <div
              className={`
                overflow-hidden transition-all duration-200 ease-in-out
                ${verwaltungOpen && isExpanded && isPinUnlocked ? 'max-h-[500px] opacity-100 mt-1' : 'max-h-0 opacity-0'}
              `}
            >
              {verwaltungItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center py-2 rounded-xl transition-all group no-underline ml-4
                      ${isExpanded ? 'px-4 gap-3' : 'justify-center'}
                      ${active
                        ? 'bg-white text-slate-900 font-semibold shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
                      }
                    `}
                  >
                    <span className={`flex-shrink-0 ${active ? 'text-gold' : 'text-slate-400 group-hover:text-slate-600'}`}>
                      {item.icon}
                    </span>
                    <span className="text-sm whitespace-nowrap">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Footer Links */}
        <div className="mt-auto pt-4 border-t border-slate-200/60">
          <Link
            href="/"
            title={!isExpanded ? 'Zur Website' : undefined}
            className={`
              flex items-center py-2.5 rounded-xl transition-all group no-underline
              text-slate-500 hover:text-slate-900 hover:bg-white/60
              ${isExpanded ? 'px-4 gap-3' : 'justify-center'}
            `}
          >
            <svg className="w-5 h-5 flex-shrink-0 text-slate-400 group-hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            {isExpanded && (
              <span className="text-sm whitespace-nowrap">
                Zur Website
              </span>
            )}
          </Link>

          {onLogout && (
            <button
              onClick={onLogout}
              title={!isExpanded ? 'Abmelden' : undefined}
              className={`
                flex items-center py-2 text-slate-400 hover:text-red-500 transition-colors w-full rounded-xl
                ${isExpanded ? 'px-4 gap-3' : 'justify-center'}
              `}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {isExpanded && (
                <span className="text-sm font-medium whitespace-nowrap">
                  Abmelden
                </span>
              )}
            </button>
          )}
        </div>
      </aside>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </>
  );
}
