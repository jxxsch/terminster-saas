'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient, formatPrice, formatDuration } from '@/lib/supabase'

interface TeamMember {
  id: string
  name: string
  image: string | null
  free_day: number | null
}

interface Service {
  id: string
  name: string
  price: number
  duration: number
}

interface Appointment {
  id: string
  barber_id: string
  service_id: string
  date: string
  time_slot: string
  customer_name: string
  customer_phone: string | null
  customer_email: string | null
  status: string
  service?: Service
}

export default function CalendarPage() {
  const params = useParams()
  const shopId = params.shopId as string

  const [team, setTeam] = useState<TeamMember[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [timeSlots, setTimeSlots] = useState<string[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  useEffect(() => {
    loadData()
  }, [shopId, currentDate])

  async function loadData() {
    try {
      const supabase = createBrowserClient()

      // Load team
      const { data: teamData } = await supabase
        .from('team')
        .select('*')
        .eq('shop_id', shopId)
        .eq('active', true)
        .order('sort_order')

      setTeam(teamData || [])

      // Load services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('shop_id', shopId)
        .eq('active', true)
        .order('sort_order')

      setServices(servicesData || [])

      // Load time slots
      const { data: slotsData } = await supabase
        .from('time_slots')
        .select('time')
        .eq('shop_id', shopId)
        .eq('active', true)
        .order('sort_order')

      setTimeSlots((slotsData || []).map(s => s.time))

      // Load appointments for the week
      const weekStart = getWeekStart(currentDate)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('*, service:services(*)')
        .eq('shop_id', shopId)
        .gte('date', weekStart.toISOString().split('T')[0])
        .lte('date', weekEnd.toISOString().split('T')[0])
        .neq('status', 'cancelled')

      setAppointments(appointmentsData || [])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
  }

  function getWeekDays(): Date[] {
    const weekStart = getWeekStart(currentDate)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d
    })
  }

  function formatDateShort(date: Date): string {
    return date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
  }

  function isToday(date: Date): boolean {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  function isSunday(date: Date): boolean {
    return date.getDay() === 0
  }

  function getAppointment(barberId: string, date: Date, timeSlot: string): Appointment | undefined {
    const dateStr = date.toISOString().split('T')[0]
    return appointments.find(
      a => a.barber_id === barberId && a.date === dateStr && a.time_slot === timeSlot
    )
  }

  function isBarberFreeDay(barber: TeamMember, date: Date): boolean {
    if (barber.free_day === null) return false
    return date.getDay() === barber.free_day
  }

  function navigateWeek(direction: number) {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + direction * 7)
    setCurrentDate(newDate)
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  const weekDays = getWeekDays()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted">Lade Kalender...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Kalender</h1>
          <p className="text-muted mt-1">
            KW {getWeekNumber(currentDate)} • {weekDays[0].toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateWeek(-1)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm"
          >
            Heute
          </button>
          <button
            onClick={() => navigateWeek(1)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-zinc-900 rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-border">
                <th className="w-20 px-4 py-3 text-left text-sm font-medium text-muted">Zeit</th>
                {team.map(barber => (
                  <th key={barber.id} className="px-2 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium">
                        {barber.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium">{barber.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Day Headers */}
              {weekDays.map((day, dayIndex) => (
                <>
                  {/* Day Header Row */}
                  <tr key={`day-${dayIndex}`} className="bg-zinc-800/50">
                    <td
                      colSpan={team.length + 1}
                      className={`px-4 py-2 text-sm font-medium ${isToday(day) ? 'text-primary' : isSunday(day) ? 'text-muted' : ''}`}
                    >
                      {formatDateShort(day)}
                      {isToday(day) && <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Heute</span>}
                      {isSunday(day) && <span className="ml-2 text-xs text-muted">(Geschlossen)</span>}
                    </td>
                  </tr>

                  {/* Time Slots for this day */}
                  {!isSunday(day) && timeSlots.map((slot, slotIndex) => (
                    <tr key={`${dayIndex}-${slotIndex}`} className="border-b border-border/50 hover:bg-zinc-800/30">
                      <td className="px-4 py-2 text-sm text-muted whitespace-nowrap">
                        {slot}
                      </td>
                      {team.map(barber => {
                        const apt = getAppointment(barber.id, day, slot)
                        const isFreeDay = isBarberFreeDay(barber, day)

                        return (
                          <td key={barber.id} className="px-2 py-1">
                            {isFreeDay ? (
                              <div className="h-12 flex items-center justify-center text-xs text-muted bg-zinc-800/50 rounded">
                                Frei
                              </div>
                            ) : apt ? (
                              <button
                                onClick={() => setSelectedAppointment(apt)}
                                className="w-full h-12 px-2 py-1 bg-primary/20 border border-primary/30 rounded text-left hover:bg-primary/30 transition-colors"
                              >
                                <div className="text-xs font-medium truncate">{apt.customer_name}</div>
                                <div className="text-xs text-muted truncate">{apt.service?.name}</div>
                              </button>
                            ) : (
                              <div className="h-12 border border-dashed border-border/50 rounded hover:border-primary/50 hover:bg-zinc-800/30 transition-colors cursor-pointer" />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedAppointment(null)}>
          <div className="bg-zinc-900 rounded-xl border border-border p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Termindetails</h3>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="p-1 hover:bg-zinc-800 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-sm text-muted">Kunde</span>
                <p className="font-medium">{selectedAppointment.customer_name}</p>
              </div>
              {selectedAppointment.customer_phone && (
                <div>
                  <span className="text-sm text-muted">Telefon</span>
                  <p className="font-medium">{selectedAppointment.customer_phone}</p>
                </div>
              )}
              {selectedAppointment.customer_email && (
                <div>
                  <span className="text-sm text-muted">E-Mail</span>
                  <p className="font-medium">{selectedAppointment.customer_email}</p>
                </div>
              )}
              <div>
                <span className="text-sm text-muted">Service</span>
                <p className="font-medium">
                  {selectedAppointment.service?.name}
                  {selectedAppointment.service && (
                    <span className="text-muted ml-2">
                      ({formatPrice(selectedAppointment.service.price)} • {formatDuration(selectedAppointment.service.duration)})
                    </span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted">Datum & Zeit</span>
                <p className="font-medium">
                  {new Date(selectedAppointment.date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                  {' um '}{selectedAppointment.time_slot} Uhr
                </p>
              </div>
              <div>
                <span className="text-sm text-muted">Barber</span>
                <p className="font-medium">
                  {team.find(t => t.id === selectedAppointment.barber_id)?.name || 'Unbekannt'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setSelectedAppointment(null)}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Schließen
              </button>
              <button
                className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
              >
                Stornieren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
