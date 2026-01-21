'use client';

import { useState, useEffect, useRef } from 'react';
import {
  createAppointment,
  createSeries,
  searchCustomers,
  formatPrice,
  formatDuration,
  Appointment,
  Series,
  TeamMember,
  Service,
  Customer
} from '@/lib/supabase';

const DAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

interface AddAppointmentModalProps {
  barberId: string;
  date: string;
  timeSlot: string;
  team: TeamMember[];
  services: Service[];
  onClose: () => void;
  onCreated: (appointment: Appointment) => void;
  onSeriesCreated?: (series: Series) => void;
}

export function AddAppointmentModal({
  barberId,
  date,
  timeSlot,
  team,
  services,
  onClose,
  onCreated,
  onSeriesCreated,
}: AddAppointmentModalProps) {
  const [mode, setMode] = useState<'appointment' | 'pause'>('appointment');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [serviceId, setServiceId] = useState(services[0]?.id || '1');
  const [isSeries, setIsSeries] = useState(false);
  const [intervalType, setIntervalType] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeSearchField, setActiveSearchField] = useState<'name' | 'phone' | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const dateObj = new Date(date);
  const formattedDate = `${DAY_NAMES[dateObj.getDay()]}, ${dateObj.getDate()}. ${MONTH_NAMES[dateObj.getMonth()]}`;
  const dayOfWeek = dateObj.getDay() === 0 ? 7 : dateObj.getDay(); // 1=Mo, ..., 6=Sa, 7=So

  // Get barber name from team
  const barberName = team.find(t => t.id === barberId)?.name || 'Unbekannt';

  // Debounced Kundensuche (Name oder Telefon)
  useEffect(() => {
    // Bestimme Suchbegriff basierend auf aktivem Feld
    const searchQuery = activeSearchField === 'phone' ? customerPhone : customerName;
    const shouldSearch = !selectedCustomer && searchQuery.length >= 3;

    const timeoutId = setTimeout(async () => {
      if (shouldSearch) {
        setIsSearching(true);
        const results = await searchCustomers(searchQuery);
        setSearchResults(results);
        setShowSuggestions(results.length > 0);
        setIsSearching(false);
      } else {
        setSearchResults([]);
        setShowSuggestions(false);
      }
    }, shouldSearch ? 300 : 0); // Debounce nur bei Suche

    return () => clearTimeout(timeoutId);
  }, [customerName, customerPhone, selectedCustomer, activeSearchField]);

  // Schließe Dropdown bei Klick außerhalb
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideSuggestions = suggestionsRef.current && !suggestionsRef.current.contains(target);
      const isOutsideName = nameInputRef.current && !nameInputRef.current.contains(target);
      const isOutsidePhone = phoneInputRef.current && !phoneInputRef.current.contains(target);

      if (isOutsideSuggestions && isOutsideName && isOutsidePhone) {
        setShowSuggestions(false);
        setActiveSearchField(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Kunde auswählen
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone || '');
    setCustomerEmail(customer.email || '');
    setShowSuggestions(false);
    setSearchResults([]);
  };

  // Auswahl zurücksetzen
  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    nameInputRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Pause mode - no name validation needed
    if (mode === 'pause') {
      setIsSubmitting(true);
      setError('');

      const newAppointment = await createAppointment({
        barber_id: barberId,
        date,
        time_slot: timeSlot,
        service_id: services[0]?.id || '1', // Default service
        customer_name: '⏸ Pause',
        customer_phone: null,
        customer_id: null,
        customer_email: null,
        status: 'confirmed',
        source: 'manual',
        series_id: null,
      });

      if (newAppointment) {
        onCreated(newAppointment);
      } else {
        setError('Fehler beim Speichern');
        setIsSubmitting(false);
      }
      return;
    }

    // Normal appointment mode
    if (!customerName.trim()) {
      setError('Bitte Namen eingeben');
      return;
    }

    setIsSubmitting(true);
    setError('');

    if (isSeries) {
      // Create series
      const newSeries = await createSeries({
        barber_id: barberId,
        day_of_week: dayOfWeek,
        time_slot: timeSlot,
        service_id: serviceId,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        customer_email: selectedCustomer?.email || customerEmail.trim() || null,
        start_date: date,
        end_date: null,
        interval_type: intervalType,
      });

      if (newSeries) {
        onSeriesCreated?.(newSeries);
        onClose();
      } else {
        setError('Fehler beim Speichern der Serie');
        setIsSubmitting(false);
      }
    } else {
      // Create single appointment
      const newAppointment = await createAppointment({
        barber_id: barberId,
        date,
        time_slot: timeSlot,
        service_id: serviceId,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        customer_id: selectedCustomer?.id || null,
        customer_email: selectedCustomer?.email || customerEmail.trim() || null,
        status: 'confirmed',
        source: 'manual',
        series_id: null,
      });

      if (newAppointment) {
        onCreated(newAppointment);
      } else {
        setError('Fehler beim Speichern');
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-lg">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs font-light text-gold tracking-[0.2em] uppercase block">Neuer Eintrag</span>
              <h2 className="text-xl font-light text-black">
                {mode === 'pause' ? 'Pause eintragen' : 'Termin eintragen'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('appointment')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'appointment'
                  ? 'bg-gold text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Termin
            </button>
            <button
              type="button"
              onClick={() => setMode('pause')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'pause'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pause (30 Min)
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Info Pills */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-gold/10 rounded-full">
              <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-sm font-light text-black">{barberName}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-light text-gray-700">{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-light text-gray-700">{timeSlot} Uhr</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Pause Mode - Simplified View */}
            {mode === 'pause' ? (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">30 Minuten Pause</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Der Slot um <span className="font-medium">{timeSlot} Uhr</span> wird für {barberName} blockiert.
                </p>
                <p className="text-xs text-gray-500">
                  Die Pause kann jederzeit wie ein normaler Termin gelöscht werden.
                </p>
              </div>
            ) : (
              <>
                {/* Name & Phone Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-xs text-gray-500 mb-2">
                      Kundenname *
                    </label>
                    {selectedCustomer ? (
                      // Ausgewählter Kunde anzeigen
                      <div className="w-full p-4 border border-green-300 bg-green-50 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-black block">{selectedCustomer.name}</span>
                            <span className="text-xs text-green-600">Registrierter Kunde</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearCustomer}
                          className="p-1.5 hover:bg-green-100 rounded-full transition-colors"
                        >
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      // Namenseingabe mit Autocomplete
                      <>
                        <div className="relative">
                          <input
                            ref={nameInputRef}
                            type="text"
                            value={customerName}
                            onChange={(e) => {
                              setCustomerName(e.target.value);
                              setActiveSearchField('name');
                            }}
                            onFocus={() => {
                              setActiveSearchField('name');
                              if (searchResults.length > 0 && activeSearchField === 'name') {
                                setShowSuggestions(true);
                              }
                            }}
                            placeholder="Name eingeben (mind. 3 Zeichen für Suche)"
                            className="w-full p-4 border border-gray-200 rounded-lg text-sm font-light text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors pr-10"
                            autoFocus
                          />
                          {isSearching && activeSearchField === 'name' && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Autocomplete Dropdown (Name) */}
                        {showSuggestions && searchResults.length > 0 && activeSearchField === 'name' && (
                          <div
                            ref={suggestionsRef}
                            className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                          >
                            <div className="p-2 border-b border-gray-100 bg-gray-50">
                              <span className="text-xs text-gray-500">
                                {searchResults.length} registrierte Kunde{searchResults.length !== 1 ? 'n' : ''} gefunden
                              </span>
                            </div>
                            {searchResults.map((customer) => (
                              <button
                                key={customer.id}
                                type="button"
                                onClick={() => handleSelectCustomer(customer)}
                                className="w-full px-4 py-3 text-left hover:bg-gold/10 transition-colors flex items-center gap-3 border-b border-gray-50 last:border-b-0"
                              >
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                  <span className="text-sm font-medium text-gray-600">
                                    {customer.first_name?.charAt(0)}{customer.last_name?.charAt(0)}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="block text-sm font-medium text-black truncate">
                                    {customer.name}
                                  </span>
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    {customer.phone && (
                                      <span className="flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                        {customer.phone}
                                      </span>
                                    )}
                                    {customer.email && (
                                      <span className="truncate">{customer.email}</span>
                                    )}
                                  </div>
                                </div>
                                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-xs text-gray-500 mb-2">
                      Telefon {selectedCustomer ? '' : '(optional)'}
                    </label>
                    <div className="relative">
                      <input
                        ref={phoneInputRef}
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => {
                          setCustomerPhone(e.target.value);
                          if (!selectedCustomer) {
                            setActiveSearchField('phone');
                          }
                        }}
                        onFocus={() => {
                          if (!selectedCustomer) {
                            setActiveSearchField('phone');
                            if (searchResults.length > 0 && activeSearchField === 'phone') {
                              setShowSuggestions(true);
                            }
                          }
                        }}
                        placeholder="+49 ... (oder Nummer für Suche)"
                        className={`w-full p-4 border rounded-lg text-sm font-light text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors ${
                          selectedCustomer ? 'border-green-300 bg-green-50' : 'border-gray-200'
                        }`}
                        readOnly={!!selectedCustomer}
                      />
                      {isSearching && activeSearchField === 'phone' && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Autocomplete Dropdown (Telefon) */}
                    {showSuggestions && searchResults.length > 0 && activeSearchField === 'phone' && !selectedCustomer && (
                      <div
                        ref={suggestionsRef}
                        className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      >
                        <div className="p-2 border-b border-gray-100 bg-gray-50">
                          <span className="text-xs text-gray-500">
                            {searchResults.length} Kunde{searchResults.length !== 1 ? 'n' : ''} mit dieser Nummer gefunden
                          </span>
                        </div>
                        {searchResults.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => handleSelectCustomer(customer)}
                            className="w-full px-4 py-3 text-left hover:bg-gold/10 transition-colors flex items-center gap-3 border-b border-gray-50 last:border-b-0"
                          >
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium text-gray-600">
                                {customer.first_name?.charAt(0)}{customer.last_name?.charAt(0)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="block text-sm font-medium text-black truncate">
                                {customer.name}
                              </span>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                {customer.phone && (
                                  <span className="flex items-center gap-1 font-medium text-gold">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    {customer.phone}
                                  </span>
                                )}
                                {customer.email && (
                                  <span className="truncate">{customer.email}</span>
                                )}
                              </div>
                            </div>
                            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Service Selection */}
                <div>
                  <label className="block text-xs text-gray-500 mb-2">
                    Leistung auswählen
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {services.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => setServiceId(service.id)}
                        className={`p-4 rounded-lg text-left transition-all border ${
                          serviceId === service.id
                            ? 'border-gold bg-gold/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className={`block text-sm font-medium mb-1 ${serviceId === service.id ? 'text-gold' : 'text-black'}`}>
                          {service.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${serviceId === service.id ? 'text-gold' : 'text-gray-600'}`}>
                            {formatPrice(service.price)}
                          </span>
                          <span className="text-xs text-gray-400">· {formatDuration(service.duration)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Series Toggle */}
                <div className="border-t border-gray-100 pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-black">Serientermin</span>
                        <span className="text-xs text-gray-500">Regelmäßig jeden {DAY_NAMES[dateObj.getDay()]}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSeries(!isSeries)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        isSeries ? 'bg-blue-500' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          isSeries ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Intervall-Auswahl (only shown when series is enabled) */}
                  {isSeries && (
                    <div className="mt-4 pl-11">
                      <label className="block text-xs text-gray-500 mb-2">
                        Wiederholung
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIntervalType('weekly')}
                          className={`px-4 py-2 rounded-lg text-sm transition-all border ${
                            intervalType === 'weekly'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          Wöchentlich
                        </button>
                        <button
                          type="button"
                          onClick={() => setIntervalType('biweekly')}
                          className={`px-4 py-2 rounded-lg text-sm transition-all border ${
                            intervalType === 'biweekly'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          14-tägig
                        </button>
                        <button
                          type="button"
                          onClick={() => setIntervalType('monthly')}
                          className={`px-4 py-2 rounded-lg text-sm transition-all border ${
                            intervalType === 'monthly'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          Monatlich
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-8 py-3 border border-gray-200 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 hover:text-black transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 border border-gold bg-gold/10 text-sm font-medium text-black rounded-lg hover:bg-gold/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Speichern...</span>
                  </>
                ) : (
                  <span>
                    {mode === 'pause' ? 'Pause eintragen' : isSeries ? 'Serie speichern' : 'Termin speichern'}
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
