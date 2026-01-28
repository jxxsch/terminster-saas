'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { useBooking } from '@/context/BookingContext';
import Image from 'next/image';

interface AppointmentData {
  id: string;
  date: string;
  time: string;
  status: string;
  customerName: string;
  barberName: string;
  barberImage: string;
  serviceName: string;
  serviceDuration: number;
  servicePrice: number;
}

export function CancellationConfirmHandler() {
  const searchParams = useSearchParams();
  const { openBooking } = useBooking();
  const [mounted, setMounted] = useState(false);

  // Für das "Nach-Stornierung"-Modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Für das "Vor-Stornierung"-Modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canCancel, setCanCancel] = useState(true);

  useEffect(() => {
    setMounted(true);

    // Prüfen ob ?cancelled=true in der URL ist (Nach-Stornierung)
    const cancelled = searchParams.get('cancelled');
    if (cancelled === 'true') {
      setShowSuccessModal(true);
      // URL-Parameter entfernen
      const url = new URL(window.location.href);
      url.searchParams.delete('cancelled');
      window.history.replaceState(null, '', url.pathname);
    }

    // Prüfen ob ?cancel=[id] in der URL ist (Vor-Stornierung)
    const cancelId = searchParams.get('cancel');
    if (cancelId) {
      setAppointmentId(cancelId);
      setShowCancelModal(true);
      loadAppointment(cancelId);
      // URL-Parameter entfernen
      const url = new URL(window.location.href);
      url.searchParams.delete('cancel');
      window.history.replaceState(null, '', url.pathname);
    }

    return () => setMounted(false);
  }, [searchParams]);

  const loadAppointment = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cancel/${id}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Termin nicht gefunden');
        return;
      }

      setAppointment(data.appointment);
      setCanCancel(data.canCancel);

      if (data.appointment.status === 'cancelled') {
        // Termin bereits storniert - zeige Erfolgsmodal
        setShowCancelModal(false);
        setShowSuccessModal(true);
      }
    } catch {
      setError('Fehler beim Laden des Termins');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!appointmentId) return;

    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/cancel/${appointmentId}`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'TOO_LATE') {
          setError(`Stornierung nicht mehr möglich. Bitte kontaktiere uns telefonisch unter ${data.phone}.`);
        } else {
          setError(data.error || 'Fehler bei der Stornierung');
        }
        return;
      }

      // Erfolg - zeige Bestätigungsmodal
      setShowCancelModal(false);
      setShowSuccessModal(true);
    } catch {
      setError('Fehler bei der Stornierung');
    } finally {
      setCancelling(false);
    }
  };

  const handleCloseCancelModal = () => {
    setShowCancelModal(false);
    setAppointment(null);
    setError(null);
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
  };

  const handleBookNew = () => {
    setShowSuccessModal(false);
    setShowCancelModal(false);
    openBooking();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    return `${days[date.getDay()]}, ${date.getDate()}. ${months[date.getMonth()]}`;
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',') + ' €';
  };

  if (!mounted) return null;

  // Modal für "Vor-Stornierung" (Bestätigung anfordern)
  const cancelModalContent = showCancelModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseCancelModal} />

      {/* Modal */}
      <div className="relative bg-white w-full rounded-3xl shadow-xl overflow-hidden" style={{ maxWidth: '420px' }}>
        {loading ? (
          // Loading State
          <div className="p-8 text-center">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-[#d4a853] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Termin wird geladen...</p>
          </div>
        ) : error && !appointment ? (
          // Error State (Termin nicht gefunden)
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Termin nicht gefunden</h2>
            <p className="text-gray-500 text-sm mb-6">{error}</p>
            <button
              onClick={handleCloseCancelModal}
              className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Schließen
            </button>
          </div>
        ) : appointment ? (
          // Appointment Details
          <>
            {/* Header */}
            <div className="bg-gradient-to-b from-slate-50 to-white p-6 text-center border-b border-gray-100">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Termin stornieren?</h2>
              <p className="text-gray-500 text-sm">Möchtest du diesen Termin wirklich absagen?</p>
            </div>

            {/* Appointment Card */}
            <div className="p-6">
              <div className="bg-slate-50 rounded-2xl p-4 mb-4">
                {/* Barber Info */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                  {appointment.barberImage && (
                    <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white shadow">
                      <Image
                        src={appointment.barberImage}
                        alt={appointment.barberName}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{appointment.barberName}</p>
                    <p className="text-sm text-gray-500">{appointment.serviceName}</p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Datum</p>
                    <p className="font-medium text-gray-900">{formatDate(appointment.date)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Uhrzeit</p>
                    <p className="font-medium text-gray-900">{appointment.time} Uhr</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Dauer</p>
                    <p className="font-medium text-gray-900">{appointment.serviceDuration} Min.</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Preis</p>
                    <p className="font-medium text-gray-900">{formatPrice(appointment.servicePrice)}</p>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Cannot Cancel Warning */}
              {!canCancel && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                  <p className="text-amber-800 text-sm font-medium mb-1">Stornierung nicht mehr möglich</p>
                  <p className="text-amber-700 text-sm">
                    Termine können nur bis 5 Stunden vorher storniert werden. Bitte ruf uns an:{' '}
                    <a href="tel:02147500459" className="font-semibold underline">0214 7500 4590</a>
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCloseCancelModal}
                  disabled={cancelling}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Abbrechen
                </button>
                {canCancel && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex-1 bg-red-500 text-white px-4 py-3 rounded-xl font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {cancelling ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Wird storniert...</span>
                      </>
                    ) : (
                      'Ja, stornieren'
                    )}
                  </button>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );

  // Modal für "Nach-Stornierung" (Erfolgsbestätigung)
  const successModalContent = showSuccessModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseSuccessModal} />

      {/* Modal */}
      <div className="relative bg-white w-full rounded-3xl shadow-xl p-8" style={{ maxWidth: '420px' }}>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Termin storniert</h1>
          <p className="text-gray-500 text-sm">Wir hoffen, dich bald wieder zu sehen.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCloseSuccessModal}
            className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            Schließen
          </button>
          <button
            onClick={handleBookNew}
            className="flex-1 bg-[#d4a853] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#c49843] transition-colors"
          >
            Neuer Termin
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {cancelModalContent && createPortal(cancelModalContent, document.body)}
      {successModalContent && createPortal(successModalContent, document.body)}
    </>
  );
}
