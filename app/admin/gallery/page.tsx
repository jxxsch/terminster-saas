'use client';

import { useState, useEffect } from 'react';
import { ConfirmModal } from '@/components/admin/ConfirmModal';
import {
  getAllGalleryImages,
  createGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
  updateGalleryOrder,
  GalleryImage,
} from '@/lib/supabase';

const CATEGORIES = [
  { value: 'general', label: 'Allgemein' },
  { value: 'haircuts', label: 'Haarschnitte' },
  { value: 'beards', label: 'Bärte' },
  { value: 'shop', label: 'Shop' },
];

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<GalleryImage | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    async function loadImages() {
      const data = await getAllGalleryImages();
      setImages(data);
      setIsLoading(false);
    }
    loadImages();
  }, []);

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

  const filteredImages = filterCategory === 'all'
    ? images
    : images.filter(img => img.category === filterCategory);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-black">Galerie-Verwaltung</h1>
          <p className="text-sm text-gray-500 mt-1">
            {images.length} Bilder · {images.filter(i => i.active).length} aktiv
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-gold text-white text-sm font-medium rounded-lg hover:bg-gold/90 transition-colors"
        >
          + Bild hinzufügen
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            filterCategory === 'all'
              ? 'bg-gold text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Alle
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setFilterCategory(cat.value)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filterCategory === cat.value
                ? 'bg-gold text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Images Grid */}
      {filteredImages.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500">Keine Bilder vorhanden</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-4 py-2 bg-gold text-white text-sm font-medium rounded-lg hover:bg-gold/90 transition-colors"
          >
            Erstes Bild hinzufügen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredImages.map((image, index) => (
            <div
              key={image.id}
              className={`bg-white border rounded-lg overflow-hidden group ${
                image.active ? 'border-gray-200' : 'border-red-200 opacity-60'
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

                {/* Overlay on hover */}
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

                {/* Sort buttons */}
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

                {/* Category badge */}
                <div className="absolute bottom-2 left-2">
                  <span className="px-2 py-0.5 bg-black/70 text-white text-[10px] rounded">
                    {CATEGORIES.find(c => c.value === image.category)?.label || image.category}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-2">
                <p className="text-xs text-gray-500 truncate">{image.alt_text || 'Kein Alt-Text'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
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

      {/* Delete Confirm */}
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

      <div className="relative bg-white rounded-lg w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-black">
            {image ? 'Bild bearbeiten' : 'Bild hinzufügen'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Preview */}
          {url && (
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bild-URL *
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/bild.jpg oder /images/bild.jpg"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alt-Text (für SEO & Barrierefreiheit)
            </label>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Beschreibung des Bildes"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategorie
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSaving || !url.trim()}
              className="flex-1 px-4 py-2 bg-gold text-white text-sm font-medium rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
