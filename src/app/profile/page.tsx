
'use client';

import {
  ChevronLeft,
  User,
  LogOut,
  Home,
  Briefcase,
  Copy,
  Gift,
  Users2,
  HandCoins,
  Trophy,
  Timer,
  Pencil,
  Eye,
  ReceiptText,
  ShieldCheck,
  TrendingDown,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth, useDoc, useFirestore } from '@/firebase';
import { signOut, updateProfile } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollection } from '@/firebase';
import { Timestamp, doc, updateDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
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
import { Separator } from '@/components/ui/separator';

type Transaction = {
  id: string;
  amount: number;
  status: 'approved' | 'rejected' | 'pending';
  createdAt: Timestamp;
  transactionId?: string;
  gstAmount?: number;
  finalAmount?: number;
  totalDelayBonus?: number;
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

  const [groupInvestments, setGroupInvestments] = useState<GroupInvestment[]>([]);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<{ tx: Transaction, type: 'deposit' | 'withdrawal' } | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchGroupInvestments = async () => {
        const allInvestments: GroupInvestment[] = [];
        const plansSnapshot = await getDocs(collection(firestore, 'groupLoanPlans'));
        for (const planDoc of plansSnapshot.docs) {
            const iq = query(collection(firestore, `groupLoanPlans/${planDoc.id}/investments`), where('investorId', '==', user.uid));
            const investmentSnapshot = await getDocs(iq);
            investmentSnapshot.forEach(invDoc => {
                allInvestments.push({ id: invDoc.id, ...invDoc.data() } as GroupInvestment);
            });
        }
        setGroupInvestments(allInvestments);
    };
    fetchGroupInvestments();
  }, [user, firestore]);

  useEffect(() => {
    if (userData) {
      setEditName(userData.name || '');
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
              <Avatar className="h-20 w-20 border-2 border-primary/20">
                <AvatarImage src={userData?.photoURL} />
                <AvatarFallback>{userData?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left">
                <CardTitle className="text-xl font-bold flex items-center justify-center sm:justify-start gap-2">
                  {userData?.name || 'Investor'} 
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditProfileOpen(true)}>
                    <Pencil size={12} />
                  </Button>
                </CardTitle>
                <CardDescription>{user?.email}</CardDescription>
                <Badge className="mt-2 bg-primary/10 border-primary/20 text-primary uppercase text-[10px]">{userData?.vipLevel || 'Bronze'}</Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        <TrustScoreMeter score={userData?.trustScore || 500} />

        <div className="grid gap-4 sm:grid-cols-2">
            <Card className="bg-white/[0.03] border-white/[0.08]">
                <CardHeader>
                    <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest text-white/30">
                        <Gift size={14} /> Referral ID
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-between items-center bg-black/20 p-4 rounded-xl mx-4 mb-4 border border-white/5">
                    <span className="font-mono font-bold text-primary">{userData?.referralCode || '------'}</span>
                    <Button variant="ghost" size="icon" onClick={handleCopyCode} className="hover:bg-white/10"><Copy size={16} /></Button>
                </CardContent>
            </Card>
            <Card className="bg-white/[0.03] border-white/[0.08]">
                <CardHeader>
                    <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest text-white/30">
                        <Users2 size={14} /> My Network
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <p className="text-2xl font-black">{referrals?.length || 0}</p>
                    <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest">Active Members</p>
                </CardContent>
            </Card>
        </div>

        {awaitingConfirmationRequest && <AmountVerificationCard request={awaitingConfirmationRequest} />}

        <Tabs defaultValue="history">
            <TabsList className="grid w-full grid-cols-4 bg-white/5 h-12 rounded-2xl p-1">
                <TabsTrigger value="history" className="rounded-xl font-bold uppercase text-[10px]">History</TabsTrigger>
                <TabsTrigger value="deposits" className="rounded-xl font-bold uppercase text-[10px]">Deposit</TabsTrigger>
                <TabsTrigger value="withdrawals" className="rounded-xl font-bold uppercase text-[10px]">Payout</TabsTrigger>
                <TabsTrigger value="groups" className="rounded-xl font-bold uppercase text-[10px]">Groups</TabsTrigger>
            </TabsList>
            <div className="mt-4">
                <TabsContent value="history">
                    <HistoryTable 
                        headers={['Detail', 'Amount']} 
                        items={walletHistory} 
                        renderRow={(e) => (
                            <TableRow key={e.id} className="border-white/[0.05] hover:bg-white/[0.01]">
                                <TableCell className="pl-6 py-4">
                                    <p className="text-xs font-bold text-white/80">{e.category}</p>
                                    <p className="text-[9px] text-white/20 uppercase font-black">{e.description}</p>
                                </TableCell>
                                <TableCell className={cn("text-right pr-6 font-bold", e.type === 'credit' ? 'text-green-400' : 'text-red-400')}>
                                    {e.type === 'credit' ? '+' : '-'}₹{e.amount.toFixed(2)}
                                </TableCell>
                            </TableRow>
                        )} 
                    />
                </TabsContent>
                <TabsContent value="deposits">
                    <TransactionTable transactions={deposits} type="deposit" onViewReceipt={(tx) => setSelectedReceipt({ tx, type: 'deposit' })} />
                </TabsContent>
                <TabsContent value="withdrawals">
                    <TransactionTable transactions={withdrawals} type="withdrawal" onViewReceipt={(tx) => setSelectedReceipt({ tx, type: 'withdrawal' })} />
                </TabsContent>
                <TabsContent value="groups">
                    <GroupInvestmentTable investments={groupInvestments} />
                </TabsContent>
            </div>
        </Tabs>

        <Button onClick={handleLogout} className="w-full h-12 bg-white/5 border border-white/10 hover:bg-destructive/20 hover:text-red-400 hover:border-red-500/20 text-white rounded-xl font-bold transition-all">
          <LogOut size={16} className="mr-2" /> Sign Out
        </Button>

        <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
            <DialogContent className="bg-[#030408]/95 backdrop-blur-2xl border-white/10 text-white rounded-[2.5rem]">
                <DialogHeader><DialogTitle>Update Identity</DialogTitle></DialogHeader>
                <div className="py-6 space-y-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-white/20 pl-1">Display Name</Label>
                        <Input value={editName} onChange={e => setEditName(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl focus:ring-primary" />
                    </div>
                </div>
                <DialogFooter><Button onClick={handleUpdateName} className="w-full h-12 rounded-xl font-bold bg-primary">Confirm Protocol</Button></DialogFooter>
            </DialogContent>
        </Dialog>

        {selectedReceipt && (
          <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
            <DialogContent className="bg-[#030408]/95 border-white/10 text-white p-0 overflow-hidden rounded-[2rem] max-w-sm">
              <header className="bg-primary p-6 text-center space-y-2">
                 <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-2 backdrop-blur-md">
                    <ReceiptText size={32} className="text-white" />
                 </div>
                 <h2 className="text-xl font-black tracking-tight">TRANSACTION RECEIPT</h2>
                 <p className="text-[10px] font-black text-white/50 uppercase tracking-[4px]">Grow Money Terminal</p>
              </header>
              <div className="p-8 space-y-6">
                 <div className="space-y-4">
                    <ReceiptRow label="Status" value={selectedReceipt.tx.status.toUpperCase()} highlight={selectedReceipt.tx.status === 'approved'} />
                    <ReceiptRow label="Request ID" value={selectedReceipt.tx.transactionId || selectedReceipt.tx.id.slice(-8).toUpperCase()} />
                    <ReceiptRow label="Execution Node" value={new Date(selectedReceipt.tx.createdAt.seconds * 1000).toLocaleString()} />
                    
                    <Separator className="bg-white/5" />
                    
                    <ReceiptRow label="Gross Amount" value={`₹${selectedReceipt.tx.amount.toFixed(2)}`} />
                    
                    {selectedReceipt.type === 'withdrawal' && (
                      <>
                        <ReceiptRow label="Tax (GST)" value={`- ₹${(selectedReceipt.tx.gstAmount || 0).toFixed(2)}`} isNegative />
                        {selectedReceipt.tx.totalDelayBonus ? (
                          <ReceiptRow label="Delay Reward" value={`+ ₹${selectedReceipt.tx.totalDelayBonus.toFixed(2)}`} isPositive />
                        ) : null}
                      </>
                    )}
                 </div>

                 <div className="bg-white/5 rounded-3xl p-5 border border-white/5 flex flex-col items-center gap-1">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Final Settlement</p>
                    <p className="text-3xl font-black text-white tracking-tighter">
                      ₹{(selectedReceipt.tx.finalAmount ?? selectedReceipt.tx.amount).toFixed(2)}
                    </p>
                 </div>

                 <div className="flex items-center justify-center gap-2 text-white/20">
                    <ShieldCheck size={14} className="text-green-500/50" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Blockchain Verified Asset</span>
                 </div>
              </div>
              <DialogFooter className="p-6 pt-0">
                 <DialogClose asChild><Button className="w-full h-12 rounded-xl font-black bg-white text-black">Close Archive</Button></DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
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
    <Card className="bg-white/[0.03] border-white/[0.08] rounded-2xl overflow-hidden">
        <ScrollArea className="h-80">
            <Table>
                <TableHeader className="bg-white/[0.02]">
                    <TableRow className="border-white/10">{headers.map(h => <TableHead key={h} className="text-[10px] font-black text-white/20 uppercase tracking-widest">{h}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                    {items && items.length > 0 ? items.map(renderRow) : <TableRow><TableCell colSpan={headers.length} className="text-center py-20 opacity-20 italic font-bold">No history records found.</TableCell></TableRow>}
                </TableBody>
            </Table>
        </ScrollArea>
    </Card>
  )
}

function TransactionTable({ transactions, type, onViewReceipt }: { transactions: Transaction[] | undefined | null, type: 'deposit' | 'withdrawal', onViewReceipt: (tx: Transaction) => void }) {
    return (
        <Card className="bg-white/[0.03] border-white/[0.08] rounded-2xl overflow-hidden">
            <ScrollArea className="h-80">
                <Table>
                    <TableHeader className="bg-white/[0.02]">
                        <TableRow className="border-white/10">
                            <TableHead className="text-[10px] font-black text-white/20 uppercase tracking-widest pl-6">Amount</TableHead>
                            <TableHead className="text-[10px] font-black text-white/20 uppercase tracking-widest text-center">Status</TableHead>
                            <TableHead className="text-[10px] font-black text-white/20 uppercase tracking-widest text-right pr-6">Receipt</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions && transactions.length > 0 ? transactions.map(tx => (
                            <TableRow key={tx.id} className="border-white/[0.05] hover:bg-white/[0.01]">
                                <TableCell className="pl-6 py-4">
                                    <p className="font-bold text-white">₹{(tx.finalAmount ?? tx.amount).toFixed(2)}</p>
                                    <p className="text-[9px] text-white/20 font-black uppercase tracking-tight">{new Date(tx.createdAt.seconds * 1000).toLocaleDateString()}</p>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline" className={cn(
                                      "text-[9px] uppercase font-black",
                                      tx.status === 'approved' ? "border-green-500/20 text-green-400 bg-green-500/10" :
                                      tx.status === 'rejected' ? "border-red-500/20 text-red-400 bg-red-500/10" :
                                      "border-white/10 text-white/30"
                                    )}>
                                      {tx.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <Button variant="ghost" size="icon" onClick={() => onViewReceipt(tx)} className="h-8 w-8 hover:bg-white/10 text-primary">
                                        <Eye size={16} />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )) : <TableRow><TableCell colSpan={3} className="text-center py-20 opacity-20 italic font-bold">No {type} transactions logged.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </ScrollArea>
        </Card>
    );
}

function GroupInvestmentTable({ investments }: { investments: GroupInvestment[] | undefined | null }) {
    return (
        <Card className="bg-white/[0.03] border-white/[0.08] rounded-2xl overflow-hidden">
            <ScrollArea className="h-80">
                <Table>
                    <TableHeader className="bg-white/[0.02]">
                        <TableRow className="border-white/10">
                          <TableHead className="text-[10px] font-black text-white/20 uppercase tracking-widest pl-6">Plan</TableHead>
                          <TableHead className="text-[10px] font-black text-white/20 uppercase tracking-widest text-right pr-6">Received</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {investments && investments.length > 0 ? investments.map(inv => (
                            <TableRow key={inv.id} className="border-white/[0.05] hover:bg-white/[0.01]">
                                <TableCell className="pl-6 py-4 font-bold text-white/80">{inv.planName}</TableCell>
                                <TableCell className="text-right pr-6 text-green-400 font-bold">₹{inv.amountReceived.toFixed(2)}</TableCell>
                            </TableRow>
                        )) : <TableRow><TableCell colSpan={2} className="text-center py-20 opacity-20 italic font-bold">No group investments active.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </ScrollArea>
        </Card>
    );
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
      toast({ title: 'Protocol Verified!' });
    } else {
        toast({ title: 'Verification Failed', description: "The amount entered does not match our records.", variant: 'destructive' });
    }
  };

  return (
    <Card className="border-primary/30 bg-primary/[0.03] p-6 rounded-3xl animate-pulse">
        <CardTitle className="text-primary text-sm font-black uppercase tracking-[3px] mb-4 flex items-center gap-2">
            <Timer size={14} /> Security Challenge
        </CardTitle>
        <p className="text-xs text-white/40 mb-4 leading-relaxed font-medium">Enter the verified micro-transaction amount sent to your UPI ID to authorize your account.</p>
        <div className="flex gap-2">
            <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="bg-white/5 border-white/10 h-12 rounded-xl text-lg font-bold" />
            <Button className="h-12 bg-primary px-8 rounded-xl font-bold" onClick={handleVerify}>Verify</Button>
        </div>
    </Card>
  );
}

function ReceiptRow({ label, value, highlight = false, isNegative = false, isPositive = false }: { label: string, value: string, highlight?: boolean, isNegative?: boolean, isPositive?: boolean }) {
    return (
        <div className="flex justify-between items-center text-xs">
            <span className="text-white/30 font-bold uppercase tracking-widest">{label}</span>
            <span className={cn(
                "font-black tracking-tight",
                highlight ? "text-primary" : "text-white/70",
                isNegative && "text-red-400",
                isPositive && "text-green-400"
            )}>
                {value}
            </span>
        </div>
    );
}

function BottomNavItem({ icon: Icon, label, href, active = false }: { icon: React.ElementType, label: string, href?: string, active?: boolean }) {
  return (
    <Link href={href || '#'} className={cn(
        "flex flex-col items-center gap-1 transition-all",
        active ? 'text-primary scale-110' : 'text-white/40 hover:text-white/60'
    )}>
        <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]")} />
        <span className="text-[9px] font-bold">{label}</span>
    </Link>
  );
}
