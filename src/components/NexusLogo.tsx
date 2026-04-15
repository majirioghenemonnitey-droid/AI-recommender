import React from 'react';

export const NexusLogo = ({ className = "w-8 h-8" }: { className?: string }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* Left Path */}
      <path 
        d="M30 80L50 20" 
        stroke="currentColor" 
        strokeWidth="16" 
        strokeLinecap="round"
        className="text-nexus-navy"
      />
      {/* Right Path */}
      <path 
        d="M70 80L50 20" 
        stroke="currentColor" 
        strokeWidth="16" 
        strokeLinecap="round"
        className="text-nexus-cobalt"
      />
      {/* Overlap / Crossbar */}
      <path 
        d="M38 55H62" 
        stroke="currentColor" 
        strokeWidth="12" 
        strokeLinecap="round"
        className="text-nexus-cobalt opacity-80"
      />
    </svg>
  );
};

export const NexusIcon = ({ className = "w-6 h-6" }: { className?: string }) => {
  return (
    <div className={`bg-nexus-navy rounded-lg flex items-center justify-center ${className}`}>
      <NexusLogo className="w-2/3 h-2/3 text-white" />
    </div>
  );
};
