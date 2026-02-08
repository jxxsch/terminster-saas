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

// GET /api/widget/[tenant]/services?shop=slug
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

    // Get services
    const { data: services } = await supabase
      .from('services')
      .select('id, name, price, duration')
      .eq('shop_id', shop.id)
      .eq('active', true)
      .eq('show_in_calendar', true)
      .order('sort_order', { ascending: true })

    return NextResponse.json(
      {
        services: (services || []).map((s) => ({
          id: s.id,
          name: s.name,
          price: s.price,
          priceFormatted: new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR',
          }).format(s.price / 100),
          duration: s.duration,
          durationFormatted: `${s.duration} Min.`,
        })),
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('Services API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
