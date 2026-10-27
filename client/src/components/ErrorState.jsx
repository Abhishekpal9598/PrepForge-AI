import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

/**
 * Reusable ErrorState component for displaying operational errors with a retry action
 */
export const ErrorState = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this section.',
  onRetry,
  className = '',
}) => {
  return (
    <Card className={`text-center p-8 sm:p-12 space-y-4 max-w-lg mx-auto bg-[#0D1220]/90 border border-[#EF4444]/30 ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/30 flex items-center justify-center mx-auto text-[#F87171]">
        <AlertCircle className="w-6 h-6" />
      </div>

      <div className="space-y-1">
        <h3 className="text-base sm:text-lg font-bold text-[#F8FAFC]">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-[#94A3B8] max-w-sm mx-auto leading-relaxed">
          {message}
        </p>
      </div>

      {onRetry && (
        <div className="pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            leftIcon={RefreshCw}
            className="hover:border-[#EF4444]/50"
          >
            Try Again
          </Button>
        </div>
      )}
    </Card>
  );
};

export default ErrorState;
