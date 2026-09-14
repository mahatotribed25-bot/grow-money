'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { 
    CheckCircle2, 
    Wallet, 
    ShieldCheck, 
    ArrowLeft, 
    HelpCircle, 
    Smartphone,
    Timer,
    CircleDot,
    Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

type CashDispenseAnimationProps = {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  walletBalance: number;
};

type Note = {
    id: number;
    value: number;
    rotation: number;
    offsetX: number;
}

export function CashDispenseAnimation({ isOpen, onClose, amount }: CashDispenseAnimationProps) {
  const [stage, setStage] = useState<'processing' | 'dispensing' | 'success'>('processing');
  const [transactionId] = useState(() => `GM-${Math.floor(100000000 + Math.random() * 900000000)}`);
  const [currentTime] = useState(() => new Date().toLocaleString('en-IN', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  }));

  const [activeNotes, setActiveNotes] = useState<Note[]>([]);

  useEffect(() => {
    if (isOpen) {
      setStage('processing');
      setActiveNotes([]);
      
      // Stage 1: Security Handshake
      const t1 = setTimeout(() => {
          setStage('dispensing');
          const noteVal = amount >= 2000 ? 2000 : 500;
          
          // Stage 2: Sequential Dispensing with physics variance
          const dispenseInterval = setInterval(() => {
              setActiveNotes(prev => {
                  if (prev.length >= 8) {
                      clearInterval(dispenseInterval);
                      return prev;
                  }
                  return [...prev, { 
                      id: Date.now() + prev.length, 
                      value: noteVal,
                      rotation: Math.random() * 6 - 3, // Slight random tilt
                      offsetX: Math.random() * 10 - 5  // Slight random horizontal shift
                  }];
              });
          }, 450);
          
          return () => clearInterval(dispenseInterval);
      }, 2500);
      
      // Stage 3: Confirmation
      const t2 = setTimeout(() => setStage('success'), 8500);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [isOpen, amount]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#030408] flex flex-col animate-in fade-in duration-500 overflow-hidden">
        {/* ATM Top Navigation */}
        <header className="flex h-20 items-center justify-between px-6 border-b border-white/[0.03] bg-[#05060f]/80 backdrop-blur-3xl relative z-50">
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white/20 hover:text-white rounded-2xl">
                <ArrowLeft size={22} />
            </Button>
            <div className="text-center">
                <h1 className="text-[10px] font-black text-primary uppercase tracking-[5px] mb-0.5">Secure Node</h1>
                <p className="text-sm font-black text-white tracking-tight">ATM TERMINAL #091</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Lock size={18} className="text-primary" />
            </div>
        </header>

        <main className="flex-1 p-6 space-y-8 max-w-md mx-auto w-full relative pt-8 flex flex-col">
            {/* Real-time Status Card */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-6 flex items-center justify-between shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-y-0 left-0 w-1 bg-primary animate-pulse" />
                <div className="flex items-center gap-5 relative z-10">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(139,92,246,0.2)] border border-primary/20">
                        <Wallet size={32} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[3px] mb-1">Authorization Sum</p>
                        <h2 className="text-3xl font-black text-white tracking-tighter italic">₹{amount.toLocaleString()}</h2>
                    </div>
                </div>
                {stage !== 'success' && <Timer size={20} className="text-primary/40 animate-spin" />}
            </div>

            {stage !== 'success' ? (
                <div className="flex-1 flex flex-col justify-center gap-12 animate-in fade-in slide-in-from-bottom-4">
                    <div className="text-center space-y-2">
                        <h3 className={cn(
                            "text-base font-black tracking-[4px] uppercase transition-all duration-700",
                            stage === 'processing' ? "text-primary animate-pulse" : "text-green-400"
                        )}>
                            {stage === 'processing' ? "Verifying Node Access" : "Dispensing Capital"}
                        </h3>
                        <div className="flex justify-center gap-1.5">
                            {[1,2,3].map(i => <div key={i} className={cn("h-1 w-1 rounded-full bg-primary/40", stage === 'dispensing' && "animate-bounce")} style={{ animationDelay: `${i * 150}ms` }} />)}
                        </div>
                    </div>

                    {/* ATM Machine Visual Structure */}
                    <div className="relative w-full aspect-square bg-[#0a0b14] rounded-[4rem] border border-white/[0.05] shadow-[0_40px_100px_rgba(0,0,0,0.8),inset_0_2px_20px_rgba(255,255,255,0.02)] p-12 flex flex-col items-center justify-center overflow-hidden">
                        
                        {/* Internal Depth Mask */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none" />

                        {/* 3D ATM Payout Slot */}
                        <div className="relative w-full h-48 bg-[#020306] rounded-[2.5rem] border-[8px] border-[#16171f] shadow-[inset_0_10px_40px_rgba(0,0,0,1),0_5px_15px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-visible">
                            
                            {/* The physical 'Gape' of the slot */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-12 bg-black rounded-xl border border-white/5 shadow-inner z-0" />
                            
                            {/* Scanning/UV Light Node */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] h-1 bg-primary/20 blur-[6px] rounded-full z-20 shadow-[0_0_25px_rgba(139,92,246,0.6)] animate-pulse" />

                            {/* Sequential Banknote Render */}
                            {activeNotes.map((note, index) => (
                                <div 
                                    key={note.id}
                                    className="absolute left-1/2 top-1/2 -translate-x-1/2 z-10 animate-cash-fly"
                                    style={{ 
                                        animationDelay: '0ms',
                                        zIndex: 10 + index 
                                    }}
                                >
                                    <div 
                                        style={{ transform: `rotate(${note.rotation}deg) translateX(${note.offsetX}px)` }}
                                        className={cn(
                                            "relative w-64 h-32 rounded-xl border-[4px] border-black/10 shadow-2xl flex flex-col p-4 overflow-hidden",
                                            note.value === 2000 
                                                ? "bg-gradient-to-br from-[#e1bee7] via-[#ba68c8] to-[#8e24aa] text-[#4a0e5c]" 
                                                : "bg-gradient-to-br from-[#c8e6c9] via-[#66bb6a] to-[#2e7d32] text-[#134215]"
                                        )}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm font-black tracking-tighter">₹{note.value}</span>
                                                <span className="text-[6px] font-black uppercase opacity-50 tracking-widest">Grow Money Reserve Node</span>
                                            </div>
                                            <div className="w-12 h-12 rounded-full border border-black/5 bg-white/10 blur-[0.5px] flex items-center justify-center overflow-hidden">
                                                <div className="w-6 h-6 border-2 border-black/5 rounded-full" />
                                            </div>
                                        </div>
                                        
                                        <div className="mt-auto flex justify-between items-end">
                                            <div className="w-12 h-12 rounded-lg border border-black/5 bg-white/5" />
                                            <div className="text-right">
                                                <p className="text-[6px] font-black uppercase tracking-widest opacity-40">System Node Serial</p>
                                                <p className="text-[10px] font-black tracking-widest">GM-{transactionId.slice(-4)}</p>
                                            </div>
                                        </div>

                                        {/* Realistic Security Thread */}
                                        <div className="absolute top-0 bottom-0 left-[25%] w-2.5 bg-black/10 border-x border-black/5 flex flex-col items-center justify-around py-1">
                                            {[1,2,3,4].map(i => <div key={i} className="w-full h-1 bg-white/10" />)}
                                        </div>
                                        
                                        {/* Holographic Seal Circle */}
                                        <div className="absolute top-1/2 right-12 -translate-y-1/2 w-8 h-8 rounded-full bg-white/10 blur-[2px] border border-white/20" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Activity Detail below slot */}
                        <div className="mt-12 flex items-center gap-3 bg-white/[0.03] px-5 py-2.5 rounded-full border border-white/[0.05]">
                            <ShieldCheck size={14} className="text-green-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Atomic Payout Protocol Active</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col justify-center space-y-10 animate-in slide-in-from-bottom-12 duration-1000 cubic-bezier(0.16, 1, 0.3, 1)">
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="h-32 w-32 rounded-[3.5rem] bg-green-500/10 flex items-center justify-center border border-green-500/20 shadow-[0_0_100px_rgba(34,197,94,0.15)] relative group">
                            <CheckCircle2 size={64} className="text-green-500 animate-in zoom-in-0 duration-700" />
                            <div className="absolute inset-0 rounded-full border border-green-500/30 animate-ping duration-[3000ms]" />
                        </div>
                        <div className="space-y-1.5">
                            <h3 className="text-4xl font-black text-white tracking-tighter uppercase italic">PROTOCOL SUCCESS</h3>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[6px]">Node Settlement Authorized</p>
                        </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-green-500/30 shadow-[0_0_15px_#22c55e]" />
                        
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">System Trace ID</span>
                            <span className="text-xs font-black text-white/80 font-mono">#{transactionId}</span>
                        </div>
                        <Separator className="bg-white/5" />
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Final Dispatch</span>
                            <span className="text-3xl font-black text-green-400 tracking-tighter">₹{amount.toLocaleString()}</span>
                        </div>
                        <Separator className="bg-white/5" />
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Sync Timestamp</span>
                            <span className="text-[10px] font-bold text-white/60">{currentTime}</span>
                        </div>
                    </div>

                    <div className="pt-6">
                        <Button 
                            onClick={onClose}
                            className="w-full h-16 rounded-[1.8rem] font-black bg-white text-black shadow-2xl hover:bg-primary hover:text-white transition-all text-lg uppercase tracking-widest active:scale-95"
                        >
                            Complete Protocol
                        </Button>
                    </div>
                </div>
            )}
        </main>
    </div>
  );
}
