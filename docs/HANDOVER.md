# Projekt-Übergabe: Beban Barbershop

## Projektüberblick

Next.js 16 Website mit Supabase-Backend für Online-Terminbuchung, Admin-Dashboard und Kundenverwaltung eines Barbershops. Deployment auf Vercel, E-Mail-Versand via Resend.

## Lokales Setup

```bash
git clone <repo-url>
cp .env.example .env.local   # Werte eintragen (siehe ENV Checklist)
npm install
npm run dev                   # http://localhost:3001
```

## Deployment (Vercel)

1. Repo mit Vercel verbinden
2. Alle ENV-Variablen setzen (siehe unten)
3. `vercel.json` enthält bereits Cron-Konfiguration
4. Nach Deploy: Admin-PIN in Vercel-ENV setzen

## ENV Checklist

| Variable | Zwingend | Zweck |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Ja | Supabase Projekt-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ja | Supabase Anon Key (Client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Ja | Supabase Service Role (Server-only, für Admin-Ops) |
| `CRON_SECRET` | Ja | Auth-Token für Cron-Endpoints. **Ohne: 500 by design** |
| `NEXT_PUBLIC_SITE_URL` | Ja | Produktions-URL (z.B. `https://terminster.com`). **Ohne: Email-API blockiert in Prod** |
| `NEXT_PUBLIC_BASE_URL` | Ja | Base-URL für E-Mail-Links und Redirects |
| `RESEND_API_KEY` | Ja | Resend API-Key für E-Mail-Versand |
| `RESEND_FROM_EMAIL` | Ja | Verifizierte Absender-Adresse in Resend |
| `CONTACT_EMAIL` | Ja | Empfänger für Kontaktformular |
| `ADMIN_PIN` | Ja | PIN für Admin-Panel Zugang (default: `1234`, ändern!) |
| `ADMIN_EMAIL` | Nein | E-Mail für Admin-PIN-Reset |
| `ADMIN_SECRET` | Nein | Secret für Test-User-Erstellung (nur Dev) |

## Cron-Endpoints

Konfiguriert in `vercel.json`:

| Endpoint | Schedule | Funktion |
|----------|----------|----------|
| `/api/email/reminders` | Täglich 23:01 UTC | Terminerinnerungen für morgen |
| `/api/series/extend` | Montags 02:00 UTC | Serientermine verlängern (52 Wochen) |

Beide erfordern `Authorization: Bearer <CRON_SECRET>`. Vercel setzt diesen Header automatisch wenn `CRON_SECRET` konfiguriert ist. **Ohne CRON_SECRET → 500 (fail-closed by design).**

## QA Status

- Pre-Handover Re-QA: **18/18 PASS**
  - Security: CRON auth fail-closed, Origin-Validierung (exakter Host), Email appointmentId-Pflicht, Auth-Guard auf PII-Endpoints, Test-Routes 404 in Prod
  - Mobile: BookingModal responsive Grids (2-Spalten Barber, auto-fit Inputs)
  - A11y: BookingModal dialog/aria-modal, ESC-close, Focus Trap, Fokus-Wiederherstellung
  - Hero: Kein horizontaler Overflow auf Mobile
- CircularGallery: Touch-Events auf Container gescoped (kein Scroll-Blocking)
- TypeScript: `npx tsc --noEmit` fehlerfrei

## Known Issues / Deferred

| Priorität | Thema | Beschreibung |
|-----------|-------|--------------|
| Medium | Rate Limiting | Kein Rate Limit auf API-Endpoints (empfohlen: `@upstash/ratelimit`) |
| Medium | E-Mail HTML-Escaping | User-Input in E-Mail-Templates wird nicht HTML-escaped |
| Medium | i18n-Lücken | Einige Admin-Texte und Edge-Case-Strings nicht übersetzt |
| Low | z-index System | Werte von 10–99999 verstreut, kein zentrales Token-System |
| Low | Drag & Drop auf blockierte Slots | Keine Verfügbarkeitsprüfung beim Verschieben auf freie Tage/Blockierungen |

## Production-Verifizierung

Nach dem Deploy diese 5 Punkte prüfen:

1. **Cron-Auth:** `curl -X GET https://<domain>/api/series/extend` → muss 401 oder 500 zurückgeben (nie 200)
2. **Test-Routes gesperrt:** `curl https://<domain>/api/email/test` → muss 404 zurückgeben
3. **Buchung testen:** Termin buchen → Bestätigungs-E-Mail kommt an
4. **Admin-Zugang:** `/dashboard` → PIN-Eingabe → Kalender sichtbar
5. **Mobile:** Seite auf Smartphone öffnen → Buchen-Button funktioniert, Gallery scrollbar, kein horizontaler Overflow
