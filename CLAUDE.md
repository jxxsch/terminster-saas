# Claude Code Projektrichtlinien

## Projektübersicht

**Beban Barbershop** - Next.js Website mit Supabase Backend für Terminbuchung und Verwaltung.

## Kommunikation

- **Sprache:** Immer auf Deutsch antworten
- **Transparenz:** Jeden Schritt nach Ausführung erklären
- **Dokumentation:** Nach jedem Schritt die Dokumentation aktualisieren

## Code-Qualität

### Vor jedem Commit prüfen:
```bash
npm run lint      # ESLint Prüfung
npx tsc --noEmit  # TypeScript Prüfung
```

### Single Source of Truth (SSOT)

Alle Inhalte müssen **softcoded** und zentral verwaltet werden:

| Daten | Quelle | Status |
|-------|--------|--------|
| Team/Mitarbeiter | Supabase `team` Tabelle | ✅ Implementiert |
| Services/Preise | Supabase `services` Tabelle | ✅ Implementiert |
| Zeitslots | Supabase `time_slots` Tabelle | ✅ Implementiert |
| Termine | Supabase `appointments` Tabelle | ✅ Implementiert |
| Serientermine | Supabase `series` Tabelle | ✅ Implementiert |

**Keine hardcoded Daten in Komponenten!** Alle dynamischen Inhalte kommen aus Supabase.

### Internationalisierung (i18n)

**Alle Texte müssen i18n-kompatibel sein!** Keine hardcoded Strings in Komponenten.

```typescript
// ❌ FALSCH - hardcoded Text
<button>Speichern</button>

// ✅ RICHTIG - mit useTranslations
import { useTranslations } from 'next-intl';
const t = useTranslations('common');
<button>{t('save')}</button>
```

**Regeln:**
- Alle UI-Texte in `messages/de.json` und `messages/en.json` pflegen
- `useTranslations()` Hook in Client Components verwenden
- `getTranslations()` in Server Components verwenden
- Namespace-Struktur: `common`, `booking`, `admin`, `dashboard`, etc.
- Deutsche Texte als Fallback (Default-Locale: `de`)

**Ausnahmen:**
- Eigennamen (z.B. "Beban Barbershop")
- Technische IDs und Codes
- Admin-Panel (intern, nur Deutsch) - *optional zu übersetzen*

### Supabase MCP

Alle Datenbankoperationen über Supabase MCP Tools ausführen:
- `mcp__supabase__execute_sql` - SQL Abfragen
- `mcp__supabase__apply_migration` - Schema-Änderungen
- `mcp__supabase__list_tables` - Tabellen anzeigen

## Registry (Änderungsverlauf)

Wichtige Änderungen hier dokumentieren:

| Datum | Änderung | Dateien |
|-------|----------|---------|
| 2026-01-18 | Dashboard Redesign (hell, kompakt) | `app/dashboard/*`, `components/dashboard/*` |
| 2026-01-18 | Fortschrittsleiste BookingModal | `components/sections/BookingModal.tsx` |
| 2026-01-18 | Serientermin-Option im Modal | `components/dashboard/AddAppointmentModal.tsx` |
| 2026-01-18 | Wochentage Mo-So mit ausgegrauten Sonntag | `app/dashboard/page.tsx` |
| 2026-01-18 | **SSOT Migration:** Team, Services, TimeSlots aus Supabase | `lib/supabase.ts`, alle Komponenten |
| 2026-01-19 | **Login ins BookingModal integriert:** Login-Button aus Header entfernt, Auth-Optionen (Gast/Anmelden) in Schritt 5 | `components/layout/Header.tsx`, `components/sections/BookingModal.tsx` |
| 2026-01-19 | **Admin-Panel implementiert:** Team, Services, Zeitslots, Öffnungszeiten, Urlaub, Content, Einstellungen | `app/admin/*`, `components/admin/*`, `lib/supabase.ts` |
| 2026-01-19 | **Abwesenheiten integriert:** Dashboard-Spalten ausgegraut, BookingModal zeigt "Abwesend" für abwesende Barber | `components/dashboard/WeekView.tsx`, `components/dashboard/AppointmentSlot.tsx`, `components/sections/BookingModal.tsx` |
| 2026-01-19 | **Verkaufsoffene Sonntage:** Admin-UI zum Eintragen, Dashboard und BookingModal berücksichtigen diese | `app/admin/opening-hours/page.tsx`, `app/dashboard/page.tsx`, `components/sections/BookingModal.tsx`, `lib/supabase.ts` |
| 2026-01-19 | **Login-Flow verbessert:** Nach erfolgreichem Login öffnet sich direkt das CustomerPortal | `components/layout/Header.tsx` |
| 2026-01-19 | **Impressum & Datenschutz Seiten:** Rechtliche Seiten mit i18n-Support (DE/EN), LegalLayout, i18n-Navigation | `app/[locale]/impressum/*`, `app/[locale]/datenschutz/*`, `components/layout/Legal*.tsx`, `i18n/navigation.ts`, `messages/*.json` |
| 2026-01-19 | **Header Sprachmenü:** LanguageSwitcher nach links verschoben, nur DE/EN/TR ohne Flaggen, minimalistisches Design | `components/layout/Header.tsx`, `components/LanguageSwitcher.tsx` |
| 2026-01-19 | **Drag & Drop Wochenansicht:** View-Toggle (Tag/Woche), Termine per Drag & Drop verschieben, @dnd-kit Integration | `app/dashboard/page.tsx`, `components/dashboard/FullWeekView.tsx`, `components/dashboard/DragContext.tsx`, `components/dashboard/DraggableSlot.tsx`, `components/dashboard/DroppableCell.tsx`, `components/dashboard/WeekView.tsx`, `lib/supabase.ts` |
| 2026-01-19 | **Wochenansicht Redesign:** Runde Barber-Bilder unter Tages-Headern, Sonntag entfernt, Legende entfernt, Kundennamen direkt in Zellen | `components/dashboard/FullWeekView.tsx` |
| 2026-01-19 | **Barber-Woche Ansicht:** Neue dritte View-Option - Wochenansicht für einzelnen Barber mit Tabs zur Barber-Auswahl | `components/dashboard/BarberWeekView.tsx`, `app/dashboard/page.tsx` |
| 2026-01-20 | **Admin Dashboard Redesign:** Umsatz entfernt, Geburtstags-Widget für Kunden mit Termin heute, Neukunden-Badge "Erster Besuch" | `app/admin/page.tsx`, `lib/supabase.ts` |
| 2026-01-20 | **Admin Dashboard V2:** Hover-Sidebar (64px→224px), Statistik-Modal (Wochen-Vergleich), CollapsibleWidgets, Beliebteste Services, Stammkunden-Quote | `components/admin/AdminSidebar.tsx`, `components/admin/StatsModal.tsx`, `components/admin/CollapsibleWidget.tsx`, `components/admin/StatCard.tsx`, `app/admin/page.tsx`, `app/admin/layout.tsx`, `lib/supabase.ts` |
| 2026-01-20 | **Admin Dashboard V3:** Expandierbare Widgets (accordion-style statt Modals), fixierter Footer, 3-Spalten-Grid | `app/admin/page.tsx`, `components/admin/ExpandableWidget.tsx` |
| 2026-01-20 | **Admin Dashboard V4:** Heute-Widget zeigt Tages-Statistik (letzte 7 Tage), Woche-Widget zeigt KW (letzte 12 Wochen), "Alle anzeigen" Links für Details, Fixed Footer | `app/admin/page.tsx`, `components/admin/DailyStatsModal.tsx`, `lib/supabase.ts` |
| 2026-01-21 | **Dashboard + Admin zusammengeführt:** Gemeinsame AppSidebar, neue Menüstruktur (Kalender, Team, Services, Urlaube, Zeiten, Medien, Statistiken, Einstellungen), kombinierte Zeiten-Seite (Zeitslots + Öffnungszeiten + Sondertage), kombinierte Medien-Seite (Galerie + Content) | `components/shared/AppSidebar.tsx`, `app/admin/zeiten/page.tsx`, `app/admin/medien/page.tsx`, `app/admin/layout.tsx`, `app/dashboard/page.tsx` |
| 2026-01-21 | **Resend E-Mail-Integration:** Buchungsbestätigung, Terminerinnerung (Cron-Job täglich 18:00), Stornierungsbestätigung. Professionelle HTML-Templates mit Beban-Branding | `lib/email.ts`, `lib/email-client.ts`, `app/api/email/route.ts`, `app/api/email/reminders/route.ts`, `vercel.json` |
| 2026-01-21 | **Erweiterte Mitarbeiter-Daten:** Neue Felder in team-Tabelle (phone, birthday, vacation_days, start_date), Anzeige in Listenansicht und Bearbeitungsformular | `lib/supabase.ts`, `app/admin/team/page.tsx` |
| 2026-01-25 | **Multi-Delete für Kalender:** Auswahl-Modus zum gesammelten Löschen mehrerer Termine. Toggle-Button "Auswählen", Checkboxen bei Terminen, Toolbar mit Barber/Zeit-Filter, Bereichsauswahl per Shift-Klick, 2-stufiges Bestätigungs-Modal | `app/(internal)/dashboard/page.tsx`, `components/dashboard/WeekView.tsx`, `components/dashboard/AppointmentSlot.tsx`, `components/dashboard/SelectionToolbar.tsx` (NEU), `components/dashboard/DragContext.tsx` |
| 2026-01-26 | **Freier Tag pro Barber:** Jeder Mitarbeiter kann einen festen wöchentlichen freien Tag haben (Mo-Fr). Admin-UI im Tab "Sondertage", automatische Blockierung im BookingModal und Dashboard. Neues Feld `free_day` in team-Tabelle, Helper `isBarberFreeDay()` | `lib/supabase.ts`, `app/(internal)/admin/zeiten/page.tsx`, `components/sections/BookingModal.tsx`, `components/dashboard/WeekView.tsx`, `messages/*.json` |
| 2026-01-27 | **Produkte-Sektion:** Neue Website-Sektion mit Kategorie-Tabs (Bart, Haare, Rasur, Pflege), Admin-Verwaltung für Produkte (CRUD), Navigation-Item im Header, i18n-Support | `components/sections/Products.tsx`, `app/(internal)/admin/produkte/page.tsx`, `components/shared/AppSidebar.tsx`, `lib/supabase.ts`, `messages/*.json` |
| 2026-01-28 | **Kundenverwaltung im Admin:** Neue Admin-Seite unter Verwaltung/Kunden. Kundenliste mit Suche/Filter, Kundendetails mit Terminhistorie, Bearbeiten, Sperren/Entsperren. Neue Felder `preferred_barber_id` und `is_blocked` in customers-Tabelle | `app/(internal)/admin/kunden/page.tsx`, `components/shared/AppSidebar.tsx`, `lib/supabase.ts` |
| 2026-01-28 | **100 Testkundendaten:** 100 Kundenkonten mit deutschen/ausländischen Namen, Geburtsdaten, ~217 Termine (67 Einzeltermine online, 150 Serientermine), 33 Serien (17 wöchentlich, 16 14-tägig), verteilt auf 5 Wochen | Supabase-Daten |
| 2026-02-08 | **Serientermine Rebuild:** Serien generieren jetzt echte Appointment-Rows (52 Wochen). Neue DB-Felder `is_pause`, `last_generated_date`. PostgreSQL-Funktion `batch_insert_series_appointments`. Neue Supabase-Funktionen: `createSeriesWithAppointments`, `cancelSeriesFuture`, `extendSeriesAppointments`, `updateSeriesRhythm`. Cron-Job `/api/series/extend` (Mo 02:00 UTC). Einmalige Migration `/api/series/migrate`. Virtueller seriesAppointments-useMemo entfernt aus WeekView/BarberWeekView. BookingModal nutzt keine Serie-Liste mehr. | `lib/supabase.ts`, `app/api/series/extend/route.ts`, `app/api/series/migrate/route.ts`, `vercel.json`, `components/dashboard/WeekView.tsx`, `components/dashboard/BarberWeekView.tsx`, `components/dashboard/AddAppointmentModal.tsx`, `components/sections/BookingModal.tsx`, `components/dashboard/DragContext.tsx` |
| 2026-02-08 | **Teilzeit-Blockierung:** Barber können jetzt für Teile eines Tags blockiert werden (z.B. "Krank ab 14:00"). Neue DB-Felder `start_time`/`end_time` in `staff_time_off`. Neuer "Blockierung"-Tab im AddAppointmentModal. Blockierte Slots grau im Kalender, nicht buchbar online. Helper `isSlotBlockedByTimeOff()`. `getFullDayOff`/`getSlotBlock` ersetzen `isBarberOffOnDate` | `lib/supabase.ts`, `components/dashboard/AddAppointmentModal.tsx`, `components/dashboard/WeekView.tsx`, `components/dashboard/BarberWeekView.tsx`, `components/sections/BookingModal.tsx`, `components/sections/BookingModalClassic.tsx`, `components/dashboard/BlockedSlot.tsx` |
| 2026-02-11 | **SWR Caching mit Offline-Support:** Alle Dashboard- und Admin-Seiten von useState+useEffect auf SWR migriert. localStorage-Persistierung für Offline-Fallback. Sofortiges View-Switching (Tag/Woche) via shared Cache. OfflineIndicator-Banner. Altes manuelles Cache-System entfernt. | `hooks/swr/cache-provider.ts` (NEU), `hooks/swr/use-dashboard-data.ts` (NEU), `components/shared/OfflineIndicator.tsx` (NEU), `app/(internal)/layout.tsx`, `lib/supabase.ts`, `components/dashboard/WeekView.tsx`, `components/dashboard/BarberWeekView.tsx`, `app/(internal)/dashboard/page.tsx`, `app/(internal)/admin/page.tsx`, `app/(internal)/admin/team/page.tsx`, `app/(internal)/admin/services/page.tsx`, `app/(internal)/admin/zeiten/page.tsx`, `app/(internal)/admin/produkte/page.tsx`, `app/(internal)/admin/kunden/page.tsx`, `app/(internal)/admin/time-off/page.tsx`, `app/(internal)/admin/settings/page.tsx`, `app/(internal)/admin/content/page.tsx` |

## Dateistruktur

```
my-website/
├── app/
│   ├── [locale]/         # i18n Routing
│   │   ├── layout.tsx    # Locale Layout
│   │   ├── page.tsx      # Homepage
│   │   ├── impressum/    # Impressum-Seite
│   │   └── datenschutz/  # Datenschutz-Seite
│   ├── admin/            # Admin-Panel (mit AppSidebar)
│   │   ├── layout.tsx    # Layout mit Sidebar & Auth
│   │   ├── page.tsx      # Statistiken-Dashboard
│   │   ├── team/         # Team-Verwaltung
│   │   ├── services/     # Services-Verwaltung
│   │   ├── time-off/     # Urlaubs-Verwaltung
│   │   ├── zeiten/       # Kombiniert: Zeitslots + Öffnungszeiten + Sondertage
│   │   ├── medien/       # Kombiniert: Galerie + Content
│   │   ├── produkte/     # Produkte-Verwaltung (CRUD)
│   │   ├── kunden/       # Kundenverwaltung (Liste, Details, Sperren)
│   │   ├── settings/     # Buchungseinstellungen
│   │   ├── time-slots/   # (Redirect → /admin/zeiten?tab=slots)
│   │   ├── opening-hours/# (Redirect → /admin/zeiten?tab=hours)
│   │   ├── gallery/      # (Redirect → /admin/medien?tab=galerie)
│   │   └── content/      # (Redirect → /admin/medien?tab=content)
│   ├── dashboard/        # Terminkalender (mit AppSidebar)
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── shared/           # Gemeinsame Komponenten
│   │   └── AppSidebar.tsx      # Gemeinsame Sidebar für Dashboard & Admin
│   ├── admin/            # Admin-Komponenten
│   │   ├── ExpandableWidget.tsx
│   │   ├── StatsModal.tsx
│   │   ├── BirthdayModal.tsx
│   │   ├── DailyStatsModal.tsx
│   │   ├── SundayPicker.tsx
│   │   └── ConfirmModal.tsx
│   ├── dashboard/        # Dashboard-Komponenten
│   │   ├── AddAppointmentModal.tsx
│   │   ├── AppointmentSlot.tsx
│   │   ├── BarberWeekView.tsx
│   │   ├── DragContext.tsx
│   │   ├── DraggableSlot.tsx
│   │   ├── DroppableCell.tsx
│   │   └── WeekView.tsx
│   ├── layout/           # Layout-Komponenten
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── LegalHeader.tsx
│   │   └── LegalLayout.tsx
│   └── sections/         # Homepage-Sektionen
│       ├── BookingModal.tsx
│       ├── Contact.tsx
│       ├── Products.tsx    # Produkte-Sektion
│       └── ...
├── i18n/                 # Internationalisierung
│   ├── config.ts
│   ├── request.ts
│   └── navigation.ts
├── messages/             # Übersetzungen
│   ├── de.json
│   └── en.json
├── lib/
│   ├── supabase.ts       # Supabase Client & Funktionen (SSOT)
│   ├── email.ts          # Resend E-Mail-Service (Server-seitig)
│   └── email-client.ts   # E-Mail-Client-Funktionen (Client-seitig)
└── CLAUDE.md             # Diese Datei
```

## Supabase Projekt

- **Project ID:** `enzlztfklydstpqqwvgl`
- **Region:** Frankfurt (eu-central-1)

### Aktuelle Tabellen

| Tabelle | Beschreibung | Spalten |
|---------|--------------|---------|
| `team` | Mitarbeiter | id, name, image, image_position, image_scale, sort_order, active, phone, birthday, vacation_days, start_date, free_day |
| `services` | Leistungen | id, name, price (Cent), duration (Min), sort_order, active |
| `time_slots` | Zeitslots | id, time, sort_order, active |
| `customers` | Kunden | id, auth_id, first_name, last_name, name, email, phone, birth_date, preferred_barber_id, is_blocked, created_at |
| `appointments` | Termine (inkl. Serien) | id, barber_id, date, time_slot, service_id, customer_name, customer_phone, customer_id, customer_email, status, source, series_id, is_pause |
| `series` | Serien-Muster | id, barber_id, day_of_week, time_slot, service_id, customer_name, customer_phone, customer_email, start_date, end_date, interval_type, last_generated_date |
| `staff_time_off` | Urlaub/Abwesenheit | id, staff_id, start_date, end_date, reason, start_time, end_time, created_at |
| `opening_hours` | Öffnungszeiten | id, day_of_week, open_time, close_time, is_closed |
| `site_settings` | Einstellungen & Content | key, value (JSONB), updated_at |
| `closed_dates` | Geschlossene Tage | id, date, reason, created_at |
| `open_sundays` | Verkaufsoffene Sonntage | id, date, open_time, close_time, created_at |
| `products` | Produkte im Laden | id, name, price (Cent), category, image, sort_order, active, created_at |

### Supabase Funktionen (lib/supabase.ts)

```typescript
// Team (Public)
getTeam(): Promise<TeamMember[]>
getTeamMember(id: string): Promise<TeamMember | null>

// Team (Admin)
getAllTeam(): Promise<TeamMember[]>  // inkl. inaktive
createTeamMember(data): Promise<TeamMember | null>
updateTeamMember(id, updates): Promise<TeamMember | null>
deleteTeamMember(id): Promise<boolean>
updateTeamOrder(items): Promise<boolean>

// Services (Public)
getServices(): Promise<Service[]>
getService(id: string): Promise<Service | null>
formatPrice(priceInCent: number): string
formatDuration(minutes: number): string

// Services (Admin)
getAllServices(): Promise<Service[]>
createService(data): Promise<Service | null>
updateService(id, updates): Promise<Service | null>
deleteService(id): Promise<boolean>

// Time Slots
getTimeSlots(): Promise<TimeSlot[]>
getTimeSlotsArray(): Promise<string[]>
getAllTimeSlots(): Promise<TimeSlot[]>
createTimeSlot(slot): Promise<TimeSlot | null>
updateTimeSlot(id, updates): Promise<TimeSlot | null>
deleteTimeSlot(id): Promise<boolean>

// Appointments
getAppointments(startDate, endDate): Promise<Appointment[]>
createAppointment(appointment): Promise<Appointment | null>
deleteAppointment(id): Promise<boolean>
moveAppointment(id, updates): Promise<{ success: boolean; appointment: Appointment | null; error: string | null }>

// Series
getSeries(): Promise<Series[]>
createSeries(series): Promise<Series | null>
deleteSeries(id): Promise<boolean>
updateSeries(id, updates): Promise<Series | null>

// Series Appointments (Echte Termine generieren)
generateSeriesAppointments(series, fromDate, weeksAhead=52): Promise<SeriesGenerationResult>
createSeriesWithAppointments(seriesData, isPause): Promise<{series, appointmentsCreated, appointmentsSkipped, conflicts[]}>
cancelSeriesFuture(seriesId, fromDate): Promise<{success, deletedCount}>
extendSeriesAppointments(seriesId): Promise<SeriesGenerationResult>  // Für Cron-Job
updateSeriesRhythm(seriesId, newIntervalType): Promise<SeriesGenerationResult>

// Staff Time Off (Urlaub)
getStaffTimeOff(): Promise<StaffTimeOff[]>
createStaffTimeOff(data): Promise<StaffTimeOff | null>
deleteStaffTimeOff(id): Promise<boolean>
isStaffOnTimeOff(staffId, date): Promise<boolean>
isSlotBlockedByTimeOff(timeOff, slotTime): boolean  // Prüft ob Slot durch partielle Blockierung betroffen

// Opening Hours
getOpeningHours(): Promise<OpeningHours[]>
updateOpeningHours(dayOfWeek, updates): Promise<OpeningHours | null>

// Site Settings
getSetting<T>(key): Promise<T | null>
getAllSettings(): Promise<Record<string, unknown>>
updateSetting(key, value): Promise<boolean>

// Closed Dates
getClosedDates(): Promise<ClosedDate[]>
createClosedDate(date, reason?): Promise<ClosedDate | null>
deleteClosedDate(id): Promise<boolean>
isDateClosed(date): Promise<boolean>

// Open Sundays (Verkaufsoffene Sonntage)
getOpenSundays(): Promise<OpenSunday[]>
createOpenSunday(date, openTime, closeTime): Promise<OpenSunday | null>
deleteOpenSunday(id): Promise<boolean>
isOpenSunday(date): Promise<boolean>

// Products (Produkte)
getProducts(): Promise<Product[]>
getProductsByCategory(category): Promise<Product[]>
getAllProducts(): Promise<Product[]>
createProduct(data): Promise<Product | null>
updateProduct(id, updates): Promise<Product | null>
deleteProduct(id): Promise<boolean>
updateProductOrder(items): Promise<boolean>
formatProductPrice(priceInCent): string
productCategories: { bart, haare, rasur, pflege }

// Admin Dashboard - Geburtstage & Neukunden
getTodaysBirthdayAppointments(): Promise<BirthdayAppointment[]>  // Kunden mit Geburtstag die heute Termin haben
getCustomerVisitCount(customerId?, customerName?, customerPhone?): Promise<number>  // Anzahl vorheriger Termine
isFirstVisit(customerId?, customerName?, customerPhone?): Promise<boolean>  // Prüft ob Neukunde

// Admin Dashboard - Statistiken & Widgets (NEU)
getWeeklyStats(weeksBack: number): Promise<WeekStats[]>  // Wochen-Statistiken für Modal
getMaxSlotsPerWeek(): Promise<number>  // Max. Slots pro Woche (Barber × Slots × Tage)
getServicePopularity(days: number): Promise<ServicePopularity[]>  // Beliebteste Services
getCustomerLoyaltyStats(days: number): Promise<CustomerLoyaltyStats>  // Stammkunden-Quote
```

### E-Mail-Funktionen (lib/email.ts)

```typescript
// Server-seitige Funktionen
sendBookingConfirmation(data: BookingEmailData): Promise<{ success: boolean; error?: string }>
sendAppointmentReminder(data: ReminderEmailData): Promise<{ success: boolean; error?: string }>
sendCancellationConfirmation(data: CancellationEmailData): Promise<{ success: boolean; error?: string }>
formatDateForEmail(dateString: string): string  // "Montag, 20. Januar 2026"

// Client-seitige Funktionen (lib/email-client.ts)
sendBookingConfirmationEmail(data): Promise<{ success: boolean; error?: string }>
sendCancellationEmail(data): Promise<{ success: boolean; error?: string }>
```

**Umgebungsvariablen:**
```
RESEND_API_KEY=re_xxx              # Resend API-Key
RESEND_FROM_EMAIL=noreply@...     # Absender-E-Mail (muss in Resend verifiziert sein)
CRON_SECRET=xxx                    # Sicherheits-Token für Cron-Job
```

**Cron-Job (Terminerinnerungen):**
- Endpoint: `/api/email/reminders`
- Schedule: Täglich um 18:00 (in vercel.json konfiguriert)
- Sendet Erinnerungen für alle Termine am nächsten Tag

## Testdaten

Die folgenden Testdaten sind in der Datenbank:

**Team:**
- Sahir, Sakvan, Khalid, Mansur

**Services:**
- Haarschnitt (20€, 30 Min)
- Bartrasur (15€, 20 Min)
- Haare & Bart (35€, 45 Min)
- Kids (15€, 20 Min)

**Zeitslots:**
- 10:00 - 12:30 (Vormittag)
- 14:00 - 18:30 (Nachmittag)
