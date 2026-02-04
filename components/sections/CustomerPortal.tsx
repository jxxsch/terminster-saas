'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { useTranslations } from 'next-intl';
import {
  getCustomerAppointments,
  cancelAppointment,
  updateCustomer,
  getTeam,
  getServices,
  getSetting,
  Appointment,
  TeamMember,
  Service,
  formatPrice,
} from '@/lib/supabase';
import { DatePicker } from '@/components/ui/DatePicker';
import { useRealtimeAppointments } from '@/hooks/useRealtimeAppointments';

interface CustomerPortalProps {
  onClose: () => void;
  onBookNow?: () => void;
}

type Tab = 'upcoming' | 'past' | 'profile';

export function CustomerPortal({ onClose, onBookNow }: CustomerPortalProps) {
  const t = useTranslations('customerPortal');
  const tDays = useTranslations('days');
  const tMonths = useTranslations('months');
  const tAuth = useTranslations('auth');
  const tCommon = useTranslations('common');
  const { customer, refreshCustomer, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancellationHours, setCancellationHours] = useState<number>(24);
  const [mounted, setMounted] = useState(false);
  const [closeHover, setCloseHover] = useState(false);
  const [logoutHover, setLogoutHover] = useState(false);

  // Profile editing - alle Felder
  const [editFirstName, setEditFirstName] = useState(customer?.first_name || '');
  const [editLastName, setEditLastName] = useState(customer?.last_name || '');
  const [editPhone, setEditPhone] = useState(customer?.phone || '');
  const [editBirthDate, setEditBirthDate] = useState(customer?.birth_date || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

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

  // Nur Termine neu laden (für Realtime-Updates, ohne Loading-State)
  const refreshAppointments = useCallback(async () => {
    if (!customer?.id) return;
    try {
      const appointmentsData = await getCustomerAppointments(customer.id);
      setAppointments(appointmentsData || []);
    } catch (error) {
      console.error('Error refreshing appointments:', error);
    }
  }, [customer?.id]);

  // Realtime-Subscription für Termine
  useRealtimeAppointments({
    customerId: customer?.id,
    onUpdate: refreshAppointments,
    enabled: !!customer?.id,
  });

  // Load data with auto-retry
  const loadData = async (retryCount = 0): Promise<boolean> => {
    const maxRetries = 3;
    const retryDelay = 1000;

    if (!customer?.id) {
      setIsLoading(false);
      return true;
    }

    setIsLoading(true);
    setLoadError(false);

    try {
      const [appointmentsData, teamData, servicesData, cancellationSetting] = await Promise.all([
        getCustomerAppointments(customer.id),
        getTeam(),
        getServices(),
        getSetting<{ value: number }>('cancellation_hours'),
      ]);

      setAppointments(appointmentsData || []);
      setTeam(teamData || []);
      setServices(servicesData || []);
      if (cancellationSetting?.value) {
        setCancellationHours(cancellationSetting.value);
      }
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error(`Error loading customer data (attempt ${retryCount + 1}/${maxRetries}):`, error);

      if (retryCount < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return loadData(retryCount + 1);
      } else {
        setLoadError(true);
        setIsLoading(false);
        return false;
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [customer?.id]);

  // Update edit fields when customer changes
  useEffect(() => {
    if (customer) {
      setEditFirstName(customer.first_name || '');
      setEditLastName(customer.last_name || '');
      setEditPhone(customer.phone || '');
      setEditBirthDate(customer.birth_date || '');
    }
  }, [customer]);

  // Separate appointments
  const { upcomingAppointments, pastAppointments } = useMemo(() => {
    const now = new Date();
    const upcoming: Appointment[] = [];
    const past: Appointment[] = [];

    appointments.forEach(apt => {
      const aptDate = new Date(`${apt.date}T${apt.time_slot}`);
      if (aptDate >= now && apt.status !== 'cancelled') {
        upcoming.push(apt);
      } else {
        past.push(apt);
      }
    });

    upcoming.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time_slot}`);
      const dateB = new Date(`${b.date}T${b.time_slot}`);
      return dateA.getTime() - dateB.getTime();
    });

    return { upcomingAppointments: upcoming, pastAppointments: past };
  }, [appointments]);

  // Helper functions
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
  const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;

  const getBarberName = (barberId: string) => team.find(t => t.id === barberId)?.name || tCommon('unknown');
  const getServiceName = (serviceId: string | null) => {
    if (!serviceId) return '-';
    return services.find(s => s.id === serviceId)?.name || tCommon('unknown');
  };
  const getServicePrice = (serviceId: string | null) => {
    if (!serviceId) return '-';
    const service = services.find(s => s.id === serviceId);
    return service ? formatPrice(service.price) : '';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayName = tDays(`long.${dayKeys[date.getDay()]}`);
    const monthName = tMonths(monthKeys[date.getMonth()]);
    return `${dayName}, ${date.getDate()}. ${monthName}`;
  };

  const formatBirthDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const monthName = tMonths(monthKeys[date.getMonth()]);
    return `${date.getDate()}. ${monthName} ${date.getFullYear()}`;
  };

  const canCancelAppointment = (apt: Appointment): boolean => {
    const appointmentDate = new Date(`${apt.date}T${apt.time_slot}`);
    const now = new Date();
    const hoursUntil = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntil >= cancellationHours;
  };

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    setCancelError(null);

    const result = await cancelAppointment(id);

    if (result.success) {
      setAppointments(prev =>
        prev.map(a =>
          a.id === id ? { ...a, status: 'cancelled' as const } : a
        )
      );
    } else {
      setCancelError(result.error);
    }

    setCancellingId(null);
  };

  const handleSaveProfile = async () => {
    if (!customer) return;

    setIsSavingProfile(true);
    setProfileSuccess(false);

    const result = await updateCustomer(customer.id, {
      first_name: editFirstName.trim(),
      last_name: editLastName.trim(),
      phone: editPhone.trim() || null,
      birth_date: editBirthDate || null,
    });

    if (result) {
      await refreshCustomer();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    }

    setIsSavingProfile(false);
  };

  const hasProfileChanges = () => {
    if (!customer) return false;
    return (
      editFirstName !== (customer.first_name || '') ||
      editLastName !== (customer.last_name || '') ||
      editPhone !== (customer.phone || '') ||
      editBirthDate !== (customer.birth_date || '')
    );
  };

  if (!customer || !mounted) return null;

  const tabs = [
    { id: 'upcoming' as Tab, label: t('upcoming'), count: upcomingAppointments.length },
    { id: 'past' as Tab, label: t('past'), count: pastAppointments.length },
    { id: 'profile' as Tab, label: t('profile'), count: null },
  ];

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
      zIndex: 10,
      backgroundColor: '#f8fafc',
      width: '100%',
      maxWidth: '40rem',
      height: '70vh',
      minHeight: '500px',
      borderRadius: '1rem',
      overflow: 'hidden',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      border: '1px solid #e2e8f0',
      animation: 'modalFadeIn 0.2s ease-out',
      display: 'flex',
      flexDirection: 'column' as const,
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
      color: '#0f172a',
    },
    headerButtons: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
    },
    iconButton: (isHover: boolean, isLogout: boolean = false) => ({
      padding: '0.5rem',
      borderRadius: '0.5rem',
      cursor: 'pointer',
      background: isHover ? (isLogout ? '#fef2f2' : '#f1f5f9') : 'transparent',
      border: 'none',
      transition: 'all 0.15s ease',
      transform: isHover ? 'scale(1.1)' : 'scale(1)',
    }),
    iconButtonIcon: (isHover: boolean, isLogout: boolean = false) => ({
      width: '1.25rem',
      height: '1.25rem',
      color: isHover ? (isLogout ? '#ef4444' : '#ef4444') : '#64748b',
      transition: 'color 0.15s ease',
    }),
    content: {
      flex: 1,
      minHeight: 0,
      overflow: 'hidden',
      backgroundColor: 'white',
      display: 'flex',
      flexDirection: 'column' as const,
    },
    tabs: {
      display: 'flex',
      gap: '0.5rem',
      padding: '1rem 1.25rem',
      borderBottom: '1px solid #e2e8f0',
      backgroundColor: '#f8fafc',
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
    scrollArea: {
      flex: 1,
      padding: '1.25rem',
      overflowY: 'auto' as const,
    },
    label: {
      display: 'block',
      fontSize: '0.6875rem',
      fontWeight: 600,
      color: '#64748b',
      marginBottom: '0.5rem',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    },
    input: {
      width: '100%',
      padding: '0.75rem 1rem',
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '0.75rem',
      fontSize: '1rem',
      color: '#0f172a',
      outline: 'none',
      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    },
    inputDisabled: {
      width: '100%',
      padding: '0.75rem 1rem',
      backgroundColor: '#f1f5f9',
      border: '1px solid #e2e8f0',
      borderRadius: '0.75rem',
      fontSize: '1rem',
      color: '#94a3b8',
      cursor: 'not-allowed',
    },
    primaryButton: {
      padding: '0.75rem 1.5rem',
      backgroundColor: '#d4a853',
      color: '#0f172a',
      border: 'none',
      borderRadius: '0.75rem',
      fontSize: '0.75rem',
      fontWeight: 700,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
    outlineButton: {
      padding: '0.75rem 1.5rem',
      backgroundColor: 'transparent',
      color: '#d4a853',
      border: '1px solid #d4a853',
      borderRadius: '0.75rem',
      fontSize: '0.75rem',
      fontWeight: 700,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
    cancelButton: {
      padding: '0.5rem 0.75rem',
      backgroundColor: 'transparent',
      color: '#ef4444',
      border: '1px solid #fecaca',
      borderRadius: '0.5rem',
      fontSize: '0.6875rem',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
    appointmentCard: {
      padding: '1rem',
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '0.75rem',
      marginBottom: '0.75rem',
      transition: 'border-color 0.15s ease',
    },
    appointmentCardCancelled: {
      padding: '1rem',
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '0.75rem',
      marginBottom: '0.75rem',
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
    emptyState: {
      textAlign: 'center' as const,
      padding: '3rem 1rem',
      color: '#94a3b8',
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
        .portal-input:focus {
          border-color: #d4a853 !important;
          box-shadow: 0 0 0 3px rgba(212, 168, 83, 0.1) !important;
        }
        .portal-input::placeholder {
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
        .outline-btn:hover {
          background-color: rgba(212, 168, 83, 0.1) !important;
        }
        .cancel-btn:hover:not(:disabled) {
          background-color: #fef2f2 !important;
        }
        .cancel-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .apt-card:hover {
          border-color: #d4a853 !important;
        }
      `}</style>

      <div style={styles.backdrop} onClick={onClose} />

      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.title}>{t('title')}</span>
          <div style={styles.headerButtons}>
            <button
              onClick={() => {
                signOut();
                onClose();
              }}
              onMouseEnter={() => setLogoutHover(true)}
              onMouseLeave={() => setLogoutHover(false)}
              style={styles.iconButton(logoutHover, true)}
              title={tAuth('logout')}
            >
              <svg style={styles.iconButtonIcon(logoutHover, true)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
            <button
              onClick={onClose}
              onMouseEnter={() => setCloseHover(true)}
              onMouseLeave={() => setCloseHover(false)}
              style={styles.iconButton(closeHover)}
            >
              <svg style={styles.iconButtonIcon(closeHover)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={styles.tab(activeTab === tab.id)}
            >
              {tab.label} {tab.count !== null && `(${tab.count})`}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={styles.content}>
          <div style={styles.scrollArea}>
            {isLoading ? (
              <div style={styles.emptyState}>
                <svg style={{ width: '2rem', height: '2rem', margin: '0 auto 0.75rem', animation: 'spin 1s linear infinite' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <p style={{ fontSize: '0.875rem' }}>{tCommon('loading')}</p>
              </div>
            ) : loadError ? (
              <div style={{ ...styles.emptyState, gap: '1rem' }}>
                <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                  <svg width="24" height="24" fill="none" stroke="#ef4444" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.25rem' }}>{t('connectionError')}</p>
                  <p style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{t('dataLoadFailed')}</p>
                </div>
                <button
                  onClick={() => loadData()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem 1.25rem',
                    backgroundColor: '#d4a853',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    margin: '0 auto',
                  }}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {tCommon('tryAgain')}
                </button>
              </div>
            ) : (
              <>
                {/* Upcoming Appointments */}
                {activeTab === 'upcoming' && (
                  <div>
                    {/* Termin buchen Button */}
                    {onBookNow && (
                      <button
                        onClick={() => {
                          onClose();
                          onBookNow();
                        }}
                        className="outline-btn"
                        style={{ ...styles.outlineButton, width: '100%', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                      >
                        <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {t('bookNew')}
                      </button>
                    )}

                    {cancelError && (
                      <div style={styles.errorBox}>
                        <svg style={{ width: '1rem', height: '1rem', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{cancelError}</span>
                      </div>
                    )}

                    {upcomingAppointments.length === 0 ? (
                      <div style={styles.emptyState}>
                        <svg style={{ width: '2.5rem', height: '2.5rem', margin: '0 auto 0.75rem', color: '#cbd5e1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p style={{ fontSize: '0.875rem' }}>{t('noUpcoming')}</p>
                      </div>
                    ) : (
                      upcomingAppointments.map(apt => (
                        <div key={apt.id} className="apt-card" style={styles.appointmentCard}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <div>
                              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{formatDate(apt.date)}</p>
                              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{apt.time_slot} {tCommon('oclock')}</p>
                            </div>
                            {canCancelAppointment(apt) ? (
                              <button
                                onClick={() => handleCancel(apt.id)}
                                disabled={cancellingId === apt.id}
                                className="cancel-btn"
                                style={styles.cancelButton}
                              >
                                {cancellingId === apt.id ? t('cancelling') : t('cancel')}
                              </button>
                            ) : (
                              <span style={{ padding: '0.375rem 0.625rem', fontSize: '0.6875rem', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}>
                                &lt; {cancellationHours}h
                              </span>
                            )}
                          </div>
                          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                            <div>
                              <span style={{ color: '#94a3b8' }}>{t('barber')}:</span>{' '}
                              <span style={{ color: '#0f172a' }}>{getBarberName(apt.barber_id)}</span>
                            </div>
                            <div>
                              <span style={{ color: '#94a3b8' }}>{t('service')}:</span>{' '}
                              <span style={{ color: '#0f172a' }}>{getServiceName(apt.service_id)}</span>
                            </div>
                            <div>
                              <span style={{ color: '#94a3b8' }}>{t('price')}:</span>{' '}
                              <span style={{ color: '#d4a853', fontWeight: 600 }}>{getServicePrice(apt.service_id)}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Past Appointments */}
                {activeTab === 'past' && (
                  <div>
                    {pastAppointments.length === 0 ? (
                      <div style={styles.emptyState}>
                        <svg style={{ width: '2.5rem', height: '2.5rem', margin: '0 auto 0.75rem', color: '#cbd5e1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p style={{ fontSize: '0.875rem' }}>{t('noPast')}</p>
                      </div>
                    ) : (
                      pastAppointments.map(apt => (
                        <div key={apt.id} style={apt.status === 'cancelled' ? styles.appointmentCardCancelled : styles.appointmentCard}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <div>
                              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: apt.status === 'cancelled' ? '#ef4444' : '#64748b' }}>
                                {formatDate(apt.date)}
                              </p>
                              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{apt.time_slot} {tCommon('oclock')}</p>
                            </div>
                            {apt.status === 'cancelled' && (
                              <span style={{ padding: '0.375rem 0.625rem', fontSize: '0.6875rem', color: '#ef4444', backgroundColor: '#fee2e2', borderRadius: '0.375rem' }}>
                                {t('cancelled')}
                              </span>
                            )}
                          </div>
                          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                            <div>
                              <span style={{ color: '#94a3b8' }}>{t('barber')}:</span>{' '}
                              <span style={{ color: '#64748b' }}>{getBarberName(apt.barber_id)}</span>
                            </div>
                            <div>
                              <span style={{ color: '#94a3b8' }}>{t('service')}:</span>{' '}
                              <span style={{ color: '#64748b' }}>{getServiceName(apt.service_id)}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Profile */}
                {activeTab === 'profile' && (
                  <div>
                    {profileSuccess && (
                      <div style={styles.successBox}>
                        <svg style={{ width: '1rem', height: '1rem', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{t('profileUpdated')}</span>
                      </div>
                    )}

                    {/* Persönliche Daten */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={styles.label}>{t('personalData')}</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <input
                          type="text"
                          value={editFirstName}
                          onChange={(e) => setEditFirstName(e.target.value)}
                          placeholder={tAuth('firstName')}
                          className="portal-input"
                          style={styles.input}
                        />
                        <input
                          type="text"
                          value={editLastName}
                          onChange={(e) => setEditLastName(e.target.value)}
                          placeholder={tAuth('lastName')}
                          className="portal-input"
                          style={styles.input}
                        />
                      </div>
                    </div>

                    {/* Kontakt */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={styles.label}>{t('contact')}</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <input
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder={tAuth('phone')}
                          className="portal-input"
                          style={styles.input}
                        />
                        <input
                          type="email"
                          value={customer.email}
                          disabled
                          style={styles.inputDisabled}
                        />
                      </div>
                      <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{t('emailCannotChange')}</p>
                    </div>

                    {/* Geburtstag */}
                    <div style={{ marginBottom: '1.5rem', maxWidth: '12rem' }}>
                      <label style={styles.label}>{tAuth('birthDate')}</label>
                      <DatePicker
                        value={editBirthDate}
                        onChange={setEditBirthDate}
                        max={new Date().toISOString().split('T')[0]}
                        min="1920-01-01"
                        style={styles.input}
                      />
                    </div>

                    {/* Mitglied seit */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={styles.label}>{t('membership')}</label>
                      <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                        {t('memberSince')} {formatBirthDate(customer.created_at)}
                      </p>
                    </div>

                    {/* Speichern Button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile || !hasProfileChanges()}
                        className="primary-btn"
                        style={styles.primaryButton}
                      >
                        {isSavingProfile ? tCommon('saving') : t('saveChanges')}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={{ fontSize: '0.6875rem', color: '#94a3b8', textAlign: 'center' }}>
            Eingeloggt als {customer.email}
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
