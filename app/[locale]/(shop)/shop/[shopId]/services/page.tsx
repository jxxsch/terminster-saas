'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient, formatPrice, formatDuration } from '@/lib/supabase'

interface Service {
  id: string
  name: string
  price: number
  duration: number
  sort_order: number
  active: boolean
}

export default function ServicesPage() {
  const params = useParams()
  const shopId = params.shopId as string

  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration: '',
    active: true,
  })

  useEffect(() => {
    loadServices()
  }, [shopId])

  async function loadServices() {
    try {
      const supabase = createBrowserClient()
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('shop_id', shopId)
        .order('sort_order')

      setServices(data || [])
    } catch (error) {
      console.error('Failed to load services:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    try {
      const supabase = createBrowserClient()

      const serviceData = {
        shop_id: shopId,
        name: formData.name,
        price: Math.round(parseFloat(formData.price) * 100), // Convert to cents
        duration: parseInt(formData.duration),
        active: formData.active,
      }

      if (editingService) {
        await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editingService.id)
      } else {
        const maxOrder = Math.max(0, ...services.map(s => s.sort_order))
        await supabase
          .from('services')
          .insert({ ...serviceData, sort_order: maxOrder + 1 })
      }

      setEditingService(null)
      setIsAddingNew(false)
      setFormData({ name: '', price: '', duration: '', active: true })
      loadServices()
    } catch (error) {
      console.error('Failed to save:', error)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Service wirklich löschen?')) return

    try {
      const supabase = createBrowserClient()
      await supabase.from('services').delete().eq('id', id)
      loadServices()
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  function startEdit(service: Service) {
    setEditingService(service)
    setFormData({
      name: service.name,
      price: (service.price / 100).toFixed(2),
      duration: service.duration.toString(),
      active: service.active,
    })
    setIsAddingNew(false)
  }

  function startAddNew() {
    setIsAddingNew(true)
    setEditingService(null)
    setFormData({ name: '', price: '', duration: '30', active: true })
  }

  function cancelEdit() {
    setEditingService(null)
    setIsAddingNew(false)
    setFormData({ name: '', price: '', duration: '', active: true })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted">Lade Services...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-muted mt-1">{services.length} Services</p>
        </div>
        <button
          onClick={startAddNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary-dark transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Neuer Service
        </button>
      </div>

      {/* Add/Edit Form */}
      {(isAddingNew || editingService) && (
        <div className="bg-zinc-900 rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingService ? 'Service bearbeiten' : 'Neuer Service'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm text-muted mb-2">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
                placeholder="Haarschnitt"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-2">Preis (€) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
                placeholder="20.00"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-2">Dauer (Min) *</label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
                placeholder="30"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4">
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

          <div className="flex gap-2 mt-6">
            <button
              onClick={handleSave}
              disabled={!formData.name || !formData.price || !formData.duration}
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

      {/* Services List */}
      <div className="bg-zinc-900 rounded-xl border border-border overflow-hidden">
        {services.length === 0 ? (
          <div className="p-8 text-center text-muted">
            Noch keine Services vorhanden
          </div>
        ) : (
          <div className="divide-y divide-border">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{service.name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${service.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400'}`}>
                        {service.active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </div>
                    <div className="text-sm text-muted">
                      {formatPrice(service.price)} • {formatDuration(service.duration)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(service)}
                    className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                    title="Bearbeiten"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(service.id)}
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
