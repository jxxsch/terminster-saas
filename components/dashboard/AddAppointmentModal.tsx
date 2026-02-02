'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  createAppointment,
  createSeries,
  searchCustomers,
  formatPrice,
  formatDuration,
  getAppointments,
  Appointment,
  Series,
  TeamMember,
  Service,
  Customer
} from '@/lib/supabase';

const DAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

interface SeriesConflict {
  date: string;
  formattedDate: string;
  customerName: string;
}

interface AddAppointmentModalProps {
  barberId: string;
  date: string;
  timeSlot: string;
  team: TeamMember[];
  services: Service[];
  existingAppointments: Appointment[];
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
  existingAppointments,
  onClose,
  onCreated,
  onSeriesCreated,
}: AddAppointmentModalProps) {
  // Berechnungen vor States
  const dateObj = new Date(date);
  const formattedDate = `${DAY_NAMES[dateObj.getDay()]}, ${dateObj.getDate()}. ${MONTH_NAMES[dateObj.getMonth()]}`;
  const dayOfWeek = dateObj.getDay() === 0 ? 7 : dateObj.getDay(); // 1=Mo, ..., 6=Sa, 7=So

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
  const [isPauseSeries, setIsPauseSeries] = useState(false);
  const [pauseDays, setPauseDays] = useState<number[]>([dayOfWeek]); // Standardmäßig aktueller Tag ausgewählt
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createAccount, setCreateAccount] = useState(false);
  const [emailAccountStatus, setEmailAccountStatus] = useState<'checking' | 'has_account' | 'available' | null>(null);
  const [activeSearchField, setActiveSearchField] = useState<'name' | 'phone' | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflicts, setConflicts] = useState<SeriesConflict[]>([]);
  const [pendingSeriesData, setPendingSeriesData] = useState<{
    type: 'series' | 'pause';
    days: number[];
  } | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Get barber name from team
  const barberName = team.find(t => t.id === barberId)?.name || 'Unbekannt';

  // Hilfsfunktion: Prüft Konflikte für eine Serie (lädt zukünftige Termine aus DB)
  const checkSeriesConflicts = async (daysToCheck: number[], intervalType: 'weekly' | 'biweekly' | 'monthly'): Promise<SeriesConflict[]> => {
    const foundConflicts: SeriesConflict[] = [];
    const startDate = new Date(date);

    // Lade Termine für die nächsten 6 Monate
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 6);

    const futureAppointments = await getAppointments(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    // Prüfe alle existierenden Termine für diesen Barber und Zeitslot
    futureAppointments
      .filter(apt => apt.barber_id === barberId && apt.time_slot === timeSlot && apt.status !== 'cancelled')
      .forEach(apt => {
        const aptDate = new Date(apt.date);
        const aptDayOfWeek = aptDate.getDay() === 0 ? 7 : aptDate.getDay();

        // Prüfe ob der Tag in der Serie enthalten ist
        if (daysToCheck.includes(aptDayOfWeek)) {
          // Prüfe ob das Datum nach dem Startdatum liegt
          if (aptDate >= startDate) {
            // Bei wöchentlich: jede Woche
            // Bei 14-tägig: alle 2 Wochen
            // Bei monatlich: gleicher Wochentag pro Monat
            const weeksDiff = Math.floor((aptDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

            let isInSeries = false;
            if (intervalType === 'weekly') {
              isInSeries = true;
            } else if (intervalType === 'biweekly') {
              isInSeries = weeksDiff % 2 === 0;
            } else if (intervalType === 'monthly') {
              // Vereinfacht: Gleicher Wochentag
              isInSeries = true;
            }

            if (isInSeries) {
              foundConflicts.push({
                date: apt.date,
                formattedDate: aptDate.toLocaleDateString('de-DE', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                }),
                customerName: apt.customer_name || 'Unbekannt',
              });
            }
          }
        }
      });

    return foundConflicts.sort((a, b) => a.date.localeCompare(b.date));
  };

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

  // E-Mail-Prüfung wenn Konto erstellen aktiviert ist
  useEffect(() => {
    if (!createAccount || !customerEmail.trim()) {
      setEmailAccountStatus(null);
      return;
    }

    // E-Mail-Format prüfen
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail.trim())) {
      setEmailAccountStatus(null);
      return;
    }

    // Debounce die Prüfung
    setEmailAccountStatus('checking');
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/customer/check-email?email=${encodeURIComponent(customerEmail.trim())}`);
        const data = await response.json();

        if (data.hasAccount) {
          setEmailAccountStatus('has_account');
        } else {
          setEmailAccountStatus('available');
        }
      } catch {
        setEmailAccountStatus(null);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [customerEmail, createAccount]);

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

  // Funktion zum tatsächlichen Erstellen der Serie (nach Konflikt-Bestätigung)
  const executeSeriesCreation = async (type: 'series' | 'pause', days: number[]) => {
    setIsSubmitting(true);
    setError('');
    setShowConflictModal(false);

    if (type === 'pause') {
      // Pausen-Serien erstellen
      let lastSeries: Series | null = null;
      let hasError = false;

      for (const day of days) {
        const newSeries = await createSeries({
          barber_id: barberId,
          day_of_week: day,
          time_slot: timeSlot,
          service_id: services[0]?.id || '1',
          customer_name: '⏸ Pause',
          customer_phone: null,
          customer_email: null,
          start_date: date,
          end_date: null,
          interval_type: 'weekly',
        });

        if (newSeries) {
          lastSeries = newSeries;
        } else {
          hasError = true;
        }
      }

      if (lastSeries && onSeriesCreated) {
        onSeriesCreated(lastSeries);
      } else if (hasError) {
        setError('Fehler beim Erstellen der Pause-Serie');
        setIsSubmitting(false);
      }
    } else {
      // Normale Serie erstellen
      const newSeries = await createSeries({
        barber_id: barberId,
        day_of_week: days[0], // Bei normaler Serie nur ein Tag
        time_slot: timeSlot,
        service_id: serviceId,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        customer_email: selectedCustomer?.email || customerEmail.trim() || null,
        start_date: date,
        end_date: null,
        interval_type: intervalType,
      });

      if (newSeries && onSeriesCreated) {
        onSeriesCreated(newSeries);
      } else {
        setError('Fehler beim Erstellen der Serie');
        setIsSubmitting(false);
      }
    }
  };

  // Handler für "Verstanden" im Konflikt-Modal
  const handleConfirmWithConflicts = () => {
    if (pendingSeriesData) {
      executeSeriesCreation(pendingSeriesData.type, pendingSeriesData.days);
    }
  };

  // Handler für "Abbrechen" im Konflikt-Modal
  const handleCancelConflicts = () => {
    setShowConflictModal(false);
    setConflicts([]);
    setPendingSeriesData(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Pause mode - no name validation needed
    if (mode === 'pause') {
      setIsSubmitting(true);
      setError('');

      if (isPauseSeries && pauseDays.length > 0) {
        // Prüfe auf Konflikte (lädt zukünftige Termine aus DB)
        const foundConflicts = await checkSeriesConflicts(pauseDays, 'weekly');

        if (foundConflicts.length > 0) {
          // Zeige Konflikt-Modal
          setConflicts(foundConflicts);
          setPendingSeriesData({ type: 'pause', days: pauseDays });
          setShowConflictModal(true);
          setIsSubmitting(false);
          return;
        }

        // Keine Konflikte - direkt erstellen
        await executeSeriesCreation('pause', pauseDays);
        return;
      }

      // Einzelne Pause
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

    // Validierung: E-Mail erforderlich wenn Konto erstellt werden soll
    if (createAccount && !customerEmail.trim()) {
      setError('E-Mail ist erforderlich für die Kontoerstellung');
      return;
    }

    // E-Mail-Format prüfen
    if (createAccount && customerEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail.trim())) {
        setError('Bitte gültige E-Mail-Adresse eingeben');
        return;
      }
    }

    setIsSubmitting(true);
    setError('');

    if (isSeries) {
      // Prüfe auf Konflikte (lädt zukünftige Termine aus DB)
      const foundConflicts = await checkSeriesConflicts([dayOfWeek], intervalType);

      if (foundConflicts.length > 0) {
        // Zeige Konflikt-Modal
        setConflicts(foundConflicts);
        setPendingSeriesData({ type: 'series', days: [dayOfWeek] });
        setShowConflictModal(true);
        setIsSubmitting(false);
        return;
      }

      // Keine Konflikte - direkt erstellen
      await executeSeriesCreation('series', [dayOfWeek]);
      return;
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
        // Kundenkonto erstellen wenn aktiviert UND Kunde hat noch kein Konto
        if (createAccount && customerEmail.trim() && !selectedCustomer && emailAccountStatus !== 'has_account') {
          try {
            // Name in Vor- und Nachname aufteilen
            const nameParts = customerName.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';

            const inviteResponse = await fetch('/api/customer/invite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: customerEmail.trim(),
                firstName,
                lastName,
                phone: customerPhone.trim() || undefined,
              }),
            });

            const inviteResult = await inviteResponse.json();

            if (!inviteResponse.ok) {
              // 409 = Kunde hat bereits ein Konto - das ist kein Fehler, nur Info
              if (inviteResponse.status === 409) {
                console.info('Einladung nicht nötig:', inviteResult.error);
              } else {
                console.error('Invite error:', inviteResult.error);
              }
              // Termin wurde erstellt, aber Einladung nicht gesendet - trotzdem schließen
            }
          } catch (err) {
            console.error('Invite fetch error:', err);
          }
        }
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
              <div className="space-y-4">
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

                {/* Regelmäßige Pause Option */}
                <div className="border border-gray-200 rounded-xl p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPauseSeries}
                      onChange={(e) => setIsPauseSeries(e.target.checked)}
                      className="w-4 h-4 text-gold border-gray-300 rounded focus:ring-gold"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Regelmäßige Pause</span>
                      <p className="text-xs text-gray-500">Als Serientermin anlegen</p>
                    </div>
                  </label>

                  {isPauseSeries && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <label className="block text-xs text-gray-500 mb-2">An welchen Tagen? (wöchentlich)</label>
                      <div className="grid grid-cols-6 gap-2">
                        {[
                          { value: 1, label: 'Mo' },
                          { value: 2, label: 'Di' },
                          { value: 3, label: 'Mi' },
                          { value: 4, label: 'Do' },
                          { value: 5, label: 'Fr' },
                          { value: 6, label: 'Sa' },
                        ].map(day => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => {
                              if (pauseDays.includes(day.value)) {
                                setPauseDays(pauseDays.filter(d => d !== day.value));
                              } else {
                                setPauseDays([...pauseDays, day.value].sort());
                              }
                            }}
                            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                              pauseDays.includes(day.value)
                                ? 'bg-gold/10 border-gold text-gold'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-gray-400">
                        Jeden {pauseDays.map(d => ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d]).join(', ')} um {timeSlot} Uhr
                      </p>
                    </div>
                  )}
                </div>
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

                {/* E-Mail & Kundenkonto erstellen */}
                {!selectedCustomer && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">
                      E-Mail {createAccount && <span className="text-red-500">*</span>}
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="kunde@example.com"
                        className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-black placeholder-gray-400 focus:border-gold focus:outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setCreateAccount(!createAccount)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border whitespace-nowrap ${
                          createAccount
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <svg className={`w-4 h-4 ${createAccount ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Konto erstellen
                      </button>
                    </div>
                    {createAccount && emailAccountStatus === 'checking' && (
                      <p className="mt-1.5 text-[10px] text-gray-500 flex items-center gap-1">
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Prüfe E-Mail...
                      </p>
                    )}
                    {createAccount && emailAccountStatus === 'has_account' && (
                      <p className="mt-1.5 text-[10px] text-amber-600 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Kunde hat bereits ein Konto – keine Einladung nötig
                      </p>
                    )}
                    {createAccount && emailAccountStatus === 'available' && (
                      <p className="mt-1.5 text-[10px] text-green-600 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Einladungs-E-Mail wird an den Kunden gesendet
                      </p>
                    )}
                    {createAccount && !emailAccountStatus && customerEmail.trim() && (
                      <p className="mt-1.5 text-[10px] text-green-600">
                        Einladungs-E-Mail wird an den Kunden gesendet
                      </p>
                    )}
                  </div>
                )}

                {/* Service Selection - nur anzeigen wenn Services vorhanden */}
                {services.length > 0 && (
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
                )}

                {/* Series Toggle */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isSeries ? 'bg-gold/20' : 'bg-gray-100'}`}>
                        <svg className={`w-3 h-3 ${isSeries ? 'text-gold' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className={`relative w-12 h-6 rounded-full transition-colors outline-none focus:outline-none ${
                        isSeries ? 'bg-gold' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${
                          isSeries ? 'translate-x-6' : 'translate-x-0'
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
                              ? 'border-gold bg-gold/10 text-gold'
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
                              ? 'border-gold bg-gold/10 text-gold'
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
                              ? 'border-gold bg-gold/10 text-gold'
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
                    {mode === 'pause'
                      ? (isPauseSeries ? 'Pause-Serie speichern' : 'Pause eintragen')
                      : isSeries ? 'Serie speichern' : 'Speichern'}
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Konflikt-Modal */}
      {showConflictModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={handleCancelConflicts} />
          <div className="relative bg-white rounded-2xl shadow-xl w-[400px] max-w-[calc(100vw-2rem)] p-5">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-100 text-amber-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-slate-900">Termine bereits belegt</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {conflicts.length} {conflicts.length === 1 ? 'Termin wird' : 'Termine werden'} übersprungen
                </p>

                {/* Konflikt-Liste */}
                <div className="mt-4 max-h-48 overflow-y-auto space-y-2">
                  {conflicts.map((conflict, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg"
                    >
                      <span className="text-sm font-medium text-slate-900">{conflict.formattedDate}</span>
                      <span className="text-xs text-slate-500">{conflict.customerName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={handleCancelConflicts}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleConfirmWithConflicts}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-gold text-white hover:bg-gold/90"
              >
                Trotzdem speichern
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
