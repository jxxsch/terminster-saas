'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  getAllCustomers,
  searchCustomersAdmin,
  toggleCustomerBlock,
  updateCustomer,
  getCustomerAppointmentsAdmin,
  getTeam,
  getServices,
  type CustomerWithStats,
  type Appointment,
  type TeamMember,
  type Service,
} from '@/lib/supabase';
import { DatePicker } from '@/components/admin/DatePicker';

export default function KundenPage() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerWithStats[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null);
  const [customerAppointments, setCustomerAppointments] = useState<Appointment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<CustomerWithStats>>({});
  const [filter, setFilter] = useState<'all' | 'blocked' | 'active' | 'registered' | 'guest'>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [customersData, teamData, servicesData] = await Promise.all([
      getAllCustomers(),
      getTeam(),
      getServices(),
    ]);
    setCustomers(customersData);
    setFilteredCustomers(customersData);
    setTeam(teamData);
    setServices(servicesData);
    setLoading(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Suche und Filter
  useEffect(() => {
    let result = customers;

    // Filter anwenden
    if (filter === 'blocked') {
      result = result.filter(c => c.is_blocked);
    } else if (filter === 'active') {
      result = result.filter(c => !c.is_blocked);
    } else if (filter === 'registered') {
      result = result.filter(c => c.auth_id && !c.is_blocked);
    } else if (filter === 'guest') {
      result = result.filter(c => !c.auth_id && !c.is_blocked);
    }

    // Suche anwenden
    if (searchQuery.length >= 2) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.phone?.toLowerCase().includes(query)
      );
    }

    setFilteredCustomers(result);
  }, [customers, searchQuery, filter]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      const results = await searchCustomersAdmin(query);
      setCustomers(results);
    } else if (query.length === 0) {
      const all = await getAllCustomers();
      setCustomers(all);
    }
  };

  const handleSelectCustomer = async (customer: CustomerWithStats) => {
    setSelectedCustomer(customer);
    setEditData(customer);
    setEditMode(false);
    const appointments = await getCustomerAppointmentsAdmin(customer.id);
    setCustomerAppointments(appointments);
    setShowModal(true);
  };

  const handleToggleBlock = async (customer: CustomerWithStats) => {
    const newBlocked = !customer.is_blocked;
    const success = await toggleCustomerBlock(customer.id, newBlocked);
    if (success) {
      setCustomers(prev =>
        prev.map(c => c.id === customer.id ? { ...c, is_blocked: newBlocked } : c)
      );
      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer({ ...selectedCustomer, is_blocked: newBlocked });
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedCustomer) return;

    const updated = await updateCustomer(selectedCustomer.id, {
      first_name: editData.first_name,
      last_name: editData.last_name,
      email: editData.email,
      phone: editData.phone,
      birth_date: editData.birth_date,
      preferred_barber_id: editData.preferred_barber_id,
    });

    if (updated) {
      setCustomers(prev =>
        prev.map(c => c.id === selectedCustomer.id ? { ...c, ...updated } : c)
      );
      setSelectedCustomer({ ...selectedCustomer, ...updated });
      setEditMode(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/customer/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: selectedCustomer.id }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Kunde aus der Liste entfernen
        setCustomers(prev => prev.filter(c => c.id !== selectedCustomer.id));
        setShowDeleteConfirm(false);
        setShowModal(false);
        setSelectedCustomer(null);
      } else {
        alert(result.error || 'Fehler beim Löschen');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Fehler beim Löschen des Kunden');
    } finally {
      setIsDeleting(false);
    }
  };

  const getBarberName = (barberId: string) => {
    return team.find(t => t.id === barberId)?.name || 'Unbekannt';
  };

  const getServiceName = (serviceId: string | null) => {
    if (!serviceId) return '-';
    return services.find(s => s.id === serviceId)?.name || 'Unbekannt';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatBirthday = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getAge = (dateStr: string | null): number | null => {
    if (!dateStr) return null;
    const today = new Date();
    const birth = new Date(dateStr);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatBirthdayShort = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  // Statistiken für Filter-Buttons
  const stats = {
    all: customers.length,
    active: customers.filter(c => !c.is_blocked).length,
    registered: customers.filter(c => c.auth_id && !c.is_blocked).length,
    guest: customers.filter(c => !c.auth_id && !c.is_blocked).length,
    blocked: customers.filter(c => c.is_blocked).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Floating Panel */}
      <div className="flex-1 bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-200/50 overflow-hidden flex flex-col min-h-0">
        {/* Header */}
        <div className="px-4 md:px-8 py-4 md:py-5 flex flex-col md:flex-row md:items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-9 h-9 md:w-10 md:h-10 bg-gold/10 rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Kundenverwaltung</h3>
              <p className="text-xs text-slate-400 hidden md:block">{customers.length} Kunden registriert</p>
            </div>
          </div>

          {/* Suchfeld */}
          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Name, E-Mail oder Telefon..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Gradient Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent flex-shrink-0" />

        {/* Filter Buttons */}
        <div className="px-4 md:px-8 py-3 md:py-4 flex flex-wrap gap-2 flex-shrink-0 bg-slate-50/50 overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Alle ({stats.all})
          </button>
          <button
            onClick={() => setFilter('registered')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              filter === 'registered'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Registriert ({stats.registered})
          </button>
          <button
            onClick={() => setFilter('guest')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              filter === 'guest'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Gäste ({stats.guest})
          </button>
          <button
            onClick={() => setFilter('blocked')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              filter === 'blocked'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Gesperrt ({stats.blocked})
          </button>
        </div>

        {/* Gradient Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent flex-shrink-0" />

        {/* Kundenliste */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {filteredCustomers.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm">Keine Kunden gefunden</p>
            </div>
          ) : (
            <div>
              {/* Mobile: Karten-Layout */}
              <div className="md:hidden space-y-3">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className={`bg-white rounded-xl border p-4 cursor-pointer transition-colors ${
                      customer.is_blocked ? 'border-red-200 bg-red-50/50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0 flex items-center justify-center">
                        <span className="text-slate-600 font-semibold text-base">
                          {customer.name?.charAt(0) || '?'}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={`font-semibold truncate ${customer.is_blocked ? 'text-slate-500' : 'text-slate-900'}`}>
                            {customer.name || '-'}
                          </h4>
                          {customer.is_blocked ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium bg-red-100 text-red-700 flex-shrink-0">
                              Gesperrt
                            </span>
                          ) : customer.auth_id ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium bg-emerald-100 text-emerald-700 flex-shrink-0">
                              Registriert
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 text-slate-600 flex-shrink-0">
                              Gast
                            </span>
                          )}
                        </div>
                        {customer.email && (
                          <p className="text-sm text-slate-500 truncate mt-0.5">{customer.email}</p>
                        )}
                        {customer.phone && (
                          <p className="text-xs text-slate-400">{customer.phone}</p>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {customer.appointment_count} Termine
                        </span>
                        {customer.last_visit && (
                          <span>Letzter: {formatDate(customer.last_visit)}</span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleBlock(customer);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          customer.is_blocked
                            ? 'text-emerald-600 hover:bg-emerald-50'
                            : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                        }`}
                        title={customer.is_blocked ? 'Entsperren' : 'Sperren'}
                      >
                        {customer.is_blocked ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: Tabellen-Layout */}
              <div className="hidden md:block">
                {/* Header-Zeile */}
                <div className="grid grid-cols-[48px_1.2fr_1.2fr_100px_60px_90px_70px_72px] gap-4 px-4 py-2 text-[11px] font-medium text-slate-400 border-b border-slate-100">
                  <div></div>
                  <div>Kunde</div>
                  <div>Kontakt</div>
                  <div>Geburtstag</div>
                  <div>Termine</div>
                  <div>Letzter Termin</div>
                  <div>Status</div>
                  <div></div>
                </div>

                {/* Kunden-Liste */}
                <div className="divide-y divide-slate-50">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className={`grid grid-cols-[48px_1.2fr_1.2fr_100px_60px_90px_70px_72px] gap-4 items-center px-4 py-3.5 transition-colors cursor-pointer ${
                        customer.is_blocked ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => handleSelectCustomer(customer)}
                    >
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0 flex items-center justify-center">
                        <span className="text-slate-600 font-semibold text-sm">
                          {customer.name?.charAt(0) || '?'}
                        </span>
                      </div>

                      {/* Name */}
                      <div className={`font-medium truncate ${customer.is_blocked ? 'text-slate-500' : 'text-slate-900'}`}>
                        {customer.name || '-'}
                      </div>

                      {/* Kontakt */}
                      <div>
                        <div className="text-sm text-slate-700 truncate">{customer.email || '-'}</div>
                        <div className="text-xs text-slate-400">{customer.phone || '-'}</div>
                      </div>

                      {/* Geburtstag & Alter */}
                      <div className="text-sm">
                        {customer.birth_date ? (
                          <div className="flex flex-col">
                            <span className="text-slate-700">{formatBirthdayShort(customer.birth_date)}</span>
                            <span className="text-xs text-slate-400">{getAge(customer.birth_date)} Jahre</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </div>

                      {/* Termine */}
                      <div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                          {customer.appointment_count}
                        </span>
                      </div>

                      {/* Letzter Termin */}
                      <div className="text-sm text-slate-600">
                        {customer.last_visit ? formatDate(customer.last_visit) : '-'}
                      </div>

                      {/* Status */}
                      <div>
                        {customer.is_blocked ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-medium bg-red-100 text-red-700">
                            Gesperrt
                          </span>
                        ) : customer.auth_id ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-medium bg-emerald-100 text-emerald-700">
                            Registriert
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-100 text-slate-600">
                            Gast
                          </span>
                        )}
                      </div>

                      {/* Aktionen */}
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectCustomer(customer);
                          }}
                          className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          title="Details anzeigen"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleBlock(customer);
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            customer.is_blocked
                              ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                              : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                          }`}
                          title={customer.is_blocked ? 'Entsperren' : 'Sperren'}
                        >
                          {customer.is_blocked ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Kunden-Detail Modal */}
      {showModal && selectedCustomer && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div
            className="bg-white rounded-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200/50"
            style={{ maxWidth: '640px' }}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center">
                  <span className="text-gold font-bold text-xl">
                    {selectedCustomer.name?.charAt(0) || '?'}
                  </span>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {selectedCustomer.name || 'Unbenannter Kunde'}
                  </h2>
                  <p className="text-sm text-slate-500">{selectedCustomer.email}</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Gradient Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent flex-shrink-0" />

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Kundendaten */}
              <div className="bg-slate-50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-900">Kundendaten</h3>
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className="text-xs font-medium text-gold hover:text-gold/80 transition-colors"
                  >
                    {editMode ? 'Abbrechen' : 'Bearbeiten'}
                  </button>
                </div>

                {editMode ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Vorname</label>
                      <input
                        type="text"
                        value={editData.first_name || ''}
                        onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Nachname</label>
                      <input
                        type="text"
                        value={editData.last_name || ''}
                        onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">E-Mail</label>
                      <input
                        type="email"
                        value={editData.email || ''}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Telefon</label>
                      <input
                        type="tel"
                        value={editData.phone || ''}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                      />
                    </div>
                    <div>
                      <DatePicker
                        label="Geburtstag"
                        value={editData.birth_date || ''}
                        onChange={(val) => setEditData({ ...editData, birth_date: val })}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Bevorzugter Barber</label>
                      <select
                        value={editData.preferred_barber_id || ''}
                        onChange={(e) => setEditData({ ...editData, preferred_barber_id: e.target.value || null })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                      >
                        <option value="">Kein Favorit</option>
                        {team.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 pt-2">
                      <button
                        onClick={handleSaveEdit}
                        className="px-5 py-2 bg-gold text-black text-xs font-semibold rounded-xl hover:bg-gold/90 transition-colors"
                      >
                        Speichern
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Telefon</span>
                      <span className="text-slate-900 font-medium">{selectedCustomer.phone || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Geburtstag</span>
                      <span className="text-slate-900 font-medium">
                        {selectedCustomer.birth_date
                          ? `${formatBirthday(selectedCustomer.birth_date)} (${getAge(selectedCustomer.birth_date)} J.)`
                          : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Registriert seit</span>
                      <span className="text-slate-900 font-medium">{formatDate(selectedCustomer.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bevorzugter Barber</span>
                      <span className="text-slate-900 font-medium">
                        {selectedCustomer.preferred_barber_id
                          ? getBarberName(selectedCustomer.preferred_barber_id)
                          : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Wahrgenommen</span>
                      <span className="text-slate-900 font-medium">
                        {customerAppointments.filter(a => a.status !== 'cancelled' && new Date(a.date) < new Date()).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Storniert</span>
                      <span className="text-slate-900 font-medium">
                        {customerAppointments.filter(a => a.status === 'cancelled').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status</span>
                      {selectedCustomer.is_blocked ? (
                        <span className="text-red-600 font-medium">Gesperrt</span>
                      ) : (
                        <span className="text-emerald-600 font-medium">Aktiv</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Terminhistorie */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  Terminhistorie ({customerAppointments.length})
                </h3>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {customerAppointments.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl">
                      <svg className="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs">Keine Termine vorhanden</p>
                    </div>
                  ) : (
                    customerAppointments.map((apt) => {
                      const isPast = new Date(apt.date) < new Date();
                      const isCancelled = apt.status === 'cancelled';
                      return (
                        <div
                          key={apt.id}
                          className={`flex items-center justify-between p-3 rounded-xl border ${
                            isCancelled
                              ? 'bg-red-50 border-red-100'
                              : isPast
                              ? 'bg-slate-50 border-slate-100'
                              : 'bg-emerald-50 border-emerald-100'
                          }`}
                        >
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {formatDate(apt.date)} um {apt.time_slot}
                            </div>
                            <div className="text-xs text-slate-500">
                              {getServiceName(apt.service_id)} bei {getBarberName(apt.barber_id)}
                            </div>
                          </div>
                          <div className="text-right">
                            {isCancelled ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-medium bg-red-100 text-red-700">Storniert</span>
                            ) : isPast ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-200 text-slate-600">Vergangen</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-medium bg-emerald-100 text-emerald-700">Geplant</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent flex-shrink-0" />
            <div className="px-6 py-4 flex justify-between flex-shrink-0">
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleBlock(selectedCustomer)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    selectedCustomer.is_blocked
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  {selectedCustomer.is_blocked ? 'Entsperren' : 'Sperren'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold transition-colors bg-red-600 text-white hover:bg-red-700"
                >
                  Löschen
                </button>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Lösch-Bestätigung Modal */}
      {showDeleteConfirm && selectedCustomer && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteConfirm(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl w-[400px] max-w-[calc(100vw-2rem)] p-5">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-red-100 text-red-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-slate-900">Kunde endgültig löschen</h3>
                <p className="text-sm text-slate-500 mt-1">
                  <strong>{selectedCustomer.name}</strong> wird unwiderruflich gelöscht
                  {selectedCustomer.auth_id && ' (inkl. Login-Konto)'}.
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDeleteCustomer}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting && (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                Endgültig löschen
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
