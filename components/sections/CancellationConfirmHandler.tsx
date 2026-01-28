'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { useBooking } from '@/context/BookingContext';

export function CancellationConfirmHandler() {
  const searchParams = useSearchParams();
  const { openBooking } = useBooking();
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Prüfen ob ?cancelled=true in der URL ist
    const cancelled = searchParams.get('cancelled');
    if (cancelled === 'true') {
      setShowModal(true);
      // URL-Parameter entfernen
      const url = new URL(window.location.href);
      url.searchParams.delete('cancelled');
      window.history.replaceState(null, '', url.pathname);
    }

    return () => setMounted(false);
  }, [searchParams]);

  const handleClose = () => {
    setShowModal(false);
  };

  const handleBookNew = () => {
    setShowModal(false);
    openBooking();
  };

  if (!showModal || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal - gleiches Design wie Stornierungsseite */}
      <div className="relative bg-white w-full rounded-3xl shadow-xl p-8" style={{ maxWidth: '448px' }}>
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
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
