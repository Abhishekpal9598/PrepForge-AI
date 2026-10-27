import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Reusable LoadingState Component for PrepForge AI
 */
export const LoadingState = ({
  message = 'Loading PrepForge workspace...',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-16 space-y-4 ${className}`}>
      <div className="relative">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-primary/20 to-brand-secondary/20 flex items-center justify-center animate-pulse border border-brand-primary/30">
          <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
        </div>
      </div>
      <p className="text-xs font-medium text-text-secondary tracking-wide animate-pulse">
        {message}
      </p>
    </div>
  );
};
