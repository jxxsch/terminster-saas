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

// GET /api/widget/[tenant]/hours?shop=slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantSlug } = await params
    const shopSlug = request.nextUrl.searchParams.get('shop')
    const supabase = getSupabase()

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

    // Get opening hours
    const { data: hours } = await supabase
      .from('opening_hours')
      .select('day_of_week, open_time, close_time, is_closed')
      .eq('shop_id', shop.id)
      .order('day_of_week', { ascending: true })

    // Get closed dates (next 60 days)
    const today = new Date()
    const futureDate = new Date()
    futureDate.setDate(today.getDate() + 60)

    const { data: closedDates } = await supabase
      .from('closed_dates')
      .select('date, reason')
      .eq('shop_id', shop.id)
      .gte('date', today.toISOString().split('T')[0])
      .lte('date', futureDate.toISOString().split('T')[0])

    // Get open sundays (next 60 days)
    const { data: openSundays } = await supabase
      .from('open_sundays')
      .select('date, open_time, close_time')
      .eq('shop_id', shop.id)
      .gte('date', today.toISOString().split('T')[0])
      .lte('date', futureDate.toISOString().split('T')[0])

    const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

    return NextResponse.json(
      {
        openingHours: (hours || []).map((h) => ({
          dayOfWeek: h.day_of_week,
          dayName: dayNames[h.day_of_week],
          openTime: h.open_time,
          closeTime: h.close_time,
          isClosed: h.is_closed,
        })),
        closedDates: (closedDates || []).map((c) => ({
          date: c.date,
          reason: c.reason,
        })),
        openSundays: (openSundays || []).map((o) => ({
          date: o.date,
          openTime: o.open_time,
          closeTime: o.close_time,
        })),
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('Hours API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
