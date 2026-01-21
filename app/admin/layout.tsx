'use client';

import { useState, useEffect } from 'react';
import { Geist } from 'next/font/google';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ThemeProvider } from '@/context/ThemeContext';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import Image from 'next/image';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const ADMIN_PASSWORD = 'beban2024';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Initializing auth state from localStorage on mount
  useEffect(() => {
    const session = localStorage.getItem('admin_session');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsAuthenticated(session === 'authenticated');
    setIsLoading(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('admin_session', 'authenticated');
      setError('');
    } else {
      setError('Falsches Passwort');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('admin_session');
  };

  // Loading state
  if (isLoading) {
    return (
      <html lang="de">
        <body className={`${geistSans.variable} antialiased`} style={{ background: '#FAFAFA' }}>
          <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        </body>
      </html>
    );
  }

  // Login Screen
  if (!isAuthenticated) {
    return (
      <html lang="de">
        <body className={`${geistSans.variable} antialiased`} style={{ background: '#FAFAFA', margin: 0, padding: 0 }}>
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}>
            <div style={{
              width: '100%',
              maxWidth: '400px',
            }}>
              {/* Logo */}
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <Image
                  src="/logo.png"
                  alt="Beban Logo"
                  width={64}
                  height={64}
                  style={{ margin: '0 auto' }}
                  priority
                />
              </div>

              {/* Login Card */}
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E5E5',
                borderRadius: '12px',
                padding: '32px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}>
                <h1 style={{
                  fontSize: '24px',
                  fontWeight: 300,
                  textAlign: 'center',
                  marginBottom: '24px',
                  color: '#000000',
                }}>
                  Admin <span style={{ color: '#D4AF37' }}>Panel</span>
                </h1>

                <form onSubmit={handleLogin}>
                  <label
                    htmlFor="password"
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      color: '#666666',
                      marginBottom: '8px',
                    }}
                  >
                    Passwort
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Passwort eingeben"
                    style={{
                      width: '100%',
                      padding: '16px',
                      fontSize: '16px',
                      border: '1px solid #E5E5E5',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      color: '#000000',
                      backgroundColor: '#FFFFFF',
                    }}
                    autoFocus
                  />

                  {error && (
                    <p style={{
                      color: '#EF4444',
                      fontSize: '14px',
                      textAlign: 'center',
                      marginBottom: '16px',
                    }}>
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    style={{
                      width: '100%',
                      padding: '16px',
                      backgroundColor: '#D4AF37',
                      color: '#000000',
                      fontSize: '14px',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    Anmelden
                  </button>
                </form>
              </div>
            </div>
          </div>
        </body>
      </html>
    );
  }

  // Authenticated Layout
  return (
    <html lang="de">
      <body className={`${geistSans.variable} antialiased`}>
        <ThemeProvider storageKey="admin-theme">
          <div className="dashboard-layout min-h-screen bg-[#FAFAFA] text-black dark:bg-[#0f0f0f] dark:text-gray-100">
            <AdminSidebar />
            {/* Main content with margin for collapsed sidebar */}
            <div className="ml-16 flex flex-col min-h-screen">
              {/* Header */}
              <header className="h-[57px] bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800 px-6 flex items-center justify-end gap-3 sticky top-0 z-30">
                <DarkModeToggle />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Abmelden
                </button>
              </header>
              {/* Main Content */}
              <main className="flex-1 p-6 overflow-auto">
                {children}
              </main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
