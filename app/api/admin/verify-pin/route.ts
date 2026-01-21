import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin } = body;

    if (!pin) {
      return NextResponse.json(
        { success: false, error: 'PIN ist erforderlich' },
        { status: 400 }
      );
    }

    const isValid = pin === ADMIN_PIN;

    return NextResponse.json({ success: isValid });
  } catch (error) {
    console.error('PIN verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
}
