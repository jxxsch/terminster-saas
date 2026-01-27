import { NextRequest, NextResponse } from 'next/server';
import { getAppointments, getTeam, getServices, formatPrice } from '@/lib/supabase';
import { sendAppointmentReminder } from '@/lib/email';

// Diese Route wird von einem Cron-Job aufgerufen (täglich um 00:01 deutscher Zeit / 23:01 UTC)
// Vercel Cron: https://vercel.com/docs/cron-jobs

export async function GET(request: NextRequest) {
  // Optionale Authentifizierung über einen Secret-Header
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Datum für morgen berechnen
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Alle Termine für morgen laden
    const appointments = await getAppointments(tomorrowStr, tomorrowStr);
    const team = await getTeam();
    const services = await getServices();

    // Nur Termine mit E-Mail-Adresse und Status "confirmed"
    const appointmentsToRemind = appointments.filter(
      apt => apt.customer_email && apt.status === 'confirmed'
    );

    const results = {
      total: appointmentsToRemind.length,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const appointment of appointmentsToRemind) {
      const barber = team.find(b => b.id === appointment.barber_id);
      const service = services.find(s => s.id === appointment.service_id);

      if (!barber || !service || !appointment.customer_email) {
        results.failed++;
        results.errors.push(`Missing data for appointment ${appointment.id}`);
        continue;
      }

      const result = await sendAppointmentReminder({
        customerName: appointment.customer_name,
        customerEmail: appointment.customer_email,
        barberName: barber.name,
        barberImage: barber.image || undefined,
        serviceName: service.name,
        date: appointment.date,
        time: appointment.time_slot,
        duration: service.duration,
        price: formatPrice(service.price),
        appointmentId: appointment.id,
      });

      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push(`Failed for ${appointment.customer_email}: ${result.error}`);
      }
    }

    return NextResponse.json({
      success: true,
      date: tomorrowStr,
      ...results,
    });
  } catch (error) {
    console.error('Reminder cron error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
}
