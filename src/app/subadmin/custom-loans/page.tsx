'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, Send, Banknote, Landmark, Timer } from 'lucide-react';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import {
  doc,
  updateDoc,
  Timestamp,
  serverTimestamp,
  getDoc,
  runTransaction,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { addDays, differenceInDays } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

type CustomLoanRequest = {
  id: string;
  userId: string;
  userName: string;
  requestedAmount: number;
  requestedDuration: number;
  paymentMethod?: 'Bank' | 'UPI';
  bankDetails?: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
  };
  upiId?: string;
  status: 'pending_admin_review' | 'pending_user_approval' | 'approved_by_user' | 'active' | 'completed' | 'rejected_by_user' | 'rejected_by_admin' | 'payment_pending' | 'extension_pending';
  interestRate?: number;
  interestAmount?: number;
  totalRepayment?: number;
  rejectionReason?: string;
  createdAt: Timestamp;
  dueDate?: Timestamp;
  penalty?: number;
  extensionRequestedDays?: number;
};

type UserData = {
  id: string;
  panCard?: string;
  aadhaarNumber?: string;
  phoneNumber?: string;
  kycStatus?: 'Not Submitted' | 'Pending' | 'Verified' | 'Rejected';
};

type AdminSettings = {
    customLoanInterestLow?: number;
    customLoanInterestHigh?: number;
    customLoanThreshold?: number;
    customLoanPenalty?: number;
}

const formatDate = (timestamp?: Timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleString();
};

export default function CustomLoansPage() {
  const { data: requests, loading: requestsLoading } = useCollection<CustomLoanRequest>('customLoanRequests');
  const { data: adminSettings, loading: settingsLoading } = useDoc<AdminSettings>('settings/admin');
  const firestore = useFirestore();
  const { toast } = useToast();

  const [requestToUpdate, setRequestToUpdate] = useState<CustomLoanRequest | null>(null);
  const [userKycData, setUserKycData] = useState<UserData | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isExtensionDialogOpen, setIsExtensionDialogOpen] = useState(false);
  const [extensionFee, setExtensionFee] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending_admin_review' | 'pending_user_approval' | 'approved_by_user' | 'active' | 'completed' | 'rejected' | 'payment_pending' | 'extension_pending'>('pending_admin_review');

  const [calculatedInterestInfo, setCalculatedInterestInfo] = useState<{
    dailyInterest: number;
    totalInterest: number;
    totalRepayment: number;
    interestRate: number;
  } | null>(null);
  
  const loading = requestsLoading || settingsLoading;

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    const sorted = [...requests].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

    // Calculate dynamic penalties
    const processed = sorted.map(r => {
        if (r.status === 'active' && r.dueDate && adminSettings?.customLoanPenalty) {
            const now = new Date();
            const due = r.dueDate.toDate();
            if (now > due) {
                const daysLate = differenceInDays(now, due);
                const accruedPenalty = daysLate * adminSettings.customLoanPenalty;
                return { ...r, penalty: accruedPenalty };
            }
        }
        return r;
    });

    if (filterStatus === 'all') return processed;
    if (filterStatus === 'rejected') return processed.filter(r => r.status === 'rejected_by_admin' || r.status === 'rejected_by_user');
    return processed.filter((r) => r.status === filterStatus);
  }, [requests, filterStatus, adminSettings]);


  const openApproveDialog = async (request: CustomLoanRequest) => {
    setRequestToUpdate(request);
    
    const threshold = adminSettings?.customLoanThreshold ?? 5000;
    const lowRate = adminSettings?.customLoanInterestLow ?? 5;
    const highRate = adminSettings?.customLoanInterestHigh ?? 8;

    const ratePer1k = request.requestedAmount < threshold ? lowRate : highRate;
    const dailyInterest = (request.requestedAmount / 1000) * ratePer1k;
    const totalInterest = dailyInterest * request.requestedDuration;
    const totalRepayment = request.requestedAmount + totalInterest;
    const interestRate = (totalInterest / request.requestedAmount) * 100;

    setCalculatedInterestInfo({
        dailyInterest,
        totalInterest,
        totalRepayment,
        interestRate,
    });
    
    try {
        const userRef = doc(firestore, 'users', request.userId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            setUserKycData({ id: userDoc.id, ...userDoc.data() } as UserData);
        } else {
            setUserKycData(null);
            toast({ title: 'User data not found', variant: 'destructive'});
        }
    } catch(e) {
        setUserKycData(null);
        toast({ title: 'Error fetching user data', variant: 'destructive'});
    }

    setIsApproveDialogOpen(true);
  };

  const handleApproveExtension = async () => {
    if (!requestToUpdate || !requestToUpdate.dueDate) return;
    const fee = parseFloat(extensionFee) || 0;
    const extraDays = requestToUpdate.extensionRequestedDays || 0;

    const requestRef = doc(firestore, 'customLoanRequests', requestToUpdate.id);
    const newDueDate = addDays(requestToUpdate.dueDate.toDate(), extraDays);
    const newTotalRepayment = (requestToUpdate.totalRepayment || 0) + fee;

    const updateData = {
      status: 'active' as const,
      dueDate: Timestamp.fromDate(newDueDate),
      totalRepayment: newTotalRepayment,
      extensionApprovedAt: serverTimestamp(),
      lastExtensionFee: fee,
      lastExtensionDays: extraDays
    };

    try {
      await updateDoc(requestRef, updateData);
      toast({ title: "Extension Approved" });
      setIsExtensionDialogOpen(false);
      setRequestToUpdate(null);
    } catch (e) {
      toast({ title: "Update Failed", variant: "destructive" });
    }
  };

  const handleMarkAsCompleted = async (request: CustomLoanRequest) => {
    const requestRef = doc(firestore, 'customLoanRequests', request.id);
    const settingsRef = doc(firestore, 'settings', 'admin');

    try {
        await runTransaction(firestore, async (transaction) => {
            const settingsDoc = await transaction.get(settingsRef);
            if (!settingsDoc.exists()) {
                transaction.update(requestRef, { status: 'completed' });
                return;
            }

            const settingsData = settingsDoc.data();
            const currentUsage = settingsData.currentCustomLoanUsage || 0;
            const newUsage = Math.max(0, currentUsage - request.requestedAmount);

            transaction.update(requestRef, { status: 'completed' });
            transaction.update(settingsRef, { currentCustomLoanUsage: newUsage });
        });

        toast({ title: 'Loan Completed'});
    } catch(e: any) {
        toast({ title: 'Completion Failed', variant: 'destructive'});
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Custom Loan Actions</h2>
      </div>

       <Tabs value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}>
            <TabsList className="flex-wrap justify-start h-auto">
                <TabsTrigger value="pending_admin_review">New Requests</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="extension_pending">Extensions</TabsTrigger>
                <TabsTrigger value="payment_pending">Confirm Pay</TabsTrigger>
                <TabsTrigger value="all">History</TabsTrigger>
            </TabsList>
        </Tabs>

      <div className="rounded-lg border mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Name</TableHead>
              <TableHead>Loan Amount</TableHead>
              <TableHead>Due Total</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
            ) : filteredRequests.length > 0 ? (
              filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{request.userName}</TableCell>
                  <TableCell>₹{request.requestedAmount.toFixed(2)}</TableCell>
                   <TableCell>
                    <div className="font-semibold text-white">₹{((request.totalRepayment || 0) + (request.penalty || 0)).toFixed(2)}</div>
                    {request.penalty && <div className="text-[10px] text-red-500 font-bold uppercase tracking-widest">+ ₹{request.penalty.toFixed(2)} Penalty</div>}
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(request.dueDate)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                        {request.status === 'pending_admin_review' && (
                            <Button size="sm" onClick={() => openApproveDialog(request)}><Check className="mr-2 h-4 w-4" />Approve</Button>
                        )}
                        {request.status === 'extension_pending' && (
                          <Button size="sm" onClick={() => { setRequestToUpdate(request); setIsExtensionDialogOpen(true); }}>
                            <Timer className="mr-2 h-4 w-4" /> Review Extension
                          </Button>
                        )}
                        {request.status.toLowerCase() === 'payment_pending' && (
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleMarkAsCompleted(request)}>
                                Confirm Receipt
                            </Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                 <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                        No active nodes found for {filterStatus}.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Extension Approval Dialog */}
      <Dialog open={isExtensionDialogOpen} onOpenChange={setIsExtensionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Extension</DialogTitle>
            <DialogDescription>Set extension fee for <strong>{requestToUpdate?.userName}</strong>.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Extension Fee (INR)</Label>
              <Input type="number" value={extensionFee} onChange={e => setExtensionFee(e.target.value)} placeholder="e.g. 500" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleApproveExtension}>Authorize Extension</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
