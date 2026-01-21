'use client';

import { useState, useEffect, useCallback } from 'react';
import { getWeeklyStats, getMaxSlotsPerWeek, type WeekStats } from '@/lib/supabase';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type WeeksRange = 4 | 8 | 12;

export function StatsModal({ isOpen, onClose }: StatsModalProps) {
  const [weeksRange, setWeeksRange] = useState<WeeksRange>(12);
  const [stats, setStats] = useState<WeekStats[]>([]);
  const [maxSlots, setMaxSlots] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    const [weeklyStats, max] = await Promise.all([
      getWeeklyStats(weeksRange),
      getMaxSlotsPerWeek(),
    ]);
    setStats(weeklyStats);
    setMaxSlots(max);
    setIsLoading(false);
  }, [weeksRange]);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadStats();
    }
  }, [isOpen, loadStats]);

  if (!isOpen) return null;

  // Calculate average
  const totalAppointments = stats.reduce((sum, week) => sum + week.appointmentCount, 0);
  const avgAppointments = stats.length > 0 ? Math.round(totalAppointments / stats.length) : 0;
  const avgUtilization = maxSlots > 0 && stats.length > 0
    ? Math.round((avgAppointments / maxSlots) * 100)
    : 0;

  // Get utilization color
  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 70) return 'bg-green-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal - volle Breite auf Mobile, max-w-4xl auf Desktop */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-medium text-black">Wochen-Vergleich</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Time Range Selector */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Zeitraum:</span>
            <select
              value={weeksRange}
              onChange={(e) => setWeeksRange(Number(e.target.value) as WeeksRange)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-gold/50"
            >
              <option value={4}>Letzte 4 Wochen</option>
              <option value={8}>Letzte 8 Wochen</option>
              <option value={12}>Letzte 12 Wochen</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : stats.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Keine Daten vorhanden
            </div>
          ) : (
            <div className="space-y-2">
              {stats.map((week) => {
                const utilization = maxSlots > 0 ? Math.round((week.appointmentCount / maxSlots) * 100) : 0;

                return (
                  <div
                    key={`${week.year}-${week.weekNumber}`}
                    className="grid grid-cols-[80px_140px_100px_1fr_40px] gap-3 items-center p-3 bg-gray-50 rounded-lg"
                  >
                    {/* Week info */}
                    <span className="text-sm font-medium text-black">KW {week.weekNumber}</span>

                    {/* Date range */}
                    <span className="text-sm text-gray-500">
                      {formatDateRange(week.startDate, week.endDate)}
                    </span>

                    {/* Appointment count */}
                    <span className="text-sm text-gray-700">{week.appointmentCount} Termine</span>

                    {/* Progress bar */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getUtilizationColor(utilization)} transition-all duration-500`}
                          style={{ width: `${Math.min(utilization, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-12 text-right">{utilization}%</span>
                    </div>

                    {/* Indicator */}
                    <div className={`text-center ${
                      utilization >= 70 ? 'text-green-600' :
                      utilization >= 40 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {utilization >= 70 ? (
                        <svg className="w-5 h-5 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : utilization >= 40 ? (
                        <svg className="w-5 h-5 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with average */}
        {!isLoading && stats.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <span className="text-sm text-gray-600">
                Durchschnitt: <span className="font-medium text-black">{avgAppointments} Termine</span> ({avgUtilization}%)
              </span>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> &gt;70%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> 40-70%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> &lt;40%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const format = (d: Date) =>
    d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

  return `${format(startDate)} - ${format(endDate)}`;
}
