'use client';

import { useState, useEffect } from 'react';
import {
  getAllTeam,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  updateTeamOrder,
  uploadImage,
  TeamMember,
} from '@/lib/supabase';
import { ConfirmModal } from '@/components/admin/ConfirmModal';

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    image: '',
    image_position: '50% 50%',
    image_scale: 1,
    active: true,
  });

  useEffect(() => {
    let mounted = true;

    async function loadTeam() {
      const data = await getAllTeam();
      if (mounted) {
        setTeam(data);
        setIsLoading(false);
      }
    }

    loadTeam();

    return () => { mounted = false; };
  }, []);

  function openCreateForm() {
    setFormData({
      id: '',
      name: '',
      image: '',
      image_position: '50% 50%',
      image_scale: 1,
      active: true,
    });
    setUploadError('');
    setIsCreating(true);
    setEditingMember(null);
  }

  function openEditForm(member: TeamMember) {
    setFormData({
      id: member.id,
      name: member.name,
      image: member.image || '',
      image_position: member.image_position || '50% 50%',
      image_scale: member.image_scale || 1,
      active: member.active,
    });
    setUploadError('');
    setEditingMember(member);
    setIsCreating(false);
  }

  function closeForm() {
    setEditingMember(null);
    setIsCreating(false);
    setUploadError('');
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Nur JPG, PNG, WebP und GIF erlaubt');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Maximale Dateigröße: 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    const url = await uploadImage(file, 'team');

    if (url) {
      setFormData({ ...formData, image: url });
    } else {
      setUploadError('Fehler beim Hochladen. Bitte erneut versuchen.');
    }

    setIsUploading(false);
    // Reset file input
    e.target.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isCreating) {
      // Create new member
      const newMember = await createTeamMember({
        id: formData.id.toLowerCase().replace(/\s+/g, '-'),
        name: formData.name,
        image: formData.image || null,
        image_position: formData.image_position,
        image_scale: formData.image_scale,
        sort_order: team.length,
        active: formData.active,
      });

      if (newMember) {
        setTeam([...team, newMember]);
        closeForm();
      }
    } else if (editingMember) {
      // Update existing member
      const updated = await updateTeamMember(editingMember.id, {
        name: formData.name,
        image: formData.image || null,
        image_position: formData.image_position,
        image_scale: formData.image_scale,
        active: formData.active,
      });

      if (updated) {
        setTeam(team.map(m => m.id === updated.id ? updated : m));
        closeForm();
      }
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    const success = await deleteTeamMember(deleteTarget.id);
    if (success) {
      setTeam(team.filter(m => m.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;

    const newTeam = [...team];
    [newTeam[index - 1], newTeam[index]] = [newTeam[index], newTeam[index - 1]];

    // Update sort_order
    const updates = newTeam.map((m, i) => ({ id: m.id, sort_order: i }));
    await updateTeamOrder(updates);

    setTeam(newTeam);
  }

  async function handleMoveDown(index: number) {
    if (index === team.length - 1) return;

    const newTeam = [...team];
    [newTeam[index], newTeam[index + 1]] = [newTeam[index + 1], newTeam[index]];

    // Update sort_order
    const updates = newTeam.map((m, i) => ({ id: m.id, sort_order: i }));
    await updateTeamOrder(updates);

    setTeam(newTeam);
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
          <h1 className="text-2xl font-medium text-black">Team-Verwaltung</h1>
          <p className="text-sm text-gray-500 mt-1">
            {team.length} Mitarbeiter insgesamt
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

      {/* Team List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                Bild
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Reihenfolge
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {team.map((member, index) => (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                    {member.image ? (
                      <img
                        src={member.image}
                        alt={member.name}
                        className="w-full h-full object-cover"
                        style={{
                          objectPosition: member.image_position,
                          transform: `scale(${member.image_scale})`,
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-black">{member.name}</span>
                  <span className="text-xs text-gray-400 ml-2">({member.id})</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    member.active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {member.active ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === team.length - 1}
                      className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditForm(member)}
                      className="p-1.5 hover:bg-gray-200 rounded text-gray-500 hover:text-black"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteTarget(member)}
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

        {team.length === 0 && (
          <div className="px-4 py-12 text-center text-gray-500">
            Noch keine Teammitglieder vorhanden
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      {(editingMember || isCreating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeForm} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 p-8 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-black mb-4">
              {isCreating ? 'Neues Teammitglied' : 'Teammitglied bearbeiten'}
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
                    placeholder="z.B. max-mustermann"
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
                  placeholder="Max Mustermann"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bild
                </label>
                <div className="flex gap-6">
                  {/* Image Preview */}
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center">
                      {formData.image ? (
                        <img
                          src={formData.image}
                          alt="Vorschau"
                          className="w-full h-full object-cover"
                          style={{
                            objectPosition: formData.image_position,
                            transform: `scale(${formData.image_scale})`,
                          }}
                        />
                      ) : (
                        <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-3">
                    {/* File Upload Button */}
                    <div>
                      <label className="relative cursor-pointer">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleImageUpload}
                          disabled={isUploading}
                          className="sr-only"
                        />
                        <span className={`inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium transition-colors ${
                          isUploading
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-gray-50 hover:border-gold'
                        }`}>
                          {isUploading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                              Wird hochgeladen...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Bild auswählen
                            </>
                          )}
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP oder GIF (max. 5MB)</p>
                    </div>

                    {/* Error Message */}
                    {uploadError && (
                      <p className="text-xs text-red-600">{uploadError}</p>
                    )}

                    {/* URL Input (optional) */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Oder Bild-URL eingeben:
                      </label>
                      <input
                        type="text"
                        value={formData.image}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none"
                        placeholder="https://..."
                      />
                    </div>

                    {/* Remove Image Button */}
                    {formData.image && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image: '' })}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Bild entfernen
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bild-Position
                  </label>
                  <input
                    type="text"
                    value={formData.image_position}
                    onChange={(e) => setFormData({ ...formData, image_position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none"
                    placeholder="50% 50%"
                  />
                  <p className="text-xs text-gray-400 mt-1">z.B. 50% 20% für Fokus oben</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bild-Skalierung
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="3"
                    value={formData.image_scale}
                    onChange={(e) => setFormData({ ...formData, image_scale: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gold focus:outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">1 = normal, 1.5 = 50% größer</p>
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
                  Aktiv (in Buchungssystem sichtbar)
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
        title="Teammitglied löschen"
        message={`Möchten Sie "${deleteTarget?.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmLabel="Löschen"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
