
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
  CreditCard,
  Users2,
  HandCoins,
  Users as UsersIcon,
  Fingerprint,
  Phone,
  FileUp,
  AlertTriangle,
  Send,
  Handshake,
  ShieldCheck,
  Pencil,
  TicketPercent,
  Timer,
  Gem,
  Trophy,
  X,
  CreditCard as CreditCardIcon,
  CheckCircle2,
  History as HistoryIcon,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth, useDoc, useFirestore } from '@/firebase';
import { signOut } from 'firebase/auth';
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
import { AchievementBadges } from '@/components/dashboard/AchievementBadges';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

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
    investorId: string;
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
  totalInvestment?: number;
};

type UserData = {
  name?: string;
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
            const allInvestments: GroupInvestment[] = [];
            
            try {
                const plansSnapshot = await getDocs(collection(firestore, 'groupLoanPlans'));

                for (const planDoc of plansSnapshot.docs) {
                    const investmentsRef = collection(firestore, `groupLoanPlans/${planDoc.id}/investments`);
                    const qry = query(investmentsRef, where('investorId', '==', userId));
                    const investmentSnapshot = await getDocs(qry);

                    investmentSnapshot.forEach(invDoc => {
                        allInvestments.push({ id: invDoc.id, ...invDoc.data() } as GroupInvestment);
                    });
                }
                setInvestments(allInvestments);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchInvestments();
    }, [userId, firestore]);

    return { data: investments, loading };
}

function RedeemCouponCard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRedeem = async () => {
    if (!user || !code.trim()) return;
    setLoading(true);

    try {
      const couponsRef = collection(firestore, 'coupons');
      const q = query(couponsRef, where('code', '==', code.trim().toUpperCase()), where('status', '==', 'active'));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({ title: "Invalid Coupon", description: "This code does not exist or has expired.", variant: "destructive" });
        return;
      }

      const couponDocSnap = querySnapshot.docs[0];
      const couponRef = couponDocSnap.ref;

      await runTransaction(firestore, async (transaction) => {
        const freshCouponDoc = await transaction.get(couponRef);
        const couponData = freshCouponDoc.data() as any;

        if (couponData.status !== 'active' || couponData.stock <= 0) {
            throw new Error("This coupon is no longer available.");
        }

        if (couponData.redemptions?.some((r: any) => r.userId === user.uid)) {
          throw new Error("You have already redeemed this coupon.");
        }

        const userRef = doc(firestore, 'users', user.uid);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User account not found.");

        const newBalance = (userDoc.data().walletBalance || 0) + couponData.amount;
        const newStock = couponData.stock - 1;

        transaction.update(userRef, { walletBalance: newBalance });
        transaction.update(couponRef, {
          stock: newStock,
          status: newStock <= 0 ? 'depleted' : 'active',
          redemptions: arrayUnion({
            userId: user.uid,
            userName: userDoc.data().name || 'User',
            redeemedAt: new Date()
          })
        });

        const historyRef = doc(collection(firestore, 'users', user.uid, 'walletHistory'));
        transaction.set(historyRef, {
            amount: couponData.amount,
            type: 'credit',
            category: 'Coupon',
            description: `Redeemed coupon code: ${code.trim().toUpperCase()}`,
            createdAt: serverTimestamp()
        });
      });

      toast({ title: "Coupon Redeemed!", description: "Rewards have been credited to your wallet." });
      setCode('');
    } catch (e: any) {
      toast({ title: "Redemption Failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-2xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white/90">
                <TicketPercent className="text-orange-400" /> Redeem Coupon
            </CardTitle>
            <CardDescription className="text-white/40">Enter a special code to claim instant wallet rewards.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex gap-2">
                <Input 
                    placeholder="ENTER CODE" 
                    value={code} 
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="bg-white/5 border-white/10 rounded-xl h-11 font-mono tracking-widest focus:ring-primary"
                />
                <Button onClick={handleRedeem} disabled={loading || !code.trim()} className="rounded-xl font-bold px-6 bg-primary text-white">
                    {loading ? <Timer className="animate-spin h-4 w-4" /> : 'Redeem'}
                </Button>
            </div>
        </CardContent>
    </Card>
  );
}

function WithdrawalDetailModal({ tx, isOpen, onClose }: { tx: Transaction | null, isOpen: boolean, onClose: () => void }) {
    if (!tx) return null;

    const netPayout = tx.finalAmount ?? tx.amount;
    const initialRequest = tx.amount;
    const gst = tx.gstAmount || 0;
    const bonus = tx.totalDelayBonus || 0;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#030408]/90 backdrop-blur-2xl border-white/10 text-white sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <HistoryIcon className="text-primary" /> Settlement View
                    </DialogTitle>
                    <DialogDescription className="text-white/40">Transaction breakdown and receipt.</DialogDescription>
                </DialogHeader>
                
                <div className="py-6 space-y-6">
                    <div className="text-center space-y-1">
                        <p className="text-[10px] text-white/30 uppercase tracking-[3px] font-bold">Net Payout Received</p>
                        <p className="text-4xl font-black text-green-400 tracking-tighter">₹{netPayout.toFixed(2)}</p>
                    </div>

                    <div className="space-y-3 bg-white/5 rounded-2xl p-5 border border-white/5">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-white/60">Requested Amount</span>
                            <span className="font-bold text-white">₹{initialRequest.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-white/60">Delay Bonus Earned</span>
                            <span className="font-bold text-blue-400">+₹{bonus.toFixed(2)}</span>
                        </div>
                        <Separator className="bg-white/5" />
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-white/60">Service Fee (GST)</span>
                            <span className="font-bold text-red-400">-₹{gst.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                         <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                            <p className="text-[9px] text-white/20 uppercase font-bold mb-1">Status</p>
                            <Badge className={cn("text-[9px] h-5", tx.status === 'approved' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-white/10 text-white/40 border-white/10')}>{tx.status.toUpperCase()}</Badge>
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                            <p className="text-[9px] text-white/20 uppercase font-bold mb-1">Account Path</p>
                            <p className="text-[10px] font-mono text-white/80 truncate">{tx.upiId || 'SAVED UPI'}</p>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={onClose} className="w-full h-12 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10">Close Receipt</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function ProfilePage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const { data: userData, loading: userDataloading } = useDoc<UserData>(user ? `users/${user.uid}` : null);
  const { data: investments } = useCollection<Investment>(user ? `users/${user.uid}/investments` : null);
  const { data: loans } = useCollection<Loan>(user ? `users/${user.uid}/loans` : null);
  const { data: referrals } = useCollection<Referral>(user ? 'users' : null, { where: ['referredBy', '==', user?.uid] });
  const { data: deposits } = useCollection<Transaction>(user ? `deposits` : null, { where: ['userId', '==', user?.uid]});
  const { data: withdrawals } = useCollection<Transaction>(user ? `withdrawals` : null, { where: ['userId', '==', user?.uid]});
  const { data: walletHistory, loading: historyLoading } = useCollection<WalletHistoryEntry>(
    user ? `users/${user.uid}/walletHistory` : null,
    undefined,
    orderBy('createdAt', 'desc')
  );
  const { data: groupInvestments } = useUserGroupInvestments(user?.uid);
  const { data: upiRequests } = useCollection<UpiRequest>(user ? `upiRequests` : null, { where: ['userId', '==', user?.uid] });
  
  // KYC State
  const [panCard, setPanCard] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [kycTermsAccepted, setKycTermsAccepted] = useState(false);
  
  const kycStatus = userData?.kycStatus || 'Not Submitted';
  const isKycFormDisabled = kycStatus === 'Pending' || kycStatus === 'Verified';

  // UPI State
  const [upiId, setUpiId] = useState('');
  const [upiProvider, setUpiProvider] = useState<'PhonePe' | 'Google Pay' | 'Paytm' | ''>('');
  
  const upiStatus = userData?.upiStatus || 'Unverified';
  const isUpiFormDisabled = upiStatus === 'Pending' || upiStatus === 'Verified';
  
  const awaitingConfirmationRequest = useMemo(() => {
    return upiRequests?.find(req => req.status === 'awaiting_confirmation');
  }, [upiRequests]);


  useEffect(() => {
    if (userData) {
      setPanCard(userData.panCard || '');
      setAadhaarNumber(userData.aadhaarNumber || '');
      setPhoneNumber(userData.phoneNumber || '');

      setUpiId(userData.upiId || '');
      setUpiProvider(userData.upiProvider || '');
    }
  }, [userData]);

  useEffect(() => {
    if (user && userData && investments && loans && referrals) {
        const currentScore = userData.trustScore || 0;
        const newScore = calculateTrustScore(investments, loans, referrals);
        
        if (newScore !== currentScore) {
            const userRef = doc(firestore, 'users', user.uid);
            updateDoc(userRef, { trustScore: newScore }).catch(error => {
                console.error("Failed to update trust score:", error);
            });
        }
    }
  }, [user, userData, investments, loans, referrals, firestore]);


  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };
  
  const handleCopyCode = () => {
    if (userData?.referralCode) {
      navigator.clipboard.writeText(userData.referralCode);
      toast({
        title: "Copied!",
        description: "Your referral code has been copied to the clipboard.",
      });
    }
  };

  const handleSavePhone = () => {
    if (!user) return;
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
        toast({ title: "Invalid Phone Number", description: "Please enter a valid 10-digit phone number.", variant: "destructive" });
        return;
    }
    const userRef = doc(firestore, 'users', user.uid);
    updateDoc(userRef, { phoneNumber: phoneNumber })
      .then(() => {
        toast({ title: "Phone Number Updated" });
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: { phoneNumber },
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleSubmitUpi = () => {
      if (!user || !userData) {
          toast({ title: 'User not found.', variant: 'destructive'});
          return;
      }
      if (!upiId || !upiProvider) {
          toast({ title: 'All fields required', description: 'Please select a provider and enter your UPI ID.', variant: 'destructive' });
          return;
      }

      const upiRequestData = {
          userId: user.uid,
          userName: userData.name || user.displayName || 'Investor',
          upiId: upiId,
          upiProvider: upiProvider,
          status: 'pending' as const,
          createdAt: serverTimestamp(),
      };

      runTransaction(firestore, async (transaction) => {
          const userRef = doc(firestore, 'users', user.uid);
          const requestRef = doc(collection(firestore, 'upiRequests'));

          transaction.set(requestRef, upiRequestData);
          transaction.update(userRef, { upiStatus: 'Pending' });
      })
      .then(() => {
          toast({ title: 'UPI Submitted', description: 'Your UPI ID has been submitted for verification.' });
      })
      .catch((error) => {
          const permissionError = new FirestorePermissionError({
              path: `upiRequests or users/${user.uid}`,
              operation: 'write',
              requestResourceData: upiRequestData,
          });
          errorEmitter.emit('permission-error', permissionError);
      });
  }

  const handleChangeUpiRequest = () => {
    if (!user) return;
    const userRef = doc(firestore, 'users', user.uid);
    const updateData = {
      upiStatus: 'Unverified',
      upiId: '',
      upiProvider: '',
    };

    updateDoc(userRef, updateData)
      .then(() => {
        toast({
          title: 'UPI Reset',
          description: 'You can now submit a new UPI ID for verification.',
        });
        setUpiId('');
        setUpiProvider('');
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };


  const handleSubmitKyc = () => {
    if (!user) return;
    const panRegex = /[A-Z]{5}[0-9]{4}[A-Z]{1}/;
    const aadhaarRegex = /^[0-9]{12}$/;
    const phoneRegex = /^[0-9]{10}$/;

    if (!panRegex.test(panCard)) {
        toast({ title: "Invalid PAN", description: "Please enter a valid 10-digit PAN.", variant: "destructive" });
        return;
    }
    if (!aadhaarRegex.test(aadhaarNumber)) {
        toast({ title: "Invalid Aadhaar", description: "Please enter a valid 12-digit Aadhaar number.", variant: "destructive" });
        return;
    }
    if (!phoneRegex.test(phoneNumber)) {
        toast({ title: "Invalid Phone Number", description: "Please enter a valid 10-digit phone number.", variant: "destructive" });
        return;
    }
    if (!kycTermsAccepted) {
        toast({ title: "Terms Not Accepted", description: "You must accept the terms and conditions to proceed.", variant: "destructive" });
        return;
    }

    const userRef = doc(firestore, 'users', user.uid);
    const dataToUpdate = { 
      panCard: panCard,
      aadhaarNumber: aadhaarNumber,
      phoneNumber: phoneNumber,
      kycTermsAccepted: kycTermsAccepted,
      kycStatus: 'Pending',
      kycRejectionReason: '',
      kycSubmissionDate: serverTimestamp(),
    };

    updateDoc(userRef, dataToUpdate)
      .then(() => {
        toast({ title: "KYC Submitted", description: "Your information has been submitted for admin approval." });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', serverError);
      });
  }
  
  const vipLevel = userData?.vipLevel || 'Bronze';
  
  return (
    <div className="flex min-h-screen w-full flex-col bg-[#030408] text-foreground relative overflow-hidden">
      <div className="absolute top-[-10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-secondary/10 blur-[120px] pointer-events-none" />

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.05] bg-black/40 px-4 backdrop-blur-xl sm:px-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white/70">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Profile</h1>
        <div className="w-9"></div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative z-10 max-w-4xl mx-auto w-full space-y-6">
        <Card className="shadow-2xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl transition-all hover:bg-white/[0.05]">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-secondary p-[2px] shadow-lg">
                    <div className="h-full w-full rounded-2xl bg-[#030408] flex items-center justify-center">
                       <User size={40} className="text-white/80" />
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-green-500 border-4 border-[#030408] flex items-center justify-center">
                    <ShieldCheck size={16} className="text-white" />
                  </div>
                </div>
                <div className="text-center sm:text-left">
                  <CardTitle className="text-2xl font-bold text-white mb-1">
                    {userData?.name || user?.displayName || 'Investor'}
                  </CardTitle>
                  <CardDescription className="text-white/40 flex items-center justify-center sm:justify-start gap-1">
                    <Mail size={14}/> {user?.email}
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-col items-center sm:items-end gap-3">
                 <Link href="/vip-tiers">
                    <div className={cn(
                        'group relative px-6 py-2.5 rounded-xl border transition-all hover:scale-105 active:scale-95 flex items-center gap-2 overflow-hidden',
                        vipLevel === 'Bronze' && 'border-amber-800/50 bg-amber-900/10 text-amber-500',
                        vipLevel === 'Silver' && 'border-slate-400/50 bg-slate-400/10 text-slate-300',
                        vipLevel === 'Gold' && 'border-yellow-400/50 bg-yellow-400/10 text-yellow-400',
                        vipLevel === 'Platinum' && 'border-purple-500/50 bg-purple-500/10 text-purple-400',
                    )}>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        <Gem size={18} className="animate-bounce" />
                        <span className="font-bold tracking-wider uppercase text-sm">{vipLevel} TIER</span>
                    </div>
                </Link>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="shadow-2xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white/90">
                    <Trophy className="text-yellow-400" /> Your Trust Score
                </CardTitle>
                <CardDescription className="text-white/40">This score is calculated based on your platform reliability and history.</CardDescription>
            </CardHeader>
            <CardContent className="relative">
                {userDataloading ? (
                    <div className="flex justify-center p-8"><Timer className="animate-spin text-primary" /></div>
                ) : (
                    <div className="py-2">
                        <TrustScoreMeter score={userData?.trustScore || 500} />
                    </div>
                )}
            </CardContent>
        </Card>

        <RedeemCouponCard />

        <div className="grid gap-6">
            {awaitingConfirmationRequest ? (
                <AmountVerificationCard request={awaitingConfirmationRequest}/>
            ) : (
                 <Card className="shadow-2xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white/90">
                            <CreditCardIcon className="text-blue-400" /> UPI Verification
                        </CardTitle>
                        <CardDescription className="text-white/40">Required for smooth and automated withdrawals.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {userDataloading ? <p>Loading...</p> : (
                            <>
                                {upiStatus === 'Verified' && (
                                    <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5 text-green-300 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <p className="font-bold flex items-center gap-2"><CheckCircle2 className="text-green-500" size={18}/> UPI Verified</p>
                                                <div className="text-sm bg-white/5 p-2 rounded-lg font-mono tracking-tight text-white/80">
                                                    {userData?.upiId}
                                                </div>
                                                <p className="text-[10px] text-white/40 uppercase tracking-widest">{userData?.upiProvider}</p>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={handleChangeUpiRequest} className="border-white/10 hover:bg-white/10 text-white/70 h-8">
                                                <Pencil className="h-3 w-3 mr-1" /> Change
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                {upiStatus === 'Pending' && (
                                    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6 text-center space-y-2">
                                        <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
                                            <Timer className="text-blue-400" />
                                        </div>
                                        <p className="font-bold text-blue-300 text-lg">Verification Pending</p>
                                        <p className="text-sm text-blue-200/60">Our team is reviewing your UPI ID. This usually takes less than 1 hour.</p>
                                    </div>
                                )}
                                {(upiStatus === 'Unverified' || upiStatus === 'Rejected') && (
                                    <div className="space-y-5">
                                        {upiStatus === 'Rejected' && (
                                            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-destructive flex items-start gap-3">
                                                <AlertTriangle size={18} />
                                                <div className="text-sm">
                                                    <p className="font-bold">Verification Failed</p>
                                                    <p className="opacity-80">The provided UPI ID was not valid. Please check and try again.</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label className="text-white/60">UPI Provider</Label>
                                                <Select onValueChange={(value: 'PhonePe' | 'Google Pay' | 'Paytm') => setUpiProvider(value)} value={upiProvider} disabled={isUpiFormDisabled}>
                                                    <SelectTrigger className="bg-white/5 border-white/10 rounded-xl focus:ring-primary h-11">
                                                        <SelectValue placeholder="App Name" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#030408] border-white/10">
                                                        <SelectItem value="PhonePe">PhonePe</SelectItem>
                                                        <SelectItem value="Google Pay">Google Pay</SelectItem>
                                                        <SelectItem value="Paytm">Paytm</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="upiId" className="text-white/60">UPI ID</Label>
                                                <Input id="upiId" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="name@oksbi" disabled={isUpiFormDisabled} className="bg-white/5 border-white/10 rounded-xl h-11 focus:ring-primary" />
                                            </div>
                                        </div>
                                        <Button onClick={handleSubmitUpi} className="w-full h-12 rounded-xl text-lg font-bold shadow-xl shadow-primary/20" disabled={isUpiFormDisabled}>
                                            <Handshake className="mr-2 h-5 w-5" />
                                            Verify Identity
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            )}
       
            <Card className="shadow-2xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white/90">
                        <Fingerprint className="text-purple-400" /> KYC Authentication
                    </CardTitle>
                    <CardDescription className="text-white/40">Secure your account with official document verification.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    {userDataloading ? <p>Loading...</p> : (
                        <>
                            {kycStatus === 'Pending' && (
                                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6 text-center space-y-2">
                                    <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
                                        <Timer className="text-blue-400" />
                                    </div>
                                    <p className="font-bold text-blue-300 text-lg">Awaiting Review</p>
                                    <p className="text-sm text-blue-200/60">Your KYC submission is in the queue. You'll be notified once approved.</p>
                                </div>
                            )}
                            {kycStatus === 'Verified' && (
                                <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 text-center space-y-2">
                                    <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                                        <ShieldCheck className="text-green-400" size={28} />
                                    </div>
                                    <p className="font-bold text-green-300 text-lg">Account Fully Verified</p>
                                    <p className="text-sm text-green-200/60">All platform features and high-limit loans are now unlocked.</p>
                                </div>
                            )}
                            {kycStatus === 'Rejected' && (
                                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-destructive flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle size={18} />
                                        <p className="font-bold">KYC Declined</p>
                                    </div>
                                    <p className="text-xs bg-destructive/10 p-3 rounded-lg border border-destructive/20">Reason: {userData?.kycRejectionReason}</p>
                                </div>
                            )}

                            {kycStatus !== 'Verified' && kycStatus !== 'Pending' && (
                                <div className="space-y-5">
                                    <div className="space-y-4">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label className="text-white/60">PAN Card No.</Label>
                                                <Input value={panCard} onChange={(e) => setPanCard(e.target.value.toUpperCase())} placeholder="ABCDE1234F" className="bg-white/5 border-white/10 rounded-xl h-11" disabled={isKycFormDisabled} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-white/60">Aadhaar Card No.</Label>
                                                <Input type="number" value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value)} placeholder="12-Digit Number" className="bg-white/5 border-white/10 rounded-xl h-11" disabled={isKycFormDisabled}/>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-white/60">Registered Phone</Label>
                                            <div className="flex gap-2">
                                                <Input type="number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="9876543210" className="bg-white/5 border-white/10 rounded-xl h-11" />
                                                <Button variant="outline" className="border-white/10 rounded-xl h-11" onClick={handleSavePhone}>Save</Button>
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                                            <p className="text-[10px] text-white/30 uppercase tracking-[2px] font-bold">Terms & Security</p>
                                            <p className="text-xs text-white/50 leading-relaxed">
                                                By submitting, you agree to our data policy. False information or loan defaults will result in immediate legal action and platform suspension.
                                            </p>
                                            <div className="flex items-center space-x-3 pt-2">
                                                <Checkbox id="terms" onCheckedChange={(checked) => setKycTermsAccepted(!!checked)} disabled={isKycFormDisabled} className="border-white/20 rounded-md data-[state=checked]:bg-primary" />
                                                <label htmlFor="terms" className="text-sm font-medium text-white/70 cursor-pointer">
                                                    I certify the above details are authentic.
                                                </label>
                                            </div>
                                        </div>
                                        <Button onClick={handleSubmitKyc} className="w-full h-12 rounded-xl font-bold" disabled={isKycFormDisabled}>
                                           Finalize KYC Submission
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>

        <Card className="shadow-2xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 opacity-50 group-hover:opacity-100 transition-opacity" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white/90">
                <Gift className="text-pink-400" /> Share & Earn
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div className="flex items-center justify-between rounded-2xl bg-black/40 border border-white/5 p-4">
              <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-white/5">
                    <UsersIcon size={24} className="text-white/80" />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Referral ID</p>
                    <span className="text-xl font-mono font-bold text-white tracking-tighter">{userData?.referralCode || '••••••'}</span>
                  </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleCopyCode} className="h-12 w-12 rounded-xl hover:bg-white/10 text-white/60">
                <Copy className="h-6 w-6" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="history" className="mt-8">
            <TabsList className="grid w-full grid-cols-4 bg-white/5 border-white/10 p-1.5 h-14 rounded-2xl">
                <TabsTrigger value="history" className="rounded-xl data-[state=active]:bg-white/10 h-full text-[10px] sm:text-sm">History</TabsTrigger>
                <TabsTrigger value="deposits" className="rounded-xl data-[state=active]:bg-white/10 h-full text-[10px] sm:text-sm">Deposits</TabsTrigger>
                <TabsTrigger value="withdrawals" className="rounded-xl data-[state=active]:bg-white/10 h-full text-[10px] sm:text-sm">Payouts</TabsTrigger>
                <TabsTrigger value="group-investments" className="rounded-xl data-[state=active]:bg-white/10 h-full text-[10px] sm:text-sm">Groups</TabsTrigger>
            </TabsList>
            <div className="mt-6">
                <TabsContent value="history">
                    <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-white/[0.02]">
                                    <TableRow className="border-white/10">
                                        <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest pl-6">Detail</TableHead>
                                        <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest text-right pr-6">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {historyLoading ? (
                                         <TableRow><TableCell colSpan={2} className="text-center py-10 opacity-20"><Timer className="animate-spin mx-auto" /></TableCell></TableRow>
                                    ) : walletHistory && walletHistory.length > 0 ? (
                                        walletHistory.map(entry => (
                                            <TableRow key={entry.id} className="border-white/[0.05] hover:bg-white/[0.02]">
                                                <TableCell className="pl-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", entry.type === 'credit' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400')}>
                                                            {entry.type === 'credit' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-white/80">{entry.category}</p>
                                                            <p className="text-[10px] text-white/30">{entry.description}</p>
                                                            <p className="text-[9px] text-white/20 mt-0.5">{new Date(entry.createdAt?.seconds * 1000).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-6 font-mono font-bold text-sm">
                                                    <span className={entry.type === 'credit' ? 'text-green-400' : 'text-red-400'}>
                                                        {entry.type === 'credit' ? '+' : '-'}₹{entry.amount.toFixed(2)}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={2} className="text-center py-10 text-white/20 italic">No wallet history found.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="deposits">
                    <TransactionTable transactions={deposits} type="deposit" />
                </TabsContent>
                <TabsContent value="withdrawals">
                    <TransactionTable transactions={withdrawals} type="withdrawal" />
                </TabsContent>
                 <TabsContent value="group-investments">
                    <GroupInvestmentTable investments={groupInvestments} />
                </TabsContent>
            </div>
        </Tabs>

        <div className="pt-6">
            <Button onClick={handleLogout} className="w-full h-14 rounded-2xl font-bold bg-white/5 hover:bg-destructive text-white border border-white/10 transition-colors shadow-2xl" variant="ghost">
            <LogOut className="mr-2 h-5 w-5" />
            Sign Out Securely
            </Button>
        </div>
      </main>

      <nav className="sticky bottom-0 z-20 border-t border-white/[0.05] bg-black/40 backdrop-blur-xl">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs font-medium">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={Trophy} label="Leaders" href="/leaderboard" />
          <BottomNavItem icon={HandCoins} label="My Loans" href="/my-loans" />
          <BottomNavItem icon={User} label="Profile" href="/profile" active />
        </div>
      </nav>
    </div>
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
      toast({ title: 'Invalid Amount', description: 'Please enter a valid number.', variant: 'destructive' });
      return;
    }

    if (userInputAmount === request.confirmationAmount) {
      try {
        await runTransaction(firestore, async (transaction) => {
          const userRef = doc(firestore, 'users', user.uid);
          const requestRef = doc(firestore, 'upiRequests', request.id);

          transaction.update(userRef, {
            upiStatus: 'Verified',
            upiId: request.upiId,
            upiProvider: request.upiProvider,
          });
          transaction.update(requestRef, { status: 'approved' });
        });
        toast({ title: 'UPI Verified!', description: 'Your UPI ID has been successfully verified.' });
      } catch (error) {
        toast({ title: 'Verification Failed', description: 'An error occurred. Please try again.', variant: 'destructive' });
      }
    } else {
      toast({ title: 'Incorrect Amount', description: 'The amount you entered does not match. Please check and try again.', variant: 'destructive' });
    }
  };


  return (
    <Card className="shadow-2xl border-yellow-500/30 bg-yellow-500/[0.03] backdrop-blur-xl group">
      <CardHeader>
        <CardTitle className="text-yellow-400 flex items-center gap-2">
            <Timer className="animate-pulse" /> Final Verification
        </CardTitle>
        <CardDescription className="text-yellow-200/40">We've sent a small amount to your UPI. Enter the exact figure below.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="verificationAmount" className="text-yellow-200/60">Amount Received (₹)</Label>
            <Input id="verificationAmount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 1.07" className="bg-white/5 border-yellow-500/20 text-yellow-100 h-12 text-xl font-mono text-center rounded-xl" />
        </div>
        <Button className="w-full h-12 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-black font-bold" onClick={handleVerifyAmount}>
            <ShieldCheck className="mr-2 h-5 w-5" />
            Complete Verification
        </Button>
      </CardContent>
    </Card>
  );
}

function TransactionTable({ transactions, type }: { transactions: Transaction[] | undefined | null, type: 'deposit' | 'withdrawal' }) {
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

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
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-white/[0.02]">
                            <TableRow className="border-white/10">
                                <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest pl-6">Amount</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Status</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest pr-6">Action</TableHead>
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
                                        <TableCell className="pr-6">
                                            {type === 'withdrawal' && tx.status === 'approved' && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-7 text-[10px] uppercase font-bold text-primary hover:bg-primary/10"
                                                    onClick={() => setSelectedTx(tx)}
                                                >
                                                    View Receipt
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-10 text-white/20 italic">No history found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            <WithdrawalDetailModal tx={selectedTx} isOpen={!!selectedTx} onClose={() => setSelectedTx(null)} />
        </Card>
    );
}

function GroupInvestmentTableRow({ investment }: { investment: GroupInvestment }) {
    const { data: planData } = useDoc<GroupLoanPlan>(investment ? `groupLoanPlans/${investment.planId}`: null);
    
    const formatDate = (timestamp: Timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
    };
    
    const repaymentProgress = planData && planData.totalRepayment > 0 
        ? ((planData.amountRepaid || 0) / planData.totalRepayment) * 100 
        : 0;

    const investorShare = (planData && planData.loanAmount > 0) ? ((investment.investedAmount || 0) / planData.loanAmount) : 0;
    const totalProfitShare = (planData?.interest || 0) * investorShare;
    const expectedReturn = (investment.investedAmount || 0) + totalProfitShare;
    const remainingAmount = expectedReturn - (investment.amountReceived || 0);

    return (
        <TableRow className="border-white/[0.05] hover:bg-white/[0.02]">
            <TableCell className="pl-6">
                <div className='font-bold text-white'>{investment.planName}</div>
                <div className='text-[10px] text-white/20 font-bold uppercase tracking-widest mt-1'>{formatDate(investment.createdAt)}</div>
            </TableCell>
            <TableCell className="text-white/80 font-medium">₹{(investment.investedAmount || 0).toFixed(2)}</TableCell>
            <TableCell className="text-cyan-400 font-bold">₹{(totalProfitShare || 0).toFixed(2)}</TableCell>
            <TableCell className="text-green-400 font-bold">₹{(investment.amountReceived || 0).toFixed(2)}</TableCell>
            <TableCell className="pr-6">
                {planData ? (
                    <div className="w-24 space-y-1">
                        <Progress value={repaymentProgress} className="h-1.5 bg-white/5" />
                        <span className="text-[10px] text-white/30 font-bold">{repaymentProgress.toFixed(0)}% PAID</span>
                    </div>
                ) : (
                    <span className="text-[10px] text-white/20 animate-pulse">SYNCING...</span>
                )}
            </TableCell>
        </TableRow>
    );
}

function GroupInvestmentTable({ investments }: { investments: GroupInvestment[] | undefined | null }) {
    return (
        <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-white/[0.02]">
                            <TableRow className="border-white/10">
                                <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest pl-6">Plan</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Invested</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Profit</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Received</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest pr-6">Progress</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {investments && investments.length > 0 ? (
                                investments.map(inv => (
                                    <GroupInvestmentTableRow key={inv.id} investment={inv} />
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-white/20 italic">No group investments found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
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
