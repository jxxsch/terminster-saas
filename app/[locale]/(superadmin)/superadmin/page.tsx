'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Stats {
  totalTenants: number
  totalShops: number
  totalAppointments: number
  recentTenants: Array<{
    id: string
    name: string
    slug: string
    subscription_plan: string
    created_at: string
    shopCount: number
  }>
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string
  value: number | string
  icon: string
  color: 'emerald' | 'orange' | 'blue'
}) {
  const styles = {
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-100/50',
      iconBg: 'bg-emerald-500',
      text: 'text-emerald-600',
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-100/50',
      iconBg: 'bg-orange-500',
      text: 'text-orange-600',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-100/50',
      iconBg: 'bg-blue-500',
      text: 'text-blue-600',
    },
  }

  const s = styles[color]

  return (
    <div className={`${s.bg} p-6 rounded-2xl border ${s.border}`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 ${s.iconBg} rounded-xl flex items-center justify-center text-white`}>
          <span className="material-icons-round text-xl">{icon}</span>
        </div>
      </div>
      <p className={`${s.text} text-sm font-semibold mb-1`}>{title}</p>
      <div className="flex items-baseline gap-2">
        <h4 className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString('de-DE') : value}</h4>
      </div>
    </div>
  )
}

export default function SuperadminDashboard() {
  const params = useParams()
  const locale = params.locale as string
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const supabase = createBrowserClient()

      const [
        { count: tenantsCount },
        { count: shopsCount },
        { data: recentTenantsData },
      ] = await Promise.all([
        supabase.from('tenants').select('*', { count: 'exact', head: true }),
        supabase.from('shops').select('*', { count: 'exact', head: true }),
        supabase
          .from('tenants')
          .select('id, name, slug, subscription_plan, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      // Count appointments only from multi-tenant shops (with shop_id)
      let appointmentsCount = 0
      const { data: shopIds } = await supabase.from('shops').select('id')
      if (shopIds && shopIds.length > 0) {
        const ids = shopIds.map(s => s.id)
        const aptResult = await supabase.from('appointments').select('*', { count: 'exact', head: true }).in('shop_id', ids)
        appointmentsCount = aptResult.count || 0
      }

      // Get shop counts for recent tenants
      const recentTenants = await Promise.all(
        (recentTenantsData || []).map(async (tenant) => {
          const { count } = await supabase
            .from('shops')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id)

          return {
            ...tenant,
            shopCount: count || 0,
          }
        })
      )

      setStats({
        totalTenants: tenantsCount || 0,
        totalShops: shopsCount || 0,
        totalAppointments: appointmentsCount,
        recentTenants,
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500">Lade Statistiken...</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <header className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-1 flex items-center gap-2">
            Hello Admin <span className="text-3xl">&#128075;</span>
          </h1>
          <p className="text-slate-500">Überblick über die Plattform-Aktivitäten heute.</p>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <div className="relative">
            <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              className="bg-white border-none rounded-2xl pl-10 pr-4 py-2.5 w-64 shadow-sm focus:ring-2 focus:ring-slate-900/20 transition-all text-slate-900 placeholder:text-slate-400"
              placeholder="Suche..."
              type="text"
            />
          </div>
          <button className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shadow-sm text-slate-500 hover:text-slate-900 transition-colors relative">
            <span className="material-icons-round">notifications_none</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          {/* Chart Card */}
          <div className="flex justify-start">
            <div className="bg-slate-900 p-6 rounded-3xl shadow-xl border border-slate-800 w-full max-w-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">Plattform Wachstum</h3>
                  <div className="flex gap-4 mt-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Kunden</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Shops</span>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <select className="appearance-none bg-slate-800 border-none rounded-lg px-3 py-1.5 pr-8 text-[10px] font-bold text-slate-200 focus:ring-0">
                    <option>Wöchentlich</option>
                    <option>Monatlich</option>
                  </select>
                  <span className="material-icons-round absolute right-2 top-1/2 -translate-y-1/2 text-[14px] text-slate-400 pointer-events-none">expand_more</span>
                </div>
              </div>
              <div className="h-32 relative">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 150">
                  <path d="M0,110 L100,105 L200,120 L300,90 L400,100 L500,60 L600,70 L700,50 L800,65 L900,55 L1000,60" fill="none" stroke="#34d399" strokeWidth="3" />
                  <path d="M0,130 L100,125 L200,135 L300,120 L400,125 L500,100 L600,115 L700,90 L800,105 L900,95 L1000,100" fill="none" stroke="#fb923c" strokeDasharray="6,3" strokeWidth="3" />
                </svg>
                <div className="absolute inset-0 flex flex-col justify-between text-[9px] text-slate-500 font-medium pointer-events-none">
                  <span>3k</span><span>0</span>
                </div>
              </div>
              <div className="flex justify-between mt-3 px-1 text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                <span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span>
              </div>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Kunden"
              value={stats?.totalTenants || 0}
              icon="group"
              color="emerald"
            />
            <StatCard
              title="Shops"
              value={stats?.totalShops || 0}
              icon="store"
              color="orange"
            />
            <StatCard
              title="Termine"
              value={stats?.totalAppointments || 0}
              icon="event_available"
              color="blue"
            />
          </div>

          {/* Recent Tenants Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-xl font-bold">Neueste Kunden</h3>
              <Link
                href={`/${locale}/superadmin/tenants`}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-1 uppercase tracking-widest"
              >
                Alle anzeigen <span className="material-icons-round text-sm">arrow_forward</span>
              </Link>
            </div>
            <div className="px-8 pb-4">
              {stats?.recentTenants.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  Noch keine Kunden vorhanden
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                      <th className="py-6 font-bold text-left">Kunde</th>
                      <th className="py-6 font-bold text-center">Anzahl der Shops</th>
                      <th className="py-6 font-bold text-right">Datum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {stats?.recentTenants.map((tenant) => (
                      <tr key={tenant.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-5">
                          <Link href={`/${locale}/superadmin/tenants/${tenant.id}`} className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[10px] border border-slate-200">
                              {getInitials(tenant.name)}
                            </div>
                            <span className="font-bold text-sm">{tenant.name}</span>
                          </Link>
                        </td>
                        <td className="py-5 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                            {tenant.shopCount} Shop{tenant.shopCount !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="py-5 text-right text-sm text-slate-500 font-medium">
                          {formatDate(tenant.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          {/* Activity Log */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Aktivitäts-Log</h3>
              <span className="material-icons-round text-slate-300">history</span>
            </div>
            <div className="space-y-6">
              <div className="text-center py-6 text-slate-400 text-sm">
                Noch keine Aktivitäten
              </div>
            </div>
          </div>

          {/* Top Performance */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold mb-6">Top Performance</h3>
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-slate-100">
                  <span className="material-icons-round text-slate-900">emoji_events</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top Shop (Monat)</p>
                  <h4 className="text-lg font-bold text-slate-400">-</h4>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-medium">Bookings</span>
                  <span className="font-bold text-slate-900">0</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-slate-900 h-full rounded-full" style={{ width: '0%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold mb-6">Schnellzugriff</h3>
            <div className="space-y-3">
              <Link
                href={`/${locale}/superadmin/tenants/new`}
                className="w-full flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-slate-900 hover:text-white transition-all group"
              >
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-900 group-hover:bg-white/20 group-hover:text-white shadow-sm transition-colors">
                  <span className="material-icons-round text-xl">person_add_alt</span>
                </div>
                <p className="font-bold text-sm">Neuer Kunde</p>
              </Link>
              <Link
                href={`/${locale}/superadmin/shops`}
                className="w-full flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-slate-900 hover:text-white transition-all group"
              >
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-900 group-hover:bg-white/20 group-hover:text-white shadow-sm transition-colors">
                  <span className="material-icons-round text-xl">storefront</span>
                </div>
                <p className="font-bold text-sm">Shops verwalten</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
