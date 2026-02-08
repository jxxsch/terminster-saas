'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

interface OpeningHours {
  id: string
  day_of_week: number
  open_time: string
  close_time: string
  is_closed: boolean
}

const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

export default function HoursPage() {
  const params = useParams()
  const shopId = params.shopId as string

  const [hours, setHours] = useState<OpeningHours[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadHours()
  }, [shopId])

  async function loadHours() {
    try {
      const supabase = createBrowserClient()
      const { data } = await supabase
        .from('opening_hours')
        .select('*')
        .eq('shop_id', shopId)
        .order('day_of_week')

      // Initialize all days if not present
      const allDays = [0, 1, 2, 3, 4, 5, 6].map(day => {
        const existing = data?.find(h => h.day_of_week === day)
        return existing || {
          id: `new-${day}`,
          day_of_week: day,
          open_time: '10:00',
          close_time: '19:00',
          is_closed: day === 0, // Sunday closed by default
        }
      })

      setHours(allDays)
    } catch (error) {
      console.error('Failed to load hours:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      const supabase = createBrowserClient()

      for (const hour of hours) {
        const data = {
          shop_id: shopId,
          day_of_week: hour.day_of_week,
          open_time: hour.open_time,
          close_time: hour.close_time,
          is_closed: hour.is_closed,
        }

        if (hour.id.startsWith('new-')) {
          await supabase.from('opening_hours').insert(data)
        } else {
          await supabase.from('opening_hours').update(data).eq('id', hour.id)
        }
      }

      loadHours()
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }

  function updateHour(dayOfWeek: number, field: keyof OpeningHours, value: string | boolean) {
    setHours(prev => prev.map(h =>
      h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h
    ))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted">Lade Öffnungszeiten...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Öffnungszeiten</h1>
          <p className="text-muted mt-1">Reguläre wöchentliche Öffnungszeiten</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Speichern...' : 'Speichern'}
        </button>
      </div>

      {/* Opening Hours Grid */}
      <div className="bg-zinc-900 rounded-xl border border-border overflow-hidden">
        <div className="divide-y divide-border">
          {hours.map((hour) => (
            <div
              key={hour.day_of_week}
              className={`flex items-center justify-between px-6 py-4 ${hour.is_closed ? 'bg-zinc-800/30' : ''}`}
            >
              <div className="flex items-center gap-4 min-w-[140px]">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!hour.is_closed}
                    onChange={(e) => updateHour(hour.day_of_week, 'is_closed', !e.target.checked)}
                    className="w-5 h-5 rounded border-border bg-zinc-800 text-primary focus:ring-primary"
                  />
                  <span className={`font-medium ${hour.is_closed ? 'text-muted' : ''}`}>
                    {dayNames[hour.day_of_week]}
                  </span>
                </label>
              </div>

              {hour.is_closed ? (
                <span className="text-muted">Geschlossen</span>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted">Von</label>
                    <input
                      type="time"
                      value={hour.open_time}
                      onChange={(e) => updateHour(hour.day_of_week, 'open_time', e.target.value)}
                      className="px-3 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted">Bis</label>
                    <input
                      type="time"
                      value={hour.close_time}
                      onChange={(e) => updateHour(hour.day_of_week, 'close_time', e.target.value)}
                      className="px-3 py-2 bg-zinc-800 border border-border rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <p className="text-sm text-blue-400">
          <strong>Tipp:</strong> Für Sondertage wie Feiertage oder verkaufsoffene Sonntage nutze die Einstellungen-Seite.
        </p>
      </div>
    </div>
  )
}
