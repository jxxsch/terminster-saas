'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getAllTeam,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  updateTeamOrder,
  uploadImage,
  getUsedVacationDays,
  TeamMember,
} from '@/lib/supabase';
import { ConfirmModal } from '@/components/admin/ConfirmModal';

type ImageFormat = 'square' | 'portrait';

// Berechnet Tage bis zum nächsten Geburtstag und das Alter
function getDaysUntilBirthday(birthdayStr: string): { days: number; label: string; nextAge: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const birthday = new Date(birthdayStr);
  const birthYear = birthday.getFullYear();
  const nextBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());

  // Wenn Geburtstag dieses Jahr schon war, nächstes Jahr nehmen
  if (nextBirthday < today) {
    nextBirthday.setFullYear(today.getFullYear() + 1);
  }

  // Alter am nächsten Geburtstag
  const nextAge = nextBirthday.getFullYear() - birthYear;

  const diffTime = nextBirthday.getTime() - today.getTime();
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return { days: 0, label: `🎂 wird ${nextAge}!`, nextAge };
  } else if (days === 1) {
    return { days: 1, label: `morgen ${nextAge}`, nextAge };
  } else {
    return { days, label: `in ${days}d → ${nextAge}`, nextAge };
  }
}

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [usedVacationDays, setUsedVacationDays] = useState<Record<string, number>>({});

  // Which format is currently being edited
  const [activeFormat, setActiveFormat] = useState<ImageFormat>('square');

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    image: '',
    image_position: '50% 50%',
    image_scale: 1,
    image_position_portrait: '50% 50%',
    image_scale_portrait: 1,
    active: true,
    phone: '',
    birthday: '',
    vacation_days: 30,
    start_date: '',
    free_day: null as number | null,
  });

  // All refs - no state during drag to avoid ANY re-renders
  const isDraggingRef = useRef(false);
  const isSliderDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const sliderStartRef = useRef({ x: 0, value: 1 });
  const activeFormatRef = useRef<ImageFormat>('square');

  // Position refs for each format
  const squareOffsetRef = useRef({ x: 50, y: 50 });
  const portraitOffsetRef = useRef({ x: 50, y: 50 });
  const squareScaleRef = useRef(1);
  const portraitScaleRef = useRef(1);

  // DOM refs
  const squareImageRef = useRef<HTMLImageElement>(null);
  const portraitImageRef = useRef<HTMLImageElement>(null);
  const squareOverlayRef = useRef<HTMLDivElement>(null);
  const portraitOverlayRef = useRef<HTMLDivElement>(null);
  const squareSliderRef = useRef<HTMLDivElement>(null);
  const portraitSliderRef = useRef<HTMLDivElement>(null);
  const squareSliderThumbRef = useRef<HTMLDivElement>(null);
  const portraitSliderThumbRef = useRef<HTMLDivElement>(null);
  const squareScaleDisplayRef = useRef<HTMLSpanElement>(null);
  const portraitScaleDisplayRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      const [teamData, vacationData] = await Promise.all([
        getAllTeam(),
        getUsedVacationDays(new Date().getFullYear())
      ]);
      if (mounted) {
        setTeam(teamData);
        setUsedVacationDays(vacationData);
        setIsLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, []);

  const parsePosition = (posStr: string) => {
    const match = posStr?.match(/(-?\d+)%\s+(-?\d+)%/);
    if (match) {
      return { x: parseInt(match[1]), y: parseInt(match[2]) };
    }
    return { x: 50, y: 50 };
  };

  function openCreateForm() {
    setFormData({
      id: '',
      name: '',
      image: '',
      image_position: '50% 50%',
      image_scale: 1,
      image_position_portrait: '50% 50%',
      image_scale_portrait: 1,
      active: true,
      phone: '',
      birthday: '',
      vacation_days: 30,
      start_date: '',
      free_day: null,
    });
    squareOffsetRef.current = { x: 50, y: 50 };
    portraitOffsetRef.current = { x: 50, y: 50 };
    squareScaleRef.current = 1;
    portraitScaleRef.current = 1;
    setActiveFormat('square');
    activeFormatRef.current = 'square';
    setUploadError('');
    setIsCreating(true);
    setEditingId(null);
  }

  function openEditForm(member: TeamMember) {
    const squarePos = parsePosition(member.image_position || '50% 50%');
    const portraitPos = parsePosition(member.image_position_portrait || '50% 50%');

    const squareScale = member.image_scale || 1;
    const portraitScale = member.image_scale_portrait || 1;

    setFormData({
      id: member.id,
      name: member.name,
      image: member.image || '',
      image_position: member.image_position || '50% 50%',
      image_scale: squareScale,
      image_position_portrait: member.image_position_portrait || '50% 50%',
      image_scale_portrait: portraitScale,
      active: member.active,
      phone: member.phone || '',
      birthday: member.birthday || '',
      vacation_days: member.vacation_days || 30,
      start_date: member.start_date || '',
      free_day: member.free_day,
    });

    squareOffsetRef.current = squarePos;
    portraitOffsetRef.current = portraitPos;
    squareScaleRef.current = squareScale;
    portraitScaleRef.current = portraitScale;

    setActiveFormat('square');
    activeFormatRef.current = 'square';
    setUploadError('');
    setEditingId(member.id);
    setIsCreating(false);
  }

  function closeForm() {
    setEditingId(null);
    setIsCreating(false);
    setUploadError('');
  }

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
    const url = await uploadImage(file, 'team');
    if (url) {
      setFormData(prev => ({
        ...prev,
        image: url,
        image_position: '50% 50%',
        image_scale: 1,
        image_position_portrait: '50% 50%',
        image_scale_portrait: 1,
      }));
      squareOffsetRef.current = { x: 50, y: 50 };
      portraitOffsetRef.current = { x: 50, y: 50 };
      squareScaleRef.current = 1;
      portraitScaleRef.current = 1;
    } else {
      setUploadError('Fehler beim Hochladen');
    }
    setIsUploading(false);
    e.target.value = '';
  }

  // Update image position via DOM directly
  // Verwende translate statt object-position für zuverlässiges Verschieben in alle Richtungen
  const updateImageDOM = useCallback((format: ImageFormat, x: number, y: number, scale: number) => {
    const translateX = (50 - x) * 0.5;
    const translateY = (50 - y) * 0.5;
    const transform = `scale(${scale}) translate(${translateX}%, ${translateY}%)`;

    if (format === 'square') {
      if (squareImageRef.current) {
        squareImageRef.current.style.transform = transform;
      }
    } else {
      if (portraitImageRef.current) {
        portraitImageRef.current.style.transform = transform;
      }
    }
  }, []);

  // Update slider thumb position via DOM
  const updateSliderDOM = useCallback((format: ImageFormat, scale: number) => {
    const percent = ((scale - 1.0) / 2.0) * 100; // 1.0-3.0 -> 0-100%
    const thumbRef = format === 'square' ? squareSliderThumbRef : portraitSliderThumbRef;
    const displayRef = format === 'square' ? squareScaleDisplayRef : portraitScaleDisplayRef;

    if (thumbRef.current) {
      thumbRef.current.style.left = `${percent}%`;
    }
    if (displayRef.current) {
      displayRef.current.textContent = `${Math.round(scale * 100)}%`;
    }
  }, []);

  // Show/hide overlay via DOM
  const setOverlayVisible = useCallback((format: ImageFormat, visible: boolean) => {
    const ref = format === 'square' ? squareOverlayRef : portraitOverlayRef;
    if (ref.current) {
      ref.current.style.opacity = visible ? '1' : '0';
      ref.current.style.pointerEvents = visible ? 'auto' : 'none';
    }
  }, []);

  // Global mouse handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Handle image dragging
      if (isDraggingRef.current) {
        e.preventDefault();
        const format = activeFormatRef.current;
        const offsetRef = format === 'square' ? squareOffsetRef : portraitOffsetRef;
        const scaleRef = format === 'square' ? squareScaleRef : portraitScaleRef;

        // Sensitivität für Bewegung (kleinerer Wert = schnellere Bewegung)
        const deltaX = (e.clientX - dragStartRef.current.x) / 1.5;
        const deltaY = (e.clientY - dragStartRef.current.y) / 1.5;

        // Erweiterte Grenzen: -50% bis 150% für maximale Flexibilität
        const newX = Math.max(-50, Math.min(150, offsetRef.current.x - deltaX));
        const newY = Math.max(-50, Math.min(150, offsetRef.current.y - deltaY));

        offsetRef.current = { x: newX, y: newY };
        dragStartRef.current = { x: e.clientX, y: e.clientY };

        updateImageDOM(format, newX, newY, scaleRef.current);
      }

      // Handle slider dragging
      if (isSliderDraggingRef.current) {
        e.preventDefault();
        const format = activeFormatRef.current;
        const sliderRef = format === 'square' ? squareSliderRef : portraitSliderRef;
        const scaleRef = format === 'square' ? squareScaleRef : portraitScaleRef;
        const offsetRef = format === 'square' ? squareOffsetRef : portraitOffsetRef;

        if (sliderRef.current) {
          const rect = sliderRef.current.getBoundingClientRect();
          const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
          const newScale = 1.0 + (percent / 100) * 2.0; // 0-100% -> 1.0-3.0

          scaleRef.current = newScale;
          updateSliderDOM(format, newScale);
          updateImageDOM(format, offsetRef.current.x, offsetRef.current.y, newScale);
        }
      }
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        const format = activeFormatRef.current;
        setOverlayVisible(format, false);

        // Update state at the end
        const offsetRef = format === 'square' ? squareOffsetRef : portraitOffsetRef;
        const scaleRef = format === 'square' ? squareScaleRef : portraitScaleRef;
        const newPosition = `${Math.round(offsetRef.current.x)}% ${Math.round(offsetRef.current.y)}%`;

        if (format === 'square') {
          setFormData(prev => ({ ...prev, image_position: newPosition, image_scale: scaleRef.current }));
        } else {
          setFormData(prev => ({ ...prev, image_position_portrait: newPosition, image_scale_portrait: scaleRef.current }));
        }
      }

      if (isSliderDraggingRef.current) {
        isSliderDraggingRef.current = false;
        const format = activeFormatRef.current;
        const scaleRef = format === 'square' ? squareScaleRef : portraitScaleRef;

        if (format === 'square') {
          setFormData(prev => ({ ...prev, image_scale: scaleRef.current }));
        } else {
          setFormData(prev => ({ ...prev, image_scale_portrait: scaleRef.current }));
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [updateImageDOM, updateSliderDOM, setOverlayVisible]);

  const handleImageMouseDown = useCallback((e: React.MouseEvent, format: ImageFormat) => {
    if (!formData.image) return;
    e.preventDefault();
    e.stopPropagation();

    activeFormatRef.current = format;
    setActiveFormat(format);

    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setOverlayVisible(format, true);
  }, [formData.image, setOverlayVisible]);

  const handleSliderMouseDown = useCallback((e: React.MouseEvent, format: ImageFormat) => {
    if (!formData.image) return;
    e.preventDefault();
    e.stopPropagation();

    activeFormatRef.current = format;
    setActiveFormat(format);

    isSliderDraggingRef.current = true;

    // Immediately update to clicked position
    const sliderRef = format === 'square' ? squareSliderRef : portraitSliderRef;
    const scaleRef = format === 'square' ? squareScaleRef : portraitScaleRef;
    const offsetRef = format === 'square' ? squareOffsetRef : portraitOffsetRef;

    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const newScale = 1.0 + (percent / 100) * 2.0;

      scaleRef.current = newScale;
      updateSliderDOM(format, newScale);
      updateImageDOM(format, offsetRef.current.x, offsetRef.current.y, newScale);
    }
  }, [formData.image, updateSliderDOM, updateImageDOM]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isCreating) {
      const newMember = await createTeamMember({
        id: formData.name.toLowerCase().replace(/\s+/g, '-'),
        name: formData.name,
        image: formData.image || null,
        image_position: formData.image_position,
        image_scale: formData.image_scale,
        image_position_portrait: formData.image_position_portrait,
        image_scale_portrait: formData.image_scale_portrait,
        sort_order: team.length,
        active: formData.active,
        phone: formData.phone || null,
        birthday: formData.birthday || null,
        vacation_days: formData.vacation_days,
        start_date: formData.start_date || null,
        free_day: formData.free_day,
      });
      if (newMember) {
        setTeam([...team, newMember]);
        closeForm();
      }
    } else if (editingId) {
      const updated = await updateTeamMember(editingId, {
        name: formData.name,
        image: formData.image || null,
        image_position: formData.image_position,
        image_scale: formData.image_scale,
        image_position_portrait: formData.image_position_portrait,
        image_scale_portrait: formData.image_scale_portrait,
        active: formData.active,
        phone: formData.phone || null,
        birthday: formData.birthday || null,
        vacation_days: formData.vacation_days,
        start_date: formData.start_date || null,
        free_day: formData.free_day,
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

  async function handleToggleActive(member: TeamMember) {
    const updated = await updateTeamMember(member.id, { active: !member.active });
    if (updated) {
      setTeam(team.map(m => m.id === updated.id ? updated : m));
    }
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    const newTeam = [...team];
    [newTeam[index - 1], newTeam[index]] = [newTeam[index], newTeam[index - 1]];
    const updates = newTeam.map((m, i) => ({ id: m.id, sort_order: i }));
    await updateTeamOrder(updates);
    setTeam(newTeam);
  }

  async function handleMoveDown(index: number) {
    if (index === team.length - 1) return;
    const newTeam = [...team];
    [newTeam[index], newTeam[index + 1]] = [newTeam[index + 1], newTeam[index]];
    const updates = newTeam.map((m, i) => ({ id: m.id, sort_order: i }));
    await updateTeamOrder(updates);
    setTeam(newTeam);
  }

  // Image Preview Component - kompakt
  const ImagePreview = ({ format, label, aspectClass }: { format: ImageFormat; label: string; aspectClass: string }) => {
    const isActive = activeFormat === format;
    const position = format === 'square' ? formData.image_position : formData.image_position_portrait;
    const scale = format === 'square' ? formData.image_scale : formData.image_scale_portrait;
    const imageRef = format === 'square' ? squareImageRef : portraitImageRef;
    const overlayRef = format === 'square' ? squareOverlayRef : portraitOverlayRef;
    const sliderRef = format === 'square' ? squareSliderRef : portraitSliderRef;
    const thumbRef = format === 'square' ? squareSliderThumbRef : portraitSliderThumbRef;
    const displayRef = format === 'square' ? squareScaleDisplayRef : portraitScaleDisplayRef;

    const thumbPercent = ((scale - 1.0) / 2.0) * 100;

    return (
      <div
        className={`p-2 rounded-lg transition-all cursor-pointer ${isActive ? 'bg-white ring-1 ring-gold' : 'bg-white/50 hover:bg-white'}`}
        onClick={() => { setActiveFormat(format); activeFormatRef.current = format; }}
      >
        <div className="text-[10px] text-slate-500 mb-1.5 text-center font-medium">{label}</div>

        {/* Image Frame */}
        <div
          className={`relative ${aspectClass} rounded-lg overflow-hidden bg-slate-200 border ${isActive ? 'border-gold' : 'border-slate-300'} ${formData.image ? 'cursor-move' : ''}`}
          onMouseDown={(e) => handleImageMouseDown(e, format)}
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
                    const pos = parsePosition(position);
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
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Kompakter Zoom Slider */}
        <div className="mt-2">
          <div
            ref={sliderRef}
            className={`relative h-2 rounded-full cursor-pointer ${formData.image ? 'bg-slate-200' : 'bg-slate-100 opacity-50 cursor-not-allowed'}`}
            onMouseDown={(e) => formData.image && handleSliderMouseDown(e, format)}
          >
            <div className="absolute left-0 top-0 h-full bg-gold/50 rounded-full pointer-events-none" style={{ width: `${thumbPercent}%` }} />
            <div
              ref={thumbRef}
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full shadow pointer-events-none border border-white ${formData.image ? 'bg-gold' : 'bg-slate-400'}`}
              style={{ left: `${thumbPercent}%` }}
            />
          </div>
          <div className="text-center mt-1">
            <span ref={displayRef} className="text-[10px] text-slate-500">{Math.round(scale * 100)}%</span>
          </div>
        </div>
      </div>
    );
  };

  // Split View Edit Form - kompakt (als JSX-Variable statt Komponente, um Fokus zu behalten)
  const editFormContent = (
    <div className="overflow-hidden rounded-xl border border-gold/50 shadow-md animate-slideDown mt-1">
      <div className="bg-white">
        {/* Kompaktes Formular */}
        <div className="p-4">
          <form onSubmit={handleSubmit}>
            {/* Zeile 1: Name, Handynummer, Urlaubstage */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                  placeholder="Max Mustermann"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Handynummer</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                  placeholder="+49 123 456789"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Urlaubstage/Jahr</label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={formData.vacation_days}
                  onChange={(e) => setFormData({ ...formData, vacation_days: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                />
              </div>
            </div>

            {/* Zeile 2: Geburtstag, Dabei seit, Freier Tag, Aktiv + Bild */}
            <div className="grid grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Geburtstag</label>
                <input
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Dabei seit</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Freier Tag</label>
                <select
                  value={formData.free_day ?? ''}
                  onChange={(e) => setFormData({ ...formData, free_day: e.target.value === '' ? null : parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none cursor-pointer"
                >
                  <option value="">Keiner</option>
                  <option value="1">Montag</option>
                  <option value="2">Dienstag</option>
                  <option value="3">Mittwoch</option>
                  <option value="4">Donnerstag</option>
                  <option value="5">Freitag</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100">
                  <div className={`relative w-8 h-[18px] rounded-full transition-colors ${formData.active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <div className={`absolute top-[3px] w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${formData.active ? 'left-[14px]' : 'left-[3px]'}`} />
                    <input type="checkbox" checked={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} className="sr-only" />
                  </div>
                  <span className="text-xs text-slate-600">Aktiv</span>
                </label>
                <label className="flex-1 cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading} className="sr-only" />
                  <span className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium ${isUploading ? 'bg-slate-100 text-slate-400' : 'bg-gold text-black hover:bg-gold/90'}`}>
                    {isUploading ? (
                      <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    )}
                    Bild
                    {formData.image && <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                  </span>
                </label>
                {uploadError && <span className="text-xs text-red-500">{uploadError}</span>}
              </div>
            </div>
          </form>
        </div>

        {/* Bildvorschauen - kompakt nebeneinander */}
        {formData.image && (
          <div className="px-4 pb-3">
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-1.5 mb-2 text-xs text-slate-500">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Bildausschnitt anpassen (ziehen zum Verschieben)
              </div>
              <div className="grid grid-cols-2 gap-4">
                <ImagePreview format="square" label="Quadratisch (Buchungstool)" aspectClass="aspect-square w-full max-w-[160px] mx-auto" />
                <ImagePreview format="portrait" label="Hochformat (Website)" aspectClass="aspect-[3/4] w-full max-w-[120px] mx-auto" />
              </div>
            </div>
          </div>
        )}

        {/* Footer - kompakt */}
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
          to { opacity: 1; max-height: 800px; }
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
      <div className="flex-1 bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-200/50 overflow-hidden flex flex-col min-h-0">
        <div className="px-4 md:px-8 py-4 md:py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-9 h-9 md:w-10 md:h-10 bg-gold/10 rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Team</h3>
              <p className="text-xs text-slate-400 hidden md:block">{team.length} Mitarbeiter registriert</p>
            </div>
          </div>
          <button onClick={openCreateForm} className="flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 bg-gold text-black text-xs font-semibold rounded-xl hover:bg-gold/90 transition-colors shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden md:inline">Neues Mitglied</span>
            <span className="md:hidden">Neu</span>
          </button>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent flex-shrink-0" />

        <div className="flex-1 overflow-y-auto p-6">
          {team.length === 0 && !isCreating ? (
            <div className="py-12 text-center text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm">Noch keine Teammitglieder vorhanden</p>
            </div>
          ) : (
            <div>
              {isCreating && <div className="mb-4">{editFormContent}</div>}

              {/* Mobile: Karten-Layout */}
              <div className="md:hidden space-y-3">
                {team.map((member, index) => (
                  <div key={member.id} className={`bg-white rounded-xl border ${editingId === member.id ? 'border-gold/50 bg-gold/5' : 'border-slate-200'} overflow-hidden`}>
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Bild */}
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0">
                          {member.image ? (
                            <img src={member.image} alt={member.name} className="w-full h-full object-cover" style={{ transform: (() => { const pos = parsePosition(member.image_position || '50% 50%'); const s = member.image_scale || 1; return `scale(${s}) translate(${(50 - pos.x) * 0.5}%, ${(50 - pos.y) * 0.5}%)`; })() }} />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white font-bold text-lg">{member.name.charAt(0)}</div>
                          )}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-slate-900 truncate">{member.name}</h4>
                            <button onClick={() => handleToggleActive(member)} className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${member.active ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${member.active ? 'left-5' : 'left-0.5'}`} />
                            </button>
                          </div>
                          {member.phone && <p className="text-sm text-slate-500 mt-0.5">{member.phone}</p>}
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
                            {member.birthday && (
                              <span className={getDaysUntilBirthday(member.birthday).days === 0 ? 'text-amber-600 font-medium' : ''}>
                                🎂 {new Date(member.birthday).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                              </span>
                            )}
                            <span>🌴 {(member.vacation_days || 0) - (usedVacationDays[member.id] || 0)}/{member.vacation_days || 0}</span>
                            {member.free_day !== null && member.free_day !== undefined && (
                              <span>📅 {['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][member.free_day]} frei</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Aktionen */}
                      <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
                        <button onClick={() => handleMoveUp(index)} disabled={index === 0} className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <button onClick={() => handleMoveDown(index)} disabled={index === team.length - 1} className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        <div className="w-px h-5 bg-slate-200" />
                        <button onClick={() => openEditForm(member)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => setDeleteTarget(member)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                    {editingId === member.id && editFormContent}
                  </div>
                ))}
              </div>

              {/* Desktop: Tabellen-Layout */}
              <div className="hidden md:block overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Header-Zeile */}
                  <div className="grid grid-cols-[48px_1.5fr_1.2fr_1fr_0.8fr_1fr_0.6fr_60px_80px] gap-6 px-4 py-2 text-[11px] font-medium text-slate-400 border-b border-slate-100">
                    <div></div>
                    <div>Name</div>
                    <div>Telefon</div>
                    <div>Geburtstag</div>
                    <div>Urlaub</div>
                    <div>Dabei seit</div>
                    <div>Frei</div>
                    <div>Status</div>
                    <div></div>
                  </div>

                  {/* Team-Liste */}
                  <div className="divide-y divide-slate-50">
                  {team.map((member, index) => (
                    <div key={member.id}>
                      <div className={`grid grid-cols-[48px_1.5fr_1.2fr_1fr_0.8fr_1fr_0.6fr_60px_80px] gap-6 items-center px-4 py-3.5 transition-colors ${editingId === member.id ? 'bg-gold/5' : 'hover:bg-slate-50'}`}>
                        {/* Bild */}
                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0">
                          {member.image ? (
                            <img src={member.image} alt={member.name} className="w-full h-full object-cover" style={{ transform: (() => { const pos = parsePosition(member.image_position || '50% 50%'); const s = member.image_scale || 1; return `scale(${s}) translate(${(50 - pos.x) * 0.5}%, ${(50 - pos.y) * 0.5}%)`; })() }} />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white font-bold text-sm">{member.name.charAt(0)}</div>
                          )}
                        </div>
                        {/* Name */}
                        <div className="font-medium text-slate-900">{member.name}</div>
                        {/* Telefon */}
                        <div className="text-sm text-slate-600">{member.phone || '–'}</div>
                        {/* Geburtstag */}
                        <div className="text-sm">
                          {member.birthday ? (() => {
                            const { days, label } = getDaysUntilBirthday(member.birthday);
                            const isToday = days === 0;
                            const isClose = days <= 7;
                            return (
                              <div className="flex flex-col gap-0.5">
                                <span className={isToday ? 'text-amber-600 font-medium' : 'text-slate-700'}>
                                  {new Date(member.birthday).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                                </span>
                                <span className={`text-[10px] ${isToday ? 'text-amber-600' : isClose ? 'text-amber-500' : 'text-slate-400'}`}>
                                  {label}
                                </span>
                              </div>
                            );
                          })() : <span className="text-slate-400">–</span>}
                        </div>
                        {/* Urlaubstage */}
                        <div className="text-sm">
                          {(() => {
                            const total = member.vacation_days || 0;
                            const used = usedVacationDays[member.id] || 0;
                            const remaining = total - used;
                            return (
                              <span className={remaining < 5 ? 'text-amber-600 font-medium' : 'text-slate-700'}>
                                {remaining}<span className="text-slate-400">/{total}</span>
                              </span>
                            );
                          })()}
                        </div>
                        {/* Dabei seit */}
                        <div className="text-sm text-slate-600">
                          {member.start_date ? new Date(member.start_date).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }) : <span className="text-slate-400">–</span>}
                        </div>
                        {/* Freier Tag */}
                        <div className="text-sm text-slate-600">
                          {member.free_day !== null && member.free_day !== undefined ? (
                            ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][member.free_day]
                          ) : <span className="text-slate-400">–</span>}
                        </div>
                        {/* Status */}
                        <div>
                          <button onClick={() => handleToggleActive(member)} className={`relative w-11 h-6 rounded-full transition-colors ${member.active ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${member.active ? 'left-6' : 'left-1'}`} />
                          </button>
                        </div>
                        {/* Aktionen */}
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEditForm(member)} className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button onClick={() => setDeleteTarget(member)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                          <div className="flex flex-col">
                            <button onClick={() => handleMoveUp(index)} disabled={index === 0} className="p-0.5 text-slate-300 hover:text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                            </button>
                            <button onClick={() => handleMoveDown(index)} disabled={index === team.length - 1} className="p-0.5 text-slate-300 hover:text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      {editingId === member.id && editFormContent}
                    </div>
                  ))}
                </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Teammitglied löschen"
        message={`Möchten Sie "${deleteTarget?.name}" wirklich löschen?`}
        confirmLabel="Löschen"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
