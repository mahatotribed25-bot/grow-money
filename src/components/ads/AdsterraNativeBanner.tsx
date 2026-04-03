'use client';

import { useRef, useEffect } from 'react';

export function AdsterraNativeBanner() {
  const adContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ensure the script runs only once
    if (adContainerRef.current && adContainerRef.current.children.length === 0) {
      const script = document.createElement('script');
      script.src = 'https://pl29052938.profitablecpmratenetwork.com/4c/16/d4/4c16d4d350b2c75008c35b695c6a9130.js';
      script.async = true;
      adContainerRef.current.appendChild(script);
    }
  }, []);

  return <div ref={adContainerRef} className="flex justify-center my-4"></div>;
}
