-- =====================================================
-- BARBERSHOP BOOKING SYSTEM - DATABASE SCHEMA
-- =====================================================
-- Supabase PostgreSQL Schema
-- Version: 1.0
-- Date: 2026-01-12
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  preferred_language TEXT DEFAULT 'de' CHECK (preferred_language IN ('de', 'en')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_de TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_de TEXT,
  description_en TEXT,
  duration INTEGER NOT NULL CHECK (duration > 0), -- Minuten
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0), -- in Cent
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff (Barbers/Mitarbeiter)
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  bio_de TEXT,
  bio_en TEXT,
  avatar_url TEXT,
  position_de TEXT,
  position_en TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff Working Hours
CREATE TABLE IF NOT EXISTS staff_working_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday, ...
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(staff_id, day_of_week),
  CHECK (end_time > start_time)
);

-- Staff Time Off (Urlaub, Krankheit)
CREATE TABLE IF NOT EXISTS staff_time_off (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

-- Bookings (Kern des Systems)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,

  -- Booking Details
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Customer Info (auch für Gäste ohne Account)
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  notes TEXT,

  -- Status Management
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),

  -- Payment
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'deposit_paid')),
  payment_amount_cents INTEGER,
  stripe_payment_intent_id TEXT,

  -- Notifications
  confirmation_sent_at TIMESTAMPTZ,
  reminder_24h_sent_at TIMESTAMPTZ,
  reminder_2h_sent_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  CHECK (end_time > start_time)
);

-- Business Settings (Shop-Konfiguration)
CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES für Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_staff ON bookings(staff_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_bookings_date_staff ON bookings(booking_date, staff_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_staff_working_hours_staff ON staff_working_hours(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_staff_dates ON staff_time_off(staff_id, start_date, end_date);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON services
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_settings_updated_at
BEFORE UPDATE ON business_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Check for booking conflicts
CREATE OR REPLACE FUNCTION check_booking_conflict()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for overlapping bookings with same staff on same date
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE staff_id = NEW.staff_id
      AND booking_date = NEW.booking_date
      AND status NOT IN ('cancelled', 'no_show')
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        (start_time, end_time) OVERLAPS (NEW.start_time, NEW.end_time)
      )
  ) THEN
    RAISE EXCEPTION 'Booking conflict: This time slot is already booked for this staff member';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_booking_conflict_trigger
BEFORE INSERT OR UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION check_booking_conflict();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Profiles: Nutzer können nur eigenes Profil sehen/bearbeiten
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Bookings: Nutzer sehen nur eigene Buchungen, alle können neue erstellen
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings"
ON bookings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create bookings"
ON bookings FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update own bookings"
ON bookings FOR UPDATE
USING (auth.uid() = user_id);

-- Services & Staff: Public Read-Only
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active services"
ON services FOR SELECT
USING (is_active = true);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active staff"
ON staff FOR SELECT
USING (is_active = true);

-- Staff Working Hours: Public Read
ALTER TABLE staff_working_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view working hours"
ON staff_working_hours FOR SELECT
USING (true);

-- Staff Time Off: Public Read (to check availability)
ALTER TABLE staff_time_off ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view time off"
ON staff_time_off FOR SELECT
USING (true);

-- Business Settings: Public Read
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view business settings"
ON business_settings FOR SELECT
USING (true);

-- =====================================================
-- INITIAL DATA / SEED
-- =====================================================

-- Insert initial business settings
INSERT INTO business_settings (key, value, description) VALUES
('opening_hours', '{
  "monday": {"open": "09:00", "close": "19:00"},
  "tuesday": {"open": "09:00", "close": "19:00"},
  "wednesday": {"open": "09:00", "close": "19:00"},
  "thursday": {"open": "09:00", "close": "19:00"},
  "friday": {"open": "09:00", "close": "19:00"},
  "saturday": {"open": "10:00", "close": "18:00"},
  "sunday": {"closed": true}
}'::jsonb, 'Shop Öffnungszeiten')
ON CONFLICT (key) DO NOTHING;

INSERT INTO business_settings (key, value, description) VALUES
('booking_settings', '{
  "max_advance_days": 30,
  "min_advance_hours": 2,
  "slot_duration_minutes": 15,
  "buffer_time_minutes": 5
}'::jsonb, 'Buchungskonfiguration')
ON CONFLICT (key) DO NOTHING;

INSERT INTO business_settings (key, value, description) VALUES
('notification_settings', '{
  "email_enabled": true,
  "sms_enabled": true,
  "reminder_24h": true,
  "reminder_2h": true
}'::jsonb, 'Benachrichtigungseinstellungen')
ON CONFLICT (key) DO NOTHING;

INSERT INTO business_settings (key, value, description) VALUES
('payment_settings', '{
  "deposit_percentage": 0,
  "full_payment_required": true,
  "cancellation_deadline_hours": 24,
  "refund_policy": "full"
}'::jsonb, 'Zahlungseinstellungen')
ON CONFLICT (key) DO NOTHING;

-- Insert sample services
INSERT INTO services (name_de, name_en, description_de, description_en, duration, price_cents, display_order) VALUES
('Herrenhaarschnitt', 'Men''s Haircut', 'Klassischer Haarschnitt inkl. Waschen und Styling', 'Classic haircut including wash and styling', 45, 3500, 1),
('Bart trimmen', 'Beard Trim', 'Professionelles Bart-Trimming und Styling', 'Professional beard trimming and styling', 20, 2000, 2),
('Rasur', 'Shave', 'Traditionelle Nassrasur mit heißem Handtuch', 'Traditional wet shave with hot towel', 30, 3000, 3),
('Haarschnitt + Bart', 'Haircut + Beard', 'Komplettpaket: Haarschnitt und Bartpflege', 'Complete package: haircut and beard care', 60, 5000, 4)
ON CONFLICT DO NOTHING;

-- Insert sample staff
INSERT INTO staff (name, position_de, position_en, bio_de, bio_en, display_order) VALUES
('Max Müller', 'Master Barber', 'Master Barber', '15 Jahre Erfahrung in der Herren-Haarkunst', '15 years of experience in men''s grooming', 1),
('Alex Schmidt', 'Senior Barber', 'Senior Barber', 'Spezialist für moderne Styles und klassische Schnitte', 'Specialist in modern styles and classic cuts', 2)
ON CONFLICT DO NOTHING;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Barbershop Database Schema installed successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update your .env.local with SUPABASE_SERVICE_ROLE_KEY';
  RAISE NOTICE '2. Configure Staff Working Hours for each staff member';
  RAISE NOTICE '3. Add custom services and staff as needed';
  RAISE NOTICE '========================================';
END $$;
