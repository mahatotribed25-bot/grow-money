
'use client';
import {
  ChevronLeft,
  Home,
  User,
  Briefcase,
  HandCoins,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection, useFirestore } from '@/firebase';
import type { Timestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

type DurationType = 'Days' | 'Weeks' | 'Months' | 'Years';

type ActiveLoan = {
  id: string;
  planName: string;
  loanAmount: number;
  totalPayable: number;
  startDate: Timestamp;
  dueDate: Timestamp;
  status: 'Active' | 'Due' | 'Completed' | 'Payment Pending';
  duration: number;
  durationType: DurationType;
};

const CountdownTimer = ({ endDate }: { endDate: Date }) => {
    const [timeLeft, setTimeLeft] = useState('...');

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const distance = endDate.getTime() - now.getTime();

            if (distance < 0) {
                clearInterval(interval);
                setTimeLeft("Due");
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        }, 1000);

        return () => clearInterval(interval);
    }, [endDate]);

    return <span className="font-mono">{timeLeft}</span>;
};


export default function MyLoansPage() {
  const { user, loading: userLoading } = useUser();
  const { data: activeLoans, loading: loansLoading } =
    useCollection<ActiveLoan>(
      user ? `users/${user.uid}/loans` : null
    );

  const loading = userLoading || loansLoading;
  const loan = activeLoans?.find(l => l.status !== 'Completed'); 

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 px-4 backdrop-blur-sm sm:px-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">My Active Loan</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
         <div className="space-y-4 mt-4">
            {loading ? <p>Loading...</p> : 
                loan ? (
                    <LoanCard loan={loan}/>
                ) : (
                    <Card>
                        <CardContent className="pt-6 text-center text-muted-foreground">
                           <p>You have no active loans.</p>
                           <Button asChild variant="link">
                            <Link href="/loans">Apply for a loan</Link>
                           </Button>
                        </CardContent>
                    </Card>
                )
            }
        </div>
      </main>

      <nav className="sticky bottom-0 z-10 border-t border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-md grid-cols-4 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={HandCoins} label="My Loans" href="/my-loans" active/>
          <BottomNavItem icon={User} label="Profile" href="/profile" />
        </div>
      </nav>
    </div>
  );
}


function LoanCard({ loan }: { loan: ActiveLoan }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  if (!loan.startDate || !loan.dueDate) {
    return null;
  }
  
  const startDate = loan.startDate.toDate();
  const dueDate = loan.dueDate.toDate();
  const now = new Date();

  const totalDuration = dueDate.getTime() - startDate.getTime();
  const elapsedDuration = now.getTime() - startDate.getTime();
  const progress = Math.min((elapsedDuration / totalDuration) * 100, 100);

  const handlePayNow = async () => {
    if (!user) return;
    const loanRef = doc(firestore, 'users', user.uid, 'loans', loan.id);
    try {
      await updateDoc(loanRef, { status: 'Payment Pending' });
      toast({
        title: 'Payment Initiated',
        description: 'Your payment is being processed. The admin will confirm it shortly.',
      });
    } catch (error) {
      console.error('Error initiating payment:', error);
      toast({
        title: 'Error',
        description: 'Could not initiate payment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
        case 'Active': return 'default';
        case 'Due': return 'destructive';
        case 'Payment Pending': return 'outline';
        default: return 'secondary';
    }
  }

  return (
    <Card className="bg-secondary/30">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{loan.planName}</span>
          <Badge variant={getStatusVariant(loan.status)} className="capitalize">
            {loan.status}
          </Badge>
        </CardTitle>
        <CardDescription>Loan taken on: {startDate.toLocaleDateString()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <p className="text-sm text-muted-foreground">Loan Amount</p>
          <p className="font-semibold">₹{(loan.loanAmount || 0).toFixed(2)}</p>
        </div>
        <div className="flex justify-between">
          <p className="text-sm text-muted-foreground">Total Repayment Due</p>
          <p className="font-semibold text-red-400">
            ₹{(loan.totalPayable || 0).toFixed(2)}
          </p>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
             <span>Time Remaining:</span>
             <CountdownTimer endDate={dueDate} />
          </div>
          <Progress value={progress} className="[&>div]:bg-red-500"/>
          <p className="text-xs text-muted-foreground pt-1">
            Due on: {dueDate.toLocaleDateString()}
          </p>
        </div>
        <Button 
            className="w-full" 
            onClick={handlePayNow} 
            disabled={loan.status === 'Payment Pending' || loan.status === 'Completed'}
        >
            {loan.status === 'Payment Pending' ? 'Processing Payment...' : 'Pay Now'}
        </Button>
         <p className="text-xs text-muted-foreground text-center">
            Note: Clicking 'Pay Now' will deduct the amount from your wallet. Admin will confirm the payment.
        </p>
      </CardContent>
    </Card>
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
