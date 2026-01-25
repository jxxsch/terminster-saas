'use client';

import { useEffect } from 'react';

interface UndoToastProps {
  visible: boolean;
  onUndo: () => void;
  onExpire: () => void;
  duration?: number; // in ms, default 5000
}

export function UndoToast({ visible, onUndo, onExpire, duration = 5000 }: UndoToastProps) {
  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      onExpire();
    }, duration);

    return () => clearTimeout(timer);
  }, [visible, duration, onExpire]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-white text-gray-700 px-4 py-2.5 rounded-full text-sm flex items-center gap-3 shadow-lg border border-gray-200">
        {/* Icon mit rotierendem Ring */}
        <div className="relative w-8 h-8 flex items-center justify-center">
          <div className="w-full h-full bg-amber-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          {/* Rotierender Countdown-Ring */}
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 32 32"
          >
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="#d4a853"
              strokeWidth="2"
              strokeDasharray="87.96"
              strokeDashoffset="0"
              strokeLinecap="round"
              style={{
                animation: `countdown-ring ${duration}ms linear forwards`,
              }}
            />
          </svg>
        </div>

        <span className="text-gray-600">Gelöscht</span>

        <button
          onClick={onUndo}
          className="text-gold font-semibold hover:text-amber-600 transition-colors pl-3 border-l border-gray-200"
        >
          Rückgängig
        </button>
      </div>

      <style jsx>{`
        @keyframes countdown-ring {
          from {
            stroke-dashoffset: 0;
          }
          to {
            stroke-dashoffset: 87.96;
          }
        }
      `}</style>
    </div>
  );
}
