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
import { doc, runTransaction } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';


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
         
         const userDoc = await transaction.get(userRef);
         const invDoc = await transaction.get(invRef);

         if (!userDoc.exists() || !invDoc.exists()) throw new Error("Document not found.");
         
         const invData = invDoc.data();
         if (invData.status === 'Matured') {
            toast({ title: "Already Claimed", description: "This investment has already been claimed.", variant: "destructive" });
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
         
         transaction.update(invRef, { status: 'Matured' });
         newWalletBalance += amountToClaim;
         newTotalInvestment -= investment.investedAmount;

         transaction.update(userRef, {
           walletBalance: newWalletBalance,
           totalInvestment: newTotalInvestment < 0 ? 0 : newTotalInvestment,
           totalIncome: (userDoc.data().totalIncome || 0) + (amountToClaim - investment.investedAmount)
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
    <div className="flex min-h-screen w-full flex-col bg-transparent text-foreground relative z-10">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.05] bg-black/40 px-4 backdrop-blur-xl sm:px-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white/70">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Investment Vault</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6">
         <Tabs defaultValue="active">
            <TabsList className="grid w-full grid-cols-2 bg-white/5 border-white/10 p-1 h-14 rounded-2xl">
                <TabsTrigger value="active" className="rounded-xl data-[state=active]:bg-white/10 h-full font-bold uppercase tracking-widest text-[10px]">Active & Live</TabsTrigger>
                <TabsTrigger value="matured" className="rounded-xl data-[state=active]:bg-white/10 h-full font-bold uppercase tracking-widest text-[10px]">Settled Logs</TabsTrigger>
            </TabsList>
            
            <TabsContent value="active" className="mt-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Timer className="animate-spin text-primary" />
                        <p className="text-[10px] font-bold uppercase tracking-[4px] text-white/20">Syncing Assets</p>
                    </div>
                ) : activeInvestments.length > 0 ? (
                    <div className="grid gap-6">
                        {activeInvestments.map(inv => <InvestmentCard key={inv.id} investment={inv} onClaim={handleClaimReturn} />)}
                    </div>
                ) : (
                    <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-3xl p-10 text-center border-dashed">
                        <CardContent className="space-y-4">
                            <p className="text-white/40 text-sm">No active wealth-building plans found.</p>
                            <Button asChild variant="outline" className="border-white/10 h-10 rounded-xl">
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
                        <p className="text-[10px] font-bold uppercase tracking-[4px] text-white/20">Syncing Assets</p>
                    </div>
                ) : maturedInvestments.length > 0 ? (
                    <div className="grid gap-6">
                        {maturedInvestments.map(inv => <InvestmentCard key={inv.id} investment={inv} onClaim={handleClaimReturn} />)}
                    </div>
                ) : (
                    <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-3xl p-10 text-center border-dashed">
                        <CardContent className="space-y-4">
                            <p className="text-white/40 text-sm">No investment history yet.</p>
                        </CardContent>
                    </Card>
                )}
            </TabsContent>
         </Tabs>
      </main>

      <nav className="sticky bottom-0 z-20 border-t border-white/[0.05] bg-black/40 backdrop-blur-xl">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs font-medium">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={Trophy} label="Leaders" href="/leaderboard" />
          <BottomNavItem icon={HandCoins} label="Loans" href="/my-loans" />
          <BottomNavItem icon={User} label="Profile" href="/profile" />
        </div>
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
    if (investment.status === 'Matured') return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] uppercase font-bold">Settled</Badge>;
    if (wasStoppedEarly) return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] uppercase font-bold">Terminated</Badge>;
    if (isClaimable) return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] uppercase font-bold">Mature</Badge>;
    return <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] uppercase font-bold">Growing</Badge>;
  }
  
  const totalProfit = wasStoppedEarly
    ? investment.earnedIncome || 0
    : investment.returnAmount - investment.investedAmount;

  const finalReturn = wasStoppedEarly 
    ? investment.finalReturn || 0
    : investment.returnAmount || 0;

  return (
    <Card className="shadow-2xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl rounded-3xl overflow-hidden group relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardHeader className="pb-4 border-b border-white/[0.05] bg-white/[0.01]">
        <div className="flex justify-between items-center">
            <div>
                <CardTitle className="text-white font-bold tracking-tight">{investment.planName}</CardTitle>
                <CardDescription className="text-white/30 text-[10px] uppercase tracking-widest font-bold">Started: {startDate.toLocaleDateString()}</CardDescription>
            </div>
            {getBadge()}
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        
        <div className="grid grid-cols-2 gap-3">
             <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold mb-1">Principal</p>
                <p className="text-sm font-bold text-white/90">₹{(investment.investedAmount || 0).toLocaleString()}</p>
            </div>
             <div className="bg-black/20 p-3 rounded-2xl border border-white/5 text-right">
                <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold mb-1">Daily ROI</p>
                <p className="text-sm font-bold text-green-400">+₹{(investment.dailyIncome || 0).toFixed(2)}</p>
            </div>
            <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold mb-1">Accrued Profit</p>
                <p className="text-sm font-bold text-green-400">₹{totalProfit.toFixed(2)}</p>
            </div>
             <div className="bg-black/20 p-3 rounded-2xl border border-white/5 text-right">
                <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold mb-1">Projected Return</p>
                <p className="text-sm font-bold text-white">₹{finalReturn.toFixed(2)}</p>
            </div>
        </div>

        {wasStoppedEarly && (
            <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20 text-center">
                <p className="text-[10px] text-red-200/60 leading-relaxed font-medium">
                    This plan was terminated manually after {investment.daysActive} active days.
                </p>
            </div>
        )}

        {investment.status === 'Active' && (
            isClaimable ? (
                 <Button onClick={handleClaimClick} disabled={isClaiming} className="w-full h-12 rounded-xl font-bold bg-white text-black hover:bg-primary hover:text-white shadow-xl shadow-white/5 transition-all">
                    {isClaiming ? 'Transferring funds...' : 'Claim Full Maturity Return'}
                </Button>
            ) : (
                <div className="space-y-3 pt-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-[3px] text-white/20 px-2">
                        <span>Cycle Status</span>
                        <CountdownTimer endDate={maturityDate} />
                    </div>
                    <Progress value={progress} className="h-1.5 bg-white/5" />
                </div>
            )
        )}
        
        {investment.status === 'Stopped' && (
             <Button onClick={handleClaimClick} disabled={isClaiming} className="w-full h-12 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 shadow-xl shadow-red-500/20 transition-all">
                {isClaiming ? 'Processing Settlement...' : 'Recover Partial Funds'}
            </Button>
        )}

        {investment.status === 'Matured' && (
             <div className="flex items-center justify-center gap-2 py-2 text-green-400/40">
                <CheckCircle2 size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Asset Successfully Liquidated</span>
             </div>
        )}
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
