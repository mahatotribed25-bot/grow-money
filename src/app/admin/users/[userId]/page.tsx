'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useAuth } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  ArrowRight, 
  User, 
  Ban, 
  RefreshCcw, 
  Wallet, 
  Briefcase, 
  Download, 
  Upload, 
  Fingerprint, 
  HandCoins, 
  CheckCircle, 
  Users2, 
  PowerOff, 
  Mail, 
  CreditCard, 
  Phone, 
  FileCheck, 
  ShieldCheck, 
  ShieldX, 
  Crown, 
  Timer, 
  Send, 
  TrendingUp, 
  TrendingDown, 
  History as HistoryIcon, 
  IdCard, 
  Smartphone,
  CheckCircle2,
  ImageIcon,
  X
} from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';
import { doc, updateDoc, runTransaction, collection, getDocs, query, where, deleteField, serverTimestamp, orderBy } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { sendPasswordResetEmail } from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';

type UserPermissions = {
    canManageDeposits?: boolean;
    canManageWithdrawals?: boolean;
    canManageKyc?: boolean;
    canManagePlanLoans?: boolean;
    canManageCustomLoans?: boolean;
}

type UserData = {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  walletBalance?: number;
  totalInvestment?: number;
  totalIncome?: number;
  status?: 'Active' | 'Blocked';
  panCard?: string;
  aadhaarNumber?: string;
  phoneNumber?: string;
  kycStatus?: 'Not Submitted' | 'Pending' | 'Verified' | 'Rejected';
  kycRejectionReason?: string;
  role?: 'user' | 'subadmin';
  permissions?: UserPermissions;
  panImage?: string;
  aadhaarImage?: string;
};

type WalletHistoryEntry = {
    id: string;
    amount: number;
    type: 'credit' | 'debit';
    category: string;
    description: string;
    createdAt: Timestamp;
}

type Investment = {
  id: string;
  planName: string;
  investedAmount: number;
  maturityDate: Timestamp;
  startDate: Timestamp;
  dailyIncome: number;
  returnAmount: number;
  status: 'Active' | 'Matured' | 'Stopped';
  finalReturn?: number;
  daysActive?: number;
  earnedIncome?: number;
}

type Transaction = {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
  transactionId?: string;
  delayBonusActive?: boolean;
  delayBonusAmountPerDay?: number;
  delayBonusStartDate?: Timestamp;
  totalDelayBonus?: number;
  gstAmount?: number;
  finalAmount?: number;
};

type EMI = {
  emiAmount: number;
  dueDate: Timestamp;
  status: 'Pending' | 'Paid' | 'Due' | 'Payment Pending';
}

type ActiveLoan = {
    id: string;
    planName: string;
    loanAmount: number;
    interest?: number;
    totalPayable: number;
    penalty?: number;
    dueDate: Timestamp;
    status: 'Active' | 'Due' | 'Completed' | 'Payment Pending';
    repaymentMethod: 'EMI' | 'Direct';
    emis?: EMI[];
}

type GroupInvestment = {
    id: string;
    planId: string;
    planName: string;
    investedAmount: number;
    amountReceived: number;
    createdAt: Timestamp;
    investorId: string;
}

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
            } catch (e) {
                console.error("Error fetching group investments:", e);
            }

            setInvestments(allInvestments);
            setLoading(false);
        };

        fetchInvestments();
    }, [userId, firestore]);

    return { data: investments, loading };
}

const formatDate = (timestamp: Timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleString();
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'approved':
    case 'Active':
    case 'Matured':
    case 'Completed':
    case 'Paid':
    case 'Verified':
      return 'default';
    case 'rejected':
    case 'Blocked':
    case 'Due':
    case 'Stopped':
      return 'destructive';
    case 'Payment Pending':
        return 'outline';
    default:
      return 'secondary';
  }
};

const WithdrawalStatus = ({ tx }: { tx: Transaction }) => {
    const [waitingDays, setWaitingDays] = useState(0);
    const [bonusEarned, setBonusEarned] = useState(0);

    useEffect(() => {
        if (tx.status === 'pending' && tx.delayBonusActive && tx.delayBonusStartDate) {
            const interval = setInterval(() => {
                const startDate = tx.delayBonusStartDate.toDate();
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - startDate.getTime());
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                setWaitingDays(diffDays);
                setBonusEarned(diffDays * (tx.delayBonusAmountPerDay || 0));
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [tx]);
    
    if (tx.status === 'pending') {
        if (tx.delayBonusActive) {
            return (
                 <div className="p-2 text-xs rounded-md bg-blue-500/10 text-blue-300 space-y-1 mt-2">
                    <p className="font-semibold flex items-center gap-1"><Timer size={14}/> Delay Bonus Active</p>
                    <p>User is earning ₹{tx.delayBonusAmountPerDay || 0}/day.</p>
                    <p>Days Waiting: {waitingDays}</p>
                    <p>Bonus Earned: ₹{bonusEarned.toFixed(2)}</p>
                 </div>
            );
        }
        return <p className="text-xs text-muted-foreground mt-2">The user's withdrawal is under processing.</p>;
    }

    return null;
};

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [isReKycDialogOpen, setIsReKycDialogOpen] = useState(false);
  const [reKycReason, setReKycReason] = useState('');

  const defaultPermissions: UserPermissions = {
    canManageDeposits: false,
    canManageWithdrawals: false,
    canManageKyc: false,
    canManagePlanLoans: false,
    canManageCustomLoans: false,
  };
  const [permissions, setPermissions] = useState<UserPermissions>(defaultPermissions);

  const { data: user, loading: userLoading, refetch: refetchUser } = useDoc<UserData>(userId ? `users/${userId}` : null);
  const { data: walletHistory, loading: historyLoading } = useCollection<WalletHistoryEntry>(userId ? `users/${userId}/walletHistory` : null, undefined, orderBy('createdAt', 'desc'));
  const { data: investments, loading: investmentsLoading } = useCollection<Investment>(userId ? `users/${userId}/investments` : null);
  const { data: loans, loading: loansLoading } = useCollection<ActiveLoan>(userId ? `users/${userId}/loans` : null);
  const { data: deposits, loading: depositsLoading } = useCollection<Transaction>(`deposits`, { where: ['userId', '==', userId] });
  const { data: withdrawals, loading: withdrawalsLoading } = useCollection<Transaction>(`withdrawals`, { where: ['userId', '==', userId]});
  const { data: groupInvestments, loading: groupInvestmentsLoading } = useUserGroupInvestments(userId);
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const loading = userLoading || investmentsLoading || depositsLoading || withdrawalsLoading || loansLoading || groupInvestmentsLoading || historyLoading;

  useEffect(() => {
    if (user?.permissions) {
        setPermissions(user.permissions);
    }
  }, [user]);

  const handlePermissionChange = (permission: keyof UserPermissions, value: boolean) => {
    setPermissions(prev => ({ ...prev, [permission]: value }));
  };

  const handleSavePermissions = () => {
    const userRef = doc(firestore, 'users', userId);
    const hasAnyPermission = Object.values(permissions).some(p => p === true);
    const newRole = hasAnyPermission ? 'subadmin' : 'user';

    updateDoc(userRef, {
        permissions,
        role: newRole,
    })
    .then(() => {
        toast({
            title: 'Permissions Updated',
            description: `${user?.name}'s role and permissions have been saved.`,
        });
        refetchUser();
    })
    .catch((error) => {
         const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: { permissions, role: newRole },
        });
        errorEmitter.emit('permission-error', permissionError);
    });
  }

  const handleToggleStatus = () => {
    if (!user) return;
    const newStatus = user.status === 'Blocked' ? 'Active' : 'Blocked';
    const userRef = doc(firestore, 'users', userId);
    const updateData = { status: newStatus };

    updateDoc(userRef, updateData)
      .then(() => {
        toast({
          title: 'Status Updated',
          description: `User has been ${newStatus}.`,
        });
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

   const handleStopInvestment = (investment: Investment) => {
    if (!user || !investment || investment.status !== 'Active') return;
    
    const investmentRef = doc(firestore, 'users', userId, 'investments', investment.id);
    
    const startDate = investment.startDate.toDate();
    const now = new Date();
    const daysActive = Math.max(1, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const earnedIncome = daysActive * investment.dailyIncome;
    const finalReturn = investment.investedAmount + earnedIncome;
    
    const updateData = {
        status: 'Stopped',
        finalReturn: finalReturn,
        daysActive: daysActive,
        earnedIncome: earnedIncome
    };

    updateDoc(investmentRef, updateData)
      .then(() => {
        toast({
            title: 'Investment Stopped',
            description: `The plan is now stopped. The user can claim ₹${finalReturn.toFixed(2)}.`,
        });
      })
      .catch((e: any) => {
        const permissionError = new FirestorePermissionError({
          path: investmentRef.path,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  }

  const handleResetData = async () => {
    if (!user) return;

    try {
      const docRefsToDelete: any[] = [];
      const investmentsSnapshot = await getDocs(collection(firestore, 'users', userId, 'investments'));
      investmentsSnapshot.forEach(doc => docRefsToDelete.push(doc.ref));

      const loansSnapshot = await getDocs(collection(firestore, 'users', userId, 'loans'));
      loansSnapshot.forEach(doc => docRefsToDelete.push(doc.ref));

      const historySnapshot = await getDocs(collection(firestore, 'users', userId, 'walletHistory'));
      historySnapshot.forEach(doc => docRefsToDelete.push(doc.ref));
      
      const collectionsToClean = ['deposits', 'withdrawals', 'loanRequests', 'customLoanRequests', 'upiRequests'];
      for (const colName of collectionsToClean) {
          const q = query(collection(firestore, colName), where('userId', '==', userId));
          const snapshot = await getDocs(q);
          snapshot.forEach(doc => docRefsToDelete.push(doc.ref));
      }

      const chatRef = doc(firestore, 'chats', userId);
      const messagesSnapshot = await getDocs(collection(firestore, 'chats', userId, 'messages'));
      messagesSnapshot.forEach(doc => docRefsToDelete.push(doc.ref));
      docRefsToDelete.push(chatRef);

      const activeCustomLoansQuery = query(collection(firestore, 'customLoanRequests'), where('userId', '==', userId), where('status', '==', 'active'));
      const activeCustomLoansSnapshot = await getDocs(activeCustomLoansQuery);
      let amountToCreditBack = 0;
      activeCustomLoansSnapshot.forEach(doc => {
          amountToCreditBack += doc.data().requestedAmount || 0;
      });

      await runTransaction(firestore, async (transaction) => {
          if (amountToCreditBack > 0) {
              const settingsRef = doc(firestore, 'settings', 'admin');
              const settingsDoc = await transaction.get(settingsRef);
              if (settingsDoc.exists()) {
                  const currentUsage = settingsDoc.data().currentCustomLoanUsage || 0;
                  const newCustomLoanUsage = Math.max(0, currentUsage - amountToCreditBack);
                  transaction.update(settingsRef, { currentCustomLoanUsage: newCustomLoanUsage });
              }
          }

          const userRef = doc(firestore, 'users', userId);
          transaction.update(userRef, {
              walletBalance: 0,
              totalIncome: 0,
              totalInvestment: 0,
              status: 'Active',
              role: 'user',
              permissions: deleteField(),
              panCard: deleteField(),
              aadhaarNumber: deleteField(),
              phoneNumber: deleteField(),
              kycStatus: 'Not Submitted',
              kycRejectionReason: deleteField(),
              kycSubmissionDate: deleteField(),
              kycTermsAccepted: deleteField(),
              upiId: deleteField(),
              upiProvider: deleteField(),
              upiStatus: 'Unverified',
              vipLevel: 'Bronze',
              trustScore: 500,
              lastCheckIn: deleteField(),
              panImage: deleteField(),
              aadhaarImage: deleteField(),
              photoURL: deleteField()
          });

          docRefsToDelete.forEach(ref => transaction.delete(ref));
      });

      toast({
          title: 'User Data Fully Reset',
          description: `${user.name}'s account has been reset to its initial state.`,
      });

    } catch (error) {
        toast({
            title: 'Error During Reset',
            description: "An error occurred while resetting the user's data.",
            variant: 'destructive',
        });
    }
  }
  
  const handlePasswordReset = async () => {
    if (!user || !user.email) {
      toast({ title: 'Error', description: 'User email not found.', variant: 'destructive' });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast({
        title: 'Password Reset Email Sent',
        description: `An email has been sent to ${user.email}.`,
      });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send password reset email.', variant: 'destructive' });
    }
  };

  const handleConfirmEmiPayment = (loan: ActiveLoan, emiIndex: number) => {
    if (!user || !loan.emis) return;
    
    const loanRef = doc(firestore, 'users', userId, 'loans', loan.id);
    const updatedEmis = loan.emis.map((emi, index) => 
      index === emiIndex ? { ...emi, status: 'Paid' as const } : emi
    );
    
    const allPaid = updatedEmis.every(emi => emi.status === 'Paid');
    const newLoanStatus = allPaid ? 'Completed' : loan.status;

    const updateData = { emis: updatedEmis, status: newLoanStatus };

    updateDoc(loanRef, updateData)
      .then(() => {
        toast({ title: 'EMI Payment Confirmed' });
      })
      .catch((e) => {
        const permissionError = new FirestorePermissionError({
          path: loanRef.path,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  }

  const handleCompleteLoan = (loanId: string, totalPayable: number) => {
    if (!user) return;
    const loanRef = doc(firestore, 'users', userId, 'loans', loanId);
    const updateData = { status: 'Completed', amountPaid: totalPayable };
    
    updateDoc(loanRef, updateData)
      .then(() => {
        toast({ title: 'Loan Completed' });
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: loanRef.path,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleKycApproval = (newStatus: 'Verified' | 'Rejected', reason?: string) => {
    if (!user) return;
    const userRef = doc(firestore, 'users', userId);
    const updateData: any = { kycStatus: newStatus };
    if (newStatus === 'Rejected') {
      updateData.kycRejectionReason = reason;
    }
    
    updateDoc(userRef, updateData)
      .then(() => {
        toast({ title: `KYC ${newStatus}` });
        if (refetchUser) refetchUser();
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

  const handleRequestReKyc = () => {
    if (!user) return;
    const userRef = doc(firestore, 'users', userId);
    const updateData = {
        kycStatus: 'Not Submitted' as const,
        kycRejectionReason: reKycReason || 'Administrative reset: Identity protocol re-verification required.',
        kycVerifiedAt: deleteField(),
        kycExpiryDate: deleteField(),
    };

    updateDoc(userRef, updateData)
        .then(() => {
            toast({ title: 'Identity Node Reset', description: 'User has been notified to re-verify.' });
            setIsReKycDialogOpen(false);
            setReKycReason('');
            if (refetchUser) refetchUser();
        })
        .catch(error => {
            const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'update',
                requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
  };

  const handleConfirmRejection = () => {
    if (!rejectionReason) {
      toast({ title: 'Reason is required', variant: 'destructive' });
      return;
    }
    handleKycApproval('Rejected', rejectionReason);
    setIsRejectDialogOpen(false);
    setRejectionReason('');
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!user) return <p className="text-white/40 text-center py-20">User not found.</p>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-xl border-white/10 hover:bg-white/5">
            <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
                <h2 className="text-2xl font-bold text-white">Investor Profile</h2>
                <p className="text-[10px] font-black uppercase text-white/20 tracking-[3px]">Protocol ID: {user.id.slice(-12).toUpperCase()}</p>
            </div>
        </div>
        <div className="flex gap-2 flex-wrap">
            <Button variant={user.status === 'Blocked' ? 'default' : 'destructive'} onClick={handleToggleStatus} className="h-10 rounded-xl font-bold">
                <Ban className="mr-2 h-4 w-4" />
                {user.status === 'Blocked' ? 'Unblock Node' : 'Terminate Node'}
            </Button>
             <Button variant="outline" onClick={handlePasswordReset} className="h-10 rounded-xl border-white/10 text-white/60 hover:text-white">
              <Mail className="mr-2 h-4 w-4" />
              Reset Access
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                     <Button variant="destructive" className="h-10 rounded-xl bg-orange-600 hover:bg-orange-700 font-bold">
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Purge Data
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#030408] border-white/10 text-white rounded-3xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Full Ledger Purge?</AlertDialogTitle>
                    <AlertDialogDescription className="text-white/40">
                      This action will permanently delete all transaction history and reset the wallet nodes for this user. This is irreversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-transparent border-white/10 text-white/40">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetData} className="bg-destructive hover:bg-destructive/90 text-white font-bold px-8">Confirm Purge</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-2xl">
            <CardHeader className="pb-8 pt-8">
              <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24 border-4 border-primary/20 rounded-[2.5rem] shadow-2xl overflow-hidden">
                      <AvatarImage src={user.photoURL} className="object-cover" />
                      <AvatarFallback className="bg-primary/10 text-primary text-3xl font-black">
                          {user.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                      <CardTitle className="text-3xl font-black text-white tracking-tight">{user.name}</CardTitle>
                      <CardDescription className="text-white/30 font-bold uppercase text-[10px] tracking-[2px]">{user.email}</CardDescription>
                      <div className="flex gap-2">
                          <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] font-black tracking-widest px-3 py-1 rounded-lg">
                              {user.status === 'Blocked' ? 'OFFLINE' : 'OPERATIONAL'}
                          </Badge>
                          <Badge variant="outline" className="border-white/5 text-white/20 text-[9px] font-black px-3 rounded-lg uppercase">VIP: {user.role === 'subadmin' ? 'SYSTEM ADM' : 'INVESTOR'}</Badge>
                      </div>
                  </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-8 px-8">
              <InfoBox title="Current Balance" value={`₹${(user.walletBalance || 0).toLocaleString()}`} icon={Wallet} />
              <InfoBox title="Active Assets" value={`₹${(user.totalInvestment || 0).toLocaleString()}`} icon={Briefcase} />
              <InfoBox title="Total Revenue" value={`₹${(user.totalIncome || 0).toLocaleString()}`} icon={TrendingUp} color="text-green-400" />
            </CardContent>
          </Card>

          <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-[2rem] shadow-2xl overflow-hidden group">
              <CardHeader className="bg-white/[0.01] border-b border-white/[0.05] py-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[4px] text-white/40 flex items-center gap-2">
                      <IdCard size={14} className="text-primary" /> Identity Ledger (KYC)
                  </CardTitle>
                  {(user.panImage || user.aadhaarImage) && (
                      <Button variant="ghost" size="icon" onClick={() => setIsPreviewOpen(true)} className="h-8 w-8 text-primary hover:bg-primary/10">
                        <ImageIcon size={16} />
                      </Button>
                  )}
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                   <div className="space-y-4">
                       <KycInfoRow label="PAN Node" value={user.panCard || 'NOT LINKED'} icon={Fingerprint} mono />
                       <KycInfoRow label="Aadhaar Node" value={user.aadhaarNumber || 'NOT LINKED'} icon={FileCheck} mono />
                       <KycInfoRow label="Contact Link" value={user.phoneNumber || 'NOT LINKED'} icon={Phone} />
                   </div>
                   <Separator className="bg-white/5" />
                   <div className="flex justify-between items-center">
                        <div className="space-y-0.5">
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Verification Status</p>
                            <p className={cn("text-xs font-black uppercase", user.kycStatus === 'Verified' ? 'text-green-400' : 'text-amber-500')}>
                                {user.kycStatus || 'NOT SUBMITTED'}
                            </p>
                        </div>
                        {user.kycStatus === 'Verified' && <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.2)]"><ShieldCheck size={20}/></div>}
                   </div>
                   {user.kycStatus === 'Verified' && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setIsReKycDialogOpen(true)}
                            className="w-full border-amber-500/20 text-amber-500 hover:bg-amber-500/10 font-black text-[9px] uppercase h-8 rounded-lg mt-2"
                        >
                            <RefreshCcw size={12} className="mr-2" /> Request Re-Verification
                        </Button>
                    )}
              </CardContent>
          </Card>
      </div>

      <Tabs defaultValue="history" className="w-full">
        <TabsList className="bg-white/5 border-white/10 p-1.5 h-16 rounded-[1.5rem] w-full max-w-2xl mx-auto flex gap-2">
          <TabsTrigger value="history" className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[9px] data-[state=active]:bg-white/10 data-[state=active]:text-primary">Ledger</TabsTrigger>
          <TabsTrigger value="investments" className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[9px] data-[state=active]:bg-white/10 data-[state=active]:text-primary">Assets</TabsTrigger>
          <TabsTrigger value="loans" className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[9px] data-[state=active]:bg-white/10 data-[state=active]:text-primary">Debts</TabsTrigger>
          <TabsTrigger value="deposits" className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[9px] data-[state=active]:bg-white/10 data-[state=active]:text-primary">Inflow</TabsTrigger>
          <TabsTrigger value="withdrawals" className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[9px] data-[state=active]:bg-white/10 data-[state=active]:text-primary">Outflow</TabsTrigger>
        </TabsList>

        <div className="mt-8">
            <TabsContent value="history" className="animate-in slide-in-from-bottom-2 duration-500">
                <HistoryTable
                    headers={['Protocol Flow', 'Value']}
                    items={walletHistory}
                    renderRow={(item: WalletHistoryEntry) => (
                        <TableRow key={item.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                        <TableCell className="pl-6 py-4">
                            <p className="text-sm font-bold text-white/80">{item.category}</p>
                            <p className="text-[9px] text-white/30 uppercase font-black tracking-widest">{item.description}</p>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                            <div className="flex flex-col items-end">
                                <span className={cn("text-sm font-black tracking-tighter", item.type === 'credit' ? 'text-green-400' : 'text-red-400')}>
                                    {item.type === 'credit' ? '+' : '-'}₹{item.amount.toLocaleString()}
                                </span>
                                <span className="text-[9px] text-white/20 uppercase font-bold">{formatDate(item.createdAt)}</span>
                            </div>
                        </TableCell>
                        </TableRow>
                    )}
                />
            </TabsContent>

            <TabsContent value="investments" className="animate-in slide-in-from-bottom-2 duration-500">
            <HistoryTable
                headers={['Investment Node', 'Financial Path', 'Decision']}
                items={investments}
                renderRow={(item: Investment) => (
                        <TableRow key={item.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                        <TableCell className="pl-6 py-4 font-bold text-white/80">{item.planName}</TableCell>
                        <TableCell>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-white/60">
                                    ₹{(item.investedAmount || 0).toLocaleString()} <ArrowRight size={10} className="inline mx-1"/> ₹{(item.returnAmount || 0).toLocaleString()}
                                </span>
                                <span className="text-[9px] text-white/20 font-black uppercase mt-1">Start: {formatDate(item.startDate)}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                            {item.status === 'Active' ? (
                                <Button variant="ghost" size="sm" onClick={() => handleStopInvestment(item)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 font-black text-[9px] uppercase h-8 rounded-lg border border-red-500/20">
                                    TERMINATE NODE
                                </Button>
                            ) : (
                                <Badge variant={getStatusVariant(item.status)} className="text-[9px] font-black uppercase px-3 h-6">{item.status}</Badge>
                            )}
                        </TableCell>
                        </TableRow>
                    )}
                />
            </TabsContent>

            <TabsContent value="loans" className="animate-in slide-in-from-bottom-2 duration-500 space-y-4">
                {loans && loans.length > 0 ? loans.map(loan => (
                    <LoanDetails key={loan.id} user={user} loan={loan} onCompleteLoan={handleCompleteLoan} onConfirmEmi={handleConfirmEmiPayment} />
                )) : <div className="text-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-[2rem] text-white/20 italic text-sm">No liabilities detected on this node.</div>}
            </TabsContent>

            <TabsContent value="deposits" className="animate-in slide-in-from-bottom-2 duration-500">
                <HistoryTable
                headers={['Value', 'Reference ID', 'Decision']}
                items={deposits}
                renderRow={(item: Transaction) => (
                    <TableRow key={item.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                    <TableCell className="pl-6 py-4">
                        <div className="font-black text-white/80">₹{(item.amount || 0).toLocaleString()}</div>
                        <div className="text-[9px] text-white/20 uppercase font-black">{formatDate(item.createdAt)}</div>
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-white/40 tracking-widest">{item.transactionId || 'INTERNAL_TRANS'}</TableCell>
                    <TableCell className="text-right pr-6">
                        <Badge variant={getStatusVariant(item.status)} className="text-[9px] font-black uppercase px-3 h-6">{item.status}</Badge>
                    </TableCell>
                    </TableRow>
                )}
                />
            </TabsContent>

            <TabsContent value="withdrawals" className="animate-in slide-in-from-bottom-2 duration-500">
                <HistoryTable
                headers={['Value', 'Pipeline Status', 'Action']}
                items={withdrawals}
                renderRow={(item: Transaction) => (
                    <TableRow key={item.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                    <TableCell className="pl-6 py-4">
                        <div className="font-black text-red-400">-₹{(item.finalAmount ?? item.amount).toLocaleString()}</div>
                        <div className="text-[9px] text-white/20 uppercase font-black">{formatDate(item.createdAt)}</div>
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-col gap-1">
                            <Badge variant={getStatusVariant(item.status)} className="w-fit text-[9px] font-black uppercase px-2 h-5">{item.status}</Badge>
                            <WithdrawalStatus tx={item} />
                        </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-primary"><HistoryIcon size={14}/></Button>
                    </TableCell>
                    </TableRow>
                )}
                />
            </TabsContent>
        </div>
      </Tabs>

      {/* KYC Image Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem] max-w-4xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">KYC Node Preview</DialogTitle>
                    <DialogDescription className="text-white/40">Review uploaded documents for {user.name}.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">PAN CARD IMAGE</Label>
                        <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                            {user.panImage ? (
                                <Image src={user.panImage} alt="PAN" fill className="object-contain" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-white/10 italic text-xs">No PAN image linked</div>
                            )}
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-accent/60">AADHAAR CARD IMAGE</Label>
                        <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                             {user.aadhaarImage ? (
                                <Image src={user.aadhaarImage} alt="Aadhaar" fill className="object-contain" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-white/10 italic text-xs">No Aadhaar image linked</div>
                            )}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">Close Preview</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
       </Dialog>

       <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Identity Rejection</DialogTitle>
            <DialogDescription className="text-white/40 text-xs">
              Provide a clear reason for denying this node's verification request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g. Identity blur or mismatched data..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="bg-white/5 border-white/10"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" className="text-white/40">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" className="rounded-xl font-bold px-8" onClick={handleConfirmRejection}>Confirm Denial</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Re-KYC Dialog */}
      <Dialog open={isReKycDialogOpen} onOpenChange={setIsReKycDialogOpen}>
        <DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem]">
            <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase tracking-tight">Identity Protocol Reset</DialogTitle>
                <DialogDescription className="text-white/40 text-xs">
                    This will invalidate the user's current verified status and require them to re-upload documents.
                </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-amber-500/60">Reason for Re-Verification</Label>
                    <Textarea 
                        placeholder="e.g. Identity documents expired or require higher resolution updates..."
                        value={reKycReason}
                        onChange={e => setReKycReason(e.target.value)}
                        className="bg-white/5 border-white/10 h-32 rounded-xl"
                    />
                </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild><Button variant="ghost" className="text-white/40">Abort</Button></DialogClose>
                <Button 
                    onClick={handleRequestReKyc}
                    className="rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white px-8"
                >
                    Authorize Re-KYC Notice
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KycInfoRow({ label, value, icon: Icon, mono }: { label: string, value: string, icon: any, mono?: boolean }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white/40">
                <Icon size={14} className="shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
            </div>
            <span className={cn("text-xs font-bold text-white/80", mono && "font-mono")}>{value}</span>
        </div>
    );
}

function InfoBox({ title, value, icon: Icon, color }: { title: string, value: string, icon: React.ElementType, color?: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-4 group hover:bg-white/[0.04] transition-all">
      <div className="flex items-center justify-between text-white/20">
          <p className="text-[9px] font-black uppercase tracking-widest">{title}</p>
          <Icon className="h-4 w-4" />
      </div>
      <p className={cn("text-xl font-black tracking-tighter text-white truncate", color)}>{value}</p>
    </div>
  );
}

function HistoryTable({ headers, items, renderRow }: { headers: string[], items: any[] | null | undefined, renderRow: (item: any) => React.ReactNode }) {
  return (
    <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-2xl">
        <Table>
            <TableHeader className="bg-white/[0.02]">
                <TableRow className="border-white/10 hover:bg-transparent">
                    {headers.map((h, i) => (
                        <TableHead key={h} className={cn(
                            "text-[10px] font-black uppercase tracking-widest text-white/30 py-5",
                            i === 0 ? "pl-6" : i === headers.length - 1 ? "pr-6 text-right" : ""
                        )}>
                            {h}
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {items && items.length > 0 ? items.map(renderRow) : (
                    <TableRow className="border-transparent">
                        <TableCell colSpan={headers.length} className="text-center py-20 text-white/10 italic text-sm">No transaction sequences detected.</TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    </Card>
  );
}

function LoanDetails({ loan, user, onCompleteLoan, onConfirmEmi }: { loan: ActiveLoan; user: UserData; onCompleteLoan: (id: string, amt: number) => void; onConfirmEmi: (l: ActiveLoan, i: number) => void; }) {
  const { toast } = useToast();
  const totalRepayment = loan.totalPayable + (loan.penalty || 0);

  const handleSendReminder = () => {
    if (!user || !user.phoneNumber) {
        toast({ variant: 'destructive', title: 'Phone Not Found', description: "Node missing phone link." });
        return;
    }

    const nextPendingEmi = loan.repaymentMethod === 'EMI' ? loan.emis?.find(e => e.status !== 'Paid') : null;
    const emiAmount = nextPendingEmi?.emiAmount || totalRepayment;
    const dueDateStr = nextPendingEmi ? new Date(nextPendingEmi.dueDate.seconds * 1000).toLocaleDateString() : (loan.dueDate ? loan.dueDate.toDate().toLocaleDateString() : 'N/A');
    
    let message = `🔔 *Loan Repayment Reminder* 🔔\n\n`;
    message += `Dear *${user.name}*,\n\n`;
    message += `This is a reminder for your active loan installment for *${loan.planName}*.\n\n`;
    message += `💰 *Installment Amount:* ₹${emiAmount.toFixed(2)}\n`;
    if (loan.penalty && loan.penalty > 0) message += `⚠️ *Late Penalty:* ₹${loan.penalty.toFixed(2)}\n`;
    message += `🗓️ *Due Date:* ${dueDateStr}\n\n`;
    message += `Grow Money - Your Wealth Partner 💰`;

    window.open(`https://wa.me/91${user.phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-2xl">
      <CardHeader className="bg-white/[0.01] border-b border-white/[0.05] pb-4">
        <div className="flex justify-between items-center">
            <div>
                <CardTitle className="text-white text-lg font-bold tracking-tight">{loan.planName}</CardTitle>
                <CardDescription className="text-[10px] font-black uppercase text-white/20 tracking-widest mt-0.5">#{loan.id.slice(-8).toUpperCase()}</CardDescription>
            </div>
            <Badge variant={getStatusVariant(loan.status)} className="text-[10px] font-black uppercase h-6 px-3">{loan.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6 px-8 pb-8 space-y-6">
        <div className="grid grid-cols-2 gap-4">
             <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                <p className="text-[9px] text-white/20 uppercase tracking-widest font-black mb-1">Principal Debt</p>
                <p className="text-sm font-bold text-white">₹{(loan.loanAmount || 0).toLocaleString()}</p>
            </div>
             <div className="bg-black/20 p-3 rounded-2xl border border-white/5 text-right">
                <p className="text-[9px] text-white/20 uppercase tracking-widest font-black mb-1">Total Settlement</p>
                <p className="text-sm font-black text-red-400">₹{totalRepayment.toLocaleString()}</p>
            </div>
        </div>

        {loan.repaymentMethod === 'Direct' ? (
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[9px] text-white/20 uppercase font-black">Settlement Window</p>
                <p className="text-xs font-bold text-white/70">Due: {formatDate(loan.dueDate)}</p>
              </div>
            {loan.status === 'Payment Pending' && (
                <Button onClick={() => onCompleteLoan(loan.id, totalRepayment)} className="bg-green-600 hover:bg-green-700 h-10 px-6 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-green-500/20">
                    <CheckCircle size={14} className="mr-2" /> VERIFY RECEIPT
                </Button>
            )}
          </div>
        ) : loan.repaymentMethod === 'EMI' && loan.emis ? (
          <Collapsible className="w-full">
            <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full h-12 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest">
                    REPAYMENT SCHEDULE <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2">
              <Table>
                <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="text-[9px] font-black uppercase text-white/20 py-3">Installment</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-white/20">Deadline</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-white/20 text-right">Protocol</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {loan.emis.map((emi, index) => (
                        <TableRow key={index} className="border-white/[0.02] hover:bg-white/[0.01]">
                            <TableCell className="font-bold text-white/80 py-3">₹{emi.emiAmount.toFixed(2)}</TableCell>
                            <TableCell className="text-[10px] text-white/30 font-bold">{formatDate(emi.dueDate)}</TableCell>
                            <TableCell className="text-right">
                                {emi.status === 'Payment Pending' ? (
                                    <Button size="sm" onClick={() => onConfirmEmi(loan, index)} className="h-7 px-3 rounded-lg bg-green-600 font-black text-[9px] uppercase">CONFIRM</Button>
                                ) : (
                                    <Badge variant={getStatusVariant(emi.status)} className="text-[8px] h-5 font-black uppercase">{emi.status}</Badge>
                                )}
                            </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </CollapsibleContent>
          </Collapsible>
        ) : <div className="text-center p-4 border border-dashed border-white/10 rounded-2xl text-[10px] uppercase font-black text-white/10 tracking-[3px]">Protocol Details Missing</div>}
        
        {['Active', 'Due'].includes(loan.status) && (
            <Button onClick={handleSendReminder} variant="outline" className="w-full h-12 rounded-xl border-green-500/20 bg-green-500/5 hover:bg-green-600 hover:text-white text-green-500 font-black text-[10px] uppercase tracking-widest shadow-xl transition-all">
                <Send className="mr-3 h-4 w-4" /> BROADCAST REPAYMENT ALERT
            </Button>
        )}
      </CardContent>
    </Card>
  );
}
