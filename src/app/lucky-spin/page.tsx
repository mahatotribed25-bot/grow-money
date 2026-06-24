
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { doc, runTransaction, serverTimestamp, collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronLeft, Home, Briefcase, Trophy, HandCoins, User, Zap, Wallet, History, Sparkles, Coins } from 'lucide-react';
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

    const handleSpin = async () => {
        if (!user || isSpinning || !userData) return;
        if (userData.walletBalance < spinCost) {
            toast({ title: "Insufficient Balance", description: `You need ₹${spinCost} to spin the wheel.`, variant: "destructive" });
            return;
        }

        setIsSpinning(true);
        setResult(null);

        // Calculate a random slice (8 slices total)
        const sliceIndex = Math.floor(Math.random() * 8);
        const prize = rewards[sliceIndex];
        
        // Spinning animation logic
        const extraDegrees = 360 * 5; // 5 full rotations
        const sliceDegrees = 360 / 8;
        const targetRotation = rotation + extraDegrees + (sliceIndex * sliceDegrees) + (sliceDegrees / 2);
        
        setRotation(targetRotation);

        // Wait for animation to finish (3 seconds)
        setTimeout(async () => {
            try {
                await runTransaction(firestore, async (transaction) => {
                    const userRef = doc(firestore, 'users', user.uid);
                    const historyRef = doc(collection(firestore, 'users', user.uid, 'walletHistory'));
                    
                    const uDoc = await transaction.get(userRef);
                    if (!uDoc.exists()) throw new Error("User not found");
                    
                    const currentBalance = uDoc.data().walletBalance || 0;
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
                    toast({ title: "Big Win!", description: `Congratulations! You won ₹${prize}.` });
                } else {
                    toast({ title: "Better Luck Next Time", description: "Try again to win big!" });
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsSpinning(false);
            }
        }, 3000);
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
                    <Zap className="text-yellow-400" size={20} /> Lucky Spin
                </h1>
                <div className="w-9" />
            </header>

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center space-y-10 max-w-lg mx-auto w-full">
                
                <div className="text-center space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[5px] text-white/30">Spin & Payout</p>
                    <h2 className="text-4xl font-black text-white tracking-tighter">Mega Wheel</h2>
                </div>

                <div className="relative">
                    {/* The Needle/Pointer */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 filter drop-shadow-2xl">
                        <div className="w-8 h-10 bg-primary clip-triangle rotate-180 border-2 border-white/20" 
                             style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                    </div>

                    {/* The Wheel */}
                    <div 
                        ref={wheelRef}
                        className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full border-[10px] border-white/5 shadow-[0_0_80px_rgba(var(--primary),0.3)] overflow-hidden transition-transform duration-[3000ms] ease-out"
                        style={{ transform: `rotate(-${rotation}deg)` }}
                    >
                        {rewards.map((prize, i) => (
                            <div 
                                key={i}
                                className="absolute top-0 left-0 w-full h-full"
                                style={{ 
                                    transform: `rotate(${i * 45}deg)`,
                                    background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(139,92,246,0.1)',
                                    clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 50%)'
                                }}
                            >
                                <div className="absolute top-[20%] left-[65%] -translate-x-1/2 -rotate-[67deg] flex flex-col items-center gap-1">
                                    <span className="text-xs font-black text-white/80">₹{prize}</span>
                                    <Coins size={10} className="text-yellow-400/40" />
                                </div>
                            </div>
                        ))}
                        {/* Center Hub */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#030408] border-4 border-white/10 flex items-center justify-center z-20 shadow-2xl">
                             <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        </div>
                    </div>
                </div>

                <div className="w-full space-y-6">
                    <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-3xl p-6 text-center">
                        <div className="flex justify-between items-center mb-6 px-2">
                            <div className="text-left">
                                <p className="text-[10px] text-white/20 uppercase font-black tracking-widest">Entry Fee</p>
                                <p className="text-xl font-black text-white">₹{spinCost}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-white/20 uppercase font-black tracking-widest">Your Balance</p>
                                <p className="text-xl font-black text-primary">₹{userData?.walletBalance.toFixed(2)}</p>
                            </div>
                        </div>

                        <Button 
                            onClick={handleSpin} 
                            disabled={isSpinning}
                            className={cn(
                                "w-full h-14 rounded-2xl font-black text-lg shadow-2xl transition-all duration-300",
                                isSpinning ? "bg-white/5 text-white/20 scale-95" : "bg-primary text-white hover:scale-105 shadow-primary/20"
                            )}
                        >
                            {isSpinning ? "SPINNING..." : "LAUNCH SPIN"}
                        </Button>
                    </Card>

                    <div className="flex items-center justify-center gap-4 text-white/20">
                         <div className="flex items-center gap-1.5">
                            <ShieldCheck size={14} />
                            <span className="text-[9px] font-bold uppercase tracking-widest">Verified RNG</span>
                         </div>
                         <div className="h-3 w-px bg-white/5" />
                         <div className="flex items-center gap-1.5">
                            <Sparkles size={14} />
                            <span className="text-[9px] font-bold uppercase tracking-widest">Instant Credit</span>
                         </div>
                    </div>
                </div>
            </main>

            <nav className="sticky bottom-0 z-20 border-t border-white/[0.05] bg-black/40 backdrop-blur-xl">
                <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs font-medium">
                    <BottomNavItem icon={Home} label="Home" href="/dashboard" />
                    <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
                    <BottomNavItem icon={Trophy} label="Leaders" href="/leaderboard" />
                    <BottomNavItem icon={HandCoins} label="Loans" href="/my-loans" />
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
