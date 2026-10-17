
'use client';

import { useEffect, useState, useCallback } from 'react';
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
  const [fireworks, setFireworks] = useState<{ id: number; top: string; left: string; colors: string[]; isRocket?: boolean }[]>([]);
  const [visibleWords, setVisibleWords] = useState<number>(0);
  
  const fullText = "Happy Diwali from Grow Money Team".split(" ");

  // Word-by-word reveal animation - Slower and majestic
  useEffect(() => {
    if (visibleWords < fullText.length) {
      const timer = setTimeout(() => {
        setVisibleWords(prev => prev + 1);
      }, 700); 
      return () => clearTimeout(timer);
    } else {
        const resetTimer = setTimeout(() => {
            setVisibleWords(0);
        }, 12000);
        return () => clearTimeout(resetTimer);
    }
  }, [visibleWords, fullText.length]);

  // Create golden dust background
  useEffect(() => {
    const newParticles = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 8}s`,
      size: Math.random() * 3 + 1,
    }));
    setParticles(newParticles);
  }, []);

  // Skyrocket Launch Logic - Synchronized Multiple Bursts
  const triggerRocketBurst = useCallback(() => {
    const burstId = Date.now();
    const rocketCount = 3 + Math.floor(Math.random() * 2); 
    const colorPalettes = [
        ['#FF00FF', '#00FFFF', '#FFFFFF'], // Cyber Neon
        ['#FFD700', '#FF4500', '#EA580C'], // Solar Gold
        ['#ADFF2F', '#00FF00', '#FDE68A'], // Lime Spark
        ['#F472B6', '#EC4899', '#FFFFFF']  // Pink Glow
    ];

    const newRockets = Array.from({ length: rocketCount }).map((_, i) => {
        const id = burstId + i;
        const leftPos = `${15 + Math.random() * 70}%`;
        const targetTop = `${15 + Math.random() * 30}%`; 
        const colors = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
        
        // Matches 2.5s climb in CSS
        setTimeout(() => {
            setFireworks(prev => prev.map(f => f.id === id ? { ...f, isRocket: false } : f));
            // Matches 3.5s spread in CSS
            setTimeout(() => {
                setFireworks(prev => prev.filter(f => f.id !== id));
            }, 3500);
        }, 2500);

        return { id, top: targetTop, left: leftPos, colors, isRocket: true };
    });

    setFireworks(prev => [...prev, ...newRockets]);
  }, []);

  useEffect(() => {
    const interval = setInterval(triggerRocketBurst, 5000); 
    return () => clearInterval(interval);
  }, [triggerRocketBurst]);

  return (
    <>
      {/* Golden Dust Particles */}
      {particles.map((p) => (
        <div 
          key={p.id}
          className="absolute rounded-full bg-yellow-400/20 blur-[1px] animate-pulse"
          style={{
            top: p.top,
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: p.delay,
          }}
        />
      ))}

      {/* Typing Greeting Message */}
      <div className="absolute top-28 left-1/2 -translate-x-1/2 text-center w-full px-4">
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-2">
            {fullText.map((word, idx) => (
              <span 
                key={idx}
                className={cn(
                    "text-3xl md:text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-400 to-amber-600 drop-shadow-[0_0_20px_rgba(234,179,8,0.7)] transition-all duration-1000",
                    idx < visibleWords ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-10 scale-90"
                )}
              >
                {word}
              </span>
            ))}
          </div>
          <div className="mt-6 h-[2px] w-56 mx-auto bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />
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
                    <div className="w-3 h-8 bg-gradient-to-t from-orange-600 to-yellow-300 rounded-full shadow-[0_0_30px_#f59e0b]" />
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-1 h-32 bg-gradient-to-b from-yellow-300 via-orange-500/20 to-transparent blur-[3px]" />
                </div>
            ) : (
                <CircularFireworkBlast colors={fw.colors} />
            )}
        </div>
      ))}

      {/* Side Decorative Diyas */}
      <div className="fixed bottom-24 left-8 z-[110] animate-side-wobble">
          <DiyaSVG />
      </div>
      <div className="fixed bottom-24 right-8 z-[110] animate-side-wobble" style={{ animationDelay: '2s' }}>
          <DiyaSVG />
      </div>
    </>
  );
}

function CircularFireworkBlast({ colors }: { colors: string[] }) {
    const particleCount = 45;
    const particles = Array.from({ length: particleCount });

    return (
        <div className="relative">
            {particles.map((_, i) => {
                const angle = (360 / particleCount) * i;
                const color = colors[i % colors.length];
                const distance = 140 + Math.random() * 100; 
                
                return (
                    <div 
                        key={i}
                        className="absolute w-2.5 h-2.5 rounded-full animate-firework-burst-circle"
                        style={{ 
                            backgroundColor: color,
                            boxShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
                            '--angle': `${angle}deg`,
                            '--distance': `${distance}px`,
                            opacity: 0
                        } as React.CSSProperties}
                    />
                );
            })}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white/20 rounded-full blur-3xl animate-out fade-out duration-1000" />
        </div>
    );
}

function DiyaSVG() {
    return (
        <div className="relative w-20 h-20">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">
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
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 bg-yellow-500/20 blur-3xl rounded-full animate-pulse" />
        </div>
    );
}
