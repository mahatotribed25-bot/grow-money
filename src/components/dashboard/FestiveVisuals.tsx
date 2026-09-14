'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type FestiveVisualsProps = {
  theme?: 'none' | 'diwali' | 'ganesh-puja' | 'makar-sankranti' | 'holi';
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
      {theme === 'ganesh-puja' && <GaneshVisuals />}
      {theme === 'makar-sankranti' && <KiteVisuals />}
      {theme === 'holi' && <HoliVisuals />}
    </div>
  );
}

function DiwaliVisuals() {
  const [fireworks, setFireworks] = useState<{ id: number; top: string; left: string; delay: string; color: string }[]>([]);

  useEffect(() => {
    const colors = ['#f43f5e', '#fbbf24', '#22c55e', '#3b82f6', '#d946ef', '#ffffff'];
    const newFireworks = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 60}%`,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setFireworks(newFireworks);
  }, []);

  return (
    <>
      {fireworks.map((fw) => (
        <div 
          key={fw.id}
          className="absolute h-1 w-1 rounded-full animate-firework-burst"
          style={{
            top: fw.top,
            left: fw.left,
            backgroundColor: fw.color,
            boxShadow: `0 0 10px ${fw.color}`,
            animationDelay: fw.delay,
            animationIterationCount: 'infinite',
          }}
        />
      ))}
      <style jsx global>{`
        @keyframes firework-burst {
          0% { transform: scale(0); opacity: 1; }
          20% { transform: scale(20); opacity: 0.8; box-shadow: 0 0 20px currentColor, 10px 10px 5px currentColor, -10px -10px 5px currentColor; }
          100% { transform: scale(40); opacity: 0; }
        }
        .animate-firework-burst {
          animation: firework-burst 3s ease-out;
        }
      `}</style>
    </>
  );
}

function GaneshVisuals() {
  return (
    <div className="absolute inset-0 flex items-center justify-center opacity-10">
      <div className="relative w-full max-w-lg animate-pulse duration-[5000ms]">
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-[0_0_50px_rgba(255,190,0,0.5)]">
            <path d="M100 20C80 20 65 35 65 55C65 65 70 75 80 85L80 100C60 100 40 110 40 140C40 170 60 180 100 180C140 180 160 170 160 140C160 110 140 100 120 100L120 85C130 75 135 65 135 55C135 35 120 20 100 20ZM100 40C110 40 115 45 115 55C115 65 110 70 105 75C100 80 100 85 100 85C100 85 100 80 95 75C90 70 85 65 85 55C85 45 90 40 100 40Z" fill="url(#ganesh_grad)"/>
            <defs>
                <linearGradient id="ganesh_grad" x1="100" y1="20" x2="100" y2="180" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FFD700"/>
                    <stop offset="1" stopColor="#FF8C00"/>
                </linearGradient>
            </defs>
        </svg>
        <div className="absolute inset-0 bg-orange-500/20 blur-[100px] rounded-full" />
      </div>
    </div>
  );
}

function KiteVisuals() {
  const [kites, setKites] = useState<{ id: number; left: string; bottom: string; delay: string; duration: string; color: string }[]>([]);

  useEffect(() => {
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
    const newKites = Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      bottom: '-10%',
      delay: `${Math.random() * 10}s`,
      duration: `${15 + Math.random() * 15}s`,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setKites(newKites);
  }, []);

  return (
    <>
      {kites.map((k) => (
        <div 
          key={k.id}
          className="absolute animate-kite-float"
          style={{
            left: k.left,
            bottom: k.bottom,
            animationDelay: k.delay,
            animationDuration: k.duration,
            animationIterationCount: 'infinite',
            animationTimingFunction: 'linear'
          }}
        >
            <div className="relative w-12 h-12 rotate-45 border-2 border-white/20 shadow-lg" style={{ backgroundColor: k.color }}>
                <div className="absolute top-0 left-0 w-full h-full border-t border-l border-white/40" />
                <div className="absolute -bottom-6 -right-6 w-1 h-12 bg-white/30 rotate-[-45deg] origin-top" />
            </div>
        </div>
      ))}
      <style jsx global>{`
        @keyframes kite-float {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.6; }
          100% { transform: translateY(-120vh) translateX(100px) rotate(20deg); opacity: 0; }
        }
        .animate-kite-float {
          animation: kite-float linear infinite;
        }
      `}</style>
    </>
  );
}

function HoliVisuals() {
  const [blobs, setBlobs] = useState<{ id: number; top: string; left: string; color: string; size: number; delay: string }[]>([]);

  useEffect(() => {
    const colors = ['#f43f5e', '#fbbf24', '#22c55e', '#3b82f6', '#d946ef'];
    const newBlobs = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 150 + Math.random() * 200,
      delay: `${Math.random() * 5}s`,
    }));
    setBlobs(newBlobs);
  }, []);

  return (
    <div className="absolute inset-0 opacity-20">
      {blobs.map((b) => (
        <div 
          key={b.id}
          className="absolute rounded-full blur-[80px] animate-pulse"
          style={{
            top: b.top,
            left: b.left,
            width: b.size,
            height: b.size,
            backgroundColor: b.color,
            animationDelay: b.delay,
            animationDuration: '8s'
          }}
        />
      ))}
    </div>
  );
}
