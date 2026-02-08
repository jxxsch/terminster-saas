import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// CORS headers for widget
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
}

// Create Supabase admin client
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Handle CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// GET /api/widget/[tenant] - Get tenant info and default shop
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantSlug } = await params
    const supabase = getSupabase()

    // Get tenant by slug
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, slug, primary_color, logo_url, settings')
      .eq('slug', tenantSlug)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Get shops for this tenant
    const { data: shops } = await supabase
      .from('shops')
      .select('id, name, slug, address, phone, timezone, bundesland')
      .eq('tenant_id', tenant.id)
      .eq('active', true)
      .order('created_at', { ascending: true })

    return NextResponse.json(
      {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          primaryColor: tenant.primary_color,
          logoUrl: tenant.logo_url,
          settings: tenant.settings,
        },
        shops: shops || [],
        defaultShop: shops?.[0] || null,
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('Widget API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
