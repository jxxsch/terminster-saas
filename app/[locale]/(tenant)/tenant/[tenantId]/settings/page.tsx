'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

interface Tenant {
  id: string
  name: string
  slug: string
  custom_domain: string | null
  logo_url: string | null
  primary_color: string
  settings: Record<string, unknown>
}

export default function TenantSettingsPage() {
  const params = useParams()
  const tenantId = params.tenantId as string

  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    custom_domain: '',
    primary_color: '#D4AF37',
  })

  useEffect(() => {
    loadTenant()
  }, [tenantId])

  async function loadTenant() {
    try {
      const supabase = createBrowserClient()
      const { data } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single()

      if (data) {
        setTenant(data)
        setFormData({
          name: data.name,
          slug: data.slug,
          custom_domain: data.custom_domain || '',
          primary_color: data.primary_color || '#D4AF37',
        })
      }
    } catch (error) {
      console.error('Failed to load tenant:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      const supabase = createBrowserClient()

      await supabase
        .from('tenants')
        .update({
          name: formData.name,
          slug: formData.slug,
          custom_domain: formData.custom_domain || null,
          primary_color: formData.primary_color,
        })
        .eq('id', tenantId)

      loadTenant()
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
          <p className="text-muted mt-1">Tenant-Einstellungen verwalten</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Speichern...' : 'Speichern'}
        </button>
      </div>

      {/* General Settings */}
      <div className="bg-zinc-900 rounded-xl border border-border p-6 space-y-6">
        <h2 className="text-lg font-semibold">Allgemein</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-muted mb-2">Firmenname *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-2">Slug</label>
            <div className="flex">
              <span className="px-3 py-2 bg-zinc-700 border border-r-0 border-border rounded-l-lg text-muted text-sm">
                terminster.de/
              </span>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="flex-1 px-4 py-2 bg-zinc-800 border border-border rounded-r-lg focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="bg-zinc-900 rounded-xl border border-border p-6 space-y-6">
        <h2 className="text-lg font-semibold">Branding</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-muted mb-2">Primärfarbe</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="w-12 h-12 rounded-lg cursor-pointer border border-border"
              />
              <input
                type="text"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="flex-1 px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary font-mono"
                placeholder="#D4AF37"
              />
            </div>
            <p className="text-xs text-muted mt-2">Diese Farbe wird im Widget und Dashboard verwendet</p>
          </div>

          <div>
            <label className="block text-sm text-muted mb-2">Logo (URL)</label>
            <input
              type="url"
              value={tenant?.logo_url || ''}
              disabled
              className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg opacity-50"
              placeholder="Logo-Upload kommt bald..."
            />
            <p className="text-xs text-muted mt-2">Logo-Upload wird in einer zukünftigen Version verfügbar sein</p>
          </div>
        </div>

        {/* Preview */}
        <div className="pt-4 border-t border-border">
          <label className="block text-sm text-muted mb-3">Vorschau</label>
          <div className="flex items-center gap-4 p-4 bg-zinc-800 rounded-lg">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
              style={{ backgroundColor: `${formData.primary_color}33`, color: formData.primary_color }}
            >
              {formData.name.charAt(0)}
            </div>
            <div>
              <div className="font-semibold" style={{ color: formData.primary_color }}>
                {formData.name}
              </div>
              <div className="text-sm text-muted">terminster.de/{formData.slug}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Domain */}
      <div className="bg-zinc-900 rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Custom Domain</h2>
          <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs">Premium</span>
        </div>

        <div>
          <label className="block text-sm text-muted mb-2">Eigene Domain</label>
          <input
            type="text"
            value={formData.custom_domain}
            onChange={(e) => setFormData({ ...formData, custom_domain: e.target.value })}
            className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
            placeholder="www.dein-barbershop.de"
          />
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <p className="text-sm text-blue-400">
            <strong>DNS-Einrichtung:</strong> Erstelle einen CNAME-Eintrag von deiner Domain auf{' '}
            <code className="bg-zinc-800 px-1 rounded">{formData.slug}.terminster.de</code>
          </p>
        </div>
      </div>

      {/* Widget Info */}
      <div className="bg-zinc-900 rounded-xl border border-border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Widget Einbindung</h2>
        <p className="text-sm text-muted">
          Das Booking-Widget kann auf beliebigen Websites eingebunden werden. Die Konfiguration erfolgt pro Shop in den jeweiligen Shop-Einstellungen.
        </p>

        <div className="bg-zinc-800 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-primary whitespace-pre-wrap break-all">
{`<div
  data-terminster-widget
  data-auto-init
  data-tenant="${formData.slug}"
  data-shop="SHOP_SLUG"
  data-theme="dark"
></div>
<script src="https://widget.terminster.de/booking-widget.umd.js"></script>`}
          </pre>
        </div>

        <button
          onClick={() => {
            navigator.clipboard.writeText(`<div data-terminster-widget data-auto-init data-tenant="${formData.slug}" data-shop="SHOP_SLUG" data-theme="dark"></div>\n<script src="https://widget.terminster.de/booking-widget.umd.js"></script>`)
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
            if (confirm('Account wirklich löschen? Alle Shops, Termine und Daten werden unwiderruflich gelöscht!')) {
              // TODO: Implement delete
            }
          }}
        >
          Account löschen
        </button>
      </div>
    </div>
  )
}
