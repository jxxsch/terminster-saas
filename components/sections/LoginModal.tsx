'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { resetPassword, setNewPassword, supabase } from '@/lib/supabase';
import { useTranslations } from 'next-intl';
import { DatePicker } from '@/components/ui/DatePicker';

export interface PasswordSetupData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface LoginModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  initialTab?: 'login' | 'register';
  passwordSetupData?: PasswordSetupData | null;
}

type Tab = 'login' | 'register' | 'forgot';

export function LoginModal({ onClose, onSuccess, initialTab = 'login', passwordSetupData }: LoginModalProps) {
  const t = useTranslations('auth');
  const { signIn, signUp, refreshCustomer } = useAuth();

  // Password Setup Mode
  const isPasswordSetupMode = !!passwordSetupData;

  const [activeTab, setActiveTab] = useState<Tab>(isPasswordSetupMode ? 'register' : initialTab);
  const [email, setEmail] = useState(passwordSetupData?.email || '');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState(passwordSetupData?.firstName || '');
  const [lastName, setLastName] = useState(passwordSetupData?.lastName || '');
  const [phone, setPhone] = useState(passwordSetupData?.phone || '');
  const [birthDate, setBirthDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [mounted, setMounted] = useState(false);
  const [closeHover, setCloseHover] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Update fields if passwordSetupData changes
  useEffect(() => {
    if (passwordSetupData) {
      setEmail(passwordSetupData.email);
      setFirstName(passwordSetupData.firstName);
      setLastName(passwordSetupData.lastName);
      setPhone(passwordSetupData.phone || '');
    }
  }, [passwordSetupData]);

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

  // Password Setup für Einladungs-Link
  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validierung
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

    try {
      // Passwort setzen und User-Metadata aktualisieren
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          birth_date: birthDate,
        },
      });

      if (updateError) {
        setError(translateError(updateError.message));
        setIsSubmitting(false);
        return;
      }

      // Aktuellen User holen
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const fullName = `${firstName.trim()} ${lastName.trim()}`;

        // Customer-Eintrag aktualisieren
        await supabase
          .from('customers')
          .update({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            name: fullName,
            phone: phone.trim(),
            birth_date: birthDate,
          })
          .eq('auth_id', user.id);

        // Alle zukünftigen Termine mit neuen Kundendaten aktualisieren
        const today = new Date().toISOString().split('T')[0];

        // Hole customer_id
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('auth_id', user.id)
          .single();

        if (customer) {
          // Termine mit customer_id aktualisieren
          await supabase
            .from('appointments')
            .update({
              customer_name: fullName,
              customer_phone: phone.trim(),
            })
            .eq('customer_id', customer.id)
            .gte('date', today);

          // Serien mit customer_email aktualisieren
          if (user.email) {
            await supabase
              .from('series')
              .update({
                customer_name: fullName,
                customer_phone: phone.trim(),
              })
              .eq('customer_email', user.email.toLowerCase());
          }
        }
      }

      // Customer-Daten im AuthContext aktualisieren
      await refreshCustomer();

      setIsSubmitting(false);

      // Erfolg - CustomerPortal öffnen
      onSuccess?.();
    } catch (err) {
      console.error('Password setup error:', err);
      setError('Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
    } finally {
      setIsSubmitting(false);
    }
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

  // Inline styles for portal (Tailwind doesn't work in portal)
  const styles = {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    },
    backdrop: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modal: {
      position: 'relative' as const,
      backgroundColor: '#f8fafc', // slate-50
      width: '100%',
      maxWidth: '28rem',
      borderRadius: '1rem',
      overflow: 'hidden',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      border: '1px solid #e2e8f0', // slate-200
      animation: 'modalFadeIn 0.2s ease-out',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem 1.25rem',
      borderBottom: '1px solid #e2e8f0',
      backgroundColor: 'white',
    },
    title: {
      fontSize: '1.125rem',
      fontWeight: 700,
      color: '#0f172a', // slate-900
    },
    closeButton: {
      padding: '0.5rem',
      borderRadius: '0.5rem',
      cursor: 'pointer',
      background: closeHover ? '#f1f5f9' : 'transparent',
      border: 'none',
      transition: 'all 0.15s ease',
      transform: closeHover ? 'scale(1.1)' : 'scale(1)',
    },
    closeIcon: {
      width: '1.25rem',
      height: '1.25rem',
      color: closeHover ? '#ef4444' : '#64748b',
      transition: 'color 0.15s ease',
    },
    content: {
      padding: '1.5rem 1.25rem',
      backgroundColor: 'white',
    },
    tabs: {
      display: 'flex',
      gap: '0.5rem',
      marginBottom: '1.5rem',
      padding: '0.25rem',
      backgroundColor: '#f1f5f9', // slate-100
      borderRadius: '0.75rem',
    },
    tab: (isActive: boolean) => ({
      flex: 1,
      padding: '0.625rem 1rem',
      borderRadius: '0.5rem',
      border: 'none',
      cursor: 'pointer',
      fontSize: '0.75rem',
      fontWeight: 600,
      transition: 'all 0.15s ease',
      backgroundColor: isActive ? 'white' : 'transparent',
      color: isActive ? '#0f172a' : '#64748b',
      boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
    }),
    inputGroup: {
      marginBottom: '1rem',
    },
    label: {
      display: 'block',
      fontSize: '0.6875rem',
      fontWeight: 600,
      color: '#64748b', // slate-500
      marginBottom: '0.5rem',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    },
    input: {
      width: '100%',
      padding: '0.75rem 1rem',
      backgroundColor: '#f8fafc', // slate-50
      border: '1px solid #e2e8f0',
      borderRadius: '0.75rem',
      fontSize: '0.875rem',
      color: '#0f172a',
      outline: 'none',
      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    },
    primaryButton: {
      padding: '0.75rem 1.5rem',
      backgroundColor: '#d4a853', // gold
      color: '#0f172a',
      border: 'none',
      borderRadius: '0.75rem',
      fontSize: '0.75rem',
      fontWeight: 700,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
    secondaryButton: {
      padding: '0.5rem',
      backgroundColor: 'transparent',
      color: '#64748b',
      border: 'none',
      borderRadius: '0.5rem',
      fontSize: '0.75rem',
      cursor: 'pointer',
      transition: 'color 0.15s ease',
    },
    errorBox: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.75rem 1rem',
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '0.75rem',
      marginBottom: '1rem',
      fontSize: '0.75rem',
      color: '#dc2626',
    },
    successBox: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.75rem 1rem',
      backgroundColor: '#f0fdf4',
      border: '1px solid #bbf7d0',
      borderRadius: '0.75rem',
      marginBottom: '1rem',
      fontSize: '0.75rem',
      color: '#16a34a',
    },
    footer: {
      padding: '1rem 1.25rem',
      backgroundColor: '#f8fafc',
      borderTop: '1px solid #e2e8f0',
    },
  };

  const modalContent = (
    <div style={styles.overlay}>
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .login-input:focus {
          border-color: #d4a853 !important;
          box-shadow: 0 0 0 3px rgba(212, 168, 83, 0.1) !important;
        }
        .login-input::placeholder {
          color: #94a3b8;
        }
        .primary-btn:hover:not(:disabled) {
          background-color: #c49a4a !important;
          transform: translateY(-1px);
        }
        .primary-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .secondary-btn:hover {
          color: #d4a853 !important;
        }
      `}</style>

      <div style={styles.backdrop} onClick={onClose} />

      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.title}>{isPasswordSetupMode ? 'Passwort festlegen' : 'Kundenbereich'}</span>
          <button
            onClick={onClose}
            onMouseEnter={() => setCloseHover(true)}
            onMouseLeave={() => setCloseHover(false)}
            style={styles.closeButton}
          >
            <svg style={styles.closeIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Tabs - versteckt im Password-Setup-Modus */}
          {activeTab !== 'forgot' && !isPasswordSetupMode && (
            <div style={styles.tabs}>
              <button
                onClick={() => { setActiveTab('login'); resetForm(); }}
                style={styles.tab(activeTab === 'login')}
              >
                Anmelden
              </button>
              <button
                onClick={() => { setActiveTab('register'); resetForm(); }}
                style={styles.tab(activeTab === 'register')}
              >
                Registrieren
              </button>
            </div>
          )}

          {/* Forgot Password Back Button */}
          {activeTab === 'forgot' && (
            <div style={{ marginBottom: '1rem' }}>
              <button
                onClick={() => { setActiveTab('login'); resetForm(); }}
                className="secondary-btn"
                style={{ ...styles.secondaryButton, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Zurück
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={styles.errorBox}>
              <svg style={{ width: '1rem', height: '1rem', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div style={styles.successBox}>
              <svg style={{ width: '1rem', height: '1rem', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Login Form */}
          {activeTab === 'login' && !successMessage && (
            <form onSubmit={handleLogin}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>E-Mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  className="login-input"
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Passwort</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="login-input"
                  style={styles.input}
                  autoComplete="current-password"
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setActiveTab('forgot'); resetForm(); }}
                  className="secondary-btn"
                  style={styles.secondaryButton}
                >
                  Passwort vergessen?
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !email || !password}
                  className="primary-btn"
                  style={styles.primaryButton}
                >
                  {isSubmitting ? 'Wird geladen...' : 'Anmelden'}
                </button>
              </div>
            </form>
          )}

          {/* Register Form / Password Setup Form */}
          {activeTab === 'register' && !successMessage && (
            <form onSubmit={isPasswordSetupMode ? handlePasswordSetup : handleRegister}>
              {/* Zeile 1: Vorname, Nachname */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={styles.label}>Vorname</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Max"
                    className="login-input"
                    style={styles.input}
                    required
                  />
                </div>
                <div>
                  <label style={styles.label}>Nachname</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Mustermann"
                    className="login-input"
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              {/* Zeile 2: E-Mail, Telefon */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={styles.label}>E-Mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => !isPasswordSetupMode && setEmail(e.target.value)}
                    placeholder="deine@email.de"
                    className="login-input"
                    style={{
                      ...styles.input,
                      ...(isPasswordSetupMode ? {
                        backgroundColor: '#f1f5f9',
                        color: '#64748b',
                        cursor: 'not-allowed',
                      } : {}),
                    }}
                    readOnly={isPasswordSetupMode}
                    required
                  />
                </div>
                <div>
                  <label style={styles.label}>Telefon</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0176 123456"
                    className="login-input"
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              {/* Zeile 3: Geburtstag, Passwort */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={styles.label}>Geburtstag</label>
                  <DatePicker
                    value={birthDate}
                    onChange={setBirthDate}
                    style={styles.input}
                    required
                    max={new Date().toISOString().split('T')[0]}
                    min="1920-01-01"
                  />
                </div>
                <div>
                  <label style={styles.label}>Passwort</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 Zeichen"
                    className="login-input"
                    style={styles.input}
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="submit"
                  disabled={isSubmitting || !firstName || !lastName || !birthDate || !phone || !email || !password || password.length < 6}
                  className="primary-btn"
                  style={styles.primaryButton}
                >
                  {isSubmitting ? 'Wird geladen...' : (isPasswordSetupMode ? 'Passwort festlegen' : 'Registrieren')}
                </button>
              </div>
            </form>
          )}

          {/* Forgot Password Form */}
          {activeTab === 'forgot' && !successMessage && (
            <form onSubmit={handleForgotPassword}>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen deines Passworts.
              </p>

              <div style={styles.inputGroup}>
                <label style={styles.label}>E-Mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  className="login-input"
                  style={styles.input}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className="primary-btn"
                  style={styles.primaryButton}
                >
                  {isSubmitting ? 'Wird gesendet...' : 'Link senden'}
                </button>
              </div>
            </form>
          )}

          {/* Back to Login after success */}
          {successMessage && activeTab !== 'login' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setActiveTab('login'); resetForm(); }}
                className="primary-btn"
                style={styles.primaryButton}
              >
                Zum Login
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={{ fontSize: '0.6875rem', color: '#94a3b8', textAlign: 'center' }}>
            Mit der Anmeldung akzeptierst du unsere Datenschutzrichtlinien.
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
