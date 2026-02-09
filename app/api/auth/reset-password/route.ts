import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'E-Mail ist erforderlich' },
        { status: 400 }
      );
    }

    // Immer Success zurückgeben (verhindert E-Mail-Enumeration)
    const successResponse = NextResponse.json({
      success: true,
      message: 'Falls ein Konto mit dieser E-Mail existiert, wurde eine E-Mail gesendet.',
    });

    const supabase = createAdminClient();

    // Prüfen ob Auth-User mit dieser E-Mail existiert
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!existingUser) {
      // Kein User gefunden - trotzdem Success zurückgeben
      return successResponse;
    }

    // Kundennamen aus customers-Tabelle laden
    let customerName = '';
    const { data: customer } = await supabase
      .from('customers')
      .select('first_name, last_name, name')
      .eq('email', email.toLowerCase())
      .single();

    if (customer) {
      customerName = customer.first_name && customer.last_name
        ? `${customer.first_name} ${customer.last_name}`
        : customer.name || '';
    }

    // Recovery-Link generieren
    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://terminster.com').trim();
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email.toLowerCase(),
      options: {
        redirectTo: `${baseUrl}/de`,
      },
    });

    if (linkError) {
      console.error('Generate recovery link error:', linkError);
      return successResponse;
    }

    let resetUrl = linkData.properties?.action_link;

    if (!resetUrl) {
      console.error('No action_link in recovery response');
      return successResponse;
    }

    // Link-Domain korrigieren (Supabase verwendet seine eigene Site URL)
    const correctedBaseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://terminster.com').trim();
    try {
      const url = new URL(resetUrl);
      const redirectTo = url.searchParams.get('redirect_to');
      if (redirectTo) {
        const newRedirectTo = `${correctedBaseUrl}/de`;
        url.searchParams.set('redirect_to', newRedirectTo);
        resetUrl = url.toString();
      }
    } catch {
      console.warn('Could not modify reset URL');
    }

    // Gebrandete E-Mail über Resend senden
    const emailResult = await sendPasswordResetEmail({
      customerEmail: email.toLowerCase(),
      customerName,
      resetUrl,
    });

    if (!emailResult.success) {
      console.error('Password reset email error:', emailResult.error);
    }

    return successResponse;

  } catch (error) {
    console.error('Reset password error:', error);
    // Auch bei Fehlern Success zurückgeben (E-Mail-Enumeration verhindern)
    return NextResponse.json({
      success: true,
      message: 'Falls ein Konto mit dieser E-Mail existiert, wurde eine E-Mail gesendet.',
    });
  }
}
