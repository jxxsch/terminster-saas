'use client';

import { useState, useEffect } from 'react';
import { getSetting, getAllSettings } from '@/lib/supabase';
import { useLocale } from 'next-intl';

// Types for site settings
interface LocalizedText {
  de: string;
  en: string;
}

interface SectionSettings {
  title: LocalizedText;
  subtitle: LocalizedText;
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
  hero_background: {
    type: 'video' | 'image';
    image_url: string;
    youtube_id: string;
    video_start: number;
    video_end: number;
    video_loop: boolean;
    filters: Record<string, number>;
  };

  // Section titles
  section_about: SectionSettings;
  section_services: SectionSettings;
  section_team: SectionSettings;
  section_gallery: SectionSettings;
  section_contact: SectionSettings;

  // About
  about_text: LocalizedText;

  // SEO
  seo_meta: {
    title: LocalizedText;
    description: LocalizedText;
    og_image: string;
    keywords: string
  };
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
  hero_title: { de: '', en: '' },
  hero_subtitle: { de: '', en: '' },
  hero_cta: { text: { de: 'Jetzt buchen', en: 'Book now' }, enabled: true },
  hero_background: {
    type: 'video',
    image_url: '',
    youtube_id: '3vCGQvscX34',
    video_start: 24,
    video_end: 54,
    video_loop: true,
    filters: { darken: 50 },
  },
  section_about: { title: { de: '', en: '' }, subtitle: { de: '', en: '' } },
  section_services: { title: { de: '', en: '' }, subtitle: { de: '', en: '' } },
  section_team: { title: { de: '', en: '' }, subtitle: { de: '', en: '' } },
  section_gallery: { title: { de: '', en: '' }, subtitle: { de: '', en: '' } },
  section_contact: { title: { de: '', en: '' }, subtitle: { de: '', en: '' } },
  about_text: { de: '', en: '' },
  seo_meta: {
    title: { de: '', en: '' },
    description: { de: '', en: '' },
    og_image: '',
    keywords: ''
  },
};

/**
 * Hook to load all site settings from Supabase
 * Returns settings with fallback defaults
 */
export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const locale = useLocale() as 'de' | 'en';

  useEffect(() => {
    async function loadSettings() {
      try {
        const allSettings = await getAllSettings();

        const newSettings = { ...defaultSettings };
        Object.keys(defaultSettings).forEach(key => {
          if (allSettings[key] !== undefined) {
            (newSettings as Record<string, unknown>)[key] = allSettings[key];
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

  // Helper to get localized text
  const getLocalizedText = (text: LocalizedText | undefined, fallback: string = ''): string => {
    if (!text) return fallback;
    return text[locale] || text.de || fallback;
  };

  return { settings, isLoading, locale, getLocalizedText };
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

/**
 * Hook to load hero settings
 */
interface HeroBackground {
  type: 'video' | 'image';
  image_url: string;
  image_position: string;
  youtube_id: string;
  video_start: number;
  video_end: number;
  video_loop: boolean;
  filters: Record<string, number>;
}

const defaultHeroBackground: HeroBackground = {
  type: 'video',
  image_url: '',
  image_position: '50% 50%',
  youtube_id: '3vCGQvscX34',
  video_start: 24,
  video_end: 54,
  video_loop: true,
  filters: { darken: 50 },
};

export function useHeroSettings() {
  const [settings, setSettings] = useState({
    title: { de: '', en: '' } as LocalizedText,
    subtitle: { de: '', en: '' } as LocalizedText,
    cta: { text: { de: 'Jetzt buchen', en: 'Book now' }, enabled: true },
    background: defaultHeroBackground,
    phone: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const locale = useLocale() as 'de' | 'en';

  useEffect(() => {
    async function loadSettings() {
      try {
        const [title, subtitle, cta, background, phone] = await Promise.all([
          getSetting<LocalizedText>('hero_title'),
          getSetting<LocalizedText>('hero_subtitle'),
          getSetting<{ text: LocalizedText; enabled: boolean }>('hero_cta'),
          getSetting<HeroBackground>('hero_background'),
          getSetting<{ value: string }>('contact_phone'),
        ]);

        console.log('useHeroSettings loaded:', { title, subtitle, background });
        setSettings({
          title: title || { de: '', en: '' },
          subtitle: subtitle || { de: '', en: '' },
          cta: cta || { text: { de: 'Jetzt buchen', en: 'Book now' }, enabled: true },
          background: background || defaultHeroBackground,
          phone: phone?.value || '',
        });
      } catch (error) {
        console.error('Error loading hero settings:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, []);

  const getLocalizedText = (text: LocalizedText): string => {
    return text[locale] || text.de || '';
  };

  return { settings, isLoading, locale, getLocalizedText };
}

/**
 * Hook to load section-specific settings
 */
export function useSectionSettings(section: 'about' | 'services' | 'team' | 'gallery' | 'contact') {
  const [settings, setSettings] = useState<SectionSettings>({
    title: { de: '', en: '' },
    subtitle: { de: '', en: '' },
  });
  const [aboutText, setAboutText] = useState<LocalizedText>({ de: '', en: '' });
  const [isLoading, setIsLoading] = useState(true);
  const locale = useLocale() as 'de' | 'en';

  useEffect(() => {
    async function loadSettings() {
      try {
        const sectionSettings = await getSetting<SectionSettings>(`section_${section}`);
        if (sectionSettings) {
          setSettings(sectionSettings);
        }

        // Load about_text only for about section
        if (section === 'about') {
          const aboutTextData = await getSetting<LocalizedText>('about_text');
          if (aboutTextData) {
            setAboutText(aboutTextData);
          }
        }
      } catch (error) {
        console.error(`Error loading ${section} settings:`, error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, [section]);

  const getLocalizedText = (text: LocalizedText, fallback: string = ''): string => {
    const result = text[locale] || text.de;
    return result || fallback;
  };

  return {
    settings,
    aboutText,
    isLoading,
    locale,
    getLocalizedText,
    // Convenience getters
    title: getLocalizedText(settings.title),
    subtitle: getLocalizedText(settings.subtitle),
  };
}

/**
 * Hook to load hero content settings (neue Texte/Links)
 */
export interface HeroContent {
  badge: string;
  headline: string;
  subtext: string;
  ctaText: string;
  locationLabel: string;
  locationValue: string;
  hoursLabel: string;
  hoursValue: string;
  instagramUrl: string;
  facebookUrl: string;
}

const defaultHeroContent: HeroContent = {
  badge: 'Beban Barber Shop 2.0',
  headline: 'Der Barber Ihres Vertrauens in der Rathaus Galerie Leverkusen',
  subtext: 'Exzellentes Handwerk trifft auf modernes Ambiente.',
  ctaText: 'Termin buchen',
  locationLabel: 'Standort',
  locationValue: 'Friedrich-Ebert-Platz 3a, Leverkusen',
  hoursLabel: 'Öffnungszeiten',
  hoursValue: 'Mo-Sa 10:00 - 19:00',
  instagramUrl: '',
  facebookUrl: '',
};

export function useHeroContent() {
  const [content, setContent] = useState<HeroContent>(defaultHeroContent);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadContent() {
      try {
        const [
          badge,
          headline,
          subtext,
          ctaText,
          locationLabel,
          locationValue,
          hoursLabel,
          hoursValue,
          instagram,
          facebook,
        ] = await Promise.all([
          getSetting<string>('hero_badge'),
          getSetting<string>('hero_headline'),
          getSetting<string>('hero_subtext'),
          getSetting<string>('hero_cta_text'),
          getSetting<string>('hero_location_label'),
          getSetting<string>('hero_location_value'),
          getSetting<string>('hero_hours_label'),
          getSetting<string>('hero_hours_value'),
          getSetting<{ value: string } | string>('social_instagram'),
          getSetting<{ value: string } | string>('social_facebook'),
        ]);

        // Handle social links - can be string or {value: string}
        const extractUrl = (val: { value: string } | string | null): string => {
          if (!val) return '';
          if (typeof val === 'string') return val;
          if (typeof val === 'object' && 'value' in val) return val.value;
          return '';
        };

        setContent({
          badge: badge || defaultHeroContent.badge,
          headline: headline || defaultHeroContent.headline,
          subtext: subtext || defaultHeroContent.subtext,
          ctaText: ctaText || defaultHeroContent.ctaText,
          locationLabel: locationLabel || defaultHeroContent.locationLabel,
          locationValue: locationValue || defaultHeroContent.locationValue,
          hoursLabel: hoursLabel || defaultHeroContent.hoursLabel,
          hoursValue: hoursValue || defaultHeroContent.hoursValue,
          instagramUrl: extractUrl(instagram),
          facebookUrl: extractUrl(facebook),
        });
      } catch (error) {
        console.error('Error loading hero content:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadContent();
  }, []);

  return { content, isLoading };
}
