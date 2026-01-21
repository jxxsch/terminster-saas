'use client';

import { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/shared/AppSidebar';
import Image from 'next/image';

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
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 bg-[#FAFAFA]">
        <div className="w-full max-w-[400px]">
          {/* Logo */}
          <div className="text-center mb-8">
            <Image
              src="/logo.png"
              alt="Beban Logo"
              width={64}
              height={64}
              className="mx-auto"
              priority
            />
          </div>

          {/* Login Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-md">
            <h1 className="text-2xl font-light text-center mb-6 text-black">
              Admin <span className="text-gold">Panel</span>
            </h1>

            <form onSubmit={handleLogin}>
              <label
                htmlFor="password"
                className="block text-sm text-gray-500 mb-2"
              >
                Passwort
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Passwort eingeben"
                className="w-full p-4 text-base border border-gray-200 rounded-lg mb-4 outline-none text-black bg-white focus:border-gold"
                autoFocus
              />

              {error && (
                <p className="text-red-500 text-sm text-center mb-4">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="w-full p-4 bg-gold text-black text-sm font-medium uppercase tracking-wider rounded-lg hover:bg-gold/90 transition-colors"
              >
                Anmelden
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Layout
  return (
    <div className="h-screen flex gap-6 p-6 overflow-hidden bg-white">
      {/* Floating Sidebar */}
      <AppSidebar onLogout={handleLogout} />

      {/* Main Content Area */}
      <main className="flex-1 bg-slate-50 rounded-3xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] border border-slate-200/50 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
