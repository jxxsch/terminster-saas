# Supabase Setup Guide

## 1. Supabase Account erstellen

1. Gehe zu [supabase.com](https://supabase.com)
2. Erstelle einen kostenlosen Account
3. Erstelle ein neues Projekt

## 2. Datenbankschema installieren

1. Öffne dein Supabase Dashboard
2. Navigiere zu **SQL Editor** (linke Sidebar)
3. Erstelle eine neue Query
4. Kopiere den kompletten Inhalt von `supabase-schema.sql`
5. Füge ihn in den SQL Editor ein
6. Klicke auf **Run** (oder Strg+Enter)

✅ Nach erfolgreicher Ausführung solltest du eine Success-Message sehen.

## 3. Environment Variables aktualisieren

Kopiere die Werte aus deinem Supabase Dashboard:

### Supabase URL & Anon Key

1. Gehe zu **Project Settings** → **API**
2. Kopiere die **Project URL**
3. Kopiere den **anon/public** Key

### Service Role Key (WICHTIG: Nur server-side verwenden!)

1. Gehe zu **Project Settings** → **API**
2. Scrolle zu **Service Role Key**
3. **⚠️ ACHTUNG**: Dieser Key hat vollständigen Zugriff - niemals im Browser oder Git committen!

### .env.local aktualisieren

```env
NEXT_PUBLIC_SUPABASE_URL=https://dein-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein_anon_key
SUPABASE_SERVICE_ROLE_KEY=dein_service_role_key
```

## 4. Verifizierung

Überprüfe ob alles funktioniert:

1. Gehe im Supabase Dashboard zu **Table Editor**
2. Du solltest folgende Tabellen sehen:
   - profiles
   - services
   - staff
   - staff_working_hours
   - staff_time_off
   - bookings
   - business_settings

3. In der `services` Tabelle sollten 4 Sample-Services sein
4. In der `staff` Tabelle sollten 2 Sample-Mitarbeiter sein

## 5. Staff Working Hours konfigurieren

Nach der Installation musst du noch die Arbeitszeiten für deine Mitarbeiter eintragen:

1. Gehe zu **Table Editor** → **staff_working_hours**
2. Füge für jeden Staff-Member Arbeitszeiten hinzu:

**Beispiel für Max Müller (Montag-Freitag 9-18 Uhr)**:
```sql
-- Hole die staff_id von Max Müller
SELECT id FROM staff WHERE name = 'Max Müller';

-- Füge Arbeitszeiten ein (ersetze 'staff-uuid' mit der echten UUID)
INSERT INTO staff_working_hours (staff_id, day_of_week, start_time, end_time) VALUES
('staff-uuid', 1, '09:00', '18:00'), -- Montag
('staff-uuid', 2, '09:00', '18:00'), -- Dienstag
('staff-uuid', 3, '09:00', '18:00'), -- Mittwoch
('staff-uuid', 4, '09:00', '18:00'), -- Donnerstag
('staff-uuid', 5, '09:00', '18:00'); -- Freitag
```

## 6. Storage Bucket für Bilder erstellen (optional)

Für Mitarbeiter-Avatare und Service-Bilder:

1. Gehe zu **Storage** im Dashboard
2. Erstelle einen neuen Bucket: `avatars`
3. Mache ihn public (Policies → Public Access)
4. Erstelle einen weiteren Bucket: `service-images`
5. Mache ihn auch public

## 7. Datenbank testen

Teste die Verbindung mit diesem Code:

```typescript
import { createServerClient } from '@/lib/supabase';

// In einer Server Component oder API Route
const supabase = await createServerClient();

// Hole alle Services
const { data: services, error } = await supabase
  .from('services')
  .select('*')
  .eq('is_active', true)
  .order('display_order');

console.log('Services:', services);
```

## Troubleshooting

### RLS Policies blockieren Zugriff
- Überprüfe ob die Policies korrekt erstellt wurden
- Schaue in **Authentication** → **Policies**

### Migration failed
- Lösche alle Tabellen und führe das Schema erneut aus
- Überprüfe ob du Admin-Rechte hast

### Types stimmen nicht
- Supabase generiert automatisch Types: `npx supabase gen types typescript`
- Oder nutze die manuellen Types in `lib/supabase/types.ts`

## Nächste Schritte

✅ Datenbankschema installiert
✅ Environment Variables konfiguriert
✅ Staff Working Hours eingetragen

→ Jetzt kannst du Services und Buchungen in deiner App verwenden!
