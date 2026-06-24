'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { doc, runTransaction, serverTimestamp, collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, Home, Briefcase, Trophy, HandCoins, User, Zap, Wallet, History, Sparkles, Coins, ShieldCheck, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type AdminSettings = {
    spinCost?: number;
    spinRewards?: number[];
};

type UserData = {
    walletBalance: number;
    name?: string;
}

export default function LuckySpinPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { data: settings, loading: settingsLoading } = useDoc<AdminSettings>('settings/admin');
    const { data: userData, loading: userLoading } = useDoc<UserData>(user ? `users/${user.uid}` : null);

    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [result, setResult] = useState<number | null>(null);
    const wheelRef = useRef<HTMLDivElement>(null);

    const spinCost = settings?.spinCost || 0;
    const rewards = settings?.spinRewards || [0, 0, 0, 0, 0, 0, 0, 0];
    const canAfford = (userData?.walletBalance || 0) >= spinCost;

    const handleSpin = async () => {
        if (!user || isSpinning || !userData) return;
        
        if (!canAfford) {
            toast({ 
                title: "Insufficient Balance", 
                description: `You need ₹${spinCost} to spin the wheel. Please recharge your wallet.`, 
                variant: "destructive" 
            });
            return;
        }

        setIsSpinning(true);
        setResult(null);

        // Calculate a random slice (8 slices total)
        const sliceIndex = Math.floor(Math.random() * 8);
        const prize = rewards[sliceIndex];
        
        // Spinning animation logic: Full rotations + the specific slice center
        const fullRotations = 10; // More rotations for extra speed
        const sliceDegrees = 360 / 8;
        const targetRotation = rotation + (360 * fullRotations) + (sliceIndex * sliceDegrees) + (sliceDegrees / 2);
        
        setRotation(targetRotation);

        // Wait for animation to finish (4 seconds for smoother long spin)
        setTimeout(async () => {
            try {
                await runTransaction(firestore, async (transaction) => {
                    const userRef = doc(firestore, 'users', user.uid);
                    const historyRef = doc(collection(firestore, 'users', user.uid, 'walletHistory'));
                    
                    const uDoc = await transaction.get(userRef);
                    if (!uDoc.exists()) throw new Error("User not found");
                    
                    const currentBalance = uDoc.data().walletBalance || 0;
                    if (currentBalance < spinCost) throw new Error("Balance exhausted since spin started");
                    
                    const newBalance = currentBalance - spinCost + prize;

                    transaction.update(userRef, { walletBalance: newBalance });
                    
                    // Log the deduction
                    transaction.set(historyRef, {
                        amount: spinCost,
                        type: 'debit',
                        category: 'Lucky Spin',
                        description: `Wheel spin fee deducted`,
                        createdAt: serverTimestamp()
                    });

                    // If they won something, log the win
                    if (prize > 0) {
                        const winHistoryRef = doc(collection(firestore, 'users', user.uid, 'walletHistory'));
                        transaction.set(winHistoryRef, {
                            amount: prize,
                            type: 'credit',
                            category: 'Lucky Spin Win',
                            description: `Won ₹${prize} from the Lucky Wheel!`,
                            createdAt: serverTimestamp()
                        });
                    }
                });

                setResult(prize);
                if (prize > 0) {
                    toast({ 
                        title: "🎉 BIG WIN!", 
                        description: `Congratulations! You won ₹${prize}. Funds added to wallet.` 
                    });
                } else {
                    toast({ 
                        title: "Better Luck Next Time", 
                        description: "Don't give up! The next spin could be your big win." 
                    });
                }
            } catch (e: any) {
                toast({ title: "Transaction Error", description: e.message, variant: "destructive" });
            } finally {
                setIsSpinning(false);
            }
        }, 4000);
    };

    return (
        <div className="flex min-h-screen w-full flex-col bg-transparent text-foreground relative z-10">
            <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.05] bg-black/40 px-4 backdrop-blur-xl sm:px-6">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white/70">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent flex items-center gap-2">
                    <Zap className="text-yellow-400" size={20} /> Lucky Mega Spin
                </h1>
                <div className="w-9" />
            </header>

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center space-y-12 max-w-lg mx-auto w-full py-10">
                
                <div className="text-center space-y-2 relative">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
                        <Sparkles size={14} className="text-primary animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[5px] text-primary/60">Test Your Luck</span>
                        <Sparkles size={14} className="text-primary animate-pulse" />
                    </div>
                    <h2 className="text-5xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">₹ REWARD WHEEL</h2>
                </div>

                <div className="relative">
                    {/* The Needle/Pointer with better design */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-30 filter drop-shadow-[0_10px_20px_rgba(139,92,246,0.5)]">
                        <div className="w-10 h-12 bg-gradient-to-b from-primary to-purple-800 clip-triangle rotate-180 border-2 border-white/40 shadow-inner" 
                             style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_#fff]" />
                    </div>

                    {/* Outer Neon Ring */}
                    <div className="absolute inset-[-15px] rounded-full border-4 border-primary/20 blur-xl animate-pulse" />
                    <div className="absolute inset-[-8px] rounded-full border-2 border-primary/30" />

                    {/* The Wheel */}
                    <div 
                        ref={wheelRef}
                        className="relative w-72 h-72 sm:w-85 sm:h-85 rounded-full border-[12px] border-[#1a1b23] shadow-[0_0_100px_rgba(139,92,246,0.2),inset_0_0_20px_rgba(0,0,0,0.8)] overflow-hidden transition-transform duration-[4000ms] cubic-bezier(0.15, 0, 0.15, 1)"
                        style={{ transform: `rotate(-${rotation}deg)` }}
                    >
                        {rewards.map((prize, i) => (
                            <div 
                                key={i}
                                className="absolute top-0 left-0 w-full h-full"
                                style={{ 
                                    transform: `rotate(${i * 45}deg)`,
                                    background: i % 2 === 0 
                                        ? 'linear-gradient(to bottom right, #0d0e14, #1a1b23)' 
                                        : 'linear-gradient(to bottom right, #1a1b23, #25262e)',
                                    clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 50%)',
                                    border: '1px solid rgba(255,255,255,0.02)'
                                }}
                            >
                                <div className="absolute top-[18%] left-[68%] -translate-x-1/2 -rotate-[68deg] flex flex-col items-center gap-1 group">
                                    <span className={cn(
                                        "text-[13px] font-black tracking-tighter drop-shadow-md",
                                        prize > 0 ? "text-yellow-400" : "text-white/20"
                                    )}>
                                        ₹{prize}
                                    </span>
                                    {prize > 0 && <Coins size={12} className="text-yellow-400/30 animate-bounce delay-100" />}
                                </div>
                            </div>
                        ))}
                        
                        {/* Decorative Slice Dividers */}
                        {[0,1,2,3,4,5,6,7].map(i => (
                            <div key={i} className="absolute top-1/2 left-1/2 w-full h-px bg-white/[0.03] origin-left" style={{ transform: `rotate(${i * 45}deg)` }} />
                        ))}

                        {/* Center Hub */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-[#0d0e14] border-[6px] border-[#1a1b23] flex items-center justify-center z-20 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                             <div className="w-4 h-4 rounded-full bg-primary shadow-[0_0_15px_rgba(139,92,246,1)] animate-pulse" />
                             <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent to-white/5" />
                        </div>
                    </div>
                </div>

                <div className="w-full space-y-6">
                    <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-3xl rounded-[2.5rem] p-8 text-center relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                        
                        <div className="flex justify-between items-center mb-8 px-2">
                            <div className="text-left space-y-1">
                                <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Entry Tickets</p>
                                <p className="text-2xl font-black text-white tracking-tighter">₹{spinCost}</p>
                            </div>
                            <div className="text-right space-y-1">
                                <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Your Credit</p>
                                <p className={cn(
                                    "text-2xl font-black tracking-tighter",
                                    canAfford ? "text-primary" : "text-red-400"
                                )}>₹{userData?.walletBalance.toFixed(2)}</p>
                            </div>
                        </div>

                        {!canAfford && !isSpinning && (
                            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-bottom-2">
                                <AlertCircle size={18} className="shrink-0" />
                                <p className="text-xs font-bold text-left leading-relaxed">Insufficient wallet balance to play. Please recharge to continue.</p>
                            </div>
                        )}

                        <Button 
                            onClick={handleSpin} 
                            disabled={isSpinning || !canAfford}
                            className={cn(
                                "w-full h-16 rounded-[1.5rem] font-black text-xl shadow-2xl transition-all duration-500 relative group overflow-hidden",
                                isSpinning 
                                    ? "bg-white/5 text-white/20 scale-95" 
                                    : !canAfford 
                                        ? "bg-white/5 text-white/10 cursor-not-allowed border-white/5"
                                        : "bg-primary text-white hover:scale-[1.03] active:scale-95 shadow-primary/20"
                            )}
                        >
                            {isSpinning && (
                                <div className="absolute inset-0 bg-primary/20 animate-pulse" />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                                {isSpinning ? "CALCULATING DESTINY..." : !canAfford ? "LOW BALANCE" : "LAUNCH SPIN"}
                                {!isSpinning && canAfford && <Zap size={20} className="fill-current" />}
                            </span>
                        </Button>
                        
                        <p className="mt-4 text-[9px] font-bold text-white/20 uppercase tracking-[3px]">Game ID: #SPIN-{new Date().getTime().toString().slice(-6)}</p>
                    </Card>

                    <div className="flex items-center justify-center gap-5 text-white/20">
                         <div className="flex items-center gap-2">
                            <ShieldCheck size={16} className="text-green-500/50" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Verified RNG</span>
                         </div>
                         <div className="h-4 w-px bg-white/10" />
                         <div className="flex items-center gap-2">
                            <HandCoins size={16} className="text-primary/50" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Instant Auto-Credit</span>
                         </div>
                    </div>
                </div>
            </main>

            <nav className="sticky bottom-0 z-20 border-t border-white/[0.05] bg-black/40 backdrop-blur-xl">
                <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs font-medium">
                    <BottomNavItem icon={Home} label="Home" href="/dashboard" />
                    <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
                    <BottomNavItem icon={Trophy} label="Leaders" href="/leaderboard" />
                    <BottomNavItem icon={HandCoins} label="My Loans" href="/my-loans" />
                    <BottomNavItem icon={User} label="Profile" href="/profile" />
                </div>
            </nav>
        </div>
    );
}

function BottomNavItem({ icon: Icon, label, href, active = false }: { icon: React.ElementType, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={cn(
        "flex flex-col items-center justify-center gap-1 transition-all h-full relative",
        active ? 'text-primary scale-110' : 'text-white/40 hover:text-white/60'
    )}>
      <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]")} />
      <span className="text-[10px] tracking-tight">{label}</span>
      {active && <div className="absolute -bottom-1 h-1 w-8 bg-primary rounded-full blur-[2px]" />}
    </Link>
  );
}
