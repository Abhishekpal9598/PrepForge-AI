import React from 'react';
import { Card } from './Card';

/**
 * Reusable StatCard Component for PrepForge AI
 */
export const StatCard = ({
  label,
  value,
  subtext,
  icon: Icon,
  trend,
  trendPositive = true,
  isDemo = true,
  className = '',
}) => {
  return (
    <Card hover className={`relative overflow-hidden space-y-3 ${className}`}>
      {/* Header with Icon and Demo Tag */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          {label}
        </span>
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-dark-elevated border border-border-subtle flex items-center justify-center text-brand-primary">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Main Value and Trend */}
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-3xl font-extrabold text-text-primary tracking-tight">
          {value}
        </div>
        {trend && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
              trendPositive
                ? 'bg-status-success/15 text-status-success border border-status-success/30'
                : 'bg-status-error/15 text-status-error border border-status-error/30'
            }`}
          >
            {trend}
          </span>
        )}
      </div>

      {/* Footer / Subtext and Demo Badge */}
      <div className="flex items-center justify-between text-xs text-text-secondary pt-1 border-t border-border-subtle/50">
        <p className="truncate">{subtext || 'Based on recent performance'}</p>
        {isDemo && (
          <span className="text-[10px] font-medium text-text-secondary/70 bg-dark-sidebar px-1.5 py-0.5 rounded border border-border-subtle/60 flex-shrink-0">
            Demo Data
          </span>
        )}
      </div>
    </Card>
  );
};
