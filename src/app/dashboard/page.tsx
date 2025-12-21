
'use client';

import {
  Bell,
  Briefcase,
  CreditCard,
  Home,
  Landmark,
  User,
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
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { isToday, startOfDay } from 'date-fns';


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
  lastClaimedDate?: Timestamp;
};

type AdminSettings = {
  upiId?: string;
  upiQrCodeUrl?: string;
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


  const { data: investmentPlans, loading: plansLoading } =
    useCollection<InvestmentPlan>('investmentPlans');

  const { data: activePlans, loading: activePlansLoading } = useCollection<ActiveInvestment>(
    user ? `users/${user.uid}/investments` : null
  );

  const [showWelcome, setShowWelcome] = useState(true);
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


  const handleCloseWelcome = () => {
    setShowWelcome(false);
  };

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
      // Deduct from user's balance immediately
      const newBalance = currentBalance - amountToWithdraw;
      transaction.update(userRef, { walletBalance: newBalance });

      // Create withdrawal request
      const withdrawalRef = doc(withdrawalsRef); // Create a new doc ref
      transaction.set(withdrawalRef, withdrawalData);
    })
      .then(() => {
        toast({
          title: 'Withdrawal Request Submitted',
          description: `Your request for ₹${withdrawAmount} has been submitted. The amount has been deducted from your wallet.`,
        });
        setShowWithdraw(false);
        setWithdrawAmount('');
        // setWithdrawUpi(''); keep it pre-filled
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

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/20 bg-background/50 px-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-primary">grow money 💰💰🤑🤑</h1>
        </div>
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
      </header>

      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">
              WELCOME To TRIBED WORLD 💰💰🤑🤑
            </DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleCloseWelcome} className="w-full">
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

          <div>
            <h2 className="text-lg font-semibold mb-4">Investment Plans</h2>
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
            <h2 className="text-lg font-semibold mb-4">Active Plans</h2>
            <div className="mt-4 space-y-4">
              {activePlansLoading ? (
                <p>Loading active plans...</p>
              ) : (
                 activePlans?.map((plan) => (
                  <ActivePlanCard 
                    key={plan.id} 
                    plan={plan} 
                    userId={user?.uid || ''} 
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <nav className="sticky bottom-0 z-10 border-t border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-md grid-cols-3 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" active />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={User} label="Profile" href="/profile" />
        </div>
      </nav>
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
          lastClaimedDate: null,
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

function ActivePlanCard({ plan, userId }: { plan: ActiveInvestment, userId: string }) {
  const { id, planName, status, startDate, endDate, lastClaimedDate, dailyIncome, totalReturn } = plan;
  const firestore = useFirestore();
  const { toast } = useToast();

  const [countdown, setCountdown] = useState('');
  const [isClaimable, setIsClaimable] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isExpired = endDate.toDate() < now;

  useEffect(() => {
    if (status !== 'Active' || isExpired) {
      setIsClaimable(false);
      setCountdown('');
      return;
    }

    const claimBasisTime = lastClaimedDate ? lastClaimedDate.toDate() : startDate.toDate();
    const nextClaimTime = new Date(claimBasisTime.getTime() + 24 * 60 * 60 * 1000);

    const interval = setInterval(() => {
      const currentTime = new Date();
      const difference = nextClaimTime.getTime() - currentTime.getTime();

      if (difference <= 0) {
        setIsClaimable(true);
        setCountdown('00:00:00');
        clearInterval(interval);
      } else {
        setIsClaimable(false);
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        setCountdown(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
            2,
            '0'
          )}:${String(seconds).padStart(2, '0')}`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status, startDate, lastClaimedDate, isExpired]);


  
  const handleClaim = async () => {
    if (!isClaimable || !userId || isExpired) return;

    const userRef = doc(firestore, 'users', userId);
    const investmentRef = doc(firestore, `users/${userId}/investments`, id);

    try {
      await runTransaction(firestore, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw 'User not found';

        const investmentDoc = await transaction.get(investmentRef);
        if (!investmentDoc.exists()) throw 'Investment not found';
        
        // Refetch data inside transaction to ensure atomicity
        const currentData = investmentDoc.data() as ActiveInvestment;
        const claimBasis = currentData.lastClaimedDate ? currentData.lastClaimedDate.toDate() : currentData.startDate.toDate();
        const nextPossibleClaim = new Date(claimBasis.getTime() + 24 * 60 * 60 * 1000);
        
        if (new Date() < nextPossibleClaim) {
            throw "Claim is not available yet.";
        }

        const currentTotalIncome = userDoc.data().totalIncome || 0;

        transaction.update(userRef, {
          totalIncome: currentTotalIncome + dailyIncome,
        });

        transaction.update(investmentRef, {
          lastClaimedDate: serverTimestamp(),
        });
      });

      toast({
        title: 'Income Claimed!',
        description: `Your daily income of ₹${dailyIncome} has been logged.`,
      });
    } catch (e: any) {
        console.error(e);
        toast({
          variant: 'destructive',
          title: 'Claim Failed',
          description: e.toString(),
        });
    }
  };

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
  
  const getDaysDifference = (start: Timestamp, end: Timestamp) => {
    if (!start || !end) return 0;
    const diffTime = Math.abs(end.toDate().getTime() - start.toDate().getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getProgress = () => {
    if (!startDate || !endDate || status === 'Completed' || isExpired) return 100;
    
    const totalDuration = endDate.toMillis() - startDate.toMillis();
    if (totalDuration <= 0) return 100;
    
    const elapsed = now.getTime() - startDate.toMillis();
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
    return (
      <Button
        size="sm"
        onClick={handleClaim}
        disabled={!isClaimable}
      >
        {isClaimable ? 'Claim' : (countdown || 'Loading...')}
      </Button>
    );
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
              {status === 'Completed' || isExpired
                ? 'Completed'
                : 'Ends in ' + Math.max(0, getDaysDifference(Timestamp.fromDate(now), endDate)) + ' days'}
            </span>
          </div>
          <Progress value={getProgress()} className="mt-1 h-2" />
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
