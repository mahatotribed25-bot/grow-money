'use client';

import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

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
  const [fireworks, setFireworks] = useState<{ id: number; top: string; left: string; color: string; isRocket?: boolean }[]>([]);

  // Create golden dust
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

  // Skyrocket Launch Logic
  const triggerRocket = useCallback(() => {
    const id = Date.now();
    const colors = ['#facc15', '#fbbf24', '#f59e0b', '#fb923c', '#ffffff', '#ef4444', '#3b82f6'];
    const leftPos = `${10 + Math.random() * 80}%`;
    const targetTop = `${15 + Math.random() * 40}%`;
    const color = colors[Math.floor(Math.random() * colors.length)];

    // Phase 1: Launch Rocket
    setFireworks(prev => [...prev, { id, top: targetTop, left: leftPos, color, isRocket: true }]);

    // Phase 2: Explode after launch animation (1s)
    setTimeout(() => {
      setFireworks(prev => prev.map(f => f.id === id ? { ...f, isRocket: false } : f));
      
      // Phase 3: Cleanup after explosion (1.5s)
      setTimeout(() => {
        setFireworks(prev => prev.filter(f => f.id !== id));
      }, 1500);
    }, 1000);
  }, []);

  useEffect(() => {
    const interval = setInterval(triggerRocket, 2500); // Trigger every 2.5s
    return () => clearInterval(interval);
  }, [triggerRocket]);

  return (
    <>
      {/* Golden Particle Dust */}
      {particles.map((p) => (
        <div 
          key={p.id}
          className="absolute rounded-full bg-yellow-400/60 blur-[1px] animate-pulse"
          style={{
            top: p.top,
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: p.delay,
            animationDuration: `${3 + Math.random() * 2}s`
          }}
        />
      ))}

      {/* Center Happy Diwali Greeting */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 text-center animate-in fade-in zoom-in duration-1000">
          <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-500 to-amber-700 drop-shadow-[0_0_20px_rgba(234,179,8,0.6)]">
            Happy Diwali
          </h2>
          <div className="flex items-center justify-center gap-2 mt-1">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-yellow-500" />
              <Sparkles size={14} className="text-yellow-400 animate-spin duration-[4000ms]" />
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-yellow-500" />
          </div>
      </div>

      {/* Rockets and Fireworks */}
      {fireworks.map(fw => (
        <div 
          key={fw.id} 
          className="absolute w-4 h-4" 
          style={{ top: fw.top, left: fw.left }}
        >
            {fw.isRocket ? (
                <div className="relative">
                    {/* The Rocket Node */}
                    <div className="w-1.5 h-4 bg-gradient-to-t from-orange-500 to-yellow-200 rounded-full animate-rocket-launch shadow-[0_0_15px_#f59e0b]">
                        {/* Rocket Trail/Tail */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-12 bg-gradient-to-b from-yellow-500 to-transparent blur-[1px]" />
                    </div>
                </div>
            ) : (
                <FireworkBlast color={fw.color} />
            )}
        </div>
      ))}

      {/* Corner Diyas */}
      <div className="fixed top-20 left-4 z-[110] animate-side-wobble">
          <DiyaSVG />
      </div>
      <div className="fixed top-20 right-4 z-[110] animate-side-wobble" style={{ animationDelay: '1.5s' }}>
          <DiyaSVG />
      </div>
      
      {/* Hanging Toran/Lights at top */}
      <div className="fixed top-0 left-0 w-full flex justify-around opacity-40 pointer-events-none">
          {Array.from({length: 12}).map((_, i) => (
              <div key={i} className="h-16 w-4 bg-gradient-to-b from-yellow-600 via-yellow-500/50 to-transparent rounded-full blur-md animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
      </div>

      {/* Background Glow Overlay */}
      <div className="fixed inset-0 bg-gradient-to-b from-yellow-500/5 via-transparent to-orange-500/5 pointer-events-none mix-blend-screen" />
    </>
  );
}

function FireworkBlast({ color }: { color: string }) {
    return (
        <div className="relative">
            {Array.from({ length: 16 }).map((_, i) => (
                <div 
                    key={i}
                    className="absolute w-1 h-12 rounded-full animate-firework-particle"
                    style={{ 
                        backgroundColor: color,
                        transform: `rotate(${i * 22.5}deg)`,
                        boxShadow: `0 0 12px ${color}`,
                        animationDelay: `${Math.random() * 0.1}s`
                    }}
                />
            ))}
        </div>
    );
}

function DiyaSVG() {
    return (
        <div className="relative w-16 h-16 md:w-20 md:h-20">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
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
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-16 bg-yellow-500/20 blur-2xl rounded-full animate-pulse" />
        </div>
    );
}
