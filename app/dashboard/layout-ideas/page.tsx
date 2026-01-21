'use client';

import { useState } from 'react';
import Image from 'next/image';

// Mock-Daten für 8 Barber
const MOCK_BARBERS = [
  { id: '1', name: 'Sahir', image: null, initial: 'S', color: 'bg-amber-400' },
  { id: '2', name: 'Sakvan', image: null, initial: 'Sa', color: 'bg-blue-400' },
  { id: '3', name: 'Khalid', image: null, initial: 'K', color: 'bg-green-400' },
  { id: '4', name: 'Mansur', image: null, initial: 'M', color: 'bg-purple-400' },
  { id: '5', name: 'Ahmed', image: null, initial: 'A', color: 'bg-red-400' },
  { id: '6', name: 'Yusuf', image: null, initial: 'Y', color: 'bg-cyan-400' },
  { id: '7', name: 'Omar', image: null, initial: 'O', color: 'bg-pink-400' },
  { id: '8', name: 'Hassan', image: null, initial: 'H', color: 'bg-orange-400' },
];

const DAYS = ['Mo 20', 'Di 21', 'Mi 22', 'Do 23', 'Fr 24', 'Sa 25'];
const TIME_SLOTS = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '14:00', '14:30', '15:00'];

// Mock-Termine
const MOCK_APPOINTMENTS: Record<string, string> = {
  '1-Mo 20-10:00': 'Max M.',
  '2-Mo 20-10:30': 'Tim K.',
  '3-Mo 20-11:00': 'Peter',
  '1-Di 21-10:00': 'Jana',
  '4-Di 21-14:00': 'Lars',
  '5-Mi 22-10:00': 'Mia',
  '6-Mi 22-11:00': 'Leo',
  '7-Do 23-10:30': 'Sarah',
  '8-Do 23-15:00': 'Ali',
  '2-Fr 24-10:00': 'Hans',
  '3-Fr 24-14:00': 'Emma',
  '1-Sa 25-10:00': 'Felix',
};

export default function LayoutIdeasPage() {
  const [activeIdea, setActiveIdea] = useState(1);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Wochenansicht Layout-Ideen (8 Barber)</h1>

        {/* Idea Selector */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[1, 2, 3, 4, 5].map(i => (
            <button
              key={i}
              onClick={() => setActiveIdea(i)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeIdea === i
                  ? 'bg-gold text-black'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Idee {i}
            </button>
          ))}
        </div>

        {/* Active Layout */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          {activeIdea === 1 && <Idea1 />}
          {activeIdea === 2 && <Idea2 />}
          {activeIdea === 3 && <Idea3 />}
          {activeIdea === 4 && <Idea4 />}
          {activeIdea === 5 && <Idea5 />}
        </div>
      </div>
    </div>
  );
}

// ============================================
// IDEE 1: Horizontale Tabs für Barber
// ============================================
function Idea1() {
  const [selectedBarber, setSelectedBarber] = useState(MOCK_BARBERS[0]);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Idee 1: Barber-Tabs</h2>
      <p className="text-sm text-gray-500 mb-4">
        Ein Barber pro Ansicht, schneller Wechsel über Tabs. Übersichtlich auch bei vielen Barbern.
      </p>

      {/* Barber Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
        {MOCK_BARBERS.map(barber => (
          <button
            key={barber.id}
            onClick={() => setSelectedBarber(barber)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
              selectedBarber.id === barber.id
                ? 'bg-gold text-black'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className={`w-8 h-8 rounded-full ${barber.color} flex items-center justify-center text-white text-xs font-bold`}>
              {barber.initial}
            </div>
            <span className="text-sm font-medium">{barber.name}</span>
          </button>
        ))}
      </div>

      {/* Wochen-Grid für ausgewählten Barber */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-gray-50">
              <th className="w-16 p-2 text-xs text-gray-500 border">Zeit</th>
              {DAYS.map(day => (
                <th key={day} className="p-2 text-sm font-medium border">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map(slot => (
              <tr key={slot}>
                <td className="p-2 text-xs text-gray-500 border text-center">{slot}</td>
                {DAYS.map(day => {
                  const key = `${selectedBarber.id}-${day}-${slot}`;
                  const appointment = MOCK_APPOINTMENTS[key];
                  return (
                    <td key={day} className="p-1 border h-10">
                      {appointment ? (
                        <div className="bg-gold/30 rounded px-2 py-1 text-xs font-medium truncate">
                          {appointment}
                        </div>
                      ) : (
                        <div className="h-full w-full hover:bg-gold/10 cursor-pointer rounded" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// IDEE 2: Vertikale Barber-Liste links
// ============================================
function Idea2() {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Idee 2: Barber-Spalte links (Swim-Lanes)</h2>
      <p className="text-sm text-gray-500 mb-4">
        Jeder Barber hat eine eigene Zeile. Tage als Spalten. Kompakt und übersichtlich.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-50">
              <th className="w-24 p-2 text-xs text-gray-500 border">Barber</th>
              {DAYS.map(day => (
                <th key={day} className="p-2 text-sm font-medium border">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_BARBERS.map(barber => (
              <tr key={barber.id} className="border-b">
                <td className="p-2 border">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full ${barber.color} flex items-center justify-center text-white text-xs font-bold`}>
                      {barber.initial}
                    </div>
                    <span className="text-sm font-medium">{barber.name}</span>
                  </div>
                </td>
                {DAYS.map(day => {
                  // Zeige einen Termin pro Tag
                  const appointment = Object.entries(MOCK_APPOINTMENTS).find(
                    ([k]) => k.startsWith(`${barber.id}-${day}`)
                  );
                  return (
                    <td key={day} className="p-1 border">
                      {appointment ? (
                        <div className="bg-gold/30 rounded px-2 py-1 text-xs font-medium">
                          {appointment[1]}
                          <span className="text-gray-400 ml-1">
                            {appointment[0].split('-')[2]}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-300 text-center">-</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// IDEE 3: Kalender-Karten pro Tag
// ============================================
function Idea3() {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Idee 3: Tages-Karten</h2>
      <p className="text-sm text-gray-500 mb-4">
        Jeder Tag als separate Karte. Barber-Avatare mit Termin-Badges. Gut für mobile Ansicht.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {DAYS.map(day => (
          <div key={day} className="bg-gray-50 rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-3 text-center border-b pb-2">{day}</h3>
            <div className="space-y-2">
              {MOCK_BARBERS.map(barber => {
                const appointment = Object.entries(MOCK_APPOINTMENTS).find(
                  ([k]) => k.startsWith(`${barber.id}-${day}`)
                );
                const hasAppointment = !!appointment;
                return (
                  <div
                    key={barber.id}
                    className={`flex items-center gap-2 p-1.5 rounded ${
                      hasAppointment ? 'bg-gold/20' : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full ${barber.color} flex items-center justify-center text-white text-[10px] font-bold relative`}>
                      {barber.initial}
                      {hasAppointment && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-gray-500">{barber.name}</div>
                      {hasAppointment && (
                        <div className="text-xs font-medium truncate">{appointment[1]}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// IDEE 4: Kompakte Punkt-Matrix
// ============================================
function Idea4() {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Idee 4: Kompakte Matrix mit Tooltips</h2>
      <p className="text-sm text-gray-500 mb-4">
        Minimalistisch: Farbige Punkte zeigen Verfügbarkeit. Details per Hover. Skaliert gut.
      </p>

      {/* Barber-Legende oben */}
      <div className="flex flex-wrap gap-3 mb-4 pb-3 border-b">
        {MOCK_BARBERS.map(barber => (
          <div key={barber.id} className="flex items-center gap-1.5">
            <div className={`w-4 h-4 rounded-full ${barber.color}`} />
            <span className="text-xs text-gray-600">{barber.name}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-gray-50">
              <th className="w-16 p-2 text-xs text-gray-500 border">Zeit</th>
              {DAYS.map(day => (
                <th key={day} className="p-2 text-sm font-medium border">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map(slot => (
              <tr key={slot}>
                <td className="p-2 text-xs text-gray-500 border text-center">{slot}</td>
                {DAYS.map(day => (
                  <td key={day} className="p-1 border">
                    <div className="flex justify-center gap-0.5">
                      {MOCK_BARBERS.map(barber => {
                        const key = `${barber.id}-${day}-${slot}`;
                        const appointment = MOCK_APPOINTMENTS[key];
                        return (
                          <div
                            key={barber.id}
                            className={`w-3 h-3 rounded-full cursor-pointer transition-transform hover:scale-150 ${
                              appointment ? barber.color : 'bg-gray-200'
                            }`}
                            title={appointment ? `${barber.name}: ${appointment}` : `${barber.name}: Frei`}
                          />
                        );
                      })}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// IDEE 5: Gestapelte Zeitleiste
// ============================================
function Idea5() {
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Idee 5: Tages-Zeitleiste</h2>
      <p className="text-sm text-gray-500 mb-4">
        Ein Tag im Fokus mit allen Barbern nebeneinander. Schneller Tageswechsel. Sehr übersichtlich.
      </p>

      {/* Day Selector */}
      <div className="flex gap-1 mb-4">
        {DAYS.map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedDay === day
                ? 'bg-gold text-black'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Barber-Spalten */}
      <div className="overflow-x-auto">
        <div className="flex min-w-[800px]">
          {/* Zeit-Spalte */}
          <div className="w-16 flex-shrink-0">
            <div className="h-16 flex items-end justify-center pb-2 text-xs text-gray-400">Zeit</div>
            {TIME_SLOTS.map(slot => (
              <div key={slot} className="h-12 flex items-center justify-center text-xs text-gray-500">
                {slot}
              </div>
            ))}
          </div>

          {/* Barber-Spalten */}
          {MOCK_BARBERS.map(barber => (
            <div key={barber.id} className="flex-1 min-w-[90px] border-l">
              {/* Barber Header */}
              <div className="h-16 flex flex-col items-center justify-center p-2 bg-gray-50">
                <div className={`w-10 h-10 rounded-full ${barber.color} flex items-center justify-center text-white text-sm font-bold mb-1`}>
                  {barber.initial}
                </div>
                <span className="text-xs font-medium">{barber.name}</span>
              </div>
              {/* Zeit-Slots */}
              {TIME_SLOTS.map(slot => {
                const key = `${barber.id}-${selectedDay}-${slot}`;
                const appointment = MOCK_APPOINTMENTS[key];
                return (
                  <div
                    key={slot}
                    className={`h-12 border-t flex items-center justify-center p-1 ${
                      appointment ? 'bg-gold/20' : 'hover:bg-gold/10 cursor-pointer'
                    }`}
                  >
                    {appointment && (
                      <span className="text-xs font-medium truncate px-1">{appointment}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
