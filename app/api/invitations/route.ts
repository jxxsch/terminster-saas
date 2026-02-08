import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Create Supabase admin client
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Generate secure token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// POST /api/invitations - Create new invitation
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const body = await request.json()

    const { tenant_id, email, role, shop_ids, invited_by } = body

    if (!tenant_id || !email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: tenant_id, email, role' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['tenant_owner', 'shop_admin', 'barber'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be tenant_owner, shop_admin, or barber' },
        { status: 400 }
      )
    }

    // Check if user already exists in tenant
    const { data: existingUser } = await supabase
      .from('tenant_users')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User is already a member of this tenant' },
        { status: 409 }
      )
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('email', email.toLowerCase())
      .is('accepted_at', null)
      .single()

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An invitation for this email already exists' },
        { status: 409 }
      )
    }

    // Create invitation
    const token = generateToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        tenant_id,
        email: email.toLowerCase(),
        role,
        shop_ids: shop_ids || [],
        token,
        invited_by,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create invitation:', error)
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      )
    }

    // Get tenant info for email
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenant_id)
      .single()

    // TODO: Send invitation email
    // await sendInvitationEmail({
    //   to: email,
    //   tenantName: tenant?.name || 'Unknown',
    //   inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`,
    //   role,
    // })

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        shop_ids: invitation.shop_ids,
        expires_at: invitation.expires_at,
        invite_url: `/invite/${token}`,
      },
    })
  } catch (error) {
    console.error('Invitation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/invitations?tenant_id=xxx - List invitations for tenant
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const tenantId = request.nextUrl.searchParams.get('tenant_id')

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenant_id is required' },
        { status: 400 }
      )
    }

    const { data: invitations, error } = await supabase
      .from('invitations')
      .select('id, email, role, shop_ids, expires_at, accepted_at, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch invitations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      )
    }

    // Separate pending and accepted
    const pending = invitations?.filter((i) => !i.accepted_at) || []
    const accepted = invitations?.filter((i) => i.accepted_at) || []

    return NextResponse.json({
      invitations: pending,
      accepted,
    })
  } catch (error) {
    console.error('Invitation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
