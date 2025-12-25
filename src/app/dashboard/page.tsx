
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useCallback } from 'react';
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

type UserData = {
  id: string;
  walletBalance: number;
  totalInvestment: number;
  totalIncome: number;
  name?: string;
  email?: string;
};

type AdminSettings = {
  adminUpi?: string;
  minWithdrawal?: number;
};

type Investment = {
  id: string;
  planName: string;
  investedAmount: number;
  returnAmount: number;
  startDate: Timestamp;
  maturityDate: Timestamp;
  status: 'Active' | 'Matured';
  dailyIncome: number;
  lastIncomeDate?: Timestamp;
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

const CountdownTimer = ({ endDate, onComplete }: { endDate: Date, onComplete: () => void }) => {
    const [timeLeft, setTimeLeft] = useState('...');
    const memoizedOnComplete = useCallback(onComplete, []);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const distance = endDate.getTime() - now.getTime();

            if (distance < 0) {
                clearInterval(interval);
                setTimeLeft("00d 00h 00m 00s");
                if(memoizedOnComplete) memoizedOnComplete();
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        }, 1000);

        return () => clearInterval(interval);
    }, [endDate, memoizedOnComplete]);

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


  const firestore = useFirestore();
  const { toast } = useToast();

  const handleInvestmentMaturity = async (investmentId?: string) => {
    if (!user || !investments) return;

    const now = new Date();
    const maturedInvestments = investments.filter(
      (inv) => inv.status === 'Active' && inv.maturityDate?.toDate() <= now && (!investmentId || inv.id === investmentId)
    );

    if (maturedInvestments.length === 0) return;

    try {
      await runTransaction(firestore, async (transaction) => {
        const userRef = doc(firestore, 'users', user.uid);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw 'User document does not exist!';
        
        let newWalletBalance = userDoc.data().walletBalance || 0;
        let newTotalInvestment = userDoc.data().totalInvestment || 0;

        for (const inv of maturedInvestments) {
          const invRef = doc(firestore, `users/${user.uid}/investments`, inv.id);
          transaction.update(invRef, { status: 'Matured' });
          newWalletBalance += inv.returnAmount;
          newTotalInvestment -= inv.investedAmount;
        }

        transaction.update(userRef, { 
            walletBalance: newWalletBalance,
            totalInvestment: newTotalInvestment < 0 ? 0 : newTotalInvestment,
        });
      });

      toast({
        title: 'Investment Matured!',
        description: 'Your investment has matured and the return has been added to your wallet.',
      });
    } catch (error) {
      console.error('Error processing maturity:', error);
    }
  };

  const autoCreditDailyIncome = async () => {
     if (!user || !investments) return;

     const now = new Date();
     let totalIncomeToAdd = 0;
     
     try {
       await runTransaction(firestore, async (transaction) => {
           const userRef = doc(firestore, 'users', user.uid);
           const userDoc = await transaction.get(userRef);

           if (!userDoc.exists()) throw "User document does not exist!";
           
           for (const inv of investments) {
               if (inv.status !== 'Active') continue;

               const lastIncomeDate = inv.lastIncomeDate?.toDate() || inv.startDate.toDate();
               const hoursDiff = (now.getTime() - lastIncomeDate.getTime()) / (1000 * 60 * 60);
               
               const cyclesToCredit = Math.floor(hoursDiff / 24);

               if (cyclesToCredit > 0) {
                   const incomeToAdd = cyclesToCredit * inv.dailyIncome;
                   totalIncomeToAdd += incomeToAdd;
                   
                   const newLastIncomeDate = new Date(lastIncomeDate.getTime() + cyclesToCredit * 24 * 60 * 60 * 1000);
                   
                   const invRef = doc(firestore, 'users', user.uid, 'investments', inv.id);
                   transaction.update(invRef, { lastIncomeDate: newLastIncomeDate });
               }
           }
           
           if (totalIncomeToAdd > 0) {
                const currentWallet = userDoc.data().walletBalance || 0;
                const currentTotalIncome = userDoc.data().totalIncome || 0;
                
                transaction.update(userRef, {
                    walletBalance: currentWallet + totalIncomeToAdd,
                    totalIncome: currentTotalIncome + totalIncomeToAdd,
                });
           }
       });

       if (totalIncomeToAdd > 0) {
            toast({
              title: "Income Credited",
              description: `₹${totalIncomeToAdd.toFixed(2)} has been automatically added to your wallet.`
            });
       }

     } catch(e) {
         console.error("Failed to auto-credit income", e);
     }
  }


  useEffect(() => {
      autoCreditDailyIncome();
      handleInvestmentMaturity();
  // We want this to run only once on load to avoid multiple credits
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investmentsLoading]);


  const activeInvestments = investments?.filter((inv) => inv.status === 'Active');
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
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/20 bg-background/50 px-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-primary">grow money 💰💰🤑🤑</h1>
        </div>
        <h1 className="text-lg font-semibold">Welcome, {userData?.name || 'User'}!</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="space-y-6">

          <Announcements announcements={sortedAnnouncements} loading={announcementsLoading} />

          <WalletSummary
            walletBalance={userData?.walletBalance}
            totalInvestment={userData?.totalInvestment}
            totalIncome={userData?.totalIncome}
            adminUpi={adminSettings?.adminUpi}
            minWithdrawal={adminSettings?.minWithdrawal}
            loading={userDataLoading}
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
                <ActivePlanCard key={investment.id} investment={investment} onMaturity={() => handleInvestmentMaturity(investment.id)} />
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
                <QuickActionButton icon={History} label="My Plans" href="/my-plans" />
                <QuickActionButton icon={HandCoins} label="Loans" href="/loans" />
                <QuickActionButton icon={User} label="Profile" href="/profile" />
            </CardContent>
           </Card>

        </div>
      </main>

      <nav className="sticky bottom-0 z-10 border-t border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-md grid-cols-4 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" active />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
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
        <Card className="bg-blue-500/10 border-blue-500/30">
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
  adminUpi,
  minWithdrawal,
  loading
}: {
  walletBalance?: number;
  totalInvestment?: number;
  totalIncome?: number;
  adminUpi?: string;
  minWithdrawal?: number;
  loading: boolean;
}) {
  return (
    <Card className="shadow-lg">
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
            <DepositButton adminUpi={adminUpi} />
            <WithdrawButton minWithdrawal={minWithdrawal} currentBalance={walletBalance} />
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

  const handleSubmit = async () => {
    if (!user || !amount || !transactionId) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Please enter both amount and transaction ID.',
      });
      return;
    }

    try {
      await addDoc(collection(firestore, 'deposits'), {
        userId: user.uid,
        name: user.displayName,
        amount: parseFloat(amount),
        transactionId,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      toast({
        title: 'Deposit Request Submitted',
        description:
          'Your deposit request is pending approval. It may take up to 2 hours.',
      });
    } catch (e) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: 'Could not submit your request. Please try again.',
      });
    }
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

function WithdrawButton({ minWithdrawal, currentBalance }: { minWithdrawal?: number, currentBalance?: number }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [amount, setAmount] = useState('');
  const {data: userData} = useDoc<UserData>(user ? `users/${user.uid}`: null);
  const { toast } = useToast();

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount);
    if (!user || !userData || !amount || !userData.upiId) {
        toast({ variant: 'destructive', title: 'Missing Information', description: 'Please ensure you have a saved UPI ID in your profile and enter an amount.' });
        return;
    }
    if (withdrawAmount < (minWithdrawal || 0)) {
        toast({ variant: 'destructive', title: 'Amount Too Low', description: `The minimum withdrawal amount is ₹${minWithdrawal}.` });
        return;
    }
    if (withdrawAmount > (currentBalance || 0)) {
        toast({ variant: 'destructive', title: 'Insufficient Balance', description: 'You cannot withdraw more than your current wallet balance.' });
        return;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const userRef = doc(firestore, 'users', user.uid);
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists()) throw "User document does not exist!";

            const newBalance = (userDoc.data().walletBalance || 0) - withdrawAmount;
            if (newBalance < 0) throw "Insufficient funds";
            
            transaction.update(userRef, { walletBalance: newBalance });
            
            const withdrawalRef = doc(collection(firestore, 'withdrawals'));
            transaction.set(withdrawalRef, {
                userId: user.uid,
                name: user.displayName,
                amount: withdrawAmount,
                upiId: userData.upiId,
                status: 'pending',
                createdAt: serverTimestamp(),
            });
        });

        toast({
            title: 'Withdrawal Request Submitted',
            description: 'Your request is pending and will be processed within 24 hours.',
        });
    } catch(e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Request Failed', description: 'Could not submit your withdrawal request. Please try again.' });
    }
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
                    Enter the amount you wish to withdraw. Funds will be sent to your saved UPI ID.
                </p>
                <div className="space-y-2">
                    <Label htmlFor="amount">Amount (INR)</Label>
                    <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Minimum ₹${minWithdrawal || 0}`}/>
                </div>
             </div>
             <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleWithdraw}>Request Withdrawal</Button>
             </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}


function ActivePlanCard({ investment, onMaturity }: { investment: Investment, onMaturity: () => void }) {
  if (!investment.startDate || !investment.maturityDate) {
    return null;
  }
  
  const startDate = investment.startDate.toDate();
  const maturityDate = investment.maturityDate.toDate();
  const now = new Date();

  const totalDuration = maturityDate.getTime() - startDate.getTime();
  const elapsedDuration = now.getTime() - startDate.getTime();
  const progress = Math.min((elapsedDuration / totalDuration) * 100, 100);

  return (
    <Card className="bg-secondary/30">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{investment.planName}</span>
          <Badge>Active</Badge>
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
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
             <span>Time Remaining:</span>
             <CountdownTimer endDate={maturityDate} onComplete={onMaturity} />
          </div>
          <Progress value={progress} />
        </div>
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
        <Card className="bg-destructive/10 border-destructive/20 mt-4">
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

    