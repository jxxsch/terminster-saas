'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  createAppointment,
  createSeriesWithAppointments,
  createStaffTimeOff,
  deleteSeries,
  searchCustomers,
  formatPrice,
  formatDuration,
  getFirstSeriesAppointment,
  Appointment,
  Series,
  TeamMember,
  Service,
  Customer
} from '@/lib/supabase';
import { sendBookingConfirmationEmail } from '@/lib/email-client';

const DAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

interface SeriesConflictResult {
  createdDates: string[];
  skippedDates: string[];
  created: number;
  skipped: number;
}

interface AddAppointmentModalProps {
  barberId: string;
  date: string;
  timeSlot: string;
  team: TeamMember[];
  services: Service[];
  existingAppointments: Appointment[];
  allTimeSlots?: string[];
  onClose: () => void;
  onCreated: (appointment: Appointment) => void;
  onSeriesCreated?: (series: Series) => void;
  onBlockCreated?: () => void;
}

export function AddAppointmentModal({
  barberId,
  date,
  timeSlot,
  team,
  services,
  existingAppointments,
  allTimeSlots = [],
  onClose,
  onCreated,
  onSeriesCreated,
  onBlockCreated,
}: AddAppointmentModalProps) {
  // Berechnungen vor States
  const dateObj = new Date(date);
  const formattedDate = `${DAY_NAMES[dateObj.getDay()]}, ${dateObj.getDate()}. ${MONTH_NAMES[dateObj.getMonth()]}`;
  const dayOfWeek = dateObj.getDay() === 0 ? 7 : dateObj.getDay(); // 1=Mo, ..., 6=Sa, 7=So

  // Verfügbare Endzeiten für Blockierung (alle Slots ab timeSlot)
  const blockEndOptions = allTimeSlots.filter(s => s >= timeSlot);

  const [mode, setMode] = useState<'appointment' | 'pause' | 'block'>('appointment');
  const [blockEndTime, setBlockEndTime] = useState<string>(blockEndOptions[blockEndOptions.length - 1] || timeSlot);
  const [blockReason, setBlockReason] = useState<string>('Krank');
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
  const [conflictResult, setConflictResult] = useState<SeriesConflictResult | null>(null);
  const pendingSeriesRef = useRef<Series | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

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

  // Funktion zum Erstellen der Serie mit echten Appointment-Rows (52 Wochen)
  const executeSeriesCreation = async (type: 'series' | 'pause', days: number[]) => {
    setIsSubmitting(true);
    setError('');
    setShowConflictModal(false);

    if (type === 'pause') {
      // Pausen-Serien erstellen (pro Tag eine Serie mit echten Appointments)
      let lastSeries: Series | null = null;
      let hasError = false;
      let totalCreated = 0;
      let totalSkipped = 0;

      for (const day of days) {
        const result = await createSeriesWithAppointments({
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
        }, true);

        if (result.series) {
          lastSeries = result.series;
          totalCreated += result.appointmentsCreated;
          totalSkipped += result.appointmentsSkipped;
        } else {
          hasError = true;
        }
      }

      if (!lastSeries && hasError) {
        setError('Fehler beim Erstellen der Pause-Serie');
        setIsSubmitting(false);
        return;
      }

      if (totalSkipped > 0 && lastSeries) {
        setConflictResult({
          createdDates: [], // Pausen-Serien sammeln keine Einzeldaten
          skippedDates: [],
          created: totalCreated,
          skipped: totalSkipped,
        });
        pendingSeriesRef.current = lastSeries;
        setIsSubmitting(false);
        setShowConflictModal(true);
      } else if (lastSeries && onSeriesCreated) {
        onSeriesCreated(lastSeries);
      }
    } else {
      // Normale Serie erstellen mit echten Appointments
      const result = await createSeriesWithAppointments({
        barber_id: barberId,
        day_of_week: days[0],
        time_slot: timeSlot,
        service_id: serviceId,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        customer_email: selectedCustomer?.email || customerEmail.trim() || null,
        start_date: date,
        end_date: null,
        interval_type: intervalType,
      }, false);

      if (!result.series) {
        setError('Fehler beim Erstellen der Serie');
        setIsSubmitting(false);
        return;
      }

      // Buchungsbestätigung für ersten Termin senden (fire-and-forget)
      const seriesEmail = selectedCustomer?.email || customerEmail.trim();
      if (seriesEmail && result.appointmentsCreated > 0) {
        getFirstSeriesAppointment(result.series.id).then(firstApt => {
          if (firstApt) {
            const barber = team.find(t => t.id === barberId);
            const service = services.find(s => s.id === serviceId);
            sendBookingConfirmationEmail({
              customerName: firstApt.customer_name,
              customerEmail: seriesEmail,
              barberName: barber?.name || 'Barber',
              barberImage: barber?.image || undefined,
              imagePosition: barber?.image_position,
              imageScale: barber?.image_scale || undefined,
              serviceName: service?.name || 'Termin',
              date: firstApt.date,
              time: firstApt.time_slot,
              duration: service?.duration || 30,
              price: service ? formatPrice(service.price) : '0,00 €',
              appointmentId: firstApt.id,
            }).catch(err => console.error('Series booking confirmation email failed:', err));
          }
        }).catch(err => console.error('Failed to get first series appointment:', err));
      }

      if (result.appointmentsSkipped > 0) {
        // Konflikte vorhanden: Modal zeigen, Serie-Callback verzögern
        setConflictResult({
          createdDates: result.createdDates,
          skippedDates: result.skippedDates,
          created: result.appointmentsCreated,
          skipped: result.appointmentsSkipped,
        });
        pendingSeriesRef.current = result.series;
        setIsSubmitting(false);
        setShowConflictModal(true);
      } else if (onSeriesCreated) {
        // Keine Konflikte: direkt weiter
        onSeriesCreated(result.series);
      }
    }
  };

  // Handler für "Verstanden" im Konflikt-Info-Modal (post-hoc, Serie wurde bereits erstellt)
  const handleDismissConflicts = () => {
    setShowConflictModal(false);
    setConflictResult(null);
    // Jetzt erst die Serie an den Parent melden und Modal schließen
    if (pendingSeriesRef.current && onSeriesCreated) {
      onSeriesCreated(pendingSeriesRef.current);
      pendingSeriesRef.current = null;
    }
  };

  // Handler für "Abbrechen" – Serie rückgängig machen
  const handleCancelConflicts = async () => {
    if (pendingSeriesRef.current) {
      await deleteSeries(pendingSeriesRef.current.id);
      pendingSeriesRef.current = null;
    }
    setShowConflictModal(false);
    setConflictResult(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Block mode - Zeitraum blockieren via staff_time_off
    if (mode === 'block') {
      setIsSubmitting(true);
      setError('');

      const result = await createStaffTimeOff({
        staff_id: barberId,
        start_date: date,
        end_date: date,
        start_time: timeSlot,
        end_time: blockEndTime,
        reason: blockReason,
      });

      if (result) {
        onBlockCreated?.();
        onClose();
      } else {
        setError('Fehler beim Erstellen der Blockierung');
        setIsSubmitting(false);
      }
      return;
    }

    // Pause mode - no name validation needed
    if (mode === 'pause') {
      setIsSubmitting(true);
      setError('');

      if (isPauseSeries && pauseDays.length > 0) {
        // Direkt erstellen - Konflikte werden beim Insert automatisch übersprungen
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
        is_pause: true,
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
      // Direkt erstellen - Konflikte werden beim Insert automatisch übersprungen
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
        is_pause: false,
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

        // Buchungsbestätigung per E-Mail senden (fire-and-forget)
        const email = result.appointment.customer_email;
        if (email) {
          const barber = team.find(t => t.id === barberId);
          const service = services.find(s => s.id === serviceId);
          sendBookingConfirmationEmail({
            customerName: result.appointment.customer_name,
            customerEmail: email,
            barberName: barber?.name || 'Barber',
            barberImage: barber?.image || undefined,
            imagePosition: barber?.image_position,
            imageScale: barber?.image_scale || undefined,
            serviceName: service?.name || 'Termin',
            date: result.appointment.date,
            time: result.appointment.time_slot,
            duration: service?.duration || 30,
            price: service ? formatPrice(service.price) : '0,00 €',
            appointmentId: result.appointment.id,
          }).catch(err => console.error('Booking confirmation email failed:', err));
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
              {mode === 'block' ? 'Blockierung' : mode === 'pause' ? 'Pause eintragen' : 'Neuer Termin'}
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
            <button
              type="button"
              onClick={() => setMode('block')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'block'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Blockierung
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
            {/* Block Mode */}
            {mode === 'block' ? (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">Zeitraum blockieren</h3>
                  <p className="text-xs text-gray-500">
                    Slots werden für Online-Buchungen und Termine gesperrt
                  </p>
                </div>

                {/* Bis-Endzeit */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Blockiert bis</label>
                  <select
                    value={blockEndTime}
                    onChange={(e) => setBlockEndTime(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-black focus:border-gold focus:outline-none transition-colors"
                  >
                    {blockEndOptions.map((s) => (
                      <option key={s} value={s}>
                        {s} Uhr{s === blockEndOptions[blockEndOptions.length - 1] ? ' (Rest des Tages)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-[10px] text-gray-400">
                    {timeSlot} – {blockEndTime} Uhr ({blockEndOptions.filter(s => s >= timeSlot && s <= blockEndTime).length} Slots)
                  </p>
                </div>

                {/* Grund */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Grund</label>
                  <select
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-black focus:border-gold focus:outline-none transition-colors"
                  >
                    <option value="Krank">Krank</option>
                    <option value="Arzttermin">Arzttermin</option>
                    <option value="Privat">Privat</option>
                    <option value="Sonstiges">Sonstiges</option>
                  </select>
                </div>
              </div>
            ) : mode === 'pause' ? (
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
                    {mode === 'block'
                      ? 'Blockierung speichern'
                      : mode === 'pause'
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
      {showConflictModal && conflictResult && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={handleDismissConflicts} />
          <div className="relative bg-white rounded-2xl shadow-xl w-[440px] max-w-[calc(100vw-2rem)] p-5">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-100 text-amber-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Konflikte erkannt</h3>
                <p className="text-sm text-slate-500">
                  {conflictResult.skipped} Termin{conflictResult.skipped !== 1 ? 'e' : ''} übersprungen
                </p>
              </div>
            </div>

            {/* Scrollbare Konflikt-Liste */}
            <div className="max-h-64 overflow-y-auto">
              {conflictResult.skippedDates.length > 0 ? (
                <div className="space-y-1">
                  {conflictResult.skippedDates.map((dateStr) => {
                    const d = new Date(dateStr);
                    const formatted = `${DAY_NAMES[d.getDay()]}, ${d.getDate()}. ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
                    return (
                      <div key={dateStr} className="flex items-center px-3 py-1.5 bg-amber-50 rounded-lg">
                        <svg className="w-3.5 h-3.5 text-amber-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs text-amber-800">{formatted}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-3 py-2 bg-amber-50 rounded-lg">
                  <span className="text-sm text-amber-800">
                    {conflictResult.skipped} Termin(e) übersprungen wegen Konflikten
                  </span>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={handleCancelConflicts}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDismissConflicts}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-gold text-white hover:bg-gold/90"
              >
                Verstanden
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
