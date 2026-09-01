
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
          // Dispense notes one by one
          for (let i = 0; i < 5; i++) {
              setTimeout(() => {
                  setActiveNotes(prev => [...prev, { id: i, delay: i * 200 }]);
              }, i * 800); // 800ms between each note for sequential feel
          }
      }, 2000);
      
      const t2 = setTimeout(() => setStage('success'), 7000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#020306] flex flex-col animate-in fade-in duration-300 overflow-hidden">
        <header className="flex h-16 items-center justify-between px-6 border-b border-white/5 relative z-50">
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white/70">
                <ArrowLeft size={20} />
            </Button>
            <h1 className="text-lg font-bold text-white tracking-tight uppercase">ATM Terminal</h1>
            <Button variant="ghost" size="icon" className="text-white/40">
                <HelpCircle size={20} />
            </Button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-8 max-w-md mx-auto w-full relative">
            <div className="bg-[#0a0c18] border border-white/5 rounded-3xl p-5 flex items-center justify-between shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-50" />
                <div className="flex items-center gap-4 relative z-10">
                    <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-lg border border-primary/20">
                        <Wallet size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-0.5">Projected Balance</p>
                        <div className="flex items-baseline gap-2">
                             <h2 className="text-2xl font-black text-white">₹{(walletBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
                        </div>
                    </div>
                </div>
                <Eye size={18} className="text-white/20 relative z-10" />
            </div>

            {stage !== 'success' ? (
                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                    <div className="space-y-4">
                        <p className="text-[11px] font-black text-white/20 uppercase tracking-[3px]">System Pipeline</p>
                        <div className="bg-[#0a0c18] border border-primary/40 rounded-3xl p-5 flex items-center justify-between shadow-[0_0_30px_rgba(139,92,246,0.1)]">
                             <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                                    <Smartphone size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-white tracking-tight uppercase">Dispenser active</p>
                                    <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">{stage === 'processing' ? 'Authenticating Node' : 'Extracting Assets'}</p>
                                </div>
                             </div>
                             <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/20">
                                <Timer size={16} className="text-primary animate-spin" />
                             </div>
                        </div>
                    </div>

                    <div className="bg-[#0a0c18] border border-white/5 rounded-[2.5rem] p-10 flex flex-col items-center gap-12 shadow-2xl relative">
                        <div className="text-center space-y-1">
                            <h3 className={cn(
                                "text-lg font-black tracking-[2px] uppercase transition-colors duration-500",
                                stage === 'processing' ? "text-primary" : "text-green-400"
                            )}>
                                {stage === 'processing' ? "Securing Node..." : "Collecting Assets"}
                            </h3>
                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{stage === 'processing' ? "Encryption check in progress" : "Counting physical currency stack"}</p>
                        </div>

                        <div className="relative w-full h-52 bg-[#030408] rounded-[2.5rem] border-4 border-[#12141d] shadow-[inset_0_0_40px_#000] flex items-center justify-center overflow-visible">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-1 bg-primary/40 blur-[6px] rounded-full z-20 shadow-[0_0_20px_#8b5cf6]" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-16 bg-black rounded-2xl border border-white/5 shadow-inner" />
                            
                            {activeNotes.map((note) => (
                                <div 
                                    key={note.id}
                                    className="absolute left-1/2 top-1/2 -translate-x-1/2 z-10 animate-cash-fly"
                                >
                                    <div className={cn(
                                        "relative w-52 h-28 rounded-xl border-2 border-black/20 shadow-2xl flex flex-col p-3 overflow-hidden",
                                        amount >= 2000 ? "bg-gradient-to-br from-pink-200 to-pink-500" : "bg-gradient-to-br from-green-200 to-green-500"
                                    )}>
                                        <div className="flex justify-between items-start">
                                            <span className="text-[10px] font-black text-black/50">₹{amount >= 2000 ? '2000' : '500'}</span>
                                            <div className="w-12 h-16 rounded-full border border-black/10 bg-white/20 blur-[1px]" />
                                        </div>
                                        <div className="mt-auto flex justify-between items-end">
                                            <div className="w-8 h-8 rounded-full border border-black/10 bg-white/20" />
                                            <span className="text-[9px] font-black text-black/50 uppercase tracking-tighter">Grow Money Bank</span>
                                        </div>
                                        <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/texture/200/100')] opacity-5 mix-blend-overlay" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 flex items-center gap-4 w-full">
                            <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20">
                                <ShieldCheck size={20} />
                            </div>
                            <p className="text-[10px] text-white/30 leading-relaxed font-black uppercase tracking-widest">Transaction secured via bank-grade encryption nodes</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-10 duration-1000">
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="h-24 w-24 rounded-[2.5rem] bg-green-500/20 flex items-center justify-center border border-green-500/20 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                            <CheckCircle2 size={48} className="text-green-500 animate-in zoom-in-0 duration-500" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-3xl font-black text-white tracking-tighter uppercase">Protocol Success</h3>
                            <p className="text-[11px] font-black text-white/30 uppercase tracking-[4px]">Assets dispatched successfully</p>
                        </div>
                    </div>

                    <div className="bg-[#0a0c18] border border-white/5 rounded-[2rem] p-8 space-y-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-green-500/40" />
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Protocol Node ID</span>
                            <span className="text-sm font-black text-white/80 font-mono tracking-tighter">#{transactionId}</span>
                        </div>
                        <div className="h-px bg-white/5" />
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Final Amount</span>
                            <span className="text-lg font-black text-green-400 tracking-tighter">₹{amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                         <div className="h-px bg-white/5" />
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Settled On</span>
                            <span className="text-[11px] font-bold text-white/60">{currentTime}</span>
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
