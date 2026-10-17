'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type FestiveVisualsProps = {
  theme?: 'none' | 'diwali';
};

export function FestiveVisuals({ theme = 'none' }: FestiveVisualsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || theme === 'none') return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden overflow-x-hidden">
      {theme === 'diwali' && <DiwaliVisuals />}
    </div>
  );
}

function DiwaliVisuals() {
  const [particles, setParticles] = useState<{ id: number; top: string; left: string; delay: string; size: number }[]>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      size: Math.random() * 3 + 1,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <>
      {/* Golden Particle Dust */}
      {particles.map((p) => (
        <div 
          key={p.id}
          className="absolute rounded-full bg-yellow-500/40 blur-[1px] animate-pulse"
          style={{
            top: p.top,
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: p.delay,
            animationDuration: `${3 + Math.random() * 4}s`
          }}
        />
      ))}

      {/* Decorative Diyas in Corners */}
      <div className="absolute top-16 left-4 z-10 animate-side-wobble">
          <DiyaSVG />
      </div>
      <div className="absolute top-16 right-4 z-10 animate-side-wobble" style={{ animationDelay: '1.5s' }}>
          <DiyaSVG />
      </div>

      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-yellow-500/5 via-transparent to-orange-500/5 pointer-events-none" />
      
      {/* Cracker Bursts (Subtle) */}
      <div className="absolute top-[20%] left-[15%] h-1 w-1 bg-yellow-400 rounded-full animate-ping opacity-20" />
      <div className="absolute top-[40%] right-[20%] h-1 w-1 bg-orange-400 rounded-full animate-ping opacity-20 delay-1000" />
      <div className="absolute bottom-[30%] left-[40%] h-1 w-1 bg-white rounded-full animate-ping opacity-20 delay-500" />
    </>
  );
}

function DiyaSVG() {
    return (
        <div className="relative w-16 h-16 drop-shadow-[0_10px_20px_rgba(234,179,8,0.4)]">
            {/* The Diya Body */}
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M10 60C10 80 30 95 50 95C70 95 90 80 90 60H10Z" fill="url(#diya_body)" />
                <path d="M50 15C50 15 35 40 35 55C35 63.3 41.7 70 50 70C58.3 70 65 63.3 65 55C65 40 50 15 50 15Z" fill="url(#flame_grad)" className="animate-flicker origin-bottom" />
                
                <defs>
                    <linearGradient id="diya_body" x1="50" y1="60" x2="50" y2="95" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#92400E" />
                        <stop offset="1" stopColor="#78350F" />
                    </linearGradient>
                    <radialGradient id="flame_grad" cx="50" cy="55" r="25" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FEF3C7" />
                        <stop offset="0.4" stopColor="#FBBF24" />
                        <stop offset="1" stopColor="#EA580C" />
                    </radialGradient>
                </defs>
            </svg>
            {/* Flame Glow */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-12 bg-yellow-500/20 blur-xl rounded-full animate-pulse" />
        </div>
    );
}
