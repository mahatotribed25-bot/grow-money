
'use client';
import {
  Wallet,
  Briefcase,
  Upload,
  Download,
  ArrowRight,
  History,
  Home,
  User,
  Power,
  BarChart2,
  TrendingUp,
  Megaphone,
  HandCoins,
  Users2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase/auth/use-user';
import { useDoc, useCollection, useFirestore } from '@/firebase';
import type { Timestamp } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  runTransaction,
  updateDoc,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { BannerCarousel } from '@/components/dashboard/BannerCarousel';
import { AdsterraNativeBanner } from '@/components/ads/AdsterraNativeBanner';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type UserData = {
  id: string;
  walletBalance: number;
  totalInvestment: number;
  totalIncome: number;
  name?: string;
  email?: string;
  upiId?: string;
};

type AdminSettings = {
  adminUpi?: string;
  minWithdrawal?: number;
  withdrawalGstPercentage?: number;
};

type Investment = {
  id: string;
  planName: string;
  investedAmount: number;
  returnAmount: number;
  startDate: Timestamp;
  maturityDate: Timestamp;
  status: 'Active' | 'Matured' | 'Stopped';
  dailyIncome: number;
  lastIncomeDate?: Timestamp;
  finalReturn?: number;
};

type ActiveLoan = {
    id: string;
    planName: string;
    loanAmount: number;
    totalPayable: number;
    startDate: Timestamp;
    dueDate: Timestamp;
    status: 'Active' | 'Due' | 'Completed' | 'Payment Pending';
}

type Announcement = {
    id: string;
    message: string;
    link?: string;
    createdAt: Timestamp;
}

const CountdownTimer = ({ endDate }: { endDate: Date }) => {
    const [timeLeft, setTimeLeft] = useState('...');

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const distance = endDate.getTime() - now.getTime();

            if (distance < 0) {
                clearInterval(interval);
                setTimeLeft("00d 00h 00m 00s");
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}`);
        }, 1000);

        return () => clearInterval(interval);
    }, [endDate]);

    return <span className="font-mono">{timeLeft}</span>;
};


export default function Dashboard() {
  const { user, loading: userLoading } = useUser();
  const { data: userData, loading: userDataLoading } = useDoc<UserData>(
    user ? `users/${user.uid}` : null
  );
  const { data: adminSettings } = useDoc<AdminSettings>('settings/admin');
  const { data: investments, loading: investmentsLoading } =
    useCollection<Investment>(
      user ? `users/${user.uid}/investments` : null
    );
   const { data: loans, loading: loansLoading } = useCollection<ActiveLoan>(
    user ? `users/${user.uid}/loans` : null
  );
  const { data: announcements, loading: announcementsLoading } = useCollection<Announcement>('announcements');
  
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);


  const firestore = useFirestore();
  const { toast } = useToast();
  
  useEffect(() => {
    if (!userLoading) {
        const hasSeenPopup = sessionStorage.getItem('welcomePopupShown');
        if (!hasSeenPopup) {
            setShowWelcomePopup(true);
            sessionStorage.setItem('welcomePopupShown', 'true');
        }
    }
  }, [userLoading]);

  const handleClaimReturn = (investment: Investment) => {
     if (!user) return;

     const transactionPromise = runTransaction(firestore, async (transaction) => {
       const userRef = doc(firestore, 'users', user.uid);
       const invRef = doc(firestore, 'users', user.uid, 'investments', investment.id);
       
       const userDoc = await transaction.get(userRef);
       const invDoc = await transaction.get(invRef);

       if (!userDoc.exists() || !invDoc.exists()) throw new Error("Document not found.");
       
       const invData = invDoc.data();
       if (invData.status === 'Matured') {
          toast({ title: "Already Claimed", description: "This investment has already been claimed.", variant: "destructive" });
          // Returning a specific value to indicate a handled case vs. a failure
          return { claimed: false, message: 'Already claimed' };
       }
       
       let amountToClaim = 0;
       if (invData.status === 'Stopped' && invData.finalReturn) {
           amountToClaim = invData.finalReturn;
       } else if (invData.status === 'Active') {
           amountToClaim = investment.returnAmount;
       } else {
           throw new Error("Investment is not in a claimable state.");
       }

       let newWalletBalance = userDoc.data().walletBalance || 0;
       let newTotalInvestment = userDoc.data().totalInvestment || 0;
       
       transaction.update(invRef, { status: 'Matured' });
       newWalletBalance += amountToClaim;
       newTotalInvestment -= investment.investedAmount;

       transaction.update(userRef, {
         walletBalance: newWalletBalance,
         totalInvestment: newTotalInvestment < 0 ? 0 : newTotalInvestment,
         totalIncome: (userDoc.data().totalIncome || 0) + (amountToClaim - investment.investedAmount)
       });

       return { claimed: true };
     });

     transactionPromise.then((result) => {
      if (result?.claimed) {
        toast({
          title: 'Investment Claimed!',
          description: `Your return has been added to your wallet.`,
        });
      }
     }).catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: `users/${user.uid}/investments/${investment.id}`,
          operation: 'write',
          requestResourceData: { investmentId: investment.id, action: 'claim' }
        });
        errorEmitter.emit('permission-error', permissionError);
     });
  };

  const activeInvestments = investments?.filter((inv) => inv.status === 'Active' || inv.status === 'Stopped');
  const activeLoan = loans?.find(l => l.status !== 'Completed');

  const sortedAnnouncements = announcements?.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

  const loading = userLoading || userDataLoading || investmentsLoading || loansLoading || announcementsLoading;

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
       <AlertDialog open={showWelcomePopup} onOpenChange={setShowWelcomePopup}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-2xl">Welcome to TM world 🌎🌎</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Your journey to financial growth starts now!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={() => setShowWelcomePopup(false)} className="w-full">
            Let's Go!
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/20 bg-background/50 px-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-primary">Grow Money 💰</h1>
        </div>
        <h1 className="text-lg font-semibold">Welcome, {userData?.name || 'User'}!</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="space-y-6">

          <AdsterraNativeBanner />

          <Announcements announcements={sortedAnnouncements} loading={announcementsLoading} />

          <BannerCarousel />

          <WalletSummary
            walletBalance={userData?.walletBalance}
            totalInvestment={userData?.totalInvestment}
            totalIncome={userData?.totalIncome}
            adminSettings={adminSettings}
            loading={userDataLoading}
            upiId={userData?.upiId}
          />
          
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Active Investments</h2>
             <Button variant="outline" size="sm" asChild>
              <Link href="/plans">
                Invest More <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {investmentsLoading ? (
             <Card>
                <CardContent className="pt-6">
                    <p>Loading your investments...</p>
                </CardContent>
            </Card>
          ) : activeInvestments && activeInvestments.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {activeInvestments.map((investment) => (
                <ActivePlanCard key={investment.id} investment={investment} onClaim={handleClaimReturn} />
              ))}
            </div>
          ) : (
            <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                    <p>You have no active investments.</p>
                </CardContent>
            </Card>
          )}

          {loansLoading ? (
              <Card><CardContent className="pt-6"><p>Loading loan status...</p></CardContent></Card>
          ) : activeLoan ? (
              <div>
                  <div className="flex items-center justify-between">
                     <h2 className="text-xl font-bold">Active Loan</h2>
                     <Button variant="outline" size="sm" asChild>
                      <Link href="/my-loans">
                        View Details <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                  <ActiveLoanCard loan={activeLoan} />
              </div>
          ) : null}

           <Card>
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickActionButton icon={TrendingUp} label="All Plans" href="/plans" />
                <QuickActionButton icon={Users2} label="Group Investing" href="/group-investing" />
                <QuickActionButton icon={History} label="My Plans" href="/my-plans" />
                <QuickActionButton icon={HandCoins} label="Loans" href="/loans" />
                <QuickActionButton icon={User} label="Profile" href="/profile" />
                <QuickActionButton icon={Users} label="My Team" href="/team" />
            </CardContent>
           </Card>

        </div>
      </main>

      <nav className="sticky bottom-0 z-10 border-t border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" active />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={Users} label="Team" href="/team" />
          <BottomNavItem icon={HandCoins} label="My Loans" href="/my-loans" />
          <BottomNavItem icon={User} label="Profile" href="/profile" />
        </div>
      </nav>
    </div>
  );
}

function Announcements({ announcements, loading }: { announcements: Announcement[] | null | undefined, loading: boolean }) {
    if (loading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <p>Loading announcements...</p>
                </CardContent>
            </Card>
        );
    }
    
    if (!announcements || announcements.length === 0) {
        return null; // Don't show the card if there are no announcements
    }

    return (
        <Card className="bg-primary/10 border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-300">
                    <Megaphone className="h-5 w-5"/>
                    Announcements
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {announcements.map(ann => (
                    <div key={ann.id} className="text-sm">
                        {ann.link ? (
                            <a href={ann.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                {ann.message}
                            </a>
                        ) : (
                            <p className="text-foreground/90">{ann.message}</p>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

function WalletSummary({
  walletBalance,
  totalInvestment,
  totalIncome,
  adminSettings,
  loading,
  upiId,
}: {
  walletBalance?: number;
  totalInvestment?: number;
  totalIncome?: number;
  adminSettings?: AdminSettings | null;
  loading: boolean;
  upiId?: string;
}) {
  return (
    <Card className="shadow-lg border-primary/20 bg-gradient-to-br from-card to-secondary/30">
      <CardHeader>
        <CardTitle>My Wallet</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-3xl font-bold">
              {loading ? '...' : `₹${(walletBalance || 0).toFixed(2)}`}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Total Investment</p>
              <p className="font-semibold">
                {loading ? '...' : `₹${(totalInvestment || 0).toFixed(2)}`}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Income</p>
              <p className="font-semibold">
                {loading ? '...' : `₹${(totalIncome || 0).toFixed(2)}`}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <DepositButton adminUpi={adminSettings?.adminUpi} />
            <WithdrawButton adminSettings={adminSettings} currentBalance={walletBalance} upiId={upiId} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DepositButton({ adminUpi }: { adminUpi?: string }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [amount, setAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!user || !amount || !transactionId) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Please enter both amount and transaction ID.',
      });
      return;
    }

    const depositsCollection = collection(firestore, 'deposits');
    const depositData = {
      userId: user.uid,
      name: user.displayName,
      amount: parseFloat(amount),
      transactionId,
      status: 'pending' as const,
      createdAt: serverTimestamp(),
    };

    addDoc(depositsCollection, depositData)
      .then(() => {
        toast({
          title: 'Deposit Request Submitted',
          description: 'Your deposit request is pending approval. It may take up to 2 hours.',
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: depositsCollection.path,
          operation: 'create',
          requestResourceData: depositData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Upload className="mr-2 h-4 w-4" /> Recharge
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recharge Wallet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm">
            To add funds, please send money to the UPI ID below and enter the
            details.
          </p>
          <div className="rounded-md bg-muted p-3 text-center font-mono text-lg">
            {adminUpi || 'Loading UPI...'}
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (INR)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g., 500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transactionId">Transaction ID</Label>
            <Input
              id="transactionId"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="Enter the 12-digit transaction ID"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit}>Submit Request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawButton({ adminSettings, currentBalance, upiId }: { adminSettings?: AdminSettings | null, currentBalance?: number, upiId?: string }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [amount, setAmount] = useState('');
  const [withdrawalType, setWithdrawalType] = useState('');
  const { toast } = useToast();

  const minWithdrawal = adminSettings?.minWithdrawal || 0;
  const gstPercentage = adminSettings?.withdrawalGstPercentage || 0;

  const { gstAmount, finalAmount } = useMemo(() => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return { gstAmount: 0, finalAmount: 0 };
    }
    const gst = (numAmount * gstPercentage) / 100;
    const final = numAmount - gst;
    return { gstAmount: gst, finalAmount: final };
  }, [amount, gstPercentage]);

  const handleWithdraw = () => {
    const withdrawAmount = parseFloat(amount);
    if (!user || !amount || !upiId) {
        toast({ variant: 'destructive', title: 'Missing Information', description: 'Please ensure you have a saved UPI ID in your profile and enter an amount.' });
        return;
    }
     if (!withdrawalType) {
        toast({ variant: 'destructive', title: 'Withdrawal Type Required', description: 'Please select the source of the funds you are withdrawing.' });
        return;
    }
    if (withdrawAmount < minWithdrawal) {
        toast({ variant: 'destructive', title: 'Amount Too Low', description: `The minimum withdrawal amount is ₹${minWithdrawal}.` });
        return;
    }
    if (withdrawAmount > (currentBalance || 0)) {
        toast({ variant: 'destructive', title: 'Insufficient Balance', description: 'You cannot withdraw more than your current wallet balance.' });
        return;
    }

    const requestData = {
      userId: user.uid,
      name: user.displayName,
      amount: withdrawAmount,
      upiId: upiId,
      type: withdrawalType,
      status: 'pending' as const,
      createdAt: serverTimestamp(),
      gstAmount: gstAmount,
      finalAmount: finalAmount,
    };

    runTransaction(firestore, async (transaction) => {
        const userRef = doc(firestore, 'users', user.uid);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists()) throw new Error("User document does not exist!");

        const newBalance = (userDoc.data().walletBalance || 0) - withdrawAmount;
        if (newBalance < 0) throw new Error("Insufficient funds");
        
        transaction.update(userRef, { walletBalance: newBalance });
        
        const withdrawalRef = doc(collection(firestore, 'withdrawals'));
        transaction.set(withdrawalRef, requestData);
    })
    .then(() => {
      toast({
          title: 'Withdrawal Request Submitted',
          description: 'Your request is pending and will be processed within 24 hours.',
      });
    })
    .catch((serverError) => {
      const permissionError = new FirestorePermissionError({
        path: `users/${user.uid} or /withdrawals`,
        operation: 'write',
        requestResourceData: requestData
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };


  return (
      <Dialog>
        <DialogTrigger asChild>
            <Button variant="secondary" className="w-full">
              <Download className="mr-2 h-4 w-4" /> Withdraw
            </Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Withdraw Funds</DialogTitle>
            </DialogHeader>
             <div className="space-y-4">
                <p className="text-sm">
                    Funds will be sent to your saved UPI ID: <span className="font-mono">{upiId || 'Not Set'}</span>.
                </p>
                {!upiId && <p className="text-xs text-destructive">Please set your UPI ID in your profile before withdrawing.</p>}
                <div className="space-y-2">
                    <Label htmlFor="amount">Amount to Withdraw (INR)</Label>
                    <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Minimum ₹${minWithdrawal || 0}`}/>
                </div>
                 <div className="space-y-2">
                    <Label>Withdrawal From</Label>
                    <RadioGroup onValueChange={setWithdrawalType} value={withdrawalType} className="grid grid-cols-2 gap-4">
                        <div>
                            <RadioGroupItem value="Investment Plan" id="type-investment" className="peer sr-only" />
                            <Label htmlFor="type-investment" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                Investment Plan
                            </Label>
                        </div>
                         <div>
                            <RadioGroupItem value="Group Investment" id="type-group" className="peer sr-only" />
                            <Label htmlFor="type-group" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                Group Investment
                            </Label>
                        </div>
                         <div>
                            <RadioGroupItem value="General" id="type-general" className="peer sr-only" />
                            <Label htmlFor="type-general" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                General Balance
                            </Label>
                        </div>
                    </RadioGroup>
                </div>
                {amount && (
                  <Card className="bg-muted/50 p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>GST ({gstPercentage}%):</span>
                      <span className="text-destructive">- ₹{gstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>You will receive:</span>
                      <span>₹{finalAmount.toFixed(2)}</span>
                    </div>
                  </Card>
                )}
             </div>
             <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleWithdraw} disabled={!upiId}>Request Withdrawal</Button>
             </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}


function ActivePlanCard({ investment, onClaim }: { investment: Investment, onClaim: (investment: Investment) => void }) {
  const [isClaimable, setIsClaimable] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  if (!investment.startDate || !investment.maturityDate) {
    return null;
  }
  
  const startDate = investment.startDate.toDate();
  const maturityDate = investment.maturityDate.toDate();
  const now = new Date();

  const totalDuration = maturityDate.getTime() - startDate.getTime();
  const elapsedDuration = now.getTime() - startDate.getTime();
  const progress = Math.min((elapsedDuration / totalDuration) * 100, 100);

  useEffect(() => {
    if (investment.status === 'Stopped' || (investment.status === 'Active' && now >= maturityDate)) {
      setIsClaimable(true);
    }
  }, [now, maturityDate, investment.status]);

  const handleClaimClick = () => {
    setIsClaiming(true);
    onClaim(investment);
    // Setting isClaiming to false is tricky because onClaim is async and doesn't return a promise here
    // For now, we rely on re-render to update the state. A better approach would be for onClaim to return a promise.
    // For simplicity, we'll leave it as is, but this could be improved.
  }
  
  const getBadge = () => {
    if (investment.status === 'Stopped') {
        return <Badge variant="destructive">Stopped</Badge>;
    }
    if (isClaimable) {
        return <Badge>Matured</Badge>;
    }
    return <Badge>Active</Badge>;
  }

  return (
    <Card className="bg-gradient-to-br from-card via-secondary/20 to-card border-primary/10">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{investment.planName}</span>
          {getBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <p className="text-sm text-muted-foreground">Invested</p>
          <p className="font-semibold">₹{(investment.investedAmount || 0).toFixed(2)}</p>
        </div>
        <div className="flex justify-between">
          <p className="text-sm text-muted-foreground">Maturity Return</p>
          <p className="font-semibold text-green-400">
            ₹{(investment.returnAmount || 0).toFixed(2)}
          </p>
        </div>
        
        {isClaimable ? (
            <Button onClick={handleClaimClick} disabled={isClaiming} className="w-full">
                {isClaiming ? 'Claiming...' : 'Claim Return'}
            </Button>
        ) : (
            <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Time Remaining:</span>
                    <CountdownTimer endDate={maturityDate} />
                </div>
                <Progress value={progress} />
            </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActiveLoanCard({ loan }: { loan: ActiveLoan }) {
    if (!loan.startDate || !loan.dueDate) {
        return null;
    }
    const startDate = loan.startDate.toDate();
    const dueDate = loan.dueDate.toDate();
    const now = new Date();

    const totalDuration = dueDate.getTime() - startDate.getTime();
    const elapsedDuration = now.getTime() - startDate.getTime();
    const progress = Math.min((elapsedDuration / totalDuration) * 100, 100);
    
    const getStatusVariant = (status: string) => {
        switch(status) {
            case 'Active': return 'default';
            case 'Due':
            case 'Payment Pending': return 'destructive';
            default: return 'secondary';
        }
    }

    return (
        <Card className="bg-gradient-to-br from-card via-destructive/20 to-card border-destructive/20 mt-4">
             <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>{loan.planName}</span>
                    <Badge variant={getStatusVariant(loan.status)} className="capitalize">{loan.status}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex justify-between">
                    <p className="text-sm text-muted-foreground">Loan Amount</p>
                    <p className="font-semibold">₹{(loan.loanAmount || 0).toFixed(2)}</p>
                </div>
                <div className="flex justify-between">
                    <p className="text-sm text-muted-foreground">Total Repayment</p>
                    <p className="font-semibold text-red-400">₹{(loan.totalPayable || 0).toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Time Remaining:</span>
                        <span>Due on {dueDate.toLocaleDateString()}</span>
                    </div>
                    <Progress value={progress} className="[&>div]:bg-red-500" />
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

function QuickActionButton({ icon: Icon, label, href }: { icon: React.ElementType, label: string, href: string }) {
    return (
        <Button variant="outline" className="flex-col h-20" asChild>
            <Link href={href}>
                <Icon className="h-6 w-6 mb-1" />
                <span>{label}</span>
            </Link>
        </Button>
    )
}
