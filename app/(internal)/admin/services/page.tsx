'use client';

import { useState, useEffect } from 'react';
import {
  getAllServices,
  createService,
  updateService,
  deleteService,
  updateServiceOrder,
  Service,
  formatPrice,
  formatDuration,
} from '@/lib/supabase';
import { ConfirmModal } from '@/components/admin/ConfirmModal';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    price: 0,
    duration: 30,
    active: true,
  });

  useEffect(() => {
    let mounted = true;

    async function loadServices() {
      const data = await getAllServices();
      if (mounted) {
        setServices(data);
        setIsLoading(false);
      }
    }

    loadServices();

    return () => { mounted = false; };
  }, []);

  function openCreateForm() {
    setFormData({
      id: '',
      name: '',
      price: 0,
      duration: 30,
      active: true,
    });
    setIsCreating(true);
    setEditingId(null);
  }

  function openEditForm(service: Service) {
    setFormData({
      id: service.id,
      name: service.name,
      price: service.price / 100,
      duration: service.duration,
      active: service.active,
    });
    setEditingId(service.id);
    setIsCreating(false);
  }

  function closeForm() {
    setEditingId(null);
    setIsCreating(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const priceInCent = Math.round(formData.price * 100);

    if (isCreating) {
      const newService = await createService({
        id: formData.name.toLowerCase().replace(/\s+/g, '-'),
        name: formData.name,
        price: priceInCent,
        duration: formData.duration,
        sort_order: services.length,
        active: formData.active,
      });

      if (newService) {
        setServices([...services, newService]);
        closeForm();
      }
    } else if (editingId) {
      const updated = await updateService(editingId, {
        name: formData.name,
        price: priceInCent,
        duration: formData.duration,
        active: formData.active,
      });

      if (updated) {
        setServices(services.map(s => s.id === updated.id ? updated : s));
        closeForm();
      }
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    const success = await deleteService(deleteTarget.id);
    if (success) {
      setServices(services.filter(s => s.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  }

  async function handleToggleActive(service: Service) {
    const updated = await updateService(service.id, {
      active: !service.active,
    });

    if (updated) {
      setServices(services.map(s => s.id === updated.id ? updated : s));
    }
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    const newServices = [...services];
    [newServices[index - 1], newServices[index]] = [newServices[index], newServices[index - 1]];
    const updates = newServices.map((s, i) => ({ id: s.id, sort_order: i }));
    await updateServiceOrder(updates);
    setServices(newServices);
  }

  async function handleMoveDown(index: number) {
    if (index === services.length - 1) return;
    const newServices = [...services];
    [newServices[index], newServices[index + 1]] = [newServices[index + 1], newServices[index]];
    const updates = newServices.map((s, i) => ({ id: s.id, sort_order: i }));
    await updateServiceOrder(updates);
    setServices(newServices);
  }

  // Inline Edit Form Component
  const InlineEditForm = () => (
    <div className="px-8 pb-4 pt-2 bg-slate-50 border-t border-slate-200">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:border-gold focus:outline-none"
              placeholder="Haarschnitt"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Preis (€)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:border-gold focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Dauer (Min)</label>
            <input
              type="number"
              step="5"
              min="5"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 30 })}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:border-gold focus:outline-none"
              required
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <div className={`relative w-9 h-5 rounded-full transition-colors ${formData.active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.active ? 'left-4' : 'left-0.5'}`} />
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="sr-only"
                />
              </div>
              <span className="text-xs text-slate-600">Aktiv</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={closeForm}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-gold text-black text-xs font-semibold rounded-lg hover:bg-gold/90 transition-colors"
          >
            Speichern
          </button>
        </div>
      </form>
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
    <div className="space-y-6">
      {/* Floating Panel */}
      <div className="bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-200/50 overflow-hidden">
        {/* Header */}
        <div className="px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Services verwalten</h3>
              <p className="text-xs text-slate-400">{services.length} Services registriert</p>
            </div>
          </div>
          <button
            onClick={openCreateForm}
            className="flex items-center gap-2 px-5 py-2.5 bg-gold text-black text-xs font-semibold rounded-xl hover:bg-gold/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Neuer Service
          </button>
        </div>

        {/* Gradient Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        {/* Create Form at Top */}
        {isCreating && (
          <div className="border-b border-slate-200">
            <div className="px-8 py-3 bg-slate-50/50">
              <span className="text-xs font-medium text-slate-500">Neuen Service erstellen</span>
            </div>
            <InlineEditForm />
          </div>
        )}

        {/* Services List */}
        <div>
          {services.length === 0 && !isCreating ? (
            <div className="px-8 py-16 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">Noch keine Services vorhanden</p>
              <button
                onClick={openCreateForm}
                className="mt-4 text-xs font-medium text-gold hover:text-gold/80 transition-colors"
              >
                Ersten Service erstellen
              </button>
            </div>
          ) : (
            services.map((service, index) => (
              <div key={service.id}>
                <div className="group px-8 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                  <div className="flex items-center gap-5">
                    {/* Service Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      service.active ? 'bg-emerald-50' : 'bg-slate-100'
                    }`}>
                      <svg className={`w-5 h-5 ${service.active ? 'text-emerald-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>

                    {/* Service Info */}
                    <div>
                      <p className="text-sm font-medium text-slate-900">{service.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs font-medium text-gold">{formatPrice(service.price)}</span>
                        <span className="text-xs text-slate-300">•</span>
                        <span className="text-xs text-slate-500">{formatDuration(service.duration)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-4">
                    {/* Toggle Switch */}
                    <button
                      onClick={() => handleToggleActive(service)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        service.active ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                        service.active ? 'left-6' : 'left-1'
                      }`} />
                    </button>

                    {/* Edit & Delete */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => editingId === service.id ? closeForm() : openEditForm(service)}
                        className={`p-2 rounded-lg transition-colors ${
                          editingId === service.id
                            ? 'text-gold bg-gold/10'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(service)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {/* Reorder */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="p-1 text-slate-300 hover:text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === services.length - 1}
                        className="p-1 text-slate-300 hover:text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Edit Form */}
                {editingId === service.id && <InlineEditForm />}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Service löschen"
        message={`Möchten Sie "${deleteTarget?.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmLabel="Löschen"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
