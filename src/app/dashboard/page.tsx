
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
  FileText,
  AlertTriangle,
  Gift,
  Gem,
  CheckCircle,
  Trophy,
  MessageCircle,
  Coins,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { isToday, startOfToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { AchievementBadges } from '@/components/dashboard/AchievementBadges';

type UserData = {
  id: string;
  walletBalance: number;
  totalInvestment: number;
  totalIncome: number;
  name?: string;
  email?: string;
  upiId?: string;
  role?: 'user' | 'subadmin';
  vipLevel?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  lastCheckIn?: Timestamp;
  trustScore?: number;
};

type AdminSettings = {
  adminUpi?: string;
  minWithdrawal?: number;
  withdrawalGstPercentage?: number;
  dailyCheckInBonus?: number;
  vipWithdrawalGst?: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
  }
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
  payoutFrequency?: 'daily' | 'monthly' | 'on_maturity';
  lastClaimDate?: Timestamp;
};

type ActiveLoan = {
    id: string;
    planName: string;
    loanAmount: number;
    totalPayable: number;
    startDate: Timestamp;
    dueDate: Timestamp;
    status: 'Active' | 'Due' | 'Completed' | 'Payment Pending';
    penalty?: number;
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
  const { data: adminSettings } = useDoc<AdminSettings>(user ? 'settings/admin' : null);
  const { data: investments, loading: investmentsLoading } =
    useCollection<Investment>(
      user ? `users/${user.uid}/investments` : null
    );
   const { data: loans, loading: loansLoading } = useCollection<ActiveLoan>(
    user ? `users/${user.uid}/loans` : null
  );
  const { data: announcements, loading: announcementsLoading } = useCollection<Announcement>('announcements');
  const { data: referrals } = useCollection<any>('users', { where: ['referredBy', '==', user?.uid] });
  
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [showDueLoanPopup, setShowDueLoanPopup] = useState(false);


  const firestore = useFirestore();
  const { toast } = useToast();
  
  useEffect(() => {
    if (!userLoading && user && userData) {
        const hasSeenPopup = sessionStorage.getItem('welcomePopupShown');
        if (!hasSeenPopup) {
            setShowWelcomePopup(true);
            sessionStorage.setItem('welcomePopupShown', 'true');
        }
    }
  }, [userLoading, user, userData]);
  
  const overdueLoan = useMemo(() => {
    if (!loans) return null;
    const now = new Date();
    return loans.find(l => l.dueDate.toDate() < now && l.status !== 'Completed');
  }, [loans]);

  useEffect(() => {
    const popupShown = sessionStorage.getItem('dueLoanPopupShown');
    if (overdueLoan && !popupShown) {
      setShowDueLoanPopup(true);
      sessionStorage.setItem('dueLoanPopupShown', 'true');
    }
  }, [overdueLoan]);

  const handleClaimProfit = (investment: Investment) => {
    if (!user) return;

    const transactionPromise = runTransaction(firestore, async (transaction) => {
        const userRef = doc(firestore, 'users', user.uid);
        const invRef = doc(firestore, 'users', user.uid, 'investments', investment.id);
        
        const userDoc = await transaction.get(userRef);
        const invDoc = await transaction.get(invRef);

        if (!userDoc.exists() || !invDoc.exists()) throw new Error("Sync failure. Please refresh.");

        const invData = invDoc.data() as Investment;
        const now = new Date();
        const lastClaim = invData.lastClaimDate?.toDate() || invData.startDate.toDate();
        
        // Calculate accrued profit since last claim
        const diffMs = now.getTime() - lastClaim.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays < 1 && invData.payoutFrequency === 'daily') throw new Error("Daily claim already processed.");
        if (diffDays < 30 && invData.payoutFrequency === 'monthly') throw new Error("Monthly claim not yet due.");

        const amountToClaim = diffDays * invData.dailyIncome;
        if (amountToClaim <= 0) throw new Error("No profit accumulated yet.");

        transaction.update(userRef, {
            walletBalance: (userDoc.data().walletBalance || 0) + amountToClaim,
            totalIncome: (userDoc.data().totalIncome || 0) + amountToClaim
        });

        transaction.update(invRef, {
            lastClaimDate: serverTimestamp()
        });

        return { amount: amountToClaim };
    });

    transactionPromise.then((result) => {
        if (result?.amount) {
            toast({ title: 'Profit Claimed!', description: `₹${result.amount.toFixed(2)} added to wallet.` });
        }
    }).catch((e) => {
        toast({ title: 'Claim Failed', description: e.message, variant: 'destructive' });
    });
  };

  const handleClaimMaturity = (investment: Investment) => {
     if (!user) return;

     const transactionPromise = runTransaction(firestore, async (transaction) => {
       const userRef = doc(firestore, 'users', user.uid);
       const invRef = doc(firestore, 'users', user.uid, 'investments', investment.id);
       
       const userDoc = await transaction.get(userRef);
       const invDoc = await transaction.get(invRef);

       if (!userDoc.exists() || !invDoc.exists()) throw new Error("Document not found.");
       
       const invData = invDoc.data() as Investment;
       if (invData.status === 'Matured') throw new Error('Already claimed');
       
       const now = new Date();
       if (invData.status !== 'Stopped' && now < invData.maturityDate.toDate()) {
           throw new Error("Plan is still maturing.");
       }

       let amountToClaim = 0;
       let profitShare = 0;

       if (invData.status === 'Stopped') {
           amountToClaim = invData.finalReturn || 0;
           profitShare = invData.earnedIncome || 0;
       } else {
           // For on_maturity, we give Principal + All Profit
           // For daily/monthly, we only give Principal back (since profit was claimed periodically)
           if (invData.payoutFrequency === 'on_maturity') {
               amountToClaim = invData.returnAmount;
               profitShare = invData.returnAmount - invData.investedAmount;
           } else {
               amountToClaim = invData.investedAmount;
               profitShare = 0; // Already claimed during tenure
           }
       }

       transaction.update(invRef, { status: 'Matured' });
       
       transaction.update(userRef, {
         walletBalance: (userDoc.data().walletBalance || 0) + amountToClaim,
         totalInvestment: Math.max(0, (userDoc.data().totalInvestment || 0) - invData.investedAmount),
         totalIncome: (userDoc.data().totalIncome || 0) + profitShare
       });

       return { claimed: true };
     });

     transactionPromise.then(() => {
        toast({ title: 'Plan Settled!', description: `Funds returned to your wallet.` });
     }).catch((error) => {
        toast({ title: 'Settlement Failed', description: error.message, variant: 'destructive' });
     });
  };

  const activeInvestments = investments?.filter((inv) => inv.status === 'Active' || inv.status === 'Stopped');
  const activeLoan = loans?.find(l => l.status !== 'Completed');

  const sortedAnnouncements = announcements?.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

  const loading = userLoading || userDataLoading || investmentsLoading || loansLoading || announcementsLoading;

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#030408]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent text-foreground">
       <AlertDialog open={showWelcomePopup} onOpenChange={setShowWelcomePopup}>
        <AlertDialogContent className="bg-[#030408]/90 backdrop-blur-2xl border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-2xl font-bold text-white">Welcome to Grow Money 💰</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-lg font-medium py-2 text-primary">
              Mr./Mrs. {userData?.name}
            </AlertDialogDescription>
            <AlertDialogDescription className="text-center text-white/60">
              Your journey to financial growth starts now!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={() => setShowWelcomePopup(false)} className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl">
            Let's Go!
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={showDueLoanPopup} onOpenChange={setShowDueLoanPopup}>
        <AlertDialogContent className="bg-[#030408]/90 backdrop-blur-2xl border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
                <AlertTriangle className="h-6 w-6 text-red-500 animate-pulse"/>
                Loan Payment Due
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Your loan payment is now due. Please repay it as soon as possible to avoid penalties. You have a 1-day grace period, after which daily penalties will be applied.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction asChild onClick={() => setShowDueLoanPopup(false)} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12 rounded-xl">
            <Link href="/my-loans">View Loan & Pay</Link>
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.05] bg-black/40 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/20 shadow-lg shadow-primary/10">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Grow Money</h1>
        </div>
        <div className="flex items-center gap-2">
             <span className="text-xs font-bold uppercase tracking-widest text-white/30 hidden sm:inline">User Portal</span>
             <Badge variant="outline" className="border-white/10 bg-white/5 h-8 px-4 rounded-xl">
                <span className="animate-rgb-glow font-black tracking-tighter text-sm">
                    {userData?.name || 'User'}
                </span>
             </Badge>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        
        <Announcements announcements={sortedAnnouncements} loading={announcementsLoading} />
        
        <div className="space-y-4">
             <AchievementBadges stats={{ 
                 trustScore: userData?.trustScore || 500, 
                 planCount: activeInvestments?.length || 0, 
                 referralCount: referrals?.length || 0 
             }} />
             <DailyCheckInCard />
        </div>

        <div className="rounded-3xl overflow-hidden shadow-2xl shadow-primary/5">
            <BannerCarousel />
        </div>

        <WalletSummary
          userData={userData}
          adminSettings={adminSettings}
          loading={userDataLoading}
        />
        
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-white/90 flex items-center gap-2">
            <TrendingUp className="text-green-400" size={20} /> Active Investments
          </h2>
           <Button variant="ghost" size="sm" asChild className="text-primary hover:bg-primary/10">
            <Link href="/plans">
              Invest More <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {investmentsLoading ? (
           <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
              <CardContent className="pt-6">
                  <p className="text-center text-white/30 animate-pulse uppercase tracking-widest text-[10px] font-bold">Syncing Investments...</p>
              </CardContent>
          </Card>
        ) : activeInvestments && activeInvestments.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {activeInvestments.map((investment) => (
              <ActivePlanCard 
                key={investment.id} 
                investment={investment} 
                onClaimProfit={handleClaimProfit} 
                onClaimMaturity={handleClaimMaturity} 
              />
            ))}
          </div>
        ) : (
          <Card className="bg-white/[0.03] border-white/[0.08] border-dashed">
              <CardContent className="pt-8 text-center text-white/40 space-y-2">
                  <p className="text-sm">You have no active investments.</p>
                  <Button asChild variant="outline" className="border-white/10 h-8 text-xs">
                    <Link href="/plans">Browse Plans</Link>
                  </Button>
              </CardContent>
          </Card>
        )}

        {loansLoading ? (
            <Card className="bg-white/5 border-white/10"><CardContent className="pt-6"><p className="text-center text-white/30 animate-pulse text-[10px] font-bold uppercase tracking-widest">Checking Loan Status...</p></CardContent></Card>
        ) : activeLoan ? (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <h2 className="text-xl font-bold text-white/90 flex items-center gap-2">
                     <HandCoins className="text-red-400" size={20} /> Active Loan
                   </h2>
                   <Button variant="ghost" size="sm" asChild className="text-red-400 hover:bg-red-400/10">
                    <Link href="/my-loans">
                      Details <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <ActiveLoanCard loan={activeLoan} />
            </div>
        ) : null}

         <Card className="shadow-2xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl rounded-3xl">
          <CardHeader>
              <CardTitle className="text-lg font-bold text-white/80">Platform Services</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <QuickActionButton icon={Users} label="P2P Market" href="/p2p-market" color="text-primary" />
              <QuickActionButton icon={HandCoins} label="P2P Hub" href="/p2p-my-dashboard" color="text-yellow-400" />
              <QuickActionButton icon={MessageCircle} label="Private Chats" href="/user-chats" color="text-blue-400" />
              <QuickActionButton icon={TrendingUp} label="All Plans" href="/plans" color="text-green-400" />
              <QuickActionButton icon={Users2} label="Group Investing" href="/group-investing" color="text-purple-400" />
              <QuickActionButton icon={History} label="My Plans" href="/my-plans" color="text-orange-400" />
              <QuickActionButton icon={Gem} label="VIP Tiers" href="/vip-tiers" color="text-yellow-400" />
              <QuickActionButton icon={BarChart2} label="Reports" href="/reports" color="text-cyan-400" />
              <QuickActionButton icon={Trophy} label="Leaderboard" href="/leaderboard" color="text-amber-400" />
              <QuickActionButton icon={HandCoins} label="Loans" href="/loans" color="text-red-400" />
              <QuickActionButton icon={FileText} label="Custom Loan" href="/custom-loan" color="text-pink-400" />
              <QuickActionButton icon={Users} label="My Team" href="/team" color="text-emerald-400" />
              {userData?.role === 'subadmin' && (
                <QuickActionButton icon={Briefcase} label="Sub-Admin Panel" href="/subadmin" color="text-primary" />
              )}
          </CardContent>
         </Card>

      </main>

      <nav className="sticky bottom-0 z-20 border-t border-white/[0.05] bg-black/40 backdrop-blur-xl">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs font-medium">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" active />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={Trophy} label="Leaders" href="/leaderboard" />
          <BottomNavItem icon={HandCoins} label="My Loans" href="/my-loans" />
          <BottomNavItem icon={User} label="Profile" href="/profile" />
        </div>
      </nav>
    </div>
  );
}

function Announcements({ announcements, loading }: { announcements: Announcement[] | null | undefined, loading: boolean }) {
    if (loading) return null;
    if (!announcements || announcements.length === 0) return null;

    return (
        <Card className="bg-primary/10 border-primary/20 backdrop-blur-xl rounded-2xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
            <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-blue-300 text-sm font-bold uppercase tracking-widest">
                    <Megaphone className="h-4 w-4 animate-bounce"/>
                    Latest Updates
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 relative pb-4">
                {announcements.slice(0, 3).map(ann => (
                    <div key={ann.id} className="text-xs bg-black/20 p-2.5 rounded-xl border border-white/5 flex items-start gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                        {ann.link ? (
                            <a href={ann.link} target="_blank" rel="noopener noreferrer" className="text-blue-200 hover:text-white transition-colors leading-relaxed">
                                {ann.message}
                            </a>
                        ) : (
                            <p className="text-white/80 leading-relaxed">{ann.message}</p>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

function WalletSummary({
  userData,
  adminSettings,
  loading,
}: {
  userData?: UserData | null;
  adminSettings?: AdminSettings | null;
  loading: boolean;
}) {
  return (
    <Card className="shadow-2xl border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl rounded-3xl overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 opacity-50 pointer-events-none" />
      <CardHeader className="relative">
        <CardTitle className="text-white/60 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
            <Wallet size={16} /> My Digital Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-6">
        <div className="text-center space-y-1">
          <p className="text-[10px] text-white/30 uppercase tracking-[3px] font-bold">Current Balance</p>
          <p className="text-5xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            {loading ? '...' : `₹${(userData?.walletBalance || 0).toFixed(2)}`}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 bg-black/20 p-4 rounded-2xl border border-white/5">
          <div className="text-center border-r border-white/5">
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-1">Invested</p>
            <p className="text-lg font-bold text-white">
              {loading ? '...' : `₹${(userData?.totalInvestment || 0).toFixed(2)}`}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-1">Income</p>
            <p className="text-lg font-bold text-green-400">
              {loading ? '...' : `₹${(userData?.totalIncome || 0).toFixed(2)}`}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DepositButton adminUpi={adminSettings?.adminUpi} />
          <WithdrawButton adminSettings={adminSettings} userData={userData} />
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
  const [qrData, setQrData] = useState('');

  useEffect(() => {
    if (amount && parseFloat(amount) > 0 && adminUpi) {
      const payeeName = "Grow Money".replace(/ /g, '%20');
      const upiUrl = `upi://pay?pa=${adminUpi}&pn=${payeeName}&am=${amount}&cu=INR`;
      setQrData(upiUrl);
    } else {
      setQrData('');
    }
  }, [amount, adminUpi]);

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
    <Dialog onOpenChange={(isOpen) => { if (!isOpen) { setAmount(''); setTransactionId(''); setQrData('')}}}>
      <DialogTrigger asChild>
        <Button className="w-full h-12 rounded-xl font-bold bg-white text-black hover:bg-white/90 shadow-xl shadow-white/5">
          <Upload className="mr-2 h-4 w-4" /> Recharge
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#030408]/90 backdrop-blur-2xl border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Recharge Wallet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
           <div className="space-y-2">
            <Label htmlFor="amount" className="text-white/60">1. Enter Amount (INR)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g., 500"
              className="bg-white/5 border-white/10 rounded-xl h-11"
            />
          </div>
          
          {qrData && (
            <div className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white/5 border border-white/5 animate-in fade-in-50">
                <p className="text-xs text-center font-bold uppercase tracking-widest text-white/40">2. Scan and Pay</p>
                <div className="bg-white p-3 rounded-2xl shadow-2xl">
                    <Image
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`}
                        alt="UPI QR Code"
                        width={180}
                        height={200}
                    />
                </div>
                <p className="text-[10px] text-white/30 text-center font-mono">ID: {adminUpi}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="transactionId" className="text-white/60">3. Enter Transaction ID</Label>
            <Input
              id="transactionId"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="12-digit UPI reference"
              className="bg-white/5 border-white/10 rounded-xl h-11"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="ghost" className="hover:bg-white/5 text-white/40">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-white">Confirm Deposit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawButton({ adminSettings, userData }: { adminSettings?: AdminSettings | null, userData?: UserData | null }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [amount, setAmount] = useState('');
  const [withdrawalType, setWithdrawalType] = useState('');
  const { toast } = useToast();

  const minWithdrawal = adminSettings?.minWithdrawal || 0;
  
  const userLevel = (userData?.vipLevel || 'Bronze').toLowerCase() as keyof NonNullable<AdminSettings['vipWithdrawalGst']>;
  const gstPercentage = adminSettings?.vipWithdrawalGst?.[userLevel] ?? adminSettings?.withdrawalGstPercentage ?? 0;


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
    if (!user || !amount || !userData?.upiId) {
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
    if (withdrawAmount > (userData?.walletBalance || 0)) {
        toast({ variant: 'destructive', title: 'Insufficient Balance', description: 'You cannot withdraw more than your current wallet balance.' });
        return;
    }

    const requestData = {
      userId: user.uid,
      name: user.displayName,
      amount: withdrawAmount,
      upiId: userData.upiId,
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
      errorEmitter.emit('permission-error', serverError);
    });
  };


  return (
      <Dialog>
        <DialogTrigger asChild>
            <Button variant="outline" className="w-full h-12 rounded-xl font-bold border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white">
              <Download className="mr-2 h-4 w-4" /> Withdraw
            </Button>
        </DialogTrigger>
        <DialogContent className="bg-[#030408]/90 backdrop-blur-2xl border-white/10 text-white">
            <DialogHeader>
                <DialogTitle>Withdraw Funds</DialogTitle>
            </DialogHeader>
             <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-1">Receiving Account</p>
                    <span className="font-mono text-white/80">{userData?.upiId || 'Not Configured'}</span>
                    {!userData?.upiId && <p className="text-[10px] text-red-400 mt-2">Configure UPI in Profile first.</p>}
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="amount" className="text-white/60">Amount to Withdraw (INR)</Label>
                    <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Min ₹${minWithdrawal}`} className="bg-white/5 border-white/10 rounded-xl h-11" />
                </div>

                 <div className="space-y-2">
                    <Label className="text-white/60">Withdrawal Source</Label>
                    <RadioGroup onValueChange={setWithdrawalType} value={withdrawalType} className="grid grid-cols-2 gap-3">
                        <WithdrawTypeOption value="Investment Plan" label="Plans" />
                        <WithdrawTypeOption value="Group Investment" label="Groups" />
                        <WithdrawTypeOption value="General" label="General" className="col-span-2" />
                    </RadioGroup>
                </div>

                {amount && (
                  <Card className="bg-black/40 border-white/5 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between text-xs text-white/40">
                      <span>Service Fee ({gstPercentage}%):</span>
                      <span className="text-red-400">- ₹{gstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-white">
                      <span>Total Payout:</span>
                      <span className="text-green-400">₹{finalAmount.toFixed(2)}</span>
                    </div>
                  </Card>
                )}
             </div>
             <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                    <Button variant="ghost" className="text-white/40 hover:bg-white/5">Cancel</Button>
                </DialogClose>
                <Button onClick={handleWithdraw} disabled={!userData?.upiId || !amount} className="rounded-xl font-bold bg-primary text-white">Request Payout</Button>
             </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}

function WithdrawTypeOption({ value, label, className }: { value: string, label: string, className?: string }) {
    return (
        <div className={className}>
            <RadioGroupItem value={value} id={`type-${value}`} className="peer sr-only" />
            <Label htmlFor={`type-${value}`} className="flex items-center justify-center rounded-xl border-2 border-white/5 bg-white/[0.02] p-3 text-sm font-bold text-white/60 hover:bg-white/5 peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-white peer-data-[state=checked]:bg-primary/10 transition-all cursor-pointer">
                {label}
            </Label>
        </div>
    )
}


function ActivePlanCard({ 
    investment, 
    onClaimProfit, 
    onClaimMaturity 
}: { 
    investment: Investment, 
    onClaimProfit: (investment: Investment) => void,
    onClaimMaturity: (investment: Investment) => void
}) {
  const [isClaiming, setIsClaiming] = useState(false);

  if (!investment.startDate || !investment.maturityDate) {
    return null;
  }
  
  const startDate = investment.startDate.toDate();
  const maturityDate = investment.maturityDate.toDate();
  const now = new Date();

  const totalPossibleIncome = investment.returnAmount - investment.investedAmount;
  const elapsedMilliseconds = Math.max(0, now.getTime() - startDate.getTime());
  const elapsedDays = Math.floor(elapsedMilliseconds / (1000 * 60 * 60 * 24));
  const earnedIncome = Math.min(elapsedDays * investment.dailyIncome, totalPossibleIncome);
  const currentTotalValue = investment.investedAmount + earnedIncome;
  const totalDuration = maturityDate.getTime() - startDate.getTime();
  const progress = totalDuration > 0 ? Math.min((elapsedMilliseconds / totalDuration) * 100, 100) : 100;

  const isMatured = now >= maturityDate || investment.status === 'Stopped';
  
  // Logic for partial claims
  const lastClaim = investment.lastClaimDate?.toDate() || startDate;
  const msSinceLastClaim = now.getTime() - lastClaim.getTime();
  const daysSinceLastClaim = Math.floor(msSinceLastClaim / (1000 * 60 * 60 * 24));
  
  const canClaimProfit = !isMatured && (
      (investment.payoutFrequency === 'daily' && daysSinceLastClaim >= 1) ||
      (investment.payoutFrequency === 'monthly' && daysSinceLastClaim >= 30)
  );

  const handleClaimClick = () => {
    setIsClaiming(true);
    if (isMatured) {
        onClaimMaturity(investment);
    } else {
        onClaimProfit(investment);
    }
    setTimeout(() => setIsClaiming(false), 2000);
  }
  
  const getBadge = () => {
    if (investment.status === 'Stopped') {
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] uppercase font-bold">Stopped</Badge>;
    }
    if (isMatured) {
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] uppercase font-bold">Matured</Badge>;
    }
    return <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] uppercase font-bold">Growing</Badge>;
  }

  return (
    <Card className="shadow-xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl rounded-2xl group overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardHeader className="pb-3">
        <CardTitle className="flex justify-between items-center text-white/90">
          <span className="text-base font-bold">{investment.planName}</span>
          {getBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 relative">
        <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
            <div className="space-y-1">
                 <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Total Capital</p>
                 <p className="text-xl font-bold text-white">₹{investment.investedAmount.toFixed(2)}</p>
            </div>
            <div className="text-right space-y-1">
                 <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Accrued Profit</p>
                 <p className="text-sm font-bold text-green-400">+ ₹{earnedIncome.toFixed(2)}</p>
            </div>
        </div>
        
        <div className="space-y-2">
            {isMatured ? (
                <Button onClick={handleClaimClick} disabled={isClaiming} className="w-full h-11 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20">
                    {isClaiming ? 'Settling Account...' : 'Claim Full Return'}
                </Button>
            ) : investment.payoutFrequency === 'on_maturity' ? (
                <div className="py-2 text-center text-[10px] font-black uppercase tracking-widest text-white/20 bg-white/5 rounded-xl border border-white/5">
                    Locks until {maturityDate.toLocaleDateString()}
                </div>
            ) : (
                <Button 
                    onClick={handleClaimClick} 
                    disabled={isClaiming || !canClaimProfit} 
                    className={cn(
                        "w-full h-11 rounded-xl font-bold transition-all",
                        canClaimProfit ? "bg-green-600 text-white shadow-lg shadow-green-500/20" : "bg-white/5 text-white/20"
                    )}
                >
                    {isClaiming ? 'Transferring...' : canClaimProfit ? `Claim ${investment.payoutFrequency} Profit` : `${investment.payoutFrequency.toUpperCase()} Claim Locked`}
                </Button>
            )}
            
            <div className="pt-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5 px-1">
                    <span>Progress to Maturity</span>
                    <CountdownTimer endDate={maturityDate} />
                </div>
                <Progress value={progress} className="h-1.5 bg-white/5" />
            </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActiveLoanCard({ loan }: { loan: ActiveLoan }) {
    if (!loan.startDate || !loan.dueDate) return null;
    
    const startDate = loan.startDate.toDate();
    const dueDate = loan.dueDate.toDate();
    const now = new Date();

    const totalDuration = dueDate.getTime() - startDate.getTime();
    const elapsedDuration = now.getTime() - startDate.getTime();
    const progress = Math.min((elapsedDuration / totalDuration) * 100, 100);
    
    const getBadgeStyle = (status: string) => {
        switch(status) {
            case 'Active': return "bg-primary/20 text-primary border-primary/30";
            case 'Due': return "bg-red-500/20 text-red-400 border-red-500/30";
            default: return "bg-white/5 text-white/40 border-white/10";
        }
    }

    return (
        <Card className="shadow-xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl rounded-2xl group overflow-hidden">
             <CardHeader className="pb-3">
                <CardTitle className="flex justify-between items-center text-white/90">
                    <span className="text-base font-bold">{loan.planName}</span>
                    <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-widest", getBadgeStyle(loan.status))}>
                        {loan.status}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                        <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold mb-1">Repayment</p>
                        <p className="text-lg font-bold text-red-400">₹{(loan.totalPayable || 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5 text-right">
                        <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold mb-1">Due Date</p>
                        <p className="text-sm font-bold text-white/80">{dueDate.toLocaleDateString()}</p>
                    </div>
                </div>
                <div className="space-y-2">
                    <Progress value={progress} className="h-1.5 bg-white/5 [&>div]:bg-red-500" />
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/30">
                        <span>Timeline</span>
                        <span>{progress.toFixed(0)}% Elapsed</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function DailyCheckInCard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { data: userData, refetch } = useDoc<UserData>(user ? `users/${user.uid}` : null);
  const { data: adminSettings } = useDoc<AdminSettings>('settings/admin');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const hasCheckedInToday = useMemo(() => {
    if (!userData?.lastCheckIn) return false;
    return isToday(userData.lastCheckIn.toDate());
  }, [userData]);

  const bonusAmount = adminSettings?.dailyCheckInBonus || 0;

  const handleCheckIn = async () => {
    if (!user || hasCheckedInToday || bonusAmount <= 0) return;

    setIsLoading(true);
    const userRef = doc(firestore, 'users', user.uid);
    try {
      await runTransaction(firestore, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User not found");
        
        const lastCheckIn = userDoc.data().lastCheckIn?.toDate();
        if (lastCheckIn && isToday(lastCheckIn)) {
            throw new Error("Already checked in today.");
        }

        const newBalance = (userDoc.data().walletBalance || 0) + bonusAmount;
        transaction.update(userRef, {
          walletBalance: newBalance,
          lastCheckIn: serverTimestamp(),
        });
      });
      toast({
        title: 'Check-in Successful!',
        description: `You've earned ₹${bonusAmount.toFixed(2)}!`,
      });
      refetch(); 
    } catch (e: any) {
      toast({
        title: 'Check-in Failed',
        description: e.message || 'An error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (bonusAmount <= 0) return null;

  return (
    <Card className="shadow-2xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl rounded-2xl overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-50 pointer-events-none" />
      <CardContent className="pt-6 relative">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Gift className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-white/90">Daily Check-in</h3>
              <p className="text-xs text-white/40">
                Collect your daily <span className="text-white font-bold">₹{bonusAmount.toFixed(2)}</span> reward.
              </p>
            </div>
          </div>
          <Button
            onClick={handleCheckIn}
            disabled={hasCheckedInToday || isLoading}
            className={cn(
                "w-full sm:w-auto h-11 rounded-xl px-8 font-bold transition-all",
                hasCheckedInToday ? "bg-white/5 text-white/20 border-white/5" : "bg-primary text-white shadow-lg shadow-primary/20"
            )}
            variant={hasCheckedInToday ? "ghost" : "default"}
          >
            {hasCheckedInToday ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" /> Claimed
              </>
            ) : (
              'Claim Now'
            )}
          </Button>
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
      className={cn(
        "flex flex-col items-center justify-center gap-1 transition-all h-full relative",
        active ? 'text-primary scale-110' : 'text-white/40 hover:text-white/60'
      )}
    >
      <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]")} />
      <span className="text-[10px] tracking-tight">{label}</span>
      {active && <div className="absolute -bottom-1 h-1 w-8 bg-primary rounded-full blur-[2px]" />}
    </Link>
  );
}

function QuickActionButton({ icon: Icon, label, href, color }: { icon: React.ElementType, label: string, href: string, color?: string }) {
    return (
        <Button variant="ghost" className="flex-col h-24 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-white/10 transition-all group" asChild>
            <Link href={href}>
                <div className={cn("h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform", color)}>
                    <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 group-hover:text-white/80">{label}</span>
            </Link>
        </Button>
    )
}
