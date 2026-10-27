import React from 'react';

/**
 * Reusable PageHeader Component for PrepForge AI
 */
export const PageHeader = ({
  title,
  subtitle,
  badgeText = 'Demo Preview',
  children,
  className = '',
}) => {
  return (
    <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-border-subtle ${className}`}>
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
            {title}
          </h1>
          {badgeText && (
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-primary/15 text-brand-primary border border-brand-primary/30">
              {badgeText}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-text-secondary max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>

      {children && (
        <div className="flex items-center gap-3 flex-wrap">
          {children}
        </div>
      )}
    </div>
  );
};
