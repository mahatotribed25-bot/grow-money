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
  TrendingUp,
  Megaphone,
  HandCoins,
  AlertTriangle,
  Gift,
  Gem,
  Trophy,
  Activity,
  Zap,
  Timer,
  Sparkles,
  MoreVertical,
  Info,
  ExternalLink,
  ChevronRight,
  FileText,
  Users
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  runTransaction,
  updateDoc,
  orderBy,
  limit,
  where,
  query,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BannerCarousel } from '@/components/dashboard/BannerCarousel';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import { ActivityPulse } from '@/components/dashboard/ActivityPulse';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CashDispenseAnimation } from '@/components/dashboard/CashDispenseAnimation';

type UserData = {
  id: string;
  walletBalance: number;
  totalInvestment: number;
  totalIncome: number;
  name?: string;
  photoURL?: string;
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
};

type Investment = {
  id: string;
  planId: string;
  planName: string;
  investedAmount: number;
  returnAmount: number;
  startDate: Timestamp;
  maturityDate: Timestamp;
  status: 'Active' | 'Matured' | 'Stopped';
  dailyIncome: number;
  lastClaimDate?: Timestamp;
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

            setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        }, 1000);

        return () => clearInterval(interval);
    }, [endDate]);

    return <span className="font-mono">{timeLeft}</span>;
};

const SlideToClaim = ({ onComplete, disabled, label, lockedLabel }: { onComplete: () => void, disabled?: boolean, label: string, lockedLabel?: string }) => {
  const [sliderValue, setSliderValue] = useState(0);
  const [isCompleted, setIsComplete] = useState(false);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || isCompleted) return;
    const value = parseInt(e.target.value);
    setSliderValue(value);
    if (value >= 95) {
      setIsComplete(true);
      setSliderValue(100);
      onComplete();
      setTimeout(() => { setIsComplete(false); setSliderValue(0); }, 3000);
    }
  };

  const handleMouseUp = () => { if (sliderValue < 95) setSliderValue(0); };

  return (
    <div className={cn("relative h-12 w-full rounded-xl overflow-hidden border transition-all duration-300", disabled ? "bg-white/5 border-white/5 opacity-50" : "bg-white/10 border-white/10")}>
      <div className="absolute inset-y-0 left-0 bg-primary/20 transition-all duration-75" style={{ width: `${sliderValue}%` }} />
      <div className="absolute inset-0 flex items-center justify-center pointer-none">
        <span className="text-[10px] font-black uppercase tracking-widest">{disabled ? (lockedLabel || "Action Locked") : (isCompleted ? "Success!" : label)}</span>
      </div>
      <input type="range" min="0" max="100" value={sliderValue} onChange={handleSliderChange} onMouseUp={handleMouseUp} onTouchEnd={handleMouseUp} disabled={disabled || isCompleted} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
      <div className={cn("absolute top-1 left-1 bottom-1 aspect-square rounded-lg flex items-center justify-center transition-all duration-75 pointer-none", disabled ? "bg-white/10 text-white/20" : "bg-white text-black shadow-lg")} style={{ left: `calc(${sliderValue}% - ${sliderValue > 0 ? '40px' : '0px'})`, marginLeft: sliderValue > 0 ? '0' : '4px' }}>
        <ChevronRight className={cn("h-5 w-5", !disabled && "animate-pulse")} />
      </div>
    </div>
  );
};

export default function Dashboard() {
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();

  const { data: userData, loading: userDataLoading } = useDoc<UserData>(user ? `users/${user.uid}` : null);
  const { data: adminSettings } = useDoc<AdminSettings>(user ? 'settings/admin' : null);
  const { data: investments, loading: investmentsLoading } = useCollection<Investment>(user ? `users/${user.uid}/investments` : null);

  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  useEffect(() => {
    if (!userLoading && user && userData) {
        const hasSeenPopup = sessionStorage.getItem('welcomePopupShown');
        if (!hasSeenPopup) { setShowWelcomePopup(true); sessionStorage.setItem('welcomePopupShown', 'true'); }
    }
  }, [userLoading, user, userData]);

  const handleClaimProfit = (investment: Investment) => {
    if (!user) return;
    runTransaction(firestore, async (transaction) => {
        const userRef = doc(firestore, 'users', user.uid);
        const invRef = doc(firestore, 'users', user.uid, 'investments', investment.id);
        const userDoc = await transaction.get(userRef);
        const invDoc = await transaction.get(invRef);
        if (!userDoc.exists() || !invDoc.exists()) throw new Error("Sync failure.");
        const invData = invDoc.data() as Investment;
        const now = new Date();
        const lastClaim = invData.lastClaimDate?.toDate() || invData.startDate.toDate();
        const diffDays = Math.floor((now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 1) throw new Error("Not yet due for claim.");
        const amountToClaim = diffDays * invData.dailyIncome;
        transaction.update(userRef, { walletBalance: (userDoc.data().walletBalance || 0) + amountToClaim, totalIncome: (userDoc.data().totalIncome || 0) + amountToClaim });
        transaction.update(invRef, { lastClaimDate: serverTimestamp() });
        transaction.set(doc(collection(firestore, `users/${user.uid}/walletHistory`)), { amount: amountToClaim, type: 'credit', category: 'ROI Claim', createdAt: serverTimestamp() });
    }).then(() => toast({ title: 'Profit Claimed!' })).catch(e => toast({ title: 'Claim Failed', description: e.message, variant: 'destructive' }));
  };

  const handleClaimMaturity = (investment: Investment) => {
     if (!user) return;
     runTransaction(firestore, async (transaction) => {
       const userRef = doc(firestore, 'users', user.uid);
       const invRef = doc(firestore, 'users', user.uid, 'investments', investment.id);
       const userDoc = await transaction.get(userRef);
       if (!userDoc.exists()) throw new Error("User record missing.");
       const amountToClaim = investment.status === 'Stopped' ? (investment.finalReturn || 0) : investment.returnAmount;
       transaction.update(invRef, { status: 'Matured' });
       transaction.update(userRef, { walletBalance: (userDoc.data().walletBalance || 0) + amountToClaim, totalInvestment: Math.max(0, (userDoc.data().totalInvestment || 0) - investment.investedAmount) });
       transaction.set(doc(collection(firestore, `users/${user.uid}/walletHistory`)), { amount: amountToClaim, type: 'credit', category: 'Settlement', createdAt: serverTimestamp() });
     }).then(() => toast({ title: 'Plan Settled!' })).catch(e => toast({ title: 'Settlement Failed', variant: 'destructive' }));
  };

  const activeInvestments = investments?.filter((inv) => inv.status === 'Active' || inv.status === 'Stopped');

  if (userLoading || userDataLoading || investmentsLoading) return <div className="flex h-screen items-center justify-center bg-[#030408]"><Timer className="animate-spin text-primary" /></div>;

  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent text-foreground">
       <AlertDialog open={showWelcomePopup} onOpenChange={setShowWelcomePopup}>
        <AlertDialogContent className="bg-[#030408]/90 backdrop-blur-2xl border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-white">Welcome, {userData?.name} 💰</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-white/60">Your journey starts now!</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={() => setShowWelcomePopup(false)} className="w-full bg-primary font-bold h-12 rounded-xl">Let's Go!</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.05] bg-black/40 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" /><h1 className="text-xl font-bold">Grow Money</h1></div>
        <Link href="/profile"><Badge variant="outline" className="border-white/10 bg-white/5 h-10 px-3 gap-2 rounded-full"><Avatar className="h-7 w-7"><AvatarImage src={userData?.photoURL} /><AvatarFallback>{userData?.name?.charAt(0)}</AvatarFallback></Avatar><span className="animate-rgb-glow font-black text-xs">{userData?.name || 'User'}</span></Badge></Link>
      </header>

      <ActivityPulse />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <div className="rounded-3xl overflow-hidden"><BannerCarousel /></div>
        
        <WalletSummary userData={userData} adminSettings={adminSettings} loading={userDataLoading} />

        <div className="flex items-center justify-between"><h2 className="text-xl font-bold flex items-center gap-2"><Activity className="text-primary" /> Active Plans</h2><Button variant="ghost" size="sm" asChild className="text-primary"><Link href="/plans">More Plans <ArrowRight className="ml-1 h-4 w-4" /></Link></Button></div>

        <div className="grid gap-4 sm:grid-cols-2">
            {activeInvestments?.map(inv => <ActivePlanCard key={inv.id} investment={inv} onClaimProfit={handleClaimProfit} onClaimMaturity={handleClaimMaturity} />)}
            {activeInvestments?.length === 0 && <Card className="bg-white/5 border-dashed rounded-3xl py-10 text-center"><p className="text-white/40">No active plans.</p></Card>}
        </div>

        <Card className="bg-white/[0.03] border-white/[0.08] rounded-3xl p-6">
            <CardTitle className="text-lg font-bold mb-4">Premium Access</CardTitle>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <QuickActionButton icon={TrendingUp} label="Market" href="/plans" color="text-green-400" />
                <QuickActionButton icon={Zap} label="Spin" href="/lucky-spin" color="text-yellow-400" />
                <QuickActionButton icon={HandCoins} label="Apply Loan" href="/loans" color="text-orange-400" />
                <QuickActionButton icon={FileText} label="Flexi Loan" href="/custom-loan" color="text-red-400" />
                <QuickActionButton icon={Users} label="Group Investing" href="/group-investing" color="text-purple-400" />
                <QuickActionButton icon={Gem} label="VIP Tiers" href="/vip-tiers" color="text-yellow-400" />
            </div>
        </Card>
      </main>

      <nav className="sticky bottom-0 z-30 border-t border-white/[0.05] bg-black/40 backdrop-blur-xl h-16 flex items-center justify-around px-4">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" active />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={Trophy} label="Leaders" href="/leaderboard" />
          <BottomNavItem icon={HandCoins} label="Loans" href="/my-loans" />
          <BottomNavItem icon={User} label="Profile" href="/profile" />
      </nav>
    </div>
  );
}

function WalletSummary({ userData, adminSettings, loading }: { userData?: UserData | null, adminSettings?: AdminSettings | null, loading: boolean }) {
  return (
    <Card className="border-white/[0.08] bg-white/[0.03] rounded-3xl p-6 space-y-6">
        <div className="text-center space-y-1">
          <p className="text-4xl font-black">{loading ? '...' : `₹${(userData?.walletBalance || 0).toFixed(2)}`}</p>
          <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Available Funds</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <DepositButton adminUpi={adminSettings?.adminUpi} />
          <WithdrawButton adminSettings={adminSettings} userData={userData} />
        </div>
    </Card>
  );
}

function DepositButton({ adminUpi }: { adminUpi?: string }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [tid, setTid] = useState('');
  const qrUrl = amount ? `upi://pay?pa=${adminUpi}&pn=Grow%20Money&am=${amount}&cu=INR` : '';

  const handleSubmit = () => {
    if (!user || !amount || !tid) return;
    addDoc(collection(firestore, 'deposits'), { userId: user.uid, name: user.displayName, amount: parseFloat(amount), transactionId: tid, status: 'pending', createdAt: serverTimestamp() })
      .then(() => { toast({ title: 'Request Sent' }); setAmount(''); setTid(''); });
  };

  return (
    <Dialog>
      <DialogTrigger asChild><Button className="w-full h-12 rounded-xl bg-white text-black font-bold"><Upload size={16} className="mr-2" /> Recharge</Button></DialogTrigger>
      <DialogContent className="bg-[#030408] border-white/10 text-white">
        <DialogHeader><DialogTitle>Recharge Wallet</DialogTitle></DialogHeader>
        <div className="space-y-4">
            <Input type="number" placeholder="Amount (INR)" value={amount} onChange={e => setAmount(e.target.value)} className="bg-white/5 border-white/10" />
            {qrUrl && <div className="bg-white p-4 rounded-xl flex justify-center"><Image src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`} alt="QR" width={160} height={160} /></div>}
            <Input placeholder="Transaction ID" value={tid} onChange={e => setTid(e.target.value)} className="bg-white/5 border-white/10" />
            <Button onClick={handleSubmit} className="w-full h-12 bg-primary">Confirm Protocol</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawButton({ adminSettings, userData }: { adminSettings?: AdminSettings | null, userData?: UserData | null }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [amt, setAmt] = useState('');
  const [isDispensing, setIsDispensing] = useState(false);

  const amounts = [500, 1000, 2000, 5000];

  const handleWithdraw = () => {
    if (!user || !amt || !userData?.upiId) {
        toast({ title: "Profile incomplete", description: "Please add your UPI ID in profile first.", variant: "destructive"});
        return;
    }
    const val = parseFloat(amt);
    if (val < (adminSettings?.minWithdrawal || 100)) { toast({ title: "Min ₹" + (adminSettings?.minWithdrawal || 100), variant: "destructive" }); return; }

    runTransaction(firestore, async (transaction) => {
        const userRef = doc(firestore, 'users', user.uid);
        const userDoc = await transaction.get(userRef);
        if ((userDoc.data()?.walletBalance || 0) < val) throw new Error("Insufficient Funds");
        transaction.update(userRef, { walletBalance: (userDoc.data()?.walletBalance || 0) - val });
        transaction.set(doc(collection(firestore, 'withdrawals')), { userId: user.uid, name: user.displayName, amount: val, upiId: userData.upiId, status: 'pending', createdAt: serverTimestamp() });
    }).then(() => { setIsDispensing(true); }).catch(e => toast({ title: "Failed", description: e.message, variant: "destructive" }));
  };

  return (
    <>
        <Dialog>
            <DialogTrigger asChild><Button variant="outline" className="w-full h-12 rounded-xl border-white/10 bg-white/5 text-white/70 font-bold"><Download size={16} className="mr-2" /> Withdraw</Button></DialogTrigger>
            <DialogContent className="bg-[#030408]/95 border-white/10 text-white sm:max-w-md p-0 overflow-hidden rounded-[2.5rem]">
                <header className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-lg font-bold">Withdraw</h2>
                    <HelpCircle className="text-white/20 h-5 w-5" />
                </header>
                <div className="p-6 space-y-8">
                     <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary"><Wallet size={20}/></div>
                            <div>
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Your Wallet Balance</p>
                                <p className="text-lg font-black tracking-tight">₹{(userData?.walletBalance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                            </div>
                        </div>
                        <Eye size={18} className="text-white/20" />
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[11px] font-black text-white/20 uppercase tracking-[2px] ml-1">Enter Amount</Label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-white/20">₹</span>
                            <Input 
                                type="number" 
                                placeholder="0.00" 
                                value={amt} 
                                onChange={e => setAmt(e.target.value)} 
                                className="h-16 pl-10 text-3xl font-black bg-white/5 border-white/10 rounded-2xl focus:ring-primary focus:border-primary/50"
                            />
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {amounts.map(a => (
                                <Button 
                                    key={a} 
                                    variant="outline" 
                                    onClick={() => setAmt(a.toString())}
                                    className={cn(
                                        "h-10 rounded-xl font-bold border-white/10 hover:bg-primary/20",
                                        amt === a.toString() ? "bg-primary text-white border-primary" : "bg-white/5 text-white/40"
                                    )}
                                >
                                    ₹{a}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[11px] font-black text-white/20 uppercase tracking-[2px] ml-1">Withdraw Method</Label>
                        <div className="bg-white/5 border border-primary/40 rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary"><Smartphone size={20}/></div>
                                <div>
                                    <p className="text-sm font-bold">ATM Cash</p>
                                    <p className="text-[10px] text-white/30">Withdraw via ATM</p>
                                </div>
                            </div>
                            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center"><CheckCircle2 size={12} className="text-white"/></div>
                        </div>
                    </div>
                    
                    <Button onClick={handleWithdraw} className="w-full h-14 rounded-2xl bg-primary text-white font-black text-lg shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                        Confirm Withdrawal
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
        <CashDispenseAnimation isOpen={isDispensing} amount={parseFloat(amt) || 500} walletBalance={userData?.walletBalance || 0} onClose={() => { setIsDispensing(false); setAmt(''); }} />
    </>
  );
}

function ActivePlanCard({ investment, onClaimProfit, onClaimMaturity }: { investment: Investment, onClaimProfit: (i: Investment) => void, onClaimMaturity: (i: Investment) => void }) {
  const isMatured = new Date() >= investment.maturityDate.toDate();
  return (
    <Card className="border-white/[0.08] bg-white/[0.03] rounded-3xl p-5 space-y-4">
        <div className="flex justify-between items-start">
            <div><p className="text-sm font-bold">{investment.planName}</p><Badge className="bg-primary/20 text-primary text-[8px] uppercase mt-1">Live Asset</Badge></div>
            <p className="text-xs font-black text-green-400">+₹{investment.dailyIncome}/day</p>
        </div>
        <SlideToClaim label={isMatured ? "Slide to Settle" : "Claim Daily ROI"} onComplete={() => isMatured ? onClaimMaturity(investment) : onClaimProfit(investment)} />
    </Card>
  );
}

function BottomNavItem({ icon: Icon, label, href, active = false }: { icon: React.ElementType, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={cn("flex flex-col items-center gap-1", active ? 'text-primary' : 'text-white/40')}>
      <Icon className="h-5 w-5" /><span className="text-[9px] font-bold">{label}</span>
    </Link>
  );
}

function QuickActionButton({ icon: Icon, label, href, color }: { icon: React.ElementType, label: string, href: string, color: string }) {
    return (
        <Link href={href} className="flex flex-col items-center gap-2 p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all">
            <Icon className={cn("h-5 w-5", color)} /><span className="text-[9px] font-black uppercase text-white/30 tracking-widest">{label}</span>
        </Link>
    )
}

function HelpCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  )
}

function Smartphone(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  )
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
