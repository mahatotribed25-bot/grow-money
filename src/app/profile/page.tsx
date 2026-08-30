'use client';

import {
  ChevronLeft,
  User,
  Wallet,
  LogOut,
  Home,
  Briefcase,
  Copy,
  Gift,
  Users2,
  HandCoins,
  Gem,
  Trophy,
  Timer,
  CheckCircle2,
  Pencil
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth, useDoc, useFirestore } from '@/firebase';
import { signOut, updateProfile } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollection } from '@/firebase';
import { Timestamp, doc, updateDoc, collection, query, where, getDocs, runTransaction, serverTimestamp, orderBy } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import TrustScoreMeter from '@/components/TrustScoreMeter';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type Transaction = {
  id: string;
  amount: number;
  status: 'approved' | 'rejected' | 'pending';
  createdAt: Timestamp;
  finalAmount?: number;
};

type WalletHistoryEntry = {
    id: string;
    amount: number;
    type: 'credit' | 'debit';
    category: string;
    description: string;
    createdAt: Timestamp;
}

type UpiRequest = {
  id: string;
  status: 'pending' | 'awaiting_confirmation' | 'approved' | 'rejected';
  confirmationAmount?: number;
  upiId: string;
  upiProvider: string;
};

type GroupInvestment = {
    id: string;
    planName: string;
    investedAmount: number;
    amountReceived: number;
    createdAt: Timestamp;
}

type UserData = {
  name?: string;
  photoURL?: string;
  referralCode?: string;
  upiId?: string;
  upiProvider?: 'PhonePe' | 'Google Pay' | 'Paytm';
  upiStatus?: 'Unverified' | 'Pending' | 'Verified' | 'Rejected';
  vipLevel?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  trustScore?: number;
};

function useUserGroupInvestments(userId?: string) {
    const [investments, setInvestments] = useState<GroupInvestment[]>([]);
    const [loading, setLoading] = useState(true);
    const firestore = useFirestore();

    useEffect(() => {
        if (!userId) { setLoading(false); return; }
        const fetchInvestments = async () => {
            setLoading(true);
            const allInvestments: GroupInvestment[] = [];
            const plansSnapshot = await getDocs(collection(firestore, 'groupLoanPlans'));
            for (const planDoc of plansSnapshot.docs) {
                const iq = query(collection(firestore, `groupLoanPlans/${planDoc.id}/investments`), where('investorId', '==', userId));
                const investmentSnapshot = await getDocs(iq);
                investmentSnapshot.forEach(invDoc => {
                    allInvestments.push({ id: invDoc.id, ...invDoc.data() } as GroupInvestment);
                });
            }
            setInvestments(allInvestments);
            setLoading(false);
        };
        fetchInvestments();
    }, [userId, firestore]);

    return { data: investments, loading };
}

export default function ProfilePage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const { data: userData, refetch: refetchUser } = useDoc<UserData>(user ? `users/${user.uid}` : null);
  const { data: referrals } = useCollection<any>(user ? 'users' : null, { where: ['referredBy', '==', user?.uid] });
  const { data: deposits } = useCollection<Transaction>(user ? `deposits` : null, { where: ['userId', '==', user?.uid]});
  const { data: withdrawals } = useCollection<Transaction>(user ? `withdrawals` : null, { where: ['userId', '==', user?.uid]});
  const { data: walletHistory } = useCollection<WalletHistoryEntry>(user ? `users/${user.uid}/walletHistory` : null, undefined, orderBy('createdAt', 'desc'));
  const { data: upiRequests } = useCollection<UpiRequest>(user ? `upiRequests` : null, { where: ['userId', '==', user?.uid] });
  const { data: groupInvestments } = useUserGroupInvestments(user?.uid);

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [upiProvider, setUpiProvider] = useState<'PhonePe' | 'Google Pay' | 'Paytm' | ''>('');

  useEffect(() => {
    if (userData) {
      setEditName(userData.name || '');
      setUpiId(userData.upiId || '');
      setUpiProvider(userData.upiProvider || '');
    }
  }, [userData]);

  const handleLogout = async () => { if (auth) { await signOut(auth); router.push('/login'); } };
  const handleCopyCode = () => { if (userData?.referralCode) { navigator.clipboard.writeText(userData.referralCode); toast({ title: "Copied!" }); } };
  const handleUpdateName = async () => {
    if (!user || !auth.currentUser) return;
    await updateProfile(auth.currentUser, { displayName: editName });
    await updateDoc(doc(firestore, 'users', user.uid), { name: editName });
    toast({ title: "Name Updated" });
    setIsEditProfileOpen(false);
    if (refetchUser) refetchUser();
  };

  const handleSubmitUpi = () => {
      if (!user || !upiId || !upiProvider) return;
      runTransaction(firestore, async (transaction) => {
          transaction.set(doc(collection(firestore, 'upiRequests')), { userId: user.uid, userName: userData?.name || 'Investor', upiId, upiProvider, status: 'pending', createdAt: serverTimestamp() });
          transaction.update(doc(firestore, 'users', user.uid), { upiStatus: 'Pending' });
      }).then(() => toast({ title: 'UPI Submitted' }));
  }
  
  const awaitingConfirmationRequest = upiRequests?.find(req => req.status === 'awaiting_confirmation');

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#030408] text-foreground relative overflow-hidden">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.05] bg-black/40 px-4 backdrop-blur-xl sm:px-6">
        <Link href="/dashboard"><Button variant="ghost" size="icon"><ChevronLeft /></Button></Link>
        <h1 className="text-lg font-bold">Profile</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl mx-auto w-full">
        <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Avatar className="h-20 w-20 border-2 border-primary/20"><AvatarImage src={userData?.photoURL} /><AvatarFallback>{userData?.name?.charAt(0)}</AvatarFallback></Avatar>
              <div className="text-center sm:text-left">
                <CardTitle className="text-xl font-bold flex items-center gap-2">{userData?.name || 'Investor'} <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditProfileOpen(true)}><Pencil size={12} /></Button></CardTitle>
                <CardDescription>{user?.email}</CardDescription>
                <Badge className="mt-2 bg-primary/10 border-primary/20 text-primary uppercase text-[10px]">{userData?.vipLevel || 'Bronze'}</Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        <TrustScoreMeter score={userData?.trustScore || 500} />

        <div className="grid gap-4 sm:grid-cols-2">
            <Card className="bg-white/[0.03] border-white/[0.08]"><CardHeader><CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest text-white/30"><Gift size={14} /> Referral ID</CardTitle></CardHeader><CardContent className="flex justify-between items-center bg-black/20 p-4 rounded-xl mx-4 mb-4"><span className="font-mono font-bold">{userData?.referralCode || '------'}</span><Button variant="ghost" size="icon" onClick={handleCopyCode}><Copy size={16} /></Button></CardContent></Card>
            <Card className="bg-white/[0.03] border-white/[0.08]"><CardHeader><CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest text-white/30"><Users2 size={14} /> My Network</CardTitle></CardHeader><CardContent className="p-4"><p className="text-2xl font-black">{referrals?.length || 0}</p><p className="text-[10px] text-white/20 uppercase font-bold tracking-widest">Active Members</p></CardContent></Card>
        </div>

        {awaitingConfirmationRequest && <AmountVerificationCard request={awaitingConfirmationRequest} />}

        <Tabs defaultValue="history">
            <TabsList className="grid w-full grid-cols-4 bg-white/5 h-12 rounded-2xl p-1"><TabsTrigger value="history">History</TabsTrigger><TabsTrigger value="deposits">Deposit</TabsTrigger><TabsTrigger value="withdrawals">Payout</TabsTrigger><TabsTrigger value="groups">Groups</TabsTrigger></TabsList>
            <div className="mt-4">
                <TabsContent value="history"><HistoryTable headers={['Detail', 'Amount']} items={walletHistory} renderRow={(e) => <TableRow key={e.id} className="border-white/[0.05]"><TableCell className="pl-6 py-4"><p className="text-xs font-bold text-white/80">{e.category}</p><p className="text-[9px] text-white/20">{e.description}</p></TableCell><TableCell className={cn("text-right pr-6 font-bold", e.type === 'credit' ? 'text-green-400' : 'text-red-400')}>{e.type === 'credit' ? '+' : '-'}₹{e.amount.toFixed(2)}</TableCell></TableRow>} /></TabsContent>
                <TabsContent value="deposits"><TransactionTable transactions={deposits} type="deposit" /></TabsContent>
                <TabsContent value="withdrawals"><TransactionTable transactions={withdrawals} type="withdrawal" /></TabsContent>
                <TabsContent value="groups"><GroupInvestmentTable investments={groupInvestments} /></TabsContent>
            </div>
        </Tabs>

        <Button onClick={handleLogout} className="w-full h-12 bg-white/5 border border-white/10 hover:bg-destructive text-white rounded-xl">Sign Out</Button>

        <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
            <DialogContent className="bg-[#030408] border-white/10 text-white">
                <DialogHeader><DialogTitle>Update Name</DialogTitle></DialogHeader>
                <div className="py-4 space-y-4"><div className="space-y-2"><Label>Full Name</Label><Input value={editName} onChange={e => setEditName(e.target.value)} className="bg-white/5 border-white/10" /></div></div>
                <DialogFooter><Button onClick={handleUpdateName} className="w-full">Confirm Update</Button></DialogFooter>
            </DialogContent>
        </Dialog>
      </main>

      <nav className="sticky bottom-0 z-20 border-t border-white/[0.05] bg-black/40 backdrop-blur-xl h-16 flex items-center justify-around px-4">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={Trophy} label="Leaders" href="/leaderboard" />
          <BottomNavItem icon={HandCoins} label="Loans" href="/my-loans" />
          <BottomNavItem icon={User} label="Profile" active />
      </nav>
    </div>
  );
}

function HistoryTable({ headers, items, renderRow }: { headers: string[], items: any[] | null | undefined, renderRow: (item: any) => React.ReactNode }) {
  return (
    <Card className="bg-white/[0.03] border-white/[0.08] rounded-2xl overflow-hidden"><ScrollArea className="h-64"><Table><TableHeader className="bg-white/[0.02]"><TableRow className="border-white/10">{headers.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{items && items.length > 0 ? items.map(renderRow) : <TableRow><TableCell colSpan={headers.length} className="text-center py-10 opacity-20 italic">No history</TableCell></TableRow>}</TableBody></Table></ScrollArea></Card>
  )
}

function TransactionTable({ transactions, type }: { transactions: any[] | undefined | null, type: string }) {
    return <Card className="bg-white/[0.03] border-white/[0.08] rounded-2xl overflow-hidden"><ScrollArea className="h-64"><Table><TableHeader className="bg-white/[0.02]"><TableRow className="border-white/10"><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{transactions && transactions.length > 0 ? transactions.map(tx => <TableRow key={tx.id} className="border-white/[0.05]"><TableCell className="font-bold">₹{(tx.finalAmount ?? tx.amount).toFixed(2)}</TableCell><TableCell><Badge variant="outline">{tx.status}</Badge></TableCell></TableRow>) : <TableRow><TableCell colSpan={2} className="text-center py-10 opacity-20 italic">No transactions</TableCell></TableRow>}</TableBody></Table></ScrollArea></Card>;
}

function GroupInvestmentTable({ investments }: { investments: GroupInvestment[] | undefined | null }) {
    return <Card className="bg-white/[0.03] border-white/[0.08] rounded-2xl overflow-hidden"><ScrollArea className="h-64"><Table><TableHeader className="bg-white/[0.02]"><TableRow className="border-white/10"><TableHead>Plan</TableHead><TableHead>Received</TableHead></TableRow></TableHeader><TableBody>{investments && investments.length > 0 ? investments.map(inv => <TableRow key={inv.id} className="border-white/[0.05]"><TableCell className="font-bold">{inv.planName}</TableCell><TableCell className="text-green-400 font-bold">₹{inv.amountReceived.toFixed(2)}</TableCell></TableRow>) : <TableRow><TableCell colSpan={2} className="text-center py-10 opacity-20 italic">No group plans</TableCell></TableRow>}</TableBody></Table></ScrollArea></Card>;
}

function AmountVerificationCard({ request }: { request: UpiRequest }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const handleVerify = async () => {
    if (parseFloat(amount) === request.confirmationAmount) {
      await updateDoc(doc(firestore, 'users', user!.uid), { upiStatus: 'Verified', upiId: request.upiId });
      await updateDoc(doc(firestore, 'upiRequests', request.id), { status: 'approved' });
      toast({ title: 'Verified!' });
    } else toast({ title: 'Wrong Amount', variant: 'destructive' });
  };
  return <Card className="border-yellow-500/30 bg-yellow-500/[0.03] p-4"><CardTitle className="text-yellow-400 text-sm mb-2 flex items-center gap-2"><Timer size={14} /> Enter Verified Amount</CardTitle><Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="bg-white/5 border-white/10 mb-2" /><Button className="w-full bg-yellow-500 text-black font-bold" onClick={handleVerify}>Verify</Button></Card>;
}

function BottomNavItem({ icon: Icon, label, href, active = false }: { icon: React.ElementType, label: string, href?: string, active?: boolean }) {
  return <Link href={href || '#'} className={cn("flex flex-col items-center gap-1", active ? 'text-primary' : 'text-white/40')}><Icon className="h-5 w-5" /><span className="text-[9px] font-bold">{label}</span></Link>;
}