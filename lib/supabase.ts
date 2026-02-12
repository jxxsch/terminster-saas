import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Custom storage without locks to avoid AbortError issues
const customStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },
};

// Browser Client Factory für Multi-Tenant Bereiche
export function createBrowserClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'implicit',
      storage: customStorage,
      storageKey: 'beban-auth',
    },
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // Enable automatic session detection from URL
    flowType: 'implicit', // Use implicit flow for recovery/invite tokens
    storage: customStorage,
    storageKey: 'beban-auth',
    lock: async <R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
      // Skip lock mechanism entirely - just execute the function directly
      return fn();
    },
  },
});

// ============================================
// TYPES - Single Source of Truth
// ============================================

export interface TeamMember {
  id: string;
  name: string;
  image: string | null;
  image_position: string;
  image_scale: number;
  image_position_portrait: string;
  image_scale_portrait: number;
  image_position_email: string;
  image_scale_email: number;
  sort_order: number;
  active: boolean;
  created_at: string;
  // Zusätzliche Mitarbeiter-Details
  phone: string | null;
  birthday: string | null;
  vacation_days: number;
  start_date: string | null;
  // Wöchentlicher freier Tag (0=Sonntag, 1=Montag, ..., 6=Samstag)
  free_day: number | null;
}

// Helper: Prüft ob ein Barber an einem bestimmten Datum seinen freien Tag hat
export function isBarberFreeDay(barber: TeamMember, dateStr: string): boolean {
  if (barber.free_day === null || barber.free_day === undefined) return false;
  const dayOfWeek = new Date(dateStr).getDay();
  return dayOfWeek === barber.free_day;
}

export interface Service {
  id: string;
  name: string;
  price: number; // in Cent
  duration: number; // in Minuten
  sort_order: number;
  active: boolean; // Auf Webseite anzeigen
  show_in_calendar: boolean; // Im Kalender/Buchungstool anzeigen
  created_at: string;
}

export interface TimeSlot {
  id: number;
  time: string;
  sort_order: number;
  active: boolean;
}

export interface Customer {
  id: string;
  auth_id: string | null;
  first_name: string | null;
  last_name: string | null;
  name: string; // Kombination aus first_name + last_name für Abwärtskompatibilität
  email: string;
  phone: string | null;
  birth_date: string | null;
  preferred_barber_id: string | null;
  is_blocked: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  barber_id: string;
  date: string;
  time_slot: string;
  service_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_id: string | null;
  customer_email: string | null;
  status: 'confirmed' | 'cancelled';
  source: 'online' | 'manual';
  series_id: string | null;
  is_pause: boolean;
  created_at: string;
  cancelled_by?: 'customer' | 'barber' | null;
  cancelled_at?: string | null;
  newsletter_consent?: boolean;
}

export interface Series {
  id: string;
  barber_id: string;
  day_of_week: number; // 1=Mo, 2=Di, ..., 6=Sa
  time_slot: string;
  service_id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  start_date: string;
  end_date: string | null;
  interval_type: 'weekly' | 'biweekly' | 'monthly' | 'custom'; // Wiederholungsintervall
  interval_weeks: number; // Intervall in Wochen (1=wöchentlich, 2=14-tägig, 4=monatlich, etc.)
  last_generated_date: string | null;
  created_at: string;
}

export interface StaffWorkingHours {
  id: string;
  staff_id: string;
  day_of_week: number; // 0=So, 1=Mo, ..., 6=Sa
  start_time: string;  // Format: "HH:MM"
  end_time: string;    // Format: "HH:MM"
  created_at: string;
}

export interface FreeDayException {
  id: string;
  staff_id: string;
  date: string;              // YYYY-MM-DD - Datum an dem gearbeitet wird
  start_time: string;        // Format: "HH:MM"
  end_time: string;          // Format: "HH:MM"
  replacement_date: string | null;  // YYYY-MM-DD - Ersatztag (optional)
  created_at: string;
}

// ============================================
// TEAM - Mitarbeiter
// ============================================

export async function getTeam(): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('team')
    .select('*')
    .eq('active', true)
    .order('sort_order');

  if (error) {
    console.error('Error fetching team:', error);
    return [];
  }

  return data || [];
}

export async function getTeamMember(id: string): Promise<TeamMember | null> {
  const { data, error } = await supabase
    .from('team')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching team member:', error);
    return null;
  }

  return data;
}

// ============================================
// SERVICES - Dienstleistungen
// ============================================

export async function getServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('active', true)
    .order('sort_order');

  if (error) {
    console.error('Error fetching services:', error);
    return [];
  }

  return data || [];
}

// Services für Kalender/Buchungstool (show_in_calendar = true)
export async function getCalendarServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('show_in_calendar', true)
    .order('sort_order');

  if (error) {
    console.error('Error fetching calendar services:', error);
    return [];
  }

  return data || [];
}

export async function getService(id: string): Promise<Service | null> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching service:', error);
    return null;
  }

  return data;
}

// Helper: Preis formatieren (Cent -> Euro String)
export function formatPrice(priceInCent: number): string {
  return `${(priceInCent / 100).toFixed(0)} €`;
}

// Helper: Dauer formatieren
export function formatDuration(minutes: number): string {
  return `${minutes} Min`;
}

// ============================================
// TIME SLOTS - Zeitslots
// ============================================

export async function getTimeSlots(): Promise<TimeSlot[]> {
  const { data, error } = await supabase
    .from('time_slots')
    .select('*')
    .eq('active', true)
    .order('sort_order');

  if (error) {
    console.error('Error fetching time slots:', error);
    return [];
  }

  return data || [];
}

// Helper: Nur die Zeit-Strings zurückgeben
export async function getTimeSlotsArray(): Promise<string[]> {
  const slots = await getTimeSlots();
  return slots.map(s => s.time);
}

// ============================================
// APPOINTMENTS - Termine
// ============================================

export async function getAppointments(startDate: string, endDate: string): Promise<Appointment[]> {
  // Abfrage 1: Alle nicht-stornierten Termine
  const { data: activeData, error: activeError } = await supabase
    .from('appointments')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .or('status.is.null,status.neq.cancelled')
    .order('date')
    .order('time_slot');

  if (activeError) {
    console.error('Error fetching appointments:', activeError);
    return [];
  }

  // Abfrage 2: Stornierte Termine MIT series_id (Serien-Ausnahmen)
  // Diese werden benötigt, damit die Serie für diesen Tag nicht angezeigt wird
  const { data: cancelledSeriesData, error: cancelledError } = await supabase
    .from('appointments')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .eq('status', 'cancelled')
    .not('series_id', 'is', null);

  if (cancelledError) {
    console.error('Error fetching cancelled series appointments:', cancelledError);
    // Gib trotzdem die aktiven Termine zurück
    return activeData || [];
  }

  // Kombiniere beide Ergebnisse (ohne Duplikate)
  const allAppointments = [...(activeData || [])];
  const existingIds = new Set(allAppointments.map(a => a.id));

  for (const apt of (cancelledSeriesData || [])) {
    if (!existingIds.has(apt.id)) {
      allAppointments.push(apt);
    }
  }

  // Sortiere nach Datum und Zeit
  return allAppointments.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time_slot.localeCompare(b.time_slot);
  });
}

export async function createAppointment(appointment: Omit<Appointment, 'id' | 'created_at'>): Promise<{
  success: boolean;
  appointment: Appointment | null;
  error: 'conflict' | 'unknown' | null
}> {
  const { data, error } = await supabase
    .from('appointments')
    .insert(appointment)
    .select()
    .single();

  if (error) {
    console.error('Error creating appointment:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    // Code 23505 = unique_violation (Slot bereits gebucht)
    const errorType = error.code === '23505' ? 'conflict' : 'unknown';
    return { success: false, appointment: null, error: errorType };
  }

  return { success: true, appointment: data, error: null };
}

export async function deleteAppointment(id: string): Promise<boolean> {
  // Vor dem Löschen: Wenn Serientermin → Exception "deleted" erstellen
  const { data: apt } = await supabase
    .from('appointments')
    .select('series_id, date, time_slot, barber_id')
    .eq('id', id)
    .single();

  if (apt?.series_id) {
    await createSeriesException({
      series_id: apt.series_id,
      exception_date: apt.date,
      exception_type: 'deleted',
      original_time_slot: apt.time_slot,
      original_barber_id: apt.barber_id,
      moved_to_appointment_id: null,
      reason: 'appointment_deleted',
    });
  }

  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting appointment:', error);
    return false;
  }

  return true;
}

// Termin verschieben (Drag & Drop)
export async function moveAppointment(
  id: string,
  updates: { barber_id?: string; date?: string; time_slot?: string }
): Promise<{ success: boolean; appointment: Appointment | null; error: string | null }> {
  // 1. Aktuellen Termin laden
  const { data: currentAppointment, error: fetchError } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !currentAppointment) {
    return { success: false, appointment: null, error: 'Termin nicht gefunden' };
  }

  // 2. Ziel-Daten bestimmen
  const targetBarberId = updates.barber_id || currentAppointment.barber_id;
  const targetDate = updates.date || currentAppointment.date;
  const targetTimeSlot = updates.time_slot || currentAppointment.time_slot;

  // 3. Prüfen ob Ziel-Slot bereits belegt ist (außer es ist der gleiche Termin)
  const { data: existingAppointment, error: checkError } = await supabase
    .from('appointments')
    .select('id')
    .eq('barber_id', targetBarberId)
    .eq('date', targetDate)
    .eq('time_slot', targetTimeSlot)
    .neq('id', id)
    .eq('status', 'confirmed')
    .maybeSingle();

  if (checkError) {
    return { success: false, appointment: null, error: 'Fehler bei der Verfügbarkeitsprüfung' };
  }

  if (existingAppointment) {
    return { success: false, appointment: null, error: 'Dieser Zeitslot ist bereits belegt' };
  }

  // 4. Update durchführen
  const { data: updatedAppointment, error: updateError } = await supabase
    .from('appointments')
    .update({
      barber_id: targetBarberId,
      date: targetDate,
      time_slot: targetTimeSlot,
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return { success: false, appointment: null, error: 'Fehler beim Verschieben des Termins' };
  }

  // 5. Wenn Serientermin + Datum/Zeit geändert → Exception "moved" am Original-Datum
  if (currentAppointment.series_id) {
    const dateChanged = targetDate !== currentAppointment.date;
    const timeChanged = targetTimeSlot !== currentAppointment.time_slot;
    const barberChanged = targetBarberId !== currentAppointment.barber_id;

    if (dateChanged || timeChanged || barberChanged) {
      await createSeriesException({
        series_id: currentAppointment.series_id,
        exception_date: currentAppointment.date,
        exception_type: 'moved',
        original_time_slot: currentAppointment.time_slot,
        original_barber_id: currentAppointment.barber_id,
        moved_to_appointment_id: id,
        reason: 'appointment_moved',
      });
    }
  }

  return { success: true, appointment: updatedAppointment, error: null };
}

// Admin-Funktion: Termin stornieren (ohne 24h-Regel)
export async function cancelAppointmentAdmin(id: string): Promise<boolean> {
  // Vor dem Stornieren: Termin-Daten laden für Exception
  const { data: apt } = await supabase
    .from('appointments')
    .select('series_id, date, time_slot, barber_id')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled', cancelled_by: 'barber', cancelled_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error cancelling appointment:', error);
    return false;
  }

  // Nach dem Stornieren: wenn Serientermin → Exception "deleted" erstellen
  if (apt?.series_id) {
    await createSeriesException({
      series_id: apt.series_id,
      exception_date: apt.date,
      exception_type: 'deleted',
      original_time_slot: apt.time_slot,
      original_barber_id: apt.barber_id,
      moved_to_appointment_id: null,
      reason: 'appointment_cancelled',
    });
  }

  return true;
}

// Termin aktualisieren (Kundendaten)
export async function updateAppointment(
  id: string,
  updates: Partial<Pick<Appointment, 'customer_name' | 'customer_phone' | 'customer_email'>>
): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating appointment:', error);
    return null;
  }

  return data;
}

// Kunde nach ID laden
export async function getCustomerById(id: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching customer:', error);
    return null;
  }

  return data;
}

// Sanitize user input for PostgREST filter strings to prevent filter injection
function sanitizeForPostgrest(input: string): string {
  return input.replace(/[,.()"'\\]/g, '').trim();
}

// Kunden nach Namen oder Telefonnummer suchen (für Autocomplete)
export async function searchCustomers(query: string): Promise<Customer[]> {
  if (!query || query.length < 2) return [];

  const sanitized = sanitizeForPostgrest(query);
  if (!sanitized) return [];

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .or(`name.ilike.%${sanitized}%,first_name.ilike.%${sanitized}%,last_name.ilike.%${sanitized}%,phone.ilike.%${sanitized}%`)
    .order('name')
    .limit(10);

  if (error) {
    console.error('Error searching customers:', error);
    return [];
  }

  return data || [];
}


// ============================================
// SERIES - Serientermine
// ============================================

export async function getSeries(): Promise<Series[]> {
  const { data, error } = await supabase
    .from('series')
    .select('*')
    .order('day_of_week')
    .order('time_slot');

  if (error) {
    console.error('Error fetching series:', error);
    return [];
  }

  return data || [];
}

export async function createSeries(series: Omit<Series, 'id' | 'created_at'>): Promise<Series | null> {
  const { data, error } = await supabase
    .from('series')
    .insert(series)
    .select()
    .single();

  if (error) {
    console.error('Error creating series:', error);
    return null;
  }

  return data;
}

export async function deleteSeries(id: string): Promise<boolean> {
  // CASCADE löscht Appointments + Exceptions automatisch,
  // aber explizites Löschen stellt sicher, dass der Count stimmt
  await supabase
    .from('appointments')
    .delete()
    .eq('series_id', id);

  const { error } = await supabase
    .from('series')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting series:', error);
    return false;
  }


  return true;
}

export async function updateSeries(id: string, updates: Partial<Series>): Promise<Series | null> {
  const { data, error } = await supabase
    .from('series')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating series:', error);
    return null;
  }

  return data;
}

// ============================================
// SERIES EXCEPTIONS - Ausnahmen für Serientermine
// ============================================

export interface SeriesException {
  id: string;
  series_id: string;
  exception_date: string;
  exception_type: 'deleted' | 'moved' | 'skipped';
  original_time_slot: string | null;
  original_barber_id: string | null;
  moved_to_appointment_id: string | null;
  reason: string | null;
  created_at: string;
}

// Upsert: Exception erstellen oder überschreiben
export async function createSeriesException(
  exception: Omit<SeriesException, 'id' | 'created_at'>
): Promise<SeriesException | null> {
  const { data, error } = await supabase
    .from('series_exceptions')
    .upsert(exception, { onConflict: 'series_id,exception_date' })
    .select()
    .single();

  if (error) {
    console.error('Error creating series exception:', error);
    return null;
  }

  return data;
}

// Exception löschen (für Undo)
export async function deleteSeriesException(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('series_exceptions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting series exception:', error);
    return false;
  }

  return true;
}

// Exception per Datum löschen (für Undo per Datum)
export async function deleteSeriesExceptionByDate(
  seriesId: string,
  exceptionDate: string
): Promise<boolean> {
  const { error } = await supabase
    .from('series_exceptions')
    .delete()
    .eq('series_id', seriesId)
    .eq('exception_date', exceptionDate);

  if (error) {
    console.error('Error deleting series exception by date:', error);
    return false;
  }

  return true;
}

// Alle Exceptions einer Serie laden (für Debug/Admin)
export async function getSeriesExceptions(seriesId: string): Promise<SeriesException[]> {
  const { data, error } = await supabase
    .from('series_exceptions')
    .select('*')
    .eq('series_id', seriesId)
    .order('exception_date');

  if (error) {
    console.error('Error fetching series exceptions:', error);
    return [];
  }

  return data || [];
}

// Zukünftige Exceptions einer Serie löschen (für cancelSeriesFuture/updateSeriesRhythm)
export async function deleteSeriesExceptionsFuture(
  seriesId: string,
  fromDate: string
): Promise<boolean> {
  const { error } = await supabase
    .from('series_exceptions')
    .delete()
    .eq('series_id', seriesId)
    .gte('exception_date', fromDate);

  if (error) {
    console.error('Error deleting future series exceptions:', error);
    return false;
  }

  return true;
}

// ============================================
// DST-SAFE DATE HELPERS
// ============================================

/**
 * Formatiert ein Date-Objekt als "YYYY-MM-DD" in lokaler Zeitzone.
 * Verwendet NICHT toISOString() (UTC), sondern getFullYear/getMonth/getDate (lokal).
 */
export function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parst einen "YYYY-MM-DD" String als Date-Objekt in lokaler Zeitzone um 12:00 Uhr.
 * Die Mittagszeit verhindert DST-Probleme (Sprung um 02:00/03:00 betrifft Mittag nicht).
 */
export function parseDateNoon(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/**
 * Addiert Tage zu einem Datum. Erzeugt ein neues Date um 12:00 Uhr lokal (DST-sicher).
 */
export function addDaysLocal(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12, 0, 0, 0);
}

// ============================================
// SERIES APPOINTMENTS - Echte Termine generieren
// ============================================

export interface SeriesGenerationResult {
  created: number;
  skipped: number;
  exceptionSkipped: number;    // Durch Exceptions übersprungene Daten
  total: number;
  createdDates: string[];  // Erfolgreich erstellte Daten
  skippedDates: string[];  // Übersprungene Daten (Konflikte)
  exceptionSkippedDates: string[];  // Durch Exceptions übersprungene Daten
}

/**
 * Generiert echte Appointment-Rows für eine Serie.
 * Nutzt die PostgreSQL-Funktion batch_insert_series_appointments für 1 DB-Roundtrip.
 */
export async function generateSeriesAppointments(
  series: Series,
  fromDate: string,
  weeksAhead: number = 52
): Promise<SeriesGenerationResult> {
  const appointments: Record<string, unknown>[] = [];
  const endLimit = addDaysLocal(parseDateNoon(fromDate), weeksAhead * 7);
  const endLimitStr = formatDateLocal(endLimit);

  // Effektives Enddatum: series.end_date oder weeksAhead
  const effectiveEnd = series.end_date && series.end_date < endLimitStr
    ? series.end_date
    : endLimitStr;

  // Startdatum finden: nächstes Datum mit passendem Wochentag ab fromDate
  const from = parseDateNoon(fromDate);
  // day_of_week: 1=Mo, 2=Di, ..., 6=Sa, 7=So
  // JS getDay(): 0=So, 1=Mo, ..., 6=Sa
  const targetJsDay = series.day_of_week === 7 ? 0 : series.day_of_week;

  let current = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12, 0, 0, 0);
  // Zum nächsten passenden Wochentag springen
  while (current.getDay() !== targetJsDay) {
    current.setDate(current.getDate() + 1);
  }

  // Wenn series.start_date nach current liegt, dort starten
  const seriesStart = parseDateNoon(series.start_date);
  if (seriesStart > current) {
    current = new Date(seriesStart);
    while (current.getDay() !== targetJsDay) {
      current.setDate(current.getDate() + 1);
    }
  }

  // Intervall in Wochen (Fallback für alte Serien ohne interval_weeks)
  const intervalWeeks = series.interval_weeks || (
    series.interval_type === 'biweekly' ? 2 :
    series.interval_type === 'monthly' ? 4 : 1
  );

  // Referenzpunkt für Intervall-Berechnung
  const seriesStartTime = parseDateNoon(series.start_date).getTime();

  const isPause = series.customer_name.toLowerCase().includes('pause');

  while (formatDateLocal(current) <= effectiveEnd) {
    const dateStr = formatDateLocal(current);

    // Prüfe ob dieses Datum ins Intervall passt
    let shouldGenerate = false;
    if (intervalWeeks === 1) {
      shouldGenerate = true;
    } else {
      const diffDays = Math.round((current.getTime() - seriesStartTime) / (24 * 60 * 60 * 1000));
      const diffWeeks = Math.floor(diffDays / 7);
      shouldGenerate = diffWeeks >= 0 && diffWeeks % intervalWeeks === 0;
    }

    if (shouldGenerate) {
      appointments.push({
        barber_id: series.barber_id,
        date: dateStr,
        time_slot: series.time_slot,
        service_id: series.service_id || null,
        customer_name: series.customer_name,
        customer_phone: series.customer_phone || '',
        customer_email: series.customer_email || '',
        customer_id: '',
        status: 'confirmed',
        source: 'manual',
        series_id: series.id,
        is_pause: isPause,
      });
    }

    // Immer 7 Tage weiter (Intervall-Prüfung entscheidet ob generiert wird)
    current.setDate(current.getDate() + 7);
  }

  if (appointments.length === 0) {
    return { created: 0, skipped: 0, exceptionSkipped: 0, total: 0, createdDates: [], skippedDates: [], exceptionSkippedDates: [] };
  }

  // Batch-Insert via RPC (prüft automatisch series_exceptions)
  const { data, error } = await supabase.rpc('batch_insert_series_appointments', {
    appointments_json: appointments,
  });

  if (error) {
    console.error('Error generating series appointments:', error);
    return { created: 0, skipped: 0, exceptionSkipped: 0, total: appointments.length, createdDates: [], skippedDates: [], exceptionSkippedDates: [] };
  }

  const result = data as {
    inserted: number;
    skipped: number;
    exception_skipped: number;
    total: number;
    inserted_dates: string[];
    skipped_dates: string[];
    exception_skipped_dates: string[];
  };

  // Übersprungene Slots permanent als Exception markieren,
  // damit der Cron-Job sie nie nachträglich erzeugt
  if (result.skipped_dates && result.skipped_dates.length > 0) {
    for (const skippedDate of result.skipped_dates) {
      await createSeriesException({
        series_id: series.id,
        exception_date: skippedDate,
        exception_type: 'skipped',
        original_time_slot: series.time_slot,
        original_barber_id: series.barber_id,
        moved_to_appointment_id: null,
        reason: 'conflict_at_generation',
      });
    }
  }

  return {
    created: result.inserted,
    skipped: result.skipped,
    exceptionSkipped: result.exception_skipped || 0,
    total: result.total,
    createdDates: result.inserted_dates || [],
    skippedDates: result.skipped_dates || [],
    exceptionSkippedDates: result.exception_skipped_dates || [],
  };
}

/**
 * Erstellt eine Serie und generiert sofort 52 Wochen echte Appointment-Rows.
 */
export async function createSeriesWithAppointments(
  seriesData: Omit<Series, 'id' | 'created_at' | 'last_generated_date'>,
  isPause: boolean = false
): Promise<{
  series: Series | null;
  appointmentsCreated: number;
  appointmentsSkipped: number;
  createdDates: string[];
  skippedDates: string[];
}> {
  // 1. Serie erstellen
  const series = await createSeries({
    ...seriesData,
    last_generated_date: null,
  });

  if (!series) {
    return { series: null, appointmentsCreated: 0, appointmentsSkipped: 0, createdDates: [], skippedDates: [] };
  }

  // Wenn Pause, customer_name entsprechend markieren
  const effectiveSeries = isPause
    ? { ...series, customer_name: series.customer_name.toLowerCase().includes('pause') ? series.customer_name : `Pause - ${series.customer_name}` }
    : series;

  // 2. Echte Termine generieren (52 Wochen ab start_date)
  const today = formatDateLocal(new Date());
  const fromDate = series.start_date > today ? series.start_date : today;

  const genResult = await generateSeriesAppointments(
    effectiveSeries.customer_name !== series.customer_name ? effectiveSeries : series,
    fromDate,
    52
  );

  // Rollback: Wenn keine Termine generiert wurden und welche erwartet waren
  if (genResult.created === 0 && genResult.total > 0 && genResult.skipped === 0 && genResult.exceptionSkipped === 0) {
    console.error('Series generation failed completely, rolling back series:', series.id);
    await deleteSeries(series.id);
    return { series: null, appointmentsCreated: 0, appointmentsSkipped: 0, createdDates: [], skippedDates: [] };
  }

  // 3. last_generated_date aktualisieren (nur bei Erfolg)
  const endLimit = addDaysLocal(parseDateNoon(fromDate), 52 * 7);
  const lastDate = formatDateLocal(endLimit);

  await updateSeries(series.id, { last_generated_date: lastDate } as Partial<Series>);



  return {
    series,
    appointmentsCreated: genResult.created,
    appointmentsSkipped: genResult.skipped,
    createdDates: genResult.createdDates,
    skippedDates: genResult.skippedDates,
  };
}

/**
 * Gibt den ersten (frühesten) Termin einer Serie zurück.
 */
export async function getFirstSeriesAppointment(seriesId: string): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('series_id', seriesId)
    .order('date', { ascending: true })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as Appointment;
}

/**
 * Storniert alle zukünftigen Termine einer Serie ab einem bestimmten Datum.
 * Setzt end_date auf der Serie und löscht zukünftige Appointment-Rows.
 */
export async function cancelSeriesFuture(
  seriesId: string,
  fromDate: string
): Promise<{ success: boolean; deletedCount: number }> {
  // 1. Serie end_date setzen (Serie bleibt bestehen, endet aber ab fromDate)
  const { error: updateError } = await supabase
    .from('series')
    .update({ end_date: fromDate })
    .eq('id', seriesId);

  if (updateError) {
    console.error('Error updating series end_date:', updateError);
    return { success: false, deletedCount: 0 };
  }

  // 2. Alle zukünftigen confirmed Appointments dieser Serie löschen (ab fromDate)
  const { data: deleted, error: deleteError } = await supabase
    .from('appointments')
    .delete()
    .eq('series_id', seriesId)
    .gte('date', fromDate)
    .eq('status', 'confirmed')
    .select('id');

  if (deleteError) {
    console.error('Error deleting future series appointments:', deleteError);
    return { success: false, deletedCount: 0 };
  }

  // 3. Zukünftige Exceptions aufräumen (nicht mehr nötig da Serie endet)
  await deleteSeriesExceptionsFuture(seriesId, fromDate);

  return { success: true, deletedCount: deleted?.length || 0 };
}

/**
 * Verlängert eine Serie um weitere Wochen (für Cron-Job).
 * Generiert Termine von last_generated_date bis today + 52 Wochen.
 */
export async function extendSeriesAppointments(
  seriesId: string
): Promise<SeriesGenerationResult> {
  const emptyResult: SeriesGenerationResult = { created: 0, skipped: 0, exceptionSkipped: 0, total: 0, createdDates: [], skippedDates: [], exceptionSkippedDates: [] };

  // Serie laden
  const { data: series, error } = await supabase
    .from('series')
    .select('*')
    .eq('id', seriesId)
    .single();

  if (error || !series) {
    console.error('Error loading series for extension:', error);
    return emptyResult;
  }

  // Von wo aus generieren?
  const today = formatDateLocal(new Date());
  const fromDate = series.last_generated_date || today;

  const result = await generateSeriesAppointments(series as Series, fromDate, 52);

  // last_generated_date nur bei Erfolg aktualisieren (Idempotenz)
  if (result.created > 0 || result.skipped > 0 || result.exceptionSkipped > 0) {
    const endLimit = addDaysLocal(parseDateNoon(fromDate), 52 * 7);
    const lastDate = formatDateLocal(endLimit);

    await updateSeries(seriesId, { last_generated_date: lastDate } as Partial<Series>);
  }

  return result;
}

/**
 * Ändert den Rhythmus einer Serie. Löscht zukünftige Appointments und regeneriert.
 */
export async function updateSeriesRhythm(
  seriesId: string,
  newIntervalType: 'weekly' | 'biweekly' | 'monthly' | 'custom',
  newIntervalWeeks?: number
): Promise<SeriesGenerationResult> {
  const today = formatDateLocal(new Date());
  const emptyResult: SeriesGenerationResult = { created: 0, skipped: 0, exceptionSkipped: 0, total: 0, createdDates: [], skippedDates: [], exceptionSkippedDates: [] };

  // 1. Serie updaten
  const updates: Partial<Series> = { interval_type: newIntervalType };
  if (newIntervalWeeks !== undefined) {
    updates.interval_weeks = newIntervalWeeks;
  }
  await updateSeries(seriesId, updates);

  // 2. Alle zukünftigen Appointments löschen
  await supabase
    .from('appointments')
    .delete()
    .eq('series_id', seriesId)
    .gte('date', today)
    .eq('status', 'confirmed');

  // 3. Zukünftige Exceptions löschen (Daten ändern sich komplett bei Rhythmuswechsel)
  await deleteSeriesExceptionsFuture(seriesId, today);

  // 4. Serie neu laden und regenerieren
  const { data: series, error } = await supabase
    .from('series')
    .select('*')
    .eq('id', seriesId)
    .single();

  if (error || !series) {
    return emptyResult;
  }

  const result = await generateSeriesAppointments(series as Series, today, 52);

  // last_generated_date aktualisieren
  const endLimit = addDaysLocal(parseDateNoon(today), 52 * 7);
  await updateSeries(seriesId, { last_generated_date: formatDateLocal(endLimit) } as Partial<Series>);



  return result;
}

// ============================================
// AUTH - Authentifizierung
// ============================================

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  birthDate: string; // Format: YYYY-MM-DD
  privacyConsent?: boolean;
  newsletterConsent?: boolean;
}

export async function signUp(data: SignUpData): Promise<{ user: Customer | null; error: string | null }> {
  // Supabase Auth User erstellen mit allen Daten als Metadata
  // Der Database Trigger erstellt automatisch den Customer-Eintrag
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
        birth_date: data.birthDate,
      },
    },
  });

  if (authError) {
    return { user: null, error: authError.message };
  }

  if (!authData.user) {
    return { user: null, error: 'Registrierung fehlgeschlagen' };
  }

  // Customer wurde automatisch durch den Trigger erstellt
  // Warte kurz und lade dann die Customer-Daten
  await new Promise(resolve => setTimeout(resolve, 500));

  const customer = await getCustomerByAuthId(authData.user.id);

  // Consent-Felder in customers-Tabelle speichern
  if (customer && (data.privacyConsent || data.newsletterConsent)) {
    const now = new Date().toISOString();
    await supabase
      .from('customers')
      .update({
        ...(data.privacyConsent ? { privacy_consent: true, privacy_consent_date: now } : {}),
        ...(data.newsletterConsent ? { newsletter_consent: true, newsletter_consent_date: now } : {}),
      })
      .eq('id', customer.id);
  }

  return { user: customer, error: null };
}

export async function signIn(email: string, password: string): Promise<{ user: Customer | null; error: string | null }> {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    return { user: null, error: authError.message };
  }

  if (!authData.user) {
    return { user: null, error: 'Login fehlgeschlagen' };
  }

  // Customer-Daten laden
  const customer = await getCustomerByAuthId(authData.user.id);
  return { user: customer, error: null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function resetPassword(email: string): Promise<{ error: string | null }> {
  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.error || 'Fehler beim Zurücksetzen des Passworts' };
    }

    return { error: null };
  } catch {
    return { error: 'Netzwerkfehler beim Zurücksetzen des Passworts' };
  }
}

// Passwort setzen (für Einladungslinks)
export async function setNewPassword(password: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function resendConfirmationEmail(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function getCurrentUser(): Promise<Customer | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return getCustomerByAuthId(user.id);
}

// ============================================
// CUSTOMERS - Kunden
// ============================================

export async function getCustomerByAuthId(authId: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('auth_id', authId)
    .single();

  if (error) {
    console.error('Error fetching customer:', error);
    return null;
  }

  return data;
}

export async function updateCustomer(
  id: string,
  updates: Partial<Pick<Customer, 'name' | 'phone' | 'email' | 'first_name' | 'last_name' | 'birth_date' | 'preferred_barber_id' | 'is_blocked'>>
): Promise<Customer | null> {
  // Wenn first_name oder last_name aktualisiert werden, auch name aktualisieren
  const finalUpdates = { ...updates };
  if (updates.first_name !== undefined || updates.last_name !== undefined) {
    const { data: current } = await supabase
      .from('customers')
      .select('first_name, last_name')
      .eq('id', id)
      .single();

    if (current) {
      const firstName = updates.first_name ?? current.first_name;
      const lastName = updates.last_name ?? current.last_name;
      finalUpdates.name = `${firstName} ${lastName}`;
    }
  }

  const { data, error } = await supabase
    .from('customers')
    .update(finalUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating customer:', error);
    return null;
  }

  return data;
}

// ============================================
// ADMIN - Customer Management
// ============================================

export interface CustomerWithStats extends Customer {
  appointment_count: number;
  last_visit: string | null;
}

/**
 * Holt alle Kunden mit Statistiken (Admin)
 */
export async function getAllCustomers(): Promise<CustomerWithStats[]> {
  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching all customers:', error);
    return [];
  }

  if (!customers || customers.length === 0) return [];

  // Hole Termin-Statistiken für alle Kunden
  const customerIds = customers.map(c => c.id);
  const today = new Date().toISOString().split('T')[0];

  const { data: appointments, error: aptError } = await supabase
    .from('appointments')
    .select('customer_id, date')
    .in('customer_id', customerIds)
    .eq('status', 'confirmed')
    .lt('date', today);

  if (aptError) {
    console.error('Error fetching customer appointments:', aptError);
  }

  // Aggregiere Statistiken
  const stats: Record<string, { count: number; lastVisit: string | null }> = {};
  (appointments || []).forEach(apt => {
    if (!apt.customer_id) return;
    if (!stats[apt.customer_id]) {
      stats[apt.customer_id] = { count: 0, lastVisit: null };
    }
    stats[apt.customer_id].count++;
    if (!stats[apt.customer_id].lastVisit || apt.date > stats[apt.customer_id].lastVisit!) {
      stats[apt.customer_id].lastVisit = apt.date;
    }
  });

  return customers.map(c => ({
    ...c,
    is_blocked: c.is_blocked || false,
    appointment_count: stats[c.id]?.count || 0,
    last_visit: stats[c.id]?.lastVisit || null,
  }));
}

/**
 * Sucht Kunden nach Name, E-Mail oder Telefon
 */
export async function searchCustomersAdmin(query: string): Promise<CustomerWithStats[]> {
  if (!query || query.length < 2) return getAllCustomers();

  const sanitized = sanitizeForPostgrest(query);
  if (!sanitized) return getAllCustomers();

  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .or(`name.ilike.%${sanitized}%,email.ilike.%${sanitized}%,phone.ilike.%${sanitized}%`)
    .order('name');

  if (error) {
    console.error('Error searching customers:', error);
    return [];
  }

  if (!customers || customers.length === 0) return [];

  // Hole Termin-Statistiken
  const customerIds = customers.map(c => c.id);
  const today = new Date().toISOString().split('T')[0];

  const { data: appointments } = await supabase
    .from('appointments')
    .select('customer_id, date')
    .in('customer_id', customerIds)
    .eq('status', 'confirmed')
    .lt('date', today);

  const stats: Record<string, { count: number; lastVisit: string | null }> = {};
  (appointments || []).forEach(apt => {
    if (!apt.customer_id) return;
    if (!stats[apt.customer_id]) {
      stats[apt.customer_id] = { count: 0, lastVisit: null };
    }
    stats[apt.customer_id].count++;
    if (!stats[apt.customer_id].lastVisit || apt.date > stats[apt.customer_id].lastVisit!) {
      stats[apt.customer_id].lastVisit = apt.date;
    }
  });

  return customers.map(c => ({
    ...c,
    is_blocked: c.is_blocked || false,
    appointment_count: stats[c.id]?.count || 0,
    last_visit: stats[c.id]?.lastVisit || null,
  }));
}

/**
 * Sperrt oder entsperrt einen Kunden
 */
export async function toggleCustomerBlock(id: string, blocked: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('customers')
    .update({ is_blocked: blocked })
    .eq('id', id);

  if (error) {
    console.error('Error toggling customer block:', error);
    return false;
  }

  return true;
}

/**
 * Holt alle Termine eines Kunden (vergangene und zukünftige)
 */
export async function getCustomerAppointmentsAdmin(customerId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('customer_id', customerId)
    .order('date', { ascending: false })
    .order('time_slot', { ascending: false });

  if (error) {
    console.error('Error fetching customer appointments:', error);
    return [];
  }

  return data || [];
}

/**
 * Löscht einen Kunden (nur wenn keine Termine vorhanden)
 */
export async function deleteCustomer(id: string): Promise<{ success: boolean; error: string | null }> {
  // Prüfe ob noch Termine existieren
  const { count, error: countError } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', id);

  if (countError) {
    return { success: false, error: 'Fehler beim Prüfen der Termine' };
  }

  if (count && count > 0) {
    return { success: false, error: `Kunde hat noch ${count} Termine und kann nicht gelöscht werden` };
  }

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting customer:', error);
    return { success: false, error: 'Fehler beim Löschen des Kunden' };
  }

  return { success: true, error: null };
}

// ============================================
// CUSTOMER APPOINTMENTS - Kundentermine
// ============================================

export async function getCustomerAppointments(customerId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('customer_id', customerId)
    .order('date', { ascending: false })
    .order('time_slot', { ascending: false });

  if (error) {
    console.error('Error fetching customer appointments:', error);
    return [];
  }

  return data || [];
}

export async function cancelAppointment(id: string): Promise<{ success: boolean; error: string | null }> {
  // Stornierungsfrist aus Einstellungen laden
  const cancellationSetting = await getSetting<{ value: number }>('cancellation_hours');
  const cancellationHours = cancellationSetting?.value || 24;

  // Termin laden um Stornierungsfrist zu prüfen
  const { data: appointment, error: fetchError } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !appointment) {
    return { success: false, error: 'Termin nicht gefunden' };
  }

  // Stornierungsfrist prüfen
  const appointmentDate = new Date(`${appointment.date}T${appointment.time_slot}`);
  const now = new Date();
  const hoursUntil = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil < cancellationHours) {
    return { success: false, error: `Termine können nur bis ${cancellationHours} Stunden vorher storniert werden` };
  }

  // Status auf cancelled setzen und Zeitstempel speichern
  const { error: updateError } = await supabase
    .from('appointments')
    .update({
      status: 'cancelled',
      cancelled_by: 'customer',
      cancelled_at: new Date().toISOString()
    })
    .eq('id', id);

  if (updateError) {
    return { success: false, error: 'Stornierung fehlgeschlagen' };
  }

  return { success: true, error: null };
}

// ============================================
// ADMIN - Team Management
// ============================================

export async function getAllTeam(): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('team')
    .select('*')
    .order('sort_order');

  if (error) {
    console.error('Error fetching all team:', error);
    return [];
  }

  return data || [];
}

export async function createTeamMember(
  member: Omit<TeamMember, 'created_at'>
): Promise<TeamMember | null> {
  const { data, error } = await supabase
    .from('team')
    .insert(member)
    .select()
    .single();

  if (error) {
    console.error('Error creating team member:', error);
    return null;
  }

  return data;
}

export async function updateTeamMember(
  id: string,
  updates: Partial<Omit<TeamMember, 'id' | 'created_at'>>
): Promise<TeamMember | null> {
  const { data, error } = await supabase
    .from('team')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating team member:', error);
    return null;
  }

  return data;
}

export async function deleteTeamMember(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('team')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting team member:', error);
    return false;
  }

  return true;
}

export async function updateTeamOrder(
  items: Array<{ id: string; sort_order: number }>
): Promise<boolean> {
  const updates = items.map(item =>
    supabase
      .from('team')
      .update({ sort_order: item.sort_order })
      .eq('id', item.id)
  );

  const results = await Promise.all(updates);
  return results.every(r => !r.error);
}

// ============================================
// ADMIN - Services Management
// ============================================

export async function getAllServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('sort_order');

  if (error) {
    console.error('Error fetching all services:', error);
    return [];
  }

  return data || [];
}

export async function createService(
  service: Omit<Service, 'created_at'>
): Promise<Service | null> {
  const { data, error } = await supabase
    .from('services')
    .insert(service)
    .select()
    .single();

  if (error) {
    console.error('Error creating service:', error);
    return null;
  }

  return data;
}

export async function updateService(
  id: string,
  updates: Partial<Omit<Service, 'id' | 'created_at'>>
): Promise<Service | null> {
  const { data, error } = await supabase
    .from('services')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating service:', error);
    return null;
  }

  return data;
}

export async function deleteService(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting service:', error);
    return false;
  }

  return true;
}

export async function updateServiceOrder(
  items: Array<{ id: string; sort_order: number }>
): Promise<boolean> {
  const updates = items.map(item =>
    supabase
      .from('services')
      .update({ sort_order: item.sort_order })
      .eq('id', item.id)
  );

  const results = await Promise.all(updates);
  return results.every(r => !r.error);
}

// ============================================
// ADMIN - Time Slots Management
// ============================================

export async function getAllTimeSlots(): Promise<TimeSlot[]> {
  const { data, error } = await supabase
    .from('time_slots')
    .select('*')
    .order('sort_order');

  if (error) {
    console.error('Error fetching all time slots:', error);
    return [];
  }

  return data || [];
}

export async function createTimeSlot(
  slot: Omit<TimeSlot, 'id'>
): Promise<TimeSlot | null> {
  const { data, error } = await supabase
    .from('time_slots')
    .insert(slot)
    .select()
    .single();

  if (error) {
    console.error('Error creating time slot:', error);
    return null;
  }

  return data;
}

export async function updateTimeSlot(
  id: number,
  updates: Partial<Omit<TimeSlot, 'id'>>
): Promise<TimeSlot | null> {
  const { data, error } = await supabase
    .from('time_slots')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating time slot:', error);
    return null;
  }

  return data;
}

export async function deleteTimeSlot(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('time_slots')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting time slot:', error);
    return false;
  }

  return true;
}

// ============================================
// ADMIN - Staff Time Off (Urlaub)
// ============================================

export interface StaffTimeOff {
  id: string;
  staff_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  start_time: string | null;  // NULL = ganztägig, "14:00" = ab 14:00
  end_time: string | null;    // NULL = ganztägig, "18:30" = bis 18:30
  created_at: string;
}

// Prüft ob ein Slot durch eine (partielle) Blockierung betroffen ist
export function isSlotBlockedByTimeOff(
  timeOff: StaffTimeOff,
  slotTime: string
): boolean {
  if (!timeOff.start_time || !timeOff.end_time) return true; // Ganztägig
  return slotTime >= timeOff.start_time && slotTime <= timeOff.end_time;
}

export async function getStaffTimeOff(): Promise<StaffTimeOff[]> {
  const { data, error } = await supabase
    .from('staff_time_off')
    .select('*')
    .order('start_date');

  if (error) {
    console.error('Error fetching staff time off:', error);
    return [];
  }

  return data || [];
}

export async function createStaffTimeOff(
  timeOff: Omit<StaffTimeOff, 'id' | 'created_at'>
): Promise<StaffTimeOff | null> {
  const { data, error } = await supabase
    .from('staff_time_off')
    .insert(timeOff)
    .select()
    .single();

  if (error) {
    console.error('Error creating staff time off:', error);
    return null;
  }

  return data;
}

export async function updateStaffTimeOff(
  id: string,
  updates: Partial<Omit<StaffTimeOff, 'id' | 'created_at'>>
): Promise<StaffTimeOff | null> {
  const { data, error } = await supabase
    .from('staff_time_off')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating staff time off:', error);
    return null;
  }

  return data;
}

export async function deleteStaffTimeOff(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('staff_time_off')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting staff time off:', error);
    return false;
  }

  return true;
}

export async function isStaffOnTimeOff(staffId: string, date: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('staff_time_off')
    .select('id')
    .eq('staff_id', staffId)
    .lte('start_date', date)
    .gte('end_date', date);

  if (error) {
    console.error('Error checking staff time off:', error);
    return false;
  }

  return (data?.length || 0) > 0;
}

// Berechnet die genommenen Urlaubstage pro Mitarbeiter für ein Jahr
export async function getUsedVacationDays(year: number): Promise<Record<string, number>> {
  const startOfYear = `${year}-01-01`;
  const endOfYear = `${year}-12-31`;

  const { data, error } = await supabase
    .from('staff_time_off')
    .select('staff_id, start_date, end_date')
    .lte('start_date', endOfYear)
    .gte('end_date', startOfYear);

  if (error) {
    console.error('Error fetching vacation days:', error);
    return {};
  }

  const usedDays: Record<string, number> = {};

  for (const entry of data || []) {
    // Berechne Überlappung mit dem Jahr
    const entryStart = new Date(entry.start_date);
    const entryEnd = new Date(entry.end_date);
    const yearStart = new Date(startOfYear);
    const yearEnd = new Date(endOfYear);

    // Effektives Start- und Enddatum innerhalb des Jahres
    const effectiveStart = entryStart < yearStart ? yearStart : entryStart;
    const effectiveEnd = entryEnd > yearEnd ? yearEnd : entryEnd;

    // Anzahl der Tage berechnen (inklusiv)
    const days = Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (days > 0) {
      usedDays[entry.staff_id] = (usedDays[entry.staff_id] || 0) + days;
    }
  }

  return usedDays;
}

export async function getStaffTimeOffForDateRange(
  startDate: string,
  endDate: string
): Promise<StaffTimeOff[]> {
  // Überlappung: start_date <= endDate UND end_date >= startDate
  const { data, error } = await supabase
    .from('staff_time_off')
    .select('*')
    .lte('start_date', endDate)
    .gte('end_date', startDate);

  if (error) {
    console.error('Error fetching staff time off for range:', error);
    return [];
  }

  return data || [];
}

// ============================================
// ADMIN - Opening Hours
// ============================================

export interface OpeningHours {
  id: number;
  day_of_week: number; // 0=So, 1=Mo, ..., 6=Sa
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

export async function getOpeningHours(): Promise<OpeningHours[]> {
  const { data, error } = await supabase
    .from('opening_hours')
    .select('*')
    .order('day_of_week');

  if (error) {
    console.error('Error fetching opening hours:', error);
    return [];
  }

  return data || [];
}

export async function updateOpeningHours(
  dayOfWeek: number,
  updates: Partial<Omit<OpeningHours, 'id' | 'day_of_week'>>
): Promise<OpeningHours | null> {
  const { data, error } = await supabase
    .from('opening_hours')
    .update(updates)
    .eq('day_of_week', dayOfWeek)
    .select()
    .single();

  if (error) {
    console.error('Error updating opening hours:', error);
    return null;
  }

  return data;
}

// ============================================
// ADMIN - Site Settings
// ============================================

export async function getSetting<T>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching setting ${key}:`, error);
    return null;
  }

  return data?.value as T;
}

// Dedup: Wenn mehrere Hooks gleichzeitig getAllSettings() aufrufen,
// wird nur 1 Supabase-Query ausgeführt (Promise wird geteilt)
let _allSettingsPromise: Promise<Record<string, unknown>> | null = null;

export async function getAllSettings(): Promise<Record<string, unknown>> {
  if (_allSettingsPromise) return _allSettingsPromise;

  _allSettingsPromise = (async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value');

    if (error) {
      console.error('Error fetching all settings:', error);
      return {};
    }

    const settings: Record<string, unknown> = {};
    data?.forEach(row => {
      settings[row.key] = row.value;
    });

    return settings;
  })();

  try {
    return await _allSettingsPromise;
  } finally {
    // Nach 5s Cache freigeben für Neuladen
    setTimeout(() => { _allSettingsPromise = null; }, 5000);
  }
}

export async function updateSetting(
  key: string,
  value: unknown
): Promise<boolean> {
  const { error } = await supabase
    .from('site_settings')
    .upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error(`Error updating setting ${key}:`, error);
    return false;
  }

  return true;
}

// ============================================
// ADMIN - Closed Dates
// ============================================

export interface ClosedDate {
  id: number;
  date: string;
  reason: string | null;
  created_at: string;
}

export async function getClosedDates(): Promise<ClosedDate[]> {
  const { data, error } = await supabase
    .from('closed_dates')
    .select('*')
    .order('date');

  if (error) {
    console.error('Error fetching closed dates:', error);
    return [];
  }

  return data || [];
}

export async function createClosedDate(
  date: string,
  reason?: string
): Promise<ClosedDate | null> {
  const { data, error } = await supabase
    .from('closed_dates')
    .insert({ date, reason })
    .select()
    .single();

  if (error) {
    console.error('Error creating closed date:', error);
    return null;
  }

  return data;
}

export async function deleteClosedDate(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('closed_dates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting closed date:', error);
    return false;
  }

  return true;
}

export async function isDateClosed(date: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('closed_dates')
    .select('id')
    .eq('date', date);

  if (error) {
    console.error('Error checking closed date:', error);
    return false;
  }

  return (data?.length || 0) > 0;
}

// ============================================
// ADMIN - Open Sundays (Verkaufsoffene Sonntage)
// ============================================

export interface OpenSunday {
  id: number;
  date: string;
  open_time: string;
  close_time: string;
  created_at: string;
}

export async function getOpenSundays(): Promise<OpenSunday[]> {
  const { data, error } = await supabase
    .from('open_sundays')
    .select('*')
    .order('date');

  if (error) {
    console.error('Error fetching open sundays:', error);
    return [];
  }

  return data || [];
}

export async function createOpenSunday(
  date: string,
  openTime: string,
  closeTime: string
): Promise<OpenSunday | null> {
  const { data, error } = await supabase
    .from('open_sundays')
    .insert({ date, open_time: openTime, close_time: closeTime })
    .select()
    .single();

  if (error) {
    console.error('Error creating open sunday:', error);
    return null;
  }

  return data;
}

export async function deleteOpenSunday(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('open_sundays')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting open sunday:', error);
    return false;
  }

  return true;
}

export async function isOpenSunday(date: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('open_sundays')
    .select('id')
    .eq('date', date);

  if (error) {
    console.error('Error checking open sunday:', error);
    return false;
  }

  return (data?.length || 0) > 0;
}

// ============================================
// ADMIN - Open Sunday Staff (Mitarbeiter-Zuweisungen)
// ============================================

export interface OpenSundayStaff {
  id: string;
  open_sunday_id: number;
  staff_id: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export async function getOpenSundayStaff(openSundayId?: number): Promise<OpenSundayStaff[]> {
  let query = supabase.from('open_sunday_staff').select('*');

  if (openSundayId !== undefined) {
    query = query.eq('open_sunday_id', openSundayId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching open sunday staff:', error);
    return [];
  }

  return data || [];
}

export async function createOpenSundayStaff(
  openSundayId: number,
  staffId: string,
  startTime: string,
  endTime: string
): Promise<OpenSundayStaff | null> {
  const { data, error } = await supabase
    .from('open_sunday_staff')
    .insert({
      open_sunday_id: openSundayId,
      staff_id: staffId,
      start_time: startTime,
      end_time: endTime,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating open sunday staff:', error);
    return null;
  }

  return data;
}

export async function updateOpenSundayStaff(
  id: string,
  updates: { start_time?: string; end_time?: string }
): Promise<OpenSundayStaff | null> {
  const { data, error } = await supabase
    .from('open_sunday_staff')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating open sunday staff:', error);
    return null;
  }

  return data;
}

export async function deleteOpenSundayStaff(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('open_sunday_staff')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting open sunday staff:', error);
    return false;
  }

  return true;
}

export async function deleteOpenSundayStaffByOpenSunday(openSundayId: number): Promise<boolean> {
  const { error } = await supabase
    .from('open_sunday_staff')
    .delete()
    .eq('open_sunday_id', openSundayId);

  if (error) {
    console.error('Error deleting open sunday staff:', error);
    return false;
  }

  return true;
}

// ============================================
// ADMIN - Gallery Images
// ============================================

export interface GalleryImage {
  id: string;
  url: string;
  alt_text: string | null;
  category: string;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export async function getGalleryImages(): Promise<GalleryImage[]> {
  const { data, error } = await supabase
    .from('gallery_images')
    .select('*')
    .eq('active', true)
    .order('sort_order')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching gallery images:', error);
    return [];
  }

  return data || [];
}

export async function getAllGalleryImages(): Promise<GalleryImage[]> {
  const { data, error } = await supabase
    .from('gallery_images')
    .select('*')
    .order('sort_order')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all gallery images:', error);
    return [];
  }

  return data || [];
}

export async function createGalleryImage(
  image: Omit<GalleryImage, 'id' | 'created_at'>
): Promise<GalleryImage | null> {
  const { data, error } = await supabase
    .from('gallery_images')
    .insert(image)
    .select()
    .single();

  if (error) {
    console.error('Error creating gallery image:', error);
    return null;
  }

  return data;
}

export async function updateGalleryImage(
  id: string,
  updates: Partial<Omit<GalleryImage, 'id' | 'created_at'>>
): Promise<GalleryImage | null> {
  const { data, error } = await supabase
    .from('gallery_images')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating gallery image:', error);
    return null;
  }

  return data;
}

export async function deleteGalleryImage(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('gallery_images')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting gallery image:', error);
    return false;
  }

  return true;
}

export async function updateGalleryOrder(
  items: Array<{ id: string; sort_order: number }>
): Promise<boolean> {
  const updates = items.map(item =>
    supabase
      .from('gallery_images')
      .update({ sort_order: item.sort_order })
      .eq('id', item.id)
  );

  const results = await Promise.all(updates);
  return results.every(r => !r.error);
}

// ============================================
// IMAGE UPLOAD
// ============================================

/**
 * Upload an image to Supabase Storage
 * @param file The file to upload
 * @param folder The folder in the bucket (e.g., 'team', 'gallery')
 * @returns The public URL of the uploaded image or null on error
 */
export async function uploadImage(
  file: File,
  folder: string = 'general'
): Promise<string | null> {
  // Generate unique filename
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading image:', error);
    return null;
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from('images')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Delete an image from Supabase Storage
 * @param url The public URL of the image
 * @returns true if deletion was successful
 */
export async function deleteImage(url: string): Promise<boolean> {
  // Extract the path from the URL
  // URL format: https://xxx.supabase.co/storage/v1/object/public/images/folder/filename.jpg
  const urlParts = url.split('/storage/v1/object/public/images/');
  if (urlParts.length !== 2) {
    console.error('Invalid image URL format');
    return false;
  }

  const path = urlParts[1];

  const { error } = await supabase.storage
    .from('images')
    .remove([path]);

  if (error) {
    console.error('Error deleting image:', error);
    return false;
  }

  return true;
}

/**
 * Get the public URL for a storage path
 */
export function getStorageUrl(path: string): string {
  const { data } = supabase.storage
    .from('images')
    .getPublicUrl(path);

  return data.publicUrl;
}

// ============================================
// ADMIN DASHBOARD - Geburtstage & Neukunden
// ============================================

export interface BirthdayAppointment {
  customer_name: string;
  birth_date: string;
  date: string; // Termin-Datum
  time_slot: string;
  barber_id: string;
  barber_name?: string;
  isToday: boolean; // true = heute, false = zukünftig
}

/**
 * Holt Geburtstags-Termine: Erst heute, dann zukünftige (nächste 90 Tage)
 * Wenn heute niemand Geburtstag hat, wird der nächste kommende Geburtstag zurückgegeben
 */
export async function getBirthdayAppointments(): Promise<BirthdayAppointment[]> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Berechne Ende-Datum (90 Tage in die Zukunft)
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + 90);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  // Hole alle Termine von heute bis 90 Tage in die Zukunft
  const { data: appointments, error: aptError } = await supabase
    .from('appointments')
    .select('id, customer_name, customer_id, date, time_slot, barber_id')
    .gte('date', todayStr)
    .lte('date', futureDateStr)
    .eq('status', 'confirmed')
    .not('customer_id', 'is', null)
    .order('date')
    .order('time_slot');

  if (aptError || !appointments?.length) {
    return [];
  }

  // Hole alle eindeutigen Kunden-IDs
  const customerIds = [...new Set(
    appointments
      .map(a => a.customer_id)
      .filter((id): id is string => id !== null)
  )];

  if (customerIds.length === 0) return [];

  // Hole die Kunden mit Geburtsdaten
  const { data: customers, error: custError } = await supabase
    .from('customers')
    .select('id, birth_date')
    .in('id', customerIds)
    .not('birth_date', 'is', null);

  if (custError || !customers?.length) {
    return [];
  }

  // Erstelle Map von customer_id -> birth_date
  const customerBirthDates: Record<string, string> = {};
  customers.forEach(c => {
    if (c.birth_date) {
      customerBirthDates[c.id] = c.birth_date;
    }
  });

  // Prüfe für jeden Termin, ob der Kunde an diesem Tag Geburtstag hat
  const birthdayAppointments: BirthdayAppointment[] = [];

  for (const apt of appointments) {
    if (!apt.customer_id || !customerBirthDates[apt.customer_id]) continue;

    const appointmentDate = new Date(apt.date);
    const birthDate = new Date(customerBirthDates[apt.customer_id]);

    // Vergleiche Monat und Tag
    if (
      appointmentDate.getMonth() === birthDate.getMonth() &&
      appointmentDate.getDate() === birthDate.getDate()
    ) {
      birthdayAppointments.push({
        customer_name: apt.customer_name,
        birth_date: customerBirthDates[apt.customer_id],
        date: apt.date,
        time_slot: apt.time_slot,
        barber_id: apt.barber_id,
        isToday: apt.date === todayStr,
      });
    }
  }

  // Sortiere: Heute zuerst, dann nach Datum
  birthdayAppointments.sort((a, b) => {
    if (a.isToday && !b.isToday) return -1;
    if (!a.isToday && b.isToday) return 1;
    return a.date.localeCompare(b.date);
  });

  return birthdayAppointments;
}

/**
 * @deprecated Nutze getBirthdayAppointments() stattdessen
 */
export async function getTodaysBirthdayAppointments(): Promise<BirthdayAppointment[]> {
  const all = await getBirthdayAppointments();
  return all.filter(a => a.isToday);
}

/**
 * Zählt wie viele abgeschlossene Termine ein Kunde bereits hatte
 * Prüft basierend auf customer_id oder customer_name + customer_phone
 */
export async function getCustomerVisitCount(
  customerId?: string | null,
  customerName?: string,
  customerPhone?: string | null
): Promise<number> {
  const today = new Date().toISOString().split('T')[0];

  // Wenn customer_id vorhanden, nutze diese
  if (customerId) {
    const { count, error } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .eq('status', 'confirmed')
      .lt('date', today);

    if (error) {
      console.error('Error counting customer visits:', error);
      return 0;
    }

    return count || 0;
  }

  // Fallback: Nach Name + Telefon suchen (für Gast-Buchungen)
  if (customerName) {
    let query = supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('customer_name', customerName)
      .eq('status', 'confirmed')
      .lt('date', today);

    if (customerPhone) {
      query = query.eq('customer_phone', customerPhone);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error counting customer visits by name:', error);
      return 0;
    }

    return count || 0;
  }

  return 0;
}

/**
 * Prüft ob ein Kunde ein Neukunde ist (0 vorherige Termine)
 */
export async function isFirstVisit(
  customerId?: string | null,
  customerName?: string,
  customerPhone?: string | null
): Promise<boolean> {
  const count = await getCustomerVisitCount(customerId, customerName, customerPhone);
  return count === 0;
}

// ============================================
// ADMIN DASHBOARD - Statistiken & Widgets
// ============================================

export interface WeekStats {
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  appointmentCount: number;
}

/**
 * Holt Wochen-Statistiken für die letzten X Wochen
 */
export async function getWeeklyStats(weeksBack: number = 8): Promise<WeekStats[]> {
  const today = new Date();

  // Berechne den frühesten Montag
  const earliestDate = new Date(today);
  earliestDate.setDate(earliestDate.getDate() - (weeksBack * 7));
  const dow = earliestDate.getDay();
  const monOffset = dow === 0 ? -6 : 1 - dow;
  earliestDate.setDate(earliestDate.getDate() + monOffset);

  const startStr = earliestDate.toISOString().split('T')[0];
  const endStr = today.toISOString().split('T')[0];

  // EINE Abfrage für alle Termine im Zeitraum
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('date')
    .gte('date', startStr)
    .lte('date', endStr)
    .eq('status', 'confirmed');

  if (error) {
    console.error('Error fetching weekly stats:', error);
    return [];
  }

  // Gruppiere nach Woche
  const weekCounts: Record<string, number> = {};
  (appointments || []).forEach(apt => {
    const date = new Date(apt.date);
    const d = date.getDay();
    const offset = d === 0 ? -6 : 1 - d;
    const monday = new Date(date);
    monday.setDate(date.getDate() + offset);
    const key = monday.toISOString().split('T')[0];
    weekCounts[key] = (weekCounts[key] || 0) + 1;
  });

  // Erstelle Stats für jede Woche
  const stats: WeekStats[] = [];
  for (let i = 0; i < weeksBack; i++) {
    const weekDate = new Date(today);
    weekDate.setDate(weekDate.getDate() - (i * 7));
    const d = weekDate.getDay();
    const offset = d === 0 ? -6 : 1 - d;
    const monday = new Date(weekDate);
    monday.setDate(weekDate.getDate() + offset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const key = monday.toISOString().split('T')[0];

    stats.push({
      weekNumber: getWeekNumber(monday),
      year: monday.getFullYear(),
      startDate: key,
      endDate: sunday.toISOString().split('T')[0],
      appointmentCount: weekCounts[key] || 0,
    });
  }

  return stats;
}

export interface DayStats {
  date: string;
  dayName: string;
  appointmentCount: number;
}

/**
 * Holt Tages-Statistiken für die letzten X Tage
 */
export async function getDailyStats(daysBack: number = 7): Promise<DayStats[]> {
  const today = new Date();
  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  // Berechne Startdatum
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (daysBack - 1));
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = today.toISOString().split('T')[0];

  // EINE Abfrage für alle Termine im Zeitraum
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('date')
    .gte('date', startStr)
    .lte('date', endStr)
    .eq('status', 'confirmed');

  if (error) {
    console.error('Error fetching daily stats:', error);
  }

  // Gruppiere nach Tag
  const dayCounts: Record<string, number> = {};
  (appointments || []).forEach(apt => {
    dayCounts[apt.date] = (dayCounts[apt.date] || 0) + 1;
  });

  // Erstelle Stats für jeden Tag
  const stats: DayStats[] = [];
  for (let i = 0; i < daysBack; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    stats.push({
      date: dateStr,
      dayName: dayNames[date.getDay()],
      appointmentCount: dayCounts[dateStr] || 0,
    });
  }

  return stats;
}

/**
 * Berechnet die Kalenderwoche nach ISO 8601
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Berechnet die maximalen Slots pro Woche (Barber × Zeitslots × Arbeitstage)
 */
export async function getMaxSlotsPerWeek(): Promise<number> {
  const [barbersResult, slotsResult, openingResult] = await Promise.all([
    supabase.from('team').select('id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('time_slots').select('id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('opening_hours').select('day_of_week').eq('is_closed', false),
  ]);

  const barberCount = barbersResult.count || 0;
  const slotCount = slotsResult.count || 0;
  const workDays = openingResult.data?.length || 6; // Default 6 Tage (Mo-Sa)

  return barberCount * slotCount * workDays;
}

export interface ServicePopularity {
  serviceId: string;
  serviceName: string;
  bookingCount: number;
}

/**
 * Holt die beliebtesten Services der letzten X Tage
 */
export async function getServicePopularity(days: number = 30): Promise<ServicePopularity[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startStr = startDate.toISOString().split('T')[0];

  // Hole alle Termine der letzten X Tage
  const { data: appointments, error: aptError } = await supabase
    .from('appointments')
    .select('service_id')
    .gte('date', startStr)
    .eq('status', 'confirmed');

  if (aptError || !appointments) {
    console.error('Error fetching appointments for service popularity:', aptError);
    return [];
  }

  // Zähle Services
  const serviceCounts: Record<string, number> = {};
  appointments.forEach(apt => {
    if (apt.service_id) {
      serviceCounts[apt.service_id] = (serviceCounts[apt.service_id] || 0) + 1;
    }
  });

  // Hole Service-Namen
  const serviceIds = Object.keys(serviceCounts);
  if (serviceIds.length === 0) return [];

  const { data: services, error: svcError } = await supabase
    .from('services')
    .select('id, name')
    .in('id', serviceIds);

  if (svcError || !services) {
    console.error('Error fetching services:', svcError);
    return [];
  }

  const serviceNames: Record<string, string> = {};
  services.forEach(s => {
    serviceNames[s.id] = s.name;
  });

  // Erstelle sortiertes Ergebnis
  return Object.entries(serviceCounts)
    .map(([serviceId, count]) => ({
      serviceId,
      serviceName: serviceNames[serviceId] || 'Unbekannt',
      bookingCount: count,
    }))
    .sort((a, b) => b.bookingCount - a.bookingCount);
}

export interface CustomerLoyaltyStats {
  totalAppointments: number;
  returningCustomers: number;
  newCustomers: number;
  loyaltyRate: number;
}

/**
 * Berechnet Kundenbindungs-Statistiken der letzten X Tage
 */
export async function getCustomerLoyaltyStats(days: number = 30): Promise<CustomerLoyaltyStats> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startStr = startDate.toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  // Hole ALLE bestätigten Termine (2 Abfragen statt N)
  const [recentResult, historicResult] = await Promise.all([
    // Termine der letzten X Tage
    supabase
      .from('appointments')
      .select('customer_id, customer_name, customer_phone')
      .gte('date', startStr)
      .lte('date', today)
      .eq('status', 'confirmed'),
    // Termine VOR dem Zeitraum (für Stammkunden-Check)
    supabase
      .from('appointments')
      .select('customer_id, customer_name, customer_phone')
      .lt('date', startStr)
      .eq('status', 'confirmed'),
  ]);

  if (recentResult.error || !recentResult.data) {
    console.error('Error fetching recent appointments:', recentResult.error);
    return { totalAppointments: 0, returningCustomers: 0, newCustomers: 0, loyaltyRate: 0 };
  }

  const totalAppointments = recentResult.data.length;
  if (totalAppointments === 0) {
    return { totalAppointments: 0, returningCustomers: 0, newCustomers: 0, loyaltyRate: 0 };
  }

  // Erstelle Set von historischen Kunden-Keys
  const historicCustomers = new Set<string>();
  (historicResult.data || []).forEach(apt => {
    const key = apt.customer_id || `${apt.customer_name}|${apt.customer_phone || ''}`;
    historicCustomers.add(key);
  });

  // Zähle Stammkunden vs Neukunden
  let returningCustomers = 0;
  let newCustomers = 0;
  const checkedCustomers = new Set<string>();

  for (const apt of recentResult.data) {
    const customerKey = apt.customer_id || `${apt.customer_name}|${apt.customer_phone || ''}`;

    if (checkedCustomers.has(customerKey)) {
      returningCustomers++;
      continue;
    }
    checkedCustomers.add(customerKey);

    if (historicCustomers.has(customerKey)) {
      returningCustomers++;
    } else {
      newCustomers++;
    }
  }

  const loyaltyRate = totalAppointments > 0
    ? Math.round((returningCustomers / totalAppointments) * 100)
    : 0;

  return { totalAppointments, returningCustomers, newCustomers, loyaltyRate };
}

// ============================================
// OPEN HOLIDAYS - Feiertage mit Sonderöffnung
// ============================================

export interface OpenHoliday {
  id: number;
  date: string;
  holiday_name: string;
  open_time: string;
  close_time: string;
  created_at: string;
}

export async function getOpenHolidays(): Promise<OpenHoliday[]> {
  const { data, error } = await supabase
    .from('open_holidays')
    .select('*')
    .order('date');

  if (error) {
    console.error('Error fetching open holidays:', error);
    return [];
  }

  return data || [];
}

export async function createOpenHoliday(
  date: string,
  holidayName: string,
  openTime: string = '10:00',
  closeTime: string = '19:00'
): Promise<OpenHoliday | null> {
  const { data, error } = await supabase
    .from('open_holidays')
    .insert({
      date,
      holiday_name: holidayName,
      open_time: openTime,
      close_time: closeTime,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating open holiday:', error);
    return null;
  }

  return data;
}

export async function deleteOpenHoliday(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('open_holidays')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting open holiday:', error);
    return false;
  }

  return true;
}

export async function isOpenHoliday(date: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('open_holidays')
    .select('id')
    .eq('date', date);

  if (error) {
    console.error('Error checking open holiday:', error);
    return false;
  }

  return (data?.length || 0) > 0;
}

// ============================================
// PRODUCTS - Produkte im Laden
// ============================================

export interface Product {
  id: string;
  name: string;
  price: number; // in Cent
  category: 'bart' | 'haare' | 'rasur' | 'pflege';
  image: string | null;
  image_position: string;
  image_scale: number;
  sort_order: number;
  active: boolean;
  created_at: string;
}

// Alle aktiven Produkte abrufen
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('category')
    .order('sort_order');

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  return data || [];
}

// Produkte nach Kategorie abrufen
export async function getProductsByCategory(category: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .eq('category', category)
    .order('sort_order');

  if (error) {
    console.error('Error fetching products by category:', error);
    return [];
  }

  return data || [];
}

// Alle Produkte abrufen (Admin - inkl. inaktive)
export async function getAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('category')
    .order('sort_order');

  if (error) {
    console.error('Error fetching all products:', error);
    return [];
  }

  return data || [];
}

// Produkt erstellen
export async function createProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .insert([product])
    .select()
    .single();

  if (error) {
    console.error('Error creating product:', error);
    return null;
  }

  return data;
}

// Produkt aktualisieren
export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at: _ca, ...safeUpdates } = updates as Product;

  const { error } = await supabase
    .from('products')
    .update(safeUpdates)
    .eq('id', id);

  if (error) {
    console.error('Error updating product:', error);
    return null;
  }

  // Fetch updated product separately (RLS may block chained .select())
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  return data;
}

// Produkt löschen
export async function deleteProduct(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting product:', error);
    return false;
  }

  return true;
}

// Produkt-Reihenfolge aktualisieren
export async function updateProductOrder(items: { id: string; sort_order: number }[]): Promise<boolean> {
  try {
    for (const item of items) {
      const { error } = await supabase
        .from('products')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id);

      if (error) {
        console.error('Error updating product order:', error);
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('Error updating product order:', error);
    return false;
  }
}

// Preis formatieren (Cent zu Euro)
export function formatProductPrice(priceInCent: number): string {
  return (priceInCent / 100).toFixed(2).replace('.', ',') + ' €';
}

// Kategorie-Labels
export const productCategories = {
  bart: 'Bart',
  haare: 'Haare',
  rasur: 'Rasur',
  pflege: 'Pflege',
} as const;

// ============================================
// STAFF WORKING HOURS - Individuelle Arbeitszeiten
// ============================================

// Alle Arbeitszeiten laden (optional gefiltert nach Mitarbeiter)
export async function getStaffWorkingHours(staffId?: string): Promise<StaffWorkingHours[]> {
  let query = supabase
    .from('staff_working_hours')
    .select('*')
    .order('day_of_week');

  if (staffId) {
    query = query.eq('staff_id', staffId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching staff working hours:', error);
    return [];
  }

  return data || [];
}

// Arbeitszeit für einen bestimmten Tag setzen (Upsert)
export async function setStaffWorkingHours(
  staffId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string
): Promise<StaffWorkingHours | null> {
  const { data, error } = await supabase
    .from('staff_working_hours')
    .upsert(
      { staff_id: staffId, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime },
      { onConflict: 'staff_id,day_of_week' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error setting staff working hours:', error);
    return null;
  }

  return data;
}

// Arbeitszeit für einen Tag löschen (zurück zu globalen Zeiten)
export async function deleteStaffWorkingHours(staffId: string, dayOfWeek: number): Promise<boolean> {
  const { error } = await supabase
    .from('staff_working_hours')
    .delete()
    .eq('staff_id', staffId)
    .eq('day_of_week', dayOfWeek);

  if (error) {
    console.error('Error deleting staff working hours:', error);
    return false;
  }

  return true;
}

// Alle Arbeitszeiten für einen Mitarbeiter löschen
export async function clearStaffWorkingHours(staffId: string): Promise<boolean> {
  const { error } = await supabase
    .from('staff_working_hours')
    .delete()
    .eq('staff_id', staffId);

  if (error) {
    console.error('Error clearing staff working hours:', error);
    return false;
  }

  return true;
}

// ============================================
// FREE DAY EXCEPTIONS - Ausnahmen am freien Tag
// ============================================

// Alle Ausnahmen laden (optional gefiltert nach Mitarbeiter)
export async function getFreeDayExceptions(staffId?: string): Promise<FreeDayException[]> {
  let query = supabase
    .from('free_day_exceptions')
    .select('*')
    .order('date');

  if (staffId) {
    query = query.eq('staff_id', staffId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching free day exceptions:', error);
    return [];
  }

  return data || [];
}

// Ausnahmen für einen Zeitraum laden
export async function getFreeDayExceptionsForDateRange(
  startDate: string,
  endDate: string
): Promise<FreeDayException[]> {
  const { data, error } = await supabase
    .from('free_day_exceptions')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date');

  if (error) {
    console.error('Error fetching free day exceptions for range:', error);
    return [];
  }

  return data || [];
}

// Ausnahme erstellen
export async function createFreeDayException(
  staffId: string,
  date: string,
  startTime: string = '10:00',
  endTime: string = '19:00',
  replacementDate?: string
): Promise<FreeDayException | null> {
  const { data, error } = await supabase
    .from('free_day_exceptions')
    .insert({
      staff_id: staffId,
      date,
      start_time: startTime,
      end_time: endTime,
      replacement_date: replacementDate || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating free day exception:', error);
    return null;
  }

  return data;
}

// Ausnahme löschen
export async function deleteFreeDayException(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('free_day_exceptions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting free day exception:', error);
    return false;
  }

  return true;
}

// Helper: Prüft ob ein Barber an seinem freien Tag ausnahmsweise arbeitet
export function hasFreeDayException(
  staffId: string,
  dateStr: string,
  exceptions: FreeDayException[]
): FreeDayException | null {
  return exceptions.find(ex => ex.staff_id === staffId && ex.date === dateStr) || null;
}

// Helper: Effektive Arbeitszeiten für einen Barber an einem Datum ermitteln
export function getEffectiveWorkingHours(
  staffId: string,
  dateStr: string,
  barber: TeamMember,
  staffWorkingHours: StaffWorkingHours[],
  freeDayExceptions: FreeDayException[],
  globalOpeningHours: { open_time: string | null; close_time: string | null; is_closed: boolean } | null
): { startTime: string; endTime: string } | null {
  const dayOfWeek = new Date(dateStr).getDay();

  // 1. Prüfe ob regulärer freier Tag
  const isFreeDay = isBarberFreeDay(barber, dateStr);

  if (isFreeDay) {
    // Prüfe auf Ausnahme
    const exception = hasFreeDayException(staffId, dateStr, freeDayExceptions);
    if (exception) {
      return { startTime: exception.start_time, endTime: exception.end_time };
    }
    // Keine Ausnahme = nicht verfügbar
    return null;
  }

  // 2. Prüfe individuelle Arbeitszeiten
  const individualHours = staffWorkingHours.find(
    wh => wh.staff_id === staffId && wh.day_of_week === dayOfWeek
  );

  if (individualHours) {
    return { startTime: individualHours.start_time, endTime: individualHours.end_time };
  }

  // 3. Fallback auf globale Öffnungszeiten
  if (globalOpeningHours && !globalOpeningHours.is_closed && globalOpeningHours.open_time && globalOpeningHours.close_time) {
    return { startTime: globalOpeningHours.open_time, endTime: globalOpeningHours.close_time };
  }

  return null;
}

// ============================================
// REVIEWS - Kundenbewertungen
// ============================================

export interface Review {
  id: string;
  author_name: string;
  rating: number;
  text: string;
  date: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
}

// Aktive Rezensionen laden (für Website)
export async function getReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
  return data || [];
}

// Alle Rezensionen laden (für Admin)
export async function getAllReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching all reviews:', error);
    return [];
  }
  return data || [];
}

// Rezension erstellen
export async function createReview(review: Omit<Review, 'id' | 'created_at'>): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews')
    .insert(review)
    .select()
    .single();

  if (error) {
    console.error('Error creating review:', error);
    return null;
  }
  return data;
}

// Rezension aktualisieren
export async function updateReview(id: string, updates: Partial<Review>): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating review:', error);
    return null;
  }
  return data;
}

// Rezension löschen
export async function deleteReview(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting review:', error);
    return false;
  }
  return true;
}
