'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

interface Appointment {
  id: string
  barber_id: string
  date: string
  time_slot: string
  service_id: string
  customer_name: string
  customer_phone: string | null
  customer_email: string | null
  status: string
  service?: {
    name: string
    duration: number
    price: number
  }
}

interface BarberInfo {
  id: string
  name: string
}

const Icons = {
  ChevronLeft: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  User: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Phone: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
}

export default function BarberCalendarPage() {
  const params = useParams()
  const shopId = params.shopId as string

  const [barber, setBarber] = useState<BarberInfo | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [primaryColor, setPrimaryColor] = useState('#D4AF37')

  // Get week dates
  const weekDates = useMemo(() => {
    const dates: Date[] = []
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Monday
    startOfWeek.setDate(diff)

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      dates.push(date)
    }
    return dates
  }, [currentDate])

  const weekStart = weekDates[0]
  const weekEnd = weekDates[6]

  useEffect(() => {
    loadData()
  }, [shopId, weekStart])

  async function loadData() {
    try {
      const supabase = createBrowserClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get shop's primary color
      const { data: shopData } = await supabase
        .from('shops')
        .select('tenant:tenants(primary_color)')
        .eq('id', shopId)
        .single() as { data: { tenant: { primary_color: string } | null } | null; error: unknown }

      if (shopData?.tenant) {
        setPrimaryColor(shopData.tenant.primary_color || '#D4AF37')
      }

      // Find barber linked to this user
      const { data: barberData } = await supabase
        .from('team')
        .select('id, name')
        .eq('shop_id', shopId)
        .eq('email', user.email || '')
        .single() as { data: BarberInfo | null; error: unknown }

      if (barberData) {
        setBarber(barberData)

        // Load appointments for this barber
        const startDate = formatDate(weekStart)
        const endDate = formatDate(weekEnd)

        const { data: appointmentsData } = await supabase
          .from('appointments')
          .select(`
            id,
            barber_id,
            date,
            time_slot,
            service_id,
            customer_name,
            customer_phone,
            customer_email,
            status,
            service:services(name, duration, price)
          `)
          .eq('barber_id', barberData.id)
          .eq('shop_id', shopId)
          .gte('date', startDate)
          .lte('date', endDate)
          .neq('status', 'cancelled')
          .order('date')
          .order('time_slot')

        if (appointmentsData) {
          setAppointments(appointmentsData as unknown as Appointment[])
        }
      } else {
        // Fallback: find first active barber (for demo)
        const { data: anyBarber } = await supabase
          .from('team')
          .select('id, name')
          .eq('shop_id', shopId)
          .eq('active', true)
          .limit(1)
          .single() as { data: BarberInfo | null; error: unknown }

        if (anyBarber) {
          setBarber(anyBarber)

          const startDate = formatDate(weekStart)
          const endDate = formatDate(weekEnd)

          const { data: appointmentsData } = await supabase
            .from('appointments')
            .select(`
              id,
              barber_id,
              date,
              time_slot,
              service_id,
              customer_name,
              customer_phone,
              customer_email,
              status,
              service:services(name, duration, price)
            `)
            .eq('barber_id', anyBarber.id)
            .eq('shop_id', shopId)
            .gte('date', startDate)
            .lte('date', endDate)
            .neq('status', 'cancelled')
            .order('date')
            .order('time_slot') as { data: Appointment[] | null; error: unknown }

          if (appointmentsData) {
            setAppointments(appointmentsData)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  function formatDisplayDate(date: Date): string {
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  }

  function formatWeekRange(): string {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
    const start = weekStart.toLocaleDateString('de-DE', options)
    const end = weekEnd.toLocaleDateString('de-DE', { ...options, year: 'numeric' })
    return `${start} - ${end}`
  }

  function goToPreviousWeek() {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentDate(newDate)
  }

  function goToNextWeek() {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentDate(newDate)
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  function getAppointmentsForDate(date: Date): Appointment[] {
    const dateStr = formatDate(date)
    return appointments.filter(apt => apt.date === dateStr)
  }

  function isToday(date: Date): boolean {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  function isSunday(date: Date): boolean {
    return date.getDay() === 0
  }

  const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

  const todaysAppointments = getAppointmentsForDate(new Date())
  const totalWeekAppointments = appointments.length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: primaryColor, borderTopColor: 'transparent' }} />
          <span className="text-muted">Lade Kalender...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mein Kalender</h1>
          <p className="text-muted">
            {todaysAppointments.length} Termine heute · {totalWeekAppointments} diese Woche
          </p>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Heute
          </button>
          <button
            onClick={goToPreviousWeek}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Icons.ChevronLeft />
          </button>
          <span className="text-sm font-medium min-w-[200px] text-center">
            {formatWeekRange()}
          </span>
          <button
            onClick={goToNextWeek}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Icons.ChevronRight />
          </button>
        </div>
      </div>

      {/* Week Grid */}
      <div className="bg-zinc-900 rounded-xl border border-border overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {weekDates.map((date, i) => (
            <div
              key={i}
              className={`
                p-3 text-center border-r border-border last:border-r-0
                ${isToday(date) ? 'bg-zinc-800' : ''}
                ${isSunday(date) ? 'opacity-50' : ''}
              `}
            >
              <div className="text-xs text-muted">{dayNames[i]}</div>
              <div
                className={`
                  text-lg font-semibold mt-1
                  ${isToday(date) ? '' : ''}
                `}
                style={isToday(date) ? { color: primaryColor } : {}}
              >
                {formatDisplayDate(date)}
              </div>
            </div>
          ))}
        </div>

        {/* Day Columns with Appointments */}
        <div className="grid grid-cols-7 min-h-[400px]">
          {weekDates.map((date, i) => {
            const dayAppointments = getAppointmentsForDate(date)
            const sunday = isSunday(date)

            return (
              <div
                key={i}
                className={`
                  p-2 border-r border-border last:border-r-0 min-h-[400px]
                  ${sunday ? 'bg-zinc-950/50' : ''}
                  ${isToday(date) ? 'bg-zinc-800/30' : ''}
                `}
              >
                {sunday ? (
                  <div className="text-center text-muted text-sm py-8">
                    Geschlossen
                  </div>
                ) : dayAppointments.length === 0 ? (
                  <div className="text-center text-muted text-sm py-8">
                    Keine Termine
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="p-2 rounded-lg text-sm"
                        style={{ backgroundColor: `${primaryColor}20`, borderLeft: `3px solid ${primaryColor}` }}
                      >
                        <div className="font-semibold flex items-center gap-1">
                          <Icons.Clock />
                          {apt.time_slot}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-foreground">
                          <Icons.User />
                          <span className="truncate">{apt.customer_name}</span>
                        </div>
                        {apt.service && (
                          <div className="text-muted text-xs mt-1 truncate">
                            {(apt.service as { name: string }).name}
                          </div>
                        )}
                        {apt.customer_phone && (
                          <a
                            href={`tel:${apt.customer_phone}`}
                            className="mt-1 flex items-center gap-1 text-xs hover:underline"
                            style={{ color: primaryColor }}
                          >
                            <Icons.Phone />
                            {apt.customer_phone}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Today's Appointments Detail (Mobile-friendly list) */}
      <div className="lg:hidden">
        <h2 className="text-lg font-semibold mb-4">Heute ({formatDisplayDate(new Date())})</h2>
        {todaysAppointments.length === 0 ? (
          <div className="bg-zinc-900 rounded-xl border border-border p-6 text-center text-muted">
            Keine Termine heute
          </div>
        ) : (
          <div className="space-y-3">
            {todaysAppointments.map((apt) => (
              <div
                key={apt.id}
                className="bg-zinc-900 rounded-xl border border-border p-4"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="font-bold text-lg"
                    style={{ color: primaryColor }}
                  >
                    {apt.time_slot}
                  </span>
                  {apt.service && (
                    <span className="text-sm text-muted">
                      {(apt.service as { name: string; duration: number }).name} ({(apt.service as { duration: number }).duration} Min)
                    </span>
                  )}
                </div>
                <div className="mt-2 font-medium">{apt.customer_name}</div>
                {apt.customer_phone && (
                  <a
                    href={`tel:${apt.customer_phone}`}
                    className="mt-1 inline-flex items-center gap-1 text-sm hover:underline"
                    style={{ color: primaryColor }}
                  >
                    <Icons.Phone />
                    {apt.customer_phone}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
