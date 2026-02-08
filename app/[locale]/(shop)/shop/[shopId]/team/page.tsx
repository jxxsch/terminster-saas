'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

interface TeamMember {
  id: string
  name: string
  image: string | null
  phone: string | null
  free_day: number | null
  sort_order: number
  active: boolean
}

const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

export default function TeamPage() {
  const params = useParams()
  const shopId = params.shopId as string

  const [team, setTeam] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    free_day: '',
    active: true,
  })

  useEffect(() => {
    loadTeam()
  }, [shopId])

  async function loadTeam() {
    try {
      const supabase = createBrowserClient()
      const { data } = await supabase
        .from('team')
        .select('*')
        .eq('shop_id', shopId)
        .order('sort_order')

      setTeam(data || [])
    } catch (error) {
      console.error('Failed to load team:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    try {
      const supabase = createBrowserClient()

      const memberData = {
        shop_id: shopId,
        name: formData.name,
        phone: formData.phone || null,
        free_day: formData.free_day ? parseInt(formData.free_day) : null,
        active: formData.active,
      }

      if (editingMember) {
        await supabase
          .from('team')
          .update(memberData)
          .eq('id', editingMember.id)
      } else {
        const maxOrder = Math.max(0, ...team.map(t => t.sort_order))
        await supabase
          .from('team')
          .insert({ ...memberData, sort_order: maxOrder + 1 })
      }

      setEditingMember(null)
      setIsAddingNew(false)
      setFormData({ name: '', phone: '', free_day: '', active: true })
      loadTeam()
    } catch (error) {
      console.error('Failed to save:', error)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Mitarbeiter wirklich löschen?')) return

    try {
      const supabase = createBrowserClient()
      await supabase.from('team').delete().eq('id', id)
      loadTeam()
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  function startEdit(member: TeamMember) {
    setEditingMember(member)
    setFormData({
      name: member.name,
      phone: member.phone || '',
      free_day: member.free_day?.toString() || '',
      active: member.active,
    })
    setIsAddingNew(false)
  }

  function startAddNew() {
    setIsAddingNew(true)
    setEditingMember(null)
    setFormData({ name: '', phone: '', free_day: '', active: true })
  }

  function cancelEdit() {
    setEditingMember(null)
    setIsAddingNew(false)
    setFormData({ name: '', phone: '', free_day: '', active: true })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted">Lade Team...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted mt-1">{team.length} Mitarbeiter</p>
        </div>
        <button
          onClick={startAddNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary-dark transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Neuer Mitarbeiter
        </button>
      </div>

      {/* Add/Edit Form */}
      {(isAddingNew || editingMember) && (
        <div className="bg-zinc-900 rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingMember ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted mb-2">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
                placeholder="Max Mustermann"
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
              <label className="block text-sm text-muted mb-2">Freier Tag</label>
              <select
                value={formData.free_day}
                onChange={(e) => setFormData({ ...formData, free_day: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
              >
                <option value="">Kein freier Tag</option>
                {[1, 2, 3, 4, 5, 6].map(day => (
                  <option key={day} value={day}>{dayNames[day]}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-5 h-5 rounded border-border bg-zinc-800 text-primary focus:ring-primary"
                />
                <span>Aktiv</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={handleSave}
              disabled={!formData.name}
              className="px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              Speichern
            </button>
            <button
              onClick={cancelEdit}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Team List */}
      <div className="bg-zinc-900 rounded-xl border border-border overflow-hidden">
        {team.length === 0 ? (
          <div className="p-8 text-center text-muted">
            Noch keine Mitarbeiter vorhanden
          </div>
        ) : (
          <div className="divide-y divide-border">
            {team.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-lg">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{member.name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${member.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400'}`}>
                        {member.active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </div>
                    <div className="text-sm text-muted">
                      {member.phone || 'Keine Telefonnummer'}
                      {member.free_day !== null && (
                        <span className="ml-2">• Frei: {dayNames[member.free_day]}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(member)}
                    className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                    title="Bearbeiten"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                    title="Löschen"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
