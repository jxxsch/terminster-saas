'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

interface TenantUser {
  id: string
  user_id: string
  tenant_id: string
  role: 'tenant_owner' | 'shop_admin' | 'barber'
  shop_ids: string[]
  email: string | null
  name: string | null
  created_at: string
}

interface Invitation {
  id: string
  email: string
  role: string
  shop_ids: string[]
  expires_at: string
  created_at: string
}

interface Shop {
  id: string
  name: string
}

const roleLabels: Record<string, string> = {
  tenant_owner: 'Owner',
  shop_admin: 'Shop-Admin',
  barber: 'Barber',
}

const roleColors: Record<string, string> = {
  tenant_owner: 'bg-amber-500/20 text-amber-400',
  shop_admin: 'bg-blue-500/20 text-blue-400',
  barber: 'bg-zinc-500/20 text-zinc-400',
}

export default function UsersPage() {
  const params = useParams()
  const tenantId = params.tenantId as string

  const [users, setUsers] = useState<TenantUser[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [shops, setShops] = useState<Shop[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'shop_admin' as 'shop_admin' | 'barber',
    shopIds: [] as string[],
  })
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [tenantId])

  async function loadData() {
    try {
      const supabase = createBrowserClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }

      // Load tenant users
      const { data: usersData } = await supabase
        .from('tenant_users')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      // Load shops
      const { data: shopsData } = await supabase
        .from('shops')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .order('name')

      // Load pending invitations
      const invRes = await fetch(`/api/invitations?tenant_id=${tenantId}`)
      const invData = await invRes.json()

      setUsers(usersData || [])
      setShops(shopsData || [])
      setInvitations(invData.invitations || [])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleInvite() {
    setIsSending(true)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          email: inviteData.email,
          role: inviteData.role,
          shop_ids: inviteData.shopIds,
          invited_by: currentUserId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMessage(data.error || 'Fehler beim Senden der Einladung')
        setIsSending(false)
        return
      }

      setSuccessMessage(`Einladung an ${inviteData.email} gesendet!`)
      setShowInviteModal(false)
      setInviteData({ email: '', role: 'shop_admin', shopIds: [] })
      loadData()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      setErrorMessage('Fehler beim Senden der Einladung')
    } finally {
      setIsSending(false)
    }
  }

  async function handleCancelInvitation(invitationId: string) {
    if (!confirm('Einladung wirklich zurückziehen?')) return

    try {
      await fetch(`/api/invitations/${invitationId}`, { method: 'DELETE' })
      loadData()
    } catch (error) {
      console.error('Failed to cancel invitation:', error)
    }
  }

  async function handleRemoveUser(userId: string) {
    if (!confirm('Benutzer wirklich entfernen?')) return

    try {
      const supabase = createBrowserClient()
      await supabase
        .from('tenant_users')
        .delete()
        .eq('id', userId)

      loadData()
    } catch (error) {
      console.error('Failed to remove user:', error)
    }
  }

  function toggleShop(shopId: string) {
    setInviteData((prev) => ({
      ...prev,
      shopIds: prev.shopIds.includes(shopId)
        ? prev.shopIds.filter((id) => id !== shopId)
        : [...prev.shopIds, shopId],
    }))
  }

  function copyInviteLink(invitationId: string) {
    // We don't have the token here, but we can show a message
    navigator.clipboard.writeText(`${window.location.origin}/invite/...`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted">Lade Benutzer...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Benutzer & Einladungen</h1>
          <p className="text-muted mt-1">
            {users.length} Benutzer, {invitations.length} offene Einladungen
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary-dark transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Benutzer einladen
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successMessage}
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm">
            <p className="text-blue-400 font-medium">Rollen-Übersicht</p>
            <ul className="text-blue-300/80 mt-1 space-y-1">
              <li>
                <strong>Owner:</strong> Vollzugriff auf alle Shops und Einstellungen
              </li>
              <li>
                <strong>Shop-Admin:</strong> Verwaltet zugewiesene Shops (Team, Services, Kalender)
              </li>
              <li>
                <strong>Barber:</strong> Sieht nur eigenen Kalender
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Offene Einladungen</h2>
          <div className="bg-zinc-900 rounded-xl border border-border overflow-hidden">
            <div className="divide-y divide-border">
              {invitations.map((invitation) => {
                const isExpired = new Date(invitation.expires_at) < new Date()
                return (
                  <div
                    key={invitation.id}
                    className={`flex items-center justify-between px-6 py-4 ${isExpired ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{invitation.email}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${roleColors[invitation.role]}`}>
                            {roleLabels[invitation.role]}
                          </span>
                          {isExpired && (
                            <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">
                              Abgelaufen
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted mt-0.5">
                          {invitation.shop_ids?.length === shops.length
                            ? 'Alle Shops'
                            : invitation.shop_ids
                                ?.map((id) => shops.find((s) => s.id === id)?.name)
                                .filter(Boolean)
                                .join(', ')}
                          {' · '}
                          Gültig bis {new Date(invitation.expires_at).toLocaleDateString('de-DE')}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCancelInvitation(invitation.id)}
                      className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                      title="Einladung zurückziehen"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Users List */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Aktive Benutzer</h2>
        <div className="bg-zinc-900 rounded-xl border border-border overflow-hidden">
          {users.length === 0 ? (
            <div className="p-8 text-center text-muted">
              <svg className="w-12 h-12 mx-auto mb-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p>Noch keine aktiven Benutzer</p>
              <p className="text-sm mt-1">Lade Teammitglieder ein, um ihnen Zugriff zu geben.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                      {user.name ? (
                        <span className="text-sm font-medium">{user.name.charAt(0).toUpperCase()}</span>
                      ) : (
                        <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.name || user.email || 'Unbekannt'}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${roleColors[user.role]}`}>
                          {roleLabels[user.role]}
                        </span>
                      </div>
                      {user.email && user.name && (
                        <div className="text-sm text-muted mt-0.5">{user.email}</div>
                      )}
                      {user.shop_ids && user.shop_ids.length > 0 && (
                        <div className="text-sm text-muted mt-0.5">
                          {user.shop_ids.length === shops.length
                            ? 'Alle Shops'
                            : user.shop_ids
                                .map((id) => shops.find((s) => s.id === id)?.name)
                                .filter(Boolean)
                                .join(', ')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {user.role !== 'tenant_owner' && (
                      <button
                        onClick={() => handleRemoveUser(user.id)}
                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                        title="Entfernen"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-border w-full max-w-md">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold">Benutzer einladen</h2>
            </div>

            <div className="p-6 space-y-4">
              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-sm text-muted mb-2">E-Mail-Adresse *</label>
                <input
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
                  placeholder="mitarbeiter@beispiel.de"
                />
              </div>

              <div>
                <label className="block text-sm text-muted mb-2">Rolle *</label>
                <select
                  value={inviteData.role}
                  onChange={(e) => setInviteData({ ...inviteData, role: e.target.value as 'shop_admin' | 'barber' })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
                >
                  <option value="shop_admin">Shop-Admin</option>
                  <option value="barber">Barber</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-muted mb-2">Shop-Zugriff *</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {shops.map((shop) => (
                    <label key={shop.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={inviteData.shopIds.includes(shop.id)}
                        onChange={() => toggleShop(shop.id)}
                        className="w-5 h-5 rounded border-border bg-zinc-800 text-primary focus:ring-primary"
                      />
                      <span>{shop.name}</span>
                    </label>
                  ))}
                </div>
                {shops.length === 0 && <p className="text-sm text-muted">Noch keine Shops vorhanden.</p>}
              </div>

              <div className="bg-zinc-800 rounded-lg p-3 text-sm text-muted">
                <strong>Hinweis:</strong> Der eingeladene Benutzer erhält einen Link per E-Mail, über den
                er sich registrieren oder anmelden kann.
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowInviteModal(false)
                  setInviteData({ email: '', role: 'shop_admin', shopIds: [] })
                  setErrorMessage(null)
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteData.email || inviteData.shopIds.length === 0 || isSending}
                className="px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {isSending ? 'Sende...' : 'Einladung senden'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
