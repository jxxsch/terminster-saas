'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

interface BarberProfile {
  id: string
  name: string
  image: string | null
  email: string | null
  phone: string | null
  bio: string | null
  active: boolean
}

interface ShopInfo {
  id: string
  name: string
  address: string | null
  phone: string | null
}

interface Stats {
  totalAppointments: number
  thisWeekAppointments: number
  todayAppointments: number
}

const Icons = {
  User: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Mail: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Phone: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  Building: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
}

export default function BarberProfilePage() {
  const params = useParams()
  const shopId = params.shopId as string

  const [barber, setBarber] = useState<BarberProfile | null>(null)
  const [shop, setShop] = useState<ShopInfo | null>(null)
  const [stats, setStats] = useState<Stats>({ totalAppointments: 0, thisWeekAppointments: 0, todayAppointments: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [primaryColor, setPrimaryColor] = useState('#D4AF37')
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    phone: '',
    bio: '',
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadData()
  }, [shopId])

  async function loadData() {
    try {
      const supabase = createBrowserClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get shop info
      const { data: shopData } = await supabase
        .from('shops')
        .select('id, name, address, phone, tenant:tenants(primary_color)')
        .eq('id', shopId)
        .single() as { data: { id: string; name: string; address: string | null; phone: string | null; tenant: { primary_color: string } | null } | null; error: unknown }

      if (shopData) {
        setShop({
          id: shopData.id,
          name: shopData.name,
          address: shopData.address,
          phone: shopData.phone,
        })

        if (shopData.tenant) {
          setPrimaryColor(shopData.tenant.primary_color || '#D4AF37')
        }
      }

      // Find barber linked to this user
      const { data: barberData } = await supabase
        .from('team')
        .select('id, name, image, email, phone, bio, active')
        .eq('shop_id', shopId)
        .eq('email', user.email || '')
        .single() as { data: BarberProfile | null; error: unknown }

      if (barberData) {
        setBarber(barberData)
        setFormData({
          phone: barberData.phone || '',
          bio: barberData.bio || '',
        })

        // Load stats
        await loadStats(barberData.id)
      } else {
        // Fallback for demo
        const { data: anyBarber } = await supabase
          .from('team')
          .select('id, name, image, email, phone, bio, active')
          .eq('shop_id', shopId)
          .eq('active', true)
          .limit(1)
          .single() as { data: BarberProfile | null; error: unknown }

        if (anyBarber) {
          setBarber(anyBarber)
          setFormData({
            phone: anyBarber.phone || '',
            bio: anyBarber.bio || '',
          })
          await loadStats(anyBarber.id)
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadStats(barberId: string) {
    const supabase = createBrowserClient()

    const today = new Date().toISOString().split('T')[0]
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    // Total appointments (all time)
    const { count: totalCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('barber_id', barberId)
      .eq('shop_id', shopId)
      .neq('status', 'cancelled')

    // This week
    const { count: weekCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('barber_id', barberId)
      .eq('shop_id', shopId)
      .gte('date', weekStart.toISOString().split('T')[0])
      .lte('date', weekEnd.toISOString().split('T')[0])
      .neq('status', 'cancelled')

    // Today
    const { count: todayCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('barber_id', barberId)
      .eq('shop_id', shopId)
      .eq('date', today)
      .neq('status', 'cancelled')

    setStats({
      totalAppointments: totalCount || 0,
      thisWeekAppointments: weekCount || 0,
      todayAppointments: todayCount || 0,
    })
  }

  async function handleSave() {
    if (!barber) return

    setIsSaving(true)
    setMessage(null)

    try {
      const supabase = createBrowserClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('team') as any)
        .update({
          phone: formData.phone || null,
          bio: formData.bio || null,
        })
        .eq('id', barber.id)

      if (error) throw error

      setBarber({
        ...barber,
        phone: formData.phone || null,
        bio: formData.bio || null,
      })
      setEditMode(false)
      setMessage({ type: 'success', text: 'Profil erfolgreich gespeichert!' })
    } catch (error) {
      console.error('Failed to save profile:', error)
      setMessage({ type: 'error', text: 'Fehler beim Speichern' })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: primaryColor, borderTopColor: 'transparent' }} />
          <span className="text-muted">Lade Profil...</span>
        </div>
      </div>
    )
  }

  if (!barber) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Profil nicht gefunden</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Mein Profil</h1>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/20 text-green-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-zinc-900 rounded-xl border border-border p-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          {barber.image ? (
            <img
              src={barber.image}
              alt={barber.name}
              className="w-24 h-24 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold flex-shrink-0"
              style={{ backgroundColor: `${primaryColor}33`, color: primaryColor }}
            >
              {barber.name.charAt(0)}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold">{barber.name}</h2>
            <p className="text-muted mt-1">
              {barber.active ? (
                <span className="inline-flex items-center gap-1 text-green-400">
                  <Icons.Check />
                  Aktiv
                </span>
              ) : (
                <span className="text-muted">Inaktiv</span>
              )}
            </p>

            {/* Contact Info */}
            <div className="mt-4 space-y-2">
              {barber.email && (
                <div className="flex items-center gap-2 text-muted">
                  <Icons.Mail />
                  <span>{barber.email}</span>
                </div>
              )}
              {barber.phone && (
                <div className="flex items-center gap-2 text-muted">
                  <Icons.Phone />
                  <span>{barber.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {barber.bio && !editMode && (
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="font-semibold mb-2">Über mich</h3>
            <p className="text-muted">{barber.bio}</p>
          </div>
        )}

        {/* Edit Button */}
        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="mt-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Profil bearbeiten
          </button>
        )}

        {/* Edit Form */}
        {editMode && (
          <div className="mt-6 pt-6 border-t border-border space-y-4">
            <div>
              <label className="block text-sm text-muted mb-2">Telefon</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
                placeholder="Deine Telefonnummer"
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-2">Über mich</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary resize-none"
                rows={4}
                placeholder="Erzähl etwas über dich..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
                style={{ backgroundColor: primaryColor, color: '#000' }}
              >
                {isSaving ? 'Speichern...' : 'Speichern'}
              </button>
              <button
                onClick={() => {
                  setEditMode(false)
                  setFormData({
                    phone: barber.phone || '',
                    bio: barber.bio || '',
                  })
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900 rounded-xl border border-border p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: primaryColor }}>
            {stats.todayAppointments}
          </div>
          <div className="text-sm text-muted mt-1">Heute</div>
        </div>
        <div className="bg-zinc-900 rounded-xl border border-border p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: primaryColor }}>
            {stats.thisWeekAppointments}
          </div>
          <div className="text-sm text-muted mt-1">Diese Woche</div>
        </div>
        <div className="bg-zinc-900 rounded-xl border border-border p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: primaryColor }}>
            {stats.totalAppointments}
          </div>
          <div className="text-sm text-muted mt-1">Gesamt</div>
        </div>
      </div>

      {/* Shop Info */}
      {shop && (
        <div className="bg-zinc-900 rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Icons.Building />
            Shop
          </h3>
          <div className="space-y-2">
            <p className="font-medium">{shop.name}</p>
            {shop.address && (
              <p className="text-muted text-sm">{shop.address}</p>
            )}
            {shop.phone && (
              <p className="text-muted text-sm flex items-center gap-2">
                <Icons.Phone />
                {shop.phone}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
