'use client';

import { TeamMember } from '@/lib/supabase';

export interface SelectionFilter {
  barberId: string; // 'all' | barber-id
  timeFrom: string; // '' | '10:00'
  timeTo: string;   // '' | '14:00'
  dayIndex?: number; // Optional: Index des Wochentags (0-6 für Mo-So)
}

export interface WeekDay {
  dateStr: string;
  dayName: string;
  dayNum: number;
}

interface SelectionToolbarProps {
  team: TeamMember[];
  timeSlots: string[];
  selectedCount: number;
  filter: SelectionFilter;
  onFilterChange: (filter: SelectionFilter) => void;
  onClearSelection: () => void;
  onDelete: () => void;
  onCancel: () => void;
  // Optional: Für Wochenansicht
  weekDays?: WeekDay[];
  hideBarberFilter?: boolean;
}

export function SelectionToolbar({
  team,
  timeSlots,
  selectedCount,
  filter,
  onFilterChange,
  onClearSelection,
  onDelete,
  onCancel,
  weekDays,
  hideBarberFilter = false,
}: SelectionToolbarProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Filter-Bereich */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Barber Filter */}
          {!hideBarberFilter && (
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-600 font-medium">Barber:</label>
              <select
                value={filter.barberId}
                onChange={(e) => onFilterChange({ ...filter, barberId: e.target.value })}
                className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-black focus:border-gold focus:outline-none"
              >
                <option value="all">--</option>
                {team.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tag Filter (nur für Wochenansicht) */}
          {weekDays && weekDays.length > 0 && (
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-600 font-medium">Tag:</label>
              <select
                value={filter.dayIndex !== undefined ? filter.dayIndex : 'all'}
                onChange={(e) => onFilterChange({
                  ...filter,
                  dayIndex: e.target.value === 'all' ? undefined : parseInt(e.target.value)
                })}
                className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-black focus:border-gold focus:outline-none"
              >
                <option value="all">--</option>
                {weekDays.map((day, index) => (
                  <option key={day.dateStr} value={index}>
                    {day.dayName} {day.dayNum}.
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Zeit Von */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-600 font-medium">Von:</label>
            <select
              value={filter.timeFrom}
              onChange={(e) => onFilterChange({ ...filter, timeFrom: e.target.value })}
              className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-black focus:border-gold focus:outline-none"
            >
              <option value="">--</option>
              {timeSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>

          {/* Zeit Bis */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-600 font-medium">Bis:</label>
            <select
              value={filter.timeTo}
              onChange={(e) => onFilterChange({ ...filter, timeTo: e.target.value })}
              className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-black focus:border-gold focus:outline-none"
            >
              <option value="">--</option>
              {timeSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>

          {/* Auswahl aufheben */}
          {selectedCount > 0 && (
            <button
              onClick={onClearSelection}
              className="text-xs px-3 py-1.5 text-gray-500 hover:text-gray-700 transition-colors"
            >
              Auswahl aufheben
            </button>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Aktionen rechts */}
        <div className="flex items-center gap-2">
          {/* Löschen Button */}
          {selectedCount > 0 && (
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 text-xs px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {selectedCount} {selectedCount === 1 ? 'Termin' : 'Termine'} löschen
            </button>
          )}

          {/* Schließen Button */}
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors"
            title="Auswahl-Modus beenden"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
