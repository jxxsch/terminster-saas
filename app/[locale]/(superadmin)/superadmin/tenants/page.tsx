'use client'

import { useState, useEffect } from 'react'
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
  teamCount: number
  serviceCount: number
  appointmentCount: number
}

interface Tenant {
  id: string
  name: string
  slug: string
  custom_domain: string | null
  primary_color: string
  subscription_plan: string
  subscription_status: string
  created_at: string
  shops: Shop[]
}

export default function TenantsPage() {
  const params = useParams()
  const locale = params.locale as string
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPlan, setFilterPlan] = useState<string>('all')
  const [expandedTenants, setExpandedTenants] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadTenants()
  }, [])

  async function loadTenants() {
    try {
      const supabase = createBrowserClient()

      // Load tenants with shops
      const { data: tenantsData } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false })

      // Load shops for each tenant with counts
      const enrichedTenants = await Promise.all(
        (tenantsData || []).map(async (tenant) => {
          const { data: shopsData } = await supabase
            .from('shops')
            .select('*')
            .eq('tenant_id', tenant.id)
            .order('name')

          // Get counts for each shop
          const enrichedShops = await Promise.all(
            (shopsData || []).map(async (shop) => {
              const [
                { count: teamCount },
                { count: serviceCount },
                { count: appointmentCount }
              ] = await Promise.all([
                supabase.from('team').select('*', { count: 'exact', head: true }).eq('shop_id', shop.id),
                supabase.from('services').select('*', { count: 'exact', head: true }).eq('shop_id', shop.id),
                supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('shop_id', shop.id),
              ])
              return {
                ...shop,
                teamCount: teamCount || 0,
                serviceCount: serviceCount || 0,
                appointmentCount: appointmentCount || 0,
              }
            })
          )

          return {
            ...tenant,
            shops: enrichedShops,
          }
        })
      )

      setTenants(enrichedTenants)
    } catch (error) {
      console.error('Failed to load tenants:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function toggleExpand(tenantId: string) {
    setExpandedTenants(prev => {
      const next = new Set(prev)
      if (next.has(tenantId)) {
        next.delete(tenantId)
      } else {
        next.add(tenantId)
      }
      return next
    })
  }

  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.shops.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesPlan = filterPlan === 'all' || tenant.subscription_plan === filterPlan
    return matchesSearch && matchesPlan
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const getPlanBadge = (plan: string) => {
    const colors: Record<string, string> = {
      free: 'bg-zinc-700 text-zinc-300',
      starter: 'bg-blue-500/20 text-blue-400',
      pro: 'bg-primary/20 text-primary',
      enterprise: 'bg-purple-500/20 text-purple-400',
    }
    return colors[plan] || colors.free
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-emerald-500/20 text-emerald-400',
      past_due: 'bg-amber-500/20 text-amber-400',
      canceled: 'bg-red-500/20 text-red-400',
      trialing: 'bg-blue-500/20 text-blue-400',
    }
    return colors[status] || colors.active
  }

  // Build link prefix - no prefix for default locale (de)
  const validLocales = ['de', 'en', 'tr']
  const linkPrefix = validLocales.includes(locale) && locale !== 'de' ? `/${locale}` : ''

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted">Lade Kunden...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Kunden</h1>
          <p className="text-muted mt-1">
            {tenants.length} Kunden, {tenants.reduce((acc, t) => acc + t.shops.length, 0)} Shops insgesamt
          </p>
        </div>
        <Link
          href={`${linkPrefix}/superadmin/tenants/new`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary-dark transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Neuer Kunde
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
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
            placeholder="Suche nach Name oder Slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-border rounded-lg focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          className="px-4 py-2 bg-zinc-900 border border-border rounded-lg focus:outline-none focus:border-primary"
        >
          <option value="all">Alle Pläne</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      {/* Tenants List */}
      <div className="space-y-4">
        {filteredTenants.length === 0 ? (
          <div className="bg-zinc-900 rounded-xl border border-border p-8 text-center text-muted">
            {searchQuery || filterPlan !== 'all'
              ? 'Keine Kunden gefunden'
              : 'Noch keine Kunden vorhanden'}
          </div>
        ) : (
          filteredTenants.map((tenant) => (
            <div
              key={tenant.id}
              className="bg-zinc-900 rounded-xl border border-border overflow-hidden"
            >
              {/* Tenant Header */}
              <div
                className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                onClick={() => toggleExpand(tenant.id)}
              >
                <div className="flex items-center gap-4">
                  {/* Expand Arrow */}
                  <svg
                    className={`w-5 h-5 text-muted transition-transform ${expandedTenants.has(tenant.id) ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>

                  {/* Tenant Avatar */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                    style={{ backgroundColor: `${tenant.primary_color}33`, color: tenant.primary_color }}
                  >
                    {tenant.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Tenant Info */}
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-lg">{tenant.name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPlanBadge(tenant.subscription_plan)}`}>
                        {tenant.subscription_plan}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(tenant.subscription_status)}`}>
                        {tenant.subscription_status}
                      </span>
                    </div>
                    <div className="text-sm text-muted mt-0.5">
                      {tenant.custom_domain || `${tenant.slug}.terminster.de`}
                      <span className="mx-2">•</span>
                      {tenant.shops.length} {tenant.shops.length === 1 ? 'Shop' : 'Shops'}
                      <span className="mx-2">•</span>
                      Seit {formatDate(tenant.created_at)}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`${linkPrefix}/superadmin/tenants/${tenant.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                    title="Bearbeiten"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Link>
                </div>
              </div>

              {/* Expanded Shops */}
              {expandedTenants.has(tenant.id) && (
                <div className="border-t border-border">
                  {tenant.shops.length === 0 ? (
                    <div className="px-6 py-8 text-center text-muted">
                      <p>Keine Shops vorhanden</p>
                      <Link
                        href={`${linkPrefix}/superadmin/tenants/${tenant.id}/shops/new`}
                        className="text-primary hover:underline mt-2 inline-block"
                      >
                        + Shop hinzufügen
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {tenant.shops.map((shop) => (
                        <div
                          key={shop.id}
                          className="px-6 py-4 pl-16 hover:bg-zinc-800/30 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {/* Shop Icon */}
                              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                              </div>

                              {/* Shop Info */}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{shop.name}</span>
                                  <span className={`px-2 py-0.5 rounded text-xs ${shop.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400'}`}>
                                    {shop.active ? 'Aktiv' : 'Inaktiv'}
                                  </span>
                                </div>
                                <div className="text-sm text-muted">
                                  {shop.address || shop.slug}
                                </div>
                              </div>
                            </div>

                            {/* Shop Stats & Actions */}
                            <div className="flex items-center gap-6">
                              {/* Stats */}
                              <div className="hidden md:flex items-center gap-6 text-sm">
                                <div className="text-center">
                                  <div className="font-medium">{shop.teamCount}</div>
                                  <div className="text-xs text-muted">Barber</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium">{shop.serviceCount}</div>
                                  <div className="text-xs text-muted">Services</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium">{shop.appointmentCount}</div>
                                  <div className="text-xs text-muted">Termine</div>
                                </div>
                              </div>

                              {/* Quick Actions */}
                              <div className="flex items-center gap-1">
                                <Link
                                  href={`${linkPrefix}/shop/${shop.id}/calendar`}
                                  className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                                  title="Kalender"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </Link>
                                <Link
                                  href={`${linkPrefix}/shop/${shop.id}/team`}
                                  className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                                  title="Team"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                  </svg>
                                </Link>
                                <Link
                                  href={`${linkPrefix}/shop/${shop.id}/services`}
                                  className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                                  title="Services"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                </Link>
                                <Link
                                  href={`${linkPrefix}/shop/${shop.id}/settings`}
                                  className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                                  title="Einstellungen"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Add Shop Button */}
                      <div className="px-6 py-3 pl-16">
                        <Link
                          href={`${linkPrefix}/superadmin/tenants/${tenant.id}/shops/new`}
                          className="text-sm text-primary hover:underline"
                        >
                          + Weiteren Shop hinzufügen
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
