import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Reusable Dropdown Component for PrepForge AI
 */
export const Dropdown = ({
  trigger,
  items = [],
  align = 'right',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <div onClick={() => setIsOpen(prev => !prev)}>
        {trigger}
      </div>

      {isOpen && (
        <div
          className={`absolute z-40 mt-2 w-52 rounded-2xl bg-[#0D1220] border border-white/[0.12] shadow-2xl p-1.5 space-y-1 focus:outline-none animate-fadeIn ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (item.onClick) item.onClick();
                setIsOpen(false);
              }}
              disabled={item.disabled}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors ${
                item.danger
                  ? 'text-[#F87171] hover:bg-[#EF4444]/15'
                  : 'text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#1E293B]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {item.icon && <item.icon className="w-4 h-4 flex-shrink-0" />}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
