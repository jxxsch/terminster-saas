'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface AppointmentData {
  id: string;
  date: string;
  time: string;
  status: string;
  customerName: string;
  customerId: string | null;
  barberName: string;
  barberImage: string;
  serviceName: string;
  serviceDuration: number;
  servicePrice: number;
}

export default function StornierungsSeite() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, customer } = useAuth();

  const appointmentId = searchParams.get('id');

  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [canCancel, setCanCancel] = useState(true);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!appointmentId) {
      router.push('/');
      return;
    }

    // Wenn Kunde eingeloggt ist, zum Kundenprofil weiterleiten
    if (isAuthenticated && customer) {
      router.push(`/?cancel=${appointmentId}`);
      return;
    }

    // Termin-Details laden
    fetch(`/api/cancel/${appointmentId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setAppointment(data.appointment);
          setCanCancel(data.canCancel);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Fehler beim Laden des Termins');
        setLoading(false);
      });
  }, [appointmentId, isAuthenticated, customer, router]);

  const handleCancel = async () => {
    if (!appointmentId) return;

    setCancelling(true);
    setError('');

    try {
      const res = await fetch(`/api/cancel/${appointmentId}`, {
        method: 'POST',
      });

      const data = await res.json();

      if (data.success) {
        // Weiterleitung zur Homepage mit Parameter für Modal
        router.push('/?cancelled=true');
      } else {
        setError(data.error || 'Stornierung fehlgeschlagen');
        setCancelling(false);
      }
    } catch {
      setError('Netzwerkfehler');
      setCancelling(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${days[date.getDay()]}, ${day}.${month}.${year}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d4a853]"></div>
      </div>
    );
  }

  if (error && !appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full text-center" style={{ maxWidth: '448px' }}>
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Fehler</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-[#d4a853] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#c49843] transition-colors"
          >
            Zur Startseite
          </button>
        </div>
      </div>
    );
  }

  if (!canCancel) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full text-center" style={{ maxWidth: '448px' }}>
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Stornierung nicht mehr möglich</h1>
          <p className="text-gray-600 mb-4">
            Dein Termin ist in weniger als 5 Stunden. Eine Online-Stornierung ist leider nicht mehr möglich.
          </p>
          <p className="text-gray-600 mb-6">
            Bitte kontaktiere uns telefonisch:
          </p>
          <a
            href="tel:+4921475004590"
            className="flex items-center justify-center gap-2 bg-[#d4a853] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#c49843] transition-colors mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            0214 7500 4590
          </a>
          <button
            onClick={() => router.push('/')}
            className="text-gray-500 hover:text-gray-700 font-medium"
          >
            Zur Startseite
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full" style={{ maxWidth: '448px' }}>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Termin stornieren?</h1>
          <p className="text-gray-500 text-sm">Diese Aktion kann nicht rückgängig gemacht werden.</p>
        </div>

        {appointment && (
          <div className="bg-gray-50 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-4">
              {appointment.barberImage && (
                <img
                  src={`https://terminster.com${appointment.barberImage}`}
                  alt={appointment.barberName}
                  className="w-12 h-12 rounded-full object-cover"
                />
              )}
              <div>
                <p className="font-semibold text-gray-900">{appointment.barberName}</p>
                <p className="text-sm text-gray-500">{appointment.serviceName}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Datum</span>
                <span className="font-medium text-gray-900">{formatDate(appointment.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Uhrzeit</span>
                <span className="font-medium text-gray-900">{appointment.time} Uhr</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/')}
            disabled={cancelling}
            className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex-1 bg-red-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {cancelling ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Wird storniert...
              </>
            ) : (
              'Stornieren'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
