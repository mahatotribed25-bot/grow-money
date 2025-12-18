'use client';

import {
  ChevronLeft,
  User,
  Mail,
  CreditCard,
  LogOut,
  Briefcase,
  Home,
  Wallet,
  ArrowRight,
  ArrowLeft,
  Download,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth, useCollection } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { Timestamp } from 'firebase/firestore';


type Deposit = {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
};

type Withdrawal = {
  id:string;
  amount: number;
  upiId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
}

const formatDate = (timestamp: Timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleDateString();
};

export default function ProfilePage() {
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const { data: deposits, loading: depositsLoading } = useCollection<Deposit>(
    user ? `deposits` : null
  );
  const { data: withdrawals, loading: withdrawalsLoading } = useCollection<Withdrawal>(
    user ? `withdrawals` : null
  );

  // Filtering by user ID on the client
  const userDeposits = deposits?.filter(d => d.userId === user?.uid) || [];
  const userWithdrawals = withdrawals?.filter(w => w.userId === user?.uid) || [];


  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">Profile</h1>
        <div className="w-9"></div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>My Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow icon={User} label="Name" value={user?.displayName || 'N/A'} />
            <Separator />
            <InfoRow icon={Mail} label="Email" value={user?.email || 'N/A'} />
            <Separator />
            <InfoRow icon={CreditCard} label="Saved UPI ID" value="Not set" />
          </CardContent>
        </Card>

        <Tabs defaultValue="recharge" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recharge">Recharge History</TabsTrigger>
            <TabsTrigger value="withdrawal">Withdrawal History</TabsTrigger>
          </TabsList>
          <TabsContent value="recharge">
            <HistoryList
              items={userDeposits}
              loading={depositsLoading}
              type="recharge"
            />
          </TabsContent>
          <TabsContent value="withdrawal">
            <HistoryList
              items={userWithdrawals}
              loading={withdrawalsLoading}
              type="withdrawal"
            />
          </TabsContent>
        </Tabs>


        <Button onClick={handleLogout} className="mt-6 w-full" variant="destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </main>
      <nav className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-md grid-cols-4 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={Wallet} label="Team" href="#" />
          <BottomNavItem icon={User} label="Profile" href="/profile" active />
        </div>
      </nav>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-sm text-muted-foreground">{value}</span>
    </div>
  );
}

function BottomNavItem({ icon: Icon, label, href, active = false }: { icon: React.ElementType, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center justify-center gap-1 ${active ? 'text-primary' : 'text-muted-foreground'}`}>
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}

function HistoryList({ items, loading, type }: { items: (Deposit[] | Withdrawal[]), loading: boolean, type: 'recharge' | 'withdrawal' }) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <p>Loading history...</p>
        </CardContent>
      </Card>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <p>No {type} history found.</p>
        </CardContent>
      </Card>
    )
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };


  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.id} className="shadow-soft">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
               {type === 'recharge' ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                  <Download className="h-5 w-5" />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                  <Upload className="h-5 w-5" />
                </div>
              )}
              <div>
                <p className="font-semibold capitalize">{type} Request</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(item.createdAt)}
                </p>
              </div>
            </div>
            <div className="text-right">
               <p className="font-bold text-lg">₹{item.amount.toFixed(2)}</p>
               <Badge variant={getStatusVariant(item.status)} className="capitalize">{item.status}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}