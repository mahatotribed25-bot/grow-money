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
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {theme === 'diwali' && <DiwaliVisuals />}
    </div>
  );
}

function DiwaliVisuals() {
  const [particles, setParticles] = useState<{ id: number; top: string; left: string; delay: string; size: number }[]>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      size: Math.random() * 4 + 2,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <>
      {/* Golden Particle Dust - Increased Visibility */}
      {particles.map((p) => (
        <div 
          key={p.id}
          className="absolute rounded-full bg-yellow-400 blur-[1px] animate-pulse shadow-[0_0_8px_rgba(250,204,21,0.8)]"
          style={{
            top: p.top,
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: p.delay,
            animationDuration: `${2 + Math.random() * 3}s`
          }}
        />
      ))}

      {/* Decorative Diyas in Corners - Adjusted Position and Glow */}
      <div className="fixed top-20 left-2 z-[110] animate-side-wobble drop-shadow-[0_0_30px_rgba(234,179,8,0.6)]">
          <DiyaSVG />
      </div>
      <div className="fixed top-20 right-2 z-[110] animate-side-wobble drop-shadow-[0_0_30px_rgba(234,179,8,0.6)]" style={{ animationDelay: '1.5s' }}>
          <DiyaSVG />
      </div>
      
      {/* Bottom Corner Diyas */}
      <div className="fixed bottom-20 left-2 z-[110] animate-side-wobble scale-75 opacity-80" style={{ animationDelay: '0.7s' }}>
          <DiyaSVG />
      </div>
      <div className="fixed bottom-20 right-2 z-[110] animate-side-wobble scale-75 opacity-80" style={{ animationDelay: '2.2s' }}>
          <DiyaSVG />
      </div>

      {/* Background Golden Glow Overlay */}
      <div className="fixed inset-0 bg-gradient-to-b from-yellow-500/10 via-transparent to-orange-500/10 pointer-events-none mix-blend-screen" />
      
      {/* Sparkle Bursts */}
      <div className="absolute top-[25%] left-[20%] h-2 w-2 bg-yellow-300 rounded-full animate-ping opacity-40" />
      <div className="absolute top-[45%] right-[15%] h-2 w-2 bg-orange-300 rounded-full animate-ping opacity-40 delay-700" />
      <div className="absolute bottom-[35%] left-[30%] h-2 w-2 bg-white rounded-full animate-ping opacity-30 delay-1000" />
    </>
  );
}

function DiyaSVG() {
    return (
        <div className="relative w-20 h-20">
            {/* The Diya Body */}
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M10 60C10 80 30 95 50 95C70 95 90 80 90 60H10Z" fill="url(#diya_body_complex)" />
                <path d="M50 10C50 10 32 35 32 55C32 65 40 72 50 72C60 72 68 65 68 55C68 35 50 10 50 10Z" fill="url(#flame_grad_complex)" className="animate-flicker origin-bottom" />
                
                <defs>
                    <linearGradient id="diya_body_complex" x1="50" y1="60" x2="50" y2="95" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#92400E" />
                        <stop offset="0.5" stopColor="#B45309" />
                        <stop offset="1" stopColor="#78350F" />
                    </linearGradient>
                    <radialGradient id="flame_grad_complex" cx="50" cy="55" r="30" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FFFBEB" />
                        <stop offset="0.2" stopColor="#FEF3C7" />
                        <stop offset="0.5" stopColor="#FBBF24" />
                        <stop offset="1" stopColor="#EA580C" />
                    </radialGradient>
                </defs>
            </svg>
            {/* Intense Flame Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-16 bg-yellow-500/30 blur-2xl rounded-full animate-pulse" />
        </div>
    );
}
