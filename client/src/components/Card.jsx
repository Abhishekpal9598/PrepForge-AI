import React from 'react';

/**
 * Reusable Card Component for PrepForge AI
 */
export const Card = ({
  children,
  variant = 'standard',
  hover = false,
  className = '',
  ...props
}) => {
  const variantStyles = {
    standard: 'bg-dark-card border border-border-subtle shadow-sm',
    elevated: 'bg-dark-elevated border border-border-strong shadow-md',
  };

  const hoverStyles = hover
    ? 'transition-all duration-300 hover:border-border-strong hover:shadow-lg hover:-translate-y-0.5'
    : '';

  return (
    <div
      className={`rounded-2xl p-6 ${variantStyles[variant]} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
