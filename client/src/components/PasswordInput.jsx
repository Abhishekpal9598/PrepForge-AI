import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff, Lock, Check, X } from 'lucide-react';
import { Input } from './Input';

/**
 * Reusable PasswordInput with show/hide toggle and optional strength meter.
 */
export const PasswordInput = forwardRef(({
  label = 'Password',
  value,
  onChange,
  showStrength = false,
  error,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  // Compute strength requirements
  const passwordStr = typeof value === 'string' ? value : '';
  const requirements = [
    { label: 'At least 8 characters', met: passwordStr.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(passwordStr) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(passwordStr) },
    { label: 'Contains a number (0-9)', met: /[0-9]/.test(passwordStr) },
    { label: 'Contains special symbol (!@#$...)', met: /[^A-Za-z0-9]/.test(passwordStr) },
  ];

  const metCount = requirements.filter(r => r.met).length;
  
  const getStrengthMeta = () => {
    if (!passwordStr) return { label: 'Empty', color: 'bg-border-subtle', percent: '0%' };
    if (metCount <= 2) return { label: 'Weak', color: 'bg-status-error', percent: '33%' };
    if (metCount <= 4) return { label: 'Medium', color: 'bg-status-warning', percent: '66%' };
    return { label: 'Strong', color: 'bg-status-success', percent: '100%' };
  };

  const strength = getStrengthMeta();

  return (
    <div className="space-y-2">
      <Input
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        label={label}
        value={value}
        onChange={onChange}
        icon={Lock}
        error={error}
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword(prev => !prev)}
            className="text-text-secondary hover:text-text-primary p-1 rounded-md transition-colors focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
        {...props}
      />

      {showStrength && passwordStr.length > 0 && (
        <div className="space-y-2 pt-1 text-xs">
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[11px] text-text-secondary">
              <span>Password Strength</span>
              <span className="font-semibold text-text-primary">{strength.label}</span>
            </div>
            <div className="w-full h-1.5 bg-dark-sidebar rounded-full overflow-hidden border border-border-subtle">
              <div
                className={`h-full transition-all duration-300 ${strength.color}`}
                style={{ width: strength.percent }}
              />
            </div>
          </div>

          {/* Criteria Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-text-secondary pt-1">
            {requirements.map((req, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                {req.met ? (
                  <Check className="w-3 h-3 text-status-success flex-shrink-0" />
                ) : (
                  <X className="w-3 h-3 text-text-secondary/50 flex-shrink-0" />
                )}
                <span className={req.met ? 'text-text-primary' : 'text-text-secondary/70'}>
                  {req.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';
