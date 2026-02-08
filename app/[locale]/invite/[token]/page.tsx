'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

interface Invitation {
  id: string
  email: string
  role: string
  shop_ids: string[]
  expires_at: string
  is_valid: boolean
  is_expired: boolean
  is_accepted: boolean
  tenant: {
    id: string
    name: string
    slug: string
    primary_color: string
  }
}

const roleLabels: Record<string, string> = {
  tenant_owner: 'Owner',
  shop_admin: 'Shop-Admin',
  barber: 'Barber',
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [authMode, setAuthMode] = useState<'check' | 'login' | 'register'>('check')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  })

  useEffect(() => {
    loadInvitation()
    checkAuth()
  }, [token])

  async function loadInvitation() {
    try {
      const res = await fetch(`/api/invitations/${token}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Einladung nicht gefunden')
        setIsLoading(false)
        return
      }

      setInvitation(data.invitation)
      setFormData((prev) => ({ ...prev, email: data.invitation.email }))
    } catch (err) {
      setError('Fehler beim Laden der Einladung')
    } finally {
      setIsLoading(false)
    }
  }

  async function checkAuth() {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      setUser({ id: user.id, email: user.email || '' })
      setAuthMode('check')
    } else {
      setAuthMode('login')
    }
  }

  async function handleLogin() {
    setIsAccepting(true)
    setError(null)

    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) {
        setError(error.message)
        setIsAccepting(false)
        return
      }

      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email || '' })
        // Auto-accept after login
        await acceptInvitation(data.user.id)
      }
    } catch (err) {
      setError('Login fehlgeschlagen')
      setIsAccepting(false)
    }
  }

  async function handleRegister() {
    setIsAccepting(true)
    setError(null)

    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
          },
        },
      })

      if (error) {
        setError(error.message)
        setIsAccepting(false)
        return
      }

      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email || '' })
        // Auto-accept after registration
        await acceptInvitation(data.user.id, formData.name)
      }
    } catch (err) {
      setError('Registrierung fehlgeschlagen')
      setIsAccepting(false)
    }
  }

  async function acceptInvitation(userId: string, name?: string) {
    setIsAccepting(true)
    setError(null)

    try {
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          user_id: userId,
          name: name || formData.name,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Fehler beim Annehmen der Einladung')
        setIsAccepting(false)
        return
      }

      // Redirect to appropriate dashboard
      router.push(data.redirect_url || '/')
    } catch (err) {
      setError('Fehler beim Annehmen der Einladung')
      setIsAccepting(false)
    }
  }

  const primaryColor = invitation?.tenant?.primary_color || '#D4AF37'

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted">Lade Einladung...</span>
        </div>
      </div>
    )
  }

  if (!invitation || !invitation.is_valid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-zinc-900 rounded-xl border border-border p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2">
            {invitation?.is_expired ? 'Einladung abgelaufen' : invitation?.is_accepted ? 'Einladung bereits angenommen' : 'Einladung ungültig'}
          </h1>
          <p className="text-muted mb-6">
            {invitation?.is_expired
              ? 'Diese Einladung ist nicht mehr gültig. Bitte fordere eine neue an.'
              : invitation?.is_accepted
              ? 'Du hast diese Einladung bereits angenommen.'
              : error || 'Die Einladung wurde nicht gefunden oder ist ungültig.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Zur Startseite
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-xl border border-border p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4"
            style={{ backgroundColor: `${primaryColor}33`, color: primaryColor }}
          >
            {invitation.tenant.name.charAt(0)}
          </div>
          <h1 className="text-xl font-bold mb-2">Einladung zu</h1>
          <h2 className="text-2xl font-bold" style={{ color: primaryColor }}>
            {invitation.tenant.name}
          </h2>
        </div>

        {/* Invitation Details */}
        <div className="bg-zinc-800 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted">Rolle</span>
            <span className="font-medium">{roleLabels[invitation.role]}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted">E-Mail</span>
            <span className="font-medium">{invitation.email}</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Already logged in */}
        {user && (
          <div className="space-y-4">
            <p className="text-center text-muted">
              Eingeloggt als <strong>{user.email}</strong>
            </p>

            {user.email.toLowerCase() !== invitation.email.toLowerCase() && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 rounded-lg text-sm">
                Hinweis: Du bist mit einer anderen E-Mail eingeloggt als in der Einladung.
              </div>
            )}

            <button
              onClick={() => acceptInvitation(user.id)}
              disabled={isAccepting}
              className="w-full py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              style={{ backgroundColor: primaryColor, color: '#000' }}
            >
              {isAccepting ? 'Wird angenommen...' : 'Einladung annehmen'}
            </button>

            <button
              onClick={async () => {
                const supabase = createBrowserClient()
                await supabase.auth.signOut()
                setUser(null)
                setAuthMode('login')
              }}
              className="w-full py-2 text-sm text-muted hover:text-foreground"
            >
              Mit anderem Account anmelden
            </button>
          </div>
        )}

        {/* Login Form */}
        {!user && authMode === 'login' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-center">Anmelden</h3>

            <div>
              <label className="block text-sm text-muted mb-2">E-Mail</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-2">Passwort</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={isAccepting || !formData.email || !formData.password}
              className="w-full py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              style={{ backgroundColor: primaryColor, color: '#000' }}
            >
              {isAccepting ? 'Anmelden...' : 'Anmelden & Einladung annehmen'}
            </button>

            <p className="text-center text-sm text-muted">
              Noch kein Account?{' '}
              <button
                onClick={() => setAuthMode('register')}
                className="hover:underline"
                style={{ color: primaryColor }}
              >
                Registrieren
              </button>
            </p>
          </div>
        )}

        {/* Register Form */}
        {!user && authMode === 'register' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-center">Registrieren</h3>

            <div>
              <label className="block text-sm text-muted mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
                placeholder="Dein Name"
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-2">E-Mail</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-2">Passwort</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
                placeholder="Mind. 6 Zeichen"
              />
            </div>

            <button
              onClick={handleRegister}
              disabled={isAccepting || !formData.email || !formData.password || formData.password.length < 6}
              className="w-full py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              style={{ backgroundColor: primaryColor, color: '#000' }}
            >
              {isAccepting ? 'Registrieren...' : 'Registrieren & Einladung annehmen'}
            </button>

            <p className="text-center text-sm text-muted">
              Bereits ein Account?{' '}
              <button
                onClick={() => setAuthMode('login')}
                className="hover:underline"
                style={{ color: primaryColor }}
              >
                Anmelden
              </button>
            </p>
          </div>
        )}

        {/* Footer */}
        <p className="text-xs text-muted text-center mt-6">
          Gültig bis {new Date(invitation.expires_at).toLocaleDateString('de-DE')}
        </p>
      </div>
    </div>
  )
}
