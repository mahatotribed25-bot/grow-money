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
        }, 6000);
        return () => clearTimeout(resetTimer);
    }
  }, [visibleWords, fullText.length]);

  // Create golden dust background
  useEffect(() => {
    const newParticles = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      size: Math.random() * 2 + 1,
    }));
    setParticles(newParticles);
  }, []);

  // Skyrocket Launch Logic - Spawns a group of 3 rockets simultaneously
  const triggerRocketBurst = useCallback(() => {
    const burstId = Date.now();
    const rocketCount = 3 + Math.floor(Math.random() * 2); // Spawns 3 to 4 rockets
    const colorPalettes = [
        ['#facc15', '#ef4444', '#3b82f6'], // Gold, Red, Blue
        ['#fb923c', '#22c55e', '#ffffff'], // Orange, Green, White
        ['#ec4899', '#8b5cf6', '#06b6d4'], // Pink, Purple, Cyan
        ['#f59e0b', '#fbbf24', '#fef3c7']  // Gold gradients
    ];

    const newRockets = Array.from({ length: rocketCount }).map((_, i) => {
        const id = burstId + i;
        const leftPos = `${15 + Math.random() * 70}%`; // Keep within screen bounds
        const targetTop = `${15 + Math.random() * 30}%`; // Blast in upper area
        const colors = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
        
        // Schedule the blast phase
        setTimeout(() => {
            setFireworks(prev => prev.map(f => f.id === id ? { ...f, isRocket: false } : f));
            // Cleanup blast after animation
            setTimeout(() => {
                setFireworks(prev => prev.filter(f => f.id !== id));
            }, 1500);
        }, 1200); // Time for rocket to climb

        return { id, top: targetTop, left: leftPos, colors, isRocket: true };
    });

    setFireworks(prev => [...prev, ...newRockets]);
  }, []);

  useEffect(() => {
    const interval = setInterval(triggerRocketBurst, 3000);
    return () => clearInterval(interval);
  }, [triggerRocketBurst]);

  return (
    <>
      {/* Golden Dust Particles */}
      {particles.map((p) => (
        <div 
          key={p.id}
          className="absolute rounded-full bg-yellow-400/40 blur-[1px] animate-pulse"
          style={{
            top: p.top,
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: p.delay,
          }}
        />
      ))}

      {/* Typing/Animated Greeting Message */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 text-center w-full px-4">
          <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
            {fullText.map((word, idx) => (
              <span 
                key={idx}
                className={cn(
                    "text-3xl md:text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-500 to-amber-700 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)] transition-all duration-500",
                    idx < visibleWords ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-90"
                )}
              >
                {word}
              </span>
            ))}
          </div>
          <div className="mt-2 h-px w-32 mx-auto bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />
      </div>

      {/* Rockets and Fireworks */}
      {fireworks.map(fw => (
        <div 
          key={fw.id} 
          className="absolute" 
          style={{ top: fw.top, left: fw.left }}
        >
            {fw.isRocket ? (
                <div className="relative animate-rocket-launch">
                    {/* Rocket Body */}
                    <div className="w-1.5 h-4 bg-gradient-to-t from-orange-600 to-yellow-400 rounded-full shadow-[0_0_10px_#f59e0b]" />
                    {/* Rocket Trail */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-12 bg-gradient-to-b from-yellow-400 via-orange-500/40 to-transparent blur-[1px]" />
                </div>
            ) : (
                <CircularFireworkBlast colors={fw.colors} />
            )}
        </div>
      ))}

      {/* Static Corner Diyas */}
      <div className="fixed top-20 left-4 z-[110] animate-side-wobble">
          <DiyaSVG />
      </div>
      <div className="fixed top-20 right-4 z-[110] animate-side-wobble" style={{ animationDelay: '1s' }}>
          <DiyaSVG />
      </div>
    </>
  );
}

function CircularFireworkBlast({ colors }: { colors: string[] }) {
    // Generate particles in a circle (360 degrees)
    const particleCount = 32;
    const particles = Array.from({ length: particleCount });

    return (
        <div className="relative">
            {particles.map((_, i) => {
                const angle = (360 / particleCount) * i;
                const color = colors[i % colors.length];
                const distance = 80 + Math.random() * 40; // Random distance for natural look
                
                return (
                    <div 
                        key={i}
                        className="absolute w-1 h-1 rounded-full animate-firework-burst-circle"
                        style={{ 
                            backgroundColor: color,
                            boxShadow: `0 0 12px ${color}`,
                            '--angle': `${angle}deg`,
                            '--distance': `${distance}px`,
                            opacity: 0
                        } as React.CSSProperties}
                    />
                );
            })}
            {/* Center Flash */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full blur-xl animate-out fade-out duration-700" />
        </div>
    );
}

function DiyaSVG() {
    return (
        <div className="relative w-16 h-16">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
                <path d="M10 60C10 80 30 95 50 95C70 95 90 80 90 60H10Z" fill="url(#diya_body)" stroke="#78350F" strokeWidth="0.5" />
                <path d="M50 10C50 10 35 40 35 55C35 65 42 70 50 70C58 70 65 65 65 55C65 40 50 10 50 10Z" fill="url(#flame_grad)" className="animate-flicker origin-bottom" />
                <defs>
                    <linearGradient id="diya_body" x1="50" y1="60" x2="50" y2="95" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#92400E" />
                        <stop offset="0.5" stopColor="#D97706" />
                        <stop offset="1" stopColor="#78350F" />
                    </linearGradient>
                    <radialGradient id="flame_grad" cx="50" cy="55" r="30" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FFF" />
                        <stop offset="0.4" stopColor="#FBBF24" />
                        <stop offset="0.8" stopColor="#EA580C" />
                        <stop offset="1" stopColor="transparent" />
                    </radialGradient>
                </defs>
            </svg>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-yellow-500/10 blur-2xl rounded-full animate-pulse" />
        </div>
    );
}