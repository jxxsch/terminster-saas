import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // Letzte 10 stornierte Termine laden
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('id, customer_name, date, time_slot, cancelled_at, cancelled_by, barber_id')
      .eq('status', 'cancelled')
      .order('cancelled_at', { ascending: false, nullsFirst: false })
      .limit(10);

    if (error) {
      console.error('Error loading cancelled appointments:', error);
      return NextResponse.json(
        { error: 'Fehler beim Laden' },
        { status: 500 }
      );
    }

    // Team-Daten laden für Barber-Namen
    const { data: team } = await supabase
      .from('team')
      .select('id, name');

    const teamMap = new Map(team?.map(t => [t.id, t.name]) || []);

    // Daten formatieren
    const formattedAppointments = appointments?.map(apt => ({
      id: apt.id,
      customer_name: apt.customer_name,
      date: apt.date,
      time_slot: apt.time_slot,
      barber_name: teamMap.get(apt.barber_id) || 'Unbekannt',
      cancelled_at: apt.cancelled_at || new Date().toISOString(),
      cancelled_by: (apt.cancelled_by as 'customer' | 'barber' | null) || null,
    })) || [];

    return NextResponse.json({ appointments: formattedAppointments });
  } catch (error) {
    console.error('Cancelled appointments API error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
}
