import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// POST /api/invitations/accept - Accept invitation
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const body = await request.json()

    const { token, user_id, name } = body

    if (!token || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: token, user_id' },
        { status: 400 }
      )
    }

    // Get invitation
    const { data: invitation, error: invError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single()

    if (invError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if already accepted
    if (invitation.accepted_at) {
      return NextResponse.json(
        { error: 'Invitation has already been accepted' },
        { status: 400 }
      )
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // Check if user already member
    const { data: existingMember } = await supabase
      .from('tenant_users')
      .select('id')
      .eq('tenant_id', invitation.tenant_id)
      .eq('user_id', user_id)
      .single()

    if (existingMember) {
      // Mark invitation as accepted anyway
      await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id)

      return NextResponse.json(
        { error: 'You are already a member of this organization' },
        { status: 400 }
      )
    }

    // Create tenant_user record
    const { data: tenantUser, error: createError } = await supabase
      .from('tenant_users')
      .insert({
        user_id,
        tenant_id: invitation.tenant_id,
        role: invitation.role,
        shop_ids: invitation.shop_ids,
        email: invitation.email,
        name: name || null,
      })
      .select()
      .single()

    if (createError) {
      console.error('Failed to create tenant_user:', createError)
      return NextResponse.json(
        { error: 'Failed to accept invitation' },
        { status: 500 }
      )
    }

    // Mark invitation as accepted
    await supabase
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    // Get tenant info for redirect
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('id', invitation.tenant_id)
      .single()

    // Determine redirect URL based on role
    let redirectUrl = '/'
    if (invitation.role === 'tenant_owner') {
      redirectUrl = `/tenant/${invitation.tenant_id}`
    } else if (invitation.role === 'shop_admin' && invitation.shop_ids?.length === 1) {
      redirectUrl = `/shop/${invitation.shop_ids[0]}/calendar`
    } else if (invitation.role === 'barber' && invitation.shop_ids?.length === 1) {
      redirectUrl = `/barber/${invitation.shop_ids[0]}`
    }

    return NextResponse.json({
      success: true,
      tenant_user: tenantUser,
      tenant,
      redirect_url: redirectUrl,
    })
  } catch (error) {
    console.error('Accept invitation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
