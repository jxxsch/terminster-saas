import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendAccountInviteEmail } from '@/lib/email';

interface InviteRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: InviteRequest = await request.json();
    const { email, firstName, lastName, phone } = body;

    // Validierung
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'E-Mail, Vorname und Nachname sind erforderlich' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Prüfen ob bereits ein Auth-User mit dieser E-Mail existiert
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingAuthUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingAuthUser) {
      return NextResponse.json(
        { error: 'Ein Konto mit dieser E-Mail existiert bereits' },
        { status: 409 }
      );
    }

    // Prüfen ob Customer mit dieser E-Mail bereits ein Konto hat
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, auth_id, name')
      .eq('email', email.toLowerCase())
      .single();

    if (existingCustomer?.auth_id) {
      return NextResponse.json(
        { error: 'Dieser Kunde hat bereits ein Konto' },
        { status: 409 }
      );
    }

    // Auth-User erstellen
    // HINWEIS: Der Database-Trigger "on_auth_user_created" erstellt automatisch
    // einen Customer-Eintrag oder verknüpft einen bestehenden Customer
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      email_confirm: false,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
      },
    });

    if (createError) {
      console.error('Create user error:', createError);
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      );
    }

    const authUserId = createData.user?.id;

    if (!authUserId) {
      return NextResponse.json(
        { error: 'Benutzer konnte nicht erstellt werden' },
        { status: 500 }
      );
    }

    // Einladungs-Link generieren (damit Kunde Passwort setzen kann)
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
      await supabase.auth.admin.deleteUser(authUserId);
      return NextResponse.json(
        { error: 'Link konnte nicht generiert werden' },
        { status: 500 }
      );
    }

    let activationUrl = linkData.properties?.action_link;

    if (!activationUrl) {
      console.error('No action_link in response');
      await supabase.auth.admin.deleteUser(authUserId);
      return NextResponse.json(
        { error: 'Aktivierungslink konnte nicht erstellt werden' },
        { status: 500 }
      );
    }

    // Link-Domain korrigieren (Supabase verwendet seine eigene Site URL)
    // Wir ersetzen die Redirect-Domain mit unserer eigenen
    const correctedBaseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://terminster.com').trim();
    try {
      const url = new URL(activationUrl);
      const redirectTo = url.searchParams.get('redirect_to');
      if (redirectTo) {
        // Ersetze die Domain im redirect_to Parameter
        const newRedirectTo = `${correctedBaseUrl}/de`;
        url.searchParams.set('redirect_to', newRedirectTo);
        activationUrl = url.toString();
      }
    } catch {
      // Falls URL-Parsing fehlschlägt, Original verwenden
      console.warn('Could not modify activation URL');
    }

    // Eigene Beban-E-Mail über Resend senden
    const emailResult = await sendAccountInviteEmail({
      customerName: `${firstName} ${lastName}`,
      customerEmail: email.toLowerCase(),
      activationUrl,
    });

    if (!emailResult.success) {
      console.error('Email send error:', emailResult.error);
      // Kunde wurde erstellt, aber E-Mail fehlgeschlagen - wir loggen es nur
    }

    return NextResponse.json({
      success: true,
      message: 'Kundenkonto erstellt und Einladungs-E-Mail gesendet',
      emailSent: emailResult.success,
    });

  } catch (error) {
    console.error('Invite customer error:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}
