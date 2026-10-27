import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Reusable Button Component for PrepForge AI
 */
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className = '',
  type = 'button',
  onClick,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5',
  };

  const variantStyles = {
    primary: 'brand-gradient text-white hover:opacity-95 shadow-lg shadow-brand-primary/30 border border-white/10 active:scale-[0.98]',
    secondary: 'bg-dark-elevated text-text-primary hover:bg-[#1f2c49] border border-border-subtle active:scale-[0.98]',
    outline: 'bg-transparent text-text-primary border border-border-subtle hover:border-brand-primary/60 hover:bg-dark-card active:scale-[0.98]',
    ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-dark-elevated/60 active:scale-[0.98]',
    danger: 'bg-status-error/15 text-status-error border border-status-error/30 hover:bg-status-error/25 active:scale-[0.98]',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        LeftIcon && <LeftIcon className="w-4 h-4 flex-shrink-0" />
      )}
      <span>{children}</span>
      {!isLoading && RightIcon && <RightIcon className="w-4 h-4 flex-shrink-0" />}
    </button>
  );
};
