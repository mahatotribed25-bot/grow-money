'use client';

import {
  ChevronLeft,
  Home,
  User,
  Briefcase,
  TrendingUp,
  HandCoins,
  Trophy,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, doc, runTransaction, serverTimestamp, query, where } from 'firebase/firestore';
import { addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useSettings } from '@/context/settings-context';

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
  payoutFrequency?: 'daily' | 'monthly' | 'on_maturity';
};

type UserData = {
    name?: string;
    walletBalance: number;
    referredBy?: string;
    totalInvestment?: number;
    vipLevel?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    referralBonusPaid?: boolean;
}

type AdminSettings = {
    referralBonus?: number;
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
  const { t } = useSettings();

  const { data: plans, loading } = useCollection<InvestmentPlan>('investmentPlans');
  const { data: userData } = useDoc<UserData>(user ? `users/${user.uid}`: null);
  const { data: adminSettings } = useDoc<AdminSettings>('settings/admin');
  
  const { data: userCustomLoans } = useCollection<any>(
    user ? query(collection(firestore, 'customLoanRequests'), where('userId', '==', user.uid), where('status', 'in', ['active', 'extension_pending', 'payment_pending', 'pending_user_approval', 'approved_by_user'])) : null
  );

  const hasActiveCustomLoan = userCustomLoans && userCustomLoans.length > 0;

  const handleInvest = (plan: InvestmentPlan) => {
    if (!user || !userData) {
        toast({ variant: 'destructive', title: 'You must be logged in.' });
        return;
    }
    
    if (hasActiveCustomLoan) {
        toast({ 
            variant: 'destructive', 
            title: 'Investment Restricted', 
            description: 'You cannot buy new plans while you have an active custom loan. Please settle your dues first.' 
        });
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
        const historyRef = doc(collection(firestore, 'users', user.uid, 'walletHistory'));

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

        const currentTotalInvestment = userDoc.data().totalInvestment || 0;
        const newWalletBalance = (userDoc.data().walletBalance || 0) - planPrice;
        const newTotalInvestment = currentTotalInvestment + planPrice;
        
        const referredBy = userDoc.data().referredBy;
        const bonusAlreadyPaid = userDoc.data().referralBonusPaid || false;
        const referralBonusAmount = settingsDoc.exists() ? (settingsDoc.data().referralBonus || 0) : 0;

        if (referredBy && !bonusAlreadyPaid && currentTotalInvestment === 0 && referralBonusAmount > 0) {
            const referrerRef = doc(firestore, 'users', referredBy);
            const referrerDoc = await transaction.get(referrerRef);
            
            if (referrerDoc.exists()) {
                const referrerBalance = referrerDoc.data().walletBalance || 0;
                transaction.update(referrerRef, { walletBalance: referrerBalance + referralBonusAmount });
                
                const referrerHistoryRef = doc(collection(firestore, 'users', referredBy, 'walletHistory'));
                transaction.set(referrerHistoryRef, {
                    amount: referralBonusAmount,
                    type: 'credit',
                    category: 'Referral Reward',
                    description: `Bonus for ${userDoc.data().name || 'a friend'}'s first investment`,
                    createdAt: serverTimestamp()
                });

                transaction.update(userRef, { referralBonusPaid: true });
            }
        }

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

        transaction.set(historyRef, {
            amount: planPrice,
            type: 'debit',
            category: 'Investment',
            description: `Secured plan: ${plan.name}`,
            createdAt: serverTimestamp()
        });

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
            payoutFrequency: plan.payoutFrequency || 'on_maturity',
            startDate: serverTimestamp(),
            maturityDate: maturityDate,
            lastIncomeDate: serverTimestamp(),
            lastClaimDate: serverTimestamp(),
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
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground transition-colors duration-300">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 px-4 backdrop-blur-sm sm:px-6">
        <div className="flex items-center gap-2">
            <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="hover:bg-accent">
                <ChevronLeft className="h-5 w-5" />
            </Button>
            </Link>
            <h1 className="text-lg font-bold tracking-tight">{t.nav.plans}</h1>
        </div>
        <div className="flex items-center gap-2">
             <Badge variant="outline" className="border-border bg-muted h-8 px-4 rounded-xl">
                <span className="font-black tracking-tighter text-sm">
                    {userData?.name || 'User'}
                </span>
             </Badge>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 max-w-5xl mx-auto w-full">
        {hasActiveCustomLoan && (
            <Card className="bg-destructive/10 border-destructive/30 text-destructive p-4 rounded-2xl flex items-center gap-3">
                <AlertCircle className="shrink-0 h-5 w-5" />
                <p className="text-xs font-bold uppercase tracking-tight">Investment Disabled: You have an active custom loan. Please settle it to unlock investments.</p>
            </Card>
        )}

        {loading ? (
           <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-[10px] font-bold uppercase tracking-[4px] text-muted-foreground">Accessing Vault</p>
           </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {availablePlans && availablePlans.length > 0 ? (
                availablePlans.map((plan, index) => (
                    <PlanCard key={plan.id} plan={plan} onInvest={handleInvest} userBalance={userData?.walletBalance || 0} index={index} disabled={hasActiveCustomLoan} />
                ))
            ) : (
                !comingSoonPlans?.length && (
                    <Card className="col-span-full bg-muted/20 border-border rounded-3xl p-10 text-center">
                        <CardContent className="space-y-4">
                            <Briefcase size={48} className="mx-auto text-muted-foreground/20" />
                            <h3 className="text-xl font-bold">No Plans Active</h3>
                            <p className="text-muted-foreground text-sm max-w-xs mx-auto">New wealth-building opportunities are being prepared. Check back soon!</p>
                        </CardContent>
                    </Card>
                )
            )}
            </div>

            {comingSoonPlans && comingSoonPlans.length > 0 && (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-muted-foreground uppercase tracking-widest pl-2">Coming Soon</h2>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {comingSoonPlans.map((plan, index) => (
                            <PlanCard key={plan.id} plan={plan} onInvest={handleInvest} userBalance={userData?.walletBalance || 0} index={index + 10} disabled={hasActiveCustomLoan} />
                        ))}
                    </div>
                </div>
            )}
          </>
        )}
      </main>

      <nav className="sticky bottom-0 z-20 border-t border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs font-medium">
          <BottomNavItem icon={Home} label={t.nav.home} href="/dashboard" />
          <BottomNavItem icon={Briefcase} label={t.nav.plans} href="/plans" active />
          <BottomNavItem icon={Trophy} label={t.nav.leaders} href="/leaderboard" />
          <BottomNavItem icon={HandCoins} label={t.nav.loans} href="/my-loans" />
          <BottomNavItem icon={User} label={t.nav.profile} href="/profile" />
        </div>
      </nav>
    </div>
  );
}

function PlanCard({ plan, onInvest, userBalance, index, disabled }: { plan: InvestmentPlan, onInvest: (plan: InvestmentPlan) => void, userBalance: number, index: number, disabled?: boolean }) {
  const canAfford = userBalance >= (plan.price || 0);
  const isAvailable = plan.status === 'Available';
  const isOutOfStock = plan.stock !== undefined && plan.stock <= 0;

  const planImages = PlaceHolderImages.filter(img => img.id.startsWith('plan-'));
  const planImage = planImages[index % planImages.length] || { imageUrl: 'https://picsum.photos/seed/investment/600/400', imageHint: 'investment' };

  return (
    <Card className={cn(
        "shadow-lg border-border bg-card rounded-3xl overflow-hidden transition-all duration-300 relative group",
        (!isAvailable || isOutOfStock || disabled) ? 'opacity-40 grayscale' : 'hover:scale-[1.02] hover:bg-accent/10'
    )}>
      <div className="relative h-44 w-full overflow-hidden">
        <Image 
            src={planImage.imageUrl} 
            alt={plan.name} 
            fill 
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            data-ai-hint={planImage.imageHint}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
        <div className="absolute top-4 right-4">
             {isOutOfStock ? (
                <Badge className="bg-destructive text-destructive-foreground border-none text-[10px] font-bold">SOLD OUT</Badge>
             ) : !isAvailable && (
                <Badge className="bg-muted text-muted-foreground border-none text-[10px] font-bold">UPCOMING</Badge>
             )}
        </div>
      </div>

      <CardHeader className="pb-4 relative -mt-8">
        <div className="flex flex-col gap-1">
            <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">{plan.name}</CardTitle>
            <Badge variant="outline" className="w-fit text-[8px] h-4 uppercase font-black tracking-widest border-primary/20 text-primary">
                {plan.payoutFrequency?.replace('_', ' ')}
            </Badge>
        </div>
        <CardDescription className="text-muted-foreground flex items-center gap-1.5 mt-1 font-bold">
           <TrendingUp size={14} /> ₹{(plan.price || 0).toLocaleString()} Entry
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
            <PlanDetail label="Daily ROI" value={`₹${(plan.dailyIncome || 0).toFixed(2)}`} valueClass="text-accent" />
            <PlanDetail label="Cycle" value={`${plan.validity || 0} Days`} />
        </div>
        
        <div className="bg-muted/50 rounded-2xl p-4 border border-border space-y-2">
             <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span>Total Net Profit</span>
                <span className="text-accent font-black">+₹{(plan.totalIncome || 0).toFixed(2)}</span>
             </div>
             <div className="flex justify-between text-sm font-bold">
                <span>Total Payout</span>
                <span className="text-xl font-black tracking-tighter">₹{(plan.finalReturn || 0).toFixed(2)}</span>
             </div>
        </div>

        <Button 
            className={cn(
                "w-full h-12 rounded-xl font-bold transition-all duration-300",
                canAfford && isAvailable && !isOutOfStock && !disabled 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg" 
                    : "bg-muted text-muted-foreground border-border"
            )}
            onClick={() => onInvest(plan)} 
            disabled={!canAfford || !isAvailable || isOutOfStock || disabled}
        >
          {disabled ? 'Settle Loan First' : isOutOfStock ? 'Plan Depleted' : isAvailable ? (canAfford ? 'Secure Plan Now' : 'Insufficient Funds') : 'Pending Release'}
        </Button>
      </CardContent>
    </Card>
  );
}

function PlanDetail({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex flex-col bg-muted/30 p-2.5 rounded-xl border border-border">
      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{label}</span>
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
        active ? 'text-primary scale-110' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <Icon className={cn("h-5 w-5")} />
      <span className="text-[10px] tracking-tight">{label}</span>
      {active && <div className="absolute -bottom-1 h-1 w-8 bg-primary rounded-full blur-[2px]" />}
    </Link>
  );
}
