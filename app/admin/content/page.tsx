'use client';

import { useState, useEffect } from 'react';
import { getAllSettings, updateSetting } from '@/lib/supabase';

interface LocalizedText {
  de: string;
  en: string;
}

interface SectionSettings {
  title: LocalizedText;
  subtitle: LocalizedText;
}

interface SettingsState {
  // Hero
  hero_title: LocalizedText;
  hero_subtitle: LocalizedText;
  hero_background: { type: string; url: string; video_url: string };
  hero_cta: { text: LocalizedText; enabled: boolean };
  hero_badge: { text: LocalizedText; enabled: boolean };

  // Sektions-Überschriften
  section_about: SectionSettings;
  section_services: SectionSettings;
  section_team: SectionSettings;
  section_gallery: SectionSettings;
  section_contact: SectionSettings;

  // About
  about_text: LocalizedText;

  // Kontakt
  contact_address: { street: string; city: string };
  contact_phone: { value: string };
  contact_email: { value: string };

  // Standort/Maps
  location: { lat: number; lng: number; zoom: number; embed_url: string };

  // Social Media
  social_instagram: { value: string };
  social_facebook: { value: string };

  // SEO
  seo_meta: {
    title: LocalizedText;
    description: LocalizedText;
    og_image: string;
    keywords: string;
  };

  // Rechtliches
  legal_imprint: { content: LocalizedText };
  legal_privacy: { content: LocalizedText };
  legal_cookie: { text: LocalizedText; enabled: boolean };

  // Footer
  footer: { copyright: string; show_social: boolean };

  // Logo
  logo_url: { value: string };
}

const defaultSettings: SettingsState = {
  hero_title: { de: 'BEBAN BARBERSHOP', en: 'BEBAN BARBERSHOP' },
  hero_subtitle: { de: 'Premium Herrenfriseur seit 2018', en: 'Premium Barber since 2018' },
  hero_background: { type: 'image', url: '/hero-bg.jpg', video_url: '' },
  hero_cta: { text: { de: 'Jetzt buchen', en: 'Book now' }, enabled: true },
  hero_badge: { text: { de: 'Premium Barbershop', en: 'Premium Barbershop' }, enabled: true },

  section_about: { title: { de: 'Über uns', en: 'About us' }, subtitle: { de: 'Tradition trifft modernen Style', en: 'Tradition meets modern style' } },
  section_services: { title: { de: 'Unsere Leistungen', en: 'Our Services' }, subtitle: { de: 'Professionelle Pflege für den modernen Mann', en: 'Professional care for the modern man' } },
  section_team: { title: { de: 'Unser Team', en: 'Our Team' }, subtitle: { de: 'Erfahrene Barber mit Leidenschaft', en: 'Experienced barbers with passion' } },
  section_gallery: { title: { de: 'Galerie', en: 'Gallery' }, subtitle: { de: 'Einblicke in unsere Arbeit', en: 'Insights into our work' } },
  section_contact: { title: { de: 'Kontakt', en: 'Contact' }, subtitle: { de: 'Besuchen Sie uns', en: 'Visit us' } },

  about_text: { de: '', en: '' },

  contact_address: { street: '', city: '' },
  contact_phone: { value: '' },
  contact_email: { value: '' },

  location: { lat: 51.4556, lng: 7.0116, zoom: 15, embed_url: '' },

  social_instagram: { value: '' },
  social_facebook: { value: '' },

  seo_meta: {
    title: { de: 'Beban Barbershop - Premium Herrenfriseur', en: 'Beban Barbershop - Premium Barber' },
    description: { de: 'Ihr Premium Barbershop für Haarschnitte und Bartpflege', en: 'Your premium barbershop for haircuts and beard care' },
    og_image: '/og-image.jpg',
    keywords: 'barbershop, friseur, herrenfriseur, haarschnitt, bart'
  },

  legal_imprint: { content: { de: '', en: '' } },
  legal_privacy: { content: { de: '', en: '' } },
  legal_cookie: { text: { de: 'Diese Website verwendet Cookies', en: 'This website uses cookies' }, enabled: false },

  footer: { copyright: '© 2024 Beban Barbershop. Alle Rechte vorbehalten.', show_social: true },

  logo_url: { value: '/logo.png' },
};

type SettingKey = keyof SettingsState;

export default function ContentPage() {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedFields, setSavedFields] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<string>('hero');

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      const data = await getAllSettings();

      if (mounted) {
        const newSettings = { ...defaultSettings };
        Object.keys(defaultSettings).forEach(key => {
          if (data[key]) {
            (newSettings as Record<string, unknown>)[key] = data[key];
          }
        });
        setSettings(newSettings as SettingsState);
        setIsLoading(false);
      }
    }

    loadSettings();
    return () => { mounted = false; };
  }, []);

  async function saveField(key: SettingKey) {
    setSaving(key);
    const success = await updateSetting(key, settings[key]);
    setSaving(null);

    if (success) {
      setSavedFields(prev => new Set(prev).add(key));
      setTimeout(() => {
        setSavedFields(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }, 2000);
    }
  }

  const sections = [
    { id: 'hero', label: 'Hero', icon: '🏠' },
    { id: 'sections', label: 'Sektionen', icon: '📑' },
    { id: 'about', label: 'Über uns', icon: '📝' },
    { id: 'contact', label: 'Kontakt', icon: '📍' },
    { id: 'social', label: 'Social Media', icon: '📱' },
    { id: 'seo', label: 'SEO', icon: '🔍' },
    { id: 'legal', label: 'Rechtliches', icon: '⚖️' },
    { id: 'footer', label: 'Footer', icon: '📄' },
    { id: 'branding', label: 'Branding', icon: '🎨' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium text-black">Content-Verwaltung</h1>
        <p className="text-sm text-gray-500 mt-1">
          Alle Texte, Bilder und Einstellungen der Website verwalten
        </p>
      </div>

      {/* Section Navigation */}
      <div className="flex flex-wrap gap-2 pb-4 border-b border-gray-200">
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              activeSection === section.id
                ? 'bg-gold text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className="mr-2">{section.icon}</span>
            {section.label}
          </button>
        ))}
      </div>

      {/* Hero Section */}
      {activeSection === 'hero' && (
        <div className="space-y-6">
          <ContentCard title="Haupttexte">
            <div className="space-y-4">
              <SettingField
                label="Titel"
                value={settings.hero_title.de}
                onChange={(v) => setSettings(s => ({ ...s, hero_title: { ...s.hero_title, de: v } }))}
                onSave={() => saveField('hero_title')}
                saving={saving === 'hero_title'}
                saved={savedFields.has('hero_title')}
              />
              <SettingField
                label="Untertitel"
                value={settings.hero_subtitle.de}
                onChange={(v) => setSettings(s => ({ ...s, hero_subtitle: { ...s.hero_subtitle, de: v } }))}
                onSave={() => saveField('hero_subtitle')}
                saving={saving === 'hero_subtitle'}
                saved={savedFields.has('hero_subtitle')}
              />
            </div>
          </ContentCard>

          <ContentCard title="Hintergrundbild">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
                <select
                  value={settings.hero_background.type}
                  onChange={(e) => setSettings(s => ({ ...s, hero_background: { ...s.hero_background, type: e.target.value } }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none"
                >
                  <option value="image">Bild</option>
                  <option value="video">Video</option>
                </select>
              </div>
              <SettingField
                label={settings.hero_background.type === 'video' ? 'Video URL' : 'Bild URL'}
                value={settings.hero_background.type === 'video' ? settings.hero_background.video_url : settings.hero_background.url}
                onChange={(v) => setSettings(s => ({
                  ...s,
                  hero_background: {
                    ...s.hero_background,
                    [s.hero_background.type === 'video' ? 'video_url' : 'url']: v
                  }
                }))}
                onSave={() => saveField('hero_background')}
                saving={saving === 'hero_background'}
                saved={savedFields.has('hero_background')}
                placeholder="/hero-bg.jpg"
              />
            </div>
          </ContentCard>

          <ContentCard title="Call-to-Action Button">
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.hero_cta.enabled}
                  onChange={(e) => setSettings(s => ({ ...s, hero_cta: { ...s.hero_cta, enabled: e.target.checked } }))}
                  className="w-4 h-4 accent-gold"
                />
                <span className="text-sm text-gray-700">Button anzeigen</span>
              </label>
            </div>
            <SettingField
              label="Button-Text"
              value={settings.hero_cta.text.de}
              onChange={(v) => setSettings(s => ({ ...s, hero_cta: { ...s.hero_cta, text: { ...s.hero_cta.text, de: v } } }))}
              onSave={() => saveField('hero_cta')}
              saving={saving === 'hero_cta'}
              saved={savedFields.has('hero_cta')}
            />
          </ContentCard>

          <ContentCard title="Badge">
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.hero_badge.enabled}
                  onChange={(e) => setSettings(s => ({ ...s, hero_badge: { ...s.hero_badge, enabled: e.target.checked } }))}
                  className="w-4 h-4 accent-gold"
                />
                <span className="text-sm text-gray-700">Badge anzeigen</span>
              </label>
            </div>
            <SettingField
              label="Badge-Text"
              value={settings.hero_badge.text.de}
              onChange={(v) => setSettings(s => ({ ...s, hero_badge: { ...s.hero_badge, text: { ...s.hero_badge.text, de: v } } }))}
              onSave={() => saveField('hero_badge')}
              saving={saving === 'hero_badge'}
              saved={savedFields.has('hero_badge')}
            />
          </ContentCard>
        </div>
      )}

      {/* Sections */}
      {activeSection === 'sections' && (
        <div className="space-y-6">
          {(['about', 'services', 'team', 'gallery', 'contact'] as const).map(section => {
            const key = `section_${section}` as SettingKey;
            const sectionData = settings[key] as SectionSettings;
            const labels: Record<string, string> = {
              about: 'Über uns',
              services: 'Leistungen',
              team: 'Team',
              gallery: 'Galerie',
              contact: 'Kontakt',
            };

            return (
              <ContentCard key={section} title={`Sektion: ${labels[section]}`}>
                <div className="space-y-4">
                  <SettingField
                    label="Titel"
                    value={sectionData.title.de}
                    onChange={(v) => setSettings(s => ({
                      ...s,
                      [key]: { ...sectionData, title: { ...sectionData.title, de: v } }
                    }))}
                    onSave={() => saveField(key)}
                    saving={saving === key}
                    saved={savedFields.has(key)}
                  />
                  <SettingField
                    label="Untertitel"
                    value={sectionData.subtitle.de}
                    onChange={(v) => setSettings(s => ({
                      ...s,
                      [key]: { ...sectionData, subtitle: { ...sectionData.subtitle, de: v } }
                    }))}
                    onSave={() => saveField(key)}
                    saving={saving === key}
                    saved={savedFields.has(key)}
                  />
                </div>
              </ContentCard>
            );
          })}
        </div>
      )}

      {/* About */}
      {activeSection === 'about' && (
        <div className="space-y-6">
          <ContentCard title="Über uns - Text">
            <SettingField
              label="Text"
              value={settings.about_text.de}
              onChange={(v) => setSettings(s => ({ ...s, about_text: { ...s.about_text, de: v } }))}
              onSave={() => saveField('about_text')}
              saving={saving === 'about_text'}
              saved={savedFields.has('about_text')}
              multiline
              rows={20}
            />
          </ContentCard>
        </div>
      )}

      {/* Contact */}
      {activeSection === 'contact' && (
        <div className="space-y-6">
          <ContentCard title="Adresse">
            <div className="grid grid-cols-2 gap-4">
              <SettingField
                label="Straße & Hausnummer"
                value={settings.contact_address.street}
                onChange={(v) => setSettings(s => ({ ...s, contact_address: { ...s.contact_address, street: v } }))}
                onSave={() => saveField('contact_address')}
                saving={saving === 'contact_address'}
                saved={savedFields.has('contact_address')}
                placeholder="Musterstraße 123"
              />
              <SettingField
                label="PLZ & Stadt"
                value={settings.contact_address.city}
                onChange={(v) => setSettings(s => ({ ...s, contact_address: { ...s.contact_address, city: v } }))}
                onSave={() => saveField('contact_address')}
                saving={saving === 'contact_address'}
                saved={savedFields.has('contact_address')}
                placeholder="12345 Musterstadt"
              />
            </div>
          </ContentCard>

          <ContentCard title="Kontaktdaten">
            <div className="grid grid-cols-2 gap-4">
              <SettingField
                label="Telefon"
                value={settings.contact_phone.value}
                onChange={(v) => setSettings(s => ({ ...s, contact_phone: { value: v } }))}
                onSave={() => saveField('contact_phone')}
                saving={saving === 'contact_phone'}
                saved={savedFields.has('contact_phone')}
                placeholder="+49 123 456789"
              />
              <SettingField
                label="E-Mail"
                value={settings.contact_email.value}
                onChange={(v) => setSettings(s => ({ ...s, contact_email: { value: v } }))}
                onSave={() => saveField('contact_email')}
                saving={saving === 'contact_email'}
                saved={savedFields.has('contact_email')}
                placeholder="info@beispiel.de"
              />
            </div>
          </ContentCard>

          <ContentCard title="Standort (Google Maps)">
            <div className="grid grid-cols-3 gap-4">
              <SettingField
                label="Breitengrad (Lat)"
                value={settings.location.lat.toString()}
                onChange={(v) => setSettings(s => ({ ...s, location: { ...s.location, lat: parseFloat(v) || 0 } }))}
                onSave={() => saveField('location')}
                saving={saving === 'location'}
                saved={savedFields.has('location')}
                placeholder="51.4556"
              />
              <SettingField
                label="Längengrad (Lng)"
                value={settings.location.lng.toString()}
                onChange={(v) => setSettings(s => ({ ...s, location: { ...s.location, lng: parseFloat(v) || 0 } }))}
                onSave={() => saveField('location')}
                saving={saving === 'location'}
                saved={savedFields.has('location')}
                placeholder="7.0116"
              />
              <SettingField
                label="Zoom-Level"
                value={settings.location.zoom.toString()}
                onChange={(v) => setSettings(s => ({ ...s, location: { ...s.location, zoom: parseInt(v) || 15 } }))}
                onSave={() => saveField('location')}
                saving={saving === 'location'}
                saved={savedFields.has('location')}
                placeholder="15"
              />
            </div>
            <div className="mt-4">
              <SettingField
                label="Google Maps Embed URL (optional)"
                value={settings.location.embed_url}
                onChange={(v) => setSettings(s => ({ ...s, location: { ...s.location, embed_url: v } }))}
                onSave={() => saveField('location')}
                saving={saving === 'location'}
                saved={savedFields.has('location')}
                placeholder="https://www.google.com/maps/embed?..."
              />
              <p className="text-xs text-gray-400 mt-1">Wenn gesetzt, wird diese URL anstelle der Koordinaten verwendet</p>
            </div>
          </ContentCard>
        </div>
      )}

      {/* Social Media */}
      {activeSection === 'social' && (
        <div className="space-y-6">
          <ContentCard title="Social Media Links">
            <div className="space-y-4">
              <SettingField
                label="Instagram URL"
                value={settings.social_instagram.value}
                onChange={(v) => setSettings(s => ({ ...s, social_instagram: { value: v } }))}
                onSave={() => saveField('social_instagram')}
                saving={saving === 'social_instagram'}
                saved={savedFields.has('social_instagram')}
                placeholder="https://instagram.com/..."
              />
              <SettingField
                label="Facebook URL"
                value={settings.social_facebook.value}
                onChange={(v) => setSettings(s => ({ ...s, social_facebook: { value: v } }))}
                onSave={() => saveField('social_facebook')}
                saving={saving === 'social_facebook'}
                saved={savedFields.has('social_facebook')}
                placeholder="https://facebook.com/..."
              />
            </div>
          </ContentCard>
        </div>
      )}

      {/* SEO */}
      {activeSection === 'seo' && (
        <div className="space-y-6">
          <ContentCard title="Meta-Titel">
            <SettingField
              label="Meta-Titel"
              value={settings.seo_meta.title.de}
              onChange={(v) => setSettings(s => ({ ...s, seo_meta: { ...s.seo_meta, title: { ...s.seo_meta.title, de: v } } }))}
              onSave={() => saveField('seo_meta')}
              saving={saving === 'seo_meta'}
              saved={savedFields.has('seo_meta')}
            />
          </ContentCard>

          <ContentCard title="Meta-Beschreibung">
            <SettingField
              label="Beschreibung"
              value={settings.seo_meta.description.de}
              onChange={(v) => setSettings(s => ({ ...s, seo_meta: { ...s.seo_meta, description: { ...s.seo_meta.description, de: v } } }))}
              onSave={() => saveField('seo_meta')}
              saving={saving === 'seo_meta'}
              saved={savedFields.has('seo_meta')}
              multiline
            />
          </ContentCard>

          <ContentCard title="Weitere SEO-Einstellungen">
            <div className="grid grid-cols-2 gap-4">
              <SettingField
                label="OG-Image URL"
                value={settings.seo_meta.og_image}
                onChange={(v) => setSettings(s => ({ ...s, seo_meta: { ...s.seo_meta, og_image: v } }))}
                onSave={() => saveField('seo_meta')}
                saving={saving === 'seo_meta'}
                saved={savedFields.has('seo_meta')}
                placeholder="/og-image.jpg"
              />
              <SettingField
                label="Keywords (kommagetrennt)"
                value={settings.seo_meta.keywords}
                onChange={(v) => setSettings(s => ({ ...s, seo_meta: { ...s.seo_meta, keywords: v } }))}
                onSave={() => saveField('seo_meta')}
                saving={saving === 'seo_meta'}
                saved={savedFields.has('seo_meta')}
                placeholder="barbershop, friseur, ..."
              />
            </div>
          </ContentCard>
        </div>
      )}

      {/* Legal */}
      {activeSection === 'legal' && (
        <div className="space-y-6">
          <ContentCard title="Impressum">
            <SettingField
              label="Impressum"
              value={settings.legal_imprint.content.de}
              onChange={(v) => setSettings(s => ({ ...s, legal_imprint: { content: { ...s.legal_imprint.content, de: v } } }))}
              onSave={() => saveField('legal_imprint')}
              saving={saving === 'legal_imprint'}
              saved={savedFields.has('legal_imprint')}
              multiline
              rows={10}
            />
          </ContentCard>

          <ContentCard title="Datenschutzerklärung">
            <SettingField
              label="Datenschutz"
              value={settings.legal_privacy.content.de}
              onChange={(v) => setSettings(s => ({ ...s, legal_privacy: { content: { ...s.legal_privacy.content, de: v } } }))}
              onSave={() => saveField('legal_privacy')}
              saving={saving === 'legal_privacy'}
              saved={savedFields.has('legal_privacy')}
              multiline
              rows={10}
            />
          </ContentCard>

          <ContentCard title="Cookie-Banner">
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.legal_cookie.enabled}
                  onChange={(e) => setSettings(s => ({ ...s, legal_cookie: { ...s.legal_cookie, enabled: e.target.checked } }))}
                  className="w-4 h-4 accent-gold"
                />
                <span className="text-sm text-gray-700">Cookie-Banner aktivieren</span>
              </label>
            </div>
            <SettingField
              label="Cookie-Text"
              value={settings.legal_cookie.text.de}
              onChange={(v) => setSettings(s => ({ ...s, legal_cookie: { ...s.legal_cookie, text: { ...s.legal_cookie.text, de: v } } }))}
              onSave={() => saveField('legal_cookie')}
              saving={saving === 'legal_cookie'}
              saved={savedFields.has('legal_cookie')}
            />
          </ContentCard>
        </div>
      )}

      {/* Footer */}
      {activeSection === 'footer' && (
        <div className="space-y-6">
          <ContentCard title="Footer-Einstellungen">
            <div className="space-y-4">
              <SettingField
                label="Copyright-Text"
                value={settings.footer.copyright}
                onChange={(v) => setSettings(s => ({ ...s, footer: { ...s.footer, copyright: v } }))}
                onSave={() => saveField('footer')}
                saving={saving === 'footer'}
                saved={savedFields.has('footer')}
                placeholder="© 2024 Firma. Alle Rechte vorbehalten."
              />
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.footer.show_social}
                    onChange={(e) => {
                      setSettings(s => ({ ...s, footer: { ...s.footer, show_social: e.target.checked } }));
                    }}
                    className="w-4 h-4 accent-gold"
                  />
                  <span className="text-sm text-gray-700">Social-Media-Links im Footer anzeigen</span>
                </label>
                <button
                  onClick={() => saveField('footer')}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Speichern
                </button>
              </div>
            </div>
          </ContentCard>
        </div>
      )}

      {/* Branding */}
      {activeSection === 'branding' && (
        <div className="space-y-6">
          <ContentCard title="Logo">
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden">
                {settings.logo_url.value ? (
                  <img
                    src={settings.logo_url.value}
                    alt="Logo"
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <SettingField
                  label="Logo URL"
                  value={settings.logo_url.value}
                  onChange={(v) => setSettings(s => ({ ...s, logo_url: { value: v } }))}
                  onSave={() => saveField('logo_url')}
                  saving={saving === 'logo_url'}
                  saved={savedFields.has('logo_url')}
                  placeholder="/logo.png"
                />
                <p className="text-xs text-gray-400 mt-2">Unterstützte Formate: PNG, SVG (transparenter Hintergrund empfohlen)</p>
              </div>
            </div>
          </ContentCard>
        </div>
      )}
    </div>
  );
}

// Helper Components
function ContentCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-medium text-black mb-4">{title}</h2>
      {children}
    </div>
  );
}

interface SettingFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  multiline?: boolean;
  placeholder?: string;
  rows?: number;
}

// Separate SaveButton component to avoid creating during render
function SaveButton({
  onSave,
  saving,
  saved
}: {
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  return (
    <button
      onClick={onSave}
      disabled={saving}
      className={`flex items-center gap-1 rounded border transition-all duration-200 px-2.5 py-1 text-xs ${
        saved
          ? 'bg-green-50 border-green-200 text-green-600'
          : 'bg-gold/5 border-gold/30 text-gold hover:bg-gold/15 hover:border-gold/50'
      }`}
    >
      {saving ? (
        <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ) : saved ? (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : null}
      <span>{saved ? 'Gespeichert' : 'Speichern'}</span>
    </button>
  );
}

function SettingField({
  label,
  value,
  onChange,
  onSave,
  saving,
  saved,
  multiline,
  placeholder,
  rows = 4,
}: SettingFieldProps) {
  if (multiline) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1 pr-1">
          <label className="text-sm font-medium text-gray-700">{label}</label>
          <SaveButton onSave={onSave} saving={saving} saved={saved} />
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none resize-none"
          rows={rows}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 pr-24 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none"
          placeholder={placeholder}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <SaveButton onSave={onSave} saving={saving} saved={saved} />
        </div>
      </div>
    </div>
  );
}
