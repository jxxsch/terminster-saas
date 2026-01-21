import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Fake Kundennamen
const fakeNames = [
  'Max Müller', 'Thomas Schmidt', 'Michael Weber', 'Andreas Fischer', 'Stefan Becker',
  'Daniel Hoffmann', 'Marco Schäfer', 'Patrick Koch', 'Christian Bauer', 'Tobias Richter',
  'Kevin Wagner', 'Dennis Klein', 'Marcel Wolf', 'Florian Braun', 'Sebastian Lange',
  'Alexander Krause', 'Philipp Werner', 'Dominik Meier', 'Tim Lehmann', 'Felix Schmitz',
  'Jan Neumann', 'Lars Schwarz', 'David Zimmermann', 'Nico Hartmann', 'Benjamin Krüger',
  'Lukas Maier', 'Simon Schulz', 'Jonas Huber', 'Paul König', 'Leon Fuchs'
];

// Fake Telefonnummern
const generatePhone = () => `0${Math.floor(1500000000 + Math.random() * 500000000)}`;

// Zeitslots
const timeSlots = [
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
];

// Zufällige Auswahl
const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const shuffleArray = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

async function seedFakeAppointments() {
  console.log('Lade Team und Services...');

  // Team laden
  const { data: team, error: teamError } = await supabase
    .from('team')
    .select('id, name')
    .eq('active', true)
    .order('sort_order');

  if (teamError || !team) {
    console.error('Fehler beim Laden des Teams:', teamError);
    return;
  }
  console.log(`${team.length} Team-Mitglieder gefunden`);

  // Services laden
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('id, name')
    .eq('active', true)
    .order('sort_order');

  if (servicesError || !services) {
    console.error('Fehler beim Laden der Services:', servicesError);
    return;
  }
  console.log(`${services.length} Services gefunden`);

  // Aktuelles Datum und die nächsten 7 Tage
  const today = new Date();
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    // Sonntag überspringen
    if (date.getDay() !== 0) {
      const dateStr = date.toISOString().split('T')[0];
      dates.push(dateStr);
    }
  }
  console.log(`Termine für ${dates.length} Tage erstellen...`);

  // Bestehende Termine löschen (optional)
  console.log('Lösche bestehende Termine...');
  await supabase.from('appointments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('series').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const appointments: any[] = [];
  const seriesData: any[] = [];
  let nameIndex = 0;

  // Für jeden Barber
  for (const barber of team) {
    console.log(`Erstelle Termine für ${barber.name}...`);

    // Für jeden Tag
    for (const date of dates) {
      // 5 zufällige Zeitslots pro Tag
      const daySlots = shuffleArray(timeSlots).slice(0, 5);

      for (const slot of daySlots) {
        const customerName = fakeNames[nameIndex % fakeNames.length];
        nameIndex++;

        // Zufällig: 40% online, 40% manuell, 20% Serie
        const rand = Math.random();

        if (rand < 0.2) {
          // Serie - nur einmal pro Barber erstellen
          const existingSeries = seriesData.find(s =>
            s.barber_id === barber.id && s.time_slot === slot
          );

          if (!existingSeries) {
            const dayOfWeek = new Date(date).getDay();
            seriesData.push({
              barber_id: barber.id,
              day_of_week: dayOfWeek === 0 ? 7 : dayOfWeek,
              time_slot: slot,
              service_id: randomItem(services).id,
              customer_name: customerName,
              customer_phone: generatePhone(),
              customer_email: `${customerName.toLowerCase().replace(' ', '.')}@email.de`,
              start_date: date,
              end_date: null,
              interval_type: randomItem(['weekly', 'biweekly', 'monthly']),
            });
          }
        } else {
          // Normaler Termin (manuell oder online)
          appointments.push({
            barber_id: barber.id,
            date: date,
            time_slot: slot,
            service_id: randomItem(services).id,
            customer_name: customerName,
            customer_phone: generatePhone(),
            customer_email: rand < 0.6 ? `${customerName.toLowerCase().replace(' ', '.')}@email.de` : null,
            source: rand < 0.6 ? 'online' : 'manual',
            status: 'confirmed',
            customer_id: null,
            series_id: null,
          });
        }
      }
    }
  }

  // Termine einfügen
  if (appointments.length > 0) {
    console.log(`Füge ${appointments.length} Termine ein...`);
    const { error: appointmentsError } = await supabase
      .from('appointments')
      .insert(appointments);

    if (appointmentsError) {
      console.error('Fehler beim Einfügen der Termine:', appointmentsError);
    } else {
      console.log('Termine erfolgreich eingefügt!');
    }
  }

  // Serien einfügen
  if (seriesData.length > 0) {
    console.log(`Füge ${seriesData.length} Serien ein...`);
    const { error: seriesError } = await supabase
      .from('series')
      .insert(seriesData);

    if (seriesError) {
      console.error('Fehler beim Einfügen der Serien:', seriesError);
    } else {
      console.log('Serien erfolgreich eingefügt!');
    }
  }

  console.log('Fertig!');
}

seedFakeAppointments();
