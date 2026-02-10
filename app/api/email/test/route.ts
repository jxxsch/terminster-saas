import { NextRequest, NextResponse } from 'next/server';
import {
  sendBookingConfirmation,
  sendAppointmentReminder,
  sendRescheduleConfirmation,
  sendAccountInviteEmail,
  sendPasswordResetEmail,
} from '@/lib/email';
import { getTeam, getServices, formatPrice } from '@/lib/supabase';

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

    // Echte Team- und Service-Daten aus Supabase laden
    const team = await getTeam();
    const services = await getServices();

    const barber1 = team[0];
    const barber2 = team[1] || team[0];
    const service1 = services[0];
    const service2 = services[1] || services[0];

    if (!barber1 || !service1) {
      return NextResponse.json(
        { error: 'Keine Team- oder Service-Daten gefunden' },
        { status: 500 }
      );
    }

    const results: Record<string, { success: boolean; error?: string }> = {};

    // 1. Buchungsbestätigung
    results.booking = await sendBookingConfirmation({
      customerName: 'Max Mustermann',
      customerEmail: email,
      customerPhone: '+49 176 12345678',
      barberName: barber1.name,
      barberImage: barber1.image || undefined,
      imagePosition: barber1.image_position || undefined,
      imageScale: barber1.image_scale || undefined,
      imagePositionEmail: barber1.image_position_email || undefined,
      imageScaleEmail: barber1.image_scale_email || undefined,
      serviceName: service1.name,
      date: '2026-02-10',
      time: '14:00',
      duration: service1.duration,
      price: formatPrice(service1.price),
      appointmentId: 'test-booking-123',
    });

    await delay(600);

    // 2. Terminerinnerung
    results.reminder = await sendAppointmentReminder({
      customerName: 'Max Mustermann',
      customerEmail: email,
      barberName: barber2.name,
      barberImage: barber2.image || undefined,
      imagePosition: barber2.image_position || undefined,
      imageScale: barber2.image_scale || undefined,
      imagePositionEmail: barber2.image_position_email || undefined,
      imageScaleEmail: barber2.image_scale_email || undefined,
      serviceName: service2.name,
      date: '2026-02-11',
      time: '10:30',
      duration: service2.duration,
      price: formatPrice(service2.price),
      appointmentId: 'test-reminder-456',
    });

    await delay(600);

    // 3. Termin verschoben
    const barber3 = team[2] || team[0];
    const barber4 = team[3] || team[1] || team[0];

    results.reschedule = await sendRescheduleConfirmation({
      customerName: 'Max Mustermann',
      customerEmail: email,
      oldBarberName: barber3.name,
      oldBarberImage: barber3.image || undefined,
      oldImagePosition: barber3.image_position || undefined,
      oldDate: '2026-02-10',
      oldTime: '15:00',
      newBarberName: barber4.name,
      newBarberImage: barber4.image || undefined,
      newImagePosition: barber4.image_position || undefined,
      newImageScale: barber4.image_scale || undefined,
      newImagePositionEmail: barber4.image_position_email || undefined,
      newImageScaleEmail: barber4.image_scale_email || undefined,
      newDate: '2026-02-12',
      newTime: '11:00',
      serviceName: service1.name,
      duration: service1.duration,
      price: formatPrice(service1.price),
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
      teamUsed: team.map(t => ({ name: t.name, image: t.image })),
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
