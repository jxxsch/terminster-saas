import { NextRequest, NextResponse } from 'next/server';
import { sendAccountInviteEmail } from '@/lib/email';

// Test-Endpoint nur für Konto-Einladung
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'E-Mail-Adresse ist erforderlich' },
        { status: 400 }
      );
    }

    const result = await sendAccountInviteEmail({
      customerName: 'Max Mustermann',
      customerEmail: email,
      activationUrl: 'https://beban-barbershop.de/activate?token=test-token-789',
    });

    return NextResponse.json({
      success: result.success,
      error: result.error,
      message: result.success
        ? 'Konto-Einladung wurde erfolgreich gesendet!'
        : 'E-Mail konnte nicht gesendet werden.',
    });

  } catch (error) {
    console.error('Account Invite Test API error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler', details: String(error) },
      { status: 500 }
    );
  }
}
