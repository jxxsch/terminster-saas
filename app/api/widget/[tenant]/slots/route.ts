import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// GET /api/widget/[tenant]/slots?shop=slug&barber=id&date=YYYY-MM-DD
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantSlug } = await params
    const shopSlug = request.nextUrl.searchParams.get('shop')
    const barberId = request.nextUrl.searchParams.get('barber')
    const dateStr = request.nextUrl.searchParams.get('date')
    const supabase = getSupabase()

    if (!barberId || !dateStr) {
      return NextResponse.json(
        { error: 'Missing required parameters: barber, date' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate date format
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .single()

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Get shop
    let shopQuery = supabase
      .from('shops')
      .select('id, bundesland')
      .eq('tenant_id', tenant.id)
      .eq('active', true)

    if (shopSlug) {
      shopQuery = shopQuery.eq('slug', shopSlug)
    }

    const { data: shop } = await shopQuery.single()

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Get barber info (for free_day check)
    const { data: barber } = await supabase
      .from('team')
      .select('id, free_day')
      .eq('id', barberId)
      .eq('shop_id', shop.id)
      .single()

    if (!barber) {
      return NextResponse.json(
        { error: 'Barber not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Check if it's barber's free day
    const dayOfWeek = date.getDay() // 0=So, 1=Mo, ..., 6=Sa
    const dayMapping = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 } // Mo-Fr
    if (barber.free_day && dayMapping[dayOfWeek as keyof typeof dayMapping] === barber.free_day) {
      return NextResponse.json(
        { slots: [], message: 'Barber has day off' },
        { headers: corsHeaders }
      )
    }

    // Check if shop is closed on this day
    const { data: openingHours } = await supabase
      .from('opening_hours')
      .select('is_closed, open_time, close_time')
      .eq('shop_id', shop.id)
      .eq('day_of_week', dayOfWeek)
      .single()

    if (openingHours?.is_closed) {
      // Check for open sunday exception
      if (dayOfWeek === 0) {
        const { data: openSunday } = await supabase
          .from('open_sundays')
          .select('open_time, close_time')
          .eq('shop_id', shop.id)
          .eq('date', dateStr)
          .single()

        if (!openSunday) {
          return NextResponse.json(
            { slots: [], message: 'Shop is closed' },
            { headers: corsHeaders }
          )
        }
      } else {
        return NextResponse.json(
          { slots: [], message: 'Shop is closed' },
          { headers: corsHeaders }
        )
      }
    }

    // Check closed dates
    const { data: closedDate } = await supabase
      .from('closed_dates')
      .select('id')
      .eq('shop_id', shop.id)
      .eq('date', dateStr)
      .single()

    if (closedDate) {
      return NextResponse.json(
        { slots: [], message: 'Shop is closed on this date' },
        { headers: corsHeaders }
      )
    }

    // Check barber vacation
    const { data: timeOff } = await supabase
      .from('staff_time_off')
      .select('id')
      .eq('staff_id', barberId)
      .lte('start_date', dateStr)
      .gte('end_date', dateStr)
      .single()

    if (timeOff) {
      return NextResponse.json(
        { slots: [], message: 'Barber is on vacation' },
        { headers: corsHeaders }
      )
    }

    // Get all time slots
    const { data: timeSlots } = await supabase
      .from('time_slots')
      .select('id, time')
      .eq('shop_id', shop.id)
      .eq('active', true)
      .order('sort_order', { ascending: true })

    // Get booked appointments for this barber on this date
    const { data: appointments } = await supabase
      .from('appointments')
      .select('time_slot')
      .eq('shop_id', shop.id)
      .eq('barber_id', barberId)
      .eq('date', dateStr)
      .neq('status', 'cancelled')

    const bookedSlots = new Set((appointments || []).map((a) => a.time_slot))

    // Get series appointments
    const { data: series } = await supabase
      .from('series')
      .select('time_slot, day_of_week, interval_type, interval_weeks, start_date, end_date')
      .eq('shop_id', shop.id)
      .eq('barber_id', barberId)
      .lte('start_date', dateStr)

    // Check if date matches any series
    const seriesDate = new Date(dateStr)
    ;(series || []).forEach((s: { time_slot: string; day_of_week: number; interval_type: string; interval_weeks?: number; start_date: string; end_date?: string }) => {
      if (s.end_date && new Date(s.end_date) < seriesDate) return
      if (s.day_of_week !== (seriesDate.getDay() === 0 ? 7 : seriesDate.getDay())) return

      // Check interval (alle Intervalle als "Alle N Wochen")
      const intervalWeeks = s.interval_weeks || (
        s.interval_type === 'biweekly' ? 2 :
        s.interval_type === 'monthly' ? 4 : 1
      )
      if (intervalWeeks > 1) {
        const startDate = new Date(s.start_date)
        const weeksDiff = Math.floor(
          (seriesDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
        )
        if (weeksDiff % intervalWeeks !== 0) return
      }

      bookedSlots.add(s.time_slot)
    })

    // Filter out past slots for today
    const now = new Date()
    const isToday = dateStr === now.toISOString().split('T')[0]

    const availableSlots = (timeSlots || [])
      .filter((slot) => {
        if (bookedSlots.has(slot.time)) return false

        if (isToday) {
          const [hours, minutes] = slot.time.split(':').map(Number)
          const slotTime = new Date(now)
          slotTime.setHours(hours, minutes, 0, 0)
          if (slotTime <= now) return false
        }

        return true
      })
      .map((slot) => ({
        id: slot.id,
        time: slot.time,
      }))

    return NextResponse.json(
      { slots: availableSlots },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('Slots API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
