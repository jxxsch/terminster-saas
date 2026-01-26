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
      .select(`
        id,
        customer_name,
        date,
        time_slot,
        cancelled_at,
        team:barber_id (name)
      `)
      .eq('status', 'cancelled')
      .not('cancelled_at', 'is', null)
      .order('cancelled_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error loading cancelled appointments:', error);
      return NextResponse.json(
        { error: 'Fehler beim Laden' },
        { status: 500 }
      );
    }

    // Daten formatieren
    const formattedAppointments = appointments?.map(apt => {
      // Supabase gibt bei 1:1 Relations ein Objekt zurück, aber TypeScript sieht es als Array
      const team = apt.team as unknown as { name: string } | null;
      return {
        id: apt.id,
        customer_name: apt.customer_name,
        date: apt.date,
        time_slot: apt.time_slot,
        barber_name: team?.name || 'Unbekannt',
        cancelled_at: apt.cancelled_at,
      };
    }) || [];

    return NextResponse.json({ appointments: formattedAppointments });
  } catch (error) {
    console.error('Cancelled appointments API error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
}
