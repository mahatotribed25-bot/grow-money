
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useAuth } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Ban, RefreshCcw, Wallet, Briefcase, Download, Upload, Fingerprint, HandCoins, CheckCircle, Users2, PowerOff, Mail, CreditCard, Phone, FileCheck, ShieldCheck, ShieldX, Crown, Timer, Send } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';
import { doc, updateDoc, runTransaction, collection, getDocs, query, where, deleteField, serverTimestamp } from 'firebase/firestore';
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
import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { sendPasswordResetEmail } from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

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
};

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

type GroupLoanPlan = {
    id: string;
    loanAmount: number;
    interest: number;
    totalRepayment: number;
    amountRepaid?: number;
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
        return 'outline'
    default:
      return 'secondary';
  }
};

const permissionLabels: Record<keyof UserPermissions, string> = {
    canManageDeposits: "Manage Deposits",
    canManageWithdrawals: "Manage Withdrawals",
    canManageKyc: "Manage KYC",
    canManagePlanLoans: "Manage Plan Loans",
    canManageCustomLoans: "Manage Custom Loans",
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
                 <div className="p-2 text-xs rounded-md bg-blue-500/10 text-blue-300 space-y-1">
                    <p className="font-semibold flex items-center gap-1"><Timer size={14}/> Delay Bonus Active</p>
                    <p>User is earning ₹{tx.delayBonusAmountPerDay || 0}/day.</p>
                    <p>Days Waiting: {waitingDays}</p>
                    <p>Bonus Earned: ₹{bonusEarned.toFixed(2)}</p>
                 </div>
            )
        }
        return <p className="text-xs text-muted-foreground">The user's withdrawal is under processing.</p>
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
  
  const defaultPermissions: UserPermissions = {
    canManageDeposits: false,
    canManageWithdrawals: false,
    canManageKyc: false,
    canManagePlanLoans: false,
    canManageCustomLoans: false,
  };
  const [permissions, setPermissions] = useState<UserPermissions>(defaultPermissions);

  const { data: user, loading: userLoading, refetch: refetchUser } = useDoc<UserData>(userId ? `users/${userId}` : null);
  const { data: investments, loading: investmentsLoading } = useCollection<Investment>(userId ? `users/${userId}/investments` : null);
  const { data: loans, loading: loansLoading } = useCollection<ActiveLoan>(userId ? `users/${userId}/loans` : null);
  const { data: deposits, loading: depositsLoading } = useCollection<Transaction>(`deposits`, { where: ['userId', '==', userId] });
  const { data: withdrawals, loading: withdrawalsLoading } = useCollection<Transaction>(`withdrawals`, { where: ['userId', '==', userId]});
  const { data: groupInvestments, loading: groupInvestmentsLoading } = useUserGroupInvestments(userId);
  
  const loading = userLoading || investmentsLoading || depositsLoading || withdrawalsLoading || loansLoading || groupInvestmentsLoading;

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
    })
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
      index === emiIndex ? { ...emi, status: 'Paid' } : emi
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
  if (!user) return <p>User not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-bold">User Details</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
            <Button variant={user.status === 'Blocked' ? 'default' : 'destructive'} onClick={handleToggleStatus}>
                <Ban className="mr-2 h-4 w-4" />
                {user.status === 'Blocked' ? 'Unblock User' : 'Block User'}
            </Button>
             <Button variant="outline" onClick={handlePasswordReset}>
              <Mail className="mr-2 h-4 w-4" />
              Send Password Reset
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                     <Button variant="destructive" className="bg-orange-500 hover:bg-orange-600">
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Reset User Data
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all history and reset the wallet.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetData} className="bg-destructive hover:bg-destructive/90">Confirm</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User /> {user.name}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoBox title="User ID" value={user.id} icon={Fingerprint} />
          <InfoBox title="Wallet Balance" value={`₹${(user.walletBalance || 0).toFixed(2)}`} icon={Wallet} />
          <InfoBox title="Total Investment" value={`₹${(user.totalInvestment || 0).toFixed(2)}`} icon={Briefcase} />
          <InfoBox title="Status" value={user.status || 'Active'} icon={User} badgeVariant={getStatusVariant(user.status || 'Active')} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sub-Admin Permissions</CardTitle></CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(permissionLabels).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <Label htmlFor={key} className="font-medium">{label}</Label>
                    <Switch id={key} checked={permissions[key as keyof UserPermissions] || false} onCheckedChange={(value) => handlePermissionChange(key as keyof UserPermissions, value)} />
                </div>
            ))}
            </div>
             <Button onClick={handleSavePermissions}>Save Permissions</Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle>KYC Management</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <InfoBox title="PAN Card" value={user.panCard || 'Not Provided'} icon={CreditCard} />
          <InfoBox title="Aadhaar" value={user.aadhaarNumber || 'Not Provided'} icon={Fingerprint} />
          <InfoBox title="Phone" value={user.phoneNumber || 'Not Provided'} icon={Phone} />
          {user.kycStatus === 'Pending' ? (
            <div className="flex gap-4 pt-4">
              <Button onClick={() => handleKycApproval('Verified')}><ShieldCheck className="mr-2 h-4 w-4" /> Approve</Button>
              <Button variant="destructive" onClick={() => setIsRejectDialogOpen(true)}><ShieldX className="mr-2 h-4 w-4" /> Reject</Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Status: <span className="font-bold">{user.kycStatus || 'Not Submitted'}</span></p>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="investments">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="investments">Investments</TabsTrigger>
          <TabsTrigger value="group-investments">Groups</TabsTrigger>
          <TabsTrigger value="loans">Loans</TabsTrigger>
          <TabsTrigger value="deposits">Deposits</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
        </TabsList>
        <TabsContent value="investments">
           <HistoryTable
              headers={['Plan', 'Details', 'Status', 'Dates', 'Action']}
              items={investments}
              renderRow={(item: Investment) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.planName}</TableCell>
                      <TableCell>₹{(item.investedAmount || 0).toFixed(2)} -> ₹{(item.returnAmount || 0).toFixed(2)}</TableCell>
                      <TableCell><Badge variant={getStatusVariant(item.status)}>{item.status}</Badge></TableCell>
                      <TableCell className="text-xs">{formatDate(item.startDate)}</TableCell>
                      <TableCell>
                          {item.status === 'Active' && <Button variant="destructive" size="sm" onClick={() => handleStopInvestment(item)}><PowerOff className="mr-2 h-4 w-4" /> Stop</Button>}
                      </TableCell>
                    </TableRow>
                )}
            />
        </TabsContent>
         <TabsContent value="group-investments">
            <GroupInvestmentTable investments={groupInvestments} />
        </TabsContent>
         <TabsContent value="loans">
            {loans && loans.length > 0 ? loans.map(loan => (
                <LoanDetails key={loan.id} user={user} loan={loan} onCompleteLoan={handleCompleteLoan} onConfirmEmi={handleConfirmEmiPayment} />
            )) : <Card><CardContent className="pt-6 text-center">No history.</CardContent></Card>}
        </TabsContent>
        <TabsContent value="deposits">
             <HistoryTable
              headers={['Amount', 'Transaction ID', 'Status', 'Date']}
              items={deposits}
              renderRow={(item: Transaction) => (
                <TableRow key={item.id}>
                  <TableCell>₹{(item.amount || 0).toFixed(2)}</TableCell>
                  <TableCell>{item.transactionId || 'N/A'}</TableCell>
                  <TableCell><Badge variant={getStatusVariant(item.status)}>{item.status}</Badge></TableCell>
                  <TableCell>{formatDate(item.createdAt)}</TableCell>
                </TableRow>
              )}
            />
        </TabsContent>
        <TabsContent value="withdrawals">
             <HistoryTable
              headers={['Amount', 'Status', 'Details', 'Date']}
              items={withdrawals}
              renderRow={(item: Transaction) => (
                <TableRow key={item.id}>
                  <TableCell>₹{(item.finalAmount ?? item.amount).toFixed(2)}</TableCell>
                  <TableCell><Badge variant={getStatusVariant(item.status)}>{item.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground"><WithdrawalStatus tx={item} /></TableCell>
                  <TableCell>{formatDate(item.createdAt)}</TableCell>
                </TableRow>
              )}
            />
        </TabsContent>
      </Tabs>
      
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reason for KYC Rejection</DialogTitle></DialogHeader>
          <div className="py-4"><Textarea placeholder="e.g., PAN details do not match." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} /></div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={handleConfirmRejection}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoBox({ title, value, icon: Icon, badgeVariant }: { title: string, value: string, icon: React.ElementType, badgeVariant?: any }) {
  return (
    <div className="rounded-lg border p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between text-muted-foreground"><p className="text-sm font-medium">{title}</p><Icon className="h-4 w-4" /></div>
      {badgeVariant ? <Badge variant={badgeVariant} className="w-fit capitalize">{value}</Badge> : <p className="text-lg font-bold truncate">{value}</p>}
    </div>
  )
}

function HistoryTable({ headers, items, renderRow }: { headers: string[], items: any[] | null | undefined, renderRow: (item: any) => React.ReactNode }) {
  return (
    <Card><CardContent className="pt-6"><div className="rounded-lg border">
          <Table><TableHeader><TableRow>{headers.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{items && items.length > 0 ? items.map(renderRow) : <TableRow><TableCell colSpan={headers.length} className="text-center">No records.</TableCell></TableRow>}</TableBody>
          </Table></div></CardContent></Card>
  )
}

function LoanDetails({ loan, user, onCompleteLoan, onConfirmEmi }: { loan: ActiveLoan; user: UserData; onCompleteLoan: (id: string, amt: number) => void; onConfirmEmi: (l: ActiveLoan, i: number) => void; }) {
  const { toast } = useToast();
  const totalRepayment = loan.totalPayable + (loan.penalty || 0);

  const handleSendReminder = () => {
    if (!user || !user.phoneNumber) {
        toast({ variant: 'destructive', title: 'Phone Not Found' });
        return;
    }

    const nextPendingEmi = loan.repaymentMethod === 'EMI' ? loan.emis?.find(e => e.status !== 'Paid') : null;
    const emiAmount = nextPendingEmi?.emiAmount || totalRepayment;
    const dueDateStr = nextPendingEmi ? new Date(nextPendingEmi.dueDate.seconds * 1000).toLocaleDateString() : (loan.dueDate ? loan.dueDate.toDate().toLocaleDateString() : 'N/A');
    
    const isFirstEmi = loan.repaymentMethod === 'EMI' && loan.emis?.every(e => e.status !== 'Paid');

    let message = `🔔 *Loan Repayment Reminder* 🔔\n\n`;
    message += `Dear *${user.name}*,\n\n`;
    
    if (isFirstEmi) {
        message += `Your *FIRST installment* for *${loan.planName}* is due soon. Paying on time boosts your Trust Score! 🚀\n\n`;
    } else {
        message += `This is a reminder for your active loan installment for *${loan.planName}*.\n\n`;
    }
    
    message += `*Installment Breakdown:*\n`;
    message += `-----------------------------------\n`;
    message += `💰 *Installment Amount:* ₹${emiAmount.toFixed(2)}\n`;
    
    if (loan.penalty && loan.penalty > 0) {
        message += `⚠️ *Late Penalty:* ₹${loan.penalty.toFixed(2)}\n`;
    }
    
    message += `🗓️ *Due Date:* ${dueDateStr}\n`;
    message += `-----------------------------------\n\n`;

    if (loan.status === 'Due') {
        message += `❗ *Urgent:* Payment is now *OVERDUE*. Pay immediately to avoid more penalties.\n\n`;
    } else {
        message += `✅ Pay properly to unlock higher loan limits in the future!\n\n`;
    }

    message += `Grow Money - Your Wealth Partner 💰`;

    window.open(`https://wa.me/91${user.phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex justify-between">
          <span>{loan.planName}</span>
          <Badge variant={getStatusVariant(loan.status)}>{loan.status}</Badge>
        </CardTitle>
        <CardDescription>Principal: ₹{loan.loanAmount.toFixed(2)} | Total: ₹{totalRepayment.toFixed(2)}</CardDescription>
      </CardHeader>
      <CardContent>
        {loan.repaymentMethod === 'Direct' ? (
          <div><p>Due: {formatDate(loan.dueDate)}</p>
            {loan.status === 'Payment Pending' && <Button size="sm" onClick={() => onCompleteLoan(loan.id, totalRepayment)} className="mt-2"><CheckCircle size={16} className="mr-2" /> Confirm Payment</Button>}
          </div>
        ) : loan.repaymentMethod === 'EMI' && loan.emis ? (
          <Collapsible>
            <CollapsibleTrigger asChild><Button variant="outline" size="sm" className="w-full">Schedule <ChevronDown className="h-4 w-4 ml-2" /></Button></CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <Table><TableHeader><TableRow><TableHead>Amt</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {loan.emis.map((emi, index) => {
                      const isNextDue = loan.emis?.findIndex(e => e.status !== 'Paid') === index;
                      return (
                        <TableRow key={index} className={isNextDue ? "bg-primary/5" : ""}>
                            <TableCell>₹{emi.emiAmount.toFixed(2)}</TableCell>
                            <TableCell className="text-xs">{formatDate(emi.dueDate)}</TableCell>
                            <TableCell><Badge variant={getStatusVariant(emi.status)}>{emi.status}</Badge></TableCell>
                            <TableCell>{emi.status === 'Payment Pending' && <Button size="sm" onClick={() => onConfirmEmi(loan, index)}>Confirm</Button>}</TableCell>
                        </TableRow>
                      )
                  })}
                </TableBody>
              </Table>
            </CollapsibleContent>
          </Collapsible>
        ) : <p>No details.</p>}
        {['Active', 'Due'].includes(loan.status) && <Button onClick={handleSendReminder} variant="outline" size="sm" className="mt-4 w-full text-green-500 border-green-500/50"><Send className="mr-2 h-4 w-4" /> Send Reminder</Button>}
      </CardContent>
    </Card>
  );
}

function GroupInvestmentTableRow({ investment }: { investment: GroupInvestment }) {
    const { data: planData } = useDoc<GroupLoanPlan>(investment ? `groupLoanPlans/${investment.planId}`: null);
    const progress = planData && planData.totalRepayment > 0 ? ((planData.amountRepaid || 0) / planData.totalRepayment) * 100 : 0;
    return (
        <TableRow>
            <TableCell><div className='font-medium'>{investment.planName}</div></TableCell>
            <TableCell>₹{(investment.investedAmount || 0).toFixed(2)}</TableCell>
            <TableCell className="text-green-400">₹{(investment.amountReceived || 0).toFixed(2)}</TableCell>
            <TableCell>{planData ? <div className="w-24"><Progress value={progress} className="h-2" /><span className="text-xs">{progress.toFixed(0)}%</span></div> : '...'}</TableCell>
        </TableRow>
    );
}

function GroupInvestmentTable({ investments }: { investments: GroupInvestment[] | undefined | null }) {
    return (
        <Card><CardContent className="pt-6"><Table><TableHeader><TableRow><TableHead>Plan</TableHead><TableHead>Invested</TableHead><TableHead>Received</TableHead><TableHead>Progress</TableHead></TableRow></TableHeader>
            <TableBody>{investments && investments.length > 0 ? investments.map(inv => <GroupInvestmentTableRow key={inv.id} investment={inv} />) : <TableRow><TableCell colSpan={4} className="text-center">No investments.</TableCell></TableRow>}</TableBody>
        </Table></CardContent></Card>
    );
}
