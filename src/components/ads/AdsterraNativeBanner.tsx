'use client';

import { useRef, useEffect } from 'react';

export function AdsterraNativeBanner() {
  const adContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ensure the script runs only once
    if (adContainerRef.current && adContainerRef.current.children.length === 0) {
      const scriptConfig = document.createElement('script');
      scriptConfig.innerHTML = `
        atOptions = {
          'key' : '27bc1190f2afeba8f384f5c9b7410c95',
          'format' : 'iframe',
          'height' : 90,
          'width' : 728,
          'params' : {}
        };
      `;
      
      const scriptInvoke = document.createElement('script');
      scriptInvoke.src = 'https://www.highperformanceformat.com/27bc1190f2afeba8f384f5c9b7410c95/invoke.js';
      
      adContainerRef.current.appendChild(scriptConfig);
      adContainerRef.current.appendChild(scriptInvoke);
    }
  }, []);

  return <div ref={adContainerRef} className="flex justify-center my-4"></div>;
}
