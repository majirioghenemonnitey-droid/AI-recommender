import React, { useEffect, useRef } from 'react';

interface SerlzoFormProps {
  formId: string;
}

export function SerlzoForm({ formId }: SerlzoFormProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // We only want to inject the script once into this container
    if (containerRef.current && !containerRef.current.querySelector('script')) {
      const script = document.createElement('script');
      script.src = "https://cdn.serlzo.com/public/formv2/htmlform/htmlform.min.js";
      script.async = true;
      script.setAttribute('serlzo-form-id', formId);
      
      // Clear the loading message before injecting
      containerRef.current.innerHTML = '';
      
      // The Serlzo script expects a div with this specific ID to exist in the DOM
      // Since we are using React, we must ensure it's there
      const formTarget = document.createElement('div');
      formTarget.id = 'serlzo-form-container';
      containerRef.current.appendChild(formTarget);
      containerRef.current.appendChild(script);
    }
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
