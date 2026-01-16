
'use client';
import {
  ChevronLeft,
  Home,
  User,
  Briefcase,
  HandCoins,
  Users as UsersIcon,
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


type Investment = {
  id: string;
  planName: string;
  investedAmount: number;
  returnAmount: number;
  startDate: Timestamp;
  maturityDate: Timestamp;
  status: 'Active' | 'Matured' | 'Stopped';
  finalReturn?: number;
  daysActive?: number;
  earnedIncome?: number;
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
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 px-4 backdrop-blur-sm sm:px-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">My Investments</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
         <Tabs defaultValue="active">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="active">Active & Claimable</TabsTrigger>
                <TabsTrigger value="matured">History</TabsTrigger>
            </TabsList>
            <TabsContent value="active">
                {loading ? <p>Loading...</p> : 
                    activeInvestments.length > 0 ? (
                        <div className="space-y-4 mt-4">
                            {activeInvestments.map(inv => <InvestmentCard key={inv.id} investment={inv} onClaim={handleClaimReturn} />)}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground mt-4">No active or claimable investments.</p>
                    )
                }
            </TabsContent>
            <TabsContent value="matured">
                 {loading ? <p>Loading...</p> : 
                    maturedInvestments.length > 0 ? (
                        <div className="space-y-4 mt-4">
                            {maturedInvestments.map(inv => <InvestmentCard key={inv.id} investment={inv} onClaim={handleClaimReturn} />)}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground mt-4">No matured investments.</p>
                    )
                }
            </TabsContent>
         </Tabs>
      </main>

      <nav className="sticky bottom-0 z-10 border-t border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={UsersIcon} label="Team" href="/team" />
          <BottomNavItem icon={HandCoins} label="My Loans" href="/my-loans" />
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
  const progress = Math.min((elapsedDuration / totalDuration) * 100, 100);

  useEffect(() => {
    if (investment.status === 'Stopped' || (investment.status === 'Active' && now >= maturityDate)) {
      setIsClaimable(true);
    }
  }, [now, maturityDate, investment.status]);


  const handleClaimClick = async () => {
    setIsClaiming(true);
    await onClaim(investment);
    setIsClaiming(false);
  }

  const getBadge = () => {
    if (investment.status === 'Matured') return <Badge variant="outline">Matured</Badge>;
    if (investment.status === 'Stopped') return <Badge variant="destructive">Stopped</Badge>;
    if (isClaimable) return <Badge>Matured</Badge>;
    return <Badge>Active</Badge>;
  }
  
  const wasStoppedEarly = investment.daysActive !== undefined && investment.earnedIncome !== undefined;

  return (
    <Card className="bg-secondary/30">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{investment.planName}</span>
          {getBadge()}
        </CardTitle>
        <CardDescription>Invested on: {startDate.toLocaleDateString()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <p className="text-sm text-muted-foreground">Invested Amount</p>
          <p className="font-semibold">₹{(investment.investedAmount || 0).toFixed(2)}</p>
        </div>

        {wasStoppedEarly ? (
          <>
            <div className="flex justify-between text-sm">
                <p className="text-muted-foreground">Active Duration</p>
                <p className="font-semibold">{investment.daysActive} days</p>
            </div>
            <div className="flex justify-between text-sm">
                <p className="text-muted-foreground">Interest Earned</p>
                <p className="font-semibold text-green-400">₹{(investment.earnedIncome || 0).toFixed(2)}</p>
            </div>
             <div className="flex justify-between">
              <p className="text-sm text-muted-foreground">{investment.status === 'Matured' ? 'Actual Return Received' : 'Final Return (Claimable)'}</p>
              <p className="font-semibold text-green-400">
                ₹{(investment.finalReturn || 0).toFixed(2)}
              </p>
            </div>
          </>
        ) : (
           <div className="flex justify-between">
            <p className="text-sm text-muted-foreground">Maturity Return</p>
            <p className="font-semibold text-green-400">
              ₹{(investment.returnAmount || 0).toFixed(2)}
            </p>
          </div>
        )}

        {investment.status === 'Active' && (
            isClaimable ? (
                 <Button onClick={handleClaimClick} disabled={isClaiming} className="w-full">
                    {isClaiming ? 'Claiming...' : 'Claim Return'}
                </Button>
            ) : (
                <div className="space-y-1">
                    <Progress value={progress} />
                    <p className="text-xs text-muted-foreground">
                        Matures on: {maturityDate.toLocaleDateString()}
                    </p>
                </div>
            )
        )}
        {investment.status === 'Stopped' && (
             <Button onClick={handleClaimClick} disabled={isClaiming} className="w-full">
                {isClaiming ? 'Claiming...' : 'Claim Premature Return'}
            </Button>
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
      className={`flex flex-col items-center justify-center gap-1 ${
        active ? 'text-primary' : 'text-muted-foreground'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}
