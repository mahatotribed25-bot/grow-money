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
  const [fireworks, setFireworks] = useState<{ id: number; top: string; left: string; colors: string[]; isRocket?: boolean }[]>([]);
  const [visibleWords, setVisibleWords] = useState<number>(0);
  
  const fullText = "Happy Diwali from Grow Money Team".split(" ");

  // Word-by-word reveal animation
  useEffect(() => {
    if (visibleWords < fullText.length) {
      const timer = setTimeout(() => {
        setVisibleWords(prev => prev + 1);
      }, 500); // Reveal one word every 500ms
      return () => clearTimeout(timer);
    } else {
        // Reset and repeat after a delay
        const resetTimer = setTimeout(() => {
            setVisibleWords(0);
        }, 5000);
        return () => clearTimeout(resetTimer);
    }
  }, [visibleWords, fullText.length]);

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

  // Skyrocket Launch Logic - Spawns a group of 3-5 rockets
  const triggerRocketBurst = useCallback(() => {
    const burstId = Date.now();
    const rocketCount = 3 + Math.floor(Math.random() * 3); // Spawns 3 to 5 rockets
    const colorPalettes = [
        ['#facc15', '#ef4444', '#3b82f6'], // Gold, Red, Blue
        ['#fb923c', '#22c55e', '#ffffff'], // Orange, Green, White
        ['#ec4899', '#8b5cf6', '#06b6d4'], // Pink, Purple, Cyan
        ['#f59e0b', '#fbbf24', '#fef3c7']  // Multi-tone Gold
    ];

    const newRockets = Array.from({ length: rocketCount }).map((_, i) => {
        const id = burstId + i;
        const leftPos = `${10 + Math.random() * 80}%`;
        const targetTop = `${10 + Math.random() * 35}%`;
        const colors = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
        
        // Launch effect
        setTimeout(() => {
            setFireworks(prev => prev.map(f => f.id === id ? { ...f, isRocket: false } : f));
            // Blast duration
            setTimeout(() => {
                setFireworks(prev => prev.filter(f => f.id !== id));
            }, 1800);
        }, 1200);

        return { id, top: targetTop, left: leftPos, colors, isRocket: true };
    });

    setFireworks(prev => [...prev, ...newRockets]);
  }, []);

  useEffect(() => {
    const interval = setInterval(triggerRocketBurst, 2500);
    return () => clearInterval(interval);
  }, [triggerRocketBurst]);

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

      {/* Typing Greeting Message */}
      <div className="absolute top-28 left-1/2 -translate-x-1/2 text-center w-full px-4 flex flex-col items-center">
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 max-w-lg">
            {fullText.map((word, idx) => (
              <span 
                key={idx}
                className={cn(
                    "text-4xl md:text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-400 to-amber-600 drop-shadow-[0_0_20px_rgba(234,179,8,0.6)] leading-tight transition-all duration-500",
                    idx < visibleWords ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-90"
                )}
              >
                {word}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-center gap-3 mt-4 opacity-50">
              <div className="h-px w-16 bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />
              <Sparkles size={16} className="text-yellow-400 animate-spin duration-[5000ms]" />
              <div className="h-px w-16 bg-gradient-to-l from-transparent via-yellow-500 to-transparent" />
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
                    <div className="w-2 h-6 bg-gradient-to-t from-orange-600 via-yellow-400 to-white rounded-full animate-rocket-climb shadow-[0_0_20px_#f59e0b]">
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-1 h-20 bg-gradient-to-b from-yellow-400 via-orange-500/40 to-transparent blur-[2px]" />
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-4 h-12 bg-orange-500/10 blur-xl rounded-full" />
                    </div>
                </div>
            ) : (
                <FireworkBlast colors={fw.colors} />
            )}
        </div>
      ))}

      {/* Corner Diyas */}
      <div className="fixed top-24 left-6 z-[110] animate-side-wobble">
          <DiyaSVG />
      </div>
      <div className="fixed top-24 right-6 z-[110] animate-side-wobble" style={{ animationDelay: '1.5s' }}>
          <DiyaSVG />
      </div>
      
      {/* Hanging Lights */}
      <div className="fixed top-0 left-0 w-full flex justify-around opacity-40 pointer-events-none">
          {Array.from({length: 15}).map((_, i) => (
              <div key={i} className="h-20 w-4 bg-gradient-to-b from-amber-700 via-yellow-500/40 to-transparent rounded-full blur-lg animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
      </div>
    </>
  );
}

function FireworkBlast({ colors }: { colors: string[] }) {
    return (
        <div className="relative">
            {Array.from({ length: 32 }).map((_, i) => {
                const color = colors[i % colors.length];
                return (
                    <div 
                        key={i}
                        className="absolute w-1 h-20 rounded-full animate-firework-particle"
                        style={{ 
                            backgroundColor: color,
                            transform: `rotate(${i * 11.25}deg)`,
                            boxShadow: `0 0 15px ${color}`,
                            animationDelay: `${Math.random() * 0.1}s`,
                            opacity: 0
                        }}
                    />
                );
            })}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full blur-2xl animate-out fade-out duration-700" />
        </div>
    );
}

function DiyaSVG() {
    return (
        <div className="relative w-20 h-20">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
                <path d="M10 60C10 80 30 95 50 95C70 95 90 80 90 60H10Z" fill="url(#diya_body_complex)" stroke="#78350F" strokeWidth="0.5" />
                <path d="M50 5C50 5 30 35 30 55C30 68 38 75 50 75C62 75 70 68 70 55C70 35 50 5 50 5Z" fill="url(#flame_grad_complex)" className="animate-flicker origin-bottom" />
                <defs>
                    <linearGradient id="diya_body_complex" x1="50" y1="60" x2="50" y2="95" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#92400E" />
                        <stop offset="0.5" stopColor="#D97706" />
                        <stop offset="1" stopColor="#78350F" />
                    </linearGradient>
                    <radialGradient id="flame_grad_complex" cx="50" cy="55" r="35" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FFFFFF" />
                        <stop offset="0.2" stopColor="#FEF3C7" />
                        <stop offset="0.5" stopColor="#FBBF24" />
                        <stop offset="0.8" stopColor="#EA580C" />
                        <stop offset="1" stopColor="transparent" />
                    </radialGradient>
                </defs>
            </svg>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-20 bg-yellow-500/10 blur-3xl rounded-full animate-pulse" />
        </div>
    );
}