'use client';

const STORAGE_KEY = 'swr-cache';
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

// Priority keys: higher number = higher priority (kept during eviction)
const KEY_PRIORITY: Record<string, number> = {
  team: 10,
  'services:calendar': 10,
  timeSlots: 8,
  series: 8,
  openingHours: 5,
  closedDates: 5,
  openSundays: 5,
};

function getKeyPriority(key: string): number {
  if (key.startsWith('appointments:')) return 10;
  if (key.startsWith('staffTimeOff:')) return 9;
  return KEY_PRIORITY[key] ?? 1;
}

interface PersistedEntry {
  value: unknown;
  ts: number;
}

function loadFromStorage(): Map<string, PersistedEntry> {
  if (typeof window === 'undefined') return new Map();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as Record<string, PersistedEntry>;
    return new Map(Object.entries(parsed));
  } catch {
    return new Map();
  }
}

function saveToStorage(map: Map<string, PersistedEntry>): void {
  if (typeof window === 'undefined') return;
  try {
    const obj = Object.fromEntries(map);
    let json = JSON.stringify(obj);

    // LRU eviction if over size limit
    if (json.length > MAX_SIZE) {
      const entries = [...map.entries()].sort((a, b) => {
        const prioDiff = getKeyPriority(a[0]) - getKeyPriority(b[0]);
        if (prioDiff !== 0) return prioDiff;
        return a[1].ts - b[1].ts;
      });

      while (json.length > MAX_SIZE && entries.length > 0) {
        const [key] = entries.shift()!;
        map.delete(key);
        json = JSON.stringify(Object.fromEntries(map));
      }
    }

    localStorage.setItem(STORAGE_KEY, json);
  } catch {
    // localStorage full or unavailable - silently fail
  }
}

let scheduledSave: ReturnType<typeof setTimeout> | null = null;
function debouncedSave(persisted: Map<string, PersistedEntry>): void {
  if (scheduledSave) return;
  scheduledSave = setTimeout(() => {
    scheduledSave = null;
    saveToStorage(persisted);
  }, 200);
}

// SWR cache provider factory with localStorage persistence
// Returns a function matching SWR's provider signature: (cache: Readonly<Cache>) => Cache
export function localStorageCacheProvider(parentCache: { keys(): IterableIterator<string>; get(key: string): unknown; set(key: string, value: unknown): void; delete(key: string): void }) {
  const persisted = loadFromStorage();
  const map = new Map<string, unknown>();

  // Hydrate from parent cache first
  for (const key of parentCache.keys()) {
    map.set(key, parentCache.get(key));
  }

  // Then overlay with persisted localStorage data
  for (const [key, entry] of persisted) {
    if (!map.has(key)) {
      map.set(key, entry.value);
    }
  }

  return {
    keys(): IterableIterator<string> {
      return map.keys();
    },
    get(key: string) {
      return map.get(key);
    },
    set(key: string, value: unknown) {
      map.set(key, value);

      // Persist to localStorage (skip internal SWR keys starting with '$')
      if (!key.startsWith('$')) {
        persisted.set(key, { value, ts: Date.now() });
        debouncedSave(persisted);
      }
    },
    delete(key: string) {
      map.delete(key);
      persisted.delete(key);
      debouncedSave(persisted);
    },
  };
}
