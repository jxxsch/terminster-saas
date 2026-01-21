'use client';

import { useState, useEffect, useCallback } from 'react';
import { getDailyStats, type DayStats } from '@/lib/supabase';

interface DailyStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DaysRange = 7 | 14 | 30;

export function DailyStatsModal({ isOpen, onClose }: DailyStatsModalProps) {
  const [daysRange, setDaysRange] = useState<DaysRange>(30);
  const [stats, setStats] = useState<DayStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    const dailyStats = await getDailyStats(daysRange);
    setStats(dailyStats);
    setIsLoading(false);
  }, [daysRange]);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen, loadStats]);

  if (!isOpen) return null;

  // Calculate average
  const totalAppointments = stats.reduce((sum, day) => sum + day.appointmentCount, 0);
  const avgAppointments = stats.length > 0 ? (totalAppointments / stats.length).toFixed(1) : '0';

  // Find max for bar scaling
  const maxCount = Math.max(...stats.map(d => d.appointmentCount), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-medium text-black">Tages-Statistik</h2>
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
              value={daysRange}
              onChange={(e) => setDaysRange(Number(e.target.value) as DaysRange)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-gold/50"
            >
              <option value={7}>Letzte 7 Tage</option>
              <option value={14}>Letzte 14 Tage</option>
              <option value={30}>Letzte 30 Tage</option>
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
            <div className="space-y-1.5">
              {stats.map((day) => {
                const percentage = (day.appointmentCount / maxCount) * 100;
                const isToday = day.date === new Date().toISOString().split('T')[0];
                const isWeekend = day.dayName === 'Sa' || day.dayName === 'So';

                return (
                  <div
                    key={day.date}
                    className={`grid grid-cols-[50px_100px_1fr_50px] gap-3 items-center p-2.5 rounded-lg ${
                      isToday ? 'bg-gold/10' : 'bg-gray-50'
                    }`}
                  >
                    {/* Day name */}
                    <span className={`text-sm font-medium ${
                      isToday ? 'text-gold' : isWeekend ? 'text-gray-400' : 'text-black'
                    }`}>
                      {day.dayName}
                    </span>

                    {/* Date */}
                    <span className="text-sm text-gray-500">
                      {formatDate(day.date)}
                    </span>

                    {/* Progress bar */}
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isToday ? 'bg-gold' : 'bg-gray-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    {/* Count */}
                    <span className={`text-sm font-medium text-right ${
                      isToday ? 'text-gold' : 'text-gray-700'
                    }`}>
                      {day.appointmentCount}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with average */}
        {!isLoading && stats.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Durchschnitt: <span className="font-medium text-black">{avgAppointments} Termine/Tag</span>
              </span>
              <span className="text-sm text-gray-600">
                Gesamt: <span className="font-medium text-black">{totalAppointments} Termine</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}
