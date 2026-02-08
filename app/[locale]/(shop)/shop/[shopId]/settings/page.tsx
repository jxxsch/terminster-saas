'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

interface Shop {
  id: string
  name: string
  slug: string
  address: string | null
  phone: string | null
  email: string | null
  active: boolean
}

export default function SettingsPage() {
  const params = useParams()
  const router = useRouter()
  const shopId = params.shopId as string

  const [shop, setShop] = useState<Shop | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    address: '',
    phone: '',
    email: '',
    active: true,
  })

  useEffect(() => {
    loadShop()
  }, [shopId])

  async function loadShop() {
    try {
      const supabase = createBrowserClient()
      const { data } = await supabase
        .from('shops')
        .select('*')
        .eq('id', shopId)
        .single()

      if (data) {
        setShop(data)
        setFormData({
          name: data.name,
          slug: data.slug,
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          active: data.active,
        })
      }
    } catch (error) {
      console.error('Failed to load shop:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      const supabase = createBrowserClient()

      await supabase
        .from('shops')
        .update({
          name: formData.name,
          slug: formData.slug,
          address: formData.address || null,
          phone: formData.phone || null,
          email: formData.email || null,
          active: formData.active,
        })
        .eq('id', shopId)

      loadShop()
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted">Lade Einstellungen...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Einstellungen</h1>
          <p className="text-muted mt-1">Shop-Einstellungen verwalten</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Speichern...' : 'Speichern'}
        </button>
      </div>

      {/* Shop Info */}
      <div className="bg-zinc-900 rounded-xl border border-border p-6 space-y-6">
        <h2 className="text-lg font-semibold">Allgemeine Informationen</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-muted mb-2">Shop-Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-2">Slug</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm text-muted mb-2">Adresse</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
              placeholder="Musterstraße 123, 12345 Stadt"
            />
          </div>
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
              placeholder="info@beispiel.de"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-5 h-5 rounded border-border bg-zinc-800 text-primary focus:ring-primary"
            />
            <div>
              <span className="font-medium">Shop aktiv</span>
              <p className="text-sm text-muted">Deaktivierte Shops sind nicht buchbar</p>
            </div>
          </label>
        </div>
      </div>

      {/* Widget Embed Code */}
      <div className="bg-zinc-900 rounded-xl border border-border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Widget Einbindung</h2>
        <p className="text-sm text-muted">
          Kopiere diesen Code, um das Buchungs-Widget auf deiner Website einzubinden:
        </p>

        <div className="bg-zinc-800 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-primary whitespace-pre-wrap break-all">
{`<div
  data-terminster-widget
  data-auto-init
  data-tenant="TENANT_SLUG"
  data-shop="${shop?.slug || 'SHOP_SLUG'}"
  data-theme="dark"
></div>
<script src="https://widget.terminster.de/booking-widget.umd.js"></script>`}
          </pre>
        </div>

        <button
          onClick={() => {
            navigator.clipboard.writeText(`<div data-terminster-widget data-auto-init data-tenant="TENANT_SLUG" data-shop="${shop?.slug}" data-theme="dark"></div>\n<script src="https://widget.terminster.de/booking-widget.umd.js"></script>`)
          }}
          className="text-sm text-primary hover:underline"
        >
          Code kopieren
        </button>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-red-400">Gefahrenzone</h2>
        <p className="text-sm text-muted">
          Vorsicht! Diese Aktionen können nicht rückgängig gemacht werden.
        </p>
        <button
          className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
          onClick={() => {
            if (confirm('Shop wirklich löschen? Alle Daten (Termine, Team, etc.) werden gelöscht!')) {
              // TODO: Implement delete
            }
          }}
        >
          Shop löschen
        </button>
      </div>
    </div>
  )
}
