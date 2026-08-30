'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { 
    CheckCircle2, 
    Sparkles, 
    Wallet, 
    ShieldCheck, 
    Timer, 
    ArrowLeft, 
    HelpCircle, 
    Eye,
    ChevronRight,
    Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type CashDispenseAnimationProps = {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  walletBalance: number;
};

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

  useEffect(() => {
    if (isOpen) {
      setStage('processing');
      const t1 = setTimeout(() => setStage('dispensing'), 2000);
      const t2 = setTimeout(() => setStage('success'), 5000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#020306] flex flex-col animate-in fade-in duration-300">
        {/* Header */}
        <header className="flex h-16 items-center justify-between px-6 border-b border-white/5">
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white/70">
                <ArrowLeft size={20} />
            </Button>
            <h1 className="text-lg font-bold text-white">Withdraw</h1>
            <Button variant="ghost" size="icon" className="text-white/40">
                <HelpCircle size={20} />
            </Button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-8 max-w-md mx-auto w-full">
            {/* Wallet Balance Display */}
            <div className="bg-[#0a0c18] border border-white/5 rounded-3xl p-5 flex items-center justify-between shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-50" />
                <div className="flex items-center gap-4 relative z-10">
                    <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-lg border border-primary/20">
                        <Wallet size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-0.5">Your Wallet Balance</p>
                        <div className="flex items-baseline gap-2">
                             <h2 className="text-2xl font-black text-white">₹{(walletBalance - (stage === 'success' ? amount : 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
                        </div>
                        {stage === 'success' && <p className="text-[10px] text-green-400 font-bold uppercase mt-1 animate-pulse">Updated Balance</p>}
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="text-white/20 relative z-10">
                    <Eye size={18} />
                </Button>
            </div>

            {/* Stage Dependent Content */}
            {stage !== 'success' ? (
                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                    <div className="space-y-4">
                        <p className="text-[11px] font-black text-white/20 uppercase tracking-[2px]">Withdraw Method</p>
                        <div className="bg-[#0a0c18] border border-primary/40 rounded-3xl p-5 flex items-center justify-between shadow-[0_0_20px_rgba(139,92,246,0.1)]">
                             <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                                    <Smartphone size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">ATM Cash</p>
                                    <p className="text-[10px] text-white/30 font-medium">Withdraw via ATM</p>
                                </div>
                             </div>
                             <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
                                <CheckCircle2 size={14} className="text-white" />
                             </div>
                        </div>
                    </div>

                    <div className="bg-[#0a0c18] border border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center gap-10 shadow-2xl relative">
                        <div className="text-center space-y-1">
                            <h3 className={cn(
                                "text-lg font-black tracking-tight uppercase",
                                stage === 'processing' ? "text-primary" : "text-green-400"
                            )}>
                                {stage === 'processing' ? "Processing Withdrawal" : "Cash Dispensed"}
                            </h3>
                            <p className="text-xs text-white/30">{stage === 'processing' ? "Please wait while we dispense your cash" : "Please collect your cash"}</p>
                            {stage === 'processing' && (
                                <div className="flex justify-center gap-1.5 mt-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                                </div>
                            )}
                        </div>

                        {/* ATM Slot Body */}
                        <div className="relative w-full h-48 bg-[#030408] rounded-[2rem] border-4 border-[#12141d] shadow-[inset_0_0_30px_#000] flex items-center justify-center overflow-hidden">
                            {/* The Slot */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-1 bg-primary/40 blur-[4px] rounded-full z-20 shadow-[0_0_15px_#8b5cf6]" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-14 bg-black rounded-xl border border-white/5 shadow-inner" />
                            
                            {/* Cash Dispensing Animation */}
                            {stage === 'dispensing' && (
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 z-10 animate-in slide-in-from-top-1/2 duration-1000">
                                    <div className="relative w-56 h-28 perspective-1000">
                                        <div className={cn(
                                            "w-full h-full rounded-lg border-2 border-black/20 shadow-2xl flex flex-col p-2 overflow-hidden",
                                            amount >= 2000 ? "bg-gradient-to-br from-pink-200 to-pink-400" : "bg-gradient-to-br from-green-200 to-green-400"
                                        )}>
                                            <div className="flex justify-between items-start">
                                                <span className="text-[10px] font-black text-black/40">₹{amount >= 2000 ? '2000' : '500'}</span>
                                                <div className="w-12 h-16 rounded-full border border-black/5 bg-white/20" />
                                            </div>
                                            <div className="mt-auto flex justify-between items-end">
                                                <div className="w-8 h-8 rounded-full border border-black/5 bg-white/20" />
                                                <span className="text-[10px] font-black text-black/40">BANK OF GROW</span>
                                            </div>
                                            {/* Gandhi-ish circle */}
                                            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-16 h-20 rounded-full border border-black/10 bg-white/5 flex items-center justify-center font-black text-black/5 text-[8px]">NPCI</div>
                                        </div>
                                        {/* Multi-layered stack shadow */}
                                        <div className="absolute top-1 left-1 -z-10 w-full h-full bg-black/20 rounded-lg" />
                                        <div className="absolute top-2 left-2 -z-20 w-full h-full bg-black/10 rounded-lg" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {stage === 'processing' && (
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4 w-full">
                                <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-white/30">
                                    <ShieldCheck size={20} />
                                </div>
                                <p className="text-[10px] text-white/40 leading-relaxed font-bold uppercase tracking-tight">Please take your cash from the ATM within 30 seconds</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-700">
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="h-20 w-20 rounded-[2rem] bg-green-500/20 flex items-center justify-center border border-green-500/20 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
                            <CheckCircle2 size={40} className="text-green-500 animate-in zoom-in-0 duration-500" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black text-white tracking-tighter">Transaction Successful</h3>
                            <p className="text-sm text-white/40 font-medium">₹{amount.toFixed(2)} has been withdrawn successfully</p>
                        </div>
                    </div>

                    <div className="bg-[#0a0c18] border border-white/5 rounded-3xl p-6 space-y-5 shadow-2xl">
                        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                            <span className="text-white/20">Transaction ID</span>
                            <span className="text-white/60 font-mono">#{transactionId}</span>
                        </div>
                        <div className="h-px bg-white/5" />
                        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                            <span className="text-white/20">Date & Time</span>
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
