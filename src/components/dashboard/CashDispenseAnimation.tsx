'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { 
    Check, 
    Coins
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type CashDispenseAnimationProps = {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  walletBalance: number;
};

export function CashDispenseAnimation({ isOpen, onClose, amount }: CashDispenseAnimationProps) {
  const [showContent, setShowContent] = useState(false);
  const [transactionId] = useState(() => `GMD-${amount}-A`);
  const [currentTime] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString('en-GB', { hour12: false });
  });

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowContent(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  // Generate random positions for floating coins
  const floatingCoins = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 80 + 10}%`,
      top: `${Math.random() * 80 + 10}%`,
      delay: `${Math.random() * 2}s`,
      duration: `${3 + Math.random() * 2}s`,
      size: Math.random() * 20 + 20,
    }));
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
        {/* Dark Backdrop with heavy blur */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

        {/* Floating Background Coins */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {floatingCoins.map((coin) => (
                <div 
                    key={coin.id}
                    className="absolute animate-bounce opacity-0"
                    style={{ 
                        left: coin.left, 
                        top: coin.top, 
                        animationDelay: coin.delay,
                        animationDuration: coin.duration,
                        animationIterationCount: 'infinite',
                        animationFillMode: 'forwards',
                        opacity: showContent ? 0.6 : 0
                    }}
                >
                    <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 bg-yellow-500/40 blur-xl rounded-full" />
                        <svg width={coin.size} height={coin.size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl rotate-12">
                            <circle cx="50" cy="50" r="45" fill="url(#coin_grad)" stroke="#B45309" strokeWidth="2"/>
                            <text x="50" y="65" textAnchor="middle" fill="#78350F" fontSize="50" fontWeight="900" fontFamily="sans-serif">₹</text>
                            <defs>
                                <linearGradient id="coin_grad" x1="20" x2="80" y1="20" y2="80" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#FDE68A"/>
                                    <stop offset="0.5" stopColor="#F59E0B"/>
                                    <stop offset="1" stopColor="#78350F"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </div>
            ))}
        </div>

        {/* The Modal Card */}
        <div className={cn(
            "relative w-full max-w-sm bg-[#1a113a]/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.6)] overflow-hidden transition-all duration-700 transform",
            showContent ? "scale-100 opacity-100 translate-y-0" : "scale-90 opacity-0 translate-y-10"
        )}>
            {/* Top Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-primary/20 blur-[60px] rounded-full -mt-16" />

            <div className="p-8 flex flex-col items-center text-center space-y-6">
                {/* Checkmark Icon */}
                <div className="h-14 w-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shadow-xl animate-in zoom-in-0 duration-500 delay-300">
                    <Check className="text-white h-8 w-8" strokeWidth={3} />
                </div>

                {/* Status Text */}
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">PROTOCOL SUCCESS</h2>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-white/70">Verified Capital Dispatch of</p>
                        <p className="text-3xl font-black text-white tracking-tighter">₹{amount.toFixed(2)}</p>
                    </div>
                </div>

                {/* ID & Time Badge */}
                <div className="bg-white/5 border border-white/5 px-4 py-1.5 rounded-full flex items-center gap-2">
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">ID: <span className="text-white/60">{transactionId}</span></span>
                    <div className="w-px h-3 bg-white/10" />
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Time: <span className="text-white/60">{currentTime}</span></span>
                </div>

                {/* ATM Dispense Visual */}
                <div className="relative w-full aspect-video bg-white/5 rounded-3xl border border-white/5 flex flex-col items-center justify-start pt-6 overflow-hidden shadow-inner">
                    {/* Horizontal Slot */}
                    <div className="relative w-48 h-2.5 bg-[#0a0b14] rounded-full border border-white/10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] z-20" />
                    <div className="absolute top-[34px] w-48 h-1 bg-primary/30 blur-[4px] z-30 animate-pulse" />

                    {/* Fanned Banknotes */}
                    <div className="relative mt-2 z-10 flex justify-center">
                         {/* Fanned Note Stack */}
                         <div className="relative w-40 h-32 animate-in slide-in-from-top-4 duration-1000 ease-out">
                            {/* ₹2000 Note (Middle) */}
                            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-32 h-16 bg-gradient-to-br from-[#e1bee7] via-[#ba68c8] to-[#8e24aa] rounded-lg border-2 border-white/5 shadow-2xl flex flex-col p-1.5 rotate-[-5deg] transform origin-top z-20">
                                <div className="flex justify-between items-start opacity-30">
                                    <span className="text-[6px] font-bold">₹2000</span>
                                    <div className="h-4 w-4 rounded-full border border-white/20" />
                                </div>
                                <div className="mt-auto text-[10px] font-black self-center opacity-40">₹2000</div>
                            </div>

                            {/* ₹500 Note (Left) */}
                            <div className="absolute left-1/2 -translate-x-[90%] top-2 w-32 h-16 bg-gradient-to-br from-[#c8e6c9] via-[#66bb6a] to-[#2e7d32] rounded-lg border-2 border-white/5 shadow-2xl flex flex-col p-1.5 rotate-[-25deg] transform origin-top z-10">
                                <div className="flex justify-between items-start opacity-30">
                                    <span className="text-[6px] font-bold">₹500</span>
                                    <div className="h-4 w-4 rounded-full border border-white/20" />
                                </div>
                                <div className="mt-auto text-[10px] font-black self-center opacity-40">₹500</div>
                            </div>

                            {/* ₹500 Note (Right) */}
                            <div className="absolute left-1/2 translate-x-[-10%] top-2 w-32 h-16 bg-gradient-to-br from-[#c8e6c9] via-[#66bb6a] to-[#2e7d32] rounded-lg border-2 border-white/5 shadow-2xl flex flex-col p-1.5 rotate-[15deg] transform origin-top z-10">
                                <div className="flex justify-between items-start opacity-30">
                                    <span className="text-[6px] font-bold">₹500</span>
                                    <div className="h-4 w-4 rounded-full border border-white/20" />
                                </div>
                                <div className="mt-auto text-[10px] font-black self-center opacity-40">₹500</div>
                            </div>
                         </div>
                    </div>

                    {/* Sparkles/Stars */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-1/2 left-1/4 h-1 w-1 bg-white rounded-full animate-ping" />
                        <div className="absolute top-2/3 left-3/4 h-1 w-1 bg-white rounded-full animate-ping delay-300" />
                        <div className="absolute bottom-1/4 left-1/2 h-1 w-1 bg-white rounded-full animate-ping delay-700" />
                    </div>
                </div>

                {/* Final OK Button */}
                <Button 
                    onClick={onClose}
                    className="w-full h-14 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-[4px] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                    OK
                </Button>
            </div>
        </div>
    </div>
  );
}
