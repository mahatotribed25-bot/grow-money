
'use client';

import {
  ChevronLeft,
  Home,
  User,
  Briefcase,
  TrendingUp,
  Users2,
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
import { doc, runTransaction, serverTimestamp, collection, updateDoc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


type GroupLoanPlan = {
  id: string;
  name: string;
  loanAmount: number;
  interest: number;
  totalRepayment: number;
  duration: number;
  durationType: string;
  amountFunded: number;
  status: 'Funding' | 'Active' | 'Completed';
};

type UserData = {
    walletBalance: number;
}

export default function GroupInvestingPage() {
  const { user } = useUser();

  const { data: plans, loading } = useCollection<GroupLoanPlan>('groupLoanPlans');
  const { data: userData } = useDoc<UserData>(user ? `users/${user.uid}`: null);
  
  const fundingPlans = plans?.filter(p => p.status === 'Funding');


  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 px-4 backdrop-blur-sm sm:px-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">Group Loan Investing</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <p>Loading plans...</p>
          ) : fundingPlans && fundingPlans.length > 0 ? (
            fundingPlans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} userBalance={userData?.walletBalance || 0} />
            ))
          ) : (
             <Card className="col-span-full">
                <CardContent className="pt-6 text-center text-muted-foreground">
                    <h3 className="text-xl font-semibold mb-2">No Active Funding</h3>
                    <p>There are no group loans open for investment right now. Check back later!</p>
                </CardContent>
            </Card>
          )}
        </div>
      </main>

      <nav className="sticky bottom-0 z-10 border-t border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-md grid-cols-4 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={Users2} label="Group Invest" href="/group-investing" active />
          <BottomNavItem icon={User} label="Profile" href="/profile" />
        </div>
      </nav>
    </div>
  );
}

function PlanCard({ plan, userBalance }: { plan: GroupLoanPlan, userBalance: number }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [investmentAmount, setInvestmentAmount] = useState(0);

    const fundingProgress = (plan.amountFunded / plan.loanAmount) * 100;
    const amountRemaining = plan.loanAmount - plan.amountFunded;
    const canAfford = userBalance >= investmentAmount;

    const handleInvest = async () => {
        if (!user) {
            toast({ title: 'Please log in to invest.', variant: 'destructive'});
            return;
        }
        if (investmentAmount <= 0) {
            toast({ title: 'Invalid Amount', description: 'Please enter an amount to invest.', variant: 'destructive'});
            return;
        }
        if (investmentAmount > amountRemaining) {
            toast({ title: 'Amount Too High', description: `You can invest a maximum of ₹${amountRemaining.toFixed(2)}.`, variant: 'destructive'});
            return;
        }
        if (!canAfford) {
            toast({ title: 'Insufficient Wallet Balance', variant: 'destructive'});
            return;
        }

        try {
            await runTransaction(firestore, async (transaction) => {
                const planRef = doc(firestore, 'groupLoanPlans', plan.id);
                const userRef = doc(firestore, 'users', user.uid);
                
                const planDoc = await transaction.get(planRef);
                const userDoc = await transaction.get(userRef);

                if (!planDoc.exists() || !userDoc.exists()) throw new Error("Document not found.");

                const newAmountFunded = (planDoc.data().amountFunded || 0) + investmentAmount;
                
                transaction.update(planRef, { amountFunded: newAmountFunded });

                const newBalance = (userDoc.data().walletBalance || 0) - investmentAmount;
                transaction.update(userRef, { walletBalance: newBalance });

                const investmentRef = doc(collection(firestore, `groupLoanPlans/${plan.id}/investments`));
                transaction.set(investmentRef, {
                    investorId: user.uid,
                    investorName: user.displayName,
                    planId: plan.id,
                    planName: plan.name,
                    investedAmount: investmentAmount,
                    amountReceived: 0,
                    createdAt: serverTimestamp()
                });
                
                if (newAmountFunded >= plan.loanAmount) {
                    transaction.update(planRef, { status: 'Active' });
                }
            });

            toast({ title: 'Investment Successful!', description: `You invested ₹${investmentAmount.toFixed(2)} in ${plan.name}.` });
            setInvestmentAmount(0);

        } catch (e: any) {
            console.error(e);
            toast({ title: 'Investment Failed', description: e.message, variant: 'destructive' });
        }
    }


  return (
    <Card className="shadow-lg border-border/50 bg-gradient-to-br from-secondary/50 to-background">
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle className="text-primary">{plan.name}</CardTitle>
             <Badge variant="secondary">{plan.status}</Badge>
        </div>
        <CardDescription>Loan Goal: ₹{(plan.loanAmount || 0).toFixed(2)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>Funded: ₹{plan.amountFunded.toFixed(2)}</span>
                <span>{fundingProgress.toFixed(1)}%</span>
            </div>
            <Progress value={fundingProgress} />
        </div>

        <PlanDetail label="Total Interest" value={`₹${(plan.interest || 0).toFixed(2)}`} />
        <PlanDetail label="Duration" value={`${plan.duration || 0} ${plan.durationType}`} />
        <PlanDetail label="Repayment" value={`${plan.totalRepayment.toFixed(2)} (${plan.repaymentType})`} />

        <Dialog>
            <DialogTrigger asChild>
                <Button className="w-full">Invest Now</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Invest in {plan.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <p>Amount remaining to be funded: <span className="font-bold">₹{amountRemaining.toFixed(2)}</span></p>
                    <div className="space-y-2">
                        <Label htmlFor="invest-amount">Investment Amount</Label>
                        <Input id="invest-amount" type="number" value={investmentAmount || ''} onChange={(e) => setInvestmentAmount(parseFloat(e.target.value))} placeholder="Enter amount"/>
                    </div>
                    <p className="text-sm text-muted-foreground">Your wallet balance: ₹{userBalance.toFixed(2)}</p>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleInvest} disabled={!canAfford || investmentAmount <= 0}>Confirm Investment</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

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
