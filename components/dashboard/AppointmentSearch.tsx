'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useSearchAppointments, useTeam, useCalendarServices } from '@/hooks/swr/use-dashboard-data';
import type { Appointment, TeamMember, Service } from '@/lib/supabase';

const DAY_NAMES_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

interface SearchResult {
  appointment: Appointment;
  barberName: string;
  serviceName: string;
}

interface AppointmentSearchProps {
  onNavigate: (date: string, appointmentIds: string[]) => void;
  onHighlightChange: (ids: Set<string>) => void;
  onClose?: () => void;
  isMobile?: boolean;
}

export function AppointmentSearch({
  onNavigate,
  onHighlightChange,
  onClose,
  isMobile = false,
}: AppointmentSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: searchAppointments = [] } = useSearchAppointments(query);
  const { data: team = [] } = useTeam();
  const { data: services = [] } = useCalendarServices();

  // Maps für schnelle Lookups
  const teamMap = useMemo(() => {
    const map: Record<string, TeamMember> = {};
    team.forEach(t => { map[t.id] = t; });
    return map;
  }, [team]);

  const servicesMap = useMemo(() => {
    const map: Record<string, Service> = {};
    services.forEach(s => { map[s.id] = s; });
    return map;
  }, [services]);

  // Filtern der Ergebnisse nach Query (Name oder Telefonnummer)
  const results: SearchResult[] = useMemo(() => {
    if (query.length < 2) return [];

    const lowerQuery = query.toLowerCase();

    return searchAppointments
      .filter(apt => {
        if (apt.status === 'cancelled' || apt.is_pause) return false;
        const nameMatch = apt.customer_name?.toLowerCase().includes(lowerQuery);
        const phoneMatch = apt.customer_phone?.includes(query);
        return nameMatch || phoneMatch;
      })
      .sort((a, b) => {
        // Sortierung: nächster Termin zuerst
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time_slot.localeCompare(b.time_slot);
      })
      .slice(0, 10) // Max 10 Ergebnisse
      .map(apt => ({
        appointment: apt,
        barberName: teamMap[apt.barber_id]?.name || 'Unbekannt',
        serviceName: apt.service_id ? (servicesMap[apt.service_id]?.name || 'Service') : '',
      }));
  }, [searchAppointments, query, teamMap, servicesMap]);

  // Alle Treffer-IDs (für Highlighting)
  const allMatchIds = useMemo(() => {
    if (query.length < 2) return new Set<string>();
    const lowerQuery = query.toLowerCase();
    return new Set(
      searchAppointments
        .filter(apt => {
          if (apt.status === 'cancelled' || apt.is_pause) return false;
          const nameMatch = apt.customer_name?.toLowerCase().includes(lowerQuery);
          const phoneMatch = apt.customer_phone?.includes(query);
          return nameMatch || phoneMatch;
        })
        .map(apt => apt.id)
    );
  }, [searchAppointments, query]);

  // Highlighting aktualisieren wenn sich Treffer ändern
  useEffect(() => {
    onHighlightChange(allMatchIds);
  }, [allMatchIds, onHighlightChange]);

  // Dropdown öffnen wenn Ergebnisse da sind
  useEffect(() => {
    setIsOpen(results.length > 0 && query.length >= 2);
    setSelectedIndex(-1);
  }, [results.length, query]);

  // Klick außerhalb schließt Dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClear = useCallback(() => {
    setQuery('');
    setIsOpen(false);
    onHighlightChange(new Set());
    if (onClose) onClose();
  }, [onHighlightChange, onClose]);

  // Keyboard-Navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClear();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const result = results[selectedIndex];
      if (result) {
        // Alle Treffer für den gleichen Tag sammeln
        const dayIds = results
          .filter(r => r.appointment.date === result.appointment.date)
          .map(r => r.appointment.id);
        onNavigate(result.appointment.date, dayIds);
        setIsOpen(false);
      }
    }
  }, [handleClear, results, selectedIndex, onNavigate]);

  const handleResultClick = useCallback((result: SearchResult) => {
    const dayIds = results
      .filter(r => r.appointment.date === result.appointment.date)
      .map(r => r.appointment.id);
    onNavigate(result.appointment.date, dayIds);
    setIsOpen(false);
  }, [results, onNavigate]);

  // Datum formatieren: "Di, 18.02."
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const dayName = DAY_NAMES_SHORT[date.getDay()];
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${dayName}, ${day}.${month}.`;
  };

  // Auto-Fokus beim Mount (Desktop + Mobile)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className={`relative w-full`}>
      {/* Suchfeld */}
      <div className="relative">
        {/* Lupe */}
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder="Kunde suchen..."
          style={{ outline: 'none' }}
          className="w-full pl-8 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:ring-0"
        />
        {/* X-Button zum Leeren */}
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 transition-colors"
          >
            <svg className="w-2.5 h-2.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown mit Ergebnissen */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50"
        >
          <div className="max-h-[300px] overflow-y-auto">
            {results.map((result, index) => (
              <button
                key={result.appointment.id}
                onClick={() => handleResultClick(result)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full px-3 py-2.5 text-left transition-colors border-b border-slate-100 last:border-b-0 ${
                  index === selectedIndex ? 'bg-gold/10' : 'hover:bg-slate-50'
                }`}
              >
                <div>
                  <span className="text-xs font-medium text-slate-900 truncate block">
                    {result.appointment.customer_name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-slate-500">
                    {formatDate(result.appointment.date)}
                  </span>
                  <span className="text-[11px] text-slate-300">·</span>
                  <span className="text-[11px] text-slate-500">
                    {result.appointment.time_slot}
                  </span>
                  <span className="text-[11px] text-slate-300">·</span>
                  <span className="text-[11px] text-slate-500">
                    {result.barberName}
                  </span>
                </div>
              </button>
            ))}
          </div>
          {/* Footer */}
          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100">
            <span className="text-[10px] text-slate-400">
              {allMatchIds.size} {allMatchIds.size === 1 ? 'Termin' : 'Termine'} gefunden
            </span>
          </div>
        </div>
      )}

      {/* Keine Ergebnisse */}
      {isOpen && results.length === 0 && query.length >= 2 && searchAppointments.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50"
        >
          <div className="px-3 py-4 text-center">
            <span className="text-xs text-slate-400">Keine Termine gefunden</span>
          </div>
        </div>
      )}
    </div>
  );
}
