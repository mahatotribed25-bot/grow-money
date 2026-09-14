'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { 
    Check, 
    Coins,
    Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

type CashDispenseAnimationProps = {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  walletBalance: number;
};

export function CashDispenseAnimation({ isOpen, onClose, amount }: CashDispenseAnimationProps) {
  const [showContent, setShowContent] = useState(false);
  const [transactionId] = useState(() => `GM-${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
  const [currentTime] = useState(() => {
    const now = new Date();
    return now.toLocaleString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
  });

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowContent(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  // Generate random positions for floating coins
  const floatingCoins = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${10 + Math.random() * 10}s`,
      size: Math.random() * 30 + 30,
      rotate: Math.random() * 360,
    }));
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 overflow-hidden">
        {/* Dark Intense Backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500" />

        {/* Floating Background Coins */}
        <div className="absolute inset-0 pointer-events-none">
            {floatingCoins.map((coin) => (
                <div 
                    key={coin.id}
                    className="absolute animate-float opacity-0 transition-opacity duration-1000"
                    style={{ 
                        left: coin.left, 
                        top: coin.top, 
                        animationDelay: coin.delay,
                        animationDuration: coin.duration,
                        opacity: showContent ? 0.4 : 0
                    }}
                >
                    <GoldCoinSVG size={coin.size} className="drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]" />
                </div>
            ))}
        </div>

        {/* The Modal Container */}
        <div className="relative w-full max-w-sm flex flex-col items-center gap-8">
            
            {/* Main Success Card (Glassmorphism) */}
            <div className={cn(
                "relative w-full bg-white/[0.03] backdrop-blur-[50px] border border-white/10 rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-700 transform",
                showContent ? "scale-100 opacity-100 translate-y-0" : "scale-90 opacity-0 translate-y-10"
            )}>
                {/* Glow Effects */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
                
                <div className="p-8 flex flex-col items-center text-center space-y-6">
                    <div className="space-y-1">
                        <h2 className="text-[10px] font-black text-primary uppercase tracking-[5px] drop-shadow-[0_0_10px_rgba(var(--primary),0.5)]">
                            WITHDRAWAL SUCCESS
                        </h2>
                        <div className="pt-4 space-y-2">
                            <p className="text-sm font-bold text-white/60 tracking-tight">Verified Capital Dispatch:</p>
                            <p className="text-4xl font-black text-white tracking-tighter drop-shadow-2xl">
                                ₹{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    {/* Transaction Detail Box */}
                    <div className="w-full bg-black/40 border border-white/5 rounded-3xl p-5 text-left space-y-4 shadow-inner">
                        <div className="space-y-0.5">
                            <p className="text-xs font-bold text-white/80">Transaction Settled</p>
                            <p className="text-[9px] font-medium text-white/30">({currentTime})</p>
                        </div>
                        <Separator className="bg-white/5" />
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Status:</span>
                                <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Settled</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Dispatch amount:</span>
                                <span className="text-[11px] font-black text-white/80">₹{amount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Service Fee:</span>
                                <span className="text-[11px] font-black text-white/80">₹0.00</span>
                            </div>
                        </div>
                    </div>

                    {/* Close Button */}
                    <Button 
                        onClick={onClose}
                        className="w-full h-14 rounded-2xl bg-[#2563eb] text-white font-black text-sm uppercase tracking-[3px] shadow-2xl shadow-blue-500/20 hover:bg-blue-600 active:scale-95 transition-all"
                    >
                        Close
                    </Button>
                </div>
            </div>

            {/* PAYOUT AREA (The ATM Slot) */}
            <div className={cn(
                "relative w-full flex flex-col items-center transition-all duration-1000 delay-500",
                showContent ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
            )}>
                {/* Glowing Slot */}
                <div className="relative z-20">
                    <div className="w-56 h-12 rounded-2xl bg-[#0a0b14] border-[3px] border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.1),inset_0_0_20px_rgba(0,0,0,0.9)] flex items-center justify-center">
                        <div className="w-44 h-2 bg-black rounded-full border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,1)]" />
                    </div>
                    {/* Inner Slot Glow */}
                    <div className="absolute inset-0 rounded-2xl shadow-[0_0_25px_rgba(255,255,255,0.05)] pointer-events-none" />
                </div>

                {/* Fanned Banknotes */}
                <div className="absolute top-6 flex justify-center w-full perspective-[1000px]">
                    <div className="relative h-64 w-64 animate-in slide-in-from-top-10 duration-1000 ease-out delay-700">
                        {/* Note 1 (₹2000 - Left) */}
                        <Banknote color="magenta" value="2000" rotation="-35deg" offset="-60px" delay="0.8s" />
                        {/* Note 2 (₹500 - Left-Mid) */}
                        <Banknote color="green" value="500" rotation="-20deg" offset="-30px" delay="0.9s" />
                        {/* Note 3 (₹500 - Center) */}
                        <Banknote color="green" value="500" rotation="0deg" offset="0px" delay="1s" />
                        {/* Note 4 (₹500 - Right-Mid) */}
                        <Banknote color="green" value="500" rotation="20deg" offset="30px" delay="1.1s" />
                        {/* Note 5 (₹2000 - Right) */}
                        <Banknote color="magenta" value="2000" rotation="35deg" offset="60px" delay="1.2s" />
                    </div>
                </div>

                {/* Bottom Label */}
                <div className="mt-16 text-center space-y-1">
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-[5px]">PAYOUT AREA</p>
                </div>
            </div>
        </div>

        <style jsx global>{`
            @keyframes float {
                0% { transform: translateY(0px) rotate(0deg); }
                50% { transform: translateY(-20px) rotate(5deg); }
                100% { transform: translateY(0px) rotate(0deg); }
            }
            .animate-float {
                animation: float 6s ease-in-out infinite;
            }
        `}</style>
    </div>
  );
}

function Banknote({ color, value, rotation, offset, delay }: { color: 'green' | 'magenta', value: string, rotation: string, offset: string, delay: string }) {
    return (
        <div 
            className={cn(
                "absolute top-0 left-1/2 -translate-x-1/2 w-32 h-60 rounded-xl border-2 border-white/10 shadow-2xl p-2 flex flex-col items-center transition-all duration-1000 ease-out transform-gpu origin-top",
                color === 'green' ? "bg-gradient-to-b from-[#c8e6c9] via-[#66bb6a] to-[#2e7d32]" : "bg-gradient-to-b from-[#e1bee7] via-[#ba68c8] to-[#8e24aa]"
            )}
            style={{ 
                transform: `translateX(calc(-50% + ${offset})) rotate(${rotation})`,
                animation: `note-emerge 1s ease-out ${delay} forwards`,
                opacity: 0,
            }}
        >
            <div className="w-full flex justify-between items-start opacity-40">
                <span className="text-[8px] font-black italic">₹{value}</span>
                <div className="h-6 w-6 rounded-full border border-black/20" />
            </div>
            
            <div className="flex-1 flex items-center justify-center">
                <div className="h-20 w-20 rounded-full border-4 border-white/10 flex items-center justify-center">
                     <span className="text-2xl font-black text-white/20">₹</span>
                </div>
            </div>

            <div className="mt-auto space-y-1 w-full text-center">
                <p className="text-[12px] font-black text-black/20 tracking-tighter italic">RESERVE BANK OF INDIA</p>
                <div className="h-1 w-full bg-black/10 rounded-full" />
                <p className="text-[10px] font-black text-white/30">₹ {value}</p>
            </div>

            <style jsx>{`
                @keyframes note-emerge {
                    0% { transform: translateX(calc(-50% + ${offset})) translateY(-40px) rotate(0deg); opacity: 0; }
                    100% { transform: translateX(calc(-50% + ${offset})) translateY(0px) rotate(${rotation}); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

function GoldCoinSVG({ size, className }: { size: number, className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="50" cy="50" r="48" fill="url(#gold_rim)" stroke="#78350F" strokeWidth="1"/>
        <circle cx="50" cy="50" r="42" fill="url(#gold_body)" stroke="#B45309" strokeWidth="2"/>
        <circle cx="50" cy="50" r="34" stroke="#FDE68A" strokeWidth="1" strokeDasharray="4 4" opacity="0.3"/>
        <path d="M35 35h30M35 45h30M60 35c0 0 0 25-25 25M45 60c10 0 20 10 20 20" stroke="#78350F" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
        <defs>
            <linearGradient id="gold_rim" x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse">
                <stop stopColor="#92400E"/>
                <stop offset="0.5" stopColor="#F59E0B"/>
                <stop offset="1" stopColor="#78350F"/>
            </linearGradient>
            <linearGradient id="gold_body" x1="20" x2="80" y1="20" y2="80" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FDE68A"/>
                <stop offset="0.4" stopColor="#F59E0B"/>
                <stop offset="0.7" stopColor="#D97706"/>
                <stop offset="1" stopColor="#78350F"/>
            </linearGradient>
        </defs>
    </svg>
  );
}

