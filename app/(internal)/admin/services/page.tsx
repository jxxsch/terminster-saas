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
    show_in_calendar: true,
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
      show_in_calendar: true,
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
      show_in_calendar: service.show_in_calendar ?? true,
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
        show_in_calendar: formData.show_in_calendar,
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
        show_in_calendar: formData.show_in_calendar,
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

  async function handleToggleCalendar(service: Service) {
    const updated = await updateService(service.id, {
      show_in_calendar: !service.show_in_calendar,
    });

    if (updated) {
      setServices(services.map(s => s.id === updated.id ? updated : s));
    }
  }

  // Alle Services für Webseite ein-/ausschalten
  async function handleToggleAllWebsite() {
    const allActive = services.every(s => s.active);
    const newValue = !allActive;

    // Alle Services aktualisieren
    const updatedServices = await Promise.all(
      services.map(async (service) => {
        const updated = await updateService(service.id, { active: newValue });
        return updated || service;
      })
    );

    setServices(updatedServices);
  }

  // Alle Services für Kalender ein-/ausschalten
  async function handleToggleAllCalendar() {
    const allInCalendar = services.every(s => s.show_in_calendar);
    const newValue = !allInCalendar;

    // Alle Services aktualisieren
    const updatedServices = await Promise.all(
      services.map(async (service) => {
        const updated = await updateService(service.id, { show_in_calendar: newValue });
        return updated || service;
      })
    );

    setServices(updatedServices);
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

  // Inline Edit Form (als JSX-Variable wie bei Team)
  const editFormContent = (
    <div className="overflow-hidden rounded-xl border border-gold/50 shadow-md animate-slideDown mt-1">
      <div className="bg-white">
        <div className="p-4">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                  required
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex justify-end gap-2">
          <button type="button" onClick={closeForm} className="px-4 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">
            Abbrechen
          </button>
          <button type="button" onClick={handleSubmit} className="px-4 py-1.5 bg-gold text-black text-xs font-semibold rounded-lg hover:bg-gold/90">
            Speichern
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 400px; }
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
        <div className="px-4 md:px-8 py-4 md:py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-9 h-9 md:w-10 md:h-10 bg-gold/10 rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Services verwalten</h3>
              <p className="text-xs text-slate-400 hidden md:block">{services.length} Services registriert</p>
            </div>
          </div>
          <button
            onClick={openCreateForm}
            className="flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 bg-gold text-black text-xs font-semibold rounded-xl hover:bg-gold/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden md:inline">Neuer Service</span>
            <span className="md:hidden">Neu</span>
          </button>
        </div>

        {/* Gradient Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent flex-shrink-0" />


        {/* Services List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {services.length === 0 && !isCreating ? (
            <div className="py-12 text-center text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
              </svg>
              <p className="text-sm">Noch keine Services vorhanden</p>
              <button
                onClick={openCreateForm}
                className="mt-4 text-xs font-medium text-gold hover:text-gold/80 transition-colors"
              >
                Ersten Service erstellen
              </button>
            </div>
          ) : (
            <div>
              {isCreating && <div className="mb-4">{editFormContent}</div>}

              {/* Mobile: Karten-Layout */}
              <div className="md:hidden space-y-3">
                {services.map((service, index) => (
                  <div key={service.id} className={`bg-white rounded-xl border ${editingId === service.id ? 'border-gold/50 bg-gold/5' : 'border-slate-200'} overflow-hidden`}>
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          service.active || service.show_in_calendar ? 'bg-emerald-50' : 'bg-slate-100'
                        }`}>
                          <svg className={`w-6 h-6 ${service.active || service.show_in_calendar ? 'text-emerald-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243z" />
                          </svg>
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900">{service.name}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-gold font-medium">{formatPrice(service.price)}</span>
                            <span className="text-slate-400 text-sm">{formatDuration(service.duration)}</span>
                          </div>
                        </div>
                      </div>
                      {/* Toggles + Aktionen */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleActive(service)}
                              className={`relative w-9 h-5 rounded-full transition-colors ${service.active ? 'bg-emerald-500' : 'bg-slate-200'}`}
                            >
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${service.active ? 'left-4' : 'left-0.5'}`} />
                            </button>
                            <span className="text-xs text-slate-500">Web</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleCalendar(service)}
                              className={`relative w-9 h-5 rounded-full transition-colors ${service.show_in_calendar ? 'bg-blue-500' : 'bg-slate-200'}`}
                            >
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${service.show_in_calendar ? 'left-4' : 'left-0.5'}`} />
                            </button>
                            <span className="text-xs text-slate-500">Kal</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleMoveUp(index)} disabled={index === 0} className="p-2 text-slate-400 disabled:opacity-30">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                          </button>
                          <button onClick={() => handleMoveDown(index)} disabled={index === services.length - 1} className="p-2 text-slate-400 disabled:opacity-30">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          <button onClick={() => openEditForm(service)} className="p-2 text-slate-400 hover:text-slate-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button onClick={() => setDeleteTarget(service)} className="p-2 text-slate-400 hover:text-red-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    {editingId === service.id && editFormContent}
                  </div>
                ))}
              </div>

              {/* Desktop: Tabellen-Layout */}
              <div className="hidden md:block">
                {/* Header-Zeile */}
                <div className="grid grid-cols-[40px_minmax(120px,1fr)_80px_80px_60px_60px_72px] gap-4 px-4 py-2 text-[11px] font-medium text-slate-400 border-b border-slate-100">
                  <div></div>
                  <div>Name</div>
                  <div>Preis</div>
                  <div>Dauer</div>
                  <div className="text-center">Webseite</div>
                  <div className="text-center">Kalender</div>
                  <div></div>
                </div>

                {/* Services-Liste */}
                <div className="divide-y divide-slate-50">
                  {services.map((service, index) => (
                    <div key={service.id}>
                      <div className={`grid grid-cols-[40px_minmax(120px,1fr)_80px_80px_60px_60px_72px] gap-4 items-center px-4 py-3 transition-colors ${editingId === service.id ? 'bg-gold/5' : 'hover:bg-slate-50'}`}>
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          service.active || service.show_in_calendar ? 'bg-emerald-50' : 'bg-slate-100'
                        }`}>
                          <svg className={`w-5 h-5 ${service.active || service.show_in_calendar ? 'text-emerald-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243z" />
                          </svg>
                        </div>

                        {/* Name */}
                        <div className="font-medium text-slate-900 truncate">{service.name}</div>

                        {/* Preis */}
                        <div className="text-sm font-medium text-gold">{formatPrice(service.price)}</div>

                        {/* Dauer */}
                        <div className="text-sm text-slate-600">{formatDuration(service.duration)}</div>

                        {/* Webseite Toggle */}
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleToggleActive(service)}
                            className={`relative w-10 h-5 rounded-full transition-colors ${
                              service.active ? 'bg-emerald-500' : 'bg-slate-200'
                            }`}
                            title="Auf Webseite anzeigen"
                          >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                              service.active ? 'left-5' : 'left-0.5'
                            }`} />
                          </button>
                        </div>

                        {/* Kalender Toggle */}
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleToggleCalendar(service)}
                            className={`relative w-10 h-5 rounded-full transition-colors ${
                              service.show_in_calendar ? 'bg-blue-500' : 'bg-slate-200'
                            }`}
                            title="Im Kalender anzeigen"
                          >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                              service.show_in_calendar ? 'left-5' : 'left-0.5'
                            }`} />
                          </button>
                        </div>

                        {/* Aktionen */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => editingId === service.id ? closeForm() : openEditForm(service)}
                            className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(service)}
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
                              disabled={index === services.length - 1}
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
                      {editingId === service.id && editFormContent}
                    </div>
                  ))}
                </div>

                {/* Footer: Master-Toggles bündig mit Tabelle */}
                {services.length > 0 && (
                  <div className="grid grid-cols-[40px_minmax(120px,1fr)_80px_80px_60px_60px_72px] gap-4 items-center px-4 py-3 bg-slate-50 border-t border-slate-200 rounded-b-lg">
                    <div></div>
                    <div className="text-xs font-medium text-slate-500">Alle ein/aus</div>
                    <div></div>
                    <div></div>
                    {/* Master Toggle Webseite */}
                    <div className="flex justify-center">
                      <button
                        onClick={handleToggleAllWebsite}
                        className={`relative w-10 h-5 rounded-full transition-colors ring-2 ring-offset-1 ${
                          services.every(s => s.active)
                            ? 'bg-emerald-500 ring-emerald-300'
                            : services.some(s => s.active)
                              ? 'bg-emerald-300 ring-emerald-200'
                              : 'bg-slate-300 ring-slate-200'
                        }`}
                        title="Alle Webseite ein-/ausschalten"
                      >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                          services.every(s => s.active) ? 'left-5' : 'left-0.5'
                        }`} />
                      </button>
                    </div>
                    {/* Master Toggle Kalender */}
                    <div className="flex justify-center">
                      <button
                        onClick={handleToggleAllCalendar}
                        className={`relative w-10 h-5 rounded-full transition-colors ring-2 ring-offset-1 ${
                          services.every(s => s.show_in_calendar)
                            ? 'bg-blue-500 ring-blue-300'
                            : services.some(s => s.show_in_calendar)
                              ? 'bg-blue-300 ring-blue-200'
                              : 'bg-slate-300 ring-slate-200'
                        }`}
                        title="Alle Kalender ein-/ausschalten"
                      >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                          services.every(s => s.show_in_calendar) ? 'left-5' : 'left-0.5'
                        }`} />
                      </button>
                    </div>
                    <div></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

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
