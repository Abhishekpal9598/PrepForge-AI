import React, { forwardRef } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

/**
 * Reusable Select Dropdown for PrepForge AI
 * Adheres strictly to dark form tokens:
 * - Background: #1E293B
 * - Text: #F8FAFC
 * - Border: #334155
 * - Focus: #818CF8
 */
export const Select = forwardRef(({
  label,
  id,
  options = [],
  placeholder = 'Select an option',
  error,
  helperText,
  required = false,
  disabled = false,
  className = '',
  value,
  onChange,
  icon: Icon,
  ...props
}, ref) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          htmlFor={selectId}
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

        <select
          ref={ref}
          id={selectId}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full appearance-none rounded-xl bg-[#1E293B] border text-xs sm:text-sm text-[#F8FAFC] transition-all duration-200 outline-none
            ${Icon ? 'pl-10' : 'pl-3.5'}
            pr-10 py-2.5 cursor-pointer
            ${error
              ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/30'
              : 'border-[#334155] hover:border-[#475569] focus:border-[#818CF8] focus:ring-2 focus:ring-[#818CF8]/30'
            }
            disabled:bg-[#0F172A] disabled:text-[#64748B] disabled:border-[#1E293B] disabled:cursor-not-allowed
            ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="text-[#94A3B8]">
              {placeholder}
            </option>
          )}
          {options.map((opt) => {
            const isObj = typeof opt === 'object' && opt !== null;
            const val = isObj ? opt.value : opt;
            const lbl = isObj ? opt.label : opt;
            return (
              <option key={val} value={val} className="bg-[#1E293B] text-[#F8FAFC] py-1.5">
                {lbl}
              </option>
            );
          })}
        </select>

        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#94A3B8]">
          <ChevronDown className="w-4 h-4" />
        </div>
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

Select.displayName = 'Select';
export default Select;
