import React from 'react';

/**
 * PrepForge AI - Official Brand Logo Component (Exact Match to Design Reference Sheet)
 */
export const BrandLogo = ({
  size = 'md',
  showText = true,
  className = '',
  textColor = 'text-white',
  theme = 'dark',
}) => {
  const sizeMap = {
    sm: { icon: 28, text: 'text-base' },
    md: { icon: 36, text: 'text-xl' },
    lg: { icon: 44, text: 'text-2xl' },
    xl: { icon: 54, text: 'text-3xl' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const isLight = theme === 'light';

  const LogoIcon = (
    <svg
      width={currentSize.icon}
      height={currentSize.icon}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0 transition-transform duration-300 group-hover:scale-105"
      aria-label="PrepForge AI Mark"
    >
      <defs>
        <linearGradient id="prepforge-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7657FF" />
          <stop offset="100%" stopColor="#3985FF" />
        </linearGradient>
      </defs>

      {/* Rounded Squircle Container */}
      <rect
        x="2"
        y="2"
        width="40"
        height="40"
        rx="12"
        fill={isLight ? '#FFFFFF' : 'url(#prepforge-bg-grad)'}
        stroke={isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)'}
        strokeWidth="1"
      />

      {/* Letter 'P' Stem */}
      <rect
        x="12"
        y="12"
        width="5"
        height="20"
        rx="2.5"
        fill={isLight ? '#7657FF' : '#FFFFFF'}
      />

      {/* Letter 'P' Loop */}
      <path
        d="M14.5 14.5H23C26.5899 14.5 29.5 17.4101 29.5 21C29.5 24.5899 26.5899 27.5 23 27.5H14.5"
        stroke={isLight ? '#7657FF' : '#FFFFFF'}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Spark Diamond */}
      <path
        d="M32 9.5L33.2 12.8L36.5 14L33.2 15.2L32 18.5L30.8 15.2L27.5 14L30.8 12.8L32 9.5Z"
        fill={isLight ? '#3985FF' : '#FFFFFF'}
      />
    </svg>
  );

  return (
    <div className={`inline-flex items-center gap-2.5 font-bold tracking-tight select-none ${className}`}>
      {LogoIcon}
      {showText && (
        <span className={`flex items-center tracking-tight leading-none ${currentSize.text} ${textColor}`}>
          <span>PrepForge</span>
          <span className="ml-1.5 brand-gradient-text font-black">
            AI
          </span>
        </span>
      )}
    </div>
  );
};
