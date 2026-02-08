'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Shop {
  id: string
  name: string
  slug: string
  address: string | null
  phone: string | null
  active: boolean
  tenant_id: string
  teamCount: number
  appointmentCount: number
}

interface TenantWithShops {
  id: string
  name: string
  slug: string
  primary_color: string
  shops: Shop[]
  totalTeam: number
  totalAppointments: number
}

const Icons = {
  Building: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  MapPin: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Phone: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  Users: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  ChevronUp: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ),
}

export default function AllShopsPage() {
  const params = useParams()
  const locale = params.locale as string
  const [tenantsWithShops, setTenantsWithShops] = useState<TenantWithShops[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedTenants, setExpandedTenants] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const supabase = createBrowserClient()

      // Load all tenants with their shops
      const { data: tenantsData } = await supabase
        .from('tenants')
        .select('id, name, slug, primary_color')
        .order('name') as { data: { id: string; name: string; slug: string; primary_color: string }[] | null; error: unknown }

      const { data: shopsData } = await supabase
        .from('shops')
        .select('*')
        .order('name') as { data: Shop[] | null; error: unknown }

      // Enrich shops with counts
      const enrichedShops = await Promise.all(
        (shopsData || []).map(async (shop) => {
          const [{ count: teamCount }, { count: appointmentCount }] = await Promise.all([
            supabase.from('team').select('*', { count: 'exact', head: true }).eq('shop_id', shop.id),
            supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('shop_id', shop.id),
          ])

          return {
            ...shop,
            teamCount: teamCount || 0,
            appointmentCount: appointmentCount || 0,
          }
        })
      )

      // Group shops by tenant
      const grouped: TenantWithShops[] = (tenantsData || []).map((tenant) => {
        const tenantShops = enrichedShops.filter((s) => s.tenant_id === tenant.id)
        return {
          ...tenant,
          shops: tenantShops,
          totalTeam: tenantShops.reduce((sum, s) => sum + s.teamCount, 0),
          totalAppointments: tenantShops.reduce((sum, s) => sum + s.appointmentCount, 0),
        }
      }).filter((t) => t.shops.length > 0) // Only show tenants with shops

      setTenantsWithShops(grouped)

      // Auto-expand tenants with multiple shops
      const multiShopTenants = grouped.filter((t) => t.shops.length > 1).map((t) => t.id)
      setExpandedTenants(new Set(multiShopTenants))
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function toggleTenant(tenantId: string) {
    setExpandedTenants((prev) => {
      const next = new Set(prev)
      if (next.has(tenantId)) {
        next.delete(tenantId)
      } else {
        next.add(tenantId)
      }
      return next
    })
  }

  const filteredTenants = useMemo(() => {
    if (!searchQuery) return tenantsWithShops

    const query = searchQuery.toLowerCase()
    return tenantsWithShops
      .map((tenant) => ({
        ...tenant,
        shops: tenant.shops.filter(
          (shop) =>
            shop.name.toLowerCase().includes(query) ||
            shop.address?.toLowerCase().includes(query) ||
            shop.phone?.toLowerCase().includes(query)
        ),
      }))
      .filter(
        (tenant) =>
          tenant.name.toLowerCase().includes(query) || tenant.shops.length > 0
      )
  }, [tenantsWithShops, searchQuery])

  const totalShops = tenantsWithShops.reduce((sum, t) => sum + t.shops.length, 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted">Lade Shops...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Alle Shops</h1>
        <p className="text-muted mt-1">
          {tenantsWithShops.length} Kunden · {totalShops} Standorte
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Suche nach Kunde, Shop oder Adresse..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-border rounded-lg focus:outline-none focus:border-primary"
        />
      </div>

      {/* Tenants with Shops */}
      {filteredTenants.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl border border-border p-8 text-center text-muted">
          {searchQuery ? 'Keine Ergebnisse gefunden' : 'Noch keine Shops vorhanden'}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTenants.map((tenant) => {
            const isExpanded = expandedTenants.has(tenant.id)
            const hasMultipleShops = tenant.shops.length > 1

            return (
              <div
                key={tenant.id}
                className="bg-zinc-900 rounded-xl border border-border overflow-hidden"
              >
                {/* Tenant Header */}
                <div
                  className={`p-4 flex items-center justify-between ${hasMultipleShops ? 'cursor-pointer hover:bg-zinc-800/50' : ''}`}
                  onClick={() => hasMultipleShops && toggleTenant(tenant.id)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold"
                      style={{
                        backgroundColor: `${tenant.primary_color}33`,
                        color: tenant.primary_color,
                      }}
                    >
                      {tenant.name.charAt(0)}
                    </div>
                    <div>
                      <Link
                        href={`/${locale}/superadmin/tenants/${tenant.id}`}
                        className="font-semibold text-lg hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {tenant.name}
                      </Link>
                      <div className="flex items-center gap-4 text-sm text-muted mt-1">
                        <span className="flex items-center gap-1">
                          <Icons.Building />
                          {tenant.shops.length} {tenant.shops.length === 1 ? 'Standort' : 'Standorte'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icons.Users />
                          {tenant.totalTeam} Barber
                        </span>
                        <span className="flex items-center gap-1">
                          <Icons.Calendar />
                          {tenant.totalAppointments} Termine
                        </span>
                      </div>
                    </div>
                  </div>

                  {hasMultipleShops && (
                    <button className="p-2 hover:bg-zinc-700 rounded-lg transition-colors">
                      {isExpanded ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                    </button>
                  )}
                </div>

                {/* Shops List */}
                {(isExpanded || !hasMultipleShops) && (
                  <div className="border-t border-border">
                    {tenant.shops.map((shop, index) => (
                      <div
                        key={shop.id}
                        className={`p-4 pl-20 flex items-center justify-between hover:bg-zinc-800/30 ${
                          index !== tenant.shops.length - 1 ? 'border-b border-border/50' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <h4 className="font-medium">{shop.name}</h4>
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                shop.active
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-zinc-700 text-zinc-400'
                              }`}
                            >
                              {shop.active ? 'Aktiv' : 'Inaktiv'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted mt-1">
                            {shop.address && (
                              <span className="flex items-center gap-1">
                                <Icons.MapPin />
                                {shop.address}
                              </span>
                            )}
                            {shop.phone && (
                              <span className="flex items-center gap-1">
                                <Icons.Phone />
                                {shop.phone}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-6 text-sm">
                          <span className="text-muted">
                            <span className="text-foreground font-medium">{shop.teamCount}</span> Barber
                          </span>
                          <span className="text-muted">
                            <span className="text-foreground font-medium">{shop.appointmentCount}</span> Termine
                          </span>
                          <Link
                            href={`/${locale}/shop/${shop.id}/calendar`}
                            className="px-3 py-1.5 text-sm rounded-lg transition-colors"
                            style={{
                              backgroundColor: `${tenant.primary_color}20`,
                              color: tenant.primary_color,
                            }}
                          >
                            Öffnen
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
