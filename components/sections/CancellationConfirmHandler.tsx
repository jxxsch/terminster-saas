'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { useBooking } from '@/context/BookingContext';

type ModalState =
  | 'loading'           // Wird storniert...
  | 'success'           // Termin storniert
  | 'already_cancelled' // Termin wurde bereits storniert
  | 'not_found'         // Termin nicht gefunden
  | 'too_late'          // Stornierung nicht mehr möglich
  | 'error';            // Allgemeiner Fehler

export function CancellationConfirmHandler() {
  const searchParams = useSearchParams();
  const { openBooking } = useBooking();
  const [mounted, setMounted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalState, setModalState] = useState<ModalState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ref um doppelte Ausführung zu verhindern
  const cancelledRef = useRef(false);

  useEffect(() => {
    setMounted(true);

    // Prüfen ob ?cancel=[id] in der URL ist
    const cancelId = searchParams.get('cancel');

    if (cancelId && !cancelledRef.current) {
      cancelledRef.current = true;
      setShowModal(true);
      setModalState('loading');

      // URL-Parameter sofort entfernen
      const url = new URL(window.location.href);
      url.searchParams.delete('cancel');
      window.history.replaceState(null, '', url.pathname);

      // Termin sofort stornieren
      cancelAppointment(cancelId);
    }

    return () => setMounted(false);
  }, [searchParams]);

  const cancelAppointment = async (id: string) => {
    try {
      const res = await fetch(`/api/cancel/${id}`, {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // Erfolgreich storniert
        setModalState('success');
        return;
      }

      // Fehlerbehandlung
      switch (data.code) {
        case 'ALREADY_CANCELLED':
          setModalState('already_cancelled');
          break;
        case 'NOT_FOUND':
          setModalState('not_found');
          setErrorMessage(data.error || 'Termin nicht gefunden');
          break;
        case 'TOO_LATE':
          setModalState('too_late');
          setErrorMessage(data.phone || '0214 7500 4590');
          break;
        default:
          setModalState('error');
          setErrorMessage(data.error || 'Ein Fehler ist aufgetreten');
      }
    } catch {
      setModalState('error');
      setErrorMessage('Verbindungsfehler. Bitte versuche es erneut.');
    }
  };

  const handleClose = () => {
    setShowModal(false);
    cancelledRef.current = false;
  };

  const handleBookNew = () => {
    setShowModal(false);
    cancelledRef.current = false;
    // BookingModal öffnen - Kundendaten werden automatisch vorausgefüllt wenn eingeloggt
    openBooking();
  };

  if (!mounted || !showModal) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white w-full rounded-3xl shadow-xl p-8" style={{ maxWidth: '420px' }}>

        {/* Loading State */}
        {modalState === 'loading' && (
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-[#d4a853] rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Wird storniert...</h2>
            <p className="text-gray-500 text-sm">Bitte warten</p>
          </div>
        )}

        {/* Success State */}
        {modalState === 'success' && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Termin storniert</h2>
              <p className="text-gray-500 text-sm">Wir hoffen, dich bald wieder zu sehen.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
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
          </>
        )}

        {/* Already Cancelled State */}
        {modalState === 'already_cancelled' && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Bereits storniert</h2>
              <p className="text-gray-500 text-sm">Dieser Termin wurde bereits storniert.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
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
          </>
        )}

        {/* Not Found State */}
        {modalState === 'not_found' && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Termin nicht gefunden</h2>
              <p className="text-gray-500 text-sm">{errorMessage}</p>
            </div>
            <button
              onClick={handleClose}
              className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Schließen
            </button>
          </>
        )}

        {/* Too Late State */}
        {modalState === 'too_late' && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Stornierung nicht möglich</h2>
              <p className="text-gray-500 text-sm mb-4">
                Termine können nur bis 5 Stunden vorher online storniert werden.
              </p>
              <a
                href={`tel:${errorMessage?.replace(/\s/g, '')}`}
                className="inline-flex items-center gap-2 text-[#d4a853] font-semibold hover:underline"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {errorMessage}
              </a>
            </div>
            <button
              onClick={handleClose}
              className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Schließen
            </button>
          </>
        )}

        {/* General Error State */}
        {modalState === 'error' && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Fehler</h2>
              <p className="text-gray-500 text-sm">{errorMessage}</p>
            </div>
            <button
              onClick={handleClose}
              className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Schließen
            </button>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
