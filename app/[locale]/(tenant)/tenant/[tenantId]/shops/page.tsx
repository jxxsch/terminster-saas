'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'

interface Shop {
  id: string
  name: string
  slug: string
  address: string | null
  phone: string | null
  email: string | null
  active: boolean
  created_at: string
  stats: {
    teamCount: number
    servicesCount: number
    appointmentsWeek: number
  }
}

export default function ShopsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const tenantId = params.tenantId as string
  const showNewModal = searchParams.get('new') === 'true'

  const [shops, setShops] = useState<Shop[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(showNewModal)
  const [editingShop, setEditingShop] = useState<Shop | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    address: '',
    phone: '',
    email: '',
  })

  // Get locale from pathname
  const validLocales = ['de', 'en', 'tr']
  const firstSegment = window.location.pathname.split('/')[1]
  const locale = validLocales.includes(firstSegment) ? firstSegment : 'de'
  const linkPrefix = locale === 'de' ? '' : `/${locale}`

  useEffect(() => {
    loadShops()
  }, [tenantId])

  async function loadShops() {
    try {
      const supabase = createBrowserClient()

      const { data: shopsData } = await supabase
        .from('shops')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name')

      const weekStart = getWeekStart(new Date()).toISOString().split('T')[0]
      const weekEnd = new Date()
      weekEnd.setDate(weekEnd.getDate() + 6)
      const weekEndStr = weekEnd.toISOString().split('T')[0]

      // Get stats for each shop
      const enrichedShops = await Promise.all(
        (shopsData || []).map(async (shop) => {
          const [
            { count: teamCount },
            { count: servicesCount },
            { count: appointmentsWeek },
          ] = await Promise.all([
            supabase.from('team').select('*', { count: 'exact', head: true }).eq('shop_id', shop.id).eq('active', true),
            supabase.from('services').select('*', { count: 'exact', head: true }).eq('shop_id', shop.id).eq('active', true),
            supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('shop_id', shop.id).gte('date', weekStart).lte('date', weekEndStr).neq('status', 'cancelled'),
          ])

          return {
            ...shop,
            stats: {
              teamCount: teamCount || 0,
              servicesCount: servicesCount || 0,
              appointmentsWeek: appointmentsWeek || 0,
            },
          }
        })
      )

      setShops(enrichedShops)
    } catch (error) {
      console.error('Failed to load shops:', error)
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

  async function handleSave() {
    try {
      const supabase = createBrowserClient()

      const shopData = {
        tenant_id: tenantId,
        name: formData.name,
        slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
        address: formData.address || null,
        phone: formData.phone || null,
        email: formData.email || null,
        active: true,
      }

      if (editingShop) {
        await supabase
          .from('shops')
          .update(shopData)
          .eq('id', editingShop.id)
      } else {
        await supabase
          .from('shops')
          .insert(shopData)
      }

      setShowModal(false)
      setEditingShop(null)
      setFormData({ name: '', slug: '', address: '', phone: '', email: '' })
      loadShops()
    } catch (error) {
      console.error('Failed to save shop:', error)
    }
  }

  function startEdit(shop: Shop) {
    setEditingShop(shop)
    setFormData({
      name: shop.name,
      slug: shop.slug,
      address: shop.address || '',
      phone: shop.phone || '',
      email: shop.email || '',
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingShop(null)
    setFormData({ name: '', slug: '', address: '', phone: '', email: '' })
    // Remove ?new=true from URL
    window.history.replaceState({}, '', window.location.pathname)
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Shops</h1>
          <p className="text-muted mt-1">{shops.length} Shops</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary-dark transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Neuer Shop
        </button>
      </div>

      {/* Shops List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {shops.map((shop) => (
          <div
            key={shop.id}
            className="bg-zinc-900 rounded-xl border border-border overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">{shop.name}</h3>
                  <p className="text-sm text-muted mt-1 truncate">{shop.address || shop.slug}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ml-3 ${shop.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400'}`}>
                  {shop.active ? 'Aktiv' : 'Inaktiv'}
                </span>
              </div>

              {/* Contact Info */}
              {(shop.phone || shop.email) && (
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted">
                  {shop.phone && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {shop.phone}
                    </span>
                  )}
                  {shop.email && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {shop.email}
                    </span>
                  )}
                </div>
              )}

              {/* Shop Stats */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
                <div className="text-center">
                  <div className="text-lg font-semibold">{shop.stats.teamCount}</div>
                  <div className="text-xs text-muted">Barber</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">{shop.stats.servicesCount}</div>
                  <div className="text-xs text-muted">Services</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-primary">{shop.stats.appointmentsWeek}</div>
                  <div className="text-xs text-muted">Termine/Woche</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 py-3 bg-zinc-800/50 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link
                  href={`${linkPrefix}/shop/${shop.id}/calendar`}
                  className="px-3 py-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
                >
                  Öffnen
                </Link>
                <button
                  onClick={() => startEdit(shop)}
                  className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors"
                  title="Bearbeiten"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
              <span className="text-xs text-muted">
                Erstellt: {new Date(shop.created_at).toLocaleDateString('de-DE')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {shops.length === 0 && (
        <div className="bg-zinc-900 rounded-xl border border-dashed border-border p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2">Noch keine Shops</h3>
          <p className="text-muted mb-4">Erstelle deinen ersten Shop, um loszulegen.</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary-dark transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ersten Shop erstellen
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-border w-full max-w-md">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold">
                {editingShop ? 'Shop bearbeiten' : 'Neuer Shop'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-muted mb-2">Shop-Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
                  placeholder="Mein Barbershop"
                />
              </div>

              <div>
                <label className="block text-sm text-muted mb-2">Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
                  placeholder="mein-barbershop"
                />
                <p className="text-xs text-muted mt-1">Wird automatisch generiert, wenn leer</p>
              </div>

              <div>
                <label className="block text-sm text-muted mb-2">Adresse</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
                  placeholder="Musterstraße 123, 12345 Stadt"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-2">Telefon</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
                    placeholder="+49 123 456789"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-2">E-Mail</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
                    placeholder="info@shop.de"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name}
                className="px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {editingShop ? 'Speichern' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
