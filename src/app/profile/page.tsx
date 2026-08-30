'use client';

import {
  ChevronLeft,
  User,
  Mail,
  Wallet,
  LogOut,
  Home,
  Briefcase,
  Copy,
  Gift,
  Users2,
  HandCoins,
  Users as UsersIcon,
  Fingerprint,
  Phone,
  Handshake,
  ShieldCheck,
  Pencil,
  TicketPercent,
  Timer,
  Gem,
  Trophy,
  CreditCard as CreditCardIcon,
  CheckCircle2,
  History as HistoryIcon,
  TrendingUp,
  TrendingDown,
  Camera,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth, useDoc, useFirestore } from '@/firebase';
import { signOut, updateProfile } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollection } from '@/firebase';
import { Timestamp, doc, updateDoc, collection, query, where, getDocs, runTransaction, serverTimestamp, arrayUnion, orderBy } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import TrustScoreMeter from '@/components/TrustScoreMeter';
import { calculateTrustScore } from '@/lib/trust-score';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';

type Transaction = {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
  userId?: string;
  delayBonusActive?: boolean;
  delayBonusAmountPerDay?: number;
  delayBonusStartDate?: Timestamp;
  totalDelayBonus?: number;
  gstAmount?: number;
  finalAmount?: number;
  upiId?: string;
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
    planId: string;
    planName: string;
    investedAmount: number;
    amountReceived: number;
    createdAt: Timestamp;
    userId: string;
}

type GroupLoanPlan = {
    id: string;
    loanAmount: number;
    interest: number;
    totalRepayment: number;
    amountRepaid: number;
}

type Investment = {
  id: string;
  planName: string;
  investedAmount: number;
  returnAmount: number;
  startDate: Timestamp;
  status: 'Active' | 'Matured' | 'Stopped';
};

type Loan = {
  id: string;
  status: 'Active' | 'Due' | 'Completed' | 'Payment Pending';
  penalty?: number;
};

type Referral = {
  id: string;
  name: string;
  email: string;
  totalInvestment?: number;
  createdAt?: Timestamp;
  referralBonusPaid?: boolean;
};

type UserData = {
  name?: string;
  photoURL?: string;
  referralCode?: string;
  upiId?: string;
  upiProvider?: 'PhonePe' | 'Google Pay' | 'Paytm';
  upiStatus?: 'Unverified' | 'Pending' | 'Verified' | 'Rejected';
  panCard?: string;
  aadhaarNumber?: string;
  phoneNumber?: string;
  kycTermsAccepted?: boolean;
  kycStatus?: 'Not Submitted' | 'Pending' | 'Verified' | 'Rejected';
  kycRejectionReason?: string;
  vipLevel?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  trustScore?: number;
};

type AdminSettings = {
    kycGoogleFormUrl?: string;
    referralBonus?: number;
};

function useUserGroupInvestments(userId?: string) {
    const [investments, setInvestments] = useState<GroupInvestment[]>([]);
    const [loading, setLoading] = useState(true);
    const firestore = useFirestore();

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const fetchInvestments = async () => {
            setLoading(true);
            try {
                const allInvestments: GroupInvestment[] = [];
                const q = query(collection(firestore, 'groupLoanPlans'));
                const plansSnapshot = await getDocs(q);

                for (const planDoc of plansSnapshot.docs) {
                    const investmentsRef = collection(firestore, `groupLoanPlans/${planDoc.id}/investments`);
                    const iq = query(investmentsRef, where('investorId', '==', userId));
                    const investmentSnapshot = await getDocs(iq);

                    investmentSnapshot.forEach(invDoc => {
                        allInvestments.push({ id: invDoc.id, ...invDoc.data() } as GroupInvestment);
                    });
                }
                setInvestments(allInvestments);
            } catch (e) {
                console.error("Error fetching group investments:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchInvestments();
    }, [userId, firestore]);

    return { data: investments, loading };
}

function TrackStep({ label, active }: { label: string, active: boolean }) {
    return (
        <div className="flex flex-col items-center gap-1.5 w-full">
            <div className={cn(
                "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-500",
                active ? "bg-primary border-primary text-white scale-110 shadow-[0_0_10px_rgba(139,92,246,0.5)]" : "bg-[#030408] border-white/10 text-white/20"
            )}>
                {active ? <CheckCircle2 size={14} /> : <div className="h-1.5 w-1.5 rounded-full bg-current" />}
            </div>
            <span className={cn("text-[9px] font-black uppercase tracking-tighter", active ? "text-white" : "text-white/20")}>{label}</span>
        </div>
    )
}

function BottomNavItem({ icon: Icon, label, href, active = false }: { icon: React.ElementType, label: string, href?: string, active?: boolean }) {
  return (
    <Link href={href || '#'} className={cn(
        "flex flex-col items-center justify-center gap-1 transition-all h-full relative",
        active ? 'text-primary scale-110' : 'text-white/40 hover:text-white/60'
    )}>
      <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]")} />
      <span className="text-[10px] tracking-tight">{label}</span>
      {active && <div className="absolute -bottom-1 h-1 w-8 bg-primary rounded-full blur-[2px]" />}
    </Link>
  );
}

function HistoryTable({ headers, items, renderRow }: { headers: string[], items: any[] | null | undefined, renderRow: (item: any) => React.ReactNode }) {
  return (
    <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader className="bg-white/[0.02] sticky top-0 z-10">
              <TableRow className="border-white/10">
                {headers.map(h => (
                  <TableHead key={h} className={cn("text-white/30 text-[10px] uppercase font-bold tracking-widest", h === 'Detail' && "pl-6", h === 'Amount' && "text-right pr-6")}>
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items && items.length > 0 ? items.map(renderRow) : (
                <TableRow>
                  <TableCell colSpan={headers.length} className="text-center py-20 text-white/20 italic">No history found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function TransactionTable({ transactions, type }: { transactions: Transaction[] | undefined | null, type: 'deposit' | 'withdrawal' }) {
    const formatDate = (timestamp: Timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved': return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Success</Badge>;
            case 'rejected': return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Failed</Badge>;
            default: return <Badge variant="secondary" className="bg-white/5 text-white/40 border-white/10">Pending</Badge>;
        }
    };
    
    return (
        <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
            <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                    <Table>
                        <TableHeader className="bg-white/[0.02] sticky top-0 z-10">
                            <TableRow className="border-white/10">
                                <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest pl-6">Amount</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions && transactions.length > 0 ? (
                                transactions.map(tx => (
                                    <TableRow key={tx.id} className="border-white/[0.05] hover:bg-white/[0.02] transition-colors">
                                        <TableCell className="pl-6">
                                            <div className="font-bold text-white tracking-tight">
                                                ₹{(tx.finalAmount ?? tx.amount).toFixed(2)}
                                            </div>
                                            <div className="text-[10px] text-white/20 mt-0.5">{formatDate(tx.createdAt)}</div>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(tx.status)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center py-10 text-white/20 italic">No transactions found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

function GroupInvestmentTable({ investments }: { investments: GroupInvestment[] | undefined | null }) {
    return (
        <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
            <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                    <Table>
                        <TableHeader className="bg-white/[0.02] sticky top-0 z-10">
                            <TableRow className="border-white/10">
                                <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest pl-6">Plan</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Invested</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Received</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {investments && investments.length > 0 ? (
                                investments.map(inv => (
                                    <TableRow key={inv.id} className="border-white/[0.05] hover:bg-white/[0.02]">
                                        <TableCell className="pl-6">
                                            <div className='font-bold text-white'>{inv.planName}</div>
                                            <div className='text-[10px] text-white/20 mt-1 uppercase'>{new Date(inv.createdAt.seconds * 1000).toLocaleDateString()}</div>
                                        </TableCell>
                                        <TableCell className="text-white/80">₹{(inv.investedAmount || 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-green-400 font-bold">₹{(inv.amountReceived || 0).toFixed(2)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-10 text-white/20 italic">No group investments found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

function AmountVerificationCard({ request }: { request: UpiRequest }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');

  const handleVerifyAmount = async () => {
    if (!user) return;
    const userInputAmount = parseFloat(amount);
    
    if (isNaN(userInputAmount)) {
      toast({ title: 'Invalid Amount', variant: 'destructive' });
      return;
    }

    if (userInputAmount === request.confirmationAmount) {
      try {
        await runTransaction(firestore, async (transaction) => {
          const userRef = doc(firestore, 'users', user.uid);
          const requestRef = doc(firestore, 'upiRequests', request.id);
          transaction.update(userRef, { upiStatus: 'Verified', upiId: request.upiId, upiProvider: request.upiProvider });
          transaction.update(requestRef, { status: 'approved' });
        });
        toast({ title: 'UPI Verified!' });
      } catch (error) {
        toast({ title: 'Verification Failed', variant: 'destructive' });
      }
    } else {
      toast({ title: 'Incorrect Amount', variant: 'destructive' });
    }
  };

  return (
    <Card className="border-yellow-500/30 bg-yellow-500/[0.03] backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-yellow-400 flex items-center gap-2">
            <Timer className="animate-pulse" /> Final Verification
        </CardTitle>
        <CardDescription className="text-yellow-200/40">Enter the small amount sent to your UPI.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 1.07" className="bg-white/5 border-yellow-500/20 text-yellow-100" />
        <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold" onClick={handleVerifyAmount}>Verify & Complete</Button>
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const { data: userData, loading: userDataloading, refetch: refetchUser } = useDoc<UserData>(user ? `users/${user.uid}` : null);
  const { data: adminSettings } = useDoc<AdminSettings>(user ? 'settings/admin' : null);
  const { data: investments } = useCollection<Investment>(user ? `users/${user.uid}/investments` : null);
  const { data: loans } = useCollection<Loan>(user ? `users/${user.uid}/loans` : null);
  const { data: referrals } = useCollection<Referral>(user ? 'users' : null, { where: ['referredBy', '==', user?.uid] });
  const { data: deposits } = useCollection<Transaction>(user ? `deposits` : null, { where: ['userId', '==', user?.uid]});
  const { data: withdrawals } = useCollection<Transaction>(user ? `withdrawals` : null, { where: ['userId', '==', user?.uid]});
  const { data: walletHistory } = useCollection<WalletHistoryEntry>(user ? `users/${user.uid}/walletHistory` : null, undefined, orderBy('createdAt', 'desc'));
  const { data: upiRequests } = useCollection<UpiRequest>(user ? `upiRequests` : null, { where: ['userId', '==', user?.uid] });
  const { data: groupInvestments, loading: groupInvestmentsLoading } = useUserGroupInvestments(user?.uid);

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [panCard, setPanCard] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [kycTermsAccepted, setKycTermsAccepted] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [upiProvider, setUpiProvider] = useState<'PhonePe' | 'Google Pay' | 'Paytm' | ''>('');

  useEffect(() => {
    if (userData) {
      setEditName(userData.name || '');
      setPanCard(userData.panCard || '');
      setAadhaarNumber(userData.aadhaarNumber || '');
      setPhoneNumber(userData.phoneNumber || '');
      setUpiId(userData.upiId || '');
      setUpiProvider(userData.upiProvider || '');
    }
  }, [userData]);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };

  const handleCopyCode = () => {
    if (userData?.referralCode) {
      navigator.clipboard.writeText(userData.referralCode);
      toast({ title: "Copied!" });
    }
  };

  const handleUpdateName = async () => {
    if (!user || !auth.currentUser) return;
    setIsUpdatingProfile(true);
    try {
        await updateProfile(auth.currentUser, { displayName: editName });
        await updateDoc(doc(firestore, 'users', user.uid), { name: editName });
        toast({ title: "Name Updated" });
        setIsEditProfileOpen(false);
        if (refetchUser) refetchUser();
    } catch (e: any) {
        toast({ title: "Update Failed", variant: "destructive" });
    } finally {
        setIsUpdatingProfile(false);
    }
  };

  const handleSubmitUpi = () => {
      if (!user || !upiId || !upiProvider) return;
      const upiRequestData = { userId: user.uid, userName: userData?.name || 'Investor', upiId, upiProvider, status: 'pending' as const, createdAt: serverTimestamp() };
      runTransaction(firestore, async (transaction) => {
          transaction.set(doc(collection(firestore, 'upiRequests')), upiRequestData);
          transaction.update(doc(firestore, 'users', user.uid), { upiStatus: 'Pending' });
      }).then(() => toast({ title: 'UPI Submitted' }));
  }

  const handleSubmitKyc = () => {
    if (!user) return;
    const dataToUpdate = { panCard, aadhaarNumber, phoneNumber, kycTermsAccepted, kycStatus: 'Pending', kycSubmissionDate: serverTimestamp() };
    updateDoc(doc(firestore, 'users', user.uid), dataToUpdate).then(() => toast({ title: "KYC Submitted" }));
  }
  
  const awaitingConfirmationRequest = useMemo(() => upiRequests?.find(req => req.status === 'awaiting_confirmation'), [upiRequests]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#030408] text-foreground relative overflow-hidden">
      <div className="absolute top-[-10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] pointer-events-none animate-pulse" />
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.05] bg-black/40 px-4 backdrop-blur-xl sm:px-6">
        <Link href="/dashboard"><Button variant="ghost" size="icon"><ChevronLeft /></Button></Link>
        <h1 className="text-lg font-bold">Profile</h1>
        <div className="w-9"></div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl mx-auto w-full">
        <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Avatar className="h-20 w-20 border-2 border-primary/20">
                <AvatarImage src={userData?.photoURL} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-black">{userData?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  {userData?.name || 'Investor'} <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditProfileOpen(true)}><Pencil size={12} /></Button>
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
              <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><Gift size={16} /> Referral ID</CardTitle></CardHeader>
              <CardContent className="flex justify-between items-center bg-black/20 p-4 rounded-xl mx-6 mb-6">
                  <span className="font-mono font-bold">{userData?.referralCode || '------'}</span>
                  <Button variant="ghost" size="icon" onClick={handleCopyCode}><Copy size={16} /></Button>
              </CardContent>
            </Card>
            <Card className="bg-white/[0.03] border-white/[0.08]">
              <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><Users2 size={16} /> Network</CardTitle></CardHeader>
              <CardContent className="flex justify-between items-center p-6">
                  <div><p className="text-2xl font-black">{referrals?.length || 0}</p><p className="text-[10px] text-white/20 uppercase font-bold">Total Members</p></div>
              </CardContent>
            </Card>
        </div>

        {awaitingConfirmationRequest && <AmountVerificationCard request={awaitingConfirmationRequest} />}

        <Tabs defaultValue="history">
            <TabsList className="grid w-full grid-cols-4 bg-white/5 h-14 rounded-2xl">
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="deposits">Deposits</TabsTrigger>
                <TabsTrigger value="withdrawals">Payouts</TabsTrigger>
                <TabsTrigger value="groups">Groups</TabsTrigger>
            </TabsList>
            <div className="mt-4">
                <TabsContent value="history">
                    <HistoryTable
                        headers={['Detail', 'Amount']}
                        items={walletHistory}
                        renderRow={(entry: WalletHistoryEntry) => (
                            <TableRow key={entry.id} className="border-white/[0.05]">
                                <TableCell className="pl-6 py-4">
                                    <p className="text-xs font-bold text-white/80">{entry.category}</p>
                                    <p className="text-[9px] text-white/20">{entry.description}</p>
                                </TableCell>
                                <TableCell className="text-right pr-6 font-bold">
                                    <span className={entry.type === 'credit' ? 'text-green-400' : 'text-red-400'}>
                                        {entry.type === 'credit' ? '+' : '-'}₹{entry.amount.toFixed(2)}
                                    </span>
                                </TableCell>
                            </TableRow>
                        )}
                    />
                </TabsContent>
                <TabsContent value="deposits"><TransactionTable transactions={deposits} type="deposit" /></TabsContent>
                <TabsContent value="withdrawals"><TransactionTable transactions={withdrawals} type="withdrawal" /></TabsContent>
                <TabsContent value="groups"><GroupInvestmentTable investments={groupInvestments} /></TabsContent>
            </div>
        </Tabs>

        <Button onClick={handleLogout} className="w-full h-12 bg-white/5 border border-white/10 hover:bg-destructive text-white rounded-xl">Sign Out</Button>

        <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
            <DialogContent className="bg-[#030408] border-white/10 text-white">
                <DialogHeader><DialogTitle>Update Name</DialogTitle></DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input value={editName} onChange={e => setEditName(e.target.value)} className="bg-white/5 border-white/10" />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleUpdateName} disabled={isUpdatingProfile} className="w-full">Confirm Update</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </main>

      <nav className="sticky bottom-0 z-20 border-t border-white/[0.05] bg-black/40 backdrop-blur-xl">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={Trophy} label="Leaders" href="/leaderboard" />
          <BottomNavItem icon={HandCoins} label="Loans" href="/my-loans" />
          <BottomNavItem icon={User} label="Profile" active />
        </div>
      </nav>
    </div>
  );
}