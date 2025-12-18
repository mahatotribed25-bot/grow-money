'use client';

import {
  Bell,
  Briefcase,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Home,
  Landmark,
  LogOut,
  QrCode,
  User,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useUser } from '@/firebase/auth/use-user';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

const investmentPlans = [
  {
    title: 'Day Plan',
    investment: 2000,
    dailyIncome: 100,
    duration: 1,
    totalReturn: 2100,
  },
  {
    title: 'Weekly Plan',
    investment: 5000,
    dailyIncome: 300,
    duration: 7,
    totalReturn: 5300,
  },
  {
    title: 'Weekly Plan',
    investment: 10000,
    dailyIncome: 650,
    duration: 7,
    totalReturn: 10650,
  },
  {
    title: 'Monthly Plan',
    comingSoon: true,
  },
];

const activePlans = [
  {
    name: 'Day Plan',
    progress: 1,
    total: 1,
    status: 'Active',
  },
];

export default function Dashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawUpi, setWithdrawUpi] = useState('');


  useEffect(() => {
    const firstLogin = !localStorage.getItem('hasLoggedIn');
    if (firstLogin) {
      setShowWelcome(true);
      localStorage.setItem('hasLoggedIn', 'true');
    }
  }, []);
  
  const handleCloseWelcome = () => {
    setShowWelcome(false);
  }

  const handleRechargeSubmit = async () => {
    if (!user || !rechargeAmount) return;
    try {
      await addDoc(collection(firestore, 'deposits'), {
        userId: user.uid,
        amount: parseFloat(rechargeAmount),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      toast({
        title: 'Recharge Request Submitted',
        description: `Your request for ₹${rechargeAmount} has been submitted and is pending approval.`,
      });
      setShowRecharge(false);
      setRechargeAmount('');
    } catch (error) {
      console.error('Error submitting recharge request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to submit recharge request.',
      });
    }
  };

  const handleWithdrawSubmit = async () => {
    if (!user || !withdrawAmount || !withdrawUpi) return;
    try {
      await addDoc(collection(firestore, 'withdrawals'), {
        userId: user.uid,
        amount: parseFloat(withdrawAmount),
        upiId: withdrawUpi,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      toast({
        title: 'Withdrawal Request Submitted',
        description: `Your request for ₹${withdrawAmount} has been submitted and is pending approval.`,
      });
      setShowWithdraw(false);
      setWithdrawAmount('');
      setWithdrawUpi('');
    } catch (error) {
      console.error('Error submitting withdrawal request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to submit withdrawal request.',
      });
    }
  };


  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-gradient-to-r from-green-500/10 to-primary/10 px-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-primary">Tribed World</h1>
        </div>
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
      </header>
      
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">Welcome to Tribed World 👋</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleCloseWelcome} className="w-full">Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showRecharge} onOpenChange={setShowRecharge}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recharge Wallet</DialogTitle>
            <DialogDescription>
              To add funds, transfer the desired amount to the UPI ID below and submit the reference ID.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center space-y-2 rounded-md bg-muted p-4">
              <Image
                data-ai-hint="QR code"
                src="https://picsum.photos/seed/qr/200/200"
                alt="Admin UPI QR Code"
                width={150}
                height={150}
                className="rounded-md"
              />
              <p className="text-sm font-medium">admin-upi@bank</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recharge-amount">Amount</Label>
              <Input
                id="recharge-amount"
                type="number"
                placeholder="Enter amount"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecharge(false)}>
              Cancel
            </Button>
            <Button onClick={handleRechargeSubmit} disabled={!rechargeAmount}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>
              Enter the amount to withdraw and your UPI ID.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="withdraw-amount">Amount</Label>
              <Input
                id="withdraw-amount"
                type="number"
                placeholder="Enter amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="withdraw-upi">UPI ID</Label>
              <Input
                id="withdraw-upi"
                placeholder="your-upi@bank"
                value={withdrawUpi}
                onChange={(e) => setWithdrawUpi(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdraw(false)}>
              Cancel
            </Button>
            <Button onClick={handleWithdrawSubmit} disabled={!withdrawAmount || !withdrawUpi}>
              Request Withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Wallet Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Wallet Balance</p>
                <p className="text-2xl font-bold">₹1,250.00</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Investment</p>
                <p className="text-2xl font-bold">₹2,000.00</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-2xl font-bold">₹100.00</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div onClick={() => setShowRecharge(true)}>
              <ActionButton icon={CreditCard} label="Recharge" />
            </div>
            <div onClick={() => setShowWithdraw(true)}>
              <ActionButton icon={Landmark} label="Withdraw" />
            </div>
            <ActionButton icon={Briefcase} label="My Plans" />
            <Link href="/profile">
              <ActionButton icon={User} label="Profile" />
            </Link>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Investment Plans</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {investmentPlans.map((plan, i) => (
                <InvestmentCard key={i} {...plan} walletBalance={1250} />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Active Plans</h2>
            <div className="mt-4 space-y-4">
              {activePlans.map((plan, i) => (
                <ActivePlanCard key={i} {...plan} />
              ))}
            </div>
          </div>
        </div>
      </main>

      <nav className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-md grid-cols-4 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" active />
          <BottomNavItem icon={Briefcase} label="Plans" href="#" />
          <BottomNavItem icon={Wallet} label="Team" href="#" />
          <BottomNavItem icon={User} label="Profile" href="/profile" />
        </div>
      </nav>
    </div>
  );
}

function ActionButton({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <Card className="flex h-24 flex-col items-center justify-center gap-2 rounded-lg bg-card text-card-foreground shadow-soft transition-colors hover:bg-accent/50 cursor-pointer">
      <Icon className="h-6 w-6 text-primary" />
      <span className="text-sm font-medium">{label}</span>
    </Card>
  );
}

function InvestmentCard({
  title,
  investment,
  dailyIncome,
  duration,
  totalReturn,
  comingSoon,
  walletBalance,
}: any) {
  const canAfford = investment ? walletBalance >= investment : false;
  return (
    <Card className="rounded-lg shadow-soft">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {comingSoon && (
          <CardDescription>Coming Soon</CardDescription>
        )}
      </CardHeader>
      {!comingSoon && (
        <CardContent className="space-y-4">
          <PlanDetail label="Investment" value={`₹${investment}`} />
          <PlanDetail label="Daily Income" value={`₹${dailyIncome}`} />
          <PlanDetail label="Duration" value={`${duration} Day(s)`} />
          <PlanDetail label="Total Return" value={`₹${totalReturn}`} />
          <Button className="w-full" disabled={!canAfford}>Invest Now</Button>
        </CardContent>
      )}
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

function ActivePlanCard({ name, progress, total, status }: any) {
  const progressValue = (progress / total) * 100;
  return (
    <Card className="rounded-lg shadow-soft">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold">{name}</p>
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
            }`}
          >
            {status}
          </span>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>
              {progress} / {total} Days
            </span>
          </div>
          <Progress value={progressValue} className="mt-1 h-2" />
        </div>
      </CardContent>
    </Card>
  );
}

function BottomNavItem({ icon: Icon, label, href, active = false } : { icon: React.ElementType, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center justify-center gap-1 ${active ? 'text-primary' : 'text-muted-foreground'}`}>
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}
