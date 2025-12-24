
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
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEffect, useState } from 'react';

type DurationType = 'Days' | 'Weeks' | 'Months' | 'Years';

type EMI = {
    emiAmount: number;
    dueDate: Timestamp;
    status: 'Pending' | 'Paid' | 'Due' | 'Payment Pending';
}

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
  repaymentMethod: 'EMI' | 'Direct';
  emis?: EMI[];
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
  const [currentTime, setCurrentTime] = useState(new Date());


  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!loan.startDate || !loan.dueDate) {
    return null;
  }
  
  const startDate = loan.startDate.toDate();
  const dueDate = loan.dueDate.toDate();
  
  const totalDuration = dueDate.getTime() - startDate.getTime();
  const elapsedDuration = currentTime.getTime() - startDate.getTime();
  const progress = Math.min((elapsedDuration / totalDuration) * 100, 100);

  const handlePayNow = async (isEmi: boolean, emiIndex?: number) => {
    if (!user) return;
    const loanRef = doc(firestore, 'users', user.uid, 'loans', loan.id);
    try {
        if(isEmi && emiIndex !== undefined && loan.emis) {
            const updatedEmis = loan.emis.map((emi, index) => {
                if(index === emiIndex) {
                    return {...emi, status: 'Payment Pending'};
                }
                return emi;
            });
            await updateDoc(loanRef, { emis: updatedEmis });
        } else {
            await updateDoc(loanRef, { status: 'Payment Pending' });
        }
      
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
        case 'Active':
        case 'Paid':
             return 'default';
        case 'Due': return 'destructive';
        case 'Payment Pending': return 'outline';
        default: return 'secondary';
    }
  }

  const isEmiPayable = (emi: EMI) => {
      return new Date(emi.dueDate.seconds * 1000) <= currentTime && emi.status === 'Pending';
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
          <Progress value={progress} className="[&>div]:bg-red-500"/>
          <p className="text-xs text-muted-foreground pt-1">
            Final due date: {dueDate.toLocaleDateString()}
          </p>
        </div>
        
        {loan.repaymentMethod === 'EMI' && loan.emis ? (
            <div className="space-y-2">
                <h4 className="font-semibold">EMI Schedule</h4>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Amount</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loan.emis.map((emi, index) => (
                            <TableRow key={index}>
                                <TableCell>₹{emi.emiAmount.toFixed(2)}</TableCell>
                                <TableCell>{new Date(emi.dueDate.seconds * 1000).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <Badge variant={getStatusVariant(emi.status)} className="capitalize">{emi.status}</Badge>
                                </TableCell>
                                <TableCell>
                                    <Button size="sm" onClick={() => handlePayNow(true, index)} disabled={!isEmiPayable(emi) || emi.status === 'Payment Pending'}>
                                        {emi.status === 'Payment Pending' ? 'Processing...' : 'Pay Now'}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        ) : (
             <Button 
                className="w-full" 
                onClick={() => handlePayNow(false)} 
                disabled={loan.status === 'Payment Pending' || loan.status === 'Completed'}
            >
                {loan.status === 'Payment Pending' ? 'Processing Payment...' : 'Pay Now'}
            </Button>
        )}

         <p className="text-xs text-muted-foreground text-center pt-2">
            Note: Clicking 'Pay Now' will require admin confirmation to complete the payment.
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
