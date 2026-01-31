'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  getAllGalleryImages,
  createGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
  updateGalleryOrder,
  uploadImage,
  GalleryImage,
  getAllSettings,
  updateSetting,
} from '@/lib/supabase';
import { ConfirmModal } from '@/components/admin/ConfirmModal';

type TabId = 'galerie' | 'content';

const TABS: { id: TabId; label: string }[] = [
  { id: 'content', label: 'Content' },
  { id: 'galerie', label: 'Galerie' },
];

const CATEGORIES = [
  { value: 'general', label: 'Allgemein' },
  { value: 'haircuts', label: 'Haarschnitte' },
  { value: 'beards', label: 'Bärte' },
  { value: 'shop', label: 'Shop' },
];

// Verfügbare Filter mit CSS-Mappings
const HERO_FILTERS = [
  { id: 'darken', label: 'Abdunkeln', icon: '◐', css: (i: number) => `brightness(${1 - i * 0.007})` },
  { id: 'blur', label: 'Blur', icon: '◎', css: (i: number) => `blur(${i * 0.15}px)` },
  { id: 'grayscale', label: 'S/W', icon: '◑', css: (i: number) => `grayscale(${i}%)` },
  { id: 'sepia', label: 'Sepia', icon: '▣', css: (i: number) => `sepia(${i}%)` },
];

function buildFilterStyleFromObject(filters: Record<string, number> | undefined): string {
  if (!filters || Object.keys(filters).length === 0) return '';
  return Object.entries(filters)
    .map(([key, intensity]) => {
      const filter = HERO_FILTERS.find(f => f.id === key);
      return filter ? filter.css(intensity) : '';
    })
    .filter(Boolean)
    .join(' ');
}

// Content Settings Types
interface LocalizedText {
  de: string;
  en: string;
}

interface SectionSettings {
  title: LocalizedText;
  subtitle: LocalizedText;
}

interface SettingsState {
  hero_title: LocalizedText;
  hero_subtitle: LocalizedText;
  hero_background: {
    type: 'video' | 'image';
    image_url: string;
    youtube_id: string;
    video_start: number;
    video_end: number;
    video_loop: boolean;
    filters: Record<string, number>;
  };
  hero_cta: { text: LocalizedText; enabled: boolean };
  hero_badge: { text: LocalizedText; enabled: boolean };
  section_about: SectionSettings;
  section_services: SectionSettings;
  section_team: SectionSettings;
  section_gallery: SectionSettings;
  section_contact: SectionSettings;
  about_text: LocalizedText;
  contact_address: { street: string; city: string };
  contact_phone: { value: string };
  contact_email: { value: string };
  location: { lat: number; lng: number; zoom: number; embed_url: string };
  social_instagram: { value: string };
  social_facebook: { value: string };
  social_youtube: { value: string };
  social_tiktok: { value: string };
  social_custom: Array<{ id: string; platform: string; url: string }>;
  seo_meta: { title: LocalizedText; description: LocalizedText; og_image: string; keywords: string };
  legal_imprint: { content: LocalizedText };
  legal_privacy: { content: LocalizedText };
  legal_cookie: { text: LocalizedText; enabled: boolean };
  footer: { copyright: string; show_social: boolean };
  logo_url: { value: string };
}

const defaultSettings: SettingsState = {
  hero_title: { de: 'BEBAN BARBERSHOP', en: 'BEBAN BARBERSHOP' },
  hero_subtitle: { de: 'Premium Herrenfriseur seit 2018', en: 'Premium Barber since 2018' },
  hero_background: {
    type: 'video',
    image_url: '/hero-bg.jpg',
    youtube_id: '3vCGQvscX34',
    video_start: 24,
    video_end: 54,
    video_loop: true,
    filters: { darken: 50 },
  },
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
  social_youtube: { value: '' },
  social_tiktok: { value: '' },
  social_custom: [],
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

export default function MedienPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab') as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(tabParam && TABS.some(t => t.id === tabParam) ? tabParam : 'content');
  const [isLoading, setIsLoading] = useState(true);

  // Gallery State
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<GalleryImage | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Content State
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedFields, setSavedFields] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<string>('hero');

  useEffect(() => {
    async function loadData() {
      const [imagesData, settingsData] = await Promise.all([
        getAllGalleryImages(),
        getAllSettings(),
      ]);
      setImages(imagesData);

      const newSettings = { ...defaultSettings };
      Object.keys(defaultSettings).forEach(key => {
        if (settingsData[key]) {
          // Deep-merge für hero_background um Default-Werte zu erhalten
          if (key === 'hero_background' && typeof settingsData[key] === 'object') {
            (newSettings as Record<string, unknown>)[key] = {
              ...defaultSettings.hero_background,
              ...settingsData[key],
            };
          } else {
            (newSettings as Record<string, unknown>)[key] = settingsData[key];
          }
        }
      });
      setSettings(newSettings as SettingsState);
      setIsLoading(false);
    }
    loadData();
  }, []);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    router.replace(`/admin/content?tab=${tab}`, { scroll: false });
  };

  // === Gallery Handlers ===
  async function handleDelete(id: string) {
    const success = await deleteGalleryImage(id);
    if (success) {
      setImages(prev => prev.filter(img => img.id !== id));
    }
    setDeleteConfirm(null);
  }

  async function handleToggleActive(image: GalleryImage) {
    const updated = await updateGalleryImage(image.id, { active: !image.active });
    if (updated) {
      setImages(prev => prev.map(img => img.id === image.id ? updated : img));
    }
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    const newImages = [...images];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    const updates = newImages.map((img, i) => ({ id: img.id, sort_order: i }));
    const success = await updateGalleryOrder(updates);
    if (success) {
      setImages(newImages.map((img, i) => ({ ...img, sort_order: i })));
    }
  }

  async function handleMoveDown(index: number) {
    if (index === images.length - 1) return;
    const newImages = [...images];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    const updates = newImages.map((img, i) => ({ id: img.id, sort_order: i }));
    const success = await updateGalleryOrder(updates);
    if (success) {
      setImages(newImages.map((img, i) => ({ ...img, sort_order: i })));
    }
  }

  // === Content Handlers ===
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

  const filteredImages = filterCategory === 'all'
    ? images
    : images.filter(img => img.category === filterCategory);

  const contentSections = [
    { id: 'hero', label: 'Hero' },
    { id: 'sections', label: 'Sektionen' },
    { id: 'about', label: 'Über uns' },
    { id: 'contact', label: 'Kontakt' },
    { id: 'social', label: 'Social Media' },
    { id: 'seo', label: 'SEO' },
    { id: 'legal', label: 'Rechtliches' },
    { id: 'footer', label: 'Footer' },
    { id: 'branding', label: 'Branding' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Floating Panel - alles in einem Container */}
      <div className="flex-1 bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-200/50 overflow-hidden flex flex-col min-h-0">
        {/* Header */}
        <div className="px-8 py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Medien-Verwaltung</h3>
              <p className="text-xs text-slate-400">Galerie und Website-Inhalte</p>
            </div>
          </div>
          {activeTab === 'galerie' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gold text-black text-xs font-semibold rounded-xl hover:bg-gold/90 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Bild hinzufügen
            </button>
          )}
        </div>

        {/* Gradient Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent flex-shrink-0" />

        {/* Tabs */}
        <div className="px-8 flex gap-6 border-b border-slate-100 flex-shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-gold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Section Navigation - nur für Content Tab, fixiert */}
        {activeTab === 'content' && (
          <div className="px-8 pt-4 pb-3 flex flex-wrap gap-2 border-b border-slate-200 flex-shrink-0">
            {contentSections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  activeSection === section.id
                    ? 'bg-gold text-black'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
        {/* Gallery Tab */}
        {activeTab === 'galerie' && (
          <div className="p-6">
            <p className="text-xs text-slate-400 mb-4">
              {images.length} Bilder · {images.filter(i => i.active).length} aktiv
            </p>
            {/* Filter Chips */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  filterCategory === 'all' ? 'bg-gold text-black' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Alle
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setFilterCategory(cat.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    filterCategory === cat.value ? 'bg-gold text-black' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {filteredImages.length === 0 ? (
              <div className="py-12 text-center">
                <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-slate-500 text-sm">Keine Bilder vorhanden</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 px-5 py-2.5 bg-gold text-black text-xs font-semibold rounded-xl hover:bg-gold/90 transition-colors"
                >
                  Erstes Bild hinzufügen
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredImages.map((image, index) => (
                  <div
                    key={image.id}
                    className={`bg-white border rounded-xl overflow-hidden group ${
                      image.active ? 'border-slate-200' : 'border-red-200 opacity-60'
                    }`}
                  >
                  <div className="aspect-square relative bg-gray-100">
                    <img
                      src={image.url}
                      alt={image.alt_text || 'Galerie-Bild'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f3f4f6" width="100" height="100"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="12">Fehler</text></svg>';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => setEditingImage(image)}
                        className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                        title="Bearbeiten"
                      >
                        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleToggleActive(image)}
                        className={`p-2 rounded-lg transition-colors ${
                          image.active ? 'bg-green-100 hover:bg-green-200' : 'bg-red-100 hover:bg-red-200'
                        }`}
                        title={image.active ? 'Deaktivieren' : 'Aktivieren'}
                      >
                        <svg className={`w-4 h-4 ${image.active ? 'text-green-700' : 'text-red-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {image.active ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          )}
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(image)}
                        className="p-2 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                        title="Löschen"
                      >
                        <svg className="w-4 h-4 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="p-1 bg-white rounded shadow hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === filteredImages.length - 1}
                        className="p-1 bg-white rounded shadow hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2">
                      <span className="px-2 py-0.5 bg-black/70 text-white text-[10px] rounded">
                        {CATEGORIES.find(c => c.value === image.category)?.label || image.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-slate-500 truncate">{image.alt_text || 'Kein Alt-Text'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

            {(showAddModal || editingImage) && (
              <ImageModal
                image={editingImage}
                onClose={() => {
                  setShowAddModal(false);
                  setEditingImage(null);
                }}
                onSave={async (data) => {
                  if (editingImage) {
                    const updated = await updateGalleryImage(editingImage.id, data);
                    if (updated) {
                      setImages(prev => prev.map(img => img.id === editingImage.id ? updated : img));
                    }
                  } else {
                    const created = await createGalleryImage({
                      ...data,
                      sort_order: images.length,
                      active: true,
                    });
                    if (created) {
                      setImages(prev => [...prev, created]);
                    }
                  }
                  setShowAddModal(false);
                  setEditingImage(null);
                }}
              />
            )}

            <ConfirmModal
              isOpen={!!deleteConfirm}
              title="Bild löschen"
              message="Möchtest du dieses Bild wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
              confirmLabel="Löschen"
              variant="danger"
              onConfirm={() => deleteConfirm && handleDelete(deleteConfirm.id)}
              onCancel={() => setDeleteConfirm(null)}
            />
          </div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="px-8 py-6 space-y-6">
          {/* Hero Section */}
          {activeSection === 'hero' && (
            <div className="space-y-8">
              {/* Haupttexte */}
              <div>
                <SectionHeader title="Haupttexte" subtitle="Titel und Untertitel im Hero-Bereich" />
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-1">
                  <div className="divide-y divide-slate-200">
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
                </div>
              </div>

              {/* Call-to-Action */}
              <div>
                <SectionHeader title="Call-to-Action" subtitle="Button im Hero-Bereich" />
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between py-2 border-b border-slate-200 mb-3">
                    <span className="text-sm font-medium text-slate-900">Button anzeigen</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.hero_cta.enabled}
                        onChange={(e) => {
                          setSettings(s => ({ ...s, hero_cta: { ...s.hero_cta, enabled: e.target.checked } }));
                          setTimeout(() => saveField('hero_cta'), 100);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold"></div>
                    </label>
                  </div>
                  <div className="grid grid-cols-[1fr_200px_80px] gap-4 items-center py-2">
                    <span className="text-sm font-medium text-slate-900">Button-Text</span>
                    <input
                      type="text"
                      value={settings.hero_cta.text.de}
                      onChange={(e) => setSettings(s => ({ ...s, hero_cta: { ...s.hero_cta, text: { ...s.hero_cta.text, de: e.target.value } } }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                    />
                    <div className="flex justify-end">
                      <SaveButton onSave={() => saveField('hero_cta')} saving={saving === 'hero_cta'} saved={savedFields.has('hero_cta')} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Hintergrund */}
              <div>
                <SectionHeader title="Hintergrund" subtitle="Video oder Bild im Hero-Bereich" />
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                  {/* Typ-Auswahl */}
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-slate-900 w-24">Typ</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSettings(s => ({ ...s, hero_background: { ...s.hero_background, type: 'video' } }))}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          settings.hero_background.type === 'video'
                            ? 'bg-gold text-black'
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        Video
                      </button>
                      <button
                        onClick={() => setSettings(s => ({ ...s, hero_background: { ...s.hero_background, type: 'image' } }))}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          settings.hero_background.type === 'image'
                            ? 'bg-gold text-black'
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        Bild
                      </button>
                    </div>
                  </div>

                  {/* Video-Einstellungen */}
                  {(settings.hero_background?.type ?? 'video') === 'video' && (
                    <div className="space-y-4 pt-2 border-t border-slate-200">
                      {/* YouTube URL */}
                      <div className="flex items-start gap-4">
                        <span className="text-sm font-medium text-slate-900 w-24 pt-2">YouTube</span>
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={
                              settings.hero_background.youtube_id?.length === 11
                                ? `https://www.youtube.com/watch?v=${settings.hero_background.youtube_id}`
                                : settings.hero_background.youtube_id ?? ''
                            }
                            onChange={(e) => {
                              // Extrahiere Video-ID aus URL oder direkter ID
                              let id = e.target.value;
                              const match = id.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^&?\s]{11})/);
                              if (match) id = match[1];
                              setSettings(s => ({ ...s, hero_background: { ...s.hero_background, youtube_id: id } }));
                            }}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                          />
                          {/* YouTube-Vorschau mit Live-Filter */}
                          {settings.hero_background.youtube_id && settings.hero_background.youtube_id.length === 11 && (
                            <div className="w-full mt-3 rounded-lg overflow-hidden bg-black border border-slate-200 aspect-video relative">
                              <iframe
                                key={settings.hero_background.youtube_id}
                                src={`https://www.youtube.com/embed/${settings.hero_background.youtube_id}?start=${settings.hero_background.video_start ?? 0}&autoplay=0&controls=1`}
                                allow="encrypted-media"
                                allowFullScreen
                                className="w-full h-full"
                                style={{
                                  border: 'none',
                                  display: 'block',
                                  filter: buildFilterStyleFromObject(settings.hero_background.filters),
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Start/End Zeit */}
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-slate-900 w-24">Zeitraum</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={(() => {
                              const secs = settings.hero_background.video_start ?? 0;
                              const m = Math.floor(secs / 60);
                              const s = secs % 60;
                              return `${m}:${s.toString().padStart(2, '0')}`;
                            })()}
                            onChange={(e) => {
                              const parts = e.target.value.split(':');
                              let seconds = 0;
                              if (parts.length === 2) {
                                seconds = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
                              } else {
                                seconds = parseInt(e.target.value) || 0;
                              }
                              setSettings(s => ({ ...s, hero_background: { ...s.hero_background, video_start: seconds } }));
                            }}
                            placeholder="0:00"
                            className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 text-center focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                          />
                          <span className="text-sm text-slate-500">bis</span>
                          <input
                            type="text"
                            value={(() => {
                              const secs = settings.hero_background.video_end ?? 0;
                              const m = Math.floor(secs / 60);
                              const s = secs % 60;
                              return `${m}:${s.toString().padStart(2, '0')}`;
                            })()}
                            onChange={(e) => {
                              const parts = e.target.value.split(':');
                              let seconds = 0;
                              if (parts.length === 2) {
                                seconds = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
                              } else {
                                seconds = parseInt(e.target.value) || 0;
                              }
                              setSettings(s => ({ ...s, hero_background: { ...s.hero_background, video_end: seconds } }));
                            }}
                            placeholder="0:00"
                            className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 text-center focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                          />
                          <span className="text-sm text-slate-500">mm:ss</span>
                        </div>
                      </div>

                      {/* Loop */}
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-slate-900 w-24">Wiederholen</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.hero_background.video_loop ?? true}
                            onChange={(e) => setSettings(s => ({ ...s, hero_background: { ...s.hero_background, video_loop: e.target.checked } }))}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold"></div>
                        </label>
                        <span className="text-xs text-slate-500">Video wird in Endlosschleife abgespielt</span>
                      </div>
                    </div>
                  )}

                  {/* Bild-Einstellungen */}
                  {(settings.hero_background?.type) === 'image' && (
                    <div className="space-y-4 pt-2 border-t border-slate-200">
                      <div className="flex items-start gap-4">
                        <span className="text-sm font-medium text-slate-900 w-24 pt-2">Bild-URL</span>
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={settings.hero_background.image_url ?? ''}
                            onChange={(e) => setSettings(s => ({ ...s, hero_background: { ...s.hero_background, image_url: e.target.value } }))}
                            placeholder="/hero-bg.jpg oder https://..."
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                          />
                          {/* Bild-Vorschau */}
                          {settings.hero_background.image_url && (
                            <div className="relative aspect-video w-full max-w-md rounded-lg overflow-hidden bg-slate-200">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={settings.hero_background.image_url}
                                alt="Hero Hintergrund"
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Filter mit individueller Intensität */}
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    {/* Label */}
                    <div>
                      <span className="text-sm font-medium text-slate-900">Filter</span>
                      <span className="text-xs text-slate-400 ml-2">(Mehrere kombinierbar)</span>
                    </div>

                    {/* Filter-Buttons nebeneinander */}
                    <div className="flex gap-2">
                      {HERO_FILTERS.map(filter => {
                        const filters = settings.hero_background.filters || {};
                        const isActive = filter.id in filters;

                        return (
                          <button
                            key={filter.id}
                            onClick={() => {
                              setSettings(s => {
                                const currentFilters = { ...(s.hero_background.filters || {}) };
                                if (isActive) {
                                  delete currentFilters[filter.id];
                                } else {
                                  currentFilters[filter.id] = 50;
                                }
                                return {
                                  ...s,
                                  hero_background: { ...s.hero_background, filters: currentFilters }
                                };
                              });
                            }}
                            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                              isActive
                                ? 'bg-gold/20 border-2 border-gold text-slate-900'
                                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <span className="text-lg">{filter.icon}</span>
                            <span>{filter.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Intensitäts-Slider für aktive Filter */}
                    {HERO_FILTERS.filter(f => (settings.hero_background.filters || {})[f.id] !== undefined).map(filter => {
                      const intensity = (settings.hero_background.filters || {})[filter.id] ?? 50;
                      return (
                        <div key={filter.id} className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 w-20">{filter.label}</span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={intensity}
                            onChange={(e) => {
                              const newIntensity = parseInt(e.target.value);
                              setSettings(s => ({
                                ...s,
                                hero_background: {
                                  ...s.hero_background,
                                  filters: { ...(s.hero_background.filters || {}), [filter.id]: newIntensity }
                                }
                              }));
                            }}
                            className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-gold"
                          />
                          <span className="text-xs text-slate-500 w-10 text-right">{intensity}%</span>
                        </div>
                      );
                    })}

                    {/* Alle Filter zurücksetzen */}
                    {Object.keys(settings.hero_background.filters || {}).length > 0 && (
                      <button
                        onClick={() => setSettings(s => ({ ...s, hero_background: { ...s.hero_background, filters: {} } }))}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Zurücksetzen
                      </button>
                    )}
                  </div>

                  {/* Speichern */}
                  <div className="flex justify-end pt-2 border-t border-slate-200">
                    <SaveButton onSave={() => saveField('hero_background')} saving={saving === 'hero_background'} saved={savedFields.has('hero_background')} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sections */}
          {activeSection === 'sections' && (
            <div className="space-y-8">
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
                  <div key={section}>
                    <SectionHeader title={labels[section]} subtitle="Titel und Untertitel der Sektion" />
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-1">
                      <div className="divide-y divide-slate-200">
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* About */}
          {activeSection === 'about' && (
            <div>
              <SectionHeader title="Über uns" subtitle="Beschreibungstext für die Über-uns-Sektion" />
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <SettingField
                  label="Text"
                  value={settings.about_text.de}
                  onChange={(v) => setSettings(s => ({ ...s, about_text: { ...s.about_text, de: v } }))}
                  onSave={() => saveField('about_text')}
                  saving={saving === 'about_text'}
                  saved={savedFields.has('about_text')}
                  multiline
                  rows={15}
                />
              </div>
            </div>
          )}

          {/* Contact */}
          {activeSection === 'contact' && (
            <div className="space-y-8">
              {/* Adresse */}
              <div>
                <SectionHeader title="Adresse" subtitle="Standort des Geschäfts" />
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-1">
                  <div className="divide-y divide-slate-200">
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
                </div>
              </div>

              {/* Kontaktdaten */}
              <div>
                <SectionHeader title="Kontaktdaten" subtitle="Telefon und E-Mail" />
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-1">
                  <div className="divide-y divide-slate-200">
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
                </div>
              </div>
            </div>
          )}

          {/* Social Media */}
          {activeSection === 'social' && (
            <div className="space-y-8">
              {/* Standard Plattformen */}
              <div>
                <SectionHeader title="Haupt-Plattformen" subtitle="Die wichtigsten sozialen Netzwerke" />
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-1">
                  <div className="divide-y divide-slate-200">
                    <SocialMediaField
                      icon={<InstagramIcon />}
                      label="Instagram"
                      value={settings.social_instagram.value}
                      onChange={(v) => setSettings(s => ({ ...s, social_instagram: { value: v } }))}
                      onSave={() => saveField('social_instagram')}
                      saving={saving === 'social_instagram'}
                      saved={savedFields.has('social_instagram')}
                      placeholder="https://instagram.com/username"
                    />
                    <SocialMediaField
                      icon={<FacebookIcon />}
                      label="Facebook"
                      value={settings.social_facebook.value}
                      onChange={(v) => setSettings(s => ({ ...s, social_facebook: { value: v } }))}
                      onSave={() => saveField('social_facebook')}
                      saving={saving === 'social_facebook'}
                      saved={savedFields.has('social_facebook')}
                      placeholder="https://facebook.com/page"
                    />
                    <SocialMediaField
                      icon={<YouTubeIcon />}
                      label="YouTube"
                      value={settings.social_youtube.value}
                      onChange={(v) => setSettings(s => ({ ...s, social_youtube: { value: v } }))}
                      onSave={() => saveField('social_youtube')}
                      saving={saving === 'social_youtube'}
                      saved={savedFields.has('social_youtube')}
                      placeholder="https://youtube.com/@channel"
                    />
                    <SocialMediaField
                      icon={<TikTokIcon />}
                      label="TikTok"
                      value={settings.social_tiktok.value}
                      onChange={(v) => setSettings(s => ({ ...s, social_tiktok: { value: v } }))}
                      onSave={() => saveField('social_tiktok')}
                      saving={saving === 'social_tiktok'}
                      saved={savedFields.has('social_tiktok')}
                      placeholder="https://tiktok.com/@username"
                    />
                  </div>
                </div>
              </div>

              {/* Weitere Plattformen */}
              <div>
                <SectionHeader title="Weitere Plattformen" subtitle="Zusätzliche Social Media Kanäle" />
                <div className="space-y-2">
                  {settings.social_custom.map((item, index) => (
                    <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                          <LinkIcon />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Plattform</label>
                              <input
                                type="text"
                                value={item.platform}
                                onChange={(e) => {
                                  const updated = [...settings.social_custom];
                                  updated[index] = { ...item, platform: e.target.value };
                                  setSettings(s => ({ ...s, social_custom: updated }));
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                                placeholder="z.B. LinkedIn, Twitter, Yelp..."
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">URL</label>
                              <input
                                type="text"
                                value={item.url}
                                onChange={(e) => {
                                  const updated = [...settings.social_custom];
                                  updated[index] = { ...item, url: e.target.value };
                                  setSettings(s => ({ ...s, social_custom: updated }));
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                                placeholder="https://..."
                              />
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <button
                              onClick={() => {
                                const updated = settings.social_custom.filter((_, i) => i !== index);
                                setSettings(s => ({ ...s, social_custom: updated }));
                                setTimeout(() => saveField('social_custom'), 100);
                              }}
                              className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Entfernen
                            </button>
                            <SaveButton
                              onSave={() => saveField('social_custom')}
                              saving={saving === 'social_custom'}
                              saved={savedFields.has('social_custom')}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Hinzufügen Button */}
                  <button
                    onClick={() => {
                      const newItem = {
                        id: `custom_${Date.now()}`,
                        platform: '',
                        url: '',
                      };
                      setSettings(s => ({ ...s, social_custom: [...s.social_custom, newItem] }));
                    }}
                    className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm font-medium text-slate-500 hover:border-gold hover:text-gold hover:bg-gold/5 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Weitere Plattform hinzufügen
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SEO */}
          {activeSection === 'seo' && (
            <div>
              <SectionHeader title="Meta-Informationen" subtitle="Suchmaschinenoptimierung" />
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-1">
                <div className="divide-y divide-slate-200">
                  <SettingField
                    label="Meta-Titel"
                    value={settings.seo_meta.title.de}
                    onChange={(v) => setSettings(s => ({ ...s, seo_meta: { ...s.seo_meta, title: { ...s.seo_meta.title, de: v } } }))}
                    onSave={() => saveField('seo_meta')}
                    saving={saving === 'seo_meta'}
                    saved={savedFields.has('seo_meta')}
                  />
                  <SettingField
                    label="Keywords"
                    value={settings.seo_meta.keywords}
                    onChange={(v) => setSettings(s => ({ ...s, seo_meta: { ...s.seo_meta, keywords: v } }))}
                    onSave={() => saveField('seo_meta')}
                    saving={saving === 'seo_meta'}
                    saved={savedFields.has('seo_meta')}
                    placeholder="barbershop, friseur, ..."
                  />
                </div>
              </div>
              <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <SettingField
                  label="Meta-Beschreibung"
                  value={settings.seo_meta.description.de}
                  onChange={(v) => setSettings(s => ({ ...s, seo_meta: { ...s.seo_meta, description: { ...s.seo_meta.description, de: v } } }))}
                  onSave={() => saveField('seo_meta')}
                  saving={saving === 'seo_meta'}
                  saved={savedFields.has('seo_meta')}
                  multiline
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* Legal */}
          {activeSection === 'legal' && (
            <div className="space-y-8">
              {/* Impressum */}
              <div>
                <SectionHeader title="Impressum" subtitle="Rechtlich erforderliche Angaben" />
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <SettingField
                    label="Impressum-Text"
                    value={settings.legal_imprint.content.de}
                    onChange={(v) => setSettings(s => ({ ...s, legal_imprint: { content: { ...s.legal_imprint.content, de: v } } }))}
                    onSave={() => saveField('legal_imprint')}
                    saving={saving === 'legal_imprint'}
                    saved={savedFields.has('legal_imprint')}
                    multiline
                    rows={10}
                  />
                </div>
              </div>

              {/* Datenschutz */}
              <div>
                <SectionHeader title="Datenschutzerklärung" subtitle="Informationen zur Datenverarbeitung" />
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <SettingField
                    label="Datenschutz-Text"
                    value={settings.legal_privacy.content.de}
                    onChange={(v) => setSettings(s => ({ ...s, legal_privacy: { content: { ...s.legal_privacy.content, de: v } } }))}
                    onSave={() => saveField('legal_privacy')}
                    saving={saving === 'legal_privacy'}
                    saved={savedFields.has('legal_privacy')}
                    multiline
                    rows={10}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          {activeSection === 'footer' && (
            <div>
              <SectionHeader title="Footer" subtitle="Einstellungen für den Seitenfuß" />
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-1">
                <div className="divide-y divide-slate-200">
                  <SettingField
                    label="Copyright-Text"
                    value={settings.footer.copyright}
                    onChange={(v) => setSettings(s => ({ ...s, footer: { ...s.footer, copyright: v } }))}
                    onSave={() => saveField('footer')}
                    saving={saving === 'footer'}
                    saved={savedFields.has('footer')}
                    placeholder="© 2024 Firma. Alle Rechte vorbehalten."
                  />
                  <div className="grid grid-cols-[1fr_auto_80px] gap-4 items-center py-3 px-4">
                    <span className="text-sm font-medium text-slate-900">Social-Media-Links anzeigen</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.footer.show_social}
                        onChange={(e) => {
                          setSettings(s => ({ ...s, footer: { ...s.footer, show_social: e.target.checked } }));
                          setTimeout(() => saveField('footer'), 100);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold"></div>
                    </label>
                    <div></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Branding */}
          {activeSection === 'branding' && (
            <BrandingSection
              logoUrl={settings.logo_url.value}
              onLogoChange={(url) => {
                setSettings(s => ({ ...s, logo_url: { value: url } }));
                // Auto-save nach Upload
                setTimeout(async () => {
                  setSaving('logo_url');
                  await updateSetting('logo_url', { value: url });
                  setSaving(null);
                  setSavedFields(prev => new Set([...prev, 'logo_url']));
                  setTimeout(() => setSavedFields(prev => { const next = new Set(prev); next.delete('logo_url'); return next; }), 2000);
                }, 100);
              }}
              saving={saving === 'logo_url'}
              saved={savedFields.has('logo_url')}
            />
          )}
        </div>
        )}
        </div>
      </div>
    </div>
  );
}

// Branding Section Component
function BrandingSection({ logoUrl, onLogoChange, saving, saved }: {
  logoUrl: string;
  onLogoChange: (url: string) => void;
  saving: boolean;
  saved: boolean;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Nur PNG, SVG, JPG und WebP erlaubt');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Maximale Dateigröße: 5MB');
      return;
    }

    setIsUploading(true);
    const url = await uploadImage(file, 'branding');
    setIsUploading(false);

    if (url) {
      onLogoChange(url);
    } else {
      alert('Fehler beim Hochladen');
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div>
      <SectionHeader title="Branding" subtitle="Logo und visuelle Identität" />
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-6">
          {/* Logo Preview */}
          <div className="relative group">
            <div className="w-24 h-24 bg-slate-900 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            {/* Hover Overlay */}
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/svg+xml,image/jpeg,image/webp"
                onChange={handleLogoUpload}
                className="sr-only"
                disabled={isUploading}
              />
              {isUploading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </label>
          </div>

          {/* Info */}
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-slate-900 mb-1">Logo</h4>
            <p className="text-xs text-slate-500 mb-3">Wird im Header, Menü, Footer und in E-Mails angezeigt.</p>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/png,image/svg+xml,image/jpeg,image/webp"
                  onChange={handleLogoUpload}
                  className="sr-only"
                  disabled={isUploading}
                />
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isUploading
                    ? 'bg-slate-100 text-slate-400'
                    : 'bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20'
                }`}>
                  {isUploading ? (
                    <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  )}
                  {isUploading ? 'Wird hochgeladen...' : 'Bild hochladen'}
                </span>
              </label>
              {saved && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Gespeichert
                </span>
              )}
              {saving && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                  <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                  Speichert...
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">PNG oder SVG empfohlen · JPG, WebP · Max. 5MB</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-2">
      <h3 className="text-xs font-medium text-slate-500">{title}</h3>
      {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
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

function SaveButton({ onSave, saving, saved }: { onSave: () => void; saving: boolean; saved: boolean }) {
  return (
    <button
      onClick={onSave}
      disabled={saving}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        saved
          ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
          : 'bg-gold/5 border border-gold/30 text-gold hover:bg-gold/15 hover:border-gold/50'
      }`}
    >
      {saving ? (
        <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ) : saved ? (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Gespeichert</span>
        </>
      ) : (
        <span>Speichern</span>
      )}
    </button>
  );
}

function SettingField({ label, value, onChange, onSave, saving, saved, multiline, placeholder, rows = 4 }: SettingFieldProps) {
  if (multiline) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-900">{label}</span>
          <SaveButton onSave={onSave} saving={saving} saved={saved} />
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none resize-none"
          rows={rows}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[1fr_200px_80px] gap-4 items-center py-3 px-4">
      <div>
        <span className="text-sm font-medium text-slate-900">{label}</span>
      </div>
      <div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
          placeholder={placeholder}
        />
      </div>
      <div className="flex justify-end">
        <SaveButton onSave={onSave} saving={saving} saved={saved} />
      </div>
    </div>
  );
}

// Social Media Field with Icon
interface SocialMediaFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  placeholder?: string;
}

function SocialMediaField({ icon, label, value, onChange, onSave, saving, saved, placeholder }: SocialMediaFieldProps) {
  return (
    <div className="flex items-center gap-3 py-3 px-4">
      <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <span className="text-sm font-medium text-slate-900 w-24 flex-shrink-0">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
        placeholder={placeholder}
      />
      <SaveButton onSave={onSave} saving={saving} saved={saved} />
    </div>
  );
}

// Social Media Icons
function InstagramIcon() {
  return (
    <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

interface ImageModalProps {
  image: GalleryImage | null;
  onClose: () => void;
  onSave: (data: { url: string; alt_text: string; category: string }) => void;
}

function ImageModal({ image, onClose, onSave }: ImageModalProps) {
  const [url, setUrl] = useState(image?.url || '');
  const [altText, setAltText] = useState(image?.alt_text || '');
  const [category, setCategory] = useState(image?.category || 'general');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(file: File) {
    if (!file.type.startsWith('image/')) {
      alert('Bitte nur Bilddateien hochladen');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Bild darf maximal 5MB groß sein');
      return;
    }

    setIsUploading(true);
    const uploadedUrl = await uploadImage(file, 'gallery');
    setIsUploading(false);

    if (uploadedUrl) {
      setUrl(uploadedUrl);
      // Auto-fill alt text from filename if empty
      if (!altText) {
        const name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setAltText(name);
      }
    } else {
      alert('Fehler beim Hochladen');
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setIsSaving(true);
    await onSave({ url: url.trim(), alt_text: altText.trim(), category });
    setIsSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-[500px] max-w-[calc(100vw-2rem)] shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">
            {image ? 'Bild bearbeiten' : 'Bild hinzufügen'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`relative aspect-video rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${
              isDragging
                ? 'border-gold bg-gold/10'
                : url
                ? 'border-slate-200 bg-slate-50'
                : 'border-slate-300 bg-slate-50 hover:border-gold hover:bg-gold/5'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="hidden"
            />

            {isUploading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mb-2" />
                <span className="text-sm text-slate-500">Wird hochgeladen...</span>
              </div>
            ) : url ? (
              <>
                <img
                  src={url}
                  alt="Vorschau"
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-sm font-medium">Klicken um zu ändern</span>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <svg className="w-10 h-10 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium text-slate-600">Bild hochladen</span>
                <span className="text-xs text-slate-400 mt-1">Klicken oder hierher ziehen</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Alt-Text</label>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Beschreibung des Bildes"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Kategorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading || !url.trim()}
              className="flex-1 px-4 py-2 bg-gold text-black text-xs font-semibold rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
