import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

interface BookingRequest {
  shop?: string // shop slug
  serviceId: string
  barberId: string
  date: string // YYYY-MM-DD
  time: string // HH:MM
  customerName: string
  customerEmail?: string
  customerPhone?: string
}

// POST /api/widget/[tenant]/book
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantSlug } = await params
    const body: BookingRequest = await request.json()
    const supabase = getSupabase()

    // Validate required fields
    const { serviceId, barberId, date, time, customerName } = body
    if (!serviceId || !barberId || !date || !time || !customerName) {
      return NextResponse.json(
        { error: 'Missing required fields: serviceId, barberId, date, time, customerName' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate date is in the future
    const bookingDate = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (bookingDate < today) {
      return NextResponse.json(
        { error: 'Cannot book appointments in the past' },
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
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('active', true)

    if (body.shop) {
      shopQuery = shopQuery.eq('slug', body.shop)
    }

    const { data: shop } = await shopQuery.single()

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Verify barber exists and is active
    const { data: barber } = await supabase
      .from('team')
      .select('id, name')
      .eq('id', barberId)
      .eq('shop_id', shop.id)
      .eq('active', true)
      .single()

    if (!barber) {
      return NextResponse.json(
        { error: 'Barber not found or inactive' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Verify service exists and is active
    const { data: service } = await supabase
      .from('services')
      .select('id, name, price, duration')
      .eq('id', serviceId)
      .eq('shop_id', shop.id)
      .eq('active', true)
      .single()

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found or inactive' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Check if slot is still available (prevent double booking)
    const { data: existingAppointment } = await supabase
      .from('appointments')
      .select('id')
      .eq('shop_id', shop.id)
      .eq('barber_id', barberId)
      .eq('date', date)
      .eq('time_slot', time)
      .neq('status', 'cancelled')
      .single()

    if (existingAppointment) {
      return NextResponse.json(
        { error: 'This time slot is no longer available' },
        { status: 409, headers: corsHeaders }
      )
    }

    // Create appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        shop_id: shop.id,
        barber_id: barberId,
        service_id: serviceId,
        date: date,
        time_slot: time,
        customer_name: customerName,
        customer_email: body.customerEmail || null,
        customer_phone: body.customerPhone || null,
        status: 'confirmed',
        source: 'widget',
      })
      .select()
      .single()

    if (appointmentError) {
      // Check for unique constraint violation (double booking)
      if (appointmentError.code === '23505') {
        return NextResponse.json(
          { error: 'This time slot is no longer available' },
          { status: 409, headers: corsHeaders }
        )
      }
      throw appointmentError
    }

    // Format date for response
    const formattedDate = new Date(date).toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

    return NextResponse.json(
      {
        success: true,
        appointment: {
          id: appointment.id,
          date: formattedDate,
          time: time,
          service: service.name,
          barber: barber.name,
          price: new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR',
          }).format(service.price / 100),
        },
        message: 'Termin erfolgreich gebucht!',
      },
      { status: 201, headers: corsHeaders }
    )
  } catch (error) {
    console.error('Book API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
