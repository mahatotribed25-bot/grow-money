
'use client';
import {
  ChevronLeft,
  Home,
  User,
  Briefcase,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection } from '@/firebase';
import type { Timestamp } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

type Investment = {
  id: string;
  planName: string;
  investedAmount: number;
  returnAmount: number;
  startDate: Timestamp;
  maturityDate: Timestamp;
  status: 'Active' | 'Matured';
};

export default function MyPlansPage() {
  const { user, loading: userLoading } = useUser();
  const { data: investments, loading: investmentsLoading } =
    useCollection<Investment>(
      user ? `users/${user.uid}/investments` : null
    );

  const loading = userLoading || investmentsLoading;

  const activeInvestments = investments?.filter((inv) => inv.status === 'Active') || [];
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
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="matured">Matured</TabsTrigger>
            </TabsList>
            <TabsContent value="active">
                {loading ? <p>Loading...</p> : 
                    activeInvestments.length > 0 ? (
                        <div className="space-y-4 mt-4">
                            {activeInvestments.map(inv => <InvestmentCard key={inv.id} investment={inv}/>)}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground mt-4">No active investments.</p>
                    )
                }
            </TabsContent>
            <TabsContent value="matured">
                 {loading ? <p>Loading...</p> : 
                    maturedInvestments.length > 0 ? (
                        <div className="space-y-4 mt-4">
                            {maturedInvestments.map(inv => <InvestmentCard key={inv.id} investment={inv}/>)}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground mt-4">No matured investments.</p>
                    )
                }
            </TabsContent>
         </Tabs>
      </main>

      <nav className="sticky bottom-0 z-10 border-t border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-md grid-cols-3 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" active />
          <BottomNavItem icon={User} label="Profile" href="/profile" />
        </div>
      </nav>
    </div>
  );
}


function InvestmentCard({ investment }: { investment: Investment }) {
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
          <Badge variant={investment.status === 'Active' ? 'default': 'outline'}>
            {investment.status}
          </Badge>
        </CardTitle>
        <CardDescription>Invested on: {startDate.toLocaleDateString()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <p className="text-sm text-muted-foreground">Invested Amount</p>
          <p className="font-semibold">₹{(investment.investedAmount || 0).toFixed(2)}</p>
        </div>
        <div className="flex justify-between">
          <p className="text-sm text-muted-foreground">Maturity Return</p>
          <p className="font-semibold text-green-400">
            ₹{(investment.returnAmount || 0).toFixed(2)}
          </p>
        </div>
        {investment.status === 'Active' && (
             <div className="space-y-1">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground">
                    Matures on: {maturityDate.toLocaleDateString()}
                </p>
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
      className={`flex flex-col items-center justify-center gap-1 ${
        active ? 'text-primary' : 'text-muted-foreground'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}
