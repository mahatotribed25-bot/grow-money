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
  DialogFooter
} from '@/components/ui/dialog';

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
  const [showWelcome, setShowWelcome] = useState(false);

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
            <ActionButton icon={CreditCard} label="Recharge" />
            <ActionButton icon={Landmark} label="Withdraw" />
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
    <Card className="flex h-24 flex-col items-center justify-center gap-2 rounded-lg bg-card text-card-foreground shadow-soft transition-colors hover:bg-accent/50">
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
