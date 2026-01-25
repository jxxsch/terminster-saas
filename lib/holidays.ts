// Deutsche Feiertage nach Bundesland
// Alle 16 Bundesländer mit ihren spezifischen gesetzlichen Feiertagen

export type Bundesland =
  | 'BW' // Baden-Württemberg
  | 'BY' // Bayern
  | 'BE' // Berlin
  | 'BB' // Brandenburg
  | 'HB' // Bremen
  | 'HH' // Hamburg
  | 'HE' // Hessen
  | 'MV' // Mecklenburg-Vorpommern
  | 'NI' // Niedersachsen
  | 'NW' // Nordrhein-Westfalen
  | 'RP' // Rheinland-Pfalz
  | 'SL' // Saarland
  | 'SN' // Sachsen
  | 'ST' // Sachsen-Anhalt
  | 'SH' // Schleswig-Holstein
  | 'TH'; // Thüringen

export const BUNDESLAENDER: { value: Bundesland; label: string }[] = [
  { value: 'BW', label: 'Baden-Württemberg' },
  { value: 'BY', label: 'Bayern' },
  { value: 'BE', label: 'Berlin' },
  { value: 'BB', label: 'Brandenburg' },
  { value: 'HB', label: 'Bremen' },
  { value: 'HH', label: 'Hamburg' },
  { value: 'HE', label: 'Hessen' },
  { value: 'MV', label: 'Mecklenburg-Vorpommern' },
  { value: 'NI', label: 'Niedersachsen' },
  { value: 'NW', label: 'Nordrhein-Westfalen' },
  { value: 'RP', label: 'Rheinland-Pfalz' },
  { value: 'SL', label: 'Saarland' },
  { value: 'SN', label: 'Sachsen' },
  { value: 'ST', label: 'Sachsen-Anhalt' },
  { value: 'SH', label: 'Schleswig-Holstein' },
  { value: 'TH', label: 'Thüringen' },
];

// Ostersonntag berechnen (Gaußsche Osterformel)
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// Buß- und Bettag berechnen (Mittwoch vor dem 23. November)
function getBussUndBettag(year: number): Date {
  const nov23 = new Date(year, 10, 23); // 23. November
  const dayOfWeek = nov23.getDay();
  // Mittwoch = 3, wir brauchen den Mittwoch vor dem 23.11.
  const daysToSubtract = dayOfWeek >= 3 ? dayOfWeek - 3 : dayOfWeek + 4;
  const bussUndBettag = new Date(nov23);
  bussUndBettag.setDate(nov23.getDate() - daysToSubtract);
  return bussUndBettag;
}

// Datum formatieren
function formatDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Tage zu Datum addieren
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Welche Bundesländer haben welchen regionalen Feiertag?
const HEILIGE_DREI_KOENIGE: Bundesland[] = ['BW', 'BY', 'ST'];
const FRONLEICHNAM: Bundesland[] = ['BW', 'BY', 'HE', 'NW', 'RP', 'SL'];
const MARIAE_HIMMELFAHRT: Bundesland[] = ['BY', 'SL']; // BY nur in Gemeinden mit überwiegend kath. Bevölkerung
const REFORMATIONSTAG: Bundesland[] = ['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH'];
const ALLERHEILIGEN: Bundesland[] = ['BW', 'BY', 'NW', 'RP', 'SL'];
const BUSS_UND_BETTAG: Bundesland[] = ['SN'];
const WELTFRAUENTAG: Bundesland[] = ['BE', 'MV']; // 8. März
const WELTKINDERTAG: Bundesland[] = ['TH']; // 20. September

/**
 * Berechnet alle gesetzlichen Feiertage für ein Bundesland in einem Jahr
 */
export function getHolidays(year: number, bundesland: Bundesland): Map<string, string> {
  const holidays = new Map<string, string>();
  const easter = getEasterSunday(year);

  // === Bundesweite Feiertage ===
  holidays.set(`${year}-01-01`, 'Neujahr');
  holidays.set(formatDateStr(addDays(easter, -2)), 'Karfreitag');
  holidays.set(formatDateStr(addDays(easter, 1)), 'Ostermontag');
  holidays.set(`${year}-05-01`, 'Tag der Arbeit');
  holidays.set(formatDateStr(addDays(easter, 39)), 'Christi Himmelfahrt');
  holidays.set(formatDateStr(addDays(easter, 50)), 'Pfingstmontag');
  holidays.set(`${year}-10-03`, 'Tag der Deutschen Einheit');
  holidays.set(`${year}-12-25`, '1. Weihnachtstag');
  holidays.set(`${year}-12-26`, '2. Weihnachtstag');

  // === Regionale Feiertage ===

  // Heilige Drei Könige (6. Januar)
  if (HEILIGE_DREI_KOENIGE.includes(bundesland)) {
    holidays.set(`${year}-01-06`, 'Heilige Drei Könige');
  }

  // Internationaler Frauentag (8. März) - Berlin & MV
  if (WELTFRAUENTAG.includes(bundesland)) {
    holidays.set(`${year}-03-08`, 'Internationaler Frauentag');
  }

  // Fronleichnam (60 Tage nach Ostern)
  if (FRONLEICHNAM.includes(bundesland)) {
    holidays.set(formatDateStr(addDays(easter, 60)), 'Fronleichnam');
  }

  // Mariä Himmelfahrt (15. August)
  if (MARIAE_HIMMELFAHRT.includes(bundesland)) {
    holidays.set(`${year}-08-15`, 'Mariä Himmelfahrt');
  }

  // Weltkindertag (20. September) - Thüringen
  if (WELTKINDERTAG.includes(bundesland)) {
    holidays.set(`${year}-09-20`, 'Weltkindertag');
  }

  // Reformationstag (31. Oktober)
  if (REFORMATIONSTAG.includes(bundesland)) {
    holidays.set(`${year}-10-31`, 'Reformationstag');
  }

  // Allerheiligen (1. November)
  if (ALLERHEILIGEN.includes(bundesland)) {
    holidays.set(`${year}-11-01`, 'Allerheiligen');
  }

  // Buß- und Bettag (nur Sachsen)
  if (BUSS_UND_BETTAG.includes(bundesland)) {
    holidays.set(formatDateStr(getBussUndBettag(year)), 'Buß- und Bettag');
  }

  return holidays;
}

/**
 * Alle Feiertage für Kalender-Anzeige (inkl. Ostersonntag/Pfingstsonntag)
 */
export function getHolidaysForDisplay(year: number, bundesland: Bundesland): Map<string, string> {
  const holidays = getHolidays(year, bundesland);
  const easter = getEasterSunday(year);

  // Zusätzlich für Anzeige (keine gesetzlichen Feiertage, aber gut zu wissen)
  holidays.set(formatDateStr(easter), 'Ostersonntag');
  holidays.set(formatDateStr(addDays(easter, 49)), 'Pfingstsonntag');

  return holidays;
}

/**
 * Prüft ob ein Datum ein Feiertag ist
 */
export function isHoliday(dateStr: string, bundesland: Bundesland): boolean {
  const year = new Date(dateStr).getFullYear();
  const holidays = getHolidays(year, bundesland);
  return holidays.has(dateStr);
}

/**
 * Gibt den Namen des Feiertags zurück, falls vorhanden
 */
export function getHolidayName(dateStr: string, bundesland: Bundesland): string | null {
  const year = new Date(dateStr).getFullYear();
  const holidays = getHolidays(year, bundesland);
  return holidays.get(dateStr) || null;
}

/**
 * Berechnet Werktage (Mo-Sa, ohne Sonntage und Feiertage)
 */
export function getWorkingDays(startDate: string, endDate: string, bundesland: Bundesland): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let workingDays = 0;

  // Feiertage für alle relevanten Jahre sammeln
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  const allHolidays = new Map<string, string>();

  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = getHolidays(year, bundesland);
    yearHolidays.forEach((name, date) => allHolidays.set(date, name));
  }

  // Durch jeden Tag iterieren
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    const dateStr = formatDateStr(current);

    // Sonntag = 0
    // Werktage sind Mo-Sa (1-6), also nicht Sonntag (0)
    const isSunday = dayOfWeek === 0;
    const isHolidayDay = allHolidays.has(dateStr);

    if (!isSunday && !isHolidayDay) {
      workingDays++;
    }

    current.setDate(current.getDate() + 1);
  }

  return workingDays;
}

/**
 * Gibt alle Feiertage eines Jahres für ein Bundesland als Array zurück
 */
export function getHolidaysList(year: number, bundesland: Bundesland): { date: string; name: string }[] {
  const holidays = getHolidays(year, bundesland);
  const list: { date: string; name: string }[] = [];

  holidays.forEach((name, date) => {
    list.push({ date, name });
  });

  return list.sort((a, b) => a.date.localeCompare(b.date));
}
