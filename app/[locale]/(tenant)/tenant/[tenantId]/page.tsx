'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient, formatPrice } from '@/lib/supabase'

interface Shop {
  id: string
  name: string
  slug: string
  address: string | null
  active: boolean
  stats: {
    teamCount: number
    appointmentsToday: number
    appointmentsWeek: number
    revenue: number
  }
}

interface TenantStats {
  totalShops: number
  totalTeam: number
  appointmentsToday: number
  appointmentsWeek: number
  totalRevenue: number
}

export default function TenantDashboardPage() {
  const params = useParams()
  const tenantId = params.tenantId as string

  const [shops, setShops] = useState<Shop[]>([])
  const [stats, setStats] = useState<TenantStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Get locale from pathname
  const validLocales = ['de', 'en', 'tr']
  const firstSegment = window.location.pathname.split('/')[1]
  const locale = validLocales.includes(firstSegment) ? firstSegment : 'de'
  const linkPrefix = locale === 'de' ? '' : `/${locale}`

  useEffect(() => {
    loadData()
  }, [tenantId])

  async function loadData() {
    try {
      const supabase = createBrowserClient()

      // Load shops
      const { data: shopsData } = await supabase
        .from('shops')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name')

      const today = new Date().toISOString().split('T')[0]
      const weekStart = getWeekStart(new Date()).toISOString().split('T')[0]
      const weekEnd = new Date()
      weekEnd.setDate(weekEnd.getDate() + 6)
      const weekEndStr = weekEnd.toISOString().split('T')[0]

      // Get stats for each shop
      const enrichedShops = await Promise.all(
        (shopsData || []).map(async (shop) => {
          const [
            { count: teamCount },
            { count: appointmentsToday },
            { count: appointmentsWeek },
          ] = await Promise.all([
            supabase.from('team').select('*', { count: 'exact', head: true }).eq('shop_id', shop.id).eq('active', true),
            supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('shop_id', shop.id).eq('date', today).neq('status', 'cancelled'),
            supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('shop_id', shop.id).gte('date', weekStart).lte('date', weekEndStr).neq('status', 'cancelled'),
          ])

          return {
            ...shop,
            stats: {
              teamCount: teamCount || 0,
              appointmentsToday: appointmentsToday || 0,
              appointmentsWeek: appointmentsWeek || 0,
              revenue: 0, // TODO: Calculate from appointments
            },
          }
        })
      )

      setShops(enrichedShops)

      // Calculate total stats
      const totalStats: TenantStats = {
        totalShops: enrichedShops.length,
        totalTeam: enrichedShops.reduce((acc, s) => acc + s.stats.teamCount, 0),
        appointmentsToday: enrichedShops.reduce((acc, s) => acc + s.stats.appointmentsToday, 0),
        appointmentsWeek: enrichedShops.reduce((acc, s) => acc + s.stats.appointmentsWeek, 0),
        totalRevenue: enrichedShops.reduce((acc, s) => acc + s.stats.revenue, 0),
      }

      setStats(totalStats)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted">Lade Dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted mt-1">Übersicht aller Shops</p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-900 rounded-xl border border-border p-4">
            <div className="text-sm text-muted">Shops</div>
            <div className="text-2xl font-bold mt-1">{stats.totalShops}</div>
          </div>
          <div className="bg-zinc-900 rounded-xl border border-border p-4">
            <div className="text-sm text-muted">Team gesamt</div>
            <div className="text-2xl font-bold mt-1">{stats.totalTeam}</div>
          </div>
          <div className="bg-zinc-900 rounded-xl border border-border p-4">
            <div className="text-sm text-muted">Termine heute</div>
            <div className="text-2xl font-bold mt-1 text-primary">{stats.appointmentsToday}</div>
          </div>
          <div className="bg-zinc-900 rounded-xl border border-border p-4">
            <div className="text-sm text-muted">Termine diese Woche</div>
            <div className="text-2xl font-bold mt-1">{stats.appointmentsWeek}</div>
          </div>
        </div>
      )}

      {/* Shops Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Deine Shops</h2>
          <Link
            href={`${linkPrefix}/tenant/${tenantId}/shops`}
            className="text-sm text-primary hover:underline"
          >
            Alle anzeigen
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shops.map((shop) => (
            <div
              key={shop.id}
              className="bg-zinc-900 rounded-xl border border-border overflow-hidden hover:border-primary/50 transition-colors"
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{shop.name}</h3>
                    <p className="text-sm text-muted mt-1">{shop.address || shop.slug}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${shop.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400'}`}>
                    {shop.active ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </div>

                {/* Shop Stats */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <div className="text-lg font-semibold">{shop.stats.teamCount}</div>
                    <div className="text-xs text-muted">Barber</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-primary">{shop.stats.appointmentsToday}</div>
                    <div className="text-xs text-muted">Heute</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{shop.stats.appointmentsWeek}</div>
                    <div className="text-xs text-muted">Woche</div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="px-5 py-3 bg-zinc-800/50 border-t border-border flex items-center gap-2">
                <Link
                  href={`${linkPrefix}/shop/${shop.id}/calendar`}
                  className="flex-1 text-center py-2 text-sm bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
                >
                  Kalender
                </Link>
                <Link
                  href={`${linkPrefix}/shop/${shop.id}/team`}
                  className="flex-1 text-center py-2 text-sm bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
                >
                  Team
                </Link>
                <Link
                  href={`${linkPrefix}/shop/${shop.id}/settings`}
                  className="flex-1 text-center py-2 text-sm bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
                >
                  Settings
                </Link>
              </div>
            </div>
          ))}

          {/* Add Shop Card */}
          <Link
            href={`${linkPrefix}/tenant/${tenantId}/shops?new=true`}
            className="bg-zinc-900 rounded-xl border border-dashed border-border p-5 flex flex-col items-center justify-center min-h-[200px] hover:border-primary/50 hover:bg-zinc-800/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="font-medium">Neuen Shop hinzufügen</span>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-zinc-900 rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold mb-4">Letzte Aktivitäten</h2>
        <p className="text-muted text-sm">Aktivitäten werden hier angezeigt...</p>
        {/* TODO: Add recent appointments, new customers, etc. */}
      </div>
    </div>
  )
}
