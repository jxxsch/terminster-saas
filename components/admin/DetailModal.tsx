'use client';

import { ReactNode } from 'react';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

const maxWidthClasses = {
  sm: 'w-[384px]',
  md: 'w-[448px]',
  lg: 'w-[512px]',
  xl: 'w-[576px]',
  '2xl': 'w-[672px]',
  '3xl': 'w-[768px]',
  '4xl': 'w-[896px]',
};

export function DetailModal({
  isOpen,
  onClose,
  title,
  icon,
  children,
  footer,
  maxWidth = '2xl',
}: DetailModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className={`relative bg-white rounded-xl shadow-xl ${maxWidthClasses[maxWidth]} max-w-[calc(100vw-2rem)] max-h-[85vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            {icon && <span className="text-xl">{icon}</span>}
            <h2 className="text-lg font-medium text-black">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
