'use client';

import { DetailModal } from './DetailModal';

interface AppointmentItem {
  id: string;
  customer_name: string;
  date: string;
  time_slot: string;
  barber_name: string;
  service_name: string;
  isFirstVisit: boolean;
}

interface AppointmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointments: AppointmentItem[];
  title?: string;
}

export function AppointmentsModal({
  isOpen,
  onClose,
  appointments,
  title = 'Neueste Termine',
}: AppointmentsModalProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Heute';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Morgen';
    }

    return date.toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Gruppiere nach Datum
  const groupedByDate = appointments.reduce((groups, apt) => {
    const dateKey = apt.date;
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(apt);
    return groups;
  }, {} as Record<string, AppointmentItem[]>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon="📅"
      maxWidth="2xl"
      footer={
        <p className="text-xs text-gray-500 text-center">
          {appointments.length} Termine insgesamt
        </p>
      }
    >
      <div className="divide-y divide-gray-100">
        {appointments.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            Keine Termine vorhanden
          </div>
        ) : (
          sortedDates.map((dateKey) => (
            <div key={dateKey}>
              {/* Date Header */}
              <div className="px-6 py-2 bg-gray-50 sticky top-0">
                <span className="text-sm font-medium text-gray-700">
                  {formatDate(dateKey)}
                </span>
              </div>

              {/* Appointments for this date */}
              {groupedByDate[dateKey].map((apt) => (
                <div
                  key={apt.id}
                  className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 text-center">
                      <span className="text-sm font-medium text-gray-900">
                        {apt.time_slot}
                      </span>
                      <span className="text-xs text-gray-500 block">Uhr</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{apt.customer_name}</p>
                        {apt.isFirstVisit && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                            Erster Besuch
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {apt.service_name}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-600">{apt.barber_name}</p>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </DetailModal>
  );
}
