'use client';
import {
  Wallet,
  Briefcase,
  Upload,
  Download,
  ArrowRight,
  Home,
  User,
  HandCoins,
  Trophy,
  Activity,
  Zap,
  Timer,
  ChevronRight,
  FileText,
  Eye,
  CheckCircle2,
  Smartphone,
  HelpCircle,
  TrendingUp,
  Users,
  PlayCircle
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
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { BannerCarousel } from '@/components/dashboard/BannerCarousel';
import { cn } from '@/lib/utils';
import { ActivityPulse } from '@/components/dashboard/ActivityPulse';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CashDispenseAnimation } from '@/components/dashboard/CashDispenseAnimation';
import { useSettings } from '@/context/settings-context';

type UserData = {
  id: string;
  walletBalance: number;
  totalInvestment: number;
  totalIncome: number;
  name?: string;
  photoURL?: string;
  email?: string;
  upiId?: string;
};

type AdminSettings = {
  adminUpi?: string;
  minWithdrawal?: number;
  homepageVideoUrls?: string[];
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
    <div className={cn("relative h-12 w-full rounded-xl overflow-hidden border transition-all duration-300", disabled ? "bg-muted/30 border-border opacity-50" : "bg-muted border-border")}>
      <div className="absolute inset-y-0 left-0 bg-primary/20 transition-all duration-75" style={{ width: `${sliderValue}%` }} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-[10px] font-black uppercase tracking-widest">{disabled ? (lockedLabel || "Action Locked") : (isCompleted ? "Success!" : label)}</span>
      </div>
      <input type="range" min="0" max="100" value={sliderValue} onChange={handleSliderChange} onMouseUp={handleMouseUp} onTouchEnd={handleMouseUp} disabled={disabled || isCompleted} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
      <div className={cn("absolute top-1 left-1 bottom-1 aspect-square rounded-lg flex items-center justify-center transition-all duration-75 pointer-events-none", disabled ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground shadow-lg")} style={{ left: `calc(${sliderValue}% - ${sliderValue > 0 ? '40px' : '0px'})`, marginLeft: sliderValue > 0 ? '0' : '4px' }}>
        <ChevronRight className={cn("h-5 w-5", !disabled && "animate-pulse")} />
      </div>
    </div>
  );
};

export default function Dashboard() {
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const { t } = useSettings();

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
        const diffTime = Math.abs(now.getTime() - lastClaim.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 1) throw new Error("Not yet due for claim.");
        const amountToClaim = diffDays * invData.dailyIncome;
        transaction.update(userRef, { walletBalance: (userDoc.data().walletBalance || 0) + amountToClaim, totalIncome: (userDoc.data().totalIncome || 0) + amountToClaim });
        transaction.update(invRef, { lastClaimDate: serverTimestamp() });
        transaction.set(doc(collection(firestore, `users/${user.uid}/walletHistory`)), { amount: amountToClaim, type: 'credit', category: 'ROI Claim', description: `Daily ROI claim for ${investment.planName}`, createdAt: serverTimestamp() });
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
       transaction.set(doc(collection(firestore, `users/${user.uid}/walletHistory`)), { amount: amountToClaim, type: 'credit', category: 'Settlement', description: `Full settlement of ${investment.planName}`, createdAt: serverTimestamp() });
     }).then(() => toast({ title: 'Plan Settled!' })).catch(e => toast({ title: 'Settlement Failed', variant: 'destructive' }));
  };

  const activeInvestments = investments?.filter((inv) => inv.status === 'Active' || inv.status === 'Stopped');

  if (userLoading || userDataLoading || investmentsLoading) return <div className="flex h-screen items-center justify-center"><Timer className="animate-spin text-primary" /></div>;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground transition-colors duration-300">
       <AlertDialog open={showWelcomePopup} onOpenChange={setShowWelcomePopup}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-2xl font-black tracking-tight">Welcome, {userData?.name} 💰</AlertDialogTitle>
            <AlertDialogDescription className="text-center font-bold uppercase tracking-widest text-[10px]">Your journey starts now!</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={() => setShowWelcomePopup(false)} className="w-full bg-primary text-primary-foreground font-black h-14 rounded-2xl shadow-xl">Authorize & Enter</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 backdrop-blur-xl px-4 backdrop-blur-sm sm:px-6">
        <div className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" /><h1 className="text-xl font-bold tracking-tighter">Grow Money</h1></div>
        <Link href="/profile">
          <Badge variant="outline" className="border-border bg-muted h-10 px-3 gap-2 rounded-full hover:bg-accent transition-all">
            <Avatar className="h-7 w-7">
              <AvatarImage src={userData?.photoURL} />
              <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-black">{userData?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="font-black text-xs tracking-tight">{userData?.name || 'User'}</span>
          </Badge>
        </Link>
      </header>

      <ActivityPulse />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <div className="rounded-3xl overflow-hidden shadow-2xl"><BannerCarousel /></div>
        
        <WalletSummary userData={userData} adminSettings={adminSettings} loading={userDataLoading} t={t} />

        <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-[3px] text-muted-foreground flex items-center gap-2">
                <Activity size={14} className="text-primary" /> {t.dashboard.active_portfolios}
            </h2>
            <div className="flex gap-2">
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground text-[10px] font-black uppercase tracking-widest border border-border/10">
                    <Link href="/my-plans">{t.dashboard.vault} <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="text-primary text-[10px] font-black uppercase tracking-widest">
                    <Link href="/plans">{t.dashboard.market} <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
            </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
            {activeInvestments?.map(inv => <ActivePlanCard key={inv.id} investment={inv} onClaimProfit={handleClaimProfit} onClaimMaturity={handleClaimMaturity} />)}
            {activeInvestments?.length === 0 && <Card className="bg-muted/20 border-dashed border-border rounded-3xl py-12 text-center"><p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">No active nodes.</p></Card>}
        </div>

        <Card className="bg-card border-border rounded-3xl p-6 shadow-2xl">
            <CardTitle className="text-[10px] font-black uppercase tracking-[4px] text-muted-foreground mb-6">{t.dashboard.service_integration}</CardTitle>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <QuickActionButton icon={TrendingUp} label={t.dashboard.market} href="/plans" color="text-green-600" />
                <QuickActionButton icon={Zap} label={t.dashboard.wheel} href="/lucky-spin" color="text-yellow-600" />
                <QuickActionButton icon={HandCoins} label={t.dashboard.standard_loan} href="/loans" color="text-orange-600" />
                <QuickActionButton icon={FileText} label={t.dashboard.flexi_loan} href="/custom-loan" color="text-red-600" />
                <QuickActionButton icon={Users} label={t.dashboard.syndicate} href="/group-investing" color="text-purple-600" />
                <QuickActionButton icon={PlayCircle} label={t.dashboard.media_hub} href="/media" color="text-primary" />
            </div>
        </Card>
      </main>

      <nav className="sticky bottom-0 z-30 border-t border-border/20 bg-background/95 backdrop-blur-xl h-16 flex items-center justify-around px-4">
          <BottomNavItem icon={Home} label={t.nav.home} href="/dashboard" active />
          <BottomNavItem icon={Briefcase} label={t.nav.plans} href="/plans" />
          <BottomNavItem icon={Trophy} label={t.nav.leaders} href="/leaderboard" />
          <BottomNavItem icon={HandCoins} label={t.nav.loans} href="/my-loans" />
          <BottomNavItem icon={User} label={t.nav.profile} href="/profile" />
      </nav>
    </div>
  );
}

function WalletSummary({ userData, adminSettings, loading, t }: { userData?: UserData | null, adminSettings?: AdminSettings | null, loading: boolean, t: any }) {
  return (
    <Card className="border-border bg-card rounded-[2rem] p-8 space-y-8 shadow-2xl relative overflow-hidden">
        <div className="text-center space-y-1 relative z-10">
          <p className="text-4xl font-black tracking-tighter">{loading ? '...' : `₹${(userData?.walletBalance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`}</p>
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[4px]">{t.dashboard.balance}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 relative z-10">
          <DepositButton adminUpi={adminSettings?.adminUpi} t={t} />
          <WithdrawButton adminSettings={adminSettings} userData={userData} t={t} />
        </div>
    </Card>
  );
}

function DepositButton({ adminUpi, t }: { adminUpi?: string, t: any }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [tid, setTid] = useState('');
  const [isSabrActive, setIsSabrActive] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const qrUrl = amount ? `upi://pay?pa=${adminUpi}&pn=Grow%20Money&am=${amount}&cu=INR` : '';

  const handleSubmit = () => {
    if (!user || !amount || !tid) {
      toast({ title: "Validation Error", description: "Amount and Transaction ID are required.", variant: "destructive" });
      return;
    }
    
    setIsSabrActive(true);
    
    setTimeout(() => {
      addDoc(collection(firestore, 'deposits'), { 
        userId: user.uid, 
        name: user.displayName, 
        amount: parseFloat(amount), 
        transactionId: tid, 
        status: 'pending', 
        createdAt: serverTimestamp() 
      })
      .then(() => { 
        toast({ title: 'Protocol Initiated', description: 'Request sent to ledger.' }); 
        setAmount(''); 
        setTid(''); 
        setIsSabrActive(false);
        setIsOpen(false); 
      })
      .catch((e) => {
        console.error(e);
        setIsSabrActive(false);
        toast({ title: "Submission Error", variant: "destructive" });
      });
    }, 2500);
  };

  return (
    <>
      <div className="w-full">
        <Button onClick={() => setIsOpen(true)} className="w-full h-14 rounded-2xl bg-foreground text-background font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-xl"><Upload size={16} className="mr-2" /> {t.dashboard.recharge}</Button>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight">Node Funding</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">Amount (INR)</Label>
                    <Input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} className="h-14 rounded-xl text-xl font-black" />
                </div>
                {qrUrl && <div className="bg-white p-4 rounded-3xl flex justify-center shadow-2xl animate-in zoom-in-95"><Image src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`} alt="QR" width={180} height={160} /></div>}
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">Ref Transaction ID</Label>
                    <Input placeholder="Enter 12-digit ID" value={tid} onChange={e => setTid(e.target.value)} className="h-12 rounded-xl" />
                </div>
                <Button onClick={handleSubmit} className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest shadow-xl">Confirm Protocol</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isSabrActive && (
        <div className="fixed inset-0 z-[300] bg-background/80 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in duration-500 p-6 text-center">
            <div className="text-8xl mb-8 animate-bounce">⏳</div>
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-2 animate-in slide-in-from-bottom-2 duration-700">Zara Sabr Karo</h2>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Amount on its way, checking node integrity!</p>
            
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-3">
                <div className="flex gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-ping" />
                  <div className="h-2 w-2 rounded-full bg-primary animate-ping delay-150" />
                  <div className="h-2 w-2 rounded-full bg-primary animate-ping delay-300" />
                </div>
            </div>
        </div>
      )}
    </>
  );
}

function WithdrawButton({ adminSettings, userData, t }: { adminSettings?: AdminSettings | null, userData?: UserData | null, t: any }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [amt, setAmt] = useState('');
  const [isDispensing, setIsDispensing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const amounts = [500, 1000, 2000, 5000];

  const handleWithdraw = () => {
    if (!user || !amt || !userData?.upiId) {
        toast({ title: "Node Incomplete", description: "Link UPI ID in profile to enable withdrawals.", variant: "destructive"});
        return;
    }
    const val = parseFloat(amt);
    if (val < (adminSettings?.minWithdrawal || 100)) { toast({ title: "Protocol Violation", description: "Min ₹" + (adminSettings?.minWithdrawal || 100), variant: "destructive" }); return; }

    runTransaction(firestore, async (transaction) => {
        const userRef = doc(firestore, 'users', user.uid);
        const userDoc = await transaction.get(userRef);
        if ((userDoc.data()?.walletBalance || 0) < val) throw new Error("Insufficient Ledger Balance");
        transaction.update(userRef, { walletBalance: (userDoc.data()?.walletBalance || 0) - val });
        transaction.set(doc(collection(firestore, 'withdrawals')), { userId: user.uid, name: user.displayName, amount: val, upiId: userData.upiId, status: 'pending', createdAt: serverTimestamp() });
    }).then(() => { 
        setIsDialogOpen(false); 
        setIsDispensing(true); 
    }).catch(e => toast({ title: "Auth Failure", description: e.message, variant: "destructive" }));
  };

  return (
    <>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild><Button variant="outline" className="w-full h-14 rounded-2xl border-border bg-muted text-muted-foreground font-black uppercase tracking-widest text-xs hover:bg-accent hover:text-foreground transition-all"><Download size={16} className="mr-2" /> {t.dashboard.withdraw}</Button></DialogTrigger>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2.5rem] shadow-2xl">
                <header className="p-6 border-b border-border bg-muted/20 flex items-center justify-between">
                    <DialogTitle className="text-lg font-black tracking-tight uppercase">Capital Dispatch</DialogTitle>
                    <HelpCircle className="text-muted-foreground h-5 w-5" />
                </header>
                <div className="p-6 space-y-8">
                     <div className="bg-muted border border-border rounded-[1.5rem] p-5 flex items-center justify-between shadow-inner">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-lg border border-primary/20"><Wallet size={24}/></div>
                            <div>
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[2px]">Asset Balance</p>
                                <p className="text-xl font-black tracking-tighter">₹{(userData?.walletBalance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                            </div>
                        </div>
                        <Eye size={18} className="text-muted-foreground relative z-10" />
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[3px] ml-1">Dispatch Amount</Label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-muted-foreground">₹</span>
                            <Input 
                                type="number" 
                                placeholder="0.00" 
                                value={amt} 
                                onChange={e => setAmt(e.target.value)} 
                                className="h-16 pl-10 text-3xl font-black bg-muted border-border rounded-2xl focus:ring-primary focus:border-primary/50"
                            />
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {amounts.map(a => (
                                <Button 
                                    key={a} 
                                    variant="outline" 
                                    onClick={() => setAmt(a.toString())}
                                    className={cn(
                                        "h-11 rounded-xl font-black border-border hover:bg-primary/20 transition-all",
                                        amt === a.toString() ? "bg-primary text-primary-foreground border-primary shadow-lg" : "bg-muted text-muted-foreground"
                                    )}
                                >
                                    ₹{a}
                                </Button>
                            ))}
                        </div>
                    </div>
                    
                    <Button onClick={handleWithdraw} className="w-full h-16 rounded-[1.5rem] bg-primary text-primary-foreground font-black text-lg shadow-2xl hover:scale-[1.02] active:scale-95 transition-all">
                        Authorize Dispatch
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
    <Card className="border-border bg-card rounded-3xl p-6 space-y-5 shadow-2xl relative overflow-hidden group">
        <div className="flex justify-between items-start relative z-10">
            <div>
                <p className="text-base font-bold tracking-tight">{investment.planName}</p>
                <Badge className="bg-primary/20 text-primary text-[8px] font-black uppercase tracking-widest mt-1.5 h-4 border-primary/10">Active Node</Badge>
            </div>
            <p className="text-sm font-black text-accent">+₹{investment.dailyIncome}/day</p>
        </div>
        <div className="relative z-10">
            <SlideToClaim label={isMatured ? "Slide to Liquidate" : "Claim Daily Profit"} onComplete={() => isMatured ? onClaimMaturity(investment) : onClaimProfit(investment)} />
        </div>
    </Card>
  );
}

function BottomNavItem({ icon: Icon, label, href, active = false }: { icon: React.ElementType, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={cn("flex flex-col items-center gap-1 transition-all h-full justify-center relative", active ? 'text-primary scale-110' : 'text-muted-foreground hover:text-foreground')}>
      <Icon className={cn("h-5 w-5")} />
      <span className="text-[9px] font-black uppercase tracking-tight">{label}</span>
      {active && <div className="absolute -bottom-1 h-1 w-6 bg-primary rounded-full blur-[2px]" />}
    </Link>
  );
}

function QuickActionButton({ icon: Icon, label, href, color }: { icon: React.ElementType, label: string, href: string, color: string }) {
    return (
        <Link href={href} className="flex flex-col items-center gap-2 p-5 bg-muted/30 border border-border rounded-2xl hover:bg-accent/10 hover:border-accent/30 transition-all group shadow-sm">
            <Icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", color)} /><span className="text-[9px] font-black uppercase text-muted-foreground tracking-[2px] group-hover:text-foreground transition-colors">{label}</span>
        </Link>
    )
}
