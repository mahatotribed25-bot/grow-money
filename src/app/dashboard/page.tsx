
'use client';

import {
  Bell,
  Briefcase,
  Home,
  User,
  HandCoins,
  FileText,
  AlertCircle,
  Megaphone,
} from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection, useDoc, useFirestore } from '@/firebase';
import type { Timestamp } from 'firebase/firestore';
import { where, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useEffect } from 'react';

type ActiveLoan = {
    id: string;
    loanAmount: number;
    interest: number;
    totalPayable: number;
    duration: number;
    startDate: Timestamp;
    dueDate: Timestamp;
    status: 'Active' | 'Due' | 'Completed';
    userId: string;
}

type LoanRequest = {
    id: string;
    status: 'pending' | 'approved' | 'rejected' | 'sent';
}

type AdminSettings = {
  broadcastMessage?: string;
};

export default function Dashboard() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const { data: adminSettings, loading: settingsLoading } = useDoc<AdminSettings>('settings/admin');
  const { data: activeLoans, loading: activeLoansLoading } = useCollection<ActiveLoan>(
      user ? `users/${user.uid}/loans` : null,
      where('status', '!=', 'Completed')
  );
  const { data: loanRequests, loading: loanRequestsLoading } = useCollection<LoanRequest>(
      user ? `loanRequests` : null,
      where('userId', '==', user?.uid || 'placeholder'),
  );

  const pendingRequest = loanRequests?.find(req => req.status === 'pending');
  const approvedRequest = loanRequests?.find(req => req.status === 'approved');

  const loading = userLoading || activeLoansLoading || loanRequestsLoading || settingsLoading;
  
  // Auto-update loan status to 'Due'
  useEffect(() => {
    if (activeLoans && firestore && user) {
        const now = new Date();
        activeLoans.forEach(async (loan) => {
            if (loan.status === 'Active' && loan.dueDate.toDate() < now) {
                try {
                    const loanRef = doc(firestore, 'users', user.uid, 'loans', loan.id);
                    await updateDoc(loanRef, { status: 'Due' });
                    toast({
                        title: "Loan Overdue",
                        description: "Your loan is now overdue. Please repay it soon.",
                        variant: "destructive",
                    });
                } catch (error) {
                    console.error("Error auto-updating loan status:", error);
                }
            }
        });
    }
  }, [activeLoans, firestore, user, toast]);

  const activeLoan = activeLoans && activeLoans.length > 0 ? activeLoans[0] : null;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/20 bg-background/50 px-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-primary">grow money 💰💰🤑🤑</h1>
        </div>
         <h1 className="text-lg font-semibold">Welcome, {user?.displayName || 'User'}!</h1>
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="space-y-6">
          {adminSettings?.broadcastMessage && (
            <Alert>
              <Megaphone className="h-4 w-4" />
              <AlertTitle>Announcement</AlertTitle>
              <AlertDescription>
                {adminSettings.broadcastMessage}
              </AlertDescription>
            </Alert>
          )}

           <Card className="shadow-lg border-border/50">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>My Loan Status</span>
                        <LoanStatusBadge 
                            activeLoan={activeLoan} 
                            pendingRequest={pendingRequest}
                            approvedRequest={approvedRequest}
                        />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p>Loading loan status...</p>
                    ) : activeLoan ? (
                        <ActiveLoanDetails loan={activeLoan} />
                    ) : pendingRequest ? (
                        <div className="text-center text-muted-foreground py-4">
                            <p>Your loan application is currently pending review.</p>
                        </div>
                    ) : approvedRequest ? (
                         <div className="text-center text-muted-foreground py-4">
                            <p>Your loan is approved! The amount will be sent by the admin shortly.</p>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-4">
                            <p>You have no active loans.</p>
                            <Button asChild className="mt-2">
                                <Link href="/loans">Apply for a Loan</Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
      </main>

      <nav className="sticky bottom-0 z-10 border-t border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-md grid-cols-3 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" active />
          <BottomNavItem icon={HandCoins} label="Loans" href="/loans" />
          <BottomNavItem icon={User} label="Profile" href="/profile" />
        </div>
      </nav>
    </div>
  );
}

const LoanStatusBadge = ({ activeLoan, pendingRequest, approvedRequest }: { activeLoan: any, pendingRequest: any, approvedRequest: any }) => {
    if (activeLoan) {
        return <Badge variant={activeLoan.status === 'Due' ? 'destructive' : 'default'} className="capitalize">{activeLoan.status}</Badge>;
    }
    if (pendingRequest) {
        return <Badge variant="secondary">Pending</Badge>;
    }
    if (approvedRequest) {
        return <Badge variant="default">Approved</Badge>;
    }
    return <Badge variant="outline">None</Badge>;
};

const ActiveLoanDetails = ({ loan }: { loan: ActiveLoan }) => {
    const isDue = loan.status === 'Due';
    
    return (
        <div className="space-y-3">
            <PlanDetail label="Loan Amount" value={`₹${loan.loanAmount.toFixed(2)}`} />
            <PlanDetail label="Interest" value={`₹${loan.interest.toFixed(2)}`} />
            <PlanDetail label="Total Payable" value={`₹${loan.totalPayable.toFixed(2)}`} />
            <PlanDetail label="Start Date" value={new Date(loan.startDate.seconds * 1000).toLocaleDateString()} />
            <PlanDetail label="Due Date" value={new Date(loan.dueDate.seconds * 1000).toLocaleDateString()} />
            {isDue && (
                 <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Loan Overdue</AlertTitle>
                    <AlertDescription>
                        Your loan is now overdue. Please contact support to repay.
                    </AlertDescription>
                </Alert>
            )}
            <Button className="w-full mt-4" disabled>Repay Loan</Button>
            <p className="text-xs text-muted-foreground text-center">To repay your loan, please contact the admin.</p>
        </div>
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
