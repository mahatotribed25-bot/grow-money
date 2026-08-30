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
    Timer
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
    delay: number;
}

export function CashDispenseAnimation({ isOpen, onClose, amount, walletBalance }: CashDispenseAnimationProps) {
  const [stage, setStage] = useState<'processing' | 'dispensing' | 'success'>('processing');
  const [transactionId] = useState(() => `GRW${Math.floor(100000000 + Math.random() * 900000000)}`);
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
      
      const t1 = setTimeout(() => {
          setStage('dispensing');
          // Add 5 notes one by one
          for (let i = 0; i < 5; i++) {
              setTimeout(() => {
                  setActiveNotes(prev => [...prev, { id: i, delay: i * 200 }]);
              }, i * 600);
          }
      }, 2000);
      
      const t2 = setTimeout(() => setStage('success'), 6500);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#020306] flex flex-col animate-in fade-in duration-300 overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between px-6 border-b border-white/5 relative z-50">
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white/70">
                <ArrowLeft size={20} />
            </Button>
            <h1 className="text-lg font-bold text-white">ATM Withdrawal</h1>
            <Button variant="ghost" size="icon" className="text-white/40">
                <HelpCircle size={20} />
            </Button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-8 max-w-md mx-auto w-full relative">
            {/* Wallet Balance Display */}
            <div className="bg-[#0a0c18] border border-white/5 rounded-3xl p-5 flex items-center justify-between shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-50" />
                <div className="flex items-center gap-4 relative z-10">
                    <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-lg border border-primary/20">
                        <Wallet size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-0.5">Updated Balance</p>
                        <div className="flex items-baseline gap-2">
                             <h2 className="text-2xl font-black text-white">₹{(walletBalance - (stage === 'success' ? amount : 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
                        </div>
                    </div>
                </div>
                <Eye size={18} className="text-white/20 relative z-10" />
            </div>

            {/* Stage Dependent Content */}
            {stage !== 'success' ? (
                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                    <div className="space-y-4">
                        <p className="text-[11px] font-black text-white/20 uppercase tracking-[2px]">Status Terminal</p>
                        <div className="bg-[#0a0c18] border border-primary/40 rounded-3xl p-5 flex items-center justify-between shadow-[0_0_20px_rgba(139,92,246,0.1)]">
                             <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                                    <Smartphone size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">ATM DISPENSER</p>
                                    <p className="text-[10px] text-white/30 font-medium">Stage: {stage.toUpperCase()}</p>
                                </div>
                             </div>
                             <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
                                <Timer size={14} className="text-white animate-spin" />
                             </div>
                        </div>
                    </div>

                    <div className="bg-[#0a0c18] border border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center gap-10 shadow-2xl relative">
                        <div className="text-center space-y-1">
                            <h3 className={cn(
                                "text-lg font-black tracking-tight uppercase transition-colors duration-500",
                                stage === 'processing' ? "text-primary" : "text-green-400"
                            )}>
                                {stage === 'processing' ? "Securing Node..." : "Collecting Assets"}
                            </h3>
                            <p className="text-xs text-white/30">{stage === 'processing' ? "Authenticating transaction protocol" : "Dispensing currency nodes"}</p>
                        </div>

                        {/* ATM Slot Body */}
                        <div className="relative w-full h-48 bg-[#030408] rounded-[2rem] border-4 border-[#12141d] shadow-[inset_0_0_30px_#000] flex items-center justify-center overflow-visible">
                            {/* The Slot Glow */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-1 bg-primary/40 blur-[4px] rounded-full z-20 shadow-[0_0_15px_#8b5cf6]" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-14 bg-black rounded-xl border border-white/5 shadow-inner" />
                            
                            {/* Cash Dispensing Animation - Note by Note */}
                            {activeNotes.map((note) => (
                                <div 
                                    key={note.id}
                                    className="absolute left-1/2 top-1/2 -translate-x-1/2 z-10 animate-cash-fly"
                                >
                                    <div className={cn(
                                        "relative w-48 h-24 rounded-lg border-2 border-black/20 shadow-2xl flex flex-col p-2 overflow-hidden",
                                        amount >= 2000 ? "bg-gradient-to-br from-pink-200 to-pink-400" : "bg-gradient-to-br from-green-200 to-green-400"
                                    )}>
                                        <div className="flex justify-between items-start">
                                            <span className="text-[9px] font-black text-black/40">₹{amount >= 2000 ? '2000' : '500'}</span>
                                            <div className="w-10 h-14 rounded-full border border-black/5 bg-white/20" />
                                        </div>
                                        <div className="mt-auto flex justify-between items-end">
                                            <div className="w-6 h-6 rounded-full border border-black/5 bg-white/20" />
                                            <span className="text-[8px] font-black text-black/40">GROW MONEY</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4 w-full">
                            <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-white/30">
                                <ShieldCheck size={20} />
                            </div>
                            <p className="text-[10px] text-white/40 leading-relaxed font-bold uppercase tracking-tight">Transaction encrypted with bank-grade security nodes</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-700">
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="h-20 w-20 rounded-[2rem] bg-green-500/20 flex items-center justify-center border border-green-500/20 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
                            <CheckCircle2 size={40} className="text-green-500 animate-in zoom-in-0 duration-500" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black text-white tracking-tighter">Withdrawal Complete</h3>
                            <p className="text-sm text-white/40 font-medium">₹{amount.toFixed(2)} has been successfully dispatched</p>
                        </div>
                    </div>

                    <div className="bg-[#0a0c18] border border-white/5 rounded-3xl p-6 space-y-5 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-green-500/40" />
                        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                            <span className="text-white/20">Protocol ID</span>
                            <span className="text-white/60 font-mono">#{transactionId}</span>
                        </div>
                        <div className="h-px bg-white/5" />
                        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                            <span className="text-white/20">Final Settlement</span>
                            <span className="text-white/60">{currentTime}</span>
                        </div>
                    </div>

                    <div className="pt-8">
                        <Button 
                            onClick={onClose}
                            className="w-full h-15 rounded-2xl font-black bg-primary text-white shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-lg"
                        >
                            Done
                        </Button>
                    </div>
                </div>
            )}
        </main>
    </div>
  );
}
