import React, { forwardRef } from 'react';
import { Check } from 'lucide-react';

/**
 * Reusable Checkbox Component for PrepForge AI
 */
export const Checkbox = forwardRef(({
  id,
  label,
  checked,
  onChange,
  disabled = false,
  error,
  className = '',
  ...props
}, ref) => {
  const checkboxId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`space-y-1 text-left ${className}`}>
      <label
        htmlFor={checkboxId}
        className={`flex items-start gap-2.5 cursor-pointer select-none group ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="sr-only peer"
            {...props}
          />
          <div className={`w-4 h-4 rounded border transition-all duration-150 flex items-center justify-center
            ${checked 
              ? 'bg-[#7657FF] border-[#7657FF] shadow-sm shadow-[#7657FF]/40' 
              : 'bg-[#1E293B] border-[#334155] group-hover:border-[#818CF8]'
            }
            ${error ? 'border-[#EF4444]' : ''}
            peer-focus-visible:ring-2 peer-focus-visible:ring-[#818CF8] peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-[#080B16]`}
          >
            {checked && <Check className="w-3 h-3 text-white stroke-[3]" />}
          </div>
        </div>

        {label && (
          <span className="text-xs text-[#CBD5E1] group-hover:text-[#F8FAFC] leading-tight transition-colors">
            {label}
          </span>
        )}
      </label>

      {error && (
        <p className="text-[11px] text-[#F87171] font-medium pl-6">
          {error}
        </p>
      )}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';
export default Checkbox;
