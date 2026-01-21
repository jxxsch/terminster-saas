import { NextRequest, NextResponse } from 'next/server';
import { sendPinResetEmail } from '@/lib/email';

// Admin-E-Mail und PIN aus Umgebungsvariablen
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

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

    // Prüfen ob die E-Mail mit der Admin-E-Mail übereinstimmt
    // Aus Sicherheitsgründen geben wir immer die gleiche Antwort zurück
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && ADMIN_EMAIL) {
      // PIN per E-Mail senden
      const result = await sendPinResetEmail(email, ADMIN_PIN);

      if (!result.success) {
        console.error('PIN reset email failed:', result.error);
      }
    }

    // Immer gleiche Antwort (verhindert E-Mail-Enumeration)
    return NextResponse.json({
      success: true,
      message: 'Falls diese E-Mail registriert ist, wurde die PIN gesendet.',
    });
  } catch (error) {
    console.error('PIN reset error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
}
