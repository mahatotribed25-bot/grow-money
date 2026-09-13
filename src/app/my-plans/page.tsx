
'use client';
import {
  ChevronLeft,
  Home,
  User,
  Briefcase,
  HandCoins,
  Users as UsersIcon,
  Trophy,
  History as HistoryIcon,
  Timer,
  ArrowUpRight,
  CheckCircle2,
  Activity,
  Calendar,
  IndianRupee,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection, useFirestore } from '@/firebase';
import type { Timestamp } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useState, useEffect } from 'react';
import { doc, runTransaction, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useSettings } from '@/context/settings-context';


type Investment = {
  id: string;
  planName: string;
  investedAmount: number;
  returnAmount: number;
  startDate: Timestamp;
  maturityDate: Timestamp;
  status: 'Active' | 'Matured' | 'Stopped';
  dailyIncome: number;
  finalReturn?: number;
  daysActive?: number;
  earnedIncome?: number;
};

const CountdownTimer = ({ endDate }: { endDate: Date }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const distance = endDate.getTime() - now.getTime();

            if (distance < 0) {
                setTimeLeft("Matured");
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

            setTimeLeft(`${days}d ${hours}h ${minutes}m`);
        };
        
        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 1000 * 60); // update every minute

        return () => clearInterval(interval);
    }, [endDate]);

    return <span className="font-mono">{timeLeft}</span>;
};


export default function MyPlansPage() {
  const { user, loading: userLoading } = useUser();
  const { t } = useSettings();
  const { data: investments, loading: investmentsLoading } =
    useCollection<Investment>(
      user ? `users/${user.uid}/investments` : null
    );

  const firestore = useFirestore();
  const { toast } = useToast();

  const handleClaimReturn = async (investment: Investment) => {
     if (!user) return;

     try {
       await runTransaction(firestore, async (transaction) => {
         const userRef = doc(firestore, 'users', user.uid);
         const invRef = doc(firestore, 'users', user.uid, 'investments', investment.id);
         const historyRef = doc(collection(firestore, `users/${user.uid}/walletHistory`));
         
         const userDoc = await transaction.get(userRef);
         const invDoc = await transaction.get(invRef);

         if (!userDoc.exists() || !invDoc.exists()) throw new Error("Document not found.");
         
         const invData = invDoc.data();
         if (invData.status === 'Matured') {
            return;
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
         
         // 1. Update Investment Status
         transaction.update(invRef, { status: 'Matured' });

         // 2. Update User Balances
         newWalletBalance += amountToClaim;
         newTotalInvestment -= investment.investedAmount;

         transaction.update(userRef, {
           walletBalance: newWalletBalance,
           totalInvestment: newTotalInvestment < 0 ? 0 : newTotalInvestment,
           totalIncome: (userDoc.data().totalIncome || 0) + (amountToClaim - investment.investedAmount)
         });

         // 3. Log to Ledger (Wallet History)
         transaction.set(historyRef, {
            amount: amountToClaim,
            type: 'credit',
            category: 'Settlement',
            description: `Full settlement of ${investment.planName}`,
            createdAt: serverTimestamp()
         });
       });

       toast({
         title: 'Investment Claimed!',
         description: `Your return has been added to your wallet.`,
       });

     } catch (error: any) {
       console.error('Error processing claim:', error);
       toast({ title: "Claim Failed", description: error.message, variant: "destructive"});
     }
  };


  const loading = userLoading || investmentsLoading;

  const activeInvestments = investments?.filter((inv) => inv.status === 'Active' || inv.status === 'Stopped') || [];
  const maturedInvestments = investments?.filter((inv) => inv.status === 'Matured') || [];

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground transition-colors duration-300">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 px-4 backdrop-blur-sm sm:px-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="hover:bg-accent">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Activity className="text-primary h-5 w-5" /> Investment Vault
        </h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6">
         <Tabs defaultValue="active">
            <TabsList className="grid w-full grid-cols-2 bg-muted h-14 rounded-2xl p-1.5 border border-border">
                <TabsTrigger value="active" className="rounded-xl font-bold uppercase tracking-widest text-[9px] data-[state=active]:bg-background">Active & Live</TabsTrigger>
                <TabsTrigger value="matured" className="rounded-xl font-bold uppercase tracking-widest text-[9px] data-[state=active]:bg-background">Settled Logs</TabsTrigger>
            </TabsList>
            
            <TabsContent value="active" className="mt-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Timer className="animate-spin text-primary" />
                        <p className="text-[10px] font-bold uppercase tracking-[4px] text-muted-foreground">Syncing Assets</p>
                    </div>
                ) : activeInvestments.length > 0 ? (
                    <div className="grid gap-6">
                        {activeInvestments.map(inv => <InvestmentCard key={inv.id} investment={inv} onClaim={handleClaimReturn} />)}
                    </div>
                ) : (
                    <Card className="bg-muted/30 border-border border-dashed rounded-3xl p-10 text-center">
                        <CardContent className="space-y-4">
                            <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">No active wealth-building plans.</p>
                            <Button asChild variant="outline" className="border-border h-10 rounded-xl">
                                <Link href="/plans">Browse Market</Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </TabsContent>
            
            <TabsContent value="matured" className="mt-6">
                 {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Timer className="animate-spin text-primary" />
                        <p className="text-[10px] font-bold uppercase tracking-[4px] text-muted-foreground">Syncing Assets</p>
                    </div>
                ) : maturedInvestments.length > 0 ? (
                    <div className="grid gap-6">
                        {maturedInvestments.map(inv => <InvestmentCard key={inv.id} investment={inv} onClaim={handleClaimReturn} />)}
                    </div>
                ) : (
                    <Card className="bg-muted/30 border-border border-dashed rounded-3xl p-10 text-center">
                        <CardContent className="space-y-4">
                            <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">No investment history yet.</p>
                        </CardContent>
                    </Card>
                )}
            </TabsContent>
         </Tabs>
      </main>

      <nav className="sticky bottom-0 z-30 border-t border-border/20 bg-background/95 backdrop-blur-sm h-16 flex items-center justify-around px-4">
          <BottomNavItem icon={Home} label={t.nav.home} href="/dashboard" />
          <BottomNavItem icon={Briefcase} label={t.nav.plans} href="/plans" active/>
          <BottomNavItem icon={Trophy} label={t.nav.leaders} href="/leaderboard" />
          <BottomNavItem icon={HandCoins} label={t.nav.loans} href="/my-loans" />
          <BottomNavItem icon={User} label={t.nav.profile} href="/profile" />
      </nav>
    </div>
  );
}


function InvestmentCard({ investment, onClaim }: { investment: Investment, onClaim: (investment: Investment) => void }) {
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
  const progress = totalDuration > 0 ? Math.min((elapsedDuration / totalDuration) * 100, 100) : 100;
  
  const wasStoppedEarly = investment.status === 'Stopped';

  useEffect(() => {
    if (investment.status === 'Stopped' || (investment.status === 'Active' && now >= maturityDate)) {
      setIsClaimable(true);
    }
  }, [now, maturityDate, investment.status]);


  const handleClaimClick = async () => {
    setIsClaiming(true);
    await onClaim(investment);
  }

  const getBadge = () => {
    if (investment.status === 'Matured') return <Badge className="bg-accent/20 text-accent border-accent/30 text-[10px] uppercase font-black">Settled</Badge>;
    if (wasStoppedEarly) return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px] uppercase font-black">Terminated</Badge>;
    if (isClaimable) return <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] uppercase font-black">Ready</Badge>;
    return <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] uppercase font-black">Active Node</Badge>;
  }
  
  const totalProfit = wasStoppedEarly
    ? investment.earnedIncome || 0
    : investment.returnAmount - investment.investedAmount;

  const finalReturn = wasStoppedEarly 
    ? investment.finalReturn || 0
    : investment.returnAmount || 0;

  return (
    <Card className="bg-card border-border shadow-2xl rounded-3xl overflow-hidden group relative">
      <CardHeader className="pb-4 border-b border-border/5">
        <div className="flex justify-between items-center">
            <div className="space-y-1">
                <CardTitle className="text-lg font-bold tracking-tight">{investment.planName}</CardTitle>
                <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                    <Calendar size={12} /> {startDate.toLocaleDateString()}
                </div>
            </div>
            {getBadge()}
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        
        <div className="grid grid-cols-2 gap-3">
             <div className="bg-muted/50 p-4 rounded-2xl border border-border">
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-black mb-1">Principal</p>
                <p className="text-base font-black tracking-tighter">₹{(investment.investedAmount || 0).toLocaleString()}</p>
            </div>
             <div className="bg-muted/50 p-4 rounded-2xl border border-border text-right">
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-black mb-1">Daily Flow</p>
                <p className="text-base font-black text-accent tracking-tighter">+₹{(investment.dailyIncome || 0).toFixed(2)}</p>
            </div>
            <div className="bg-muted/50 p-4 rounded-2xl border border-border">
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-black mb-1">Accrued Profit</p>
                <p className="text-base font-black text-accent tracking-tighter">₹{totalProfit.toFixed(2)}</p>
            </div>
             <div className="bg-muted/50 p-4 rounded-2xl border border-border text-right">
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-black mb-1">Settlement</p>
                <p className="text-base font-black tracking-tighter">₹{finalReturn.toFixed(2)}</p>
            </div>
        </div>

        {wasStoppedEarly && (
            <div className="p-4 bg-destructive/5 rounded-2xl border border-destructive/10 text-center">
                <p className="text-[10px] text-destructive font-black uppercase tracking-widest">
                    Node Terminated Early (Day {investment.daysActive})
                </p>
            </div>
        )}

        {investment.status === 'Active' && (
            isClaimable ? (
                 <Button onClick={handleClaimClick} disabled={isClaiming} className="w-full h-14 rounded-2xl font-black bg-primary text-primary-foreground shadow-xl hover:scale-[1.02] transition-all">
                    {isClaiming ? 'Settling Protocol...' : 'Authorize Final Settlement'}
                </Button>
            ) : (
                <div className="space-y-3 pt-2 px-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-[3px] text-muted-foreground">
                        <span>Cycle Pulse</span>
                        <CountdownTimer endDate={maturityDate} />
                    </div>
                    <Progress value={progress} className="h-1.5" />
                </div>
            )
        )}
        
        {investment.status === 'Stopped' && (
             <Button onClick={handleClaimClick} disabled={isClaiming} className="w-full h-14 rounded-2xl font-black bg-destructive text-destructive-foreground shadow-xl hover:scale-[1.02] transition-all">
                {isClaiming ? 'Settling Assets...' : 'Collect Partial Assets'}
            </Button>
        )}

        {investment.status === 'Matured' && (
             <div className="flex items-center justify-center gap-2 py-4 bg-accent/5 rounded-2xl border border-accent/10">
                <CheckCircle2 size={20} className="text-accent" />
                <span className="text-[10px] font-black uppercase tracking-[3px] text-accent">Node Fully Settled</span>
             </div>
        )}
      </CardContent>
    </Card>
  );
}


function BottomNavItem({ icon: Icon, label, href, active = false }: { icon: React.ElementType, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={cn(
        "flex flex-col items-center justify-center gap-1 transition-all h-full relative",
        active ? 'text-primary scale-110' : 'text-muted-foreground hover:text-foreground'
    )}>
      <Icon className={cn("h-5 w-5")} />
      <span className="text-[9px] font-black uppercase tracking-tight">{label}</span>
      {active && <div className="absolute -bottom-1 h-1 w-8 bg-primary rounded-full blur-[2px]" />}
    </Link>
  );
}
