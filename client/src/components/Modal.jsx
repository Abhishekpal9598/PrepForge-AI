import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Card } from './Card';

/**
 * Reusable Modal Dialog for PrepForge AI
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
  className = '',
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#080B16]/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <Card
        className={`relative z-10 w-full ${maxWidth} bg-[#0D1220] border border-white/[0.12] shadow-2xl p-6 sm:p-8 space-y-5 rounded-3xl ${className}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 text-left">
            {title && (
              <h2 className="text-lg sm:text-xl font-bold text-[#F8FAFC]">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs sm:text-sm text-[#94A3B8]">
                {description}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] transition-colors focus:outline-none"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-left">
          {children}
        </div>
      </Card>
    </div>
  );
};

export default Modal;
