
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

  // Word-by-word reveal animation - Majestic and slow
  useEffect(() => {
    if (visibleWords < fullText.length) {
      const timer = setTimeout(() => {
        setVisibleWords(prev => prev + 1);
      }, 800); 
      return () => clearTimeout(timer);
    } else {
        // Reset after 10 seconds to loop the cycle
        const resetTimer = setTimeout(() => {
            setVisibleWords(0);
        }, 10000);
        return () => clearTimeout(resetTimer);
    }
  }, [visibleWords, fullText.length]);

  // Create golden dust background
  useEffect(() => {
    const newParticles = Array.from({ length: 45 }).map((_, i) => ({
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
    // Launch 3 to 5 rockets simultaneously for grand feel
    const rocketCount = 3 + Math.floor(Math.random() * 3); 
    const colorPalettes = [
        ['#FF00FF', '#00FFFF', '#FFFFFF'], // Cyber Neon
        ['#FFD700', '#FF4500', '#EA580C'], // Solar Gold
        ['#ADFF2F', '#00FF00', '#FDE68A'], // Lime Spark
        ['#F472B6', '#EC4899', '#FFFFFF']  // Pink Glow
    ];

    const newRockets = Array.from({ length: rocketCount }).map((_, i) => {
        const id = burstId + i;
        const leftPos = `${10 + Math.random() * 80}%`;
        const targetTop = `${15 + Math.random() * 40}%`; 
        const colors = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
        
        // Rocket climb duration is 2.5s in CSS
        setTimeout(() => {
            // After climb, switch to blast (circular expansion)
            setFireworks(prev => prev.map(f => f.id === id ? { ...f, isRocket: false } : f));
            
            // Blast duration is 3.5s in CSS
            setTimeout(() => {
                setFireworks(prev => prev.filter(f => f.id !== id));
            }, 3500);
        }, 2500);

        return { id, top: targetTop, left: leftPos, colors, isRocket: true };
    });

    setFireworks(prev => [...prev, ...newRockets]);
  }, []);

  useEffect(() => {
    // Launch rockets every 5 seconds for a balanced interval
    const interval = setInterval(triggerRocketBurst, 5500); 
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
                    "text-3xl md:text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-400 to-amber-600 drop-shadow-[0_0_25px_rgba(234,179,8,0.8)] transition-all duration-1000",
                    idx < visibleWords ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-10 scale-90"
                )}
              >
                {word}
              </span>
            ))}
          </div>
          <div className="mt-8 h-[2px] w-64 mx-auto bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent" />
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
                    {/* Rocket body with glow */}
                    <div className="w-3 h-8 bg-gradient-to-t from-orange-600 via-yellow-400 to-white rounded-full shadow-[0_0_30px_#f59e0b]" />
                    {/* Fire Trail */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-1.5 h-40 bg-gradient-to-b from-yellow-300 via-orange-500/30 to-transparent blur-[4px]" />
                </div>
            ) : (
                <CircularFireworkBlast colors={fw.colors} />
            )}
        </div>
      ))}
    </>
  );
}

function CircularFireworkBlast({ colors }: { colors: string[] }) {
    const particleCount = 55; // High particle density for brighter shots
    const particles = Array.from({ length: particleCount });

    return (
        <div className="relative">
            {particles.map((_, i) => {
                const angle = (360 / particleCount) * i;
                const color = colors[i % colors.length];
                const distance = 160 + Math.random() * 140; // Further circular spread
                
                return (
                    <div 
                        key={i}
                        className="absolute w-3 h-3 rounded-full animate-firework-burst-circle"
                        style={{ 
                            backgroundColor: color,
                            boxShadow: `0 0 20px ${color}, 0 0 40px ${color}, 0 0 60px ${color}`, // Intense Brighter glow
                            '--angle': `${angle}deg`,
                            '--distance': `${distance}px`,
                            opacity: 0
                        } as React.CSSProperties}
                    />
                );
            })}
            {/* Center flash on blast */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white/30 rounded-full blur-[60px] animate-out fade-out duration-1000" />
        </div>
    );
}
