import React from 'react';

/**
 * Reusable Badge Component for PrepForge AI
 */
export const Badge = ({
  children,
  variant = 'brand',
  size = 'sm',
  className = '',
  icon: Icon,
}) => {
  const sizeStyles = {
    xs: 'text-[10px] px-2 py-0.5 gap-1',
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-sm px-3 py-1.5 gap-1.5',
  };

  const variantStyles = {
    brand: 'bg-[#7657FF]/15 text-[#B49DFF] border border-[#7657FF]/30',
    blue: 'bg-[#3985FF]/15 text-[#93C5FD] border border-[#3985FF]/30',
    success: 'bg-[#22C98B]/15 text-[#6EE7B7] border border-[#22C98B]/30',
    warning: 'bg-[#F5B942]/15 text-[#FCD34D] border border-[#F5B942]/30',
    error: 'bg-[#EF4444]/15 text-[#FCA5A5] border border-[#EF4444]/30',
    neutral: 'bg-[#1E293B] text-[#94A3B8] border border-[#334155]',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {Icon && <Icon className="w-3 h-3 flex-shrink-0" />}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
