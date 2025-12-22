
'use client';

import {
  ChevronLeft,
  Home,
  User,
  Briefcase,
  TrendingUp,
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
import { collection, addDoc, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { add, addDays } from 'date-fns';

type InvestmentPlan = {
  id: string;
  name: string;
  price: number;
  dailyIncome: number;
  validity: number;
  totalIncome: number;
  finalReturn: number;
};

type UserData = {
    walletBalance: number;
}

export default function PlansPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const { data: plans, loading } = useCollection<InvestmentPlan>('investmentPlans');
  const { data: userData } = useDoc<UserData>(user ? `users/${user.uid}`: null);

  const handleInvest = async (plan: InvestmentPlan) => {
    if (!user || !userData) {
        toast({ variant: 'destructive', title: 'You must be logged in.' });
        return;
    }

    if (userData.walletBalance < plan.price) {
        toast({ variant: 'destructive', title: 'Insufficient Balance', description: 'Please recharge your wallet to invest.' });
        return;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const userRef = doc(firestore, 'users', user.uid);
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists()) throw "User does not exist";

            const newWalletBalance = userDoc.data().walletBalance - plan.price;
            const newTotalInvestment = (userDoc.data().totalInvestment || 0) + plan.price;

            transaction.update(userRef, {
                walletBalance: newWalletBalance,
                totalInvestment: newTotalInvestment,
            });

            const investmentRef = doc(collection(firestore, 'users', user.uid, 'investments'));
            const startDate = new Date();
            const maturityDate = addDays(startDate, plan.validity);
            
            transaction.set(investmentRef, {
                userId: user.uid,
                planId: plan.id,
                planName: plan.name,
                investedAmount: plan.price,
                returnAmount: plan.finalReturn,
                dailyIncome: plan.dailyIncome,
                startDate: serverTimestamp(),
                maturityDate: maturityDate,
                lastIncomeDate: serverTimestamp(),
                status: 'Active'
            });

             // Referral bonus logic
            const referredBy = userDoc.data().referredBy;
            const isFirstInvestment = (userDoc.data().totalInvestment || 0) === 0;

            if (referredBy && isFirstInvestment) {
                const { data: adminSettings } = await getDoc(doc(firestore, 'settings/admin'));
                const bonus = adminSettings?.referralBonus || 0;
                
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

    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Investment Failed', description: 'Could not process your investment. Please try again.'});
    }

  };

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

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <p>Loading plans...</p>
          ) : plans && plans.length > 0 ? (
            plans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} onInvest={handleInvest}/>
            ))
          ) : (
            <p>No investment plans available at the moment.</p>
          )}
        </div>
      </main>

      <nav className="sticky bottom-0 z-10 border-t border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-md grid-cols-3 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" active />
          <BottomNavItem icon={User} label="Profile" href="/profile" />
        </div>
      </nav>
    </div>
  );
}

function PlanCard({ plan, onInvest }: { plan: InvestmentPlan, onInvest: (plan: InvestmentPlan) => void }) {
  return (
    <Card className="shadow-lg border-border/50 bg-gradient-to-br from-secondary/50 to-background">
      <CardHeader>
        <CardTitle className="text-primary">{plan.name}</CardTitle>
        <CardDescription>Investment: ₹{plan.price.toFixed(2)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PlanDetail label="Daily Income" value={`₹${plan.dailyIncome.toFixed(2)}`} />
        <PlanDetail label="Validity" value={`${plan.validity} Days`} />
        <PlanDetail label="Total Income" value={`₹${plan.totalIncome.toFixed(2)}`} />
        <PlanDetail label="Final Return (Inc. Principal)" value={`₹${plan.finalReturn.toFixed(2)}`} />
        <Button className="w-full" onClick={() => onInvest(plan)}>Invest Now</Button>
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
