'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Sparkles, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';

type CashDispenseAnimationProps = {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
};

export function CashDispenseAnimation({ isOpen, onClose, amount }: CashDispenseAnimationProps) {
  const [stage, setState] = useState<'idle' | 'processing' | 'dispensing' | 'success'>('idle');

  useEffect(() => {
    if (isOpen) {
      setState('processing');
      // Step 1: Processing delay
      setTimeout(() => setState('dispensing'), 1500);
      // Step 2: Animation duration
      setTimeout(() => setState('success'), 4500);
    } else {
      setState('idle');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md transition-all duration-500 animate-in fade-in">
      <div className="relative w-full max-w-sm px-6 flex flex-col items-center">
        
        {/* ATM Design Box */}
        <div className="relative w-full aspect-[4/5] bg-gradient-to-br from-slate-900 to-black rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col items-center justify-between py-12">
            
            {/* Screen Header */}
            <div className="w-[80%] h-32 rounded-3xl bg-[#030408] border border-primary/20 shadow-[inset_0_0_20px_rgba(139,92,246,0.2)] flex flex-col items-center justify-center p-4 text-center">
                {stage === 'processing' && (
                    <div className="space-y-2">
                        <div className="h-1.5 w-24 bg-white/5 rounded-full overflow-hidden mx-auto">
                            <div className="h-full bg-primary animate-shimmer w-full" style={{ backgroundSize: '200% 100%' }} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[3px] text-primary animate-pulse">Processing Node</p>
                    </div>
                )}
                {stage === 'dispensing' && (
                    <p className="text-[10px] font-black uppercase tracking-[4px] text-green-400 animate-pulse">Dispensing Assets</p>
                )}
                {stage === 'success' && (
                    <div className="animate-in zoom-in-95 duration-500">
                        <CheckCircle2 className="text-green-500 h-10 w-10 mx-auto mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-[3px] text-white">Transaction Verified</p>
                    </div>
                )}
            </div>

            {/* ATM Dispense Slot */}
            <div className="relative w-[70%] h-4 bg-[#0a0a0f] rounded-full border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.8),inset_0_0_10px_#000]">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/[0.02]" />
                
                {/* Cash Notes Animation */}
                {stage === 'dispensing' && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none">
                        {[...Array(6)].map((_, i) => (
                            <div 
                                key={i}
                                className="absolute left-1/2 top-0 w-32 h-16 rounded-sm border border-black/10 shadow-xl animate-cash-fly"
                                style={{ 
                                    animationDelay: `${i * 0.4}s`,
                                    background: amount >= 2000 ? 'linear-gradient(45deg, #fbcfe8, #f472b6)' : 'linear-gradient(45deg, #dcfce7, #4ade80)',
                                    zIndex: 10 - i
                                }}
                            >
                                <div className="absolute inset-0 flex items-center justify-center font-black text-black/20 text-xs">
                                    ₹{amount >= 2000 ? '2000' : '500'}
                                </div>
                                <div className="absolute top-1 left-1 bottom-1 right-1 border border-black/5 rounded-sm" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ATM Footer Panel */}
            <div className="w-[80%] flex justify-center gap-4">
                <div className="h-1.5 w-1.5 rounded-full bg-red-500/50" />
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500/50" />
            </div>
        </div>

        {/* Status Text Footer */}
        <div className="mt-12 text-center space-y-4 w-full">
            {stage === 'success' ? (
                <>
                    <div className="space-y-1 animate-in slide-in-from-bottom-2">
                        <h3 className="text-2xl font-black text-white tracking-tighter">SUCCESSFUL!</h3>
                        <p className="text-xs text-white/40 font-bold uppercase tracking-widest">₹{amount.toFixed(2)} Dispatched to your Node</p>
                    </div>
                    <Button 
                        onClick={onClose}
                        className="w-full h-14 rounded-2xl font-black bg-white text-black hover:bg-white/90 shadow-2xl"
                    >
                        COLLECT ASSETS
                    </Button>
                </>
            ) : (
                <div className="flex flex-col items-center gap-2 opacity-40">
                    <Sparkles className="animate-spin text-primary" size={20} />
                    <p className="text-[10px] font-black uppercase tracking-[5px] text-white">Synchronizing Secure Payout</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}