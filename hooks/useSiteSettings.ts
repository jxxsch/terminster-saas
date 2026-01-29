'use client';

import { useState, useEffect } from 'react';
import { getSetting } from '@/lib/supabase';

// Types for site settings
interface LocalizedText {
  de: string;
  en: string;
}

export interface SiteSettings {
  // Contact
  contact_address: { street: string; city: string };
  contact_phone: { value: string };
  contact_email: { value: string };

  // Social Media
  social_instagram: { value: string };
  social_facebook: { value: string };
  social_youtube: { value: string };
  social_tiktok: { value: string };

  // Footer
  footer: { copyright: string; show_social: boolean };

  // Hero
  hero_title: LocalizedText;
  hero_subtitle: LocalizedText;
  hero_cta: { text: LocalizedText; enabled: boolean };

  // Section titles
  section_about: { title: LocalizedText; subtitle: LocalizedText };
  section_services: { title: LocalizedText; subtitle: LocalizedText };
  section_team: { title: LocalizedText; subtitle: LocalizedText };
  section_gallery: { title: LocalizedText; subtitle: LocalizedText };
  section_contact: { title: LocalizedText; subtitle: LocalizedText };

  // About
  about_text: LocalizedText;
}

// Default values (fallback if settings not found)
const defaultSettings: SiteSettings = {
  contact_address: { street: '', city: '' },
  contact_phone: { value: '' },
  contact_email: { value: '' },
  social_instagram: { value: '' },
  social_facebook: { value: '' },
  social_youtube: { value: '' },
  social_tiktok: { value: '' },
  footer: { copyright: '', show_social: true },
  hero_title: { de: 'BEBAN BARBERSHOP', en: 'BEBAN BARBERSHOP' },
  hero_subtitle: { de: '', en: '' },
  hero_cta: { text: { de: 'Jetzt buchen', en: 'Book now' }, enabled: true },
  section_about: { title: { de: 'Über uns', en: 'About us' }, subtitle: { de: '', en: '' } },
  section_services: { title: { de: 'Unsere Leistungen', en: 'Our Services' }, subtitle: { de: '', en: '' } },
  section_team: { title: { de: 'Unser Team', en: 'Our Team' }, subtitle: { de: '', en: '' } },
  section_gallery: { title: { de: 'Galerie', en: 'Gallery' }, subtitle: { de: '', en: '' } },
  section_contact: { title: { de: 'Kontakt', en: 'Contact' }, subtitle: { de: '', en: '' } },
  about_text: { de: '', en: '' },
};

/**
 * Hook to load site settings from Supabase
 * Returns settings with fallback defaults
 */
export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const keys = Object.keys(defaultSettings) as (keyof SiteSettings)[];
        const results = await Promise.all(
          keys.map(async (key) => {
            const value = await getSetting<SiteSettings[typeof key]>(key);
            return { key, value };
          })
        );

        const newSettings = { ...defaultSettings };
        results.forEach(({ key, value }) => {
          if (value !== null) {
            (newSettings as Record<string, unknown>)[key] = value;
          }
        });

        setSettings(newSettings);
      } catch (error) {
        console.error('Error loading site settings:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, []);

  return { settings, isLoading };
}

/**
 * Hook to load only contact-related settings (lighter weight)
 */
export function useContactSettings() {
  const [settings, setSettings] = useState({
    phone: '',
    email: '',
    address: { street: '', city: '' },
    instagram: '',
    facebook: '',
    youtube: '',
    tiktok: '',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const [phone, email, address, instagram, facebook, youtube, tiktok] = await Promise.all([
          getSetting<{ value: string }>('contact_phone'),
          getSetting<{ value: string }>('contact_email'),
          getSetting<{ street: string; city: string }>('contact_address'),
          getSetting<{ value: string }>('social_instagram'),
          getSetting<{ value: string }>('social_facebook'),
          getSetting<{ value: string }>('social_youtube'),
          getSetting<{ value: string }>('social_tiktok'),
        ]);

        setSettings({
          phone: phone?.value || '',
          email: email?.value || '',
          address: address || { street: '', city: '' },
          instagram: instagram?.value || '',
          facebook: facebook?.value || '',
          youtube: youtube?.value || '',
          tiktok: tiktok?.value || '',
        });
      } catch (error) {
        console.error('Error loading contact settings:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, []);

  return { settings, isLoading };
}
