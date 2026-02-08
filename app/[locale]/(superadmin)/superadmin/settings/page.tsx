'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'

export default function SettingsPage() {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [newSuperadminEmail, setNewSuperadminEmail] = useState('')
  const [superadmins, setSuperadmins] = useState<Array<{ user_id: string; email: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const supabase = createBrowserClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserEmail(user?.email || null)

      // Get all superadmins - using RPC function since we can't join auth.users
      const { data: superadminData } = await supabase
        .from('superadmins')
        .select('user_id, created_at')

      // For now, just show IDs (in production, you'd use a server function to get emails)
      setSuperadmins(
        (superadminData || []).map((sa) => ({
          user_id: sa.user_id,
          email: sa.user_id === user?.id ? user?.email || 'Du' : 'Admin',
        }))
      )
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAddSuperadmin(e: React.FormEvent) {
    e.preventDefault()
    setIsAdding(true)
    setMessage(null)

    try {
      const supabase = createBrowserClient()

      // Call the add_superadmin function
      const { data, error } = await supabase.rpc('add_superadmin', {
        admin_email: newSuperadminEmail,
      })

      if (error) throw error

      setMessage({ type: 'success', text: data as string })
      setNewSuperadminEmail('')
      loadData()
    } catch (err) {
      console.error('Failed to add superadmin:', err)
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Fehler beim Hinzufügen',
      })
    } finally {
      setIsAdding(false)
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
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Einstellungen</h1>
        <p className="text-muted mt-1">Plattform-Konfiguration</p>
      </div>

      {/* Superadmin Management */}
      <div className="bg-zinc-900 rounded-xl border border-border p-6 space-y-6">
        <div>
          <h2 className="font-semibold text-lg">Superadmins</h2>
          <p className="text-sm text-muted mt-1">
            Superadmins haben vollen Zugriff auf alle Tenants und Shops.
          </p>
        </div>

        {/* Current Superadmins */}
        <div className="space-y-2">
          {superadmins.map((admin) => (
            <div
              key={admin.user_id}
              className="flex items-center justify-between px-4 py-3 bg-zinc-800 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-medium">
                  {admin.email.charAt(0).toUpperCase()}
                </div>
                <span>{admin.email}</span>
              </div>
              {admin.email === currentUserEmail || admin.user_id === currentUserEmail ? (
                <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">Du</span>
              ) : null}
            </div>
          ))}
        </div>

        {/* Add Superadmin */}
        <form onSubmit={handleAddSuperadmin} className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-2">
              Neuen Superadmin hinzufügen
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={newSuperadminEmail}
                onChange={(e) => setNewSuperadminEmail(e.target.value)}
                placeholder="email@example.de"
                required
                className="flex-1 px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={isAdding}
                className="px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {isAdding ? '...' : 'Hinzufügen'}
              </button>
            </div>
            <p className="text-xs text-muted mt-2">
              Der Benutzer muss bereits registriert sein.
            </p>
          </div>
        </form>

        {/* Message */}
        {message && (
          <div
            className={`px-4 py-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      {/* Platform Info */}
      <div className="bg-zinc-900 rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold text-lg">Plattform-Info</h2>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted">Version</span>
            <p className="font-medium">0.1.0</p>
          </div>
          <div>
            <span className="text-muted">Environment</span>
            <p className="font-medium">Development</p>
          </div>
          <div>
            <span className="text-muted">Supabase Region</span>
            <p className="font-medium">eu-central-1 (Frankfurt)</p>
          </div>
          <div>
            <span className="text-muted">Next.js</span>
            <p className="font-medium">15.x</p>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-zinc-900 rounded-xl border border-red-500/30 p-6 space-y-4">
        <h2 className="font-semibold text-lg text-red-400">Gefahrenzone</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Datenbank zurücksetzen</p>
              <p className="text-sm text-muted">Löscht alle Tenants, Shops und Termine.</p>
            </div>
            <button
              onClick={() => alert('Diese Funktion ist deaktiviert.')}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              Zurücksetzen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
