// ============================================
// COOKIE CONSENT SYSTEM
// DSGVO/ePrivacy-konform, Opt-in für alles außer "necessary"
// ============================================

export const CONSENT_COOKIE_NAME = 'cookie_consent_v1';
export const CONSENT_VERSION = 1;
export const CONSENT_COOKIE_DAYS = 365;

export type ConsentCategory = 'necessary' | 'functional' | 'analytics' | 'marketing';

export interface ConsentState {
  version: number;
  timestamp: string;
  categories: Record<ConsentCategory, boolean>;
}

export const CONSENT_CATEGORIES: {
  id: ConsentCategory;
  labelDe: string;
  labelEn: string;
  descriptionDe: string;
  descriptionEn: string;
  required: boolean;
}[] = [
  {
    id: 'necessary',
    labelDe: 'Notwendig',
    labelEn: 'Necessary',
    descriptionDe: 'Essenzielle Cookies für Authentifizierung, Spracheinstellungen und Grundfunktionen der Website.',
    descriptionEn: 'Essential cookies for authentication, language settings and basic website functionality.',
    required: true,
  },
  {
    id: 'functional',
    labelDe: 'Funktional',
    labelEn: 'Functional',
    descriptionDe: 'Ermöglicht eingebettete Inhalte wie YouTube-Videos und Google Maps.',
    descriptionEn: 'Enables embedded content like YouTube videos and Google Maps.',
    required: false,
  },
  {
    id: 'analytics',
    labelDe: 'Statistiken',
    labelEn: 'Analytics',
    descriptionDe: 'Hilft uns zu verstehen, wie Besucher die Website nutzen (z.B. Google Analytics).',
    descriptionEn: 'Helps us understand how visitors use the website (e.g. Google Analytics).',
    required: false,
  },
  {
    id: 'marketing',
    labelDe: 'Marketing',
    labelEn: 'Marketing',
    descriptionDe: 'Wird verwendet, um personalisierte Werbung anzuzeigen (z.B. Meta Pixel).',
    descriptionEn: 'Used to display personalized advertising (e.g. Meta Pixel).',
    required: false,
  },
];

const DEFAULT_CONSENT: ConsentState = {
  version: CONSENT_VERSION,
  timestamp: '',
  categories: {
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
  },
};

// --- Cookie Read/Write ---

function setCookie(name: string, value: string, days: number): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
}

// --- Public API ---

export function getConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;

  const raw = getCookie(CONSENT_COOKIE_NAME);
  if (!raw) return null;

  try {
    const parsed: ConsentState = JSON.parse(raw);
    // Version mismatch → treat as no consent (forces re-consent)
    if (parsed.version !== CONSENT_VERSION) return null;
    // Necessary is always true
    parsed.categories.necessary = true;
    return parsed;
  } catch {
    return null;
  }
}

export function saveConsent(categories: Record<ConsentCategory, boolean>): ConsentState {
  const state: ConsentState = {
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    categories: { ...categories, necessary: true },
  };

  setCookie(CONSENT_COOKIE_NAME, JSON.stringify(state), CONSENT_COOKIE_DAYS);

  // Dispatch event so components can react
  window.dispatchEvent(new CustomEvent('consent-changed', { detail: state }));

  // Revoke: delete non-essential cookies if their category was disabled
  if (!categories.functional) {
    deleteNonEssentialCookies('functional');
  }
  if (!categories.analytics) {
    deleteNonEssentialCookies('analytics');
  }
  if (!categories.marketing) {
    deleteNonEssentialCookies('marketing');
  }

  return state;
}

export function hasConsent(category: ConsentCategory): boolean {
  if (category === 'necessary') return true;
  const consent = getConsent();
  return consent?.categories[category] === true;
}

export function hasAnyConsent(): boolean {
  return getConsent() !== null;
}

export function acceptAll(): ConsentState {
  return saveConsent({
    necessary: true,
    functional: true,
    analytics: true,
    marketing: true,
  });
}

export function acceptNecessaryOnly(): ConsentState {
  return saveConsent({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
  });
}

// --- Cleanup ---

const NON_ESSENTIAL_COOKIE_PATTERNS: Record<ConsentCategory, string[]> = {
  necessary: [],
  functional: ['YSC', 'VISITOR_INFO1_LIVE', 'PREF', 'GPS'],
  analytics: ['_ga', '_gid', '_gat', '__utma', '__utmb', '__utmc', '__utmz', '_hjid', '_hjSession'],
  marketing: ['_fbp', '_fbc', 'fr', '_gcl', '_tt_'],
};

function deleteNonEssentialCookies(category: ConsentCategory): void {
  const patterns = NON_ESSENTIAL_COOKIE_PATTERNS[category];
  if (!patterns.length) return;

  document.cookie.split(';').forEach(cookie => {
    const name = cookie.split('=')[0].trim();
    if (patterns.some(p => name.startsWith(p))) {
      deleteCookie(name);
    }
  });
}
