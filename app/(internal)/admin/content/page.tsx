'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  getAllGalleryImages,
  createGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
  updateGalleryOrder,
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
  hero_background: { type: string; url: string; video_url: string };
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
          (newSettings as Record<string, unknown>)[key] = settingsData[key];
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
            </div>
          )}

          {/* Social Media */}
          {activeSection === 'social' && (
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
          )}

          {/* SEO */}
          {activeSection === 'seo' && (
            <div className="space-y-6">
              <ContentCard title="Meta-Informationen">
                <div className="space-y-4">
                  <SettingField
                    label="Meta-Titel"
                    value={settings.seo_meta.title.de}
                    onChange={(v) => setSettings(s => ({ ...s, seo_meta: { ...s.seo_meta, title: { ...s.seo_meta.title, de: v } } }))}
                    onSave={() => saveField('seo_meta')}
                    saving={saving === 'seo_meta'}
                    saved={savedFields.has('seo_meta')}
                  />
                  <SettingField
                    label="Meta-Beschreibung"
                    value={settings.seo_meta.description.de}
                    onChange={(v) => setSettings(s => ({ ...s, seo_meta: { ...s.seo_meta, description: { ...s.seo_meta.description, de: v } } }))}
                    onSave={() => saveField('seo_meta')}
                    saving={saving === 'seo_meta'}
                    saved={savedFields.has('seo_meta')}
                    multiline
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
            </div>
          )}

          {/* Footer */}
          {activeSection === 'footer' && (
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
                      onChange={(e) => setSettings(s => ({ ...s, footer: { ...s.footer, show_social: e.target.checked } }))}
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
          )}

          {/* Branding */}
          {activeSection === 'branding' && (
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
                  <p className="text-xs text-gray-400 mt-2">Unterstützte Formate: PNG, SVG</p>
                </div>
              </div>
            </ContentCard>
          )}
        </div>
        )}
        </div>
      </div>
    </div>
  );
}

// Helper Components
function ContentCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
        <h2 className="text-sm font-medium text-slate-900">{title}</h2>
      </div>
      <div className="p-4 bg-white">
        {children}
      </div>
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

function SettingField({ label, value, onChange, onSave, saving, saved, multiline, placeholder, rows = 4 }: SettingFieldProps) {
  if (multiline) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1 pr-1">
          <label className="text-xs font-medium text-slate-600">{label}</label>
          <SaveButton onSave={onSave} saving={saving} saved={saved} />
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none resize-none"
          rows={rows}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 pr-24 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
          placeholder={placeholder}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <SaveButton onSave={onSave} saving={saving} saved={saved} />
        </div>
      </div>
    </div>
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
      <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-xl">
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
          {url && (
            <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden">
              <img
                src={url}
                alt="Vorschau"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Bild-URL *</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/bild.jpg"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
              required
            />
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
              disabled={isSaving || !url.trim()}
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
