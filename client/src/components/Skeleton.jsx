import React from 'react';

/**
 * Reusable Skeleton loader for cards, text, and components
 */
export const Skeleton = ({ className = '', count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-[#1E293B]/70 rounded-xl border border-white/[0.04] ${className}`}
        />
      ))}
    </>
  );
};

export default Skeleton;
