
'use client';

import {
  ChevronLeft,
  Home,
  User,
  HandCoins,
  FileText,
  IndianRupee,
  Calendar,
  Percent,
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
import { useCollection, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type LoanPlan = {
  id: string;
  name: string;
  loanAmount: number;
  interest: number;
  totalRepayment: number;
  duration: number;
  emiOption: boolean;
  directPayOption: boolean;
};

type LoanRequest = {
  id: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected' | 'sent';
}

type ActiveLoan = {
    id: string;
    status: 'Active' | 'Due' | 'Completed';
}

export default function LoansPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const { data: loanPlans, loading: plansLoading } = useCollection<LoanPlan>('loanPlans');
  
  const { data: userLoanRequests, loading: requestsLoading } = useCollection<LoanRequest>(
      'loanRequests',
       where('userId', '==', user?.uid || 'placeholder'),
  );

  const { data: activeLoans, loading: activeLoansLoading } = useCollection<ActiveLoan>(
    user ? `users/${user?.uid}/loans` : null,
    where('status', '!=', 'Completed')
  );
  
  const hasPendingRequest = userLoanRequests?.some(req => req.status === 'pending');
  const hasActiveLoan = activeLoans && activeLoans.length > 0;

  const handleApply = async (plan: LoanPlan) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'You must be logged in.' });
        return;
    }
    if (hasPendingRequest) {
        toast({ variant: 'destructive', title: 'You already have a pending loan request.' });
        return;
    }
    if (hasActiveLoan) {
        toast({ variant: 'destructive', title: 'You already have an active loan.' });
        return;
    }

    const requestData = {
        userId: user.uid,
        userName: user.displayName || 'N/A',
        planId: plan.id,
        planName: plan.name,
        loanAmount: plan.loanAmount,
        status: 'pending',
        createdAt: serverTimestamp(),
    };

    const requestsRef = collection(firestore, 'loanRequests');
    addDoc(requestsRef, requestData)
        .then(() => {
            toast({
                title: 'Loan Request Submitted',
                description: `Your application for the ${plan.name} has been submitted for review.`,
            });
        })
        .catch(() => {
            const permissionError = new FirestorePermissionError({
                path: requestsRef.path,
                operation: 'create',
                requestResourceData: requestData,
            });
            errorEmitter.emit('permission-error', permissionError);
             toast({
                variant: 'destructive',
                title: 'Submission Failed',
                description: 'Could not submit your loan request. Please try again.',
            });
        });
  };
  
  const loading = plansLoading || requestsLoading || activeLoansLoading;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 px-4 backdrop-blur-sm sm:px-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">Apply for a Loan</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="space-y-4">
            {(hasPendingRequest || hasActiveLoan) && (
                <Card className="bg-yellow-500/10 border-yellow-500/50">
                    <CardContent className="p-4 text-center text-yellow-300">
                        {hasActiveLoan 
                            ? <p>You have an active loan. You must repay it before applying for a new one.</p>
                            : <p>You have a loan request that is currently pending review. You cannot apply for another loan at this time.</p>
                        }
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <p>Loading loan plans...</p>
                ) : loanPlans && loanPlans.length > 0 ? (
                    loanPlans.map((plan) => (
                        <LoanPlanCard key={plan.id} plan={plan} onApply={handleApply} disabled={hasPendingRequest || hasActiveLoan}/>
                    ))
                ) : (
                    <p>No loan plans are available at the moment.</p>
                )}
            </div>
        </div>
      </main>

      <nav className="sticky bottom-0 z-10 border-t border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-md grid-cols-3 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={HandCoins} label="Loans" href="/loans" active />
          <BottomNavItem icon={User} label="Profile" href="/profile" />
        </div>
      </nav>
    </div>
  );
}

function LoanPlanCard({ plan, onApply, disabled }: { plan: LoanPlan, onApply: (plan: LoanPlan) => void, disabled: boolean }) {
  return (
    <Card className="shadow-lg border-border/50 bg-gradient-to-br from-secondary/50 to-background">
      <CardHeader>
        <CardTitle className="text-primary">{plan.name}</CardTitle>
        <CardDescription>Loan Amount: ₹{plan.loanAmount.toFixed(2)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LoanDetail icon={Percent} label="Interest" value={`₹${plan.interest.toFixed(2)}`} />
        <LoanDetail icon={IndianRupee} label="Total Repayment" value={`₹${plan.totalRepayment.toFixed(2)}`} />
        <LoanDetail icon={Calendar} label="Duration" value={`${plan.duration} Months`} />
        <div className="flex justify-around text-xs">
            {plan.emiOption && <span className="text-green-400">EMI Available</span>}
            {plan.directPayOption && <span className="text-green-400">Full Payment Available</span>}
        </div>
        <Button className="w-full" onClick={() => onApply(plan)} disabled={disabled}>Apply Now</Button>
      </CardContent>
    </Card>
  );
}

function LoanDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
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
