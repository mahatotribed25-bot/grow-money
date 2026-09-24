
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
  X,
  ShieldAlert,
  Settings2,
  IndianRupee,
  Save,
  Shield
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
import { Input } from '@/components/ui/input';
import Image from 'next/image';

type UserPermissions = {
    canManageDeposits?: boolean;
    canManageWithdrawals?: boolean;
    canManageKyc?: boolean;
    canManagePlanLoans?: boolean;
    canManageCustomLoans?: boolean;
    canManageMarket?: boolean;
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
  baseSalary?: number;
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
  const [baseSalary, setBaseSalary] = useState('');
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  const defaultPermissions: UserPermissions = {
    canManageDeposits: false,
    canManageWithdrawals: false,
    canManageKyc: false,
    canManagePlanLoans: false,
    canManageCustomLoans: false,
    canManageMarket: false,
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
    if (user?.baseSalary !== undefined) {
        setBaseSalary(user.baseSalary.toString());
    }
  }, [user]);

  const handlePermissionChange = (permission: keyof UserPermissions, value: boolean) => {
    setPermissions(prev => ({ ...prev, [permission]: value }));
  };

  const handleSavePermissions = async () => {
    if (!userId) return;
    setIsSavingPermissions(true);
    const userRef = doc(firestore, 'users', userId);
    const hasAnyPermission = Object.values(permissions).some(p => p === true);
    const newRole = hasAnyPermission ? 'subadmin' : 'user';

    try {
        await updateDoc(userRef, {
            permissions,
            role: newRole,
            baseSalary: parseFloat(baseSalary) || 0,
        });
        toast({
            title: 'Staff Access Updated',
            description: `${user?.name} has been updated to ${newRole.toUpperCase()}.`,
        });
        refetchUser();
    } catch (error) {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: { permissions, role: newRole },
        });
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsSavingPermissions(false);
    }
  }

  const handleToggleStatus = () => {
    if (!user) return;
    const newStatus = user.status === 'Blocked' ? 'Active' : 'Blocked';
    const userRef = doc(firestore, 'users', userId);
    const updateData = { status: newStatus };
    updateDoc(userRef, updateData).then(() => toast({ title: 'Status Updated' }));
  };

  const handleStopInvestment = (investment: Investment) => {
    if (!user || !investment || investment.status !== 'Active') return;
    const investmentRef = doc(firestore, 'users', userId, 'investments', investment.id);
    const startDate = investment.startDate.toDate();
    const now = new Date();
    const daysActive = Math.max(1, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const earnedIncome = daysActive * investment.dailyIncome;
    const finalReturn = investment.investedAmount + earnedIncome;
    const updateData = { status: 'Stopped', finalReturn, daysActive, earnedIncome };
    updateDoc(investmentRef, updateData).then(() => toast({ title: 'Investment Stopped' }));
  }

  const handleResetData = async () => {
    if (!user) return;
    try {
      const docRefsToDelete: any[] = [];
      const collectionsToClean = ['investments', 'loans', 'walletHistory'];
      for (const sub of collectionsToClean) {
          const s = await getDocs(collection(firestore, 'users', userId, sub));
          s.forEach(d => docRefsToDelete.push(d.ref));
      }
      const topColls = ['deposits', 'withdrawals', 'loanRequests', 'customLoanRequests', 'upiRequests'];
      for (const col of topColls) {
          const q = query(collection(firestore, col), where('userId', '==', userId));
          const s = await getDocs(q);
          s.forEach(d => docRefsToDelete.push(d.ref));
      }
      await runTransaction(firestore, async (transaction) => {
          const userRef = doc(firestore, 'users', userId);
          transaction.update(userRef, {
              walletBalance: 0, totalIncome: 0, totalInvestment: 0, status: 'Active', role: 'user', permissions: deleteField(),
              panCard: deleteField(), aadhaarNumber: deleteField(), phoneNumber: deleteField(), kycStatus: 'Not Submitted',
              upiStatus: 'Unverified', trustScore: 500, vipLevel: 'Bronze', baseSalary: deleteField()
          });
          docRefsToDelete.forEach(ref => transaction.delete(ref));
      });
      toast({ title: 'User Data Fully Reset' });
    } catch (error) { toast({ title: 'Error During Reset', variant: 'destructive' }); }
  }
  
  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try { await sendPasswordResetEmail(auth, user.email); toast({ title: 'Reset Email Sent' }); } catch (e) { toast({ title: 'Error', variant: 'destructive' }); }
  };

  const handleConfirmEmiPayment = (loan: ActiveLoan, emiIndex: number) => {
    if (!user || !loan.emis) return;
    const loanRef = doc(firestore, 'users', userId, 'loans', loan.id);
    const updatedEmis = loan.emis.map((emi, i) => i === emiIndex ? { ...emi, status: 'Paid' as const } : emi);
    const allPaid = updatedEmis.every(emi => emi.status === 'Paid');
    updateDoc(loanRef, { emis: updatedEmis, status: allPaid ? 'Completed' : loan.status }).then(() => toast({ title: 'EMI Payment Confirmed' }));
  }

  const handleCompleteLoan = (loanId: string, totalPayable: number) => {
    const loanRef = doc(firestore, 'users', userId, 'loans', loanId);
    updateDoc(loanRef, { status: 'Completed', amountPaid: totalPayable }).then(() => toast({ title: 'Loan Completed' }));
  };

  const handleRequestReKyc = () => {
    const userRef = doc(firestore, 'users', userId);
    updateDoc(userRef, { kycStatus: 'Not Submitted', kycRejectionReason: reKycReason || 'Identity protocol re-verification required.', kycVerifiedAt: deleteField(), kycExpiryDate: deleteField() })
        .then(() => { toast({ title: 'Identity Node Reset' }); setIsReKycDialogOpen(false); refetchUser(); });
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Timer className="animate-spin text-primary" /></div>;
  if (!user) return <p className="text-white/40 text-center py-20">User not found.</p>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-xl border-white/10 hover:bg-white/5"><ArrowLeft className="h-4 w-4" /></Button>
            <div><h2 className="text-2xl font-bold text-white">Investor Profile</h2><p className="text-[10px] font-black uppercase text-white/20 tracking-[3px]">Protocol ID: {user.id.slice(-12).toUpperCase()}</p></div>
        </div>
        <div className="flex gap-2 flex-wrap">
            <Button variant={user.status === 'Blocked' ? 'default' : 'destructive'} onClick={handleToggleStatus} className="h-10 rounded-xl font-bold"><Ban className="mr-2 h-4 w-4" />{user.status === 'Blocked' ? 'Unblock Node' : 'Terminate Node'}</Button>
             <Button variant="outline" onClick={handlePasswordReset} className="h-10 rounded-xl border-white/10 text-white/60 hover:text-white"><Mail className="mr-2 h-4 w-4" />Reset Access</Button>
            <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" className="h-10 rounded-xl bg-orange-600 hover:bg-orange-700 font-bold"><RefreshCcw className="mr-2 h-4 w-4" />Purge Data</Button></AlertDialogTrigger><AlertDialogContent className="bg-[#030408] border-white/10 text-white rounded-3xl"><AlertDialogHeader><AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Full Ledger Purge?</AlertDialogTitle><AlertDialogDescription className="text-white/40">This action will permanently delete all transaction history and reset the wallet nodes for this user.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="bg-transparent border-white/10 text-white/40">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleResetData} className="bg-destructive hover:bg-destructive/90 text-white font-bold px-8">Confirm Purge</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-2xl">
            <CardHeader className="pb-8 pt-8"><div className="flex items-center gap-6"><Avatar className="h-24 w-24 border-4 border-primary/20 rounded-[2.5rem] shadow-2xl overflow-hidden"><AvatarImage src={user.photoURL} className="object-cover" /><AvatarFallback className="bg-primary/10 text-primary text-3xl font-black">{user.name?.charAt(0) || 'U'}</AvatarFallback></Avatar><div className="space-y-2"><CardTitle className="text-3xl font-black text-white tracking-tight">{user.name}</CardTitle><CardDescription className="text-white/30 font-bold uppercase text-[10px] tracking-[2px]">{user.email}</CardDescription><div className="flex gap-2"><Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] font-black tracking-widest px-3 py-1 rounded-lg">{user.status === 'Blocked' ? 'OFFLINE' : 'OPERATIONAL'}</Badge><Badge variant="outline" className="border-white/5 text-white/20 text-[9px] font-black px-3 rounded-lg uppercase">VIP: {user.role === 'subadmin' ? 'SYSTEM ADM' : 'INVESTOR'}</Badge></div></div></div></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-8 px-8"><InfoBox title="Current Balance" value={`₹${(user.walletBalance || 0).toLocaleString()}`} icon={Wallet} /><InfoBox title="Active Assets" value={`₹${(user.totalInvestment || 0).toLocaleString()}`} icon={Briefcase} /><InfoBox title="Total Revenue" value={`₹${(user.totalIncome || 0).toLocaleString()}`} icon={TrendingUp} color="text-green-400" /></CardContent>
          </Card>
          <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-[2rem] shadow-2xl overflow-hidden group"><CardHeader className="bg-white/[0.01] border-b border-white/[0.05] py-4 flex flex-row items-center justify-between"><CardTitle className="text-[10px] font-black uppercase tracking-[4px] text-white/40 flex items-center gap-2"><IdCard size={14} className="text-primary" /> Identity Ledger (KYC)</CardTitle>{(user.panImage || user.aadhaarImage) && (<Button variant="ghost" size="icon" onClick={() => setIsPreviewOpen(true)} className="h-8 w-8 text-primary hover:bg-primary/10"><ImageIcon size={16} /></Button>)}</CardHeader><CardContent className="p-6 space-y-6"><div className="space-y-4"><KycInfoRow label="PAN Node" value={user.panCard || 'NOT LINKED'} icon={Fingerprint} mono /><KycInfoRow label="Aadhaar Node" value={user.aadhaarNumber || 'NOT LINKED'} icon={FileCheck} mono /><KycInfoRow label="Contact Link" value={user.phoneNumber || 'NOT LINKED'} icon={Phone} /></div><Separator className="bg-white/5" /><div className="flex justify-between items-center"><div className="space-y-0.5"><p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Verification Status</p><p className={cn("text-xs font-black uppercase", user.kycStatus === 'Verified' ? 'text-green-400' : 'text-amber-500')}>{user.kycStatus || 'NOT SUBMITTED'}</p></div>{user.kycStatus === 'Verified' && <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20"><ShieldCheck size={20}/></div>}</div>{user.kycStatus === 'Verified' && <Button variant="outline" size="sm" onClick={() => setIsReKycDialogOpen(true)} className="w-full border-amber-500/20 text-amber-500 hover:bg-amber-500/10 font-black text-[9px] uppercase h-8 rounded-lg mt-2"><RefreshCcw size={12} className="mr-2" /> Request Re-Verification</Button>}</CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-[2rem] shadow-2xl p-8">
                <div className="flex items-center gap-3 mb-8"><div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary"><Shield size={20}/></div><div><h3 className="text-sm font-black text-white uppercase tracking-widest">Permissions Node</h3><p className="text-[9px] font-bold text-white/20 uppercase tracking-[2px]">RBAC Access Control</p></div></div>
                <div className="space-y-5">
                    <PermissionToggle id="kyc" label="Manage Identity (KYC)" checked={permissions.canManageKyc} onChange={v => handlePermissionChange('canManageKyc', v)} />
                    <PermissionToggle id="deposits" label="Manage Deposits" checked={permissions.canManageDeposits} onChange={v => handlePermissionChange('canManageDeposits', v)} />
                    <PermissionToggle id="withdrawals" label="Manage Payouts" checked={permissions.canManageWithdrawals} onChange={v => handlePermissionChange('canManageWithdrawals', v)} />
                    <PermissionToggle id="loans" label="Standard Loan Control" checked={permissions.canManagePlanLoans} onChange={v => handlePermissionChange('canManagePlanLoans', v)} />
                    <PermissionToggle id="custom" label="Flexible Loan Control" checked={permissions.canManageCustomLoans} onChange={v => handlePermissionChange('canManageCustomLoans', v)} />
                    <PermissionToggle id="market" label="Market Management" checked={permissions.canManageMarket} onChange={v => handlePermissionChange('canManageMarket', v)} />
                    
                    <Separator className="bg-white/5 my-4" />
                    
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-white/40 ml-1">Monthly Base Salary (INR)</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 font-bold text-sm">₹</span>
                            <Input type="number" value={baseSalary} onChange={e => setBaseSalary(e.target.value)} placeholder="0.00" className="pl-8 h-12 bg-white/5 border-white/10 rounded-xl font-bold text-white" />
                        </div>
                    </div>

                    <Button 
                      onClick={handleSavePermissions} 
                      disabled={isSavingPermissions}
                      className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
                    >
                        {isSavingPermissions ? <Timer className="animate-spin mr-2" size={16}/> : <ShieldCheck className="mr-2" size={16}/>}
                        {isSavingPermissions ? 'Applying Changes...' : 'Update Access Control'}
                    </Button>
                </div>
           </Card>

           <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-[2rem] shadow-2xl p-8">
                <div className="flex items-center gap-3 mb-8"><div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400"><Settings2 size={20}/></div><div><h3 className="text-sm font-black text-white uppercase tracking-widest">Account Status</h3><p className="text-[9px] font-bold text-white/20 uppercase tracking-[2px]">System Integrity Node</p></div></div>
                <div className="space-y-6">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between"><div><p className="text-xs font-bold text-white/60">Investor Role</p><p className="text-sm font-black text-primary uppercase tracking-tighter">{user.role || 'User'}</p></div><Badge variant="outline" className="border-primary/20 text-primary text-[8px] font-black uppercase px-2 h-5">Verified</Badge></div>
                    <div className="space-y-4"><p className="text-[10px] font-black text-white/20 uppercase tracking-widest pl-1">Maintenance Tools</p><div className="grid grid-cols-2 gap-3"><Button variant="outline" onClick={handlePasswordReset} className="h-11 rounded-xl border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10">Reset Key</Button><Button variant="outline" onClick={handleToggleStatus} className={cn("h-11 rounded-xl border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10", user.status === 'Blocked' ? "text-green-400" : "text-red-400")}>{user.status === 'Blocked' ? 'Activate' : 'Suspend'}</Button></div></div>
                </div>
           </Card>
      </div>

      <Tabs defaultValue="history" className="w-full">
        <TabsList className="bg-white/5 border-white/10 p-1.5 h-16 rounded-[1.5rem] w-full max-w-2xl mx-auto flex gap-2"><TabsTrigger value="history" className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[9px] data-[state=active]:bg-white/10 data-[state=active]:text-primary">Ledger</TabsTrigger><TabsTrigger value="investments" className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[9px] data-[state=active]:bg-white/10 data-[state=active]:text-primary">Assets</TabsTrigger><TabsTrigger value="loans" className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[9px] data-[state=active]:bg-white/10 data-[state=active]:text-primary">Debts</TabsTrigger><TabsTrigger value="deposits" className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[9px] data-[state=active]:bg-white/10 data-[state=active]:text-primary">Inflow</TabsTrigger><TabsTrigger value="withdrawals" className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[9px] data-[state=active]:bg-white/10 data-[state=active]:text-primary">Outflow</TabsTrigger></TabsList>
        <div className="mt-8">
            <TabsContent value="history"><HistoryTable headers={['Protocol Flow', 'Value']} items={walletHistory} renderRow={(item: WalletHistoryEntry) => (<TableRow key={item.id} className="border-white/[0.03] hover:bg-white/[0.01]"><TableCell className="pl-6 py-4"><p className="text-sm font-bold text-white/80">{item.category}</p><p className="text-[9px] text-white/30 uppercase font-black tracking-widest">{item.description}</p></TableCell><TableCell className="text-right pr-6"><div className="flex flex-col items-end"><span className={cn("text-sm font-black tracking-tighter", item.type === 'credit' ? 'text-green-400' : 'text-red-400')}>{item.type === 'credit' ? '+' : '-'}₹{item.amount.toLocaleString()}</span><span className="text-[9px] text-white/20 uppercase font-bold">{formatDate(item.createdAt)}</span></div></TableCell></TableRow>)} /></TabsContent>
            <TabsContent value="investments"><HistoryTable headers={['Investment Node', 'Financial Path', 'Decision']} items={investments} renderRow={(item: Investment) => (<TableRow key={item.id} className="border-white/[0.03] hover:bg-white/[0.01]"><TableCell className="pl-6 py-4 font-bold text-white/80">{item.planName}</TableCell><TableCell> <div className="flex flex-col"><span className="text-xs font-bold text-white/60">₹{(item.investedAmount || 0).toLocaleString()} <ArrowRight size={10} className="inline mx-1"/> ₹{(item.returnAmount || 0).toLocaleString()}</span><span className="text-[9px] text-white/20 font-black uppercase mt-1">Start: {formatDate(item.startDate)}</span></div></TableCell><TableCell className="text-right pr-6">{item.status === 'Active' ? (<Button variant="ghost" size="sm" onClick={() => handleStopInvestment(item)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 font-black text-[9px] uppercase h-8 rounded-lg border border-red-500/20">TERMINATE NODE</Button>) : (<Badge variant={getStatusVariant(item.status)} className="text-[9px] font-black uppercase px-3 h-6">{item.status}</Badge>)}</TableCell></TableRow>)} /></TabsContent>
            <TabsContent value="loans" className="space-y-4">{loans && loans.length > 0 ? loans.map(loan => (<LoanDetails key={loan.id} user={user} loan={loan} onCompleteLoan={handleCompleteLoan} onConfirmEmi={handleConfirmEmiPayment} />)) : <div className="text-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-[2rem] text-white/20 italic text-sm">No liabilities detected.</div>}</TabsContent>
            <TabsContent value="deposits"><HistoryTable headers={['Value', 'Reference ID', 'Decision']} items={deposits} renderRow={(item: Transaction) => (<TableRow key={item.id} className="border-white/[0.03] hover:bg-white/[0.01]"><TableCell className="pl-6 py-4"><div className="font-black text-white/80">₹{(item.amount || 0).toLocaleString()}</div><div className="text-[9px] text-white/20 uppercase font-black">{formatDate(item.createdAt)}</div></TableCell><TableCell className="font-mono text-[10px] text-white/40 tracking-widest">{item.transactionId || 'INTERNAL_TRANS'}</TableCell><TableCell className="text-right pr-6"><Badge variant={getStatusVariant(item.status)} className="text-[9px] font-black uppercase px-3 h-6">{item.status}</Badge></TableCell></TableRow>)} /></TabsContent>
            <TabsContent value="withdrawals"><HistoryTable headers={['Value', 'Pipeline Status', 'Action']} items={withdrawals} renderRow={(item: Transaction) => (<TableRow key={item.id} className="border-white/[0.03] hover:bg-white/[0.01]"><TableCell className="pl-6 py-4"><div className="font-black text-red-400">-₹{(item.finalAmount ?? item.amount).toLocaleString()}</div><div className="text-[9px] text-white/20 uppercase font-black">{formatDate(item.createdAt)}</div></TableCell><TableCell><Badge variant={getStatusVariant(item.status)} className="w-fit text-[9px] font-black uppercase px-2 h-5">{item.status}</Badge></TableCell><TableCell className="text-right pr-6"><Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-primary"><HistoryIcon size={14}/></Button></TableCell></TableRow>)} /></TabsContent>
        </div>
      </Tabs>
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}><DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem] max-w-4xl"><DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tight">KYC Node Preview</DialogTitle><DialogDescription className="text-white/40">Review uploaded documents for {user.name}.</DialogDescription></DialogHeader><div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6"><div className="space-y-3"><Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">PAN CARD IMAGE</Label><div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-white/5">{user.panImage ? <Image src={user.panImage} alt="PAN" fill className="object-contain" /> : <div className="h-full w-full flex items-center justify-center text-white/10 italic text-xs">No PAN image linked</div>}</div></div><div className="space-y-3"><Label className="text-[10px] font-black uppercase tracking-widest text-accent/60">AADHAAR CARD IMAGE</Label><div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-white/5">{user.aadhaarImage ? <Image src={user.aadhaarImage} alt="Aadhaar" fill className="object-contain" /> : <div className="h-full w-full flex items-center justify-center text-white/10 italic text-xs">No Aadhaar image linked</div>}</div></div></div><DialogFooter><DialogClose asChild><Button variant="ghost">Close Preview</Button></DialogClose></DialogFooter></DialogContent></Dialog>
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}><DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem]"><DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tight">Identity Rejection</DialogTitle><DialogDescription className="text-white/40 text-xs">Provide a clear reason for denying this node's verification request.</DialogDescription></DialogHeader><div className="py-4"><Textarea placeholder="e.g. Identity blur or mismatched data..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="bg-white/5 border-white/10" /></div><DialogFooter><DialogClose asChild><Button variant="ghost" className="text-white/40">Cancel</Button></DialogClose><Button variant="destructive" className="rounded-xl font-bold px-8" onClick={() => { handleRequestReKyc(); setIsRejectDialogOpen(false); }}>Confirm Denial</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isReKycDialogOpen} onOpenChange={setIsReKycDialogOpen}><DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem]"><DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tight">Identity Protocol Reset</DialogTitle><DialogDescription className="text-white/40 text-xs">This will invalidate the user's current verified status and require them to re-upload documents.</DialogDescription></DialogHeader><div className="py-6 space-y-4"><div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-amber-500/60">Reason for Re-Verification</Label><Textarea placeholder="e.g. Identity documents expired..." value={reKycReason} onChange={e => setReKycReason(e.target.value)} className="bg-white/5 border-white/10 h-32 rounded-xl" /></div></div><DialogFooter className="gap-2 sm:gap-0"><DialogClose asChild><Button variant="ghost" className="text-white/40">Abort</Button></DialogClose><Button onClick={handleRequestReKyc} className="rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white px-8">Authorize Re-KYC Notice</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

function PermissionToggle({ id, label, checked, onChange }: { id: string, label: string, checked?: boolean, onChange: (v: boolean) => void }) {
    return (<div className="flex items-center justify-between group"><Label htmlFor={id} className="text-[11px] font-black uppercase tracking-widest text-white/60 group-hover:text-white transition-colors cursor-pointer">{label}</Label><Switch id={id} checked={checked} onCheckedChange={onChange} className="data-[state=checked]:bg-primary" /></div>);
}

function KycInfoRow({ label, value, icon: Icon, mono }: { label: string, value: string, icon: any, mono?: boolean }) {
    return (<div className="flex items-center justify-between"><div className="flex items-center gap-3 text-white/40"><Icon size={14} className="shrink-0" /><span className="text-[9px] font-black uppercase tracking-widest">{label}</span></div><span className={cn("text-xs font-bold text-white/80", mono && "font-mono")}>{value}</span></div>);
}

function InfoBox({ title, value, icon: Icon, color }: { title: string, value: string, icon: React.ElementType, color?: string }) {
  return (<div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-4 group hover:bg-white/[0.04] transition-all"><div className="flex items-center justify-between text-white/20"><p className="text-[9px] font-black uppercase tracking-widest">{title}</p><Icon className="h-4 w-4" /></div><p className={cn("text-xl font-black tracking-tighter text-white truncate", color)}>{value}</p></div>);
}

function HistoryTable({ headers, items, renderRow }: { headers: string[], items: any[] | null | undefined, renderRow: (item: any) => React.ReactNode }) {
  return (<Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-2xl"><Table><TableHeader className="bg-white/[0.02]"><TableRow className="border-white/10 hover:bg-transparent">{headers.map((h, i) => (<TableHead key={h} className={cn("text-[10px] font-black uppercase tracking-widest text-white/30 py-5", i === 0 ? "pl-6" : i === headers.length - 1 ? "pr-6 text-right" : "")}>{h}</TableHead>))}</TableRow></TableHeader><TableBody>{items && items.length > 0 ? items.map(renderRow) : (<TableRow className="border-transparent"><TableCell colSpan={headers.length} className="text-center py-20 text-white/10 italic text-sm">No transaction sequences detected.</TableCell></TableRow>)}</TableBody></Table></Card>);
}

function LoanDetails({ loan, user, onCompleteLoan, onConfirmEmi }: { loan: ActiveLoan; user: UserData; onCompleteLoan: (id: string, amt: number) => void; onConfirmEmi: (l: ActiveLoan, i: number) => void; }) {
  const totalRepayment = loan.totalPayable + (loan.penalty || 0);
  return (<Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-2xl"><CardHeader className="bg-white/[0.01] border-b border-white/[0.05] pb-4"><div className="flex justify-between items-center"><div><CardTitle className="text-white text-lg font-bold tracking-tight">{loan.planName}</CardTitle><CardDescription className="text-[10px] font-black uppercase text-white/20 tracking-widest mt-0.5">#{loan.id.slice(-8).toUpperCase()}</CardDescription></div><Badge variant={getStatusVariant(loan.status)} className="text-[10px] font-black uppercase h-6 px-3">{loan.status}</Badge></div></CardHeader><CardContent className="pt-6 px-8 pb-8 space-y-6"><div className="grid grid-cols-2 gap-4"><div className="bg-black/20 p-3 rounded-2xl border border-white/5"><p className="text-[9px] text-white/20 uppercase tracking-widest font-black mb-1">Principal Debt</p><p className="text-sm font-bold text-white">₹{(loan.loanAmount || 0).toLocaleString()}</p></div><div className="bg-black/20 p-3 rounded-2xl border border-white/5 text-right"><p className="text-[9px] text-white/20 uppercase tracking-widest font-black mb-1">Total Settlement</p><p className="text-sm font-black text-red-400">₹{totalRepayment.toLocaleString()}</p></div></div>{loan.repaymentMethod === 'Direct' ? (<div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between"><div><p className="text-[9px] text-white/20 uppercase font-black">Settlement Window</p><p className="text-xs font-bold text-white/70">Due: {formatDate(loan.dueDate)}</p></div>{loan.status === 'Payment Pending' && (<Button onClick={() => onCompleteLoan(loan.id, totalRepayment)} className="bg-green-600 hover:bg-green-700 h-10 px-6 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-green-500/20"><CheckCircle size={14} className="mr-2" /> VERIFY RECEIPT</Button>)}</div>) : (<Collapsible className="w-full"><CollapsibleTrigger asChild><Button variant="outline" className="w-full h-12 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest">REPAYMENT SCHEDULE <ChevronDown className="h-4 w-4 ml-2" /></Button></CollapsibleTrigger><CollapsibleContent className="mt-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2"><Table><TableHeader><TableRow className="border-white/5 hover:bg-transparent"><TableHead className="text-[9px] font-black uppercase text-white/20 py-3">Installment</TableHead><TableHead className="text-[9px] font-black uppercase text-white/20">Deadline</TableHead><TableHead className="text-[9px] font-black uppercase text-white/20 text-right">Protocol</TableHead></TableRow></TableHeader><TableBody>{loan.emis?.map((emi, index) => (<TableRow key={index} className="border-white/[0.02] hover:bg-white/[0.01]"><TableCell className="font-bold text-white/80 py-3">₹{emi.emiAmount.toFixed(2)}</TableCell><TableCell className="text-[10px] text-white/30 font-bold">{formatDate(emi.dueDate)}</TableCell><TableCell className="text-right">{emi.status === 'Payment Pending' ? (<Button size="sm" onClick={() => onConfirmEmi(loan, index)} className="h-7 px-3 rounded-lg bg-green-600 font-black text-[9px] uppercase">CONFIRM</Button>) : (<Badge variant={getStatusVariant(emi.status)} className="text-[8px] h-5 font-black uppercase">{emi.status}</Badge>)}</TableCell></TableRow>))}</TableBody></Table></CollapsibleContent></Collapsible>)}</CardContent></Card>);
}
