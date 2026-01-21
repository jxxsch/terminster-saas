'use client';

import { useState, useEffect } from 'react';
import {
  getAllServices,
  createService,
  updateService,
  deleteService,
  Service,
  formatPrice,
  formatDuration,
} from '@/lib/supabase';
import { ConfirmModal } from '@/components/admin/ConfirmModal';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    price: 0, // in Euro for display
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
    setEditingService(null);
  }

  function openEditForm(service: Service) {
    setFormData({
      id: service.id,
      name: service.name,
      price: service.price / 100, // Convert from cent to euro
      duration: service.duration,
      active: service.active,
    });
    setEditingService(service);
    setIsCreating(false);
  }

  function closeForm() {
    setEditingService(null);
    setIsCreating(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const priceInCent = Math.round(formData.price * 100);

    if (isCreating) {
      const newService = await createService({
        id: formData.id.toLowerCase().replace(/\s+/g, '-'),
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
    } else if (editingService) {
      const updated = await updateService(editingService.id, {
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
          <h1 className="text-2xl font-medium text-black">Services-Verwaltung</h1>
          <p className="text-sm text-gray-500 mt-1">
            {services.length} Services insgesamt
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="px-4 py-2 bg-gold text-black text-sm font-medium tracking-wider uppercase hover:bg-gold-light transition-colors rounded-lg flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Hinzufügen
        </button>
      </div>

      {/* Services List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Service
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Preis
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Dauer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {services.map((service) => (
              <tr key={service.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-black">{service.name}</span>
                  <span className="text-xs text-gray-400 ml-2">({service.id})</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-black font-medium">{formatPrice(service.price)}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600">{formatDuration(service.duration)}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    service.active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {service.active ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditForm(service)}
                      className="p-1.5 hover:bg-gray-200 rounded text-gray-500 hover:text-black"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteTarget(service)}
                      className="p-1.5 hover:bg-red-100 rounded text-gray-500 hover:text-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {services.length === 0 && (
          <div className="px-4 py-12 text-center text-gray-500">
            Noch keine Services vorhanden
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      {(editingService || isCreating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeForm} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 p-8 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-black mb-4">
              {isCreating ? 'Neuer Service' : 'Service bearbeiten'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isCreating && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID (eindeutig)
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none"
                    placeholder="z.B. haarschnitt"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none"
                  placeholder="Haarschnitt"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preis (€)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dauer (Min)
                  </label>
                  <input
                    type="number"
                    step="5"
                    min="5"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 30 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-gold border-gray-300 rounded focus:ring-gold"
                />
                <label htmlFor="active" className="text-sm text-gray-700">
                  Aktiv (im Buchungssystem sichtbar)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gold text-black text-sm font-medium rounded-lg hover:bg-gold-light transition-colors"
                >
                  {isCreating ? 'Erstellen' : 'Speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
