# Terminster SaaS – Technisches Konzept & Kundenfall Beban

---

## Inhaltsverzeichnis

1. [Architektur-Übersicht](#1-architektur-übersicht)
2. [Verknüpfung der Kunden-Websites](#2-verknüpfung-der-kunden-websites)
3. [Ablauf: Website + Buchungssystem verkaufen](#3-ablauf-website--buchungssystem-verkaufen)
4. [Hosting & Domain-Handling (Detailliert)](#4-hosting--domain-handling-detailliert)
5. [Kundenfall: Beban Barber Shop (7 Standorte)](#5-kundenfall-beban-barber-shop-7-standorte)
6. [Technische Checkliste pro Shop](#6-technische-checkliste-pro-shop)
7. [Preismodell-Vorschlag](#7-preismodell-vorschlag)

---

## 1. Architektur-Übersicht

### Das "Mutterschiff"

Terminster ist eine **zentrale Multi-Tenant SaaS-Plattform**:

```
┌─────────────────────────────────────────────────────────────────┐
│                     TERMINSTER PLATTFORM                        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Next.js App  │  │   Supabase   │  │    Vercel    │          │
│  │  (Frontend)  │  │  (Datenbank) │  │   (Hosting)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    MANDANTEN (TENANTS)                   │   │
│  │                                                          │   │
│  │   Beban          Kunde B         Kunde C        ...      │   │
│  │   ├── Shop 1     ├── Shop 1      └── Shop 1             │   │
│  │   ├── Shop 2     └── Shop 2                              │   │
│  │   ├── Shop 3                                             │   │
│  │   ├── Shop 4                                             │   │
│  │   ├── Shop 5                                             │   │
│  │   ├── Shop 6                                             │   │
│  │   └── Shop 7                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Kernprinzipien

| Prinzip | Beschreibung |
|---------|--------------|
| **Eine Codebasis** | Alle Kunden nutzen dieselbe Anwendung |
| **Eine Datenbank** | Alle Daten in einer Supabase-Instanz, getrennt durch `tenant_id` |
| **Datentrennung** | Row-Level Security (RLS) – Kunde sieht nur seine Daten |
| **Multi-Domain** | Jede Domain zeigt auf denselben Server, Inhalt wird dynamisch geladen |

---

## 2. Verknüpfung der Kunden-Websites

### Wie funktioniert das technisch?

Jede Kunden-Domain zeigt auf **unseren Server** (Vercel). Der Server erkennt anhand der Domain, welcher Shop angezeigt werden soll:

```
Anfrage kommt rein:
www.beban-opladen.de
        │
        ▼
┌───────────────────┐
│   VERCEL SERVER   │
│                   │
│   Middleware:     │
│   "Welche Domain  │
│    ist das?"      │
│                   │
│   → beban-opladen │
│   → Shop ID: xyz  │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│   DATENBANK       │
│                   │
│   Lade Daten für  │
│   Shop xyz:       │
│   - Team          │
│   - Services      │
│   - Öffnungszeiten│
│   - Branding      │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│   WEBSITE         │
│                   │
│   Zeige Website   │
│   mit Shop-Daten  │
│   + Buchungs-     │
│     kalender      │
└───────────────────┘
```

### Die Middleware (vereinfacht)

```javascript
// middleware.ts
export function middleware(request) {
  const hostname = request.headers.get('host')

  // Mapping: Domain → Shop
  const domainMapping = {
    'www.beban-opladen.de': 'shop-id-opladen',
    'www.beban-wiesdorf.de': 'shop-id-wiesdorf',
    'www.beban-koeln.de': 'shop-id-koeln',
    // ...
  }

  const shopId = domainMapping[hostname]
  // Leite intern weiter zur Shop-Seite
}
```

---

## 3. Ablauf: Website + Buchungssystem verkaufen

### Schritt-für-Schritt

```
VERKAUF                           TECHNISCHE UMSETZUNG
────────────────────────────────────────────────────────────────

1. Vertrag unterschrieben
        │
        ▼
2. Bestandsaufnahme               - Welche Domains hat der Kunde?
   - Domains                      - Welche Services bietet er an?
   - Services/Preise              - Wer arbeitet dort?
   - Team                         - Wann ist geöffnet?
   - Öffnungszeiten
        │
        ▼
3. Tenant anlegen                 - In Terminster: Neuer Tenant
                                  - Branding (Logo, Farben)
        │
        ▼
4. Shops anlegen                  - Pro Standort ein Shop
                                  - Adresse, Telefon, Koordinaten
        │
        ▼
5. Daten einpflegen               - Team-Mitglieder
                                  - Services + Preise
                                  - Zeitslots
                                  - Öffnungszeiten
        │
        ▼
6. Domain-Umstellung              - DNS beim Kunden anpassen
   (siehe Abschnitt 4)            - Domain in Vercel registrieren
        │
        ▼
7. Go-Live                        - Website ist unter Kunden-Domain
                                    erreichbar
                                  - Buchungen laufen
        │
        ▼
8. Schulung & Übergabe            - Admin-Zugang für Kunden
                                  - Einweisung ins Dashboard
```

---

## 4. Hosting & Domain-Handling (Detailliert)

### Grundprinzip

**WIR hosten ALLES.** Der Kunde hat verschiedene Optionen, wie seine Website erreichbar ist.

---

### Domain-Optionen im Überblick

| Option | URL-Beispiel | Aufwand | Professionalität | Empfehlung |
|--------|--------------|---------|------------------|------------|
| **A) Subdomain** | `beban-opladen.terminster.de` | ⭐ Minimal | ⭐⭐ | Schnellstart / Budget |
| **B) Subdomain + Redirect** | `www.beban.de` → `beban.terminster.de` | ⭐⭐ Gering | ⭐⭐⭐ | Kompromiss |
| **C) Custom Domain** | `www.beban-opladen.de` | ⭐⭐⭐ Mittel | ⭐⭐⭐⭐⭐ | Professionell |

---

### Option A: Subdomain (Wir kontrollieren alles)

Der Kunde bekommt eine Subdomain unter unserer Hauptdomain:

```
beban-opladen.terminster.de   →  Shop Leverkusen-Opladen
beban-wiesdorf.terminster.de  →  Shop Leverkusen-Wiesdorf
beban-langenfeld.terminster.de →  Shop Langenfeld
beban-monheim.terminster.de   →  Shop Monheim
beban-solingen.terminster.de  →  Shop Solingen
beban-koeln.terminster.de     →  Shop Köln
```

**Vorteile:**
- ✅ Keine DNS-Änderung beim Kunden nötig
- ✅ Wir richten das in Sekunden ein
- ✅ SSL automatisch
- ✅ Sofort einsatzbereit

**Nachteile:**
- ❌ Weniger professionell (Kunden-Domain nicht sichtbar)
- ❌ Kunde ist an uns gebunden (Domain gehört uns)

**Technische Umsetzung:**
```bash
# Wir fügen Subdomain in Vercel hinzu
vercel domains add beban-opladen.terminster.de

# In der Datenbank
UPDATE shops SET custom_domain = 'beban-opladen.terminster.de' WHERE ...
```

**Kundenaufwand:** Keiner!

---

### Option B: Subdomain + Redirect (Kompromiss)

Der Kunde behält seine Domain, richtet aber eine Weiterleitung ein:

```
BESUCHER TIPPT EIN:          WIRD WEITERGELEITET ZU:
─────────────────────────────────────────────────────
www.beban-opladen.de    ──301──▶  beban-opladen.terminster.de
www.beban-koeln.de      ──301──▶  beban-koeln.terminster.de
```

**Was sieht der Besucher?**
1. Gibt `www.beban-opladen.de` ein
2. Browser leitet automatisch weiter
3. URL in Adresszeile zeigt `beban-opladen.terminster.de`
4. Website funktioniert normal

**Vorteile:**
- ✅ Kunde behält seine Domain
- ✅ Einfacher als DNS-Umstellung
- ✅ Alte Links/Visitenkarten funktionieren noch

**Nachteile:**
- ❌ URL ändert sich sichtbar für Besucher
- ❌ Zwei URLs für dieselbe Seite (SEO nicht optimal)

**Kundenaufwand:**
Redirect beim Domain-Anbieter einrichten:

```
┌─────────────────────────────────────────────────────┐
│  REDIRECT-EINSTELLUNG BEIM DOMAIN-ANBIETER         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Quelle:      www.beban-opladen.de                 │
│  Ziel:        https://beban-opladen.terminster.de  │
│  Typ:         301 (Permanent Redirect)             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Anleitung für gängige Anbieter:**

| Anbieter | Wo zu finden |
|----------|--------------|
| IONOS (1&1) | Domains → Weiterleitungen |
| Strato | Domainverwaltung → Umleitung |
| GoDaddy | DNS → Forwarding |
| United Domains | DNS-Einstellungen → Weiterleitung |

---

### Option C: Custom Domain (Professionell)

Die Kunden-Domain zeigt direkt auf unseren Server – URL bleibt die Kunden-Domain:

```
BESUCHER TIPPT EIN:          SIEHT IN ADRESSZEILE:
─────────────────────────────────────────────────────
www.beban-opladen.de    ──▶  www.beban-opladen.de  ✓
```

```
VORHER (Kunde hat eigene Website):

    www.beban-opladen.de
            │
            ▼
    ┌─────────────────┐
    │  Alter Server   │
    │  (irgendwo)     │
    │                 │
    │  Alte Website   │
    └─────────────────┘


NACHHER (Kunde nutzt Terminster):

    www.beban-opladen.de
            │
            ▼
    ┌─────────────────┐
    │  VERCEL         │
    │  (unser Server) │
    │                 │
    │  Terminster     │
    │  Website +      │
    │  Buchung        │
    └─────────────────┘
```

**Vorteile:**
- ✅ Maximale Professionalität
- ✅ Kunden-Domain bleibt sichtbar
- ✅ Bestes SEO
- ✅ Kunde behält volle Kontrolle über seine Domain

**Nachteile:**
- ❌ Kunde muss DNS ändern (oder uns Zugang geben)
- ❌ 1-24h Wartezeit bei Umstellung

### Was muss der Kunde tun? (DNS-Umstellung für Option C)

Der Kunde (oder sein Domain-Anbieter) muss **einen DNS-Eintrag ändern**:

#### DNS-Eintrag 1: CNAME (für www.domain.de)

```
Typ:    CNAME
Name:   www
Wert:   cname.vercel-dns.com
TTL:    3600 (oder Auto)
```

#### DNS-Eintrag 2: A-Record (für domain.de ohne www)

```
Typ:    A
Name:   @
Wert:   76.76.21.21
TTL:    3600

(Zusätzlich für IPv6:)
Typ:    AAAA
Name:   @
Wert:   2606:4700:8bfa::1
```

### Was müssen WIR tun?

#### 1. Domain in Vercel registrieren

```bash
# Via Vercel Dashboard oder CLI
vercel domains add www.beban-opladen.de
```

#### 2. Domain-Mapping in Datenbank

```sql
-- In der shops-Tabelle
UPDATE shops
SET custom_domain = 'www.beban-opladen.de'
WHERE id = 'shop-id-opladen';
```

#### 3. SSL-Zertifikat

**Automatisch!** Vercel erstellt ein Let's Encrypt Zertifikat sobald die DNS-Umstellung aktiv ist.

### Zeitlicher Ablauf der Umstellung

```
Tag 1:  Vertrag, Daten sammeln
Tag 2:  Tenant + Shops in Terminster anlegen
Tag 3:  Website-Inhalte + Buchungssystem konfigurieren
Tag 4:  Domain in Vercel registrieren
        DNS-Anleitung an Kunden schicken
Tag 5:  Kunde stellt DNS um
        (Wartezeit: 1-24 Stunden für DNS-Propagation)
Tag 6:  Go-Live, SSL aktiv, Website erreichbar
```

### Was passiert bei der Umstellung?

```
ZEITSTRAHL:

00:00   Kunde ändert DNS-Eintrag
        │
        │   DNS-Propagation (kann 1-24h dauern)
        │   Während dieser Zeit:
        │   - Manche sehen alte Website
        │   - Manche sehen neue Website
        │
~02:00  Die meisten DNS-Server haben aktualisiert
        │
~24:00  Alle sehen neue Website
        │
        ▼
        SSL-Zertifikat automatisch aktiv
        Website voll funktional
```

### Häufige Fragen

**Q: Was ist mit E-Mails?**
A: E-Mail-Einträge (MX-Records) bleiben unberührt. Wir ändern nur A/CNAME.

**Q: Was wenn der Kunde keinen Zugang zu DNS hat?**
A: Er muss seinen Domain-Anbieter kontaktieren oder uns Zugangsdaten geben.

**Q: Können wir die Domain für den Kunden kaufen?**
A: Ja, aber empfohlen ist, dass der Kunde sie selbst besitzt.

---

### Entscheidungshilfe: Welche Option wählen?

```
                    ┌─────────────────────────────┐
                    │  Hat der Kunde bereits      │
                    │  eine eigene Domain?        │
                    └─────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
            NEIN                       JA
              │                         │
              ▼                         ▼
    ┌─────────────────┐     ┌─────────────────────────┐
    │  OPTION A       │     │  Will der Kunde die     │
    │  Subdomain      │     │  URL behalten?          │
    │                 │     └─────────────────────────┘
    │  kunde.         │            │
    │  terminster.de  │    ┌───────┴───────┐
    └─────────────────┘    ▼               ▼
                         NEIN             JA
                          │                │
                          ▼                ▼
              ┌─────────────────┐  ┌─────────────────┐
              │  OPTION B       │  │  OPTION C       │
              │  Redirect       │  │  Custom Domain  │
              │                 │  │                 │
              │  Einfacher,     │  │  Professionell, │
              │  URL ändert     │  │  URL bleibt     │
              │  sich sichtbar  │  │  www.kunde.de   │
              └─────────────────┘  └─────────────────┘
```

### Empfehlung für verschiedene Kundentypen

| Kundentyp | Empfohlene Option | Begründung |
|-----------|-------------------|------------|
| **Neugründer ohne Domain** | A (Subdomain) | Schnell & günstig starten |
| **Kleine Läden, Budget wichtig** | A oder B | Geringer Aufwand |
| **Etablierte Geschäfte** | C (Custom Domain) | Professionelles Auftreten |
| **Ketten mit mehreren Standorten** | C (Custom Domain) | Jeder Shop seine Domain |
| **Beban (7 Shops)** | C (Custom Domain) | Bereits etabliert, jede Filiale hat eigene Domain |

---

## 5. Kundenfall: Beban Barber Shop (7 Standorte)

### Ausgangssituation

- **Kunde:** Beban Barber Shop
- **Standorte:** 7 (aktuell 6 im System, 1 fehlt noch?)
- **Anforderung:** Jeder Standort bekommt eigene Website + Buchungssystem
- **Domains:** Jeder Shop hat bereits eine eigene Domain

### Shop-Übersicht

| # | Shop-Name | Stadt | Domain (Beispiel) | Status |
|---|-----------|-------|-------------------|--------|
| 1 | Barber Shop Beban | Leverkusen-Opladen | www.beban-opladen.de | Zu konfigurieren |
| 2 | Beban Barber Shop 2.0 | Leverkusen-Wiesdorf | www.beban-wiesdorf.de | Hat Testdaten |
| 3 | Beban Barber Shop 4.0 | Langenfeld | www.beban-langenfeld.de | Zu konfigurieren |
| 4 | Beban Barber Shop 5.0 | Monheim | www.beban-monheim.de | Zu konfigurieren |
| 5 | Beban Barber Shop 6.0 | Solingen | www.beban-solingen.de | Zu konfigurieren |
| 6 | Beban Barber Shop Cologne | Köln | www.beban-koeln.de | Zu konfigurieren |
| 7 | ??? | ??? | ??? | Fehlend |

### Technische Struktur

```
TENANT: Beban Barbershop
│
├── SHOP 1: Barber Shop Beban
│   ├── Domain: www.beban-opladen.de
│   ├── Team: [zu importieren]
│   ├── Services: [zu importieren]
│   └── Buchungskalender: ✓
│
├── SHOP 2: Beban Barber Shop 2.0
│   ├── Domain: www.beban-wiesdorf.de
│   ├── Team: Sahir, Sakvan, Khalid, Mansur
│   ├── Services: Haarschnitt, Bartrasur, etc.
│   └── Buchungskalender: ✓
│
├── SHOP 3-6: [analog]
│
└── Zentrales Dashboard
    ├── Tenant-Owner sieht ALLE Shops
    ├── Shop-Admin sieht SEINEN Shop
    └── Barber sieht SEINEN Kalender
```

### Ablaufplan für Beban

```
PHASE 1: SETUP (Woche 1)
────────────────────────────────────────
□ Alle 7 Shop-Domains vom Kunden erfragen
□ Team-Daten pro Shop erfragen (Name, Bild, Kontakt)
□ Services + Preise pro Shop (falls unterschiedlich)
□ Öffnungszeiten pro Shop
□ Koordinaten für Kartenansicht

PHASE 2: KONFIGURATION (Woche 1-2)
────────────────────────────────────────
□ Shops in Terminster vollständig anlegen
□ Team-Mitglieder importieren
□ Services konfigurieren
□ Zeitslots definieren
□ Öffnungszeiten eintragen
□ Website-Inhalte (Texte, Bilder) einpflegen

PHASE 3: DOMAIN-UMSTELLUNG (Woche 2)
────────────────────────────────────────
□ Alle 7 Domains in Vercel registrieren
□ DNS-Anleitung an Kunden senden
□ Kunden DNS umstellen lassen
□ SSL-Zertifikate prüfen
□ Testbuchungen durchführen

PHASE 4: GO-LIVE (Woche 2-3)
────────────────────────────────────────
□ Finale Tests auf allen 7 Domains
□ Admin-Zugänge an Kunden übergeben
□ Schulung für Mitarbeiter
□ Monitoring einrichten
```

---

## 6. Technische Checkliste pro Shop

### Datenbank-Einträge

```
□ Shop in shops-Tabelle
  - name
  - slug
  - address (vollständige Adresse)
  - phone
  - email
  - custom_domain
  - latitude / longitude (für Karte)
  - active = true

□ Team-Mitglieder in team-Tabelle
  - name
  - image (Foto-URL)
  - phone
  - email
  - active = true
  - shop_id

□ Services in services-Tabelle
  - name
  - price (in Cent)
  - duration (in Minuten)
  - active = true
  - shop_id

□ Zeitslots in time_slots-Tabelle
  - time (z.B. "10:00")
  - active = true
  - shop_id

□ Öffnungszeiten in opening_hours-Tabelle
  - day_of_week (0-6)
  - open_time
  - close_time
  - is_closed
  - shop_id
```

### Vercel-Konfiguration

```
□ Domain hinzufügen
  vercel domains add www.beispiel-domain.de

□ Domain dem Projekt zuweisen
  (Im Vercel Dashboard unter Project → Domains)

□ SSL-Status prüfen
  (Sollte automatisch nach DNS-Umstellung aktiv werden)
```

### DNS-Vorlage für Kunden

```
Betreff: DNS-Umstellung für Ihre neue Website

Hallo [Name],

um Ihre neue Website zu aktivieren, muss folgender DNS-Eintrag
bei Ihrem Domain-Anbieter geändert werden:

DOMAIN: www.[ihre-domain].de

NEUER EINTRAG:
─────────────────────────────────────
Typ:    CNAME
Name:   www
Wert:   cname.vercel-dns.com
TTL:    3600
─────────────────────────────────────

Falls Sie auch die Domain OHNE www nutzen möchten ([ihre-domain].de):

Typ:    A
Name:   @ (oder leer lassen)
Wert:   76.76.21.21
TTL:    3600
─────────────────────────────────────

Nach der Änderung kann es bis zu 24 Stunden dauern, bis die neue
Website überall sichtbar ist. Das SSL-Zertifikat wird automatisch
erstellt.

Bei Fragen melden Sie sich gerne.

Viele Grüße
[Dein Name]
```

---

## 7. Preismodell-Vorschlag

### Für Beban (7 Standorte)

| Posten | Einmalig | Monatlich |
|--------|----------|-----------|
| Setup pro Shop (7×) | 7 × 500€ = 3.500€ | – |
| Website-Design (einmalig) | 2.000€ | – |
| Hosting + Buchungssystem (7 Shops) | – | 7 × 49€ = 343€ |
| **GESAMT** | **5.500€** | **343€/Monat** |

### Alternative: Paketpreis für Ketten

| Paket | Beschreibung | Einmalig | Monatlich |
|-------|--------------|----------|-----------|
| **Starter** | 1 Shop | 500€ | 49€ |
| **Business** | 2-5 Shops | 2.000€ | 39€/Shop |
| **Enterprise** | 6+ Shops | 4.000€ | 29€/Shop |

**Für Beban (Enterprise mit 7 Shops):**
- Einmalig: 4.000€
- Monatlich: 7 × 29€ = 203€

---

## Zusammenfassung

### Was wir liefern

1. ✅ Komplette Website pro Shop
2. ✅ Integriertes Buchungssystem
3. ✅ Zentrales Dashboard für Verwaltung
4. ✅ Hosting auf unserer Infrastruktur
5. ✅ SSL-Zertifikate
6. ✅ Mobile-optimierte Darstellung
7. ✅ Karten-Integration mit allen Standorten

### Was der Kunde liefern muss

1. 📋 Domain-Zugangsdaten (oder DNS-Änderung selbst durchführen)
2. 📋 Team-Fotos + Namen
3. 📋 Service-Liste + Preise
4. 📋 Öffnungszeiten
5. 📋 Logo + Wunschfarben

---

*Dokument erstellt: Februar 2026*
*Terminster SaaS – Multi-Tenant Booking Platform*
