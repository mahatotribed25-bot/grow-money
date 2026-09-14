'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { 
    CheckCircle2, 
    Wallet, 
    ShieldCheck, 
    ArrowLeft, 
    HelpCircle, 
    Eye,
    Smartphone,
    Timer,
    CircleDot
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type CashDispenseAnimationProps = {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  walletBalance: number;
};

type Note = {
    id: number;
    value: number;
}

export function CashDispenseAnimation({ isOpen, onClose, amount, walletBalance }: CashDispenseAnimationProps) {
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
      
      // Stage 1: Authentication
      const t1 = setTimeout(() => {
          setStage('dispensing');
          
          // Determine note value to show (2000 for high amounts, 500 otherwise)
          const noteVal = amount >= 2000 ? 2000 : 500;
          
          // Stage 2: Dispensing sequence
          const dispenseInterval = setInterval(() => {
              setActiveNotes(prev => {
                  if (prev.length >= 6) {
                      clearInterval(dispenseInterval);
                      return prev;
                  }
                  return [...prev, { id: Date.now() + prev.length, value: noteVal }];
              });
          }, 600);
          
          return () => clearInterval(dispenseInterval);
      }, 2000);
      
      // Stage 3: Protocol Success
      const t2 = setTimeout(() => setStage('success'), 7500);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [isOpen, amount]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#020306] flex flex-col animate-in fade-in duration-300 overflow-hidden">
        {/* Futuristic Top Nav */}
        <header className="flex h-20 items-center justify-between px-6 border-b border-white/[0.03] bg-[#05060f]/60 backdrop-blur-3xl relative z-50">
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white/30 hover:text-white hover:bg-white/5 rounded-2xl">
                <ArrowLeft size={22} />
            </Button>
            <div className="text-center">
                <h1 className="text-[10px] font-black text-white/20 uppercase tracking-[4px]">Dispenser Node</h1>
                <p className="text-sm font-black text-white">ATM TERMINAL 001</p>
            </div>
            <Button variant="ghost" size="icon" className="text-white/20">
                <HelpCircle size={22} />
            </Button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-8 max-w-md mx-auto w-full relative pt-10">
            {/* Status Card */}
            <div className="bg-[#0a0c18] border border-white/[0.05] rounded-[2rem] p-6 flex items-center justify-between shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-50" />
                <div className="flex items-center gap-4 relative z-10">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg border border-primary/20">
                        <Wallet size={28} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-[2px] mb-1">Settlement Pending</p>
                        <h2 className="text-2xl font-black text-white tracking-tighter">₹{amount.toLocaleString()}</h2>
                    </div>
                </div>
                <div className="h-2 w-2 rounded-full bg-primary animate-ping" />
            </div>

            {stage !== 'success' ? (
                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                    <div className="space-y-4">
                         <div className="flex items-center justify-between px-2">
                             <p className="text-[10px] font-black text-white/10 uppercase tracking-[4px]">Internal Pipeline</p>
                             <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-primary animate-pulse">{stage === 'processing' ? 'SYNCING' : 'DISPENSING'}</span>
                             </div>
                         </div>
                        <div className="bg-[#0a0c18] border border-primary/20 rounded-[2rem] p-5 flex items-center justify-between shadow-[0_0_50px_rgba(139,92,246,0.05)]">
                             <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                                    <Smartphone size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-white tracking-tight uppercase">{stage === 'processing' ? 'Encryption Check' : 'Payout Slot Active'}</p>
                                    <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">{stage === 'processing' ? 'Verifying Node Signature' : 'Counting Banknotes'}</p>
                                </div>
                             </div>
                             <Timer size={18} className="text-primary animate-spin" />
                        </div>
                    </div>

                    {/* The ATM Machine / Slot Visual */}
                    <div className="bg-[#0a0c18] border border-white/[0.03] rounded-[3rem] p-10 flex flex-col items-center gap-10 shadow-2xl relative">
                        <div className="text-center space-y-1">
                            <h3 className={cn(
                                "text-sm font-black tracking-[3px] uppercase transition-colors duration-500",
                                stage === 'processing' ? "text-primary" : "text-green-400"
                            )}>
                                {stage === 'processing' ? "Securing Tunnel..." : "Extracting Assets"}
                            </h3>
                        </div>

                        {/* Payout Slot Container */}
                        <div className="relative w-full h-56 bg-[#030408] rounded-[2.5rem] border-[6px] border-[#12141d] shadow-[inset_0_0_60px_#000] flex items-center justify-center">
                            {/* Inner Slot shadow */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-14 bg-black rounded-xl border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,1)] z-0" />
                            
                            {/* Scanning Light Line */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-1 bg-primary/30 blur-[4px] rounded-full z-20 shadow-[0_0_20px_#8b5cf6] animate-pulse" />
                            
                            {/* Sequential Banknotes */}
                            {activeNotes.map((note) => (
                                <div 
                                    key={note.id}
                                    className="absolute left-1/2 top-1/2 -translate-x-1/2 z-10 animate-cash-fly"
                                >
                                    <div className={cn(
                                        "relative w-56 h-28 rounded-xl border-[3px] border-black/20 shadow-2xl flex flex-col p-4 overflow-hidden",
                                        note.value === 2000 
                                            ? "bg-gradient-to-br from-[#f8bbd0] via-[#f06292] to-[#c2185b] text-[#5e0d2b]" // 2000 Note Color
                                            : "bg-gradient-to-br from-[#e8f5e9] via-[#81c784] to-[#2e7d32] text-[#1b5e20]" // 500 Note Color
                                    )}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black">₹{note.value}</span>
                                                <span className="text-[6px] font-black uppercase opacity-60">Reserve Bank of Grow Money</span>
                                            </div>
                                            <div className="w-14 h-14 rounded-full border border-black/10 bg-white/20 blur-[1px] flex items-center justify-center">
                                                <CircleDot size={20} className="opacity-10" />
                                            </div>
                                        </div>
                                        <div className="mt-auto flex justify-between items-end">
                                            <div className="w-10 h-10 rounded-full border border-black/10 bg-white/30" />
                                            <div className="text-right">
                                                <p className="text-[7px] font-black uppercase tracking-tighter opacity-60">Guaranteed Asset</p>
                                                <p className="text-[9px] font-black tracking-widest">{transactionId.slice(-6)}</p>
                                            </div>
                                        </div>
                                        {/* Security Strip */}
                                        <div className="absolute top-0 bottom-0 left-[20%] w-2 bg-black/10 backdrop-blur-sm border-x border-black/5" />
                                        <div className="absolute inset-0 bg-white/5 opacity-5 pointer-events-none" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex items-center gap-4 w-full">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <ShieldCheck size={20} />
                            </div>
                            <p className="text-[9px] text-white/20 leading-relaxed font-black uppercase tracking-widest">Transaction secured via bank-grade encryption nodes</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-10 duration-1000">
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="h-28 w-28 rounded-[3rem] bg-green-500/10 flex items-center justify-center border border-green-500/20 shadow-[0_0_80px_rgba(34,197,94,0.2)]">
                            <CheckCircle2 size={56} className="text-green-500 animate-in zoom-in-0 duration-700" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-4xl font-black text-white tracking-tighter uppercase">PROTOCOL SUCCESS</h3>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[5px]">Assets dispatched successfully</p>
                        </div>
                    </div>

                    <div className="bg-[#0a0c18] border border-white/[0.05] rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-green-500/40 shadow-[0_0_20px_#22c55e]" />
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Protocol Node ID</span>
                            <span className="text-xs font-black text-white/80 font-mono">#{transactionId}</span>
                        </div>
                        <div className="h-px bg-white/[0.03]" />
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Final Dispatch</span>
                            <span className="text-2xl font-black text-green-400 tracking-tighter">₹{amount.toLocaleString()}</span>
                        </div>
                         <div className="h-px bg-white/[0.03]" />
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">System Timestamp</span>
                            <span className="text-[10px] font-bold text-white/60">{currentTime}</span>
                        </div>
                    </div>

                    <div className="pt-8">
                        <Button 
                            onClick={onClose}
                            className="w-full h-16 rounded-[1.5rem] font-black bg-white text-black shadow-2xl shadow-white/5 hover:bg-primary hover:text-white transition-all text-lg uppercase tracking-widest"
                        >
                            Collect Assets
                        </Button>
                    </div>
                </div>
            )}
        </main>
    </div>
  );
}
