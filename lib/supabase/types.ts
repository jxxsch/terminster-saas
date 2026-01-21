/**
 * Database Types
 * These types represent the structure of your Supabase database
 */

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  preferred_language: 'de' | 'en';
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name_de: string;
  name_en: string;
  description_de: string | null;
  description_en: string | null;
  duration: number; // minutes
  price_cents: number; // in cents
  is_active: boolean;
  display_order: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  name: string;
  bio_de: string | null;
  bio_en: string | null;
  avatar_url: string | null;
  position_de: string | null;
  position_en: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface StaffWorkingHours {
  id: string;
  staff_id: string;
  day_of_week: number; // 0=Sunday, 1=Monday, ...
  start_time: string; // TIME format "HH:MM"
  end_time: string; // TIME format "HH:MM"
  is_active: boolean;
}

export interface StaffTimeOff {
  id: string;
  staff_id: string;
  start_date: string; // DATE format "YYYY-MM-DD"
  end_date: string; // DATE format "YYYY-MM-DD"
  reason: string | null;
  created_at: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'deposit_paid';

export interface Booking {
  id: string;
  user_id: string | null;
  service_id: string;
  staff_id: string;

  // Booking Details
  booking_date: string; // DATE format "YYYY-MM-DD"
  start_time: string; // TIME format "HH:MM"
  end_time: string; // TIME format "HH:MM"

  // Customer Info
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  notes: string | null;

  // Status
  status: BookingStatus;

  // Payment
  payment_status: PaymentStatus;
  payment_amount_cents: number | null;
  stripe_payment_intent_id: string | null;

  // Notifications
  confirmation_sent_at: string | null;
  reminder_24h_sent_at: string | null;
  reminder_2h_sent_at: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

export interface BusinessSettings {
  id: string;
  key: string;
  value: Record<string, any>; // JSONB
  description: string | null;
  updated_at: string;
}

// Join types for common queries
export interface BookingWithDetails extends Booking {
  service: Service;
  staff: Staff;
}

export interface StaffWithHours extends Staff {
  working_hours: StaffWorkingHours[];
  time_off: StaffTimeOff[];
}

// Database schema type
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      services: {
        Row: Service;
        Insert: Omit<Service, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Service, 'id' | 'created_at'>>;
      };
      staff: {
        Row: Staff;
        Insert: Omit<Staff, 'id' | 'created_at'>;
        Update: Partial<Omit<Staff, 'id' | 'created_at'>>;
      };
      staff_working_hours: {
        Row: StaffWorkingHours;
        Insert: Omit<StaffWorkingHours, 'id'>;
        Update: Partial<Omit<StaffWorkingHours, 'id'>>;
      };
      staff_time_off: {
        Row: StaffTimeOff;
        Insert: Omit<StaffTimeOff, 'id' | 'created_at'>;
        Update: Partial<Omit<StaffTimeOff, 'id' | 'created_at'>>;
      };
      bookings: {
        Row: Booking;
        Insert: Omit<Booking, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Booking, 'id' | 'created_at'>>;
      };
      business_settings: {
        Row: BusinessSettings;
        Insert: Omit<BusinessSettings, 'id' | 'updated_at'>;
        Update: Partial<Omit<BusinessSettings, 'id'>>;
      };
    };
  };
}
