'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

interface Tenant {
  id: string
  name: string
  slug: string
  primary_color: string
}

interface Shop {
  id: string
  name: string
  slug: string
}

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

export default function EmbedCodesPage() {
  const params = useParams()
  const tenantId = params.tenantId as string

  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [shops, setShops] = useState<Shop[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Options
  const [selectedShop, setSelectedShop] = useState<string>('')
  const [selectedLang, setSelectedLang] = useState<'de' | 'en' | 'tr'>('de')
  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'light'>('dark')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [tenantId])

  async function loadData() {
    try {
      const supabase = createBrowserClient()

      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single()

      if (tenantData) {
        setTenant(tenantData)
      }

      const { data: shopsData } = await supabase
        .from('shops')
        .select('id, name, slug')
        .eq('tenant_id', tenantId)
        .order('name')

      if (shopsData && shopsData.length > 0) {
        setShops(shopsData)
        setSelectedShop(shopsData[0].slug)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function copyToClipboard(code: string, type: string) {
    navigator.clipboard.writeText(code)
    setCopiedCode(type)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted">Lade...</span>
        </div>
      </div>
    )
  }

  const tenantSlug = tenant?.slug || 'dein-tenant'
  const shopSlug = selectedShop || 'dein-shop'

  // JavaScript SDK Code
  const jsCode = `<!-- Terminster Booking Widget -->
<div
  data-terminster-widget
  data-auto-init
  data-tenant="${tenantSlug}"
  data-shop="${shopSlug}"
  data-lang="${selectedLang}"
  data-theme="${selectedTheme}"
></div>
<script src="https://widget.terminster.de/booking-widget.umd.js"></script>`

  // iFrame Code
  const iframeCode = `<!-- Terminster Booking Widget (iFrame) -->
<iframe
  src="https://widget.terminster.de/embed?tenant=${tenantSlug}&shop=${shopSlug}&lang=${selectedLang}&theme=${selectedTheme}"
  width="100%"
  height="700"
  frameborder="0"
  style="border: none; border-radius: 12px;"
  allow="payment"
></iframe>`

  const primaryColor = tenant?.primary_color || '#D4AF37'

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Widget Einbindung</h1>
        <p className="text-muted mt-1">
          Binde das Buchungswidget auf deiner Website ein. Wähle zwischen JavaScript SDK oder iFrame.
        </p>
      </div>

      {/* Configuration */}
      <div className="bg-zinc-900 rounded-xl border border-border p-6 space-y-6">
        <h2 className="text-lg font-semibold">Konfiguration</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Shop Selection */}
          <div>
            <label className="block text-sm text-muted mb-2">Shop</label>
            <select
              value={selectedShop}
              onChange={(e) => setSelectedShop(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
            >
              {shops.map((shop) => (
                <option key={shop.id} value={shop.slug}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>

          {/* Language Selection */}
          <div>
            <label className="block text-sm text-muted mb-2">Sprache</label>
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value as 'de' | 'en' | 'tr')}
              className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="de">Deutsch</option>
              <option value="en">English</option>
              <option value="tr">Türkçe</option>
            </select>
          </div>

          {/* Theme Selection */}
          <div>
            <label className="block text-sm text-muted mb-2">Design</label>
            <select
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value as 'dark' | 'light')}
              className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="dark">Dark Mode</option>
              <option value="light">Light Mode</option>
            </select>
          </div>
        </div>
      </div>

      {/* JavaScript SDK */}
      <div className="bg-zinc-900 rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }}></span>
              JavaScript SDK
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">Empfohlen</span>
            </h2>
            <p className="text-sm text-muted mt-1">
              Volle Kontrolle, native Integration, automatische Höhenanpassung
            </p>
          </div>
        </div>

        <div className="relative">
          <pre className="bg-zinc-800 rounded-lg p-4 overflow-x-auto text-sm">
            <code className="text-green-400">{jsCode}</code>
          </pre>
          <button
            onClick={() => copyToClipboard(jsCode, 'js')}
            className="absolute top-3 right-3 p-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
            title="Code kopieren"
          >
            {copiedCode === 'js' ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>

        <div className="text-xs text-muted space-y-1">
          <p><strong>Vorteile:</strong></p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Passt sich automatisch an die Höhe des Inhalts an</li>
            <li>Volle CSS-Anpassung möglich</li>
            <li>Bessere Performance</li>
            <li>SEO-freundlich</li>
          </ul>
        </div>
      </div>

      {/* iFrame */}
      <div className="bg-zinc-900 rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              iFrame Einbindung
            </h2>
            <p className="text-sm text-muted mt-1">
              Einfache Integration, vollständig isoliert
            </p>
          </div>
        </div>

        <div className="relative">
          <pre className="bg-zinc-800 rounded-lg p-4 overflow-x-auto text-sm">
            <code className="text-blue-400">{iframeCode}</code>
          </pre>
          <button
            onClick={() => copyToClipboard(iframeCode, 'iframe')}
            className="absolute top-3 right-3 p-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
            title="Code kopieren"
          >
            {copiedCode === 'iframe' ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>

        <div className="text-xs text-muted space-y-1">
          <p><strong>Vorteile:</strong></p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Vollständig isoliert vom Rest der Seite</li>
            <li>Keine JavaScript-Konflikte</li>
            <li>Einfachste Integration</li>
          </ul>
        </div>
      </div>

      {/* Help */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 space-y-3">
        <h3 className="font-semibold text-blue-400">Hilfe bei der Einbindung?</h3>
        <p className="text-sm text-muted">
          Füge den Code an der Stelle deiner Website ein, wo das Buchungswidget erscheinen soll.
          Bei WordPress kannst du einen "Custom HTML"-Block verwenden. Bei anderen Website-Buildern
          suche nach "HTML einbetten" oder "Code-Block".
        </p>
        <div className="flex gap-3">
          <a
            href="https://docs.terminster.de/widget"
            target="_blank"
            className="text-sm text-primary hover:underline"
          >
            Dokumentation →
          </a>
          <a
            href="mailto:support@terminster.de"
            className="text-sm text-primary hover:underline"
          >
            Support kontaktieren
          </a>
        </div>
      </div>
    </div>
  )
}
