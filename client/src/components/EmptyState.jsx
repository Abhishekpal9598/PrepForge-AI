import React from 'react';
import { Card } from './Card';
import { Button } from './Button';

/**
 * Reusable EmptyState Component for PrepForge AI
 */
export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <Card className={`text-center py-12 px-6 max-w-lg mx-auto space-y-4 ${className}`}>
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-dark-elevated border border-border-subtle flex items-center justify-center text-brand-primary mx-auto shadow-inner">
          <Icon className="w-7 h-7" />
        </div>
      )}
      <div className="space-y-1.5">
        <h3 className="text-base font-bold text-text-primary">
          {title}
        </h3>
        {description && (
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actionLabel && onAction && (
        <div className="pt-2">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </Card>
  );
};
