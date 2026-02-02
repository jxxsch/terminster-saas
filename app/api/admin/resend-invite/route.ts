import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendAccountInviteEmail } from '@/lib/email';

interface ResendInviteRequest {
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ResendInviteRequest = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'E-Mail ist erforderlich' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Benutzer finden
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingAuthUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!existingAuthUser) {
      return NextResponse.json(
        { error: 'Kein Benutzer mit dieser E-Mail gefunden' },
        { status: 404 }
      );
    }

    // User Metadata auslesen
    const metadata = existingAuthUser.user_metadata || {};
    const firstName = metadata.first_name || 'Kunde';
    const lastName = metadata.last_name || '';

    // Neuen Einladungs-Link generieren
    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://terminster.com').trim();
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: email.toLowerCase(),
      options: {
        redirectTo: `${baseUrl}/de`,
      },
    });

    if (linkError) {
      console.error('Generate link error:', linkError);
      return NextResponse.json(
        { error: 'Link konnte nicht generiert werden' },
        { status: 500 }
      );
    }

    let activationUrl = linkData.properties?.action_link;

    if (!activationUrl) {
      console.error('No action_link in response');
      return NextResponse.json(
        { error: 'Aktivierungslink konnte nicht erstellt werden' },
        { status: 500 }
      );
    }

    // Link-Domain korrigieren
    const correctedBaseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://terminster.com').trim();
    try {
      const url = new URL(activationUrl);
      const redirectTo = url.searchParams.get('redirect_to');
      if (redirectTo) {
        const newRedirectTo = `${correctedBaseUrl}/de`;
        url.searchParams.set('redirect_to', newRedirectTo);
        activationUrl = url.toString();
      }
    } catch {
      console.warn('Could not modify activation URL');
    }

    // E-Mail senden
    const emailResult = await sendAccountInviteEmail({
      customerName: `${firstName} ${lastName}`.trim(),
      customerEmail: email.toLowerCase(),
      activationUrl,
    });

    if (!emailResult.success) {
      console.error('Email send error:', emailResult.error);
      return NextResponse.json(
        { error: 'E-Mail konnte nicht gesendet werden' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Einladungs-E-Mail erneut gesendet',
    });

  } catch (error) {
    console.error('Resend invite error:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}
