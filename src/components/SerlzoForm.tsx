import React, { useEffect, useRef } from 'react';

interface SerlzoFormProps {
  formId: string;
}

export function SerlzoForm({ formId }: SerlzoFormProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous content
    container.innerHTML = '';
    
    // Create the target div that the Serlzo script specifically looks for
    const formTarget = document.createElement('div');
    formTarget.id = 'serlzo-form-container';
    container.appendChild(formTarget);

    // Create and inject the script
    const script = document.createElement('script');
    script.src = "https://cdn.serlzo.com/public/formv2/htmlform/htmlform.min.js";
    script.async = true;
    script.setAttribute('serlzo-form-id', formId);
    container.appendChild(script);

    return () => {
      // Cleanup cleanup: remove the script if the component unmounts
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [formId]);

  return (
    <div className="w-full bg-white rounded-2xl border border-nexus-silver p-4 sm:p-6 shadow-sm overflow-hidden min-h-[400px]">
      <div ref={containerRef} className="w-full">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-8 h-8 border-4 border-nexus-silver border-t-nexus-cobalt rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-gray-500 text-sm">Initializing Serlzo Form...</p>
        </div>
      </div>
    </div>
  );
}
