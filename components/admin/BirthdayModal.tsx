'use client';

import { DetailModal } from './DetailModal';
import { type BirthdayAppointment } from '@/lib/supabase';

interface BirthdayModalProps {
  isOpen: boolean;
  onClose: () => void;
  birthdays: Array<BirthdayAppointment & { barber_name: string }>;
}

export function BirthdayModal({ isOpen, onClose, birthdays }: BirthdayModalProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const todayBirthdays = birthdays.filter(b => b.isToday);
  const upcomingBirthdays = birthdays.filter(b => !b.isToday);

  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title="Geburtstage"
      icon="🎂"
      maxWidth="2xl"
      footer={
        <p className="text-xs text-gray-500 text-center">
          Zeigt Kunden mit Geburtstag, die in den nächsten 90 Tagen einen Termin haben
        </p>
      }
    >
      <div className="divide-y divide-gray-100">
        {birthdays.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            Keine Geburtstage in den nächsten 90 Tagen
          </div>
        ) : (
          <>
            {/* Today's birthdays */}
            {todayBirthdays.length > 0 && (
              <div>
                <div className="px-6 py-3 bg-amber-50">
                  <h3 className="text-sm font-medium text-amber-900 flex items-center gap-2">
                    <span>🎉</span> Heute Geburtstag ({todayBirthdays.length})
                  </h3>
                </div>
                {todayBirthdays.map((apt, idx) => (
                  <BirthdayRow key={`today-${idx}`} birthday={apt} formatDate={formatDate} />
                ))}
              </div>
            )}

            {/* Upcoming birthdays */}
            {upcomingBirthdays.length > 0 && (
              <div>
                <div className="px-6 py-3 bg-gray-50">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <span>🎈</span> Kommende Geburtstage ({upcomingBirthdays.length})
                  </h3>
                </div>
                {upcomingBirthdays.map((apt, idx) => (
                  <BirthdayRow key={`upcoming-${idx}`} birthday={apt} formatDate={formatDate} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DetailModal>
  );
}

function BirthdayRow({
  birthday,
  formatDate,
}: {
  birthday: BirthdayAppointment & { barber_name: string };
  formatDate: (date: string) => string;
}) {
  const birthYear = birthday.birth_date ? new Date(birthday.birth_date).getFullYear() : null;
  const appointmentYear = birthday.date ? new Date(birthday.date).getFullYear() : new Date().getFullYear();
  const age = birthYear ? appointmentYear - birthYear : null;
  const daysUntil = Math.ceil(
    (new Date(birthday.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
          birthday.isToday ? 'bg-amber-100' : 'bg-gray-100'
        }`}>
          {birthday.isToday ? '🎉' : '🎈'}
        </div>
        <div>
          <p className="font-medium text-gray-900">
            {birthday.customer_name}
            {age && (
              <span className={`ml-2 text-sm ${birthday.isToday ? 'text-amber-600' : 'text-gray-500'}`}>
                wird {age} Jahre alt
              </span>
            )}
          </p>
          <p className="text-sm text-gray-500">
            {birthday.isToday ? 'Heute' : formatDate(birthday.date)} um {birthday.time_slot} Uhr
          </p>
          <p className="text-xs text-gray-400">
            bei {birthday.barber_name}
          </p>
        </div>
      </div>

      {!birthday.isToday && (
        <div className="text-right">
          <span className={`inline-block px-3 py-1 rounded-full text-sm ${
            daysUntil <= 7
              ? 'bg-amber-100 text-amber-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            in {daysUntil} {daysUntil === 1 ? 'Tag' : 'Tagen'}
          </span>
        </div>
      )}
    </div>
  );
}
