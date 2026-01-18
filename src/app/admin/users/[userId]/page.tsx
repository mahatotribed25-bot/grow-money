
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useAuth } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Ban, RefreshCcw, Wallet, Briefcase, Download, Upload, Fingerprint, HandCoins, CheckCircle, Users2, PowerOff, Mail, CreditCard, Phone, FileCheck, ShieldCheck, ShieldX } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';
import { doc, updateDoc, writeBatch, collection, getDocs, query, where } from 'firebase/firestore';
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
  type: 'deposit' | 'withdrawal';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
  userId?: string;
}

type EMI = {
  emiAmount: number;
  dueDate: Timestamp;
  status: 'Pending' | 'Paid' | 'Due' | 'Payment Pending';
}

type ActiveLoan = {
    id: string;
    planName: string;
    loanAmount: number;
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

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: user, loading: userLoading, refetch: refetchUser } = useDoc<UserData>(userId ? `users/${userId}` : null);
  const { data: investments, loading: investmentsLoading } = useCollection<Investment>(userId ? `users/${userId}/investments` : null);
  const { data: loans, loading: loansLoading } = useCollection<ActiveLoan>(userId ? `users/${userId}/loans` : null);
  const { data: deposits, loading: depositsLoading } = useCollection<Transaction>(`deposits`, { where: ['userId', '==', userId] });
  const { data: withdrawals, loading: withdrawalsLoading } = useCollection<Transaction>(`withdrawals`, { where: ['userId', '==', userId]});
  const { data: groupInvestments, loading: groupInvestmentsLoading } = useUserGroupInvestments(userId);
  
  const loading = userLoading || investmentsLoading || depositsLoading || withdrawalsLoading || loansLoading || groupInvestmentsLoading;

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
        console.error("Error updating user status:", error);
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
        console.error(e);
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
        const batch = writeBatch(firestore);

        // Reset user wallet and stats
        const userRef = doc(firestore, 'users', userId);
        batch.update(userRef, {
            walletBalance: 0,
            totalIncome: 0,
            totalInvestment: 0,
        });

        // Delete all investments
        const investmentsRef = collection(firestore, 'users', userId, 'investments');
        const investmentsSnapshot = await getDocs(investmentsRef);
        investmentsSnapshot.forEach(doc => batch.delete(doc.ref));

        // Delete all loans
        const loansRef = collection(firestore, 'users', userId, 'loans');
        const loansSnapshot = await getDocs(loansRef);
        loansSnapshot.forEach(doc => batch.delete(doc.ref));

        // Delete all deposit and withdrawal requests
        const depositsSnapshot = await getDocs(query(collection(firestore, 'deposits'), where('userId', '==', userId)));
        depositsSnapshot.forEach(doc => batch.delete(doc.ref));
        
        const withdrawalsSnapshot = await getDocs(query(collection(firestore, 'withdrawals'), where('userId', '==', userId)));
        withdrawalsSnapshot.forEach(doc => batch.delete(doc.ref));

        const loanRequestsSnapshot = await getDocs(query(collection(firestore, 'loanRequests'), where('userId', '==', userId)));
        loanRequestsSnapshot.forEach(doc => batch.delete(doc.ref));

        batch.commit()
          .then(() => {
            toast({
                title: 'User Data Reset',
                description: `All financial data for ${user.name} has been reset.`,
            });
          })
          .catch((error) => {
            console.error("Error resetting user data:", error);
            const permissionError = new FirestorePermissionError({
                path: `users/${userId} and subcollections`,
                operation: 'write',
                requestResourceData: { action: 'reset-user-data' },
            });
            errorEmitter.emit('permission-error', permissionError);
        });

    } catch (error) {
        toast({
            title: 'Error Preparing Reset',
            description: 'Could not prepare the data reset operation.',
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
        description: `An email has been sent to ${user.email} with instructions to reset their password.`,
      });
    } catch (error) {
      console.error('Error sending password reset email:', error);
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
        toast({
          title: 'EMI Payment Confirmed',
          description: `EMI for ${loan.planName} has been marked as paid.`,
        });
      })
      .catch((e) => {
        console.error(e);
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
        toast({
          title: 'Loan Completed',
          description: 'The loan has been marked as completed.',
        });
      })
      .catch((error) => {
        console.error('Error completing loan:', error);
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
        toast({
          title: `KYC ${newStatus}`,
          description: `User KYC status has been updated.`,
        });
        if (refetchUser) refetchUser();
      })
      .catch((error) => {
        console.error('Error updating KYC status:', error);
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


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <p>User not found.</p>;
  }

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
            <Button
                variant={user.status === 'Blocked' ? 'default' : 'destructive'}
                onClick={handleToggleStatus}
            >
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
                      This action is irreversible. This will permanently delete all of the user's investment, loan, and transaction history and reset their wallet balance to zero.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetData} className="bg-destructive hover:bg-destructive/90">
                      Yes, reset data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User /> {user.name}
          </CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoBox title="User ID" value={user.id} icon={Fingerprint} />
          <InfoBox title="Wallet Balance" value={`₹${(user.walletBalance || 0).toFixed(2)}`} icon={Wallet} />
          <InfoBox title="Total Investment" value={`₹${(user.totalInvestment || 0).toFixed(2)}`} icon={Briefcase} />
          <InfoBox title="Total Income" value={`₹${(user.totalIncome || 0).toFixed(2)}`} icon={Wallet} />
          <InfoBox title="Status" value={user.status || 'Active'} icon={User} badgeVariant={getStatusVariant(user.status || 'Active')} />
           <InfoBox title="KYC Status" value={user.kycStatus || 'Not Submitted'} icon={FileCheck} badgeVariant={getStatusVariant(user.kycStatus || 'Not Submitted')} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>KYC Management</CardTitle>
          <CardDescription>Review and manage the user's KYC submission.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoBox title="PAN Card" value={user.panCard || 'Not Provided'} icon={CreditCard} />
          <InfoBox title="Aadhaar" value={user.aadhaarNumber || 'Not Provided'} icon={Fingerprint} />
          <InfoBox title="Phone" value={user.phoneNumber || 'Not Provided'} icon={Phone} />
          {user.kycStatus === 'Pending' ? (
            <div className="flex gap-4 pt-4">
              <Button onClick={() => handleKycApproval('Verified')}>
                <ShieldCheck className="mr-2 h-4 w-4" /> Approve KYC
              </Button>
              <Button variant="destructive" onClick={() => setIsRejectDialogOpen(true)}>
                 <ShieldX className="mr-2 h-4 w-4" /> Reject KYC
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Current KYC status: <span className="font-bold">{user.kycStatus || 'Not Submitted'}</span></p>
          )}
        </CardContent>
      </Card>


      <Tabs defaultValue="investments">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="investments">Investment History</TabsTrigger>
          <TabsTrigger value="group-investments">Group Investments</TabsTrigger>
          <TabsTrigger value="loans">Loan History</TabsTrigger>
          <TabsTrigger value="deposits">Deposit History</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawal History</TabsTrigger>
        </TabsList>
        <TabsContent value="investments">
           <HistoryTable
              headers={['Plan Name', 'Details', 'Status', 'Dates', 'Action']}
              items={investments}
              renderRow={(item: Investment) => {
                const wasStopped = item.finalReturn !== undefined;
                const returnAmount = wasStopped ? item.finalReturn : item.returnAmount;

                return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.planName}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                            <span className="font-semibold">Invested: ₹{(item.investedAmount || 0).toFixed(2)}</span>
                            <span className="font-semibold text-green-400">Return: ₹{(returnAmount || 0).toFixed(2)}</span>
                            {wasStopped && (
                                <span className="text-xs text-muted-foreground">
                                    (Active {item.daysActive} days, +₹{(item.earnedIncome || 0).toFixed(2)} interest)
                                </span>
                            )}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={getStatusVariant(item.status)}>{item.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs">
                            <span>Start: {formatDate(item.startDate)}</span>
                            <span>Maturity: {formatDate(item.maturityDate)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                          {item.status === 'Active' && (
                              <Button variant="destructive" size="sm" onClick={() => handleStopInvestment(item)}>
                                  <PowerOff className="mr-2 h-4 w-4" /> Stop
                              </Button>
                          )}
                      </TableCell>
                    </TableRow>
                );
              }}
            />
        </TabsContent>
         <TabsContent value="group-investments">
            <GroupInvestmentTable investments={groupInvestments} />
        </TabsContent>
         <TabsContent value="loans">
            {loans && loans.length > 0 ? loans.map(loan => (
                <LoanDetails key={loan.id} loan={loan} onCompleteLoan={handleCompleteLoan} onConfirmEmi={handleConfirmEmiPayment} />
            )) : (
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">No loan history found.</p>
                    </CardContent>
                </Card>
            )}
        </TabsContent>
        <TabsContent value="deposits">
             <HistoryTable
              headers={['Amount', 'Status', 'Date']}
              items={deposits}
              renderRow={(item: Transaction) => (
                <TableRow key={item.id}>
                  <TableCell>₹{(item.amount || 0).toFixed(2)}</TableCell>
                  <TableCell><Badge variant={getStatusVariant(item.status)} className="capitalize">{item.status}</Badge></TableCell>
                  <TableCell>{formatDate(item.createdAt)}</TableCell>
                </TableRow>
              )}
            />
        </TabsContent>
        <TabsContent value="withdrawals">
             <HistoryTable
              headers={['Amount', 'Status', 'Date']}
              items={withdrawals}
              renderRow={(item: Transaction) => (
                <TableRow key={item.id}>
                  <TableCell>₹{(item.amount || 0).toFixed(2)}</TableCell>
                  <TableCell><Badge variant={getStatusVariant(item.status)} className="capitalize">{item.status}</Badge></TableCell>
                  <TableCell>{formatDate(item.createdAt)}</TableCell>
                </TableRow>
              )}
            />
        </TabsContent>
      </Tabs>
      
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reason for KYC Rejection</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this KYC submission. The user will see this.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g., PAN card details do not match submitted documents."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => {setIsRejectDialogOpen(false); setRejectionReason('');}}>Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleConfirmRejection}>Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoBox({ title, value, icon: Icon, badgeVariant }: { title: string, value: string, icon: React.ElementType, badgeVariant?: "default" | "secondary" | "destructive" | "outline" | null | undefined }) {
  return (
    <div className="rounded-lg border p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between text-muted-foreground">
        <p className="text-sm font-medium">{title}</p>
        <Icon className="h-4 w-4" />
      </div>
      {badgeVariant ? (
        <Badge variant={badgeVariant} className="w-fit capitalize">{value}</Badge>
      ) : (
        <p className="text-lg font-bold truncate">{value}</p>
      )}
    </div>
  )
}

function HistoryTable({ headers, items, renderRow }: { headers: string[], items: any[] | null | undefined, renderRow: (item: any) => React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map(header => <TableHead key={header}>{header}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items && items.length > 0 ? (
                items.map(renderRow)
              ) : (
                <TableRow>
                  <TableCell colSpan={headers.length} className="text-center">No records found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function LoanDetails({ loan, onCompleteLoan, onConfirmEmi }: { loan: ActiveLoan; onCompleteLoan: (loanId: string, totalPayable: number) => void; onConfirmEmi: (loan: ActiveLoan, emiIndex: number) => void; }) {
  const totalRepayment = loan.totalPayable + (loan.penalty || 0);
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex justify-between">
          <span>{loan.planName}</span>
          <Badge variant={getStatusVariant(loan.status)} className="capitalize">{loan.status}</Badge>
        </CardTitle>
        <CardDescription>
          Amount: ₹{loan.loanAmount.toFixed(2)} | Total Payable: ₹{totalRepayment.toFixed(2)}
        </CardDescription>
        {loan.status === 'Due' && (
            <p className='text-destructive text-sm'>Penalty of ₹{(loan.penalty || 0).toFixed(2)} has been applied for overdue payment.</p>
        )}
      </CardHeader>
      <CardContent>
        {loan.repaymentMethod === 'Direct' ? (
          <div>
            <p>Due Date: {formatDate(loan.dueDate)}</p>
            {loan.status === 'Payment Pending' && (
              <Button size="sm" onClick={() => onCompleteLoan(loan.id, totalRepayment)} className="mt-2">
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirm Payment & Complete
              </Button>
            )}
          </div>
        ) : loan.repaymentMethod === 'EMI' && loan.emis ? (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                Show EMI Schedule
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>EMI Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loan.emis.map((emi, index) => (
                    <TableRow key={index}>
                      <TableCell>₹{emi.emiAmount.toFixed(2)}</TableCell>
                      <TableCell>{formatDate(emi.dueDate)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(emi.status)} className="capitalize">{emi.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {emi.status === 'Payment Pending' && (
                          <Button size="sm" onClick={() => onConfirmEmi(loan, index)}>
                            <CheckCircle className="mr-2 h-4 w-4" /> Mark as Paid
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <p>No repayment details available.</p>
        )}
      </CardContent>
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
        <TableRow>
            <TableCell>
                <div className='font-medium'>{investment.planName}</div>
                <div className='text-xs text-muted-foreground'>{formatDate(investment.createdAt)}</div>
            </TableCell>
            <TableCell>₹{(investment.investedAmount || 0).toFixed(2)}</TableCell>
            <TableCell className="text-cyan-400">₹{(totalProfitShare || 0).toFixed(2)}</TableCell>
            <TableCell className="text-green-400">₹{(investment.amountReceived || 0).toFixed(2)}</TableCell>
            <TableCell className="text-yellow-400">₹{(remainingAmount > 0 ? remainingAmount : 0).toFixed(2)}</TableCell>
            <TableCell>
                {planData ? (
                    <div className="w-24">
                        <Progress value={repaymentProgress} className="h-2" />
                        <span className="text-xs text-muted-foreground">{repaymentProgress.toFixed(0)}% Repaid</span>
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground">Loading...</span>
                )}
            </TableCell>
        </TableRow>
    );
}

function GroupInvestmentTable({ investments }: { investments: GroupInvestment[] | undefined | null }) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Plan</TableHead>
                                <TableHead>Invested</TableHead>
                                <TableHead>Profit</TableHead>
                                <TableHead>Received</TableHead>
                                <TableHead>Remaining</TableHead>
                                <TableHead>Loan Progress</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {investments && investments.length > 0 ? (
                                investments.map(inv => (
                                    <GroupInvestmentTableRow key={inv.id} investment={inv} />
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center">No group investments found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
