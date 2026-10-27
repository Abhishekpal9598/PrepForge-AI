import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Reusable Input Component for PrepForge AI
 * Strictly enforces dark theme input styling tokens:
 * - Background: #1E293B
 * - Text: #F8FAFC
 * - Placeholder: #94A3B8
 * - Border: #334155
 * - Focus: #818CF8
 */
export const Input = forwardRef(({
  label,
  id,
  type = 'text',
  error,
  helperText,
  icon: Icon,
  rightElement,
  className = '',
  required = false,
  disabled = false,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-[#E2E8F0] tracking-wide select-none"
        >
          {label} {required && <span className="text-[#F87171]">*</span>}
        </label>
      )}

      <div className="relative rounded-xl shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          className={`w-full rounded-xl bg-[#1E293B] border text-xs sm:text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] transition-all duration-200 outline-none
            ${Icon ? 'pl-10' : 'pl-3.5'}
            ${rightElement ? 'pr-11' : 'pr-3.5'}
            py-2.5
            ${error
              ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/30'
              : 'border-[#334155] hover:border-[#475569] focus:border-[#818CF8] focus:ring-2 focus:ring-[#818CF8]/30'
            }
            disabled:bg-[#0F172A] disabled:text-[#64748B] disabled:border-[#1E293B] disabled:cursor-not-allowed
            ${className}`}
          {...props}
        />

        {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>

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
});

Input.displayName = 'Input';
export default Input;
