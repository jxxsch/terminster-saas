'use client';

import { useState, useEffect } from 'react';
import { getAllSettings } from '@/lib/supabase';
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
        const all = await getAllSettings();
        const phone = all.contact_phone as { value: string } | undefined;
        const email = all.contact_email as { value: string } | undefined;
        const address = all.contact_address as { street: string; city: string } | undefined;
        const instagram = all.social_instagram as { value: string } | undefined;
        const facebook = all.social_facebook as { value: string } | undefined;
        const youtube = all.social_youtube as { value: string } | undefined;
        const tiktok = all.social_tiktok as { value: string } | undefined;

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
        const all = await getAllSettings();
        const title = all.hero_title as LocalizedText | undefined;
        const subtitle = all.hero_subtitle as LocalizedText | undefined;
        const cta = all.hero_cta as { text: LocalizedText; enabled: boolean } | undefined;
        const background = all.hero_background as HeroBackground | undefined;
        const phone = all.contact_phone as { value: string } | undefined;

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
        const all = await getAllSettings();
        const sectionSettings = all[`section_${section}`] as SectionSettings | undefined;
        if (sectionSettings) {
          setSettings(sectionSettings);
        }

        if (section === 'about') {
          const aboutTextData = all.about_text as LocalizedText | undefined;
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
  instagramUrl: 'https://www.instagram.com/beban_barber_shop2.0/',
  facebookUrl: 'https://www.facebook.com/share/1MtAAD8TAW/',
};

export function useHeroContent() {
  const [content, setContent] = useState<HeroContent>(defaultHeroContent);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadContent() {
      try {
        const all = await getAllSettings();

        // Handle social links - can be string or {value: string}
        const extractUrl = (val: unknown): string => {
          if (!val) return '';
          if (typeof val === 'string') return val;
          if (typeof val === 'object' && val !== null && 'value' in val) return (val as { value: string }).value;
          return '';
        };

        setContent({
          badge: (all.hero_badge as string) || defaultHeroContent.badge,
          headline: (all.hero_headline as string) || defaultHeroContent.headline,
          subtext: (all.hero_subtext as string) || defaultHeroContent.subtext,
          ctaText: (all.hero_cta_text as string) || defaultHeroContent.ctaText,
          locationLabel: (all.hero_location_label as string) || defaultHeroContent.locationLabel,
          locationValue: (all.hero_location_value as string) || defaultHeroContent.locationValue,
          hoursLabel: (all.hero_hours_label as string) || defaultHeroContent.hoursLabel,
          hoursValue: (all.hero_hours_value as string) || defaultHeroContent.hoursValue,
          instagramUrl: extractUrl(all.social_instagram) || defaultHeroContent.instagramUrl,
          facebookUrl: extractUrl(all.social_facebook) || defaultHeroContent.facebookUrl,
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
