import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Reusable FormField Component for PrepForge AI
 */
export const FormField = ({
  label,
  id,
  required = false,
  error,
  helperText,
  children,
  className = '',
}) => {
  return (
    <div className={`space-y-1.5 text-left ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-[#E2E8F0] tracking-wide select-none"
        >
          {label} {required && <span className="text-[#F87171]">*</span>}
        </label>
      )}

      {children}

      {error ? (
        <p className="text-[11px] text-[#F87171] font-medium flex items-center gap-1.5 mt-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-[#94A3B8] mt-1">{helperText}</p>
      ) : null}
    </div>
  );
};

export default FormField;
