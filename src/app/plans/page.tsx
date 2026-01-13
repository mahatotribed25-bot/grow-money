
'use client';

import {
  ChevronLeft,
  Home,
  User,
  Briefcase,
  TrendingUp,
  Users as UsersIcon,
  HandCoins,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, doc, runTransaction, serverTimestamp, getDoc } from 'firebase/firestore';
import { add, addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';

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
};

type UserData = {
    walletBalance: number;
    referredBy?: string;
    totalInvestment?: number;
}

export default function PlansPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const { data: plans, loading } = useCollection<InvestmentPlan>('investmentPlans');
  const { data: userData } = useDoc<UserData>(user ? `users/${user.uid}`: null);

  const handleInvest = async (plan: InvestmentPlan) => {
    // This function handles the logic when a user invests in a plan.
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

    try {
        await runTransaction(firestore, async (transaction) => {
            const userRef = doc(firestore, 'users', user.uid);
            const planRef = doc(firestore, 'investmentPlans', plan.id);

            const userDoc = await transaction.get(userRef);
            const planDoc = await transaction.get(planRef);

            if (!userDoc.exists()) throw "User does not exist";
            if (!planDoc.exists()) throw "Plan does not exist";

            const currentStock = planDoc.data().stock;
            if (currentStock !== undefined && currentStock <= 0) {
                throw "Plan is out of stock.";
            }

            // Decrement stock if it exists
            if (currentStock !== undefined) {
                transaction.update(planRef, { stock: currentStock - 1 });
            }

            const newWalletBalance = (userDoc.data().walletBalance || 0) - planPrice;
            const newTotalInvestment = (userDoc.data().totalInvestment || 0) + planPrice;

            transaction.update(userRef, {
                walletBalance: newWalletBalance,
                totalInvestment: newTotalInvestment,
            });

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

             // Referral bonus logic
            const referredBy = userDoc.data().referredBy;
            const isFirstInvestment = (userDoc.data().totalInvestment || 0) === 0;

            if (referredBy && isFirstInvestment) {
                const settingsRef = doc(firestore, 'settings/admin');
                const adminSettingsDoc = await transaction.get(settingsRef);
                const bonus = adminSettingsDoc.data()?.referralBonus || 0;
                
                if (bonus > 0) {
                    const referrerRef = doc(firestore, 'users', referredBy);
                    const referrerDoc = await transaction.get(referrerRef);
                    if (referrerDoc.exists()) {
                        const referrerWallet = referrerDoc.data().walletBalance || 0;
                        transaction.update(referrerRef, { walletBalance: referrerWallet + bonus });
                    }
                }
            }


        });

        toast({
            title: 'Investment Successful!',
            description: `You have successfully invested in the ${plan.name}.`,
        });

    } catch (e: any) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Investment Failed', description: e.message || 'Could not process your investment. Please try again.'});
    }

  };

  const availablePlans = plans?.filter(p => p.status === 'Available');
  const comingSoonPlans = plans?.filter(p => p.status === 'Coming Soon');


  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 px-4 backdrop-blur-sm sm:px-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">Investment Plans</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <p>Loading plans...</p>
          ) : availablePlans && availablePlans.length > 0 ? (
            availablePlans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} onInvest={handleInvest} userBalance={userData?.walletBalance || 0} />
            ))
          ) : (
            !comingSoonPlans?.length && (
                <Card className="col-span-full">
                    <CardContent className="pt-6 text-center text-muted-foreground">
                        <h3 className="text-xl font-semibold mb-2">No Plans Available</h3>
                        <p>New investment plans are being prepared and will be available shortly.</p>
                    </CardContent>
                </Card>
            )
          )}
        </div>

        {comingSoonPlans && comingSoonPlans.length > 0 && (
            <div>
                <h2 className="text-2xl font-bold mb-4">Coming Soon</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                     {comingSoonPlans.map((plan) => (
                        <PlanCard key={plan.id} plan={plan} onInvest={handleInvest} userBalance={userData?.walletBalance || 0} />
                    ))}
                </div>
            </div>
        )}

      </main>

      <nav className="sticky bottom-0 z-10 border-t border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" active />
          <BottomNavItem icon={UsersIcon} label="Team" href="/team" />
          <BottomNavItem icon={HandCoins} label="My Loans" href="/my-loans" />
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
    <Card className={`shadow-lg border-border/50 bg-gradient-to-br from-secondary/50 to-background ${(!isAvailable || isOutOfStock) && 'opacity-60'}`}>
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle className="text-primary">{plan.name}</CardTitle>
            {isOutOfStock ? (
                <Badge variant="destructive">Out of Stock</Badge>
            ) : !isAvailable && (
                <Badge variant="outline">Coming Soon</Badge>
            )}
        </div>
        <CardDescription>Investment: ₹{(plan.price || 0).toFixed(2)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PlanDetail label="Daily Income" value={`₹${(plan.dailyIncome || 0).toFixed(2)}`} />
        <PlanDetail label="Validity" value={`${plan.validity || 0} Days`} />
        <PlanDetail label="Total Income" value={`₹${(plan.totalIncome || 0).toFixed(2)}`} />
        <PlanDetail label="Final Return (Inc. Principal)" value={`₹${(plan.finalReturn || 0).toFixed(2)}`} />
        {plan.stock !== undefined && isAvailable && <PlanDetail label="Units Left" value={`${plan.stock}`} />}
        <Button className="w-full" onClick={() => onInvest(plan)} disabled={!canAfford || !isAvailable || isOutOfStock}>
          {isOutOfStock ? 'Out of Stock' : isAvailable ? (canAfford ? 'Invest Now' : 'Insufficient Balance') : 'Coming Soon'}
        </Button>
      </CardContent>
    </Card>
  );
}

function PlanDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
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
      className={`flex flex-col items-center justify-center gap-1 ${
        active ? 'text-primary' : 'text-muted-foreground'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}
