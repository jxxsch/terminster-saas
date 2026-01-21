'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { useTranslations } from 'next-intl';
import {
  getCustomerAppointments,
  cancelAppointment,
  updateCustomer,
  getTeam,
  getServices,
  Appointment,
  TeamMember,
  Service,
  formatPrice,
} from '@/lib/supabase';

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
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

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

  // Load data
  useEffect(() => {
    async function loadData() {
      if (!customer?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [appointmentsData, teamData, servicesData] = await Promise.all([
          getCustomerAppointments(customer.id),
          getTeam(),
          getServices(),
        ]);

        setAppointments(appointmentsData || []);
        setTeam(teamData || []);
        setServices(servicesData || []);
      } catch (error) {
        console.error('Error loading customer data:', error);
      } finally {
        setIsLoading(false);
      }
    }

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
  const getServiceName = (serviceId: string) => services.find(s => s.id === serviceId)?.name || tCommon('unknown');
  const getServicePrice = (serviceId: string) => {
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
    return hoursUntil >= 24;
  };

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    setCancelError(null);

    const result = await cancelAppointment(id);

    if (result.success) {
      setAppointments(prev =>
        prev.map(apt =>
          apt.id === id ? { ...apt, status: 'cancelled' as const } : apt
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

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full max-w-6xl h-[80vh] rounded-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-100 px-4 py-2 flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-light text-gold tracking-[0.2em] uppercase">{t('title')}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                signOut();
                onClose();
              }}
              className="p-1.5 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title={tAuth('logout')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs - wie BookingModal Progress Steps */}
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            {tabs.map((tab, index, arr) => (
              <div key={tab.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`text-xs font-medium mb-1 transition-colors ${
                      activeTab === tab.id ? 'text-gold' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {index + 1}. {tab.label} {tab.count !== null && `(${tab.count})`}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-gray-400">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm">{tCommon('loading')}</span>
              </div>
            </div>
          ) : (
            <>
              {/* Upcoming Appointments */}
              {activeTab === 'upcoming' && (
                <div className="space-y-3">
                  {/* Termin buchen Button */}
                  {onBookNow && (
                    <button
                      onClick={() => {
                        onClose();
                        onBookNow();
                      }}
                      className="w-full py-2.5 px-4 border border-gold text-gold bg-transparent hover:bg-gold/10 rounded-sm text-sm font-light tracking-[0.1em] uppercase transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                      {t('bookNew')}
                    </button>
                  )}

                  {cancelError && (
                    <div className="flex items-center gap-2 text-red-600 text-[10px] bg-red-50 border border-red-200 rounded-sm px-3 py-2">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{cancelError}</span>
                    </div>
                  )}

                  {upcomingAppointments.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm">{t('noUpcoming')}</p>
                    </div>
                  ) : (
                    upcomingAppointments.map(apt => (
                      <div key={apt.id} className="border border-gray-200 rounded-sm p-3 hover:border-gold/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-black">{formatDate(apt.date)}</p>
                            <p className="text-xs text-gray-500">{apt.time_slot} {tCommon('oclock')}</p>
                          </div>
                          {canCancelAppointment(apt) ? (
                            <button
                              onClick={() => handleCancel(apt.id)}
                              disabled={cancellingId === apt.id}
                              className="px-3 py-1 text-[10px] text-red-600 border border-red-200 rounded-sm hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              {cancellingId === apt.id ? t('cancelling') : t('cancel')}
                            </button>
                          ) : (
                            <span className="px-2 py-1 text-[10px] text-gray-400 border border-gray-200 rounded-sm">
                              &lt; 24h
                            </span>
                          )}
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-100 grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-gray-400">{t('barber')}:</span>{' '}
                            <span className="text-black">{getBarberName(apt.barber_id)}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">{t('service')}:</span>{' '}
                            <span className="text-black">{getServiceName(apt.service_id)}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">{t('price')}:</span>{' '}
                            <span className="text-gold font-medium">{getServicePrice(apt.service_id)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Past Appointments */}
              {activeTab === 'past' && (
                <div className="space-y-3">
                  {pastAppointments.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm">{t('noPast')}</p>
                    </div>
                  ) : (
                    pastAppointments.map(apt => (
                      <div key={apt.id} className={`border rounded-sm p-3 ${
                        apt.status === 'cancelled' ? 'border-red-200 bg-red-50/50' : 'border-gray-200'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className={`text-sm font-medium ${apt.status === 'cancelled' ? 'text-red-600' : 'text-gray-500'}`}>
                              {formatDate(apt.date)}
                            </p>
                            <p className="text-xs text-gray-400">{apt.time_slot} {tCommon('oclock')}</p>
                          </div>
                          {apt.status === 'cancelled' && (
                            <span className="px-2 py-1 text-[10px] text-red-600 bg-red-100 rounded-sm">{t('cancelled')}</span>
                          )}
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-400">{t('barber')}:</span>{' '}
                            <span className="text-gray-600">{getBarberName(apt.barber_id)}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">{t('service')}:</span>{' '}
                            <span className="text-gray-600">{getServiceName(apt.service_id)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Profile */}
              {activeTab === 'profile' && (
                <div className="space-y-4">
                  {profileSuccess && (
                    <div className="flex items-center gap-2 text-green-700 text-[10px] bg-green-50 border border-green-200 rounded-sm px-3 py-2">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{t('profileUpdated')}</span>
                    </div>
                  )}

                  {/* Persönliche Daten */}
                  <div>
                    <div className="flex items-baseline gap-1.5 mb-2">
                      <span className="text-[8px] text-gray-400">1.</span>
                      <h3 className="text-[8px] text-gray-500">{t('personalData')}</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        placeholder={tAuth('firstName')}
                        className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors"
                      />
                      <input
                        type="text"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        placeholder={tAuth('lastName')}
                        className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors"
                      />
                      <input
                        type="date"
                        value={editBirthDate}
                        onChange={(e) => setEditBirthDate(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Kontakt */}
                  <div>
                    <div className="flex items-baseline gap-1.5 mb-2">
                      <span className="text-[8px] text-gray-400">2.</span>
                      <h3 className="text-[8px] text-gray-500">{t('contact')}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder={tAuth('phone')}
                        className="w-full p-2 border border-gray-300 rounded-sm text-sm font-light text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors"
                      />
                      <input
                        type="email"
                        value={customer.email}
                        disabled
                        className="w-full p-2 border border-gray-200 rounded-sm text-sm font-light text-gray-400 bg-gray-50 cursor-not-allowed"
                      />
                    </div>
                    <p className="text-[9px] text-gray-400 mt-1">{t('emailCannotChange')}</p>
                  </div>

                  {/* Mitglied seit */}
                  <div>
                    <div className="flex items-baseline gap-1.5 mb-2">
                      <span className="text-[8px] text-gray-400">3.</span>
                      <h3 className="text-[8px] text-gray-500">{t('membership')}</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      {t('memberSince')} {formatBirthDate(customer.created_at)}
                    </p>
                  </div>

                  {/* Speichern Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile || !hasProfileChanges()}
                      className="px-5 py-2 bg-black text-white text-xs font-light tracking-[0.15em] uppercase hover:bg-gold transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-black"
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
    </div>
  );

  return createPortal(modalContent, document.body);
}
