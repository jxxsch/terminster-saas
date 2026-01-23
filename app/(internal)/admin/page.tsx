'use client';

import { useState, useEffect, useCallback } from 'react';
import { ExpandableWidget } from '@/components/admin/ExpandableWidget';
import { StatsModal } from '@/components/admin/StatsModal';
import { DailyStatsModal } from '@/components/admin/DailyStatsModal';
import { BirthdayModal } from '@/components/admin/BirthdayModal';
import { AppointmentsModal } from '@/components/admin/AppointmentsModal';
import {
  supabase,
  getBirthdayAppointments,
  getServicePopularity,
  getCustomerLoyaltyStats,
  getWeeklyStats,
  getDailyStats,
  type BirthdayAppointment,
  type ServicePopularity,
  type CustomerLoyaltyStats,
  type WeekStats,
  type DayStats,
} from '@/lib/supabase';

interface Stats {
  todayAppointments: number;
  weekAppointments: number;
}

interface RecentAppointment {
  id: string;
  customer_name: string;
  date: string;
  time_slot: string;
  barber_name: string;
  service_name: string;
  isFirstVisit: boolean;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    todayAppointments: 0,
    weekAppointments: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([]);
  const [birthdayAppointments, setBirthdayAppointments] = useState<Array<BirthdayAppointment & { barber_name: string }>>([]);
  const [servicePopularity, setServicePopularity] = useState<ServicePopularity[]>([]);
  const [loyaltyStats, setLoyaltyStats] = useState<CustomerLoyaltyStats | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeekStats[]>([]);
  const [dailyStats, setDailyStats] = useState<DayStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Expanded widget state - nur eines kann offen sein
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);

  // Modal states
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showDailyStatsModal, setShowDailyStatsModal] = useState(false);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [showAppointmentsModal, setShowAppointmentsModal] = useState(false);

  const toggleWidget = useCallback((widgetId: string) => {
    setExpandedWidget(prev => prev === widgetId ? null : widgetId);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadStats() {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // Week start (Monday) and end (Sunday)
      const dayOfWeek = today.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + mondayOffset);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      // Parallel queries
      const [
        todayResult,
        weekResult,
        recentResult,
        birthdayResult,
        popularityResult,
        loyaltyResult,
        weeklyResult,
        dailyResult,
      ] = await Promise.all([
        supabase
          .from('appointments')
          .select('id', { count: 'exact' })
          .eq('date', todayStr)
          .eq('status', 'confirmed'),
        supabase
          .from('appointments')
          .select('id', { count: 'exact' })
          .gte('date', weekStartStr)
          .lte('date', weekEndStr)
          .eq('status', 'confirmed'),
        supabase
          .from('appointments')
          .select('id, customer_name, customer_id, customer_phone, date, time_slot, barber_id, service_id')
          .eq('status', 'confirmed')
          .order('created_at', { ascending: false })
          .limit(10),
        getBirthdayAppointments(),
        getServicePopularity(30),
        getCustomerLoyaltyStats(30),
        getWeeklyStats(4),
        getDailyStats(7),
      ]);

      if (!mounted) return;

      // Get barber and service names
      const [barbersData, servicesData] = await Promise.all([
        supabase.from('team').select('id, name'),
        supabase.from('services').select('id, name'),
      ]);

      if (!mounted) return;

      const barberNames: Record<string, string> = {};
      const serviceNames: Record<string, string> = {};

      barbersData.data?.forEach(b => { barberNames[b.id] = b.name; });
      servicesData.data?.forEach(s => { serviceNames[s.id] = s.name; });

      // Map recent appointments (ohne einzelne first-visit Abfragen für Performance)
      const recentWithFirstVisit = (recentResult.data || []).map((apt) => ({
        id: apt.id,
        customer_name: apt.customer_name,
        date: apt.date,
        time_slot: apt.time_slot,
        barber_name: barberNames[apt.barber_id] || apt.barber_id,
        service_name: serviceNames[apt.service_id] || apt.service_id,
        isFirstVisit: false, // Neukunden-Info kommt aus loyaltyStats
      }));

      // Enrich birthday appointments with barber names
      const enrichedBirthdays = birthdayResult.map(apt => ({
        ...apt,
        barber_name: barberNames[apt.barber_id] || apt.barber_id,
      }));

      setStats({
        todayAppointments: todayResult.count || 0,
        weekAppointments: weekResult.count || 0,
      });

      setRecentAppointments(recentWithFirstVisit);
      setBirthdayAppointments(enrichedBirthdays);
      setServicePopularity(popularityResult);
      setLoyaltyStats(loyaltyResult);
      setWeeklyStats(weeklyResult);
      setDailyStats(dailyResult);
      setIsLoading(false);
    }

    loadStats();

    return () => { mounted = false; };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate preview values
  const todayBirthdays = birthdayAppointments.filter(b => b.isToday).length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Floating Panel - alles in einem Container */}
      <div className="flex-1 bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-200/50 overflow-hidden flex flex-col min-h-0">
        {/* Header */}
        <div className="px-8 py-5 flex items-center gap-4 flex-shrink-0">
          <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Dashboard</h3>
            <p className="text-xs text-slate-400">Übersicht und Statistiken</p>
          </div>
        </div>

        {/* Gradient Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent flex-shrink-0" />

        {/* Content Area - scrollbar hier */}
        <div className="flex-1 overflow-y-auto p-6">

        {/* 3 separate Spalten - jede Spalte ist unabhängig */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Spalte 1 */}
          <div className="flex flex-col gap-4">
            {/* Heute */}
            <ExpandableWidget
              title="Heute"
              value={stats.todayAppointments}
              subtitle="Termine"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
              color="gold"
              isExpanded={expandedWidget === 'today'}
              onToggle={() => toggleWidget('today')}
            >
              <DailyStatsContent stats={dailyStats} onShowAll={() => setShowDailyStatsModal(true)} />
            </ExpandableWidget>

            {/* Termine */}
            <ExpandableWidget
              title="Termine"
              value={recentAppointments.length}
              subtitle="zuletzt gebucht"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="default"
              isExpanded={expandedWidget === 'appointments'}
              onToggle={() => toggleWidget('appointments')}
            >
              <AppointmentsContent appointments={recentAppointments} onShowAll={() => setShowAppointmentsModal(true)} />
            </ExpandableWidget>
          </div>

          {/* Spalte 2 */}
          <div className="flex flex-col gap-4">
            {/* Woche */}
            <ExpandableWidget
              title="Woche"
              value={stats.weekAppointments}
              subtitle="Termine"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
              color="blue"
              isExpanded={expandedWidget === 'week'}
              onToggle={() => toggleWidget('week')}
            >
              <WeeklyStatsContent stats={weeklyStats} onShowAll={() => setShowStatsModal(true)} />
            </ExpandableWidget>

            {/* Top Service */}
            <ExpandableWidget
              title="Top Service"
              value={servicePopularity[0]?.bookingCount || 0}
              subtitle={servicePopularity[0]?.serviceName || '-'}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
              color="gold"
              isExpanded={expandedWidget === 'services'}
              onToggle={() => toggleWidget('services')}
            >
              <ServicesContent services={servicePopularity} />
            </ExpandableWidget>
          </div>

          {/* Spalte 3 */}
          <div className="flex flex-col gap-4">
            {/* Geburtstage */}
            <ExpandableWidget
              title="Geburtstage"
              value={todayBirthdays > 0 ? todayBirthdays : birthdayAppointments.length}
              subtitle={todayBirthdays > 0 ? 'heute' : 'bald'}
              icon={<span className="text-lg">🎂</span>}
              color="amber"
              isExpanded={expandedWidget === 'birthdays'}
              onToggle={() => toggleWidget('birthdays')}
            >
              <BirthdayContent birthdays={birthdayAppointments} onShowAll={() => setShowBirthdayModal(true)} />
            </ExpandableWidget>

            {/* Treue */}
            <ExpandableWidget
              title="Treue"
              value={loyaltyStats ? `${loyaltyStats.loyaltyRate}%` : '0%'}
            subtitle="Stammkunden"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
            color="green"
            isExpanded={expandedWidget === 'loyalty'}
            onToggle={() => toggleWidget('loyalty')}
          >
            <LoyaltyContent stats={loyaltyStats} />
            </ExpandableWidget>
          </div>
        </div>
        </div>
      </div>

      {/* Modals */}
      <StatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
      />
      <BirthdayModal
        isOpen={showBirthdayModal}
        onClose={() => setShowBirthdayModal(false)}
        birthdays={birthdayAppointments}
      />
      <AppointmentsModal
        isOpen={showAppointmentsModal}
        onClose={() => setShowAppointmentsModal(false)}
        appointments={recentAppointments}
      />
      <DailyStatsModal
        isOpen={showDailyStatsModal}
        onClose={() => setShowDailyStatsModal(false)}
      />
    </div>
  );
}

// === Widget Content Components ===

function DailyStatsContent({ stats, onShowAll }: { stats: DayStats[]; onShowAll?: () => void }) {
  if (stats.length === 0) {
    return <div className="p-4 text-center text-slate-500 text-sm">Keine Daten</div>;
  }

  // Umkehren: ältester Tag oben, heute unten
  const sortedStats = [...stats.slice(0, 7)].reverse();
  const maxCount = Math.max(...stats.map(d => d.appointmentCount), 1);
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="p-4 space-y-2">
      {sortedStats.map((day) => {
        const isToday = day.date === todayStr;
        return (
          <div key={day.date} className="flex items-center justify-between text-sm">
            <span className={`w-8 ${isToday ? 'text-gold font-medium' : 'text-slate-600'}`}>
              {day.dayName}
            </span>
            <div className="flex items-center gap-2 flex-1 ml-2">
              <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${isToday ? 'bg-gold' : 'bg-slate-400'}`}
                  style={{ width: `${(day.appointmentCount / maxCount) * 100}%` }}
                />
              </div>
              <span className={`font-medium w-6 text-right ${isToday ? 'text-gold' : 'text-slate-900'}`}>
                {day.appointmentCount}
              </span>
            </div>
          </div>
        );
      })}
      {onShowAll && (
        <button
          onClick={onShowAll}
          className="w-full text-xs text-gold hover:text-gold/80 hover:underline pt-2 text-left"
        >
          Letzte 30 Tage anzeigen →
        </button>
      )}
    </div>
  );
}

function WeeklyStatsContent({ stats, onShowAll }: { stats: WeekStats[]; onShowAll?: () => void }) {
  if (stats.length === 0) {
    return <div className="p-4 text-center text-slate-500 text-sm">Keine Daten</div>;
  }

  return (
    <div className="p-4 space-y-2">
      {stats.slice(0, 4).map((week) => (
        <div key={`${week.year}-${week.weekNumber}`} className="flex items-center justify-between text-sm">
          <span className="text-slate-600">KW {week.weekNumber}</span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${Math.min((week.appointmentCount / 50) * 100, 100)}%` }}
              />
            </div>
            <span className="text-slate-900 font-medium w-8 text-right">{week.appointmentCount}</span>
          </div>
        </div>
      ))}
      {onShowAll && (
        <button
          onClick={onShowAll}
          className="w-full text-xs text-blue-600 hover:text-blue-500 hover:underline pt-2 text-left"
        >
          Letzte 12 Wochen anzeigen →
        </button>
      )}
    </div>
  );
}

function BirthdayContent({ birthdays, onShowAll }: { birthdays: Array<BirthdayAppointment & { barber_name: string }>; onShowAll?: () => void }) {
  if (birthdays.length === 0) {
    return <div className="p-4 text-center text-slate-500 text-sm">Keine Geburtstage</div>;
  }

  return (
    <div className="p-4 space-y-2">
      <div className="max-h-40 overflow-y-auto space-y-2">
        {birthdays.slice(0, 5).map((b, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {b.isToday && <span className="text-amber-500">🎉</span>}
              <span className="text-slate-900">{b.customer_name}</span>
            </div>
            <span className="text-slate-500 text-xs">
              {b.isToday ? 'Heute!' : formatDate(b.date)} · {b.time_slot}
            </span>
          </div>
        ))}
      </div>
      {onShowAll && birthdays.length > 5 && (
        <button
          onClick={onShowAll}
          className="w-full text-xs text-gold hover:text-gold/80 hover:underline pt-2 text-left"
        >
          Alle {birthdays.length} anzeigen →
        </button>
      )}
    </div>
  );
}

function AppointmentsContent({ appointments, onShowAll }: { appointments: RecentAppointment[]; onShowAll?: () => void }) {
  if (appointments.length === 0) {
    return <div className="p-4 text-center text-slate-500 text-sm">Keine Termine</div>;
  }

  return (
    <div className="p-4 space-y-2">
      <div className="max-h-40 overflow-y-auto space-y-2">
        {appointments.slice(0, 5).map((apt) => (
          <div key={apt.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-900">{apt.customer_name}</span>
              {apt.isFirstVisit && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Neu</span>
              )}
            </div>
            <span className="text-slate-500 text-xs">{apt.barber_name} · {apt.time_slot}</span>
          </div>
        ))}
      </div>
      {onShowAll && appointments.length > 5 && (
        <button
          onClick={onShowAll}
          className="w-full text-xs text-gold hover:text-gold/80 hover:underline pt-2 text-left"
        >
          Alle {appointments.length} anzeigen →
        </button>
      )}
    </div>
  );
}

function ServicesContent({ services }: { services: ServicePopularity[] }) {
  if (services.length === 0) {
    return <div className="p-4 text-center text-slate-500 text-sm">Keine Daten</div>;
  }

  const maxCount = Math.max(...services.map(s => s.bookingCount), 1);

  return (
    <div className="p-4 space-y-2">
      {services.slice(0, 4).map((service, idx) => (
        <div key={service.serviceId} className="flex items-center gap-3 text-sm">
          <span className="w-5 h-5 flex items-center justify-center bg-gold/10 rounded-full text-xs font-medium text-gold">
            {idx + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-900 truncate">{service.serviceName}</span>
              <span className="text-slate-500 ml-2">{service.bookingCount}</span>
            </div>
            <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold transition-all"
                style={{ width: `${(service.bookingCount / maxCount) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LoyaltyContent({ stats }: { stats: CustomerLoyaltyStats | null }) {
  if (!stats) {
    return <div className="p-4 text-center text-slate-500 text-sm">Keine Daten</div>;
  }

  const newCustomerRate = 100 - stats.loyaltyRate;

  return (
    <div className="p-4 space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1 text-sm">
          <span className="text-emerald-700">Stammkunden</span>
          <span className="font-medium">{stats.loyaltyRate}%</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500" style={{ width: `${stats.loyaltyRate}%` }} />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1 text-sm">
          <span className="text-blue-700">Neukunden</span>
          <span className="font-medium">{newCustomerRate}%</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500" style={{ width: `${newCustomerRate}%` }} />
        </div>
      </div>
      <p className="text-xs text-slate-500 text-center pt-2 border-t border-slate-100">
        {stats.returningCustomers} von {stats.totalAppointments} Terminen (30 Tage)
      </p>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}
