'use client';

import { useState, useEffect } from 'react';
import { getSetting } from '@/lib/supabase';

const DEFAULT_LOGO = '/logo.png';

// Cache: Einmal geladen, für alle Komponenten verfügbar
let cachedLogoUrl: string | null = null;
let fetchPromise: Promise<string> | null = null;

function fetchLogoUrl(): Promise<string> {
  if (!fetchPromise) {
    fetchPromise = getSetting<{ value: string }>('logo_url')
      .then(data => {
        const url = data?.value || DEFAULT_LOGO;
        cachedLogoUrl = url;
        return url;
      })
      .catch(() => {
        cachedLogoUrl = DEFAULT_LOGO;
        return DEFAULT_LOGO;
      });
  }
  return fetchPromise;
}

export function useLogoUrl(): string {
  const [logoUrl, setLogoUrl] = useState(cachedLogoUrl || DEFAULT_LOGO);

  useEffect(() => {
    if (cachedLogoUrl) {
      setLogoUrl(cachedLogoUrl);
    } else {
      fetchLogoUrl().then(setLogoUrl);
    }
  }, []);

  return logoUrl;
}
