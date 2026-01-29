import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Generiert .ics Kalender-Datei
function generateIcsContent(data: {
  title: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  description: string;
}): string {
  const [hours, minutes] = data.time.split(':').map(Number);
  const startDate = new Date(data.date);
  startDate.setHours(hours, minutes, 0, 0);

  const endDate = new Date(startDate.getTime() + data.duration * 60000);

  const formatIcsDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}T${hour}${min}00`;
  };

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Beban Barbershop//Termin//DE
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${Date.now()}@terminster.com
DTSTAMP:${formatIcsDate(new Date())}
DTSTART:${formatIcsDate(startDate)}
DTEND:${formatIcsDate(endDate)}
SUMMARY:${data.title}
LOCATION:${data.location}
DESCRIPTION:${data.description}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Termin aus Datenbank laden
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        team!appointments_barber_id_fkey (name),
        services!appointments_service_id_fkey (name, duration)
      `)
      .eq('id', id)
      .single();

    if (error || !appointment) {
      return NextResponse.json(
        { error: 'Termin nicht gefunden' },
        { status: 404 }
      );
    }

    // .ics Inhalt generieren
    const icsContent = generateIcsContent({
      title: `${appointment.services?.name || 'Termin'} bei Beban Barbershop`,
      date: appointment.date,
      time: appointment.time_slot,
      duration: appointment.services?.duration || 30,
      location: 'Beban Barbershop, Friedrich-Ebert-Platz 3a, 51373 Leverkusen',
      description: `Dein Termin bei Beban Barbershop mit ${appointment.team?.name || 'deinem Barber'}`,
    });

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="termin-${id}.ics"`,
      },
    });
  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
}
