'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductOrder,
  uploadImage,
  Product,
  formatProductPrice,
  productCategories,
} from '@/lib/supabase';
import { useAllProducts, mutateProducts } from '@/hooks/swr/use-dashboard-data';
import { ConfirmModal } from '@/components/admin/ConfirmModal';

type CategoryKey = 'bart' | 'haare' | 'rasur' | 'pflege';

export default function ProduktePage() {
  const { data: products = [], isLoading } = useAllProducts();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryKey | 'all'>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    price: 0,
    category: 'bart' as CategoryKey,
    image: '',
    image_position: '50% 50%',
    image_scale: 1,
    active: true,
  });

  // Refs for drag-based image editing (no re-renders during drag)
  const isDraggingRef = useRef(false);
  const isSliderDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 50, y: 50 });
  const scaleRef = useRef(1);

  // DOM refs
  const imageRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const sliderThumbRef = useRef<HTMLDivElement>(null);
  const scaleDisplayRef = useRef<HTMLSpanElement>(null);

  const parsePosition = (posStr: string) => {
    const match = posStr?.match(/(-?\d+)%\s+(-?\d+)%/);
    if (match) {
      return { x: parseInt(match[1]), y: parseInt(match[2]) };
    }
    return { x: 50, y: 50 };
  };

  // Produkte nach Kategorie filtern
  const filteredProducts = activeCategory === 'all'
    ? products
    : products.filter(p => p.category === activeCategory);

  function openCreateForm() {
    setFormData({
      id: '',
      name: '',
      price: 0,
      category: activeCategory === 'all' ? 'bart' : activeCategory,
      image: '',
      image_position: '50% 50%',
      image_scale: 1,
      active: true,
    });
    offsetRef.current = { x: 50, y: 50 };
    scaleRef.current = 1;
    setUploadError('');
    setIsCreating(true);
    setEditingId(null);
  }

  function openEditForm(product: Product) {
    const pos = parsePosition(product.image_position || '50% 50%');
    const scale = product.image_scale || 1;

    setFormData({
      id: product.id,
      name: product.name,
      price: product.price / 100,
      category: product.category,
      image: product.image || '',
      image_position: product.image_position || '50% 50%',
      image_scale: scale,
      active: product.active,
    });

    offsetRef.current = pos;
    scaleRef.current = scale;
    setUploadError('');
    setEditingId(product.id);
    setIsCreating(false);
  }

  function closeForm() {
    setEditingId(null);
    setIsCreating(false);
    setUploadError('');
  }

  // Bild-Upload Handler
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Nur JPG, PNG, WebP und GIF erlaubt');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Maximale Dateigröße: 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    const url = await uploadImage(file, 'products');

    if (url) {
      setFormData(prev => ({
        ...prev,
        image: url,
        image_position: '50% 50%',
        image_scale: 1,
      }));
      offsetRef.current = { x: 50, y: 50 };
      scaleRef.current = 1;
    } else {
      setUploadError('Fehler beim Hochladen');
    }
    setIsUploading(false);
    e.target.value = '';
  }

  // Update image position via DOM directly (no re-renders)
  // Verwende translate für zuverlässiges Verschieben in alle Richtungen
  const updateImageDOM = useCallback((x: number, y: number, scale: number) => {
    if (imageRef.current) {
      // x/y sind 0-100 (Prozent), 50 = zentriert
      // Verschiebung funktioniert immer, unabhängig vom Zoom
      const translateX = (50 - x) * 0.5;
      const translateY = (50 - y) * 0.5;
      imageRef.current.style.transform = `scale(${scale}) translate(${translateX}%, ${translateY}%)`;
    }
  }, []);

  // Update slider thumb position via DOM
  const updateSliderDOM = useCallback((scale: number) => {
    const percent = ((scale - 1.0) / 2.0) * 100; // 1.0-3.0 -> 0-100%
    if (sliderThumbRef.current) {
      sliderThumbRef.current.style.left = `${percent}%`;
    }
    if (scaleDisplayRef.current) {
      scaleDisplayRef.current.textContent = `${Math.round(scale * 100)}%`;
    }
  }, []);

  // Show/hide overlay via DOM
  const setOverlayVisible = useCallback((visible: boolean) => {
    if (overlayRef.current) {
      overlayRef.current.style.opacity = visible ? '1' : '0';
      overlayRef.current.style.pointerEvents = visible ? 'auto' : 'none';
    }
  }, []);

  // Global mouse handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Handle image dragging
      if (isDraggingRef.current) {
        e.preventDefault();
        const deltaX = (e.clientX - dragStartRef.current.x) / 1.5;
        const deltaY = (e.clientY - dragStartRef.current.y) / 1.5;

        const newX = Math.max(-50, Math.min(150, offsetRef.current.x - deltaX));
        const newY = Math.max(-50, Math.min(150, offsetRef.current.y - deltaY));

        offsetRef.current = { x: newX, y: newY };
        dragStartRef.current = { x: e.clientX, y: e.clientY };

        updateImageDOM(newX, newY, scaleRef.current);
      }

      // Handle slider dragging
      if (isSliderDraggingRef.current && sliderRef.current) {
        e.preventDefault();
        const rect = sliderRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const newScale = 1.0 + (percent / 100) * 2.0; // 0-100% -> 1.0-3.0

        scaleRef.current = newScale;
        updateSliderDOM(newScale);
        updateImageDOM(offsetRef.current.x, offsetRef.current.y, newScale);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setOverlayVisible(false);

        const newPosition = `${Math.round(offsetRef.current.x)}% ${Math.round(offsetRef.current.y)}%`;
        setFormData(prev => ({
          ...prev,
          image_position: newPosition,
          image_scale: scaleRef.current,
        }));
      }

      if (isSliderDraggingRef.current) {
        isSliderDraggingRef.current = false;
        setFormData(prev => ({ ...prev, image_scale: scaleRef.current }));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [updateImageDOM, updateSliderDOM, setOverlayVisible]);

  const handleImageMouseDown = useCallback((e: React.MouseEvent) => {
    if (!formData.image) return;
    e.preventDefault();
    e.stopPropagation();

    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setOverlayVisible(true);
  }, [formData.image, setOverlayVisible]);

  const handleSliderMouseDown = useCallback((e: React.MouseEvent) => {
    if (!formData.image) return;
    e.preventDefault();
    e.stopPropagation();

    isSliderDraggingRef.current = true;

    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const newScale = 1.0 + (percent / 100) * 2.0;

      scaleRef.current = newScale;
      updateSliderDOM(newScale);
      updateImageDOM(offsetRef.current.x, offsetRef.current.y, newScale);
    }
  }, [formData.image, updateSliderDOM, updateImageDOM]);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();

    const priceInCent = Math.round(formData.price * 100);

    if (isCreating) {
      const newProduct = await createProduct({
        name: formData.name,
        price: priceInCent,
        category: formData.category,
        image: formData.image || null,
        image_position: formData.image_position,
        image_scale: formData.image_scale,
        sort_order: products.filter(p => p.category === formData.category).length,
        active: formData.active,
      });

      if (newProduct) {
        mutateProducts();
        closeForm();
      }
    } else if (editingId) {
      const updated = await updateProduct(editingId, {
        name: formData.name,
        price: priceInCent,
        category: formData.category,
        image: formData.image || null,
        image_position: formData.image_position,
        image_scale: formData.image_scale,
        active: formData.active,
      });

      if (updated) {
        mutateProducts();
        closeForm();
      }
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    const success = await deleteProduct(deleteTarget.id);
    if (success) {
      mutateProducts();
    }
    setDeleteTarget(null);
  }

  async function handleToggleActive(product: Product) {
    const updated = await updateProduct(product.id, {
      active: !product.active,
    });

    if (updated) {
      mutateProducts();
    }
  }

  async function handleMoveUp(index: number) {
    const categoryProducts = filteredProducts;
    if (index === 0) return;

    const product = categoryProducts[index];
    const prevProduct = categoryProducts[index - 1];

    await updateProductOrder([
      { id: product.id, sort_order: prevProduct.sort_order },
      { id: prevProduct.id, sort_order: product.sort_order },
    ]);

    mutateProducts();
  }

  async function handleMoveDown(index: number) {
    const categoryProducts = filteredProducts;
    if (index === categoryProducts.length - 1) return;

    const product = categoryProducts[index];
    const nextProduct = categoryProducts[index + 1];

    await updateProductOrder([
      { id: product.id, sort_order: nextProduct.sort_order },
      { id: nextProduct.id, sort_order: product.sort_order },
    ]);

    mutateProducts();
  }

  // Image Preview Component with drag and zoom
  const ImagePreview = () => {
    const thumbPercent = ((formData.image_scale - 1.0) / 2.0) * 100;

    return (
      <div className="p-3 bg-slate-50 rounded-lg">
        <div className="flex items-center gap-1.5 mb-3 text-xs text-slate-500">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Bildausschnitt anpassen (ziehen zum Verschieben)
        </div>

        <div className="flex flex-col items-center gap-3">
          {/* Image Frame */}
          <div
            className={`relative w-28 h-28 rounded-xl overflow-hidden bg-slate-200 border-2 border-gold ${formData.image ? 'cursor-move' : ''}`}
            onMouseDown={handleImageMouseDown}
          >
            {formData.image ? (
              <>
                <img
                  ref={imageRef}
                  src={formData.image}
                  alt={formData.name || 'Preview'}
                  className="absolute w-full h-full object-cover pointer-events-none select-none"
                  style={{
                    transform: (() => {
                      const pos = parsePosition(formData.image_position);
                      const scale = formData.image_scale;
                      const translateX = (50 - pos.x) * 0.5;
                      const translateY = (50 - pos.y) * 0.5;
                      return `scale(${scale}) translate(${translateX}%, ${translateY}%)`;
                    })()
                  }}
                  draggable={false}
                />
                <div
                  ref={overlayRef}
                  className="absolute inset-0 bg-gold/30 flex items-center justify-center transition-opacity duration-100"
                  style={{ opacity: 0, pointerEvents: 'none' }}
                >
                  <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          {/* Zoom Slider - kompakt unter dem Bild */}
          <div className="w-28">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span>100%</span>
              <span className="text-xs font-medium text-slate-600" ref={scaleDisplayRef}>{Math.round(formData.image_scale * 100)}%</span>
              <span>300%</span>
            </div>
            <div
              ref={sliderRef}
              className={`relative h-2 rounded-full cursor-pointer ${formData.image ? 'bg-slate-200' : 'bg-slate-100 opacity-50 cursor-not-allowed'}`}
              onMouseDown={handleSliderMouseDown}
            >
              <div
                className="absolute left-0 top-0 h-full bg-gold/50 rounded-full pointer-events-none"
                style={{ width: `${thumbPercent}%` }}
              />
              <div
                ref={sliderThumbRef}
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full shadow pointer-events-none border-2 border-white ${formData.image ? 'bg-gold' : 'bg-slate-400'}`}
                style={{ left: `${thumbPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Edit Form Content (like Team/Services)
  const editFormContent = (
    <div className="overflow-hidden rounded-xl border border-gold/50 shadow-md animate-slideDown mt-1">
      <div className="bg-white">
        <div className="p-4">
          <form onSubmit={handleSubmit}>
            {/* Zeile 1: Name, Preis, Kategorie */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                  placeholder="Produktname"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Preis (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Kategorie</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as CategoryKey })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none cursor-pointer"
                >
                  <option value="bart">{productCategories.bart}</option>
                  <option value="haare">{productCategories.haare}</option>
                  <option value="rasur">{productCategories.rasur}</option>
                  <option value="pflege">{productCategories.pflege}</option>
                </select>
              </div>
            </div>

            {/* Zeile 2: Status + Bild Upload */}
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100">
                  <div className={`relative w-8 h-[18px] rounded-full transition-colors ${formData.active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <div className={`absolute top-[3px] w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${formData.active ? 'left-[14px]' : 'left-[3px]'}`} />
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="sr-only"
                    />
                  </div>
                  <span className="text-xs text-slate-600">{formData.active ? 'Aktiv' : 'Inaktiv'}</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Bild</label>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    className="sr-only"
                  />
                  <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium ${isUploading ? 'bg-slate-100 text-slate-400' : 'bg-gold text-black hover:bg-gold/90'}`}>
                    {isUploading ? (
                      <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    )}
                    Bild hochladen
                    {formData.image && (
                      <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                </label>
                {uploadError && <span className="ml-2 text-xs text-red-500">{uploadError}</span>}
              </div>
            </div>
          </form>
        </div>

        {/* Bildvorschau mit Zoom/Position */}
        {formData.image && (
          <div className="px-4 pb-3">
            <ImagePreview />
          </div>
        )}

        {/* Footer */}
        <div className="px-4 pb-4 flex justify-end gap-2">
          <button type="button" onClick={closeForm} className="px-4 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">
            Abbrechen
          </button>
          <button type="button" onClick={() => handleSubmit()} className="px-4 py-1.5 bg-gold text-black text-xs font-semibold rounded-lg hover:bg-gold/90">
            Speichern
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 600px; }
        }
        .animate-slideDown { animation: slideDown 0.25s ease-out; }
      `}</style>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Floating Panel */}
      <div className="flex-1 bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-200/50 overflow-hidden flex flex-col min-h-0">
        {/* Header */}
        <div className="px-4 md:px-8 py-4 md:py-5 flex flex-col md:flex-row md:items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-9 h-9 md:w-10 md:h-10 bg-gold/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Produkte verwalten</h3>
              <p className="text-xs text-slate-400">{products.length} Produkte registriert</p>
            </div>
          </div>
          <button
            onClick={openCreateForm}
            className="flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 bg-gold text-black text-xs font-semibold rounded-xl hover:bg-gold/90 transition-colors w-full md:w-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="md:hidden">Neu</span>
            <span className="hidden md:inline">Neues Produkt</span>
          </button>
        </div>

        {/* Gradient Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent flex-shrink-0" />

        {/* Category Filter */}
        <div className="px-4 md:px-8 py-3 md:py-4 flex gap-2 flex-shrink-0 bg-slate-50/50 overflow-x-auto">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeCategory === 'all'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Alle ({products.length})
          </button>
          {(Object.keys(productCategories) as CategoryKey[]).map((key) => {
            const count = products.filter(p => p.category === key).length;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  activeCategory === key
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {productCategories[key]} ({count})
              </button>
            );
          })}
        </div>

        {/* Gradient Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent flex-shrink-0" />

        {/* Products List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {filteredProducts.length === 0 && !isCreating ? (
            <div className="py-12 text-center text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-sm">Keine Produkte in dieser Kategorie</p>
              <button
                onClick={openCreateForm}
                className="mt-4 text-xs font-medium text-gold hover:text-gold/80 transition-colors"
              >
                Erstes Produkt erstellen
              </button>
            </div>
          ) : (
            <div>
              {isCreating && <div className="mb-4">{editFormContent}</div>}

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredProducts.map((product, index) => (
                  <div key={product.id} className={`bg-white rounded-xl border ${editingId === product.id ? 'border-gold/50 bg-gold/5' : 'border-slate-200'} overflow-hidden`}>
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Image */}
                        <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt={product.name}
                              width={56}
                              height={56}
                              className="w-full h-full object-cover"
                              style={{
                                transform: (() => {
                                  const pos = parsePosition(product.image_position || '50% 50%');
                                  const scale = product.image_scale || 1;
                                  const translateX = (50 - pos.x) * 0.5;
                                  const translateY = (50 - pos.y) * 0.5;
                                  return `scale(${scale}) translate(${translateX}%, ${translateY}%)`;
                                })(),
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`font-medium truncate ${product.active ? 'text-slate-900' : 'text-slate-400'}`}>
                              {product.name}
                            </span>
                            <span className="text-sm font-semibold text-gold flex-shrink-0">{formatProductPrice(product.price)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-500">
                              {productCategories[product.category]}
                            </span>
                            <span className={`text-xs ${product.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {product.active ? 'Aktiv' : 'Inaktiv'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-30"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleMoveDown(index)}
                            disabled={index === filteredProducts.length - 1}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-30"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleActive(product)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              product.active
                                ? 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                                : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                            }`}
                          >
                            {product.active ? 'Deaktivieren' : 'Aktivieren'}
                          </button>
                          <button
                            onClick={() => openEditForm(product)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                          >
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => setDeleteTarget(product)}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
                          >
                            Löschen
                          </button>
                        </div>
                      </div>
                    </div>
                    {editingId === product.id && editFormContent}
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block">
                {/* Header-Zeile */}
                <div className="grid grid-cols-[48px_1fr_100px_120px_60px_72px] gap-4 px-4 py-1.5 text-[11px] font-medium text-slate-400 border-b border-slate-100">
                  <div></div>
                  <div>Produkt</div>
                  <div>Preis</div>
                  <div>Kategorie</div>
                  <div>Status</div>
                  <div></div>
                </div>

                {/* Products-Liste */}
                <div className="divide-y divide-slate-50">
                  {filteredProducts.map((product, index) => (
                    <div key={product.id}>
                      <div className={`grid grid-cols-[48px_1fr_100px_120px_60px_72px] gap-4 items-center px-4 py-3 transition-colors ${editingId === product.id ? 'bg-gold/5' : 'hover:bg-slate-50'}`}>
                        {/* Image */}
                        <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt={product.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                              style={{
                                transform: (() => {
                                  const pos = parsePosition(product.image_position || '50% 50%');
                                  const scale = product.image_scale || 1;
                                  const translateX = (50 - pos.x) * 0.5;
                                  const translateY = (50 - pos.y) * 0.5;
                                  return `scale(${scale}) translate(${translateX}%, ${translateY}%)`;
                                })(),
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Name */}
                        <div className={`font-medium truncate ${product.active ? 'text-slate-900' : 'text-slate-400'}`}>
                          {product.name}
                        </div>

                        {/* Preis */}
                        <div className="text-sm font-medium text-gold">{formatProductPrice(product.price)}</div>

                        {/* Kategorie */}
                        <div className="text-sm text-slate-500">
                          <span className="px-2 py-1 bg-slate-100 rounded-lg text-xs">
                            {productCategories[product.category]}
                          </span>
                        </div>

                        {/* Status */}
                        <div>
                          <button
                            onClick={() => handleToggleActive(product)}
                            className={`relative w-10 h-5 rounded-full transition-colors ${
                              product.active ? 'bg-emerald-500' : 'bg-slate-200'
                            }`}
                          >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                              product.active ? 'left-5' : 'left-0.5'
                            }`} />
                          </button>
                        </div>

                        {/* Aktionen */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditForm(product)}
                            className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(product)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          <div className="flex flex-col">
                            <button
                              onClick={() => handleMoveUp(index)}
                              disabled={index === 0}
                              className="p-0.5 text-slate-300 hover:text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleMoveDown(index)}
                              disabled={index === filteredProducts.length - 1}
                              className="p-0.5 text-slate-300 hover:text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Inline Edit Form */}
                      {editingId === product.id && editFormContent}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Produkt löschen"
        message={`Möchten Sie "${deleteTarget?.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmLabel="Löschen"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
