import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Termin aus Datenbank laden
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !appointment) {
      return NextResponse.json(
        { error: 'Termin nicht gefunden', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Prüfen ob bereits storniert
    if (appointment.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Termin wurde bereits storniert', code: 'ALREADY_CANCELLED' },
        { status: 400 }
      );
    }

    // Prüfen ob Termin in weniger als 5 Stunden ist
    const [hours, minutes] = appointment.time_slot.split(':').map(Number);
    const appointmentDateTime = new Date(appointment.date);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilAppointment < 5) {
      return NextResponse.json(
        {
          error: 'Stornierung nicht mehr möglich. Bitte kontaktiere uns telefonisch.',
          code: 'TOO_LATE',
          phone: '0214 7500 4590'
        },
        { status: 400 }
      );
    }

    // Termin stornieren (Status auf cancelled setzen + cancelled_at + cancelled_by)
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancelled_by: 'customer',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Cancel error:', updateError);
      return NextResponse.json(
        { error: 'Stornierung fehlgeschlagen', code: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Termin erfolgreich storniert',
    });
  } catch (error) {
    console.error('Cancel API error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

// GET um Termin-Details zu laden (für Anzeige vor Stornierung)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        team:barber_id (name, image),
        services:service_id (name, duration, price)
      `)
      .eq('id', id)
      .single();

    if (error || !appointment) {
      return NextResponse.json(
        { error: 'Termin nicht gefunden' },
        { status: 404 }
      );
    }

    // Prüfen ob Termin in weniger als 5 Stunden ist
    const [hours, minutes] = appointment.time_slot.split(':').map(Number);
    const appointmentDateTime = new Date(appointment.date);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    return NextResponse.json({
      appointment: {
        id: appointment.id,
        date: appointment.date,
        time: appointment.time_slot,
        status: appointment.status,
        customerName: appointment.customer_name,
        customerId: appointment.customer_id,
        barberName: appointment.team?.name,
        barberImage: appointment.team?.image,
        serviceName: appointment.services?.name,
        serviceDuration: appointment.services?.duration,
        servicePrice: appointment.services?.price,
      },
      canCancel: hoursUntilAppointment >= 5,
      hoursUntilAppointment: Math.floor(hoursUntilAppointment),
    });
  } catch (error) {
    console.error('Get appointment error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
}
