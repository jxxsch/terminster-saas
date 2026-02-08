import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// DELETE /api/invitations/[id] - Cancel/delete invitation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabase()

    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete invitation:', error)
      return NextResponse.json(
        { error: 'Failed to delete invitation' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Invitation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/invitations/[id] - Get invitation details (by ID or token)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabase()

    // Check if it's a token (64 chars hex) or UUID
    const isToken = id.length === 64 && /^[a-f0-9]+$/.test(id)

    let query = supabase
      .from('invitations')
      .select(`
        id,
        email,
        role,
        shop_ids,
        expires_at,
        accepted_at,
        created_at,
        tenant:tenants(id, name, slug, primary_color)
      `)

    if (isToken) {
      query = query.eq('token', id)
    } else {
      query = query.eq('id', id)
    }

    const { data: invitation, error } = await query.single()

    if (error || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if expired
    const isExpired = new Date(invitation.expires_at) < new Date()
    const isAccepted = !!invitation.accepted_at

    return NextResponse.json({
      invitation: {
        ...invitation,
        is_expired: isExpired,
        is_accepted: isAccepted,
        is_valid: !isExpired && !isAccepted,
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
