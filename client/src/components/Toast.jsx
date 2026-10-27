import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

/**
 * Reusable Toast Notification Banner for PrepForge AI
 */
export const Toast = ({
  type = 'info',
  title,
  message,
  onClose,
  className = '',
}) => {
  const configs = {
    success: {
      border: 'border-[#22C98B]/40',
      bg: 'bg-[#22C98B]/10',
      icon: CheckCircle2,
      iconColor: 'text-[#22C98B]',
      textColor: 'text-[#6EE7B7]',
    },
    error: {
      border: 'border-[#EF4444]/40',
      bg: 'bg-[#EF4444]/10',
      icon: AlertCircle,
      iconColor: 'text-[#EF4444]',
      textColor: 'text-[#FCA5A5]',
    },
    warning: {
      border: 'border-[#F5B942]/40',
      bg: 'bg-[#F5B942]/10',
      icon: AlertCircle,
      iconColor: 'text-[#F5B942]',
      textColor: 'text-[#FCD34D]',
    },
    info: {
      border: 'border-[#7657FF]/40',
      bg: 'bg-[#7657FF]/10',
      icon: Info,
      iconColor: 'text-[#7657FF]',
      textColor: 'text-[#B49DFF]',
    },
  };

  const current = configs[type] || configs.info;
  const Icon = current.icon;

  return (
    <div
      className={`rounded-2xl border p-4 backdrop-blur-xl shadow-xl flex items-start gap-3 text-left ${current.bg} ${current.border} ${className}`}
      role="alert"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${current.iconColor}`} />

      <div className="flex-1 space-y-0.5">
        {title && (
          <h4 className={`text-xs font-bold ${current.textColor}`}>
            {title}
          </h4>
        )}
        {message && (
          <p className="text-xs text-[#CBD5E1] leading-relaxed">
            {message}
          </p>
        )}
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="text-[#94A3B8] hover:text-[#F8FAFC] p-1 rounded-lg transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default Toast;
