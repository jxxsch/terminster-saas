import { NextRequest, NextResponse } from 'next/server';
import {
  sendBookingConfirmation,
  sendAppointmentReminder,
  sendRescheduleConfirmation,
  sendAccountInviteEmail,
  sendPasswordResetEmail,
} from '@/lib/email';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Test-Endpoint zum Versenden aller E-Mail-Typen
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

    const results: Record<string, { success: boolean; error?: string }> = {};

    // 1. Buchungsbestätigung
    results.booking = await sendBookingConfirmation({
      customerName: 'Max Mustermann',
      customerEmail: email,
      customerPhone: '+49 176 12345678',
      barberName: 'Khalid',
      barberImage: '/team/khalid.webp',
      imagePosition: 'center 30%',
      serviceName: 'Haarschnitt',
      date: '2026-02-10',
      time: '14:00',
      duration: 30,
      price: '20,00 €',
      appointmentId: 'test-booking-123',
    });

    await delay(600);

    // 2. Terminerinnerung
    results.reminder = await sendAppointmentReminder({
      customerName: 'Max Mustermann',
      customerEmail: email,
      barberName: 'Sahir',
      barberImage: '/team/sahir.webp',
      imagePosition: '51% 32%',
      serviceName: 'Haare & Bart',
      date: '2026-02-11',
      time: '10:30',
      duration: 45,
      price: '35,00 €',
      appointmentId: 'test-reminder-456',
    });

    await delay(600);

    // 3. Termin verschoben
    results.reschedule = await sendRescheduleConfirmation({
      customerName: 'Max Mustermann',
      customerEmail: email,
      oldBarberName: 'Sakvan',
      oldBarberImage: '/team/sakvan.webp',
      oldImagePosition: 'center 30%',
      oldDate: '2026-02-10',
      oldTime: '15:00',
      newBarberName: 'Mansur',
      newBarberImage: '/team/mansur.webp',
      newImagePosition: 'center 30%',
      newDate: '2026-02-12',
      newTime: '11:00',
      serviceName: 'Bartrasur',
      duration: 20,
      price: '15,00 €',
      appointmentId: 'test-reschedule-789',
      barberChanged: true,
    });

    await delay(600);

    // 4. Konto-Einladung
    results.invite = await sendAccountInviteEmail({
      customerName: 'Max Mustermann',
      customerEmail: email,
      activationUrl: 'https://terminster.com/de#type=invite&access_token=test-token-789',
    });

    await delay(600);

    // 5. Passwort-Reset
    results.passwordReset = await sendPasswordResetEmail({
      customerName: 'Max Mustermann',
      customerEmail: email,
      resetUrl: 'https://terminster.com/de#type=recovery&access_token=test-token-reset',
    });

    const allSuccess = Object.values(results).every(r => r.success);

    return NextResponse.json({
      success: allSuccess,
      results,
      message: allSuccess
        ? `Alle ${Object.keys(results).length} Test-E-Mails wurden erfolgreich gesendet!`
        : 'Einige E-Mails konnten nicht gesendet werden.',
    });

  } catch (error) {
    console.error('Test Email API error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler', details: String(error) },
      { status: 500 }
    );
  }
}
