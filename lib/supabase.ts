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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
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
  active: boolean;
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
  auth_id: string;
  first_name: string;
  last_name: string;
  name: string; // Kombination aus first_name + last_name für Abwärtskompatibilität
  email: string;
  phone: string | null;
  birth_date: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  barber_id: string;
  date: string;
  time_slot: string;
  service_id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_id: string | null;
  customer_email: string | null;
  status: 'confirmed' | 'cancelled';
  source: 'online' | 'manual';
  series_id: string | null;
  created_at: string;
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
  interval_type: 'weekly' | 'biweekly' | 'monthly'; // Wiederholungsintervall
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
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .or('status.is.null,status.neq.cancelled')
    .order('date')
    .order('time_slot');

  if (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }

  return data || [];
}

export async function createAppointment(appointment: Omit<Appointment, 'id' | 'created_at'>): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .insert(appointment)
    .select()
    .single();

  if (error) {
    console.error('Error creating appointment:', error);
    return null;
  }

  return data;
}

export async function deleteAppointment(id: string): Promise<boolean> {
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

  return { success: true, appointment: updatedAppointment, error: null };
}

// Admin-Funktion: Termin stornieren (ohne 24h-Regel)
export async function cancelAppointmentAdmin(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) {
    console.error('Error cancelling appointment:', error);
    return false;
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

// Kunden nach Namen oder Telefonnummer suchen (für Autocomplete)
export async function searchCustomers(query: string): Promise<Customer[]> {
  if (!query || query.length < 2) return [];

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .or(`name.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`)
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
// AUTH - Authentifizierung
// ============================================

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  birthDate: string; // Format: YYYY-MM-DD
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
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

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
  updates: Partial<Pick<Customer, 'name' | 'phone' | 'email' | 'first_name' | 'last_name' | 'birth_date'>>
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
  created_at: string;
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
    .single();

  if (error) {
    console.error(`Error fetching setting ${key}:`, error);
    return null;
  }

  return data?.value as T;
}

export async function getAllSettings(): Promise<Record<string, unknown>> {
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
