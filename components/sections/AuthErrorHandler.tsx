'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { resendConfirmationEmail } from '@/lib/supabase';

const ERROR_MESSAGES: Record<string, { title: string; message: string; canResend: boolean }> = {
  otp_expired: {
    title: 'Link abgelaufen',
    message: 'Der Bestätigungslink ist abgelaufen. Bitte fordere einen neuen Link an.',
    canResend: true,
  },
  access_denied: {
    title: 'Zugriff verweigert',
    message: 'Der Link ist ungültig oder wurde bereits verwendet.',
    canResend: true,
  },
  invalid_token: {
    title: 'Ungültiger Link',
    message: 'Der Bestätigungslink ist ungültig.',
    canResend: true,
  },
};

export function AuthErrorHandler() {
  const [error, setError] = useState<{ code: string; description: string } | null>(null);
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Parse error from URL hash
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const errorCode = params.get('error_code') || params.get('error');
      const errorDescription = params.get('error_description');

      if (errorCode) {
        setError({
          code: errorCode,
          description: errorDescription ? decodeURIComponent(errorDescription.replace(/\+/g, ' ')) : '',
        });

        // Clear the hash from URL
        window.history.replaceState(null, '', window.location.pathname);
      }
    }

    return () => setMounted(false);
  }, []);

  const handleResend = async () => {
    if (!email.trim()) {
      setResendError('Bitte E-Mail-Adresse eingeben');
      return;
    }

    setIsResending(true);
    setResendError('');

    const result = await resendConfirmationEmail(email);

    if (result.error) {
      setResendError(result.error);
    } else {
      setResendSuccess(true);
    }

    setIsResending(false);
  };

  const handleClose = () => {
    setError(null);
    setEmail('');
    setResendSuccess(false);
    setResendError('');
  };

  if (!error || !mounted) return null;

  const errorInfo = ERROR_MESSAGES[error.code] || {
    title: 'Fehler',
    message: error.description || 'Ein unbekannter Fehler ist aufgetreten.',
    canResend: false,
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white w-full rounded-lg overflow-hidden" style={{ maxWidth: '480px' }}>
        {/* Header */}
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-lg font-medium text-white">{errorInfo.title}</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {resendSuccess ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-700 mb-4">
                Ein neuer Bestätigungslink wurde an <strong>{email}</strong> gesendet.
              </p>
              <p className="text-sm text-gray-500">
                Bitte prüfe dein Postfach und klicke auf den Link in der E-Mail.
              </p>
              <button
                onClick={handleClose}
                className="mt-6 w-full py-3 bg-black text-white text-xs font-light tracking-[0.2em] uppercase hover:bg-gold transition-colors"
              >
                Schließen
              </button>
            </div>
          ) : (
            <>
              <p className="text-gray-700 mb-6">{errorInfo.message}</p>

              {errorInfo.canResend && (
                <>
                  <div className="mb-4">
                    <label className="block text-xs text-gray-500 mb-2">E-Mail-Adresse</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="deine@email.de"
                      className="w-full p-3 border border-gray-200 rounded-lg text-sm text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors"
                    />
                  </div>

                  {resendError && (
                    <div className="mb-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{resendError}</span>
                    </div>
                  )}

                  <button
                    onClick={handleResend}
                    disabled={isResending}
                    className="w-full py-3 bg-black text-white text-xs font-light tracking-[0.2em] uppercase hover:bg-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResending ? 'Wird gesendet...' : 'Neuen Link anfordern'}
                  </button>
                </>
              )}

              {!errorInfo.canResend && (
                <button
                  onClick={handleClose}
                  className="w-full py-3 bg-black text-white text-xs font-light tracking-[0.2em] uppercase hover:bg-gold transition-colors"
                >
                  Schließen
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
