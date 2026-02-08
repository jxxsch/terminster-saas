'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Dynamisch laden um SSR-Probleme zu vermeiden
const ShopsMap = dynamic(() => import('@/components/ShopsMap'), { ssr: false })

interface Tenant {
  id: string
  name: string
  slug: string
  custom_domain: string | null
  primary_color: string
  subscription_plan: string
  subscription_status: string
  created_at: string
  settings: Record<string, unknown>
}

interface Shop {
  id: string
  name: string
  slug: string
  address: string | null
  phone: string | null
  active: boolean
  latitude: number | null
  longitude: number | null
  teamCount: number
  appointmentCount: number
}

export default function TenantDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const params = use(paramsPromise)
  const router = useRouter()
  const routeParams = useParams()
  const locale = routeParams.locale as string
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [shops, setShops] = useState<Shop[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<Tenant>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadTenant()
  }, [params.id])

  async function loadTenant() {
    try {
      const supabase = createBrowserClient()

      // Load tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', params.id)
        .single()

      if (tenantError) throw tenantError
      setTenant(tenantData)
      setEditData(tenantData)

      // Load shops with counts
      const { data: shopsData } = await supabase
        .from('shops')
        .select('*')
        .eq('tenant_id', params.id)
        .order('created_at', { ascending: true })

      const enrichedShops = await Promise.all(
        (shopsData || []).map(async (shop) => {
          const [{ count: teamCount }, { count: appointmentCount }] = await Promise.all([
            supabase.from('team').select('*', { count: 'exact', head: true }).eq('shop_id', shop.id),
            supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('shop_id', shop.id),
          ])
          return { ...shop, teamCount: teamCount || 0, appointmentCount: appointmentCount || 0 }
        })
      )

      setShops(enrichedShops)
    } catch (error) {
      console.error('Failed to load tenant:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    if (!tenant) return
    setIsSaving(true)

    try {
      const supabase = createBrowserClient()

      const { error } = await supabase
        .from('tenants')
        .update({
          name: editData.name,
          slug: editData.slug,
          custom_domain: editData.custom_domain || null,
          primary_color: editData.primary_color,
          subscription_plan: editData.subscription_plan,
          subscription_status: editData.subscription_status,
        })
        .eq('id', tenant.id)

      if (error) throw error

      setTenant({ ...tenant, ...editData } as Tenant)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save tenant:', error)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!tenant) return
    if (!confirm(`Möchtest du "${tenant.name}" wirklich löschen? Alle Shops und Daten werden gelöscht!`)) {
      return
    }

    try {
      const supabase = createBrowserClient()
      const { error } = await supabase.from('tenants').delete().eq('id', tenant.id)
      if (error) throw error
      router.push(`/${locale}/superadmin/tenants`)
    } catch (error) {
      console.error('Failed to delete tenant:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted">Lade Kunde...</span>
        </div>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Kunde nicht gefunden</p>
        <Link href={`/${locale}/superadmin/tenants`} className="text-primary hover:underline mt-4 block">
          Zurück zur Übersicht
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/superadmin/tenants`}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
              style={{ backgroundColor: `${tenant.primary_color}33`, color: tenant.primary_color }}
            >
              {tenant.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{tenant.name}</h1>
              <p className="text-muted">{tenant.slug}.terminster.de</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setIsEditing(false)
                  setEditData(tenant)
                }}
                className="px-4 py-2 border border-border rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Speichern...' : 'Speichern'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 border border-border rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Bearbeiten
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                Löschen
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tenant Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 rounded-xl border border-border p-6 space-y-4">
            <h2 className="font-semibold text-lg">Kundeninformationen</h2>

            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-2">Name</label>
                  <input
                    type="text"
                    value={editData.name || ''}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-2">Slug</label>
                  <input
                    type="text"
                    value={editData.slug || ''}
                    onChange={(e) => setEditData({ ...editData, slug: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-2">Custom Domain</label>
                  <input
                    type="text"
                    value={editData.custom_domain || ''}
                    onChange={(e) => setEditData({ ...editData, custom_domain: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-2">Primärfarbe</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editData.primary_color || '#D4AF37'}
                      onChange={(e) => setEditData({ ...editData, primary_color: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editData.primary_color || ''}
                      onChange={(e) => setEditData({ ...editData, primary_color: e.target.value })}
                      className="flex-1 px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-muted mb-2">Plan</label>
                  <select
                    value={editData.subscription_plan || 'free'}
                    onChange={(e) => setEditData({ ...editData, subscription_plan: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted mb-2">Status</label>
                  <select
                    value={editData.subscription_status || 'active'}
                    onChange={(e) => setEditData({ ...editData, subscription_status: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
                  >
                    <option value="active">Active</option>
                    <option value="trialing">Trialing</option>
                    <option value="past_due">Past Due</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted">Name</span>
                  <p className="font-medium">{tenant.name}</p>
                </div>
                <div>
                  <span className="text-sm text-muted">Slug</span>
                  <p className="font-medium">{tenant.slug}</p>
                </div>
                <div>
                  <span className="text-sm text-muted">Domain</span>
                  <p className="font-medium">
                    {tenant.custom_domain || `${tenant.slug}.terminster.de`}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted">Primärfarbe</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: tenant.primary_color }}
                    />
                    <span className="font-medium">{tenant.primary_color}</span>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted">Plan</span>
                  <p>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPlanBadge(tenant.subscription_plan)}`}>
                      {tenant.subscription_plan}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted">Erstellt am</span>
                  <p className="font-medium">{formatDate(tenant.created_at)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Shops */}
          <div className="bg-zinc-900 rounded-xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold">Shops ({shops.length})</h2>
              <Link
                href={`/${locale}/superadmin/tenants/${tenant.id}/shops/new`}
                className="text-sm text-primary hover:underline"
              >
                + Neuer Shop
              </Link>
            </div>

            {shops.length === 0 ? (
              <div className="p-8 text-center text-muted">Keine Shops vorhanden</div>
            ) : (
              <div className="divide-y divide-border">
                {shops.map((shop) => (
                  <div
                    key={shop.id}
                    className="flex items-center justify-between px-6 py-4 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium">{shop.name}</div>
                        <div className="text-sm text-muted">{shop.address || shop.slug}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <div className="text-sm">{shop.teamCount} Barber</div>
                        <div className="text-xs text-muted">{shop.appointmentCount} Termine</div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          shop.active
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-zinc-700 text-zinc-400'
                        }`}
                      >
                        {shop.active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Map */}
          {shops.length > 0 && (
            <div className="bg-zinc-900 rounded-xl border border-border p-4">
              <h2 className="font-semibold mb-3">Standorte</h2>
              <ShopsMap shops={shops} primaryColor={tenant.primary_color} />
            </div>
          )}

          {/* Quick Stats */}
          <div className="bg-zinc-900 rounded-xl border border-border p-6 space-y-4">
            <h2 className="font-semibold">Statistiken</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted">Shops</span>
                <span className="font-medium">{shops.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Barber gesamt</span>
                <span className="font-medium">{shops.reduce((acc, s) => acc + s.teamCount, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Termine gesamt</span>
                <span className="font-medium">{shops.reduce((acc, s) => acc + s.appointmentCount, 0)}</span>
              </div>
            </div>
          </div>

          {/* Widget API Key */}
          <div className="bg-zinc-900 rounded-xl border border-border p-6 space-y-4">
            <h2 className="font-semibold">Widget Einbindung</h2>
            <p className="text-sm text-muted">
              Tenant-Slug für Widget:
            </p>
            <code className="block bg-zinc-800 px-3 py-2 rounded text-sm text-primary break-all">
              {tenant.slug}
            </code>
            <p className="text-xs text-muted">
              Nutze diesen Slug um das Booking-Widget auf externen Seiten einzubinden.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
