/**
 * DST-Safe Date Helper Tests
 *
 * Testet formatDateLocal, parseDateNoon, addDaysLocal auf korrekte Funktion
 * auch über DST-Übergänge hinweg (Europe/Berlin: CET→CEST und CEST→CET).
 *
 * Ausführen: TZ=Europe/Berlin npx tsx tests/dst-date-helpers.test.ts
 */

import { formatDateLocal, parseDateNoon, addDaysLocal } from '../lib/supabase';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.error(`  ❌ ${message}`);
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual === expected) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.error(`  ❌ ${message} — erwartet: ${expected}, erhalten: ${actual}`);
  }
}

// ============================================
// Test 1: formatDateLocal Grundfunktion
// ============================================
console.log('\n📋 Test 1: formatDateLocal Grundfunktion');

assertEqual(formatDateLocal(new Date(2026, 0, 15, 0, 0, 0)), '2026-01-15', 'Mitternacht → korrektes Datum');
assertEqual(formatDateLocal(new Date(2026, 0, 15, 23, 59, 59)), '2026-01-15', '23:59 → korrektes Datum');
assertEqual(formatDateLocal(new Date(2026, 0, 15, 12, 0, 0)), '2026-01-15', 'Mittag → korrektes Datum');
assertEqual(formatDateLocal(new Date(2026, 11, 31, 23, 59, 59)), '2026-12-31', 'Silvester → korrektes Datum');
assertEqual(formatDateLocal(new Date(2026, 0, 1, 0, 0, 0)), '2026-01-01', 'Neujahr → korrektes Datum');
assertEqual(formatDateLocal(new Date(2026, 1, 28, 12, 0, 0)), '2026-02-28', 'Februar 28 → korrektes Datum');

// ============================================
// Test 2: parseDateNoon Grundfunktion
// ============================================
console.log('\n📋 Test 2: parseDateNoon Grundfunktion');

const noon1 = parseDateNoon('2026-03-29');
assertEqual(noon1.getFullYear(), 2026, 'parseDateNoon Jahr korrekt');
assertEqual(noon1.getMonth(), 2, 'parseDateNoon Monat korrekt (März = 2)');
assertEqual(noon1.getDate(), 29, 'parseDateNoon Tag korrekt');
assertEqual(noon1.getHours(), 12, 'parseDateNoon Stunde = 12 (Mittag)');
assertEqual(noon1.getMinutes(), 0, 'parseDateNoon Minuten = 0');

// ============================================
// Test 3: parseDateNoon → formatDateLocal Roundtrip
// ============================================
console.log('\n📋 Test 3: parseDateNoon → formatDateLocal Roundtrip');

const testDates = [
  '2026-01-01', '2026-03-28', '2026-03-29', '2026-03-30',
  '2026-10-24', '2026-10-25', '2026-10-26', '2026-12-31',
  '2027-03-27', '2027-03-28', '2027-03-29',
];
for (const dateStr of testDates) {
  assertEqual(formatDateLocal(parseDateNoon(dateStr)), dateStr, `Roundtrip: ${dateStr}`);
}

// ============================================
// Test 4: addDaysLocal Grundfunktion
// ============================================
console.log('\n📋 Test 4: addDaysLocal Grundfunktion');

const base = parseDateNoon('2026-01-15');
assertEqual(formatDateLocal(addDaysLocal(base, 0)), '2026-01-15', '+0 Tage');
assertEqual(formatDateLocal(addDaysLocal(base, 1)), '2026-01-16', '+1 Tag');
assertEqual(formatDateLocal(addDaysLocal(base, 7)), '2026-01-22', '+7 Tage (1 Woche)');
assertEqual(formatDateLocal(addDaysLocal(base, 14)), '2026-01-29', '+14 Tage (2 Wochen)');
assertEqual(formatDateLocal(addDaysLocal(base, 365)), '2027-01-15', '+365 Tage (1 Jahr)');
assertEqual(formatDateLocal(addDaysLocal(base, 364)), '2027-01-14', '+364 Tage (52 Wochen)');

// ============================================
// Test 5: DST Spring Forward (CET → CEST)
// Europa/Berlin: 2026-03-29 02:00 → 03:00 (Uhren vor)
// ============================================
console.log('\n📋 Test 5: DST Spring Forward (CET → CEST, 2026-03-29)');

// addDaysLocal über den DST-Übergang hinweg
const beforeDST = parseDateNoon('2026-03-28');
assertEqual(formatDateLocal(addDaysLocal(beforeDST, 1)), '2026-03-29', 'Tag vor DST +1 = DST-Tag');
assertEqual(formatDateLocal(addDaysLocal(beforeDST, 2)), '2026-03-30', 'Tag vor DST +2 = Tag nach DST');
assertEqual(formatDateLocal(addDaysLocal(beforeDST, 7)), '2026-04-04', 'Tag vor DST +7 = 1 Woche danach');
assertEqual(formatDateLocal(addDaysLocal(beforeDST, 14)), '2026-04-11', 'Tag vor DST +14 = 2 Wochen danach');

// Mehrere +7-Schritte über DST hinweg (simuliert weekly series)
let weekCurrent = parseDateNoon('2026-03-14'); // 2 Wochen vor DST
const weeklyDates: string[] = [];
for (let i = 0; i < 6; i++) {
  weeklyDates.push(formatDateLocal(weekCurrent));
  weekCurrent = addDaysLocal(weekCurrent, 7);
}
assertEqual(weeklyDates.join(','), '2026-03-14,2026-03-21,2026-03-28,2026-04-04,2026-04-11,2026-04-18',
  'Wöchentliche +7 Schritte über DST korrekt');

// ============================================
// Test 6: DST Fall Back (CEST → CET)
// Europa/Berlin: 2026-10-25 03:00 → 02:00 (Uhren zurück)
// ============================================
console.log('\n📋 Test 6: DST Fall Back (CEST → CET, 2026-10-25)');

const beforeFallback = parseDateNoon('2026-10-24');
assertEqual(formatDateLocal(addDaysLocal(beforeFallback, 1)), '2026-10-25', 'Tag vor Fallback +1');
assertEqual(formatDateLocal(addDaysLocal(beforeFallback, 2)), '2026-10-26', 'Tag vor Fallback +2');
assertEqual(formatDateLocal(addDaysLocal(beforeFallback, 7)), '2026-10-31', 'Tag vor Fallback +7');

// Mehrere +7-Schritte über Herbst-DST
let fallCurrent = parseDateNoon('2026-10-11');
const fallDates: string[] = [];
for (let i = 0; i < 6; i++) {
  fallDates.push(formatDateLocal(fallCurrent));
  fallCurrent = addDaysLocal(fallCurrent, 7);
}
assertEqual(fallDates.join(','), '2026-10-11,2026-10-18,2026-10-25,2026-11-01,2026-11-08,2026-11-15',
  'Wöchentliche +7 Schritte über Herbst-DST korrekt');

// ============================================
// Test 7: Biweekly über DST (Spring Forward)
// Startet 2 Wochen vor DST, 14-tägig
// ============================================
console.log('\n📋 Test 7: Biweekly über Spring-DST');

let biweeklyCurrent = parseDateNoon('2026-03-15'); // Sonntag, 2 Wochen vor DST
const biweeklyDates: string[] = [];
for (let i = 0; i < 5; i++) {
  biweeklyDates.push(formatDateLocal(biweeklyCurrent));
  biweeklyCurrent = addDaysLocal(biweeklyCurrent, 14);
}
assertEqual(biweeklyDates.join(','), '2026-03-15,2026-03-29,2026-04-12,2026-04-26,2026-05-10',
  '14-tägige Schritte über Spring-DST korrekt');

// ============================================
// Test 8: Biweekly diffDays-Berechnung (wie in generateSeriesAppointments)
// Simuliert die biweekly-Logik mit Noon-Daten
// ============================================
console.log('\n📋 Test 8: Biweekly diffDays mit Noon-Daten über DST');

const seriesStart = parseDateNoon('2026-03-01'); // Serie startet So 1. März
const seriesStartTime = seriesStart.getTime();

// Teste diffDays an mehreren Punkten über DST
const testPoints = [
  { date: '2026-03-01', expectedWeek: 0, shouldGenerate: true },
  { date: '2026-03-08', expectedWeek: 1, shouldGenerate: false },
  { date: '2026-03-15', expectedWeek: 2, shouldGenerate: true },
  { date: '2026-03-22', expectedWeek: 3, shouldGenerate: false },
  { date: '2026-03-29', expectedWeek: 4, shouldGenerate: true },  // DST-Tag!
  { date: '2026-04-05', expectedWeek: 5, shouldGenerate: false },
  { date: '2026-04-12', expectedWeek: 6, shouldGenerate: true },
];

for (const tp of testPoints) {
  const current = parseDateNoon(tp.date);
  const diffDays = Math.round((current.getTime() - seriesStartTime) / (24 * 60 * 60 * 1000));
  const diffWeeks = Math.floor(diffDays / 7);
  const shouldGenerate = diffWeeks >= 0 && diffWeeks % 2 === 0;

  assertEqual(diffWeeks, tp.expectedWeek, `${tp.date}: Woche ${tp.expectedWeek}`);
  assertEqual(shouldGenerate, tp.shouldGenerate, `${tp.date}: shouldGenerate=${tp.shouldGenerate}`);
}

// ============================================
// Test 9: Vergleich alt vs. neu — BUG-Reproduktion
// new Date("YYYY-MM-DD") interpretiert als UTC Mitternacht → toISOString korrekt,
// aber getDate() in CET/CEST kann abweichen!
// ============================================
console.log('\n📋 Test 9: Bug-Reproduktion — alte Methode vs. neue Methode');

// Alte Methode (buggy): new Date("2026-03-29") = UTC Mitternacht = 28. März 23:00 CET
const oldDate = new Date('2026-03-29');
const oldStr = oldDate.toISOString().split('T')[0];
const oldLocalDay = oldDate.getDate();

// Neue Methode (korrekt)
const newDate = parseDateNoon('2026-03-29');
const newStr = formatDateLocal(newDate);
const newLocalDay = newDate.getDate();

assertEqual(oldStr, '2026-03-29', 'Alte Methode: toISOString() liefert korrektes UTC-Datum');
assertEqual(newStr, '2026-03-29', 'Neue Methode: formatDateLocal() liefert korrektes lokales Datum');
assertEqual(newLocalDay, 29, 'Neue Methode: getDate() = 29 (korrekt)');

// In CET: new Date("2026-03-29") = UTC 00:00 = CET 01:00 (noch CET, nicht CEST)
// Aber new Date("2026-03-29T00:00") wird je nach JS-Engine unterschiedlich behandelt
// Der eigentliche Bug tritt bei addDays über DST auf:
console.log(`  ℹ️  Alte Methode getDate(): ${oldLocalDay} (${oldLocalDay === 29 ? 'OK in dieser TZ' : 'FEHLER'})`);
console.log(`  ℹ️  Neue Methode getDate(): ${newLocalDay} (immer korrekt)`);

// Der eigentliche Bug: setDate + toISOString über DST
const bugTest = new Date('2026-03-28'); // UTC Mitternacht
bugTest.setDate(bugTest.getDate() + 7); // +7 Tage
const bugResult = bugTest.toISOString().split('T')[0];
const safeTest = addDaysLocal(parseDateNoon('2026-03-28'), 7);
const safeResult = formatDateLocal(safeTest);

assertEqual(safeResult, '2026-04-04', 'Neue Methode: 2026-03-28 + 7 = 2026-04-04');
console.log(`  ℹ️  Alte Methode Ergebnis: ${bugResult} (${bugResult === '2026-04-04' ? 'zufällig korrekt' : 'BUG!'})`);

// ============================================
// Test 10: addDaysLocal mit großen Sprüngen (52 Wochen = 364 Tage)
// ============================================
console.log('\n📋 Test 10: Große Sprünge (52 Wochen)');

const startDates = ['2026-01-05', '2026-03-29', '2026-06-15', '2026-10-25', '2026-12-28'];
for (const start of startDates) {
  const d = addDaysLocal(parseDateNoon(start), 364);
  const result = formatDateLocal(d);
  // Manuell prüfen: 364 Tage = 52 Wochen, gleicher Wochentag
  const startDate = parseDateNoon(start);
  const endDate = parseDateNoon(result);
  assertEqual(startDate.getDay(), endDate.getDay(), `${start} + 364 Tage: gleicher Wochentag`);
  assert(endDate.getFullYear() === startDate.getFullYear() + 1 ||
         (endDate.getFullYear() === startDate.getFullYear() && endDate.getMonth() > startDate.getMonth()),
    `${start} + 364 Tage = ${result} (ca. 1 Jahr später)`);
}

// ============================================
// Test 11: Regression — formatDateLocal gibt immer 2-stellige Monate/Tage
// ============================================
console.log('\n📋 Test 11: Zero-Padding');

assertEqual(formatDateLocal(new Date(2026, 0, 1, 12, 0, 0)), '2026-01-01', 'Januar 1 → 01-01');
assertEqual(formatDateLocal(new Date(2026, 8, 5, 12, 0, 0)), '2026-09-05', 'September 5 → 09-05');
assertEqual(formatDateLocal(new Date(2026, 11, 9, 12, 0, 0)), '2026-12-09', 'Dezember 9 → 12-09');

// ============================================
// Test 12: Wochentag-Stabilität über DST (simuliert die while-Schleife in generateSeriesAppointments)
// ============================================
console.log('\n📋 Test 12: Wochentag-Stabilität über 52 Wochen mit DST');

// Mittwoch-Serie (day_of_week = 3), startet 2026-01-07
const wednesdayStart = parseDateNoon('2026-01-07'); // Mittwoch
assert(wednesdayStart.getDay() === 3, 'Startdatum ist ein Mittwoch');

let wdCurrent = new Date(wednesdayStart.getFullYear(), wednesdayStart.getMonth(), wednesdayStart.getDate(), 12, 0, 0, 0);
let wrongDayCount = 0;
const totalWeeks = 52;

for (let w = 0; w < totalWeeks; w++) {
  if (wdCurrent.getDay() !== 3) {
    wrongDayCount++;
    console.error(`    Woche ${w}: ${formatDateLocal(wdCurrent)} ist ${['So','Mo','Di','Mi','Do','Fr','Sa'][wdCurrent.getDay()]} statt Mi!`);
  }
  wdCurrent = addDaysLocal(wdCurrent, 7);
}

assertEqual(wrongDayCount, 0, `Alle ${totalWeeks} Wochen korrekt Mittwoch (0 Abweichungen)`);

// ============================================
// Zusammenfassung
// ============================================
console.log('\n' + '='.repeat(50));
console.log(`Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen`);
console.log('='.repeat(50));

if (failed > 0) {
  process.exit(1);
}
