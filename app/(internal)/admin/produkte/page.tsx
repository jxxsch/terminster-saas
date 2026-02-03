'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductOrder,
  uploadImage,
  Product,
  formatProductPrice,
  productCategories,
} from '@/lib/supabase';
import { ConfirmModal } from '@/components/admin/ConfirmModal';

type CategoryKey = 'bart' | 'haare' | 'rasur' | 'pflege';

export default function ProduktePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryKey | 'all'>('all');
  const [isUploading, setIsUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    price: 0,
    category: 'bart' as CategoryKey,
    image: '',
    active: true,
  });

  // Bild-Upload Handler
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const url = await uploadImage(file, 'products');
    setIsUploading(false);

    if (url) {
      setFormData({ ...formData, image: url });
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      const data = await getAllProducts();
      if (mounted) {
        setProducts(data);
        setIsLoading(false);
      }
    }

    loadProducts();

    return () => { mounted = false; };
  }, []);

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
      active: true,
    });
    setIsCreating(true);
    setEditingId(null);
  }

  function openEditForm(product: Product) {
    setFormData({
      id: product.id,
      name: product.name,
      price: product.price / 100,
      category: product.category,
      image: product.image || '',
      active: product.active,
    });
    setEditingId(product.id);
    setIsCreating(false);
  }

  function closeForm() {
    setEditingId(null);
    setIsCreating(false);
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();

    const priceInCent = Math.round(formData.price * 100);

    if (isCreating) {
      const newProduct = await createProduct({
        name: formData.name,
        price: priceInCent,
        category: formData.category,
        image: formData.image || null,
        sort_order: products.filter(p => p.category === formData.category).length,
        active: formData.active,
      });

      if (newProduct) {
        setProducts([...products, newProduct]);
        closeForm();
      }
    } else if (editingId) {
      const updated = await updateProduct(editingId, {
        name: formData.name,
        price: priceInCent,
        category: formData.category,
        image: formData.image || null,
        active: formData.active,
      });

      if (updated) {
        setProducts(products.map(p => p.id === updated.id ? updated : p));
        closeForm();
      }
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    const success = await deleteProduct(deleteTarget.id);
    if (success) {
      setProducts(products.filter(p => p.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  }

  async function handleToggleActive(product: Product) {
    const updated = await updateProduct(product.id, {
      active: !product.active,
    });

    if (updated) {
      setProducts(products.map(p => p.id === updated.id ? updated : p));
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

    const data = await getAllProducts();
    setProducts(data);
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

    const data = await getAllProducts();
    setProducts(data);
  }

  // Inline Edit Form
  const editFormContent = (
    <form onSubmit={handleSubmit} className="animate-slideDown">
      <div className="grid grid-cols-[48px_1fr_100px_120px_60px_72px] gap-4 items-center px-4 py-3">
        {/* Bild-Upload */}
        <label className="relative w-12 h-12 rounded-xl border-2 border-dashed border-gold/50 bg-gold/5 overflow-hidden flex items-center justify-center cursor-pointer hover:bg-gold/10 transition-colors group">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="sr-only"
          />
          {isUploading ? (
            <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          ) : formData.image ? (
            <>
              <Image
                src={formData.image}
                alt="Vorschau"
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </>
          ) : (
            <svg className="w-5 h-5 text-gold/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </label>

        {/* Name */}
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
          placeholder="Produktname"
          required
        />

        {/* Preis */}
        <input
          type="number"
          step="0.01"
          min="0"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-gold focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
          required
        />

        {/* Kategorie */}
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value as CategoryKey })}
          className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
        >
          <option value="bart">{productCategories.bart}</option>
          <option value="haare">{productCategories.haare}</option>
          <option value="rasur">{productCategories.rasur}</option>
          <option value="pflege">{productCategories.pflege}</option>
        </select>

        {/* Aktiv Toggle */}
        <div className="flex items-center justify-center">
          <label className="cursor-pointer">
            <div className={`relative w-10 h-5 rounded-full transition-colors ${formData.active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.active ? 'left-5' : 'left-0.5'}`} />
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="sr-only"
              />
            </div>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-1">
          <button type="button" onClick={closeForm} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Abbrechen">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button type="button" onClick={() => handleSubmit()} className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors" title="Speichern">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown { animation: slideDown 0.2s ease-out; }
      `}</style>
    </form>
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
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
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
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
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
              {isCreating && <div className="mb-4 md:px-4">{editFormContent}</div>}

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredProducts.map((product, index) => (
                  <div key={product.id}>
                    {editingId === product.id ? (
                      <div className="bg-gold/5 rounded-xl p-3">{editFormContent}</div>
                    ) : (
                      <div className={`bg-white border rounded-xl p-4 ${product.active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
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
                    )}
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
                      {editingId === product.id ? (
                        /* Inline Edit - ersetzt die Zeile */
                        <div className="bg-gold/5">{editFormContent}</div>
                      ) : (
                      <div className={`grid grid-cols-[48px_1fr_100px_120px_60px_72px] gap-4 items-center px-4 py-3 transition-colors hover:bg-slate-50`}>
                        {/* Image */}
                        <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt={product.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
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
                      )}
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
