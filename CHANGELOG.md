# Changelog

## 2026-02-11 — Pre-Handover Hardening

### Security
- **Fail-closed Cron-Auth:** `CRON_SECRET` nicht gesetzt → 500 (statt offener Zugang)
- **Email-API abgesichert:** Origin-Validierung (exakter Host-Parse), appointmentId als Pflichtfeld
- **Test/Migration-Endpoints:** Geben 404 in Production zurück (`/api/email/test`, `/api/email-preview`, `/api/migrate/email-image`)
- **PII-Schutz:** `/api/appointments/cancelled` erfordert Supabase Auth-Session
- **SQL-Injection verhindert:** `searchCustomers()` / `searchCustomersAdmin()` sanitizen PostgREST-Filterstrings

### Mobile UX
- **BookingModal Barber-Grid:** 4 → 2 Spalten auf Mobile
- **BookingModal Auth-Inputs:** `auto-fit minmax(140px)` für Galaxy Fold / schmale Screens

### Accessibility
- **BookingModal:** `role="dialog"`, `aria-modal`, `aria-label`
- **ESC-Close:** Keyboard-Handler mit stabiler Ref (kein stale closure)
- **Focus Trap:** Tab-Navigation bleibt innerhalb des Modals
- **Fokus-Wiederherstellung:** Trigger-Element erhält Fokus zurück beim Schließen

### Fixes
- **Hero Subtext:** `whitespace-nowrap` → `md:whitespace-nowrap` (kein Overflow auf Mobile)
- **CircularGallery:** Touch/Mouse/Wheel-Events auf Container statt `window` gescoped

## 2026-02-08 — Serientermine Rebuild

- Serien generieren echte Appointment-Rows (52 Wochen voraus)
- PostgreSQL-Funktion `batch_insert_series_appointments`
- Cron-Job `/api/series/extend` (Montags 02:00 UTC)
- Einmalige Migration `/api/series/migrate`

## 2026-02-08 — Teilzeit-Blockierung

- Barber können für Teile eines Tags blockiert werden (z.B. "Krank ab 14:00")
- Neue DB-Felder `start_time`/`end_time` in `staff_time_off`
- Helper `isSlotBlockedByTimeOff()`

## 2026-01-28 — Kundenverwaltung

- Admin-Seite unter Verwaltung/Kunden
- Kundenliste mit Suche/Filter, Terminhistorie, Sperren/Entsperren

## 2026-01-27 — Produkte-Sektion

- Kategorie-Tabs (Bart, Haare, Rasur, Pflege)
- Admin-CRUD für Produkte

## 2026-01-26 — Freier Tag pro Barber

- Wöchentlicher freier Tag (Mo–Fr) pro Mitarbeiter
- Automatische Blockierung in BookingModal und Dashboard

## 2026-01-25 — Multi-Delete Kalender

- Auswahl-Modus zum gesammelten Löschen mehrerer Termine
- Shift-Klick Bereichsauswahl, 2-stufiges Bestätigungs-Modal

## 2026-01-21 — E-Mail-Integration

- Resend: Buchungsbestätigung, Terminerinnerung, Stornierung
- Cron-Job für tägliche Erinnerungen (23:01 UTC)

## 2026-01-21 — Dashboard + Admin Merge

- Gemeinsame AppSidebar
- Kombinierte Zeiten-/Medien-Seiten

## 2026-01-19 — Admin-Panel + i18n

- Team, Services, Zeitslots, Öffnungszeiten, Urlaub, Content, Einstellungen
- Impressum/Datenschutz mit i18n (DE/EN)
- Drag & Drop Wochenansicht

## 2026-01-18 — Dashboard Redesign + SSOT

- Dashboard (hell, kompakt)
- Single Source of Truth: Team, Services, TimeSlots aus Supabase
