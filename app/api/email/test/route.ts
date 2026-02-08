import { NextRequest, NextResponse } from 'next/server';
import {
  sendBookingConfirmation,
  sendAppointmentReminder,
  sendAccountInviteEmail,
} from '@/lib/email';

// Test-Endpoint zum Versenden aller 3 E-Mail-Typen
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

    const results: {
      booking: { success: boolean; error?: string };
      reminder: { success: boolean; error?: string };
      account: { success: boolean; error?: string };
    } = {
      booking: { success: false },
      reminder: { success: false },
      account: { success: false },
    };

    // 1. Buchungsbestätigung
    const bookingResult = await sendBookingConfirmation({
      customerName: 'Max Mustermann',
      customerEmail: email,
      customerPhone: '+49 176 12345678',
      barberName: 'Khalid',
      barberImage: 'https://terminster.com/team/khalid.webp',
      imagePosition: 'center 30%',
      serviceName: 'Haarschnitt',
      date: '2026-02-10',
      time: '14:00',
      duration: 30,
      price: '20,00 €',
      appointmentId: 'test-booking-123',
    });
    results.booking = bookingResult;

    // 2. Terminerinnerung
    const reminderResult = await sendAppointmentReminder({
      customerName: 'Max Mustermann',
      customerEmail: email,
      barberName: 'Khalid',
      barberImage: 'https://terminster.com/team/khalid.webp',
      imagePosition: 'center 30%',
      serviceName: 'Haarschnitt',
      date: '2026-02-06',
      time: '10:30',
      duration: 30,
      price: '20,00 €',
      appointmentId: 'test-reminder-456',
    });
    results.reminder = reminderResult;

    // 3. Konto-Einladung
    const accountResult = await sendAccountInviteEmail({
      customerName: 'Max Mustermann',
      customerEmail: email,
      activationUrl: 'https://beban-barbershop.de/activate?token=test-token-789',
    });
    results.account = accountResult;

    const allSuccess = results.booking.success && results.reminder.success && results.account.success;

    return NextResponse.json({
      success: allSuccess,
      results,
      message: allSuccess
        ? 'Alle 3 Test-E-Mails wurden erfolgreich gesendet!'
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
