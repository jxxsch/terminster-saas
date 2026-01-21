'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { resetPassword } from '@/lib/supabase';
import { useTranslations } from 'next-intl';

interface LoginModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

type Tab = 'login' | 'register' | 'forgot';

export function LoginModal({ onClose, onSuccess }: LoginModalProps) {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const { signIn, signUp } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await signIn(email, password);

    if (result.error) {
      setError(translateError(result.error));
      setIsSubmitting(false);
    } else {
      onSuccess?.();
      onClose();
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firstName.trim()) {
      setError(t('errors.enterFirstName'));
      return;
    }
    if (!lastName.trim()) {
      setError(t('errors.enterLastName'));
      return;
    }
    if (!phone.trim()) {
      setError(t('errors.enterPhone'));
      return;
    }
    if (!birthDate) {
      setError(t('errors.enterBirthDate'));
      return;
    }
    if (password.length < 6) {
      setError(t('errors.passwordTooShort'));
      return;
    }

    setIsSubmitting(true);

    const result = await signUp({
      email,
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      birthDate,
    });

    if (result.error) {
      setError(translateError(result.error));
      setIsSubmitting(false);
    } else {
      setSuccessMessage(t('registerSuccess'));
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError(t('errors.enterEmail'));
      return;
    }

    setIsSubmitting(true);
    const result = await resetPassword(email);

    if (result.error) {
      setError(translateError(result.error));
    } else {
      setSuccessMessage(t('resetLinkSent'));
    }
    setIsSubmitting(false);
  };

  const translateError = (error: string): string => {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': t('errors.invalidCredentials'),
      'Email not confirmed': t('errors.emailNotConfirmed'),
      'User already registered': t('errors.userExists'),
      'Password should be at least 6 characters': t('errors.passwordTooShort'),
      'Unable to validate email address: invalid format': t('errors.invalidEmail'),
    };
    return errorMap[error] || error;
  };

  const resetForm = () => {
    setError('');
    setSuccessMessage('');
  };

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full max-w-xl min-w-[480px] rounded-lg overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-100 px-4 py-2 flex items-center justify-between">
          <span className="text-sm font-light text-gold tracking-[0.2em] uppercase">{t('customerArea')}</span>
          <button onClick={onClose} className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        {activeTab !== 'forgot' && (
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              {[
                { id: 'login', label: t('login') },
                { id: 'register', label: t('register') },
              ].map((tab, index, arr) => (
                <div key={tab.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <button
                      onClick={() => { setActiveTab(tab.id as Tab); resetForm(); }}
                      className={`text-xs font-medium mb-1 transition-colors ${
                        activeTab === tab.id ? 'text-gold' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {index + 1}. {tab.label}
                    </button>
                    <div className="w-full h-1 rounded-full bg-gray-200 overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${
                        activeTab === tab.id ? 'bg-gold w-full' : 'w-0'
                      }`} />
                    </div>
                  </div>
                  {index < arr.length - 1 && <div className="w-4" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Forgot Password Header */}
        {activeTab === 'forgot' && (
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <button
              onClick={() => { setActiveTab('login'); resetForm(); }}
              className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-400"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xs font-medium text-gray-600">{t('resetPassword')}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-5 h-[400px] flex flex-col">
          {/* Success Message */}
          {successMessage && (
            <div className="flex items-center gap-2 text-green-700 text-[10px] bg-green-50 border border-green-200 rounded-sm px-3 py-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-[10px] bg-red-50 border border-red-200 rounded-sm px-3 py-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          {activeTab === 'login' && !successMessage && (
            <form onSubmit={handleLogin} className="flex-1 flex flex-col space-y-4">
              <div>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-[8px] text-gray-400">1.</span>
                  <h3 className="text-[8px] text-gray-500">{t('email')}</h3>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-[8px] text-gray-400">2.</span>
                  <h3 className="text-[8px] text-gray-500">{t('password')}</h3>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors"
                  required
                />
              </div>

              <div className="mt-auto pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setActiveTab('forgot'); resetForm(); }}
                  className="text-xs text-gray-400 hover:text-gold transition-colors"
                >
                  {t('forgotPassword')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !email || !password}
                  className="px-6 py-2.5 bg-black text-white text-xs font-light tracking-[0.15em] uppercase hover:bg-gold transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-black"
                >
                  {isSubmitting ? t('loggingIn') : t('login')}
                </button>
              </div>
            </form>
          )}

          {/* Register Form */}
          {activeTab === 'register' && !successMessage && (
            <form onSubmit={handleRegister} className="flex-1 flex flex-col space-y-4">
              <div>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-[8px] text-gray-400">1.</span>
                  <h3 className="text-[8px] text-gray-500">{t('firstName')} & {t('lastName')}</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={t('firstName')}
                    className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors"
                    required
                  />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={t('lastName')}
                    className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors"
                    required
                  />
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-[8px] text-gray-400">2.</span>
                  <h3 className="text-[8px] text-gray-500">{t('phone')} & {t('email')}</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('phone')}
                    className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors"
                    required
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('email')}
                    className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-[8px] text-gray-400">3.</span>
                  <h3 className="text-[8px] text-gray-500">{t('password')}</h3>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('passwordMinLength')}
                  className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors"
                  required
                  minLength={6}
                />
              </div>

              <div className="mt-auto pt-4 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !firstName || !lastName || !birthDate || !phone || !email || !password || password.length < 6}
                  className="px-6 py-2.5 bg-black text-white text-xs font-light tracking-[0.15em] uppercase hover:bg-gold transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-black"
                >
                  {isSubmitting ? t('registering') : t('register')}
                </button>
              </div>
            </form>
          )}

          {/* Forgot Password Form */}
          {activeTab === 'forgot' && !successMessage && (
            <form onSubmit={handleForgotPassword} className="flex-1 flex flex-col space-y-4">
              <p className="text-xs text-gray-500">
                {t('resetDescription')}
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('email')}
                className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors"
                required
              />
              <div className="mt-auto pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className="px-6 py-2.5 bg-black text-white text-xs font-light tracking-[0.15em] uppercase hover:bg-gold transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-black"
                >
                  {isSubmitting ? t('sendingLink') : t('sendResetLink')}
                </button>
              </div>
            </form>
          )}

          {/* Back to Login after success */}
          {successMessage && activeTab !== 'login' && (
            <div className="mt-auto pt-4 flex justify-end">
              <button
                onClick={() => { setActiveTab('login'); resetForm(); }}
                className="px-6 py-2.5 bg-black text-white text-xs font-light tracking-[0.15em] uppercase hover:bg-gold transition-all"
              >
                {t('goToLogin')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
