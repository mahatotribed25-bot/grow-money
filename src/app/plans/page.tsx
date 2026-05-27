'use client';

import {
  ChevronLeft,
  Home,
  User,
  Briefcase,
  TrendingUp,
  Users as UsersIcon,
  HandCoins,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';

type InvestmentPlan = {
  id: string;
  name: string;
  price: number;
  dailyIncome: number;
  validity: number;
  totalIncome: number;
  finalReturn: number;
  status: 'Available' | 'Coming Soon';
  stock?: number;
  adminProfit?: number;
};

type UserData = {
    walletBalance: number;
    referredBy?: string;
    totalInvestment?: number;
    vipLevel?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
}

type AdminSettings = {
    vipTiers?: {
        silver: number;
        gold: number;
        platinum: number;
    }
}

export default function PlansPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const { data: plans, loading } = useCollection<InvestmentPlan>('investmentPlans');
  const { data: userData } = useDoc<UserData>(user ? `users/${user.uid}`: null);
  const { data: adminSettings } = useDoc<AdminSettings>('settings/admin');

  const handleInvest = (plan: InvestmentPlan) => {
    if (!user || !userData) {
        toast({ variant: 'destructive', title: 'You must be logged in.' });
        return;
    }
    
    if (plan.status !== 'Available' || (plan.stock !== undefined && plan.stock <= 0)) {
        toast({ variant: 'destructive', title: 'Plan Not Available', description: 'This plan is either not available or out of stock.' });
        return;
    }

    const planPrice = plan.price || 0;

    if (userData.walletBalance < planPrice) {
        toast({ variant: 'destructive', title: 'Insufficient Balance', description: 'Please recharge your wallet to invest.' });
        return;
    }

    runTransaction(firestore, async (transaction) => {
        const userRef = doc(firestore, 'users', user.uid);
        const planRef = doc(firestore, 'investmentPlans', plan.id);
        const settingsRef = doc(firestore, 'settings', 'admin');

        const userDoc = await transaction.get(userRef);
        const planDoc = await transaction.get(planRef);
        const settingsDoc = await transaction.get(settingsRef);

        if (!userDoc.exists()) throw new Error("User does not exist");
        if (!planDoc.exists()) throw new Error("Plan does not exist");

        const currentStock = planDoc.data().stock;
        if (currentStock !== undefined && currentStock <= 0) {
            throw new Error("Plan is out of stock.");
        }

        if (currentStock !== undefined) {
            transaction.update(planRef, { stock: currentStock - 1 });
        }

        const newWalletBalance = (userDoc.data().walletBalance || 0) - planPrice;
        const newTotalInvestment = (userDoc.data().totalInvestment || 0) + planPrice;
        
        let newVipLevel = userDoc.data().vipLevel || 'Bronze';
        if (adminSettings?.vipTiers) {
            if (newTotalInvestment >= adminSettings.vipTiers.platinum) {
                newVipLevel = 'Platinum';
            } else if (newTotalInvestment >= adminSettings.vipTiers.gold) {
                newVipLevel = 'Gold';
            } else if (newTotalInvestment >= adminSettings.vipTiers.silver) {
                newVipLevel = 'Silver';
            }
        }


        transaction.update(userRef, {
            walletBalance: newWalletBalance,
            totalInvestment: newTotalInvestment,
            vipLevel: newVipLevel,
        });

        // Track Admin Profit
        const adminProfitFromThisSale = plan.adminProfit || 0;
        if (adminProfitFromThisSale > 0 && settingsDoc.exists()) {
            const currentProfitBalance = settingsDoc.data().adminProfitBalance || 0;
            transaction.update(settingsRef, {
                adminProfitBalance: currentProfitBalance + adminProfitFromThisSale
            });
        }

        const investmentRef = doc(collection(firestore, 'users', user.uid, 'investments'));
        const startDate = new Date();
        const maturityDate = addDays(startDate, plan.validity || 0);
        
        transaction.set(investmentRef, {
            userId: user.uid,
            planId: plan.id,
            planName: plan.name,
            investedAmount: plan.price || 0,
            returnAmount: plan.finalReturn || 0,
            dailyIncome: plan.dailyIncome || 0,
            startDate: serverTimestamp(),
            maturityDate: maturityDate,
            lastIncomeDate: serverTimestamp(),
            status: 'Active'
        });
    })
    .then(() => {
        toast({
            title: 'Investment Successful!',
            description: `You have successfully invested in the ${plan.name}.`,
        });
    })
    .catch((error) => {
        const permissionError = new FirestorePermissionError({
            path: `users/${user.uid} or investmentPlans/${plan.id}`,
            operation: 'write',
            requestResourceData: { planId: plan.id, action: 'invest' },
        });
        errorEmitter.emit('permission-error', permissionError);
        if (error.message.includes("out of stock")) {
           toast({ variant: 'destructive', title: 'Investment Failed', description: "This plan just went out of stock."});
        }
    });
  };

  const availablePlans = plans?.filter(p => p.status === 'Available');
  const comingSoonPlans = plans?.filter(p => p.status === 'Coming Soon');


  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent text-foreground relative z-10">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.05] bg-black/40 px-4 backdrop-blur-xl sm:px-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white/70">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Investment Plans</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 max-w-5xl mx-auto w-full">
        {loading ? (
           <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-[10px] font-bold uppercase tracking-[4px] text-white/20">Accessing Vault</p>
           </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {availablePlans && availablePlans.length > 0 ? (
                availablePlans.map((plan) => (
                    <PlanCard key={plan.id} plan={plan} onInvest={handleInvest} userBalance={userData?.walletBalance || 0} />
                ))
            ) : (
                !comingSoonPlans?.length && (
                    <Card className="col-span-full bg-white/5 border-white/10 backdrop-blur-xl rounded-3xl p-10 text-center">
                        <CardContent className="space-y-4">
                            <Briefcase size={48} className="mx-auto text-white/10" />
                            <h3 className="text-xl font-bold text-white/80">No Plans Active</h3>
                            <p className="text-white/40 text-sm max-w-xs mx-auto">New wealth-building opportunities are being prepared. Check back soon!</p>
                        </CardContent>
                    </Card>
                )
            )}
            </div>

            {comingSoonPlans && comingSoonPlans.length > 0 && (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white/40 uppercase tracking-widest pl-2">Coming Soon</h2>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {comingSoonPlans.map((plan) => (
                            <PlanCard key={plan.id} plan={plan} onInvest={handleInvest} userBalance={userData?.walletBalance || 0} />
                        ))}
                    </div>
                </div>
            )}
          </>
        )}
      </main>

      <nav className="sticky bottom-0 z-20 border-t border-white/[0.05] bg-black/40 backdrop-blur-xl">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs font-medium">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" active />
          <BottomNavItem icon={Trophy} label="Leaders" href="/leaderboard" />
          <BottomNavItem icon={HandCoins} label="Loans" href="/my-loans" />
          <BottomNavItem icon={User} label="Profile" href="/profile" />
        </div>
      </nav>
    </div>
  );
}

function PlanCard({ plan, onInvest, userBalance }: { plan: InvestmentPlan, onInvest: (plan: InvestmentPlan) => void, userBalance: number }) {
  const canAfford = userBalance >= (plan.price || 0);
  const isAvailable = plan.status === 'Available';
  const isOutOfStock = plan.stock !== undefined && plan.stock <= 0;

  return (
    <Card className={cn(
        "shadow-2xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl rounded-3xl overflow-hidden transition-all duration-300 relative group",
        (!isAvailable || isOutOfStock) ? 'opacity-40 grayscale' : 'hover:scale-[1.02] hover:bg-white/[0.06] hover:border-white/20'
    )}>
      <div className="absolute top-0 right-0 p-4">
         {isOutOfStock ? (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] font-bold">SOLD OUT</Badge>
         ) : !isAvailable && (
            <Badge className="bg-white/10 text-white/40 border-white/10 text-[10px] font-bold">UPCOMING</Badge>
         )}
      </div>
      
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-white group-hover:text-primary transition-colors">{plan.name}</CardTitle>
        <CardDescription className="text-white/40 flex items-center gap-1.5">
           <TrendingUp size={14} /> ₹{(plan.price || 0).toLocaleString()} Entry
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
            <PlanDetail label="Daily ROI" value={`₹${(plan.dailyIncome || 0).toFixed(2)}`} valueClass="text-green-400" />
            <PlanDetail label="Cycle" value={`${plan.validity || 0} Days`} valueClass="text-white" />
        </div>
        
        <div className="bg-black/40 rounded-2xl p-4 border border-white/5 space-y-2">
             <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/30">
                <span>Total Net Profit</span>
                <span className="text-green-400 font-black">+₹{(plan.totalIncome || 0).toFixed(2)}</span>
             </div>
             <div className="flex justify-between text-sm font-bold text-white/90">
                <span>Total Payout</span>
                <span className="text-xl font-black tracking-tighter">₹{(plan.finalReturn || 0).toFixed(2)}</span>
             </div>
        </div>

        {plan.stock !== undefined && isAvailable && (
            <div className="flex items-center justify-center gap-2">
                <div className="h-1 w-12 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(plan.stock / 100) * 100}%` }} />
                </div>
                <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{plan.stock} units available</span>
            </div>
        )}

        <Button 
            className={cn(
                "w-full h-12 rounded-xl font-bold transition-all duration-300",
                canAfford && isAvailable && !isOutOfStock 
                    ? "bg-white text-black hover:bg-primary hover:text-white shadow-lg shadow-white/5" 
                    : "bg-white/5 text-white/20 border-white/5"
            )}
            onClick={() => onInvest(plan)} 
            disabled={!canAfford || !isAvailable || isOutOfStock}
        >
          {isOutOfStock ? 'Plan Depleted' : isAvailable ? (canAfford ? 'Secure Plan Now' : 'Insufficient Funds') : 'Pending Release'}
        </Button>
      </CardContent>
    </Card>
  );
}

function PlanDetail({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex flex-col bg-white/5 p-2.5 rounded-xl border border-white/5">
      <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">{label}</span>
      <span className={cn("text-sm font-bold tracking-tight", valueClass)}>{value}</span>
    </div>
  );
}

function BottomNavItem({
  icon: Icon,
  label,
  href,
  active = false,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-1 transition-all h-full relative",
        active ? 'text-primary scale-110' : 'text-white/40 hover:text-white/60'
      )}
    >
      <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]")} />
      <span className="text-[10px] tracking-tight">{label}</span>
      {active && <div className="absolute -bottom-1 h-1 w-8 bg-primary rounded-full blur-[2px]" />}
    </Link>
  );
}
