
'use client';

import {
  Bell,
  Briefcase,
  CreditCard,
  Home,
  Landmark,
  Megaphone,
  User,
  HandCoins,
  FileText,
  AlertCircle
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
import { Progress } from '@/components/ui/progress';
import { useUser } from '@/firebase/auth/use-user';
import { useState, useEffect } from 'react';
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
import { useCollection, useDoc, useFirestore } from '@/firebase';
import {
  addDoc,
  collection,
  runTransaction,
  serverTimestamp,
  doc,
  Timestamp,
  updateDoc,
  writeBatch,
  getDoc,
  query,
  where,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';


type InvestmentPlan = {
  id: string;
  name: string;
  investmentAmount: number;
  profit: number;
  duration: number;
  status: 'Available' | 'Coming Soon';
};

type ActiveInvestment = {
  id: string;
  planName: string;
  investmentAmount: number;
  dailyIncome: number;
  totalReturn: number;
  startDate: Timestamp;
  endDate: Timestamp;
  status: 'Active' | 'Completed';
  userId: string;
  lastIncomeDate?: Timestamp;
};

type ActiveLoan = {
    id: string;
    loanAmount: number;
    interest: number;
    totalPayable: number;
    duration: number;
    startDate: Timestamp;
    dueDate: Timestamp;
    status: 'Active' | 'Due' | 'Completed';
}

type LoanRequest = {
    id: string;
    status: 'pending' | 'approved' | 'rejected';
}

type AdminSettings = {
  upiId?: string;
  upiQrCodeUrl?: string;
  broadcastMessage?: string;
};

type UserData = {
  walletBalance?: number;
  totalInvestment?: number;
  totalIncome?: number;
  upiId?: string;
};

const isValidHttpUrl = (string: string | undefined): boolean => {
  if (!string) return false;
  let url;
  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }
  return url.protocol === 'http:' || url.protocol === 'https:';
}

export default function Dashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const { data: userData, loading: userLoading } = useDoc<UserData>(
    user ? `users/${user.uid}` : null
  );
  const { data: adminSettings, loading: settingsLoading } = useDoc<AdminSettings>('settings/admin');
  const { data: investmentPlans, loading: plansLoading } = useCollection<InvestmentPlan>('investmentPlans');
  const { data: activeInvestments, loading: activePlansLoading } = useCollection<ActiveInvestment>(
    user ? `users/${user.uid}/investments` : null
  );
  const { data: activeLoans, loading: activeLoansLoading } = useCollection<ActiveLoan>(
      user ? `users/${user.uid}/loans` : null,
      where('status', '!=', 'Completed')
  );
  const { data: loanRequests, loading: loanRequestsLoading } = useCollection<LoanRequest>(
      user ? `loanRequests` : null,
      where('userId', '==', user?.uid || 'placeholder'),
      where('status', '==', 'pending')
  );


  const [showRecharge, setShowRecharge] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawUpi, setWithdrawUpi] = useState('');

  useEffect(() => {
    if (userData?.upiId) {
      setWithdrawUpi(userData.upiId);
    }
  }, [userData]);

  useEffect(() => {
    if (user && activeInvestments && activeInvestments.length > 0 && firestore) {
      autoCreditIncome(user.uid, activeInvestments, firestore, toast);
    }
  }, [user, activeInvestments, firestore, toast]);

  const handleRechargeSubmit = () => {
    if (!user || !rechargeAmount || !utrNumber) return;

    const depositData = {
      userId: user.uid,
      userName: user.displayName || 'N/A',
      amount: parseFloat(rechargeAmount),
      utr: utrNumber,
      status: 'pending',
      createdAt: serverTimestamp(),
    };

    const depositsRef = collection(firestore, 'deposits');
    addDoc(depositsRef, depositData)
      .then(() => {
        toast({
          title: 'Recharge Request Submitted',
          description: `Your request for ₹${rechargeAmount} has been submitted and is pending approval.`,
        });
        setShowRecharge(false);
        setRechargeAmount('');
        setUtrNumber('');
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: depositsRef.path,
          operation: 'create',
          requestResourceData: depositData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleWithdrawSubmit = () => {
    if (!user || !withdrawAmount || !withdrawUpi) return;

    const currentBalance = userData?.walletBalance || 0;
    const amountToWithdraw = parseFloat(withdrawAmount);

    if (amountToWithdraw > currentBalance) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Balance',
        description: 'You do not have enough funds to withdraw this amount.',
      });
      return;
    }

    const withdrawalData = {
      userId: user.uid,
      userName: user.displayName || 'N/A',
      amount: amountToWithdraw,
      upiId: withdrawUpi,
      status: 'pending',
      createdAt: serverTimestamp(),
    };

    const userRef = doc(firestore, 'users', user.uid);
    const withdrawalsRef = collection(firestore, 'withdrawals');

    runTransaction(firestore, async (transaction) => {
      const newBalance = currentBalance - amountToWithdraw;
      transaction.update(userRef, { walletBalance: newBalance });
      const withdrawalRef = doc(withdrawalsRef); 
      transaction.set(withdrawalRef, withdrawalData);
    })
      .then(() => {
        toast({
          title: 'Withdrawal Request Submitted',
          description: `Your request for ₹${withdrawAmount} has been submitted. The amount has been deducted from your wallet.`,
        });
        setShowWithdraw(false);
        setWithdrawAmount('');
      })
      .catch((error) => {
        console.error(error);
        const permissionError = new FirestorePermissionError({
          path: withdrawalsRef.path,
          operation: 'create',
          requestResourceData: withdrawalData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const activeLoan = activeLoans && activeLoans.length > 0 ? activeLoans[0] : null;
  const hasPendingLoanRequest = loanRequests && loanRequests.length > 0;

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

      <Dialog open={showRecharge} onOpenChange={setShowRecharge}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recharge Wallet</DialogTitle>
            <DialogDescription>
              To add funds, transfer the amount to the UPI ID below and submit the transaction details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             {settingsLoading ? <p>Loading UPI details...</p> : (
                <div className="flex flex-col items-center justify-center space-y-2 rounded-md bg-muted p-4">
                {isValidHttpUrl(adminSettings?.upiQrCodeUrl) ? (
                    <Image
                    data-ai-hint="QR code"
                    src={adminSettings.upiQrCodeUrl!}
                    alt="Admin UPI QR Code"
                    width={150}
                    height={150}
                    className="rounded-md"
                    />
                ) : (
                    <div className="h-[150px] w-[150px] flex items-center justify-center bg-gray-200 rounded-md text-sm text-gray-500">QR Code</div>
                )}
                <p className="text-sm font-medium">{adminSettings?.upiId || 'UPI ID not set'}</p>
                </div>
             )}
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
            <div className="space-y-2">
              <Label htmlFor="utr-number">UTR Number</Label>
              <Input
                id="utr-number"
                type="text"
                placeholder="Enter UTR/Transaction ID"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecharge(false)}>
              Cancel
            </Button>
            <Button onClick={handleRechargeSubmit} disabled={!rechargeAmount || !utrNumber || !adminSettings?.upiId}>
              Submit Request
            </Button>
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
              <Label htmlFor="withdraw-upi">UPI ID</Label>{' '}
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
            <Button
              onClick={handleWithdrawSubmit}
              disabled={!withdrawAmount || !withdrawUpi}
            >
              Request Withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <CardTitle>Wallet Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 text-center">
              {userLoading ? (
                <div className="col-span-3 text-center">Loading wallet...</div>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Wallet Balance
                    </p>
                    <p className="text-2xl font-bold">
                      ₹{(userData?.walletBalance || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Investment
                    </p>
                    <p className="text-2xl font-bold">
                      ₹{(userData?.totalInvestment || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Income</p>
                    <p className="text-2xl font-bold">
                      ₹{(userData?.totalIncome || 0).toFixed(2)}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <div
              onClick={() => setShowRecharge(true)}
              className="cursor-pointer"
            >
              <ActionButton icon={CreditCard} label="Recharge" />
            </div>
            <div
              onClick={() => setShowWithdraw(true)}
              className="cursor-pointer"
            >
              <ActionButton icon={Landmark} label="Withdraw" />
            </div>
          </div>
          
           <Card className="shadow-lg border-border/50">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>My Loan</span>
                        <LoanStatusBadge activeLoan={activeLoan} hasPendingRequest={hasPendingLoanRequest} />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {(activeLoansLoading || loanRequestsLoading) ? (
                        <p>Loading loan status...</p>
                    ) : activeLoan ? (
                        <ActiveLoanDetails loan={activeLoan} />
                    ) : hasPendingLoanRequest ? (
                        <div className="text-center text-muted-foreground py-4">
                            <p>Your loan application is currently pending review.</p>
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


          <div>
            <h2 className="text-lg font-semibold mb-4">Our Investment Plans</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plansLoading ? (
                <p>Loading plans...</p>
              ) : (
                investmentPlans?.map((plan, i) => (
                  <InvestmentCard
                    key={plan.id}
                    plan={plan}
                    walletBalance={userData?.walletBalance || 0}
                    userId={user?.uid || ''}
                  />
                ))
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">My Active Investments</h2>
            <div className="mt-4 space-y-4">
              {activePlansLoading ? (
                <p>Loading active plans...</p>
              ) : activeInvestments && activeInvestments.length > 0 ? (
                 activeInvestments?.map((plan) => (
                  <ActivePlanCard 
                    key={plan.id} 
                    plan={plan} 
                    userId={user?.uid || ''} 
                  />
                ))
              ) : (
                <p className="text-muted-foreground text-sm">You have no active investment plans.</p>
              )}
            </div>
          </div>
        </div>
      </main>

      <nav className="sticky bottom-0 z-10 border-t border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-md grid-cols-4 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" active />
          <BottomNavItem icon={FileText} label="My Plans" href="/plans" />
          <BottomNavItem icon={HandCoins} label="Loans" href="/loans" />
          <BottomNavItem icon={User} label="Profile" href="/profile" />
        </div>
      </nav>
    </div>
  );
}

const LoanStatusBadge = ({ activeLoan, hasPendingRequest }: { activeLoan: any, hasPendingRequest: boolean }) => {
    if (activeLoan) {
        return <Badge variant="default" className="capitalize">{activeLoan.status}</Badge>;
    }
    if (hasPendingRequest) {
        return <Badge variant="secondary">Pending</Badge>;
    }
    return <Badge variant="outline">None</Badge>;
};

const ActiveLoanDetails = ({ loan }: { loan: ActiveLoan }) => {
    const isDue = new Date(loan.dueDate.seconds * 1000) < new Date();
    
    return (
        <div className="space-y-3">
            <PlanDetail label="Loan Amount" value={`₹${loan.loanAmount.toFixed(2)}`} />
            <PlanDetail label="Interest" value={`₹${loan.interest.toFixed(2)}`} />
            <PlanDetail label="Total Payable" value={`₹${loan.totalPayable.toFixed(2)}`} />
            <PlanDetail label="Start Date" value={new Date(loan.startDate.seconds * 1000).toLocaleDateString()} />
            <PlanDetail label="Due Date" value={new Date(loan.dueDate.seconds * 1000).toLocaleDateString()} />
            {isDue && loan.status === 'Active' && (
                 <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Loan Due</AlertTitle>
                    <AlertDescription>
                        Your loan is now due for repayment.
                    </AlertDescription>
                </Alert>
            )}
            <Button className="w-full mt-4" disabled={loan.status !== 'Active'}>Repay Loan</Button>
        </div>
    );
}

function ActionButton({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <Card className="flex h-24 flex-col items-center justify-center gap-2 rounded-lg bg-card text-card-foreground shadow-lg border-border/50 transition-colors hover:bg-accent/50">
      <Icon className="h-6 w-6 text-primary" />
      <span className="text-sm font-medium">{label}</span>
    </Card>
  );
}

function InvestmentCard({
  plan,
  walletBalance,
  userId,
}: {
  plan: InvestmentPlan;
  walletBalance: number;
  userId: string;
}) {
  const {
    name,
    investmentAmount,
    profit,
    duration,
    status,
  } = plan;
  const firestore = useFirestore();
  const { toast } = useToast();

  const canAfford = walletBalance >= investmentAmount;
  const totalReturn = investmentAmount + profit * duration;

  const handleInvest = async () => {
    if (!canAfford || !userId) return;

    const userRef = doc(firestore, 'users', userId);
    const investmentRef = collection(firestore, `users/${userId}/investments`);

    try {
      await runTransaction(firestore, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw 'User not found';

        const currentBalance = userDoc.data().walletBalance || 0;
        const currentInvestment = userDoc.data().totalInvestment || 0;
        if (currentBalance < investmentAmount) {
          throw 'Insufficient balance';
        }

        const newBalance = currentBalance - investmentAmount;
        const newTotalInvestment = currentInvestment + investmentAmount;

        transaction.update(userRef, {
          walletBalance: newBalance,
          totalInvestment: newTotalInvestment,
        });

        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + duration);

        transaction.set(doc(investmentRef), {
          userId: userId,
          planName: name,
          investmentAmount: investmentAmount,
          dailyIncome: profit,
          totalReturn: investmentAmount + (profit * duration),
          startDate: Timestamp.fromDate(startDate),
          endDate: Timestamp.fromDate(endDate),
          status: 'Active',
          lastIncomeDate: Timestamp.fromDate(startDate),
        });
      });

      toast({
        title: 'Investment Successful!',
        description: `You have invested in ${name}.`,
      });
    } catch (e: any) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Investment Failed',
        description: e.toString(),
      });
    }
  };

  return (
    <Card className="rounded-lg shadow-lg border-border/50 bg-gradient-to-br from-secondary/50 to-background">
      <CardHeader>
        <CardTitle className='text-primary'>{name}</CardTitle>
        {status === 'Coming Soon' && (
          <CardDescription>Coming Soon</CardDescription>
        )}
      </CardHeader>
      {status !== 'Coming Soon' && (
        <CardContent className="space-y-4">
          <PlanDetail label="Investment" value={`₹${investmentAmount}`} />
          <PlanDetail label="Daily Profit" value={`₹${profit}`} />
          <PlanDetail label="Duration" value={`${duration} Day(s)`} />
          <PlanDetail
            label="Total Return"
            value={`₹${totalReturn}`}
          />
          <Button
            className="w-full"
            disabled={!canAfford}
            onClick={handleInvest}
          >
            Invest Now
          </Button>
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

const autoCreditIncome = async (userId: string, plans: ActiveInvestment[], firestore: any, toast: any) => {
  const userRef = doc(firestore, 'users', userId);
  const batch = writeBatch(firestore);
  let totalIncomeToCredit = 0;
  let hasUpdates = false;

  for (const plan of plans) {
    if (plan.status !== 'Active' || new Date() > plan.endDate.toDate()) {
      continue;
    }
    
    const lastIncomeDate = plan.lastIncomeDate ? plan.lastIncomeDate.toDate() : plan.startDate.toDate();
    const now = new Date();
    const hoursPassed = (now.getTime() - lastIncomeDate.getTime()) / (1000 * 60 * 60);
    const periodsToCredit = Math.floor(hoursPassed / 24);

    if (periodsToCredit > 0) {
      const incomeThisPlan = periodsToCredit * plan.dailyIncome;
      totalIncomeToCredit += incomeThisPlan;
      
      const newLastIncomeDate = new Date(lastIncomeDate.getTime() + periodsToCredit * 24 * 60 * 60 * 1000);
      
      const investmentRef = doc(firestore, `users/${userId}/investments`, plan.id);
      batch.update(investmentRef, { lastIncomeDate: Timestamp.fromDate(newLastIncomeDate) });
      hasUpdates = true;
    }
  }

  if (hasUpdates) {
    try {
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const currentTotalIncome = userDoc.data().totalIncome || 0;
        batch.update(userRef, { totalIncome: currentTotalIncome + totalIncomeToCredit });
      }
      
      await batch.commit();
      
      if (totalIncomeToCredit > 0) {
        toast({
          title: 'Income Automatically Credited',
          description: `₹${totalIncomeToCredit.toFixed(2)} has been added to your total income.`,
        });
      }
    } catch (error) {
      console.error("Error auto-crediting income:", error);
      toast({
        title: 'Auto-Credit Failed',
        description: 'Could not automatically credit your income.',
        variant: 'destructive',
      });
    }
  }
};

function formatDuration(milliseconds: number) {
  if (milliseconds < 0) return "00d 00h 00m 00s";
  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return `${String(days).padStart(2, '0')}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}


function ActivePlanCard({ plan, userId }: { plan: ActiveInvestment, userId: string }) {
  const { id, planName, status, startDate, endDate, totalReturn } = plan;
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [remainingTime, setRemainingTime] = useState(endDate.toDate().getTime() - new Date().getTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingTime(endDate.toDate().getTime() - new Date().getTime());
    }, 1000);
    return () => clearInterval(timer);
  }, [endDate]);

  const isExpired = remainingTime <= 0;
  
  const handleComplete = async () => {
     if (status !== 'Active' || !isExpired || !userId) return;

    const userRef = doc(firestore, 'users', userId);
    const investmentRef = doc(firestore, `users/${userId}/investments`, id);

    try {
      await runTransaction(firestore, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw 'User not found';

        const investmentDoc = await transaction.get(investmentRef);
        if (!investmentDoc.exists() || investmentDoc.data().status !== 'Active') {
          throw 'Investment is not active or not found.';
        }

        const currentBalance = userDoc.data().walletBalance || 0;
        
        transaction.update(userRef, {
          walletBalance: currentBalance + totalReturn,
        });

        transaction.update(investmentRef, { status: 'Completed' });
      });

      toast({
        title: "Plan Completed!",
        description: `₹${totalReturn} has been added to your wallet for the completed ${planName} plan.`
      });
    } catch (e: any) {
        console.error("Error completing plan:", e);
        toast({
            variant: "destructive",
            title: "Completion Failed",
            description: e.toString()
        });
    }
  };
  
  const getProgress = () => {
    if (status === 'Completed' || isExpired) return 100;
    
    const totalDuration = endDate.toMillis() - startDate.toMillis();
    if (totalDuration <= 0) return 100;
    
    const elapsed = new Date().getTime() - startDate.toMillis();
    const progress = (elapsed / totalDuration) * 100;
    
    return Math.min(progress, 100);
  };


  const renderButton = () => {
    if (status === 'Completed') {
      return <Button size="sm" disabled>Completed</Button>;
    }
    if (isExpired) {
      return <Button size="sm" onClick={handleComplete}>Complete Plan</Button>
    }
    return null;
  };

  return (
    <Card className="rounded-lg shadow-lg border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold">{planName}</p>
             <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${
                status === 'Active' && !isExpired
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}
            >
              {isExpired && status === 'Active' ? 'Expired' : status}
            </span>
          </div>
          {renderButton()}
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
             <span>
              {status === 'Completed' ? 'Completed' : formatDuration(remainingTime)}
            </span>
          </div>
          <Progress value={getProgress()} className="mt-1 h-2" />
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
            Daily income is credited automatically.
        </div>
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

    