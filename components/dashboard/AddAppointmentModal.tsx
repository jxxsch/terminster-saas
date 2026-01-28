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

      const result = await createAppointment({
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

      if (result.success && result.appointment) {
        onCreated(result.appointment);
      } else {
        setError(result.error === 'conflict' ? 'Zeitslot bereits belegt' : 'Fehler beim Speichern');
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
      const result = await createAppointment({
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

      if (result.success && result.appointment) {
        onCreated(result.appointment);
      } else {
        setError(result.error === 'conflict' ? 'Zeitslot bereits belegt' : 'Fehler beim Speichern');
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white w-[600px] max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">
              {mode === 'pause' ? 'Pause eintragen' : 'Neuer Termin'}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('appointment')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'appointment'
                  ? 'bg-gold text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Termin
            </button>
            <button
              type="button"
              onClick={() => setMode('pause')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'pause'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pause
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Info Bar */}
          <div className="flex items-center justify-between text-xs text-gray-600 mb-4 pb-4 border-b border-gray-100">
            <span className="font-medium text-gold">{barberName}</span>
            <span>{formattedDate}</span>
            <span className="font-semibold">{timeSlot} Uhr</span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Pause Mode - Simplified View */}
            {mode === 'pause' ? (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-orange-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">30 Minuten Pause</h3>
                <p className="text-xs text-gray-500">
                  Slot wird blockiert
                </p>
              </div>
            ) : (
              <>
                {/* Name & Phone Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-xs text-gray-500 mb-1.5">
                      Kundenname *
                    </label>
                    {selectedCustomer ? (
                      // Ausgewählter Kunde anzeigen
                      <div className="w-full px-3 py-2.5 border border-green-300 bg-green-50 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                            <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-black">{selectedCustomer.name}</span>
                            <span className="text-xs text-green-600 ml-2">Registriert</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearCustomer}
                          className="p-1 hover:bg-green-100 rounded transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            placeholder="Name eingeben..."
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors pr-8"
                            autoFocus
                          />
                          {isSearching && activeSearchField === 'name' && (
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                              <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                            className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                          >
                            <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50">
                              <span className="text-[10px] text-gray-500">
                                {searchResults.length} Kunde{searchResults.length !== 1 ? 'n' : ''} gefunden
                              </span>
                            </div>
                            {searchResults.map((customer) => (
                              <button
                                key={customer.id}
                                type="button"
                                onClick={() => handleSelectCustomer(customer)}
                                className="w-full px-3 py-2 text-left hover:bg-gold/10 transition-colors flex items-center gap-2 border-b border-gray-50 last:border-b-0"
                              >
                                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-medium text-gray-600">
                                    {customer.first_name?.charAt(0)}{customer.last_name?.charAt(0)}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="block text-xs font-medium text-black truncate">
                                    {customer.name}
                                  </span>
                                  {customer.phone && (
                                    <span className="text-[10px] text-gray-500">{customer.phone}</span>
                                  )}
                                </div>
                                <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <label className="block text-xs text-gray-500 mb-1.5">
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
                        placeholder="+49 ..."
                        className={`w-full px-3 py-2.5 border rounded-lg text-sm text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors ${
                          selectedCustomer ? 'border-green-300 bg-green-50' : 'border-gray-200'
                        }`}
                        readOnly={!!selectedCustomer}
                      />
                      {isSearching && activeSearchField === 'phone' && (
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                          <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                        className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                      >
                        <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50">
                          <span className="text-[10px] text-gray-500">
                            {searchResults.length} Kunde{searchResults.length !== 1 ? 'n' : ''} gefunden
                          </span>
                        </div>
                        {searchResults.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => handleSelectCustomer(customer)}
                            className="w-full px-3 py-2 text-left hover:bg-gold/10 transition-colors flex items-center gap-2 border-b border-gray-50 last:border-b-0"
                          >
                            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-medium text-gray-600">
                                {customer.first_name?.charAt(0)}{customer.last_name?.charAt(0)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="block text-xs font-medium text-black truncate">
                                {customer.name}
                              </span>
                              {customer.phone && (
                                <span className="text-[10px] text-gold font-medium">{customer.phone}</span>
                              )}
                            </div>
                            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <label className="block text-xs text-gray-500 mb-1.5">
                    Leistung
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {services.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => setServiceId(service.id)}
                        className={`px-3 py-2 rounded-lg text-left transition-all border ${
                          serviceId === service.id
                            ? 'border-gold bg-gold/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className={`block text-xs font-medium ${serviceId === service.id ? 'text-gold' : 'text-gray-800'}`}>
                          {service.name}
                        </span>
                        <span className={`text-[10px] ${serviceId === service.id ? 'text-gold/80' : 'text-gray-500'}`}>
                          {formatPrice(service.price)} · {formatDuration(service.duration)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Series Toggle */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                      <div>
                        <span className="block text-xs font-medium text-black">Serientermin</span>
                        <span className="text-[10px] text-gray-500">Jeden {DAY_NAMES[dateObj.getDay()]}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSeries(!isSeries)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        isSeries ? 'bg-blue-500' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          isSeries ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Intervall-Auswahl (only shown when series is enabled) */}
                  {isSeries && (
                    <div className="mt-3 pl-8">
                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setIntervalType('weekly')}
                          className={`px-2.5 py-1 rounded-lg text-xs transition-all border ${
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
                          className={`px-2.5 py-1 rounded-lg text-xs transition-all border ${
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
                          className={`px-2.5 py-1 rounded-lg text-xs transition-all border ${
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
              <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-xs font-medium text-gray-600 rounded-xl hover:bg-gray-50 hover:text-black transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 bg-gold text-xs font-medium text-white rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Speichern...</span>
                  </>
                ) : (
                  <span>
                    {mode === 'pause' ? 'Pause eintragen' : isSeries ? 'Serie speichern' : 'Speichern'}
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
