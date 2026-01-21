
'use client';
import {
  ChevronLeft,
  Home,
  User,
  Briefcase,
  HandCoins,
  Users as UsersIcon,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import type { Timestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEffect, useState } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { addDays } from 'date-fns';

type DurationType = 'Days' | 'Weeks' | 'Months' | 'Years';

type EMI = {
    emiAmount: number;
    dueDate: Timestamp;
    status: 'Pending' | 'Paid' | 'Due' | 'Payment Pending';
}

type Loan = {
  id: string;
  planName: string;
  loanAmount: number;
  totalPayable: number;
  penalty?: number;
  startDate: Timestamp;
  dueDate: Timestamp;
  status: 'Active' | 'Due' | 'Completed' | 'Payment Pending';
  duration: number;
  durationType: DurationType;
  repaymentMethod: 'EMI' | 'Direct';
  emis?: EMI[];
};

type AdminSettings = {
    loanPenalty?: number;
}

const CountdownTimer = ({ endDate }: { endDate: Date }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const distance = endDate.getTime() - now.getTime();

            if (distance < 0) {
                setTimeLeft("Due");
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        };
        
        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(interval);
    }, [endDate]);

    return <span className="font-mono">{timeLeft}</span>;
};


export default function MyLoansPage() {
  const { user, loading: userLoading } = useUser();
  const { data: allLoans, loading: loansLoading } =
    useCollection<Loan>(
      user ? `users/${user.uid}/loans` : null
    );
  const { data: adminSettings, loading: settingsLoading } = useDoc<AdminSettings>(user ? 'settings/admin' : null);


  const loading = userLoading || loansLoading || settingsLoading;
  
  const sortedLoans = allLoans?.sort((a,b) => b.startDate.seconds - a.startDate.seconds);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 px-4 backdrop-blur-sm sm:px-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">My Loan History</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
         <div className="space-y-4">
            {loading ? <p>Loading loan history...</p> : 
                sortedLoans && sortedLoans.length > 0 ? (
                    sortedLoans.map(loan => <LoanCard key={loan.id} loan={loan} adminSettings={adminSettings} />)
                ) : (
                    <Card>
                        <CardContent className="pt-6 text-center text-muted-foreground">
                           <p>You have no active or past loans.</p>
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
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={UsersIcon} label="Team" href="/team" />
          <BottomNavItem icon={HandCoins} label="My Loans" href="/my-loans" active/>
          <BottomNavItem icon={User} label="Profile" href="/profile" />
        </div>
      </nav>
    </div>
  );
}


function LoanCard({ loan, adminSettings }: { loan: Loan, adminSettings: AdminSettings | null }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);


  useEffect(() => {
    // This effect runs only on the client, preventing hydration mismatch
    const updateCurrentTime = () => setCurrentTime(new Date());
    updateCurrentTime();
    const timer = setInterval(updateCurrentTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkOverdue = async () => {
      if (!user || !adminSettings || !['Active', 'Due'].includes(loan.status) || !currentTime) {
        return;
      }
      
      const dueDate = loan.dueDate.toDate();
      const gracePeriodEndDate = addDays(dueDate, 1);
      
      if (currentTime > gracePeriodEndDate) {
        const dailyPenalty = adminSettings.loanPenalty || 0;
        if (dailyPenalty <= 0) return;

        const overdueMilliseconds = currentTime.getTime() - gracePeriodEndDate.getTime();
        const overdueDays = Math.floor(overdueMilliseconds / (1000 * 60 * 60 * 24)) + 1;
        
        const newPenalty = overdueDays * dailyPenalty;
        
        if (loan.status !== 'Due' || newPenalty > (loan.penalty || 0)) {
          const loanRef = doc(firestore, 'users', user.uid, 'loans', loan.id);
          const dataToUpdate = {
            status: 'Due',
            penalty: newPenalty
          };

          try {
            await updateDoc(loanRef, dataToUpdate);
            if (newPenalty > (loan.penalty || 0)) {
              toast({
                  title: 'Loan Overdue Penalty Applied',
                  description: `Your penalty has been updated. Total penalty is now ₹${newPenalty.toFixed(2)}.`,
                  variant: 'destructive'
              });
            }
          } catch (e) {
            const permissionError = new FirestorePermissionError({
                path: loanRef.path,
                operation: 'update',
                requestResourceData: dataToUpdate
            });
            errorEmitter.emit('permission-error', permissionError);
          }
        }
      }
    };
    
    checkOverdue();
  }, [currentTime, loan, user, firestore, adminSettings, toast]);

  if (!loan.startDate || !loan.dueDate) {
    return null;
  }
  
  const startDate = loan.startDate.toDate();
  const dueDate = loan.dueDate.toDate();
  
  const totalRepayment = loan.totalPayable + (loan.penalty || 0);

  const handlePayNow = async (isEmi: boolean, emiIndex?: number) => {
    if (!user) return;
    const loanRef = doc(firestore, 'users', user.uid, 'loans', loan.id);
    let dataToUpdate: { emis: EMI[] } | { status: string };

    if(isEmi && emiIndex !== undefined && loan.emis) {
        const updatedEmis = loan.emis.map((emi, index) => {
            if(index === emiIndex) {
                return {...emi, status: 'Payment Pending'};
            }
            return emi;
        });
        dataToUpdate = { emis: updatedEmis };
    } else {
        dataToUpdate = { status: 'Payment Pending' };
    }
  
    updateDoc(loanRef, dataToUpdate)
    .then(() => {
      toast({
        title: 'Payment Initiated',
        description: 'Your payment is being processed. The admin will confirm it shortly.',
      });
    })
    .catch((error) => {
        const permissionError = new FirestorePermissionError({
            path: loanRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
        case 'Active':
        case 'Paid':
             return 'default';
        case 'Due': return 'destructive';
        case 'Payment Pending': return 'outline';
        case 'Completed': return 'secondary';
        default: return 'secondary';
    }
  }

  const isEmiPayable = (emi: EMI) => {
      return currentTime && (new Date(emi.dueDate.seconds * 1000) <= currentTime) && emi.status === 'Pending';
  }

  return (
    <Card className="bg-gradient-to-br from-card to-secondary/30 border-primary/10">
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
        {loan.status === 'Due' && loan.penalty ? (
            <>
                <div className="flex justify-between">
                  <p className="text-sm text-muted-foreground">Original Repayment</p>
                  <p className="font-semibold">₹{(loan.totalPayable || 0).toFixed(2)}</p>
                </div>
                 <div className="flex justify-between text-destructive">
                  <p className="text-sm font-semibold">Overdue Penalty</p>
                  <p className="font-semibold">₹{(loan.penalty || 0).toFixed(2)}</p>
                </div>
            </>
        ) : null}
        <div className="flex justify-between">
          <p className="text-sm text-muted-foreground">Total Repayment Due</p>
          <p className="font-semibold text-red-400">
            ₹{totalRepayment.toFixed(2)}
          </p>
        </div>
        {loan.status === 'Active' && currentTime && (
            <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Time Remaining:</span>
                    <CountdownTimer endDate={dueDate} />
                </div>
            </div>
        )}
        
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
                                    {loan.status !== 'Completed' && (
                                         <Button size="sm" onClick={() => handlePayNow(true, index)} disabled={!isEmiPayable(emi) || emi.status !== 'Pending'}>
                                            {emi.status === 'Payment Pending' ? 'Processing...' : emi.status === 'Paid' ? 'Paid' : 'Pay Now'}
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        ) : loan.status !== 'Completed' && (
             <Button 
                className="w-full" 
                onClick={() => handlePayNow(false)} 
                disabled={loan.status === 'Payment Pending' || loan.status === 'Completed'}
            >
                {loan.status === 'Payment Pending' ? 'Processing Payment...' : 'Pay Full Amount Now'}
            </Button>
        )}

         {loan.status !== 'Completed' && <p className="text-xs text-muted-foreground text-center pt-2">
            Note: Clicking 'Pay Now' will require admin confirmation to complete the payment.
        </p>}
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
