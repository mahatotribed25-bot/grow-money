'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useUser, useDoc, useFirestore, useCollection } from '@/firebase';
import { doc, runTransaction, serverTimestamp, collection, Timestamp, addDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Home, Briefcase, Trophy, HandCoins, User, PiggyBank, TrendingUp, ArrowUpRight, ArrowDownRight, Wallet, History, Timer, Info, Sparkles, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

type SavingsPlan = {
    id: string;
    name: string;
    dailyRate: number;
    minDeposit: number;
}

type UserSavings = {
    balance: number;
    totalInterestEarned: number;
    lastInterestCalculation: Timestamp;
    activePlanId: string;
}

type UserData = {
    walletBalance: number;
    name?: string;
}

export default function SavingsVaultPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const { data: userData } = useDoc<UserData>(user ? `users/${user.uid}` : null);
    const { data: savingsData, loading: savingsLoading } = useDoc<UserSavings>(user ? `users/${user.uid}/savings/main` : null);
    const { data: plans, loading: plansLoading } = useCollection<SavingsPlan>('savingsPlans');

    const [transferAmount, setTransferAmount] = useState('');
    const [isTransferInOpen, setIsTransferInOpen] = useState(false);
    const [isTransferOutOpen, setIsTransferOutOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const activePlan = useMemo(() => {
        if (!savingsData || !plans) return null;
        return plans.find(p => p.id === savingsData.activePlanId);
    }, [savingsData, plans]);

    // AUTO-INTEREST CALCULATION LOGIC
    const syncInterest = useCallback(async () => {
        if (!user || !savingsData || !activePlan || savingsData.balance <= 0) return;

        const now = new Date();
        const lastCalc = savingsData.lastInterestCalculation.toDate();
        const diffInMs = now.getTime() - lastCalc.getTime();
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInDays < 1) return; // Need at least 24 hours

        try {
            await runTransaction(firestore, async (transaction) => {
                const savingsRef = doc(firestore, `users/${user.uid}/savings/main`);
                const sDoc = await transaction.get(savingsRef);
                if (!sDoc.exists()) return;

                const currentData = sDoc.data() as UserSavings;
                const dailyRate = activePlan.dailyRate / 100;
                const interestEarned = currentData.balance * dailyRate * diffInDays;

                transaction.update(savingsRef, {
                    balance: currentData.balance + interestEarned,
                    totalInterestEarned: (currentData.totalInterestEarned || 0) + interestEarned,
                    lastInterestCalculation: serverTimestamp()
                });

                // Log to history
                const historyRef = doc(collection(firestore, `users/${user.uid}/walletHistory`));
                transaction.set(historyRef, {
                    amount: interestEarned,
                    type: 'credit',
                    category: 'Savings Interest',
                    description: `Daily accrued interest for ${diffInDays} days`,
                    createdAt: serverTimestamp()
                });
            });
            toast({ title: "Interest Accrued!", description: `₹${(savingsData.balance * (activePlan.dailyRate/100) * diffInDays).toFixed(2)} added to your vault.` });
        } catch (e) {
            console.error("Interest sync failed", e);
        }
    }, [user, savingsData, activePlan, firestore, toast]);

    useEffect(() => {
        if (savingsData && activePlan) syncInterest();
    }, [savingsData?.id, activePlan?.id]); // Run when data loads

    const handleTransferIn = async (plan: SavingsPlan) => {
        if (!user || !userData || isProcessing) return;
        const amt = parseFloat(transferAmount);
        
        if (amt < plan.minDeposit) {
            toast({ title: "Minimum Requirement", description: `You need at least ₹${plan.minDeposit} to activate this tier.`, variant: "destructive" });
            return;
        }

        if (userData.walletBalance < amt) {
            toast({ title: "Insufficient Balance", description: "Recharge your main wallet to transfer funds.", variant: "destructive" });
            return;
        }

        setIsProcessing(true);
        try {
            await runTransaction(firestore, async (transaction) => {
                const userRef = doc(firestore, 'users', user.uid);
                const savingsRef = doc(firestore, `users/${user.uid}/savings/main`);
                
                const uDoc = await transaction.get(userRef);
                const sDoc = await transaction.get(savingsRef);

                const currentBalance = uDoc.data()?.walletBalance || 0;
                const currentSavings = sDoc.exists() ? sDoc.data().balance : 0;

                transaction.update(userRef, { walletBalance: currentBalance - amt });
                
                const newSavingsData = {
                    balance: currentSavings + amt,
                    activePlanId: plan.id,
                    lastInterestCalculation: serverTimestamp(),
                    totalInterestEarned: sDoc.exists() ? sDoc.data().totalInterestEarned : 0
                };

                transaction.set(savingsRef, newSavingsData, { merge: true });

                // History
                const historyRef = doc(collection(firestore, `users/${user.uid}/walletHistory`));
                transaction.set(historyRef, {
                    amount: amt,
                    type: 'debit',
                    category: 'Vault Deposit',
                    description: `Transferred to ${plan.name}`,
                    createdAt: serverTimestamp()
                });
            });
            toast({ title: "Vault Activated!", description: `₹${amt} is now earning daily interest.` });
            setIsTransferInOpen(false);
            setTransferAmount('');
        } catch (e) {
            toast({ title: "Transfer Failed", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleTransferOut = async () => {
        if (!user || !savingsData || isProcessing) return;
        const amt = parseFloat(transferAmount);

        if (amt > savingsData.balance) {
            toast({ title: "Over Limit", description: "You cannot withdraw more than your savings balance.", variant: "destructive" });
            return;
        }

        setIsProcessing(true);
        try {
            await runTransaction(firestore, async (transaction) => {
                const userRef = doc(firestore, 'users', user.uid);
                const savingsRef = doc(firestore, `users/${user.uid}/savings/main`);
                
                const uDoc = await transaction.get(userRef);
                const sDoc = await transaction.get(savingsRef);

                const currentBalance = uDoc.data()?.walletBalance || 0;
                const currentSavings = sDoc.data()?.balance || 0;

                transaction.update(userRef, { walletBalance: currentBalance + amt });
                transaction.update(savingsRef, { 
                    balance: currentSavings - amt,
                });

                // History
                const historyRef = doc(collection(firestore, `users/${user.uid}/walletHistory`));
                transaction.set(historyRef, {
                    amount: amt,
                    type: 'credit',
                    category: 'Vault Withdrawal',
                    description: `Transferred back to main wallet`,
                    createdAt: serverTimestamp()
                });
            });
            toast({ title: "Capital Withdrawn", description: `₹${amt} returned to main wallet.` });
            setIsTransferOutOpen(false);
            setTransferAmount('');
        } catch (e) {
            toast({ title: "Transfer Failed", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full flex-col bg-background text-foreground relative z-10 pb-24">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.05] bg-black/40 px-4 backdrop-blur-xl sm:px-6">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white/70">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent flex items-center gap-2">
                    <PiggyBank className="text-primary" size={20} /> Savings Vault
                </h1>
                <div className="w-9" />
            </header>

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 max-w-4xl mx-auto w-full">
                
                {/* Savings Status Card */}
                <Card className="bg-gradient-to-br from-primary/20 via-card to-card border-primary/20 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                        <Sparkles size={120} className="text-primary" />
                    </div>
                    
                    <div className="relative z-10 space-y-8">
                        <div className="text-center space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-[5px] text-white/30">Vault Balance</p>
                            <h2 className="text-5xl font-black text-white tracking-tighter drop-shadow-2xl">
                                ₹{(savingsData?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </h2>
                            {activePlan && (
                                <Badge className="bg-primary/20 text-primary border-primary/20 text-[9px] font-black uppercase tracking-widest px-4 h-6">
                                    {activePlan.name} Node Active
                                </Badge>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Profits</p>
                                <p className="text-xl font-black text-green-400">₹{(savingsData?.totalInterestEarned || 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-right">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Current ROI</p>
                                <p className="text-xl font-black text-primary">+{activePlan?.dailyRate || 0}%<span className="text-[10px] ml-1">/day</span></p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button onClick={() => setIsTransferInOpen(true)} className="flex-1 h-14 rounded-2xl bg-white text-black font-black uppercase text-xs tracking-widest shadow-xl hover:bg-primary hover:text-white transition-all">
                                <ArrowUpRight size={18} className="mr-2" /> Top-up Vault
                            </Button>
                            <Button onClick={() => setIsTransferOutOpen(true)} variant="outline" className="flex-1 h-14 rounded-2xl border-white/10 bg-white/5 text-white font-black uppercase text-xs tracking-widest hover:bg-white/10">
                                <ArrowDownRight size={18} className="mr-2" /> Withdraw
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Info Note */}
                <div className="p-5 bg-blue-500/5 border border-blue-500/10 rounded-3xl flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                        <Info size={20} />
                    </div>
                    <div>
                        <h4 className="text-xs font-black uppercase text-white/80 tracking-widest mb-1">Protocol Logic</h4>
                        <p className="text-[11px] text-white/40 leading-relaxed font-medium">
                            Interest is calculated every 24 hours. Your balance must stay above the minimum tier requirement to keep earning. Withdrawing below the limit will pause the auto-accrual node.
                        </p>
                    </div>
                </div>

                {/* Tier Selection */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[5px] text-muted-foreground px-2">Available Tiers</h3>
                    {plansLoading ? (
                        <div className="py-10 flex flex-col items-center gap-3 opacity-20">
                            <Timer className="animate-spin" />
                            <p className="text-[10px] font-bold uppercase tracking-[4px]">Syncing Rates</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {plans?.map(plan => (
                                <Card key={plan.id} className={cn(
                                    "bg-white/[0.02] border-white/[0.08] hover:border-primary/40 transition-all rounded-3xl overflow-hidden group",
                                    activePlan?.id === plan.id && "border-primary/60 bg-primary/[0.03]"
                                )}>
                                    <CardContent className="p-6 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "h-12 w-12 rounded-2xl flex items-center justify-center border transition-all",
                                                activePlan?.id === plan.id ? "bg-primary/20 text-primary border-primary/20 shadow-lg shadow-primary/20" : "bg-white/5 text-white/20 border-white/5 group-hover:text-primary group-hover:border-primary/20"
                                            )}>
                                                <TrendingUp size={24} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-black text-white uppercase">{plan.name}</p>
                                                    {activePlan?.id === plan.id && <Badge className="bg-green-500/20 text-green-400 border-none text-[8px] h-4">ACTIVE</Badge>}
                                                </div>
                                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">ROI: {plan.dailyRate}% Daily • Min: ₹{plan.minDeposit}</p>
                                            </div>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            onClick={() => { setTransferAmount(plan.minDeposit.toString()); setIsTransferInOpen(true); }}
                                            className="h-10 px-6 rounded-xl font-bold uppercase text-[10px] text-primary hover:bg-primary hover:text-white"
                                        >
                                            Invest
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Transfer In Dialog */}
            <Dialog open={isTransferInOpen} onOpenChange={setIsTransferInOpen}>
                <DialogContent className="bg-[#030408]/90 backdrop-blur-3xl border-white/10 text-white rounded-[2.5rem] max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-center font-black uppercase">Capital Injection</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="bg-white/5 rounded-2xl p-5 border border-white/5 flex justify-between items-center">
                            <span className="text-[10px] font-black text-white/20 uppercase">Available Capital</span>
                            <span className="text-xl font-black">₹{userData?.walletBalance.toLocaleString()}</span>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-white/40 ml-1">Transfer Amount (INR)</Label>
                            <Input 
                                type="number" 
                                value={transferAmount} 
                                onChange={e => setTransferAmount(e.target.value)} 
                                className="h-14 bg-white/5 border-white/10 rounded-2xl text-2xl font-black text-primary text-center" 
                                placeholder="0.00"
                            />
                        </div>
                        <Button 
                            onClick={() => activePlan ? handleTransferIn(activePlan) : (plans?.[0] && handleTransferIn(plans[0]))} 
                            disabled={isProcessing || !transferAmount}
                            className="w-full h-16 rounded-[1.5rem] bg-primary text-white font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/40"
                        >
                            {isProcessing ? "Processing..." : "Commit Transfer"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Transfer Out Dialog */}
            <Dialog open={isTransferOutOpen} onOpenChange={setIsTransferOutOpen}>
                <DialogContent className="bg-[#030408]/90 backdrop-blur-3xl border-white/10 text-white rounded-[2.5rem] max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-center font-black uppercase">Withdraw Capital</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="bg-white/5 rounded-2xl p-5 border border-white/5 flex justify-between items-center">
                            <span className="text-[10px] font-black text-white/20 uppercase">Current Savings</span>
                            <span className="text-xl font-black">₹{savingsData?.balance.toLocaleString()}</span>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-white/40 ml-1">Withdrawal Amount (INR)</Label>
                            <Input 
                                type="number" 
                                value={transferAmount} 
                                onChange={e => setTransferAmount(e.target.value)} 
                                className="h-14 bg-white/5 border-white/10 rounded-2xl text-2xl font-black text-red-400 text-center" 
                                placeholder="0.00"
                            />
                        </div>
                        <Button 
                            onClick={handleTransferOut} 
                            disabled={isProcessing || !transferAmount}
                            className="w-full h-16 rounded-[1.5rem] bg-white text-black font-black uppercase tracking-widest text-xs shadow-2xl"
                        >
                            {isProcessing ? "Processing..." : "Return to Wallet"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/[0.05] bg-black/40 backdrop-blur-xl h-16 flex items-center justify-around px-4">
                <BottomNavItem icon={Home} label="Home" href="/dashboard" />
                <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
                <BottomNavItem icon={PiggyBank} label="Savings" href="/savings" active />
                <BottomNavItem icon={HandCoins} label="Loans" href="/my-loans" />
                <BottomNavItem icon={User} label="Profile" href="/profile" />
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
