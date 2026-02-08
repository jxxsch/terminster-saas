'use client';

import { useState, useRef, useEffect } from 'react';
import {
  StaffTimeOff,
  deleteStaffTimeOff,
  updateStaffTimeOff,
  createStaffTimeOff,
} from '@/lib/supabase';

// Helper: Vorherigen 30-Minuten-Slot berechnen
function prevSlot(time: string): string | null {
  const [h, m] = time.split(':').map(Number);
  if (m === 30) return `${String(h).padStart(2, '0')}:00`;
  if (h === 0) return null;
  return `${String(h - 1).padStart(2, '0')}:30`;
}

// Helper: Nächsten 30-Minuten-Slot berechnen
function nextSlot(time: string): string {
  const [h, m] = time.split(':').map(Number);
  if (m === 0) return `${String(h).padStart(2, '0')}:30`;
  return `${String(h + 1).padStart(2, '0')}:00`;
}

interface BlockedSlotProps {
  block: StaffTimeOff;
  slotTime: string;
  isPast: boolean;
  onBlockChanged: () => void;
}

export function BlockedSlot({ block, slotTime, isPast, onBlockChanged }: BlockedSlotProps) {
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState<'bottom' | 'top'>('bottom');
  const [isProcessing, setIsProcessing] = useState(false);
  const slotRef = useRef<HTMLDivElement>(null);

  const isFirstSlot = slotTime === block.start_time;
  const isLastSlot = slotTime === block.end_time;
  const isSingleSlot = block.start_time === block.end_time;

  // Popup-Position berechnen (synchron beim Öffnen)
  const calculatePosition = () => {
    if (slotRef.current) {
      const rect = slotRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top - 80;
      const POPUP_HEIGHT = 220;
      setPopupPosition(spaceBelow < POPUP_HEIGHT && spaceAbove > spaceBelow ? 'top' : 'bottom');
    }
  };

  // Klick außerhalb schließt Popup
  useEffect(() => {
    if (!showPopup) return;
    const handler = (e: MouseEvent) => {
      if (slotRef.current && !slotRef.current.contains(e.target as Node)) {
        setShowPopup(false);
      }
    };
    // Delay um zu verhindern dass der öffnende Klick das Popup sofort schließt
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [showPopup]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPast) return;
    if (!showPopup) calculatePosition();
    setShowPopup(!showPopup);
  };

  // 1. Komplette Blockierung löschen
  const handleDeleteAll = async () => {
    setIsProcessing(true);
    await deleteStaffTimeOff(block.id);
    setShowPopup(false);
    setIsProcessing(false);
    onBlockChanged();
  };

  // 2. Ab hier freigeben (Endzeit auf vorherigen Slot setzen)
  const handleFreeFromHere = async () => {
    setIsProcessing(true);
    if (isFirstSlot) {
      // Erster Slot geklickt → gesamte Blockierung löschen
      await deleteStaffTimeOff(block.id);
    } else {
      const prev = prevSlot(slotTime);
      if (prev && prev >= (block.start_time || '')) {
        await updateStaffTimeOff(block.id, { end_time: prev });
      } else {
        await deleteStaffTimeOff(block.id);
      }
    }
    setShowPopup(false);
    setIsProcessing(false);
    onBlockChanged();
  };

  // 3. Nur diesen Slot freigeben (Blockierung aufteilen)
  const handleFreeThisSlot = async () => {
    setIsProcessing(true);

    if (isSingleSlot) {
      // Nur 1 Slot → komplett löschen
      await deleteStaffTimeOff(block.id);
    } else if (isFirstSlot) {
      // Erster Slot → Startzeit auf nächsten Slot setzen
      await updateStaffTimeOff(block.id, { start_time: nextSlot(slotTime) });
    } else if (isLastSlot) {
      // Letzter Slot → Endzeit auf vorherigen Slot setzen
      const prev = prevSlot(slotTime);
      if (prev) {
        await updateStaffTimeOff(block.id, { end_time: prev });
      }
    } else {
      // Mitte → Aufteilen: Original kürzen + neuen Block erstellen
      const prev = prevSlot(slotTime);
      const next = nextSlot(slotTime);
      if (prev) {
        // Original: start_time bis prev
        await updateStaffTimeOff(block.id, { end_time: prev });
      }
      // Neuer Block: next bis end_time
      await createStaffTimeOff({
        staff_id: block.staff_id,
        start_date: block.start_date,
        end_date: block.end_date,
        reason: block.reason,
        start_time: next,
        end_time: block.end_time,
      });
    }

    setShowPopup(false);
    setIsProcessing(false);
    onBlockChanged();
  };

  return (
    <div ref={slotRef} className="relative p-1 h-full transition-colors select-none bg-gray-200 hover:bg-gray-300">
      <div
        className={`flex items-center justify-between gap-1 h-full pl-1 ${!isPast ? 'cursor-pointer' : ''}`}
        onClick={handleClick}
      >
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-medium text-gray-600 truncate block select-none">
            {block.reason || 'Blockiert'}
          </span>
        </div>
        {!isPast && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!showPopup) calculatePosition();
              setShowPopup(!showPopup);
            }}
            className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded border border-red-300 bg-red-50 hover:bg-red-100 transition-colors"
            title="Blockierung bearbeiten"
          >
            <svg className="w-2.5 h-2.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Popup */}
      {showPopup && (
        <div
          className={`absolute z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 ${
            popupPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          style={{ left: '50%', transform: 'translateX(-50%)', width: '240px' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-900 block">{block.reason || 'Blockiert'}</span>
              <span className="text-[10px] text-gray-500">{block.start_time} – {block.end_time} Uhr</span>
            </div>
          </div>

          {/* Optionen */}
          <div className="flex flex-col gap-1.5">
            {/* Nur diesen Slot freigeben */}
            {!isSingleSlot && (
              <button
                onClick={handleFreeThisSlot}
                disabled={isProcessing}
                className="w-full py-2 px-3 text-xs font-medium text-left text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Nur {slotTime} Uhr freigeben
              </button>
            )}

            {/* Ab hier freigeben */}
            {!isSingleSlot && !isFirstSlot && (
              <button
                onClick={handleFreeFromHere}
                disabled={isProcessing}
                className="w-full py-2 px-3 text-xs font-medium text-left text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Ab {slotTime} Uhr freigeben
              </button>
            )}

            {/* Komplette Blockierung löschen */}
            <button
              onClick={handleDeleteAll}
              disabled={isProcessing}
              className="w-full py-2 px-3 text-xs font-medium text-left text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {isSingleSlot ? 'Blockierung löschen' : 'Gesamte Blockierung löschen'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
