
'use client';
import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  Home,
  User,
  HandCoins,
  Briefcase,
  IndianRupee,
  Calendar,
  Percent,
  Landmark,
  Users as UsersIcon,
  AlertTriangle,
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
import { collection, addDoc, serverTimestamp, query, where, type Timestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

type DurationType = 'Days' | 'Weeks' | 'Months' | 'Years';

type LoanPlan = {
  id: string;
  name: string;
  loanAmount: number;
  interest: number;
  tax?: number;
  totalRepayment: number;
  duration: number;
  durationType: DurationType;
  emiOption: boolean;
  directPayOption: boolean;
};

type LoanRequest = {
  id: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected' | 'sent';
  createdAt: Timestamp;
  rejectionReason?: string;
}

type ActiveLoan = {
    id: string;
    status: 'Active' | 'Due' | 'Completed' | 'Payment Pending';
}

type UserData = {
    panCard?: string;
    upiId?: string;
    aadhaarNumber?: string;
    phoneNumber?: string;
    kycStatus?: 'Not Submitted' | 'Pending' | 'Verified' | 'Rejected';
    kycRejectionReason?: string;
}

export default function LoansPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const { data: loanPlans, loading: plansLoading } = useCollection<LoanPlan>('loanPlans');
  
  const { data: userLoanRequests, loading: requestsLoading } = useCollection<LoanRequest>(
      user ? query(collection(firestore, 'loanRequests'), where('userId', '==', user.uid)) : null
  );

  const { data: activeLoans, loading: activeLoansLoading } = useCollection<ActiveLoan>(
    user ? query(collection(firestore, 'users', user.uid, 'loans'), where('status', '!=', 'Completed')) : null,
  );
  
  const { data: userData, loading: userLoading } = useDoc<UserData>(user ? `users/${user.uid}` : null);

  const sortedRequests = useMemo(() => {
    if (!userLoanRequests) return [];
    return [...userLoanRequests].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
  }, [userLoanRequests]);

  const latestRequest = sortedRequests[0];
  const hasActiveLoan = activeLoans && activeLoans.length > 0;
  const isKycVerified = userData?.kycStatus === 'Verified';

  const canApply = !hasActiveLoan && latestRequest?.status !== 'pending' && latestRequest?.status !== 'approved' && latestRequest?.status !== 'sent' && isKycVerified;

  const getEligibilityMessage = () => {
    if (loading) return null;
    if (isKycVerified) {
      if (hasActiveLoan) {
        return <p>You have an active loan. You must repay it before applying for a new one. <Link href="/my-loans" className="underline">View loan details.</Link></p>;
      }
      if (latestRequest?.status === 'pending') {
        return <p>You have a loan request that is currently pending review. You cannot apply for another loan at this time.</p>;
      }
      if (latestRequest?.status === 'rejected') {
        return <p>Your last loan request was rejected. Reason: &quot;{latestRequest.rejectionReason}&quot;. You may apply for a new loan.</p>;
      }
    } else {
      switch (userData?.kycStatus) {
        case 'Pending':
          return <p>Your KYC is pending approval. You can apply for a loan once it is verified. <Link href="/profile" className="underline">Check status.</Link></p>;
        case 'Rejected':
          return <p>Your KYC submission was rejected. Please correct your details to apply for a loan. <Link href="/profile" className="underline">Update KYC.</Link></p>;
        default:
          return <p>Please complete your KYC in your profile to be eligible for a loan. <Link href="/profile" className="underline">Go to Profile.</Link></p>;
      }
    }
    return null;
  }
  
  const eligibilityMessage = getEligibilityMessage();

  const handleApply = (plan: LoanPlan, repaymentMethod: string) => {
    if (!user || !userData) {
        toast({ variant: 'destructive', title: 'You must be logged in.' });
        return;
    }
    if (!canApply) {
        toast({ variant: 'destructive', title: 'Cannot Apply', description: "You are not eligible to apply for a loan at this time. Please check the notice above." });
        return;
    }
    if ((plan.emiOption && plan.directPayOption) && !repaymentMethod) {
        toast({ variant: 'destructive', title: 'Repayment Method Required', description: "Please select a repayment method." });
        return;
    }


    const requestData = {
        userId: user.uid,
        userName: user.displayName || 'N/A',
        userUpiId: userData.upiId || '',
        planId: plan.id,
        planName: plan.name,
        loanAmount: plan.loanAmount,
        status: 'pending' as const,
        createdAt: serverTimestamp(),
        repaymentMethod: repaymentMethod,
    };

    const requestsRef = collection(firestore, 'loanRequests');
    addDoc(requestsRef, requestData)
        .then(() => {
            toast({
                title: 'Loan Request Submitted',
                description: `Your application for the ${plan.name} has been submitted for review.`,
            });
        })
        .catch((serverError) => {
            const permissionError = new FirestorePermissionError({
                path: requestsRef.path,
                operation: 'create',
                requestResourceData: requestData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
  };
  
  const loading = plansLoading || requestsLoading || activeLoansLoading || userLoading;
  
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
            {eligibilityMessage && (
                <Card className="bg-yellow-500/10 border-yellow-500/50">
                    <CardContent className="p-4 text-center text-yellow-300">
                        {eligibilityMessage}
                    </CardContent>
                </Card>
            )}

            <Card className="bg-red-500/10 border-red-500/50">
                <CardHeader>
                    <CardTitle className="text-red-300 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5"/>
                        Important Notice
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-red-300/90 text-sm">
                    <p>Please be aware that if you fail to repay your loan on time and the loan becomes overdue, a penalty will be applied. Ensure you make your repayments by the due date to avoid extra charges.</p>
                </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <p>Loading loan plans...</p>
                ) : loanPlans && loanPlans.length > 0 ? (
                    loanPlans.map((plan) => (
                        <LoanPlanCard key={plan.id} plan={plan} onApply={handleApply} disabled={!canApply}/>
                    ))
                ) : (
                    <p>No loan plans are available at the moment.</p>
                )}
            </div>
        </div>
      </main>

      <nav className="sticky bottom-0 z-10 border-t border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={UsersIcon} label="Team" href="/team" />
          <BottomNavItem icon={HandCoins} label="My Loans" href="/my-loans" active />
          <BottomNavItem icon={User} label="Profile" href="/profile" />
        </div>
      </nav>
    </div>
  );
}

function LoanPlanCard({ plan, onApply, disabled }: { plan: LoanPlan, onApply: (plan: LoanPlan, repaymentMethod: string) => void, disabled: boolean }) {
  const [repaymentMethod, setRepaymentMethod] = useState('');
  
  const showRepaymentOptions = plan.emiOption && plan.directPayOption;

  const handleApplyClick = () => {
    let method = '';
    if (plan.emiOption && !plan.directPayOption) method = 'EMI';
    else if (!plan.emiOption && plan.directPayOption) method = 'Direct';
    else method = repaymentMethod;
    onApply(plan, method);
  }

  return (
    <Card className="shadow-lg border-border/50 bg-gradient-to-br from-secondary/50 to-background">
      <CardHeader>
        <CardTitle className="text-primary">{plan.name}</CardTitle>
        <CardDescription>Loan Amount: ₹{(plan.loanAmount || 0).toFixed(2)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LoanDetail icon={Percent} label="Interest" value={`₹${(plan.interest || 0).toFixed(2)}`} />
        <LoanDetail icon={Landmark} label="Tax" value={`₹${(plan.tax || 0).toFixed(2)}`} />
        <LoanDetail icon={IndianRupee} label="Total Repayment" value={`₹${(plan.totalRepayment || 0).toFixed(2)}`} />
        <LoanDetail icon={Calendar} label="Duration" value={`${plan.duration} ${plan.durationType}`} />
        
        {showRepaymentOptions && (
          <div className="space-y-2">
            <Label>Choose Repayment Method</Label>
            <RadioGroup onValueChange={setRepaymentMethod} value={repaymentMethod} required>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="EMI" id={`emi-${plan.id}`} />
                <Label htmlFor={`emi-${plan.id}`}>EMI</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Direct" id={`direct-${plan.id}`} />
                <Label htmlFor={`direct-${plan.id}`}>Direct Pay</Label>
              </div>
            </RadioGroup>
          </div>
        )}

        <div className="flex justify-around text-xs">
            {plan.emiOption && !showRepaymentOptions && <span className="text-green-400">EMI Available</span>}
            {plan.directPayOption && !showRepaymentOptions && <span className="text-green-400">Full Payment Available</span>}
        </div>
        <Button className="w-full" onClick={handleApplyClick} disabled={disabled}>Apply Now</Button>
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
