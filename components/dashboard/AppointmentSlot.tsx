'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Appointment,
  Series,
  Service,
  Customer,
  deleteAppointment,
  cancelAppointmentAdmin,
  updateAppointment,
  createAppointment,
  updateSeries,
  getCustomerById,
  updateCustomer,
  createSeriesException,
} from '@/lib/supabase';

interface AppointmentSlotProps {
  appointment?: Appointment;
  series?: Series;
  barberId: string;
  date: string;
  timeSlot: string;
  servicesMap: Record<string, Service>;
  onClick: () => void;
  onDelete: (id: string, deletedAppointment?: Appointment) => void;
  onUpdate?: (updated: Appointment) => void;
  onSeriesDelete?: (id: string) => void;
  onSeriesFutureDeleted?: (seriesId: string, fromDate: string) => void;
  onSeriesUpdate?: (updated: Series) => void;
  onAppointmentCreated?: (newAppointment: Appointment) => void;
  onSeriesSingleCancelled?: (cancellationId: string) => void;
  isDisabled?: boolean;
  disabledReason?: string;
  isOutsideBusinessHours?: boolean;
  // Selection Mode Props
  selectionMode?: boolean;
  isSelected?: boolean;
  isPreview?: boolean;
  onToggleSelect?: (shiftKey?: boolean) => void;
  // Name Display
  formatName?: (name: string) => string;
  // Read-only für vergangene Termine
  isPast?: boolean;
  // Kundendaten bearbeitbar?
  allowEditCustomer?: boolean;
}

export function AppointmentSlot({
  appointment,
  series,
  barberId,
  date,
  timeSlot,
  servicesMap,
  onClick,
  onDelete,
  onUpdate,
  onSeriesDelete,
  onSeriesFutureDeleted,
  onSeriesUpdate,
  onAppointmentCreated,
  onSeriesSingleCancelled,
  isDisabled,
  isOutsideBusinessHours,
  selectionMode = false,
  isSelected = false,
  isPreview = false,
  onToggleSelect,
  formatName = (name) => name,
  isPast = false,
  allowEditCustomer = false,
}: AppointmentSlotProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [backdropReady, setBackdropReady] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPauseDeleteModal, setShowPauseDeleteModal] = useState(false);
  const [showSeriesCancelModal, setShowSeriesCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDeletingPause, setIsDeletingPause] = useState(false);
  const [isCancellingSingle, setIsCancellingSingle] = useState(false);
  const [showDeleteEntireSeriesConfirm, setShowDeleteEntireSeriesConfirm] = useState<string | null>(null);
  const [isDeletingEntireSeries, setIsDeletingEntireSeries] = useState(false);
  const [isEditingRhythm, setIsEditingRhythm] = useState(false);
  const [isSavingRhythm, setIsSavingRhythm] = useState(false);
  const [selectedRhythm, setSelectedRhythm] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [isEditingSeriesContact, setIsEditingSeriesContact] = useState(false);
  const [isSavingSeriesContact, setIsSavingSeriesContact] = useState(false);
  const [seriesPhone, setSeriesPhone] = useState('');
  const [seriesEmail, setSeriesEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [popupPosition, setPopupPosition] = useState<'bottom' | 'top'>('bottom');
  const slotRef = useRef<HTMLDivElement>(null);

  // Bestimme Popup-Position basierend auf verfügbarem Platz
  // Popup braucht ca. 350px Höhe für alle Inhalte
  const POPUP_HEIGHT = 350;
  const HEADER_HEIGHT = 80; // Header-Bereich der nicht überlappt werden soll

  useEffect(() => {
    if (showDetails && slotRef.current) {
      const rect = slotRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top - HEADER_HEIGHT;

      // Öffne nach oben wenn: unten zu wenig Platz UND oben genug Platz
      if (spaceBelow < POPUP_HEIGHT && spaceAbove >= POPUP_HEIGHT) {
        setPopupPosition('top');
      } else if (spaceBelow < POPUP_HEIGHT && spaceAbove < POPUP_HEIGHT) {
        // Beide Seiten haben zu wenig Platz - wähle die bessere
        setPopupPosition(spaceAbove > spaceBelow ? 'top' : 'bottom');
      } else {
        setPopupPosition('bottom');
      }
    }
  }, [showDetails]);

  // Backdrop erst nach kurzem Delay aktivieren, um zu verhindern dass der
  // öffnende Klick sofort auf dem Backdrop landet und das Popup schließt
  useEffect(() => {
    if (showDetails) {
      setBackdropReady(false);
      const timer = setTimeout(() => setBackdropReady(true), 50);
      return () => clearTimeout(timer);
    } else {
      setBackdropReady(false);
    }
  }, [showDetails]);

  const openCancelModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!appointment) return;

    setIsCancelling(true);
    const success = await cancelAppointmentAdmin(appointment.id);
    if (success) {
      onDelete(appointment.id, appointment);
      setShowDetails(false);
      setShowCancelModal(false);
    }
    setIsCancelling(false);
  };

  const handleDeletePermanent = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!appointment) return;

    if (confirm('Termin endgültig löschen?')) {
      const success = await deleteAppointment(appointment.id);
      if (success) {
        onDelete(appointment.id, appointment);
      }
    }
  };

  // Berechne Popup-Position synchron
  const calculatePopupPosition = () => {
    if (slotRef.current) {
      const rect = slotRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top - HEADER_HEIGHT;

      if (spaceBelow < POPUP_HEIGHT && spaceAbove >= POPUP_HEIGHT) {
        setPopupPosition('top');
      } else if (spaceBelow < POPUP_HEIGHT && spaceAbove < POPUP_HEIGHT) {
        setPopupPosition(spaceAbove > spaceBelow ? 'top' : 'bottom');
      } else {
        setPopupPosition('bottom');
      }
    }
  };

  const handleClick = async (e: React.MouseEvent) => {
    if (appointment) {
      e.stopPropagation();
      // Im Selection Mode: Auswahl toggle
      if (selectionMode && onToggleSelect) {
        onToggleSelect(e.shiftKey);
        return;
      }
      if (!showDetails) {
        // Berechne Position bevor Popup geöffnet wird
        calculatePopupPosition();
        // Load customer data if customer_id exists
        if (appointment.customer_id) {
          const customerData = await getCustomerById(appointment.customer_id);
          setCustomer(customerData);
        }
        setEditPhone(appointment.customer_phone || '');
        setEditEmail(appointment.customer_email || '');
      }
      setShowDetails(!showDetails);
      setIsEditing(false);
    } else {
      onClick();
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Sicherstellen, dass die Werte vorausgefüllt sind
    setEditPhone(appointment?.customer_phone || '');
    setEditEmail(appointment?.customer_email || '');
    setIsEditing(true);
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!appointment) return;

    setIsSaving(true);

    // If customer account exists, update customer record
    if (appointment.customer_id && customer) {
      await updateCustomer(appointment.customer_id, {
        phone: editPhone || undefined,
        email: editEmail,
      });
    }

    // Also update appointment record
    const updated = await updateAppointment(appointment.id, {
      customer_phone: editPhone || null,
      customer_email: editEmail || null,
    });

    if (updated && onUpdate) {
      onUpdate(updated);
    }

    setIsSaving(false);
    setIsEditing(false);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditPhone(appointment?.customer_phone || '');
    setEditEmail(appointment?.customer_email || '');
    setIsEditing(false);
  };

  // Get service name from map
  const getServiceName = (serviceId: string | null): string => {
    if (!serviceId) return 'Kein Service';
    return servicesMap[serviceId]?.name || 'Unbekannt';
  };

  // Rhythmus speichern (für Serien - auf Komponentenebene damit in beiden Pfaden nutzbar)
  const handleSaveRhythmGlobal = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!series) return;
    setIsSavingRhythm(true);
    const updated = await updateSeries(series.id, { interval_type: selectedRhythm });
    if (updated && onSeriesUpdate) {
      onSeriesUpdate(updated);
    }
    setIsSavingRhythm(false);
    setIsEditingRhythm(false);
  };

  // Empty slot - wenn Barber abwesend, grau und nicht klickbar
  if (!appointment && !series) {
    if (isDisabled) {
      return (
        <div className="h-full bg-gray-100/50">
          {/* Leerer grauer Slot */}
        </div>
      );
    }
    // Normaler leerer Slot - in der Vergangenheit nicht klickbar
    if (isPast) {
      return (
        <div className="h-full bg-gray-50/30" />
      );
    }
    return (
      <div
        onClick={onClick}
        className="h-full cursor-pointer transition-colors group hover:bg-gold/10"
      >
        <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-3 h-3 text-gold/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
      </div>
    );
  }

  // Handler für gesamte Serie löschen (alle Termine + Serie-Datensatz)
  const handleDeleteEntireSeries = async () => {
    const seriesId = showDeleteEntireSeriesConfirm;
    if (!seriesId) return;
    setIsDeletingEntireSeries(true);
    const { deleteSeries } = await import('@/lib/supabase');
    const success = await deleteSeries(seriesId);
    if (success && onSeriesDelete) {
      onSeriesDelete(seriesId);
    }
    setIsDeletingEntireSeries(false);
    setShowDeleteEntireSeriesConfirm(null);
    setShowPauseDeleteModal(false);
    setShowSeriesCancelModal(false);
    setShowDetails(false);
  };

  // Bestätigungs-Modal für "Gesamte Serie löschen" (wiederverwendbar in allen return-Blöcken)
  const deleteEntireSeriesConfirmModal = showDeleteEntireSeriesConfirm && (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => !isDeletingEntireSeries && setShowDeleteEntireSeriesConfirm(null)}
      />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 mx-4 text-center" style={{ minWidth: '320px', maxWidth: '400px' }}>
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Gesamte Serie löschen?</h3>
        <p className="text-sm text-gray-500 mb-5">
          Alle Termine dieser Serie (Vergangenheit + Zukunft) werden unwiderruflich gelöscht. Die Zeitslots werden sofort wieder freigegeben.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setShowDeleteEntireSeriesConfirm(null)}
            disabled={isDeletingEntireSeries}
            className="py-2 px-5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleDeleteEntireSeries}
            disabled={isDeletingEntireSeries}
            className="py-2 px-5 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeletingEntireSeries ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Löschen...
              </>
            ) : (
              'Ja, komplett löschen'
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // Series slot (virtual appointment from series)
  if (series && !appointment) {
    // Check if series is a Pause
    const isSeriesPause = series.customer_name?.includes('Pause');

    const handleSeriesClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!showDetails) {
        // Berechne Position bevor Popup geöffnet wird
        calculatePopupPosition();
        setSelectedRhythm((series.interval_type as 'weekly' | 'biweekly' | 'monthly') || 'weekly');
        setIsEditingRhythm(false);
        setIsEditingSeriesContact(false);
        setSeriesPhone(series.customer_phone || '');
        setSeriesEmail(series.customer_email || '');
      }
      setShowDetails(!showDetails);
    };

    const handleDeleteSeriesFromHere = async (e: React.MouseEvent) => {
      e.stopPropagation();
      const { cancelSeriesFuture } = await import('@/lib/supabase');
      const result = await cancelSeriesFuture(series.id, date);
      if (result.success && onSeriesFutureDeleted) {
        onSeriesFutureDeleted(series.id, date);
      }
      setShowDetails(false);
    };

    const handleSaveSeriesContact = async (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsSavingSeriesContact(true);
      const updated = await updateSeries(series.id, {
        customer_phone: seriesPhone || null,
        customer_email: seriesEmail || null,
      });
      if (updated && onSeriesUpdate) {
        onSeriesUpdate(updated);
      }
      setIsSavingSeriesContact(false);
      setIsEditingSeriesContact(false);
    };

    const handleSaveRhythm = handleSaveRhythmGlobal;

    const handleCancelSingleAppointment = async () => {
      setIsCancellingSingle(true);
      // Erstelle einen stornierten Termin für dieses spezifische Datum
      const result = await createAppointment({
        barber_id: barberId,
        date: date,
        time_slot: timeSlot,
        service_id: series.service_id,
        customer_name: series.customer_name,
        customer_phone: series.customer_phone || null,
        customer_email: null,
        customer_id: null,
        source: 'manual',
        status: 'cancelled',
        series_id: series.id,
        is_pause: false,
        cancelled_by: 'barber',
        cancelled_at: new Date().toISOString(),
      });

      if (result.success && result.appointment) {
        // Exception erstellen, damit Cron-Job diesen Termin nicht regeneriert
        await createSeriesException({
          series_id: series.id,
          exception_date: date,
          exception_type: 'deleted',
          original_time_slot: timeSlot,
          original_barber_id: barberId,
          moved_to_appointment_id: null,
          reason: 'single_cancellation',
        });

        if (onAppointmentCreated) {
          onAppointmentCreated(result.appointment);
        }
        // Für Undo: ID der Stornierung melden
        if (onSeriesSingleCancelled) {
          onSeriesSingleCancelled(result.appointment.id);
        }
      }
      setIsCancellingSingle(false);
      setShowSeriesCancelModal(false);
      setShowDetails(false);
    };

    const currentRhythm = series.interval_type || 'weekly';
    const rhythmLabels: Record<string, string> = {
      weekly: 'Wöchentlich',
      biweekly: 'Alle 2 Wochen',
      monthly: 'Monatlich',
    };

    // Im Selection Mode: Auswahl toggle statt Details
    const handleSeriesSelectionClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (selectionMode && onToggleSelect) {
        onToggleSelect(e.shiftKey);
      } else {
        handleSeriesClick(e);
      }
    };

    return (
      <div
        ref={slotRef}
        onClick={handleSeriesSelectionClick}
        className={`relative p-1 h-full cursor-pointer transition-colors select-none ${
          selectionMode
            ? isSelected
              ? 'bg-red-100 ring-2 ring-red-400 ring-inset'
              : isPreview
              ? 'bg-orange-100 ring-2 ring-orange-400 ring-inset'
              : isSeriesPause
              ? 'bg-gray-200 hover:bg-gray-300'
              : 'bg-blue-50 hover:bg-blue-100'
            : isSeriesPause
            ? 'bg-gray-200 hover:bg-gray-300'
            : 'bg-blue-50 hover:bg-blue-100'
        }`}
      >
        <div className="flex items-center justify-between gap-1 h-full pl-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              {!isSeriesPause && (
                <svg className={`w-2.5 h-2.5 flex-shrink-0 ${
                  selectionMode && isSelected
                    ? 'text-red-500'
                    : selectionMode && isPreview
                    ? 'text-orange-500'
                    : 'text-blue-500'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              <span className={`text-[13px] font-medium truncate ${
                selectionMode && isSelected
                  ? 'text-red-700'
                  : selectionMode && isPreview
                  ? 'text-orange-700'
                  : isSeriesPause
                  ? 'text-gray-600'
                  : 'text-blue-700'
              }`}>
                {isSeriesPause ? 'Pause' : formatName(series.customer_name)}
              </span>
            </div>
          </div>
          {/* Checkbox im Selection Mode - rechtsbündig */}
          {selectionMode && (
            <div
              className={`flex-shrink-0 w-4 h-4 flex items-center justify-center rounded border-2 transition-colors ${
                isSelected
                  ? 'bg-red-500 border-red-500'
                  : isPreview
                  ? 'bg-orange-400 border-orange-400'
                  : 'bg-white border-gray-300'
              }`}
            >
              {(isSelected || isPreview) && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          )}
          {/* Rotes X zum Stornieren dieses Termins - versteckt im Selection Mode */}
          {!selectionMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSeriesCancelModal(true);
              }}
              className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded border border-red-300 bg-red-50 hover:bg-red-100 transition-colors"
              title="Diesen Termin stornieren"
            >
              <svg className="w-2.5 h-2.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Details Popup für Serie */}
        {showDetails && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={(e) => {
                e.stopPropagation();
                if (backdropReady) {
                  setShowDetails(false);
                  setIsEditingRhythm(false);
                  setIsEditingSeriesContact(false);
                }
              }}
            />
            <div className={`absolute z-20 left-0 right-0 bg-white shadow-xl rounded-lg border border-gray-200 p-2 ${
              popupPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
            }`}>
              <div className="space-y-2">
                {/* Header */}
                <div className="pb-2 border-b border-gray-100 flex items-center gap-2">
                  {isSeriesPause ? (
                    <>
                      <div className="w-4 h-4 bg-gray-200 rounded-full" />
                      <span className="text-xs font-medium text-gray-600">Pause (Serie)</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-xs font-medium text-blue-600">Serientermin</span>
                    </>
                  )}
                </div>

                {/* Kundenname - nur für normale Serien, nicht für Pause */}
                {!isSeriesPause && (
                  <div>
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider block">Kunde</span>
                    <span className="text-sm font-medium text-black">{series.customer_name}</span>
                  </div>
                )}

                {/* Telefon, E-Mail, Service - nur für normale Serien, nicht für Pause */}
                {!isSeriesPause && (
                  <>
                    {/* Telefon - Bearbeitbar */}
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider block">Telefon</span>
                      {isEditingSeriesContact ? (
                        <input
                          type="tel"
                          value={seriesPhone}
                          onChange={(e) => setSeriesPhone(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full text-sm text-black px-2 py-1 border border-gray-200 rounded focus:border-gold focus:outline-none"
                          placeholder="Telefonnummer"
                        />
                      ) : series.customer_phone ? (
                        <a
                          href={`tel:${series.customer_phone}`}
                          className="text-sm text-gold hover:text-gold-dark transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {series.customer_phone}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">Nicht angegeben</span>
                      )}
                    </div>

                    {/* E-Mail - Bearbeitbar */}
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider block">E-Mail</span>
                      {isEditingSeriesContact ? (
                        <input
                          type="email"
                          value={seriesEmail}
                          onChange={(e) => setSeriesEmail(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full text-sm text-black px-2 py-1 border border-gray-200 rounded focus:border-gold focus:outline-none"
                          placeholder="E-Mail"
                        />
                      ) : series.customer_email ? (
                        <a
                          href={`mailto:${series.customer_email}`}
                          className="text-sm text-gold hover:text-gold-dark transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {series.customer_email}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">Nicht angegeben</span>
                      )}
                    </div>

                    {/* Kontakt Bearbeiten Buttons */}
                    {isEditingSeriesContact ? (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEditingSeriesContact(false);
                            setSeriesPhone(series.customer_phone || '');
                            setSeriesEmail(series.customer_email || '');
                          }}
                          className="flex-1 py-1 px-2 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
                        >
                          Abbrechen
                        </button>
                        <button
                          onClick={handleSaveSeriesContact}
                          disabled={isSavingSeriesContact}
                          className="flex-1 py-1 px-2 text-xs text-white bg-gold hover:bg-gold-dark rounded disabled:opacity-50"
                        >
                          {isSavingSeriesContact ? 'Speichern...' : 'Speichern'}
                        </button>
                      </div>
                    ) : allowEditCustomer ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditingSeriesContact(true);
                        }}
                        className="w-full py-1 px-2 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50 flex items-center justify-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Kontakt bearbeiten
                      </button>
                    ) : null}

                  </>
                )}

                {/* Intervall - Bearbeitbar */}
                <div>
                  <span className="text-[9px] text-gray-400 uppercase tracking-wider block">Rhythmus</span>
                  {isEditingRhythm ? (
                    <div className="mt-1 space-y-2">
                      <select
                        value={selectedRhythm}
                        onChange={(e) => setSelectedRhythm(e.target.value as 'weekly' | 'biweekly' | 'monthly')}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-sm text-black px-2 py-1.5 border border-gray-200 rounded focus:border-gold focus:outline-none"
                      >
                        <option value="weekly">Wöchentlich</option>
                        <option value="biweekly">Alle 2 Wochen</option>
                        <option value="monthly">Monatlich</option>
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEditingRhythm(false);
                            setSelectedRhythm((series.interval_type as 'weekly' | 'biweekly' | 'monthly') || 'weekly');
                          }}
                          className="flex-1 py-1 px-2 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
                        >
                          Abbrechen
                        </button>
                        <button
                          onClick={handleSaveRhythm}
                          disabled={isSavingRhythm || selectedRhythm === currentRhythm}
                          className="flex-1 py-1 px-2 text-xs text-white bg-gold hover:bg-gold-dark rounded disabled:opacity-50"
                        >
                          {isSavingRhythm ? 'Speichern...' : 'Speichern'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{rhythmLabels[currentRhythm]}</span>
                      {!isPast && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEditingRhythm(true);
                          }}
                          className="text-[10px] text-gold hover:text-gold-dark"
                        >
                          Ändern
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-100 space-y-2">
                  {/* Diesen Termin stornieren */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSeriesCancelModal(true);
                    }}
                    className="w-full py-1.5 px-2 text-xs text-amber-700 border border-amber-200 rounded hover:bg-amber-50 transition-colors flex items-center justify-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Nur diesen Termin stornieren
                  </button>

                  {/* Serie ab hier löschen */}
                  <button
                    onClick={handleDeleteSeriesFromHere}
                      className="w-full py-1.5 px-2 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Serie ab hier löschen
                    </button>
                  {/* Gesamte Serie löschen */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDeleteEntireSeriesConfirm(series.id); }}
                      className="w-full py-1.5 px-2 text-xs text-red-700 border border-red-300 bg-red-50 rounded hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Gesamte Serie löschen
                    </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Modal: Serientermin-Optionen */}
        {showSeriesCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowSeriesCancelModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl p-6 mx-4 text-center">
              {/* Icon nur für normale Serien, nicht für Pause */}
              {!isSeriesPause && (
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              )}

              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {isSeriesPause ? 'Pause bearbeiten' : 'Serientermin bearbeiten'}
              </h3>
              <p className="text-sm text-gray-500">
                {!isSeriesPause && (
                  <>
                    <span className="font-medium text-gray-700">{series.customer_name}</span>
                    <span className="mx-2">·</span>
                  </>
                )}
                <span>{date}</span>
                <span className="mx-2">·</span>
                <span>{timeSlot} Uhr</span>
              </p>

              <div className="flex flex-col gap-3 mt-5">
                {/* Einzelnen Termin stornieren */}
                <button
                  onClick={handleCancelSingleAppointment}
                  disabled={isCancellingSingle}
                  className="w-full py-3 px-4 text-sm text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isCancellingSingle ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Stornieren...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      Nur diesen Termin stornieren
                    </>
                  )}
                </button>

                {/* Serie ab hier löschen */}
                <button
                  onClick={async () => {
                    const { cancelSeriesFuture } = await import('@/lib/supabase');
                    const result = await cancelSeriesFuture(series.id, date);
                    if (result.success && onSeriesFutureDeleted) {
                      onSeriesFutureDeleted(series.id, date);
                    }
                    setShowSeriesCancelModal(false);
                    setShowDetails(false);
                  }}
                  className="w-full py-3 px-4 text-sm text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Serie ab hier löschen
                </button>

                {/* Gesamte Serie löschen */}
                <button
                  onClick={() => setShowDeleteEntireSeriesConfirm(series.id)}
                  className="w-full py-3 px-4 text-sm text-red-700 bg-red-100 hover:bg-red-200 border border-red-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Gesamte Serie löschen
                </button>

                {/* Abbrechen */}
                <button
                  onClick={() => setShowSeriesCancelModal(false)}
                  className="w-full py-2 px-4 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteEntireSeriesConfirmModal}
      </div>
    );
  }

  // Booked slot
  const isOnline = appointment?.source === 'online';
  const isSeries = !!appointment?.series_id;
  const isPause = appointment?.is_pause || appointment?.customer_name?.includes('Pause');
  const isCancelled = appointment?.status === 'cancelled';

  // Handler für Pause-Löschen (einzeln)
  const handleDeletePause = async () => {
    if (!appointment) return;
    setIsDeletingPause(true);

    if (appointment.series_id) {
      // Teil einer Serie: Status auf 'cancelled' setzen statt zu löschen
      // Das verhindert, dass die Serie den Termin wieder anzeigt
      const success = await cancelAppointmentAdmin(appointment.id);
      if (success) {
        // Update den lokalen State mit dem stornierten Termin
        const cancelledAppointment: Appointment = {
          ...appointment,
          status: 'cancelled',
        };
        if (onUpdate) {
          onUpdate(cancelledAppointment);
        }
      }
    } else {
      // Keine Serie: Komplett löschen
      const success = await deleteAppointment(appointment.id);
      if (success) {
        onDelete(appointment.id, appointment);
      }
    }

    setShowPauseDeleteModal(false);
    setShowDetails(false);
    setIsDeletingPause(false);
  };

  // Handler für Pause-Serie ab hier löschen
  const handleDeletePauseSeriesFromHere = async () => {
    if (!appointment?.series_id) return;
    setIsDeletingPause(true);
    const { cancelSeriesFuture } = await import('@/lib/supabase');
    const result = await cancelSeriesFuture(appointment.series_id, date);
    if (result.success && onSeriesFutureDeleted) {
      onSeriesFutureDeleted(appointment.series_id, date);
    }
    setIsDeletingPause(false);
    setShowPauseDeleteModal(false);
    setShowDetails(false);
  };

  // Handler für Serie ab hier löschen (für gebuchte Serientermine)
  const handleDeleteBookedSeriesFromHere = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!series) return;
    const { cancelSeriesFuture } = await import('@/lib/supabase');
    const result = await cancelSeriesFuture(series.id, date);
    if (result.success && onSeriesFutureDeleted) {
      onSeriesFutureDeleted(series.id, date);
    }
    setShowDetails(false);
  };

  // Pause slot - special styling (same layout as regular appointments)
  if (isPause) {
    return (
      <div className="relative p-1 h-full transition-colors select-none cursor-grab bg-gray-200 hover:bg-gray-300">
        <div className="flex items-center justify-between gap-1 h-full pl-1">
          <div className="flex-1 min-w-0">
            <span className="text-[13px] font-medium text-gray-600 truncate block select-none">
              Pause
            </span>
          </div>
          {/* X zum Löschen - nicht bei vergangenen */}
          {!isPast && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPauseDeleteModal(true);
            }}
            className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded border border-red-300 bg-red-50 hover:bg-red-100 transition-colors"
            title="Pause löschen"
          >
            <svg className="w-2.5 h-2.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          )}
        </div>

        {/* Pause Löschen Bestätigungs-Modal */}
        {showPauseDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowPauseDeleteModal(false)}
            />
            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-xl p-6 mx-4 text-center" style={{ minWidth: '320px', maxWidth: '400px' }}>
              {/* Icon */}
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h3 className="text-lg font-medium text-gray-900 mb-1">Pause löschen</h3>
              <p className="text-sm text-gray-500 mb-5 whitespace-nowrap">
                {date} · {appointment?.time_slot} Uhr
              </p>

              {/* Buttons */}
              <div className="flex flex-col gap-3">
                {/* Nur diese Pause löschen */}
                <button
                  onClick={handleDeletePause}
                  disabled={isDeletingPause}
                  className="w-full py-3 px-4 text-sm text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {isDeletingPause ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Löschen...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Pause löschen
                    </>
                  )}
                </button>

                {/* Pause-Serie ab hier löschen - nur anzeigen wenn series_id existiert */}
                {appointment?.series_id && (
                  <button
                    onClick={handleDeletePauseSeriesFromHere}
                    disabled={isDeletingPause}
                    className="w-full py-3 px-4 text-sm text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Serie ab hier löschen
                  </button>
                )}

                {/* Gesamte Pause-Serie löschen */}
                {appointment?.series_id && (
                  <button
                    onClick={() => setShowDeleteEntireSeriesConfirm(appointment.series_id!)}
                    disabled={isDeletingPause}
                    className="w-full py-3 px-4 text-sm text-red-700 bg-red-100 hover:bg-red-200 border border-red-300 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Gesamte Serie löschen
                  </button>
                )}

                {/* Abbrechen */}
                <button
                  onClick={() => setShowPauseDeleteModal(false)}
                  className="w-full py-2 px-4 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteEntireSeriesConfirmModal}
      </div>
    );
  }

  // Cancelled appointment from series - show as empty clickable slot (exception stays in DB)
  if (isCancelled && appointment?.series_id) {
    if (isDisabled) {
      return <div className="h-full bg-gray-100/50" />;
    }
    if (isPast) {
      return <div className="h-full bg-gray-50/30" />;
    }
    return (
      <div
        onClick={onClick}
        className="h-full cursor-pointer transition-colors group hover:bg-gold/10"
      >
        <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-3 h-3 text-gold/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
      </div>
    );
  }

  // Cancelled regular appointment - show with strikethrough and delete option
  if (isCancelled) {
    const handleDeleteCancelledDirect = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!appointment) return;
      const success = await deleteAppointment(appointment.id);
      if (success) {
        onDelete(appointment.id, appointment);
      }
    };

    return (
      <div
        ref={slotRef}
        className="relative p-1 h-full transition-colors select-none bg-red-50/50 hover:bg-red-100/50"
      >
        <div className="flex items-center justify-between gap-1 h-full pl-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              {/* Storniert-Icon */}
              <svg className="w-2.5 h-2.5 flex-shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <span className="text-[13px] font-medium text-red-400 line-through truncate">
                {appointment?.customer_name ? formatName(appointment.customer_name) : ''}
              </span>
            </div>
          </div>
          {/* X zum direkten Löschen - nicht bei vergangenen */}
          {!isPast && (
            <button
              onClick={handleDeleteCancelledDirect}
              className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded border border-red-300 bg-red-50 hover:bg-red-100 transition-colors"
              title="Endgültig löschen"
            >
              <svg className="w-2.5 h-2.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={slotRef}
      className={`relative p-1 h-full transition-colors select-none cursor-pointer ${
        selectionMode
          ? isSelected
            ? 'bg-red-100 ring-2 ring-red-400 ring-inset'
            : isPreview
            ? 'bg-orange-100 ring-2 ring-orange-400 ring-inset'
            : isSeries
            ? 'bg-blue-100 hover:bg-blue-200'
            : isOnline
            ? 'bg-green-100 hover:bg-green-200'
            : 'bg-gold/30 hover:bg-gold/40'
          : isSeries
          ? 'bg-blue-100 hover:bg-blue-200'
          : isOnline
          ? 'bg-green-100 hover:bg-green-200'
          : 'bg-gold/30 hover:bg-gold/40'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between gap-1 h-full pl-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {isSeries && (
              <svg className={`w-2.5 h-2.5 flex-shrink-0 ${
                selectionMode && isSelected
                  ? 'text-red-500'
                  : selectionMode && isPreview
                  ? 'text-orange-500'
                  : 'text-blue-500'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            <span className={`text-[13px] font-medium truncate select-none ${
              selectionMode && isSelected
                ? 'text-red-700'
                : selectionMode && isPreview
                ? 'text-orange-700'
                : isSeries
                ? 'text-blue-700'
                : isOnline
                ? 'text-green-700'
                : 'text-amber-800'
            }`}>
              {appointment?.customer_name ? formatName(appointment.customer_name) : ''}
            </span>
          </div>
        </div>
        {/* Checkbox im Selection Mode - rechtsbündig */}
        {selectionMode && (
          <div
            className={`flex-shrink-0 w-4 h-4 flex items-center justify-center rounded border-2 transition-colors ${
              isSelected
                ? 'bg-red-500 border-red-500'
                : isPreview
                ? 'bg-orange-400 border-orange-400'
                : 'bg-white border-gray-300'
            }`}
          >
            {(isSelected || isPreview) && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        )}
        {/* Rotes X zum Stornieren - versteckt im Selection Mode */}
        {!selectionMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isSeries) {
                setShowSeriesCancelModal(true);
              } else {
                setShowCancelModal(true);
              }
            }}
            className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded border border-red-300 bg-red-50 hover:bg-red-100 transition-colors"
            title={isSeries ? 'Serientermin bearbeiten' : 'Stornieren'}
          >
            <svg className="w-2.5 h-2.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Details Popup */}
      {showDetails && appointment && (
        <>
          {/* Backdrop - erst nach kurzem Delay klickbar */}
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => {
              e.stopPropagation();
              if (backdropReady) {
                setShowDetails(false);
                setIsEditing(false);
              }
            }}
          />

          {/* Popup */}
          <div className={`absolute z-20 left-0 right-0 bg-white shadow-xl rounded-lg border border-gray-200 p-2 ${
            popupPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}>
            <div className="space-y-2">
              {/* Header */}
              <div className="pb-2 border-b border-gray-100">
                <span className={`text-xs font-medium ${
                  isSeries ? 'text-blue-600' : isOnline ? 'text-green-600' : 'text-amber-700'
                }`}>
                  {isSeries ? 'Serientermin' : isOnline ? 'Online gebucht' : 'Manuell eingetragen'}
                </span>
              </div>

              {/* Kundenname */}
              <div>
                <span className="text-[9px] text-gray-400 uppercase tracking-wider block">Kunde</span>
                <span className="text-sm font-medium text-black">{appointment.customer_name}</span>
                {appointment.customer_id && (
                  <span className="ml-1 text-[9px] text-green-600 bg-green-50 px-1 rounded">Konto</span>
                )}
              </div>

              {/* Telefon */}
              <div>
                <span className="text-[9px] text-gray-400 uppercase tracking-wider block">Telefon</span>
                <div className="h-[30px] flex items-center">
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-sm text-black px-2 py-1 border border-gray-200 rounded focus:border-gold focus:outline-none h-[28px]"
                      placeholder="Telefonnummer"
                    />
                  ) : appointment.customer_phone ? (
                    <a
                      href={`tel:${appointment.customer_phone}`}
                      className="text-sm text-gold hover:text-gold-dark transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {appointment.customer_phone}
                    </a>
                  ) : (
                    <span className="text-sm text-gray-400">Nicht angegeben</span>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <span className="text-[9px] text-gray-400 uppercase tracking-wider block">E-Mail</span>
                <div className="h-[30px] flex items-center">
                  {isEditing ? (
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-sm text-black px-2 py-1 border border-gray-200 rounded focus:border-gold focus:outline-none h-[28px]"
                      placeholder="E-Mail"
                    />
                  ) : appointment.customer_email ? (
                    <a
                      href={`mailto:${appointment.customer_email}`}
                      className="text-sm text-gold hover:text-gold-dark transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {appointment.customer_email}
                    </a>
                  ) : (
                    <span className="text-sm text-gray-400">Nicht angegeben</span>
                  )}
                </div>
              </div>

              {/* Rhythmus - nur für Serientermine */}
              {isSeries && series && (
                <div>
                  <span className="text-[9px] text-gray-400 uppercase tracking-wider block">Rhythmus</span>
                  {isEditingRhythm ? (
                    <div className="mt-1 space-y-2">
                      <select
                        value={selectedRhythm}
                        onChange={(e) => setSelectedRhythm(e.target.value as 'weekly' | 'biweekly' | 'monthly')}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-sm text-black px-2 py-1.5 border border-gray-200 rounded focus:border-gold focus:outline-none"
                      >
                        <option value="weekly">Wöchentlich</option>
                        <option value="biweekly">Alle 2 Wochen</option>
                        <option value="monthly">Monatlich</option>
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEditingRhythm(false);
                            setSelectedRhythm((series.interval_type as 'weekly' | 'biweekly' | 'monthly') || 'weekly');
                          }}
                          className="flex-1 py-1 px-2 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
                        >
                          Abbrechen
                        </button>
                        <button
                          onClick={handleSaveRhythmGlobal}
                          disabled={isSavingRhythm || selectedRhythm === ((series.interval_type as string) || 'weekly')}
                          className="flex-1 py-1 px-2 text-xs text-white bg-gold hover:bg-gold-dark rounded disabled:opacity-50"
                        >
                          {isSavingRhythm ? 'Speichern...' : 'Speichern'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        {{ weekly: 'Wöchentlich', biweekly: 'Alle 2 Wochen', monthly: 'Monatlich' }[series.interval_type] || 'Wöchentlich'}
                      </span>
                      {!isPast && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRhythm((series.interval_type as 'weekly' | 'biweekly' | 'monthly') || 'weekly');
                            setIsEditingRhythm(true);
                          }}
                          className="text-[10px] text-gold hover:text-gold-dark"
                        >
                          Ändern
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Buttons */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                {isEditing ? (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 py-1.5 px-2 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 py-1.5 px-2 text-xs text-white bg-gold hover:bg-gold-dark rounded transition-colors disabled:opacity-50"
                    >
                      {isSaving ? 'Speichern...' : 'Speichern'}
                    </button>
                  </div>
                ) : (
                  <>
                    {allowEditCustomer && (
                      <button
                        onClick={handleEdit}
                        className="w-full py-1.5 px-2 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Kontakt bearbeiten
                      </button>
                    )}
                    {/* Stornieren-Button: bei Serie öffnet Serien-Modal */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSeries) {
                          setShowDetails(false);
                          setShowSeriesCancelModal(true);
                        } else {
                          openCancelModal(e);
                        }
                      }}
                      className="w-full py-1.5 px-2 text-xs text-amber-700 border border-amber-200 rounded hover:bg-amber-50 transition-colors flex items-center justify-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      {isSeries ? 'Nur diesen Termin stornieren' : 'Stornieren'}
                    </button>
                    {/* Serie ab hier löschen */}
                    {isSeries && series && (
                      <button
                        onClick={handleDeleteBookedSeriesFromHere}
                        className="w-full py-1.5 px-2 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Serie ab hier löschen
                      </button>
                    )}
                    {/* Gesamte Serie löschen */}
                    {isSeries && series && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowDeleteEntireSeriesConfirm(series.id); }}
                        className="w-full py-1.5 px-2 text-xs text-red-700 border border-red-300 bg-red-50 rounded hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Gesamte Serie löschen
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Stornieren Bestätigungs-Modal (nur für Nicht-Serien) */}
      {showCancelModal && appointment && !isSeries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCancelModal(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl p-6 mx-4 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Termin stornieren?</h3>
            <p className="text-sm text-gray-500">
              <span className="font-medium text-gray-700">{appointment.customer_name}</span>
              <span className="mx-2">·</span>
              <span>{appointment.time_slot} Uhr</span>
            </p>
            <div className="flex gap-3 mt-5 justify-center">
              <button
                onClick={() => setShowCancelModal(false)}
                className="py-2 px-5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="py-2 px-5 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCancelling ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Stornieren...
                  </>
                ) : (
                  'Ja, stornieren'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Serien-Cancel-Modal (Nur diesen / Rhythmus / Gesamte Serie) */}
      {showSeriesCancelModal && appointment && isSeries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowSeriesCancelModal(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl p-6 mx-4 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-1">Serientermin bearbeiten</h3>
            <p className="text-sm text-gray-500">
              <span className="font-medium text-gray-700">{appointment.customer_name}</span>
              <span className="mx-2">·</span>
              <span>{date}</span>
              <span className="mx-2">·</span>
              <span>{timeSlot} Uhr</span>
            </p>

            <div className="flex flex-col gap-3 mt-5">
              {/* Einzelnen Termin stornieren */}
              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="w-full py-3 px-4 text-sm text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isCancelling ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Stornieren...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Nur diesen Termin stornieren
                  </>
                )}
              </button>

              {/* Serie ab hier löschen */}
              {series && (
                <button
                  onClick={async () => {
                    const { cancelSeriesFuture } = await import('@/lib/supabase');
                    const result = await cancelSeriesFuture(series.id, date);
                    if (result.success && onSeriesFutureDeleted) {
                      onSeriesFutureDeleted(series.id, date);
                    }
                    setShowSeriesCancelModal(false);
                  }}
                  className="w-full py-3 px-4 text-sm text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Serie ab hier löschen
                </button>
              )}

              {/* Gesamte Serie löschen */}
              {series && (
                <button
                  onClick={() => setShowDeleteEntireSeriesConfirm(series.id)}
                  className="w-full py-3 px-4 text-sm text-red-700 bg-red-100 hover:bg-red-200 border border-red-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Gesamte Serie löschen
                </button>
              )}

              <button
                onClick={() => setShowSeriesCancelModal(false)}
                className="w-full py-2 px-4 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteEntireSeriesConfirmModal}
    </div>
  );
}
