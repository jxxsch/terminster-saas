'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import Link from 'next/link'

interface FormData {
  name: string
  slug: string
  customDomain: string
  primaryColor: string
  subscriptionPlan: string
  // First shop
  shopName: string
  shopSlug: string
  shopAddress: string
  shopPhone: string
  shopEmail: string
  bundesland: string
}

export default function NewTenantPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<FormData>({
    name: '',
    slug: '',
    customDomain: '',
    primaryColor: '#D4AF37',
    subscriptionPlan: 'free',
    shopName: '',
    shopSlug: 'main',
    shopAddress: '',
    shopPhone: '',
    shopEmail: '',
    bundesland: 'NW',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Auto-generate slug from name
    if (name === 'name' && !formData.slug) {
      const slug = value
        .toLowerCase()
        .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c] || c))
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      setFormData((prev) => ({ ...prev, slug }))
    }

    // Copy tenant name to shop name if empty
    if (name === 'name' && !formData.shopName) {
      setFormData((prev) => ({ ...prev, shopName: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createBrowserClient()

      // Create tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: formData.name,
          slug: formData.slug,
          custom_domain: formData.customDomain || null,
          primary_color: formData.primaryColor,
          subscription_plan: formData.subscriptionPlan,
        })
        .select()
        .single()

      if (tenantError) throw tenantError

      // Create first shop
      const { error: shopError } = await supabase.from('shops').insert({
        tenant_id: tenant.id,
        name: formData.shopName,
        slug: formData.shopSlug,
        address: formData.shopAddress || null,
        phone: formData.shopPhone || null,
        email: formData.shopEmail || null,
        bundesland: formData.bundesland,
      })

      if (shopError) throw shopError

      // Redirect to tenant detail page
      router.push(`/${locale}/superadmin/tenants/${tenant.id}`)
    } catch (err) {
      console.error('Failed to create tenant:', err)
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen')
    } finally {
      setIsSubmitting(false)
    }
  }

  const bundeslaender = [
    { value: 'BW', label: 'Baden-Württemberg' },
    { value: 'BY', label: 'Bayern' },
    { value: 'BE', label: 'Berlin' },
    { value: 'BB', label: 'Brandenburg' },
    { value: 'HB', label: 'Bremen' },
    { value: 'HH', label: 'Hamburg' },
    { value: 'HE', label: 'Hessen' },
    { value: 'MV', label: 'Mecklenburg-Vorpommern' },
    { value: 'NI', label: 'Niedersachsen' },
    { value: 'NW', label: 'Nordrhein-Westfalen' },
    { value: 'RP', label: 'Rheinland-Pfalz' },
    { value: 'SL', label: 'Saarland' },
    { value: 'SN', label: 'Sachsen' },
    { value: 'ST', label: 'Sachsen-Anhalt' },
    { value: 'SH', label: 'Schleswig-Holstein' },
    { value: 'TH', label: 'Thüringen' },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/superadmin/tenants`}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Neuer Kunde</h1>
          <p className="text-muted mt-1">Tenant und ersten Shop anlegen</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Tenant Info */}
        <div className="bg-zinc-900 rounded-xl border border-border p-6 space-y-4">
          <h2 className="font-semibold text-lg">Kundeninformationen</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted mb-2">Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="z.B. Beban Barbershop"
                className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-2">Slug *</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  required
                  placeholder="beban"
                  pattern="[a-z0-9-]+"
                  className="flex-1 px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
                />
                <span className="text-sm text-muted">.terminster.de</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted mb-2">Custom Domain (optional)</label>
              <input
                type="text"
                name="customDomain"
                value={formData.customDomain}
                onChange={handleChange}
                placeholder="www.beban-barbershop.de"
                className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-2">Plan</label>
              <select
                name="subscriptionPlan"
                value={formData.subscriptionPlan}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
              >
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-muted mb-2">Primärfarbe</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  name="primaryColor"
                  value={formData.primaryColor}
                  onChange={handleChange}
                  className="w-12 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  name="primaryColor"
                  value={formData.primaryColor}
                  onChange={handleChange}
                  className="flex-1 px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* First Shop */}
        <div className="bg-zinc-900 rounded-xl border border-border p-6 space-y-4">
          <h2 className="font-semibold text-lg">Erster Shop</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted mb-2">Shop-Name *</label>
              <input
                type="text"
                name="shopName"
                value={formData.shopName}
                onChange={handleChange}
                required
                placeholder="z.B. Hauptgeschäft"
                className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-2">Shop-Slug *</label>
              <input
                type="text"
                name="shopSlug"
                value={formData.shopSlug}
                onChange={handleChange}
                required
                placeholder="main"
                pattern="[a-z0-9-]+"
                className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm text-muted mb-2">Adresse</label>
              <input
                type="text"
                name="shopAddress"
                value={formData.shopAddress}
                onChange={handleChange}
                placeholder="Musterstraße 123, 50667 Köln"
                className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-2">Telefon</label>
              <input
                type="tel"
                name="shopPhone"
                value={formData.shopPhone}
                onChange={handleChange}
                placeholder="+49 221 12345678"
                className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-2">E-Mail</label>
              <input
                type="email"
                name="shopEmail"
                value={formData.shopEmail}
                onChange={handleChange}
                placeholder="info@example.de"
                className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-2">Bundesland</label>
              <select
                name="bundesland"
                value={formData.bundesland}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
              >
                {bundeslaender.map((bl) => (
                  <option key={bl.value} value={bl.value}>
                    {bl.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href={`/${locale}/superadmin/tenants`}
            className="px-6 py-2 border border-border rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Erstelle...' : 'Kunde anlegen'}
          </button>
        </div>
      </form>
    </div>
  )
}
