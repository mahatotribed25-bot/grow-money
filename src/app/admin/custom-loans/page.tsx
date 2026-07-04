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
import { addDays, isAfter } from 'date-fns';
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
    customLoanInterestPer1000?: number;
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
    if (filterStatus === 'all') return sorted;
    if (filterStatus === 'rejected') return sorted.filter(r => r.status === 'rejected_by_admin' || r.status === 'rejected_by_user');
    return sorted.filter((r) => r.status === filterStatus);
  }, [requests, filterStatus]);

  const openApproveDialog = async (request: CustomLoanRequest) => {
    setRequestToUpdate(request);
    const interestPer1000 = adminSettings?.customLoanInterestPer1000 || 5;
    const dailyInterest = (request.requestedAmount / 1000) * interestPer1000;
    const totalInterest = dailyInterest * request.requestedDuration;
    const totalRepayment = request.requestedAmount + totalInterest;
    const interestRate = (totalInterest / request.requestedAmount) * 100;

    setCalculatedInterestInfo({ dailyInterest, totalInterest, totalRepayment, interestRate });
    
    try {
        const userRef = doc(firestore, 'users', request.userId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) setUserKycData({ id: userDoc.id, ...userDoc.data() } as UserData);
    } catch(e) { console.error(e); }
    setIsApproveDialogOpen(true);
  };

  const handleApprove = () => {
    if (!requestToUpdate || !calculatedInterestInfo) return;
    const requestRef = doc(firestore, 'customLoanRequests', requestToUpdate.id);
    const updateData = {
        status: 'pending_user_approval' as const,
        interestRate: calculatedInterestInfo.interestRate,
        interestAmount: calculatedInterestInfo.totalInterest,
        totalRepayment: calculatedInterestInfo.totalRepayment,
        adminApprovedAt: serverTimestamp(),
    };
    
    updateDoc(requestRef, updateData)
        .then(() => {
            toast({ title: 'Offer Sent' });
            setIsApproveDialogOpen(false);
        })
        .catch(async (e) => {
            const permissionError = new FirestorePermissionError({
                path: requestRef.path,
                operation: 'update',
                requestResourceData: updateData
            });
            errorEmitter.emit('permission-error', permissionError);
        });
  };

  const handleMarkAsSent = async (request: CustomLoanRequest) => {
    const requestRef = doc(firestore, 'customLoanRequests', request.id);
    const settingsRef = doc(firestore, 'settings', 'admin');
    
    runTransaction(firestore, async (transaction) => {
        const settingsDoc = await transaction.get(settingsRef);
        const totalLimit = settingsDoc.data()?.totalCustomLoanLimit || 0;
        const currentUsage = settingsDoc.data()?.currentCustomLoanUsage || 0;
        if (totalLimit > 0 && currentUsage + request.requestedAmount > totalLimit) throw new Error("Limit exceeded");

        const dueDate = addDays(new Date(), request.requestedDuration);
        transaction.update(requestRef, { status: 'active', activatedAt: serverTimestamp(), dueDate: Timestamp.fromDate(dueDate) });
        transaction.update(settingsRef, { currentCustomLoanUsage: currentUsage + request.requestedAmount });
    })
    .then(() => {
        toast({ title: 'Loan Activated' });
    })
    .catch((e: any) => {
        toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    });
  };
  
  const handleMarkAsCompleted = async (request: CustomLoanRequest) => {
    const requestRef = doc(firestore, 'customLoanRequests', request.id);
    const settingsRef = doc(firestore, 'settings', 'admin');
    
    runTransaction(firestore, async (transaction) => {
        const settingsDoc = await transaction.get(settingsRef);
        const currentUsage = settingsDoc.data()?.currentCustomLoanUsage || 0;
        transaction.update(requestRef, { status: 'completed' });
        transaction.update(settingsRef, { currentCustomLoanUsage: Math.max(0, currentUsage - request.requestedAmount) });
    })
    .then(() => {
        toast({ title: 'Loan Completed' });
    })
    .catch((e) => {
        toast({ title: 'Error marking completed', variant: 'destructive'});
    });
  };

  const handleApproveExtension = () => {
    if (!requestToUpdate || !requestToUpdate.dueDate) return;
    const fee = parseFloat(extensionFee) || 0;
    const extraDays = requestToUpdate.extensionRequestedDays || 0;
    const requestRef = doc(firestore, 'customLoanRequests', requestToUpdate.id);
    const newDueDate = addDays(requestToUpdate.dueDate.toDate(), extraDays);
    const updateData = { 
        status: 'active', 
        dueDate: Timestamp.fromDate(newDueDate), 
        totalRepayment: (requestToUpdate.totalRepayment || 0) + fee 
    };

    updateDoc(requestRef, updateData)
        .then(() => {
            setIsExtensionDialogOpen(false);
            toast({ title: "Extended" });
        })
        .catch(async (e) => {
            const permissionError = new FirestorePermissionError({
                path: requestRef.path,
                operation: 'update',
                requestResourceData: updateData
            });
            errorEmitter.emit('permission-error', permissionError);
        });
  };

  const handleShareOnWhatsApp = async (request: CustomLoanRequest) => {
    try {
        const userDoc = await getDoc(doc(firestore, 'users', request.userId));
        if (userDoc.exists() && userDoc.data().phoneNumber) {
            const phoneNumber = userDoc.data().phoneNumber;
            const dueDate = request.dueDate ? request.dueDate.toDate().toLocaleDateString() : 'N/A';
            const totalRepaymentWithPenalty = (request.totalRepayment || 0) + (request.penalty || 0);
            
            let message = "";

            if (request.status === 'active' || request.status === 'payment_pending' || request.status === 'extension_pending') {
                const now = new Date();
                const isOverdue = request.dueDate && isAfter(now, request.dueDate.toDate());

                if (isOverdue) {
                    message = `⚠️ *URGENT: Custom Loan Overdue Notice* ⚠️\n\nDear *${request.userName}*,\n\nYour custom loan repayment is now *OVERDUE*. Please settle it immediately to avoid further penalties.\n\n*Settlement Summary:*\n-----------------------------------\n💵 *Amount:* ₹${request.requestedAmount.toFixed(2)}\n📈 *Total Payable:* ₹${totalRepaymentWithPenalty.toFixed(2)}\n🗓️ *Was Due On:* *${dueDate}*\n-----------------------------------\n\n*Grow Money* - Your trusted partner.`;
                } else {
                    message = `🔔 *Repayment Reminder: Grow Money* 🔔\n\nDear *${request.userName}*,\n\nThis is a gentle reminder regarding your active Custom Loan.\n\n*Loan Details:*\n-----------------------------------\n💵 *Amount:* ₹${request.requestedAmount.toFixed(2)}\n📈 *Repayment Due:* ₹${totalRepaymentWithPenalty.toFixed(2)}\n🗓️ *Due Date:* *${dueDate}*\n-----------------------------------\n\nThank you for choosing *Grow Money*!`;
                }
            } else if (request.status === 'completed') {
                message = `✅ *Loan Successfully Settled!* ✅\n\nDear *${request.userName}*,\n\nCongratulations! Your custom loan of *₹${request.requestedAmount.toFixed(2)}* has been fully repaid. 🥂\n\n*Grow Money* - Smart Investing.`;
            }

            if (message) {
                window.open(`https://wa.me/91${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
            }
        } else { toast({ variant: 'destructive', title: 'Phone Not Found' }); }
    } catch (e) { toast({ variant: 'destructive', title: 'Error' }); }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold">Custom Loans</h2></div>
       <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <TabsList className="flex-wrap justify-start h-auto">
                <TabsTrigger value="pending_admin_review">Pending Admin</TabsTrigger>
                <TabsTrigger value="pending_user_approval">Pending User</TabsTrigger>
                <TabsTrigger value="approved_by_user">User Approved</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="extension_pending">Extension Pending</TabsTrigger>
                <TabsTrigger value="payment_pending">Payment Pending</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
        </Tabs>
      <div className="rounded-lg border mt-4">
        <Table><TableHeader><TableRow><TableHead>User Name</TableHead><TableHead>Details</TableHead><TableHead>Interest</TableHead><TableHead>Repayment</TableHead><TableHead>Dates</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow> : filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{request.userName}</TableCell>
                  <TableCell>₹{request.requestedAmount.toFixed(2)}<br/><span className="text-xs text-muted-foreground">{request.requestedDuration} days</span></TableCell>
                  <TableCell>{request.interestRate ? `${request.interestRate.toFixed(2)}%` : 'N/A'}</TableCell>
                  <TableCell>₹{((request.totalRepayment || 0) + (request.penalty || 0)).toFixed(2)}</TableCell>
                  <TableCell className="text-xs">Created: {formatDate(request.createdAt)}<br/>Due: {formatDate(request.dueDate)}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell><div className="flex gap-2">
                        {request.status === 'pending_admin_review' && <><Button size="sm" onClick={() => openApproveDialog(request)}><Check className="h-4 w-4 mr-1" />Approve</Button><Button size="sm" variant="destructive" onClick={() => { setRequestToUpdate(request); setIsRejectDialogOpen(true); }}><X className="h-4 w-4 mr-1"/>Reject</Button></>}
                        {request.status === 'approved_by_user' && <Button size="sm" className="bg-green-600" onClick={() => handleMarkAsSent(request)}><Send className="h-4 w-4 mr-1"/>Mark as Sent</Button>}
                        {(request.status === 'active' || request.status === 'extension_pending' || request.status === 'payment_pending' || request.status === 'Due') && (
                            <div className="flex gap-2">
                                <Button size="sm" className="bg-blue-600" onClick={() => handleMarkAsCompleted(request)}><Check className="h-4 w-4 mr-1"/>Repaid</Button>
                                <Button variant="outline" size="sm" className="text-green-500" onClick={() => handleShareOnWhatsApp(request)}><Send className="h-4 w-4 mr-1" /> Notify</Button>
                            </div>
                        )}
                        {request.status === 'completed' && (
                             <Button variant="outline" size="sm" className="text-green-500" onClick={() => handleShareOnWhatsApp(request)}><Send className="h-4 w-4 mr-1" /> Settled Msg</Button>
                        )}
                    </div></TableCell>
                </TableRow>
              ))}
          </TableBody></Table>
      </div>
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Approve & Offer</DialogTitle></DialogHeader>
          {userKycData && <div className="space-y-1 p-3 border rounded text-xs"><p><strong>Status:</strong> {userKycData.kycStatus}</p><p><strong>PAN:</strong> {userKycData.panCard}</p><p><strong>Phone:</strong> {userKycData.phoneNumber}</p></div>}
          {calculatedInterestInfo && <div className="space-y-2 p-3 bg-muted rounded text-sm"><div className="flex justify-between"><span>Amount:</span><span>₹{requestToUpdate?.requestedAmount}</span></div><div className="flex justify-between"><span>Interest:</span><span className="text-red-400">₹{calculatedInterestInfo.totalInterest.toFixed(2)}</span></div><Separator/><div className="flex justify-between font-bold"><span>Total Repayment:</span><span>₹{calculatedInterestInfo.totalRepayment.toFixed(2)}</span></div></div>}
          <DialogFooter><Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>Cancel</Button><Button onClick={handleApprove}>Send Offer</Button></DialogFooter>
        </DialogContent></Dialog>
    </div>
  );
}

const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_admin_review': return <Badge variant="secondary">Pending Admin</Badge>;
      case 'pending_user_approval': return <Badge variant="outline" className="text-blue-400">Pending User</Badge>;
      case 'approved_by_user': return <Badge variant="default">User Approved</Badge>;
      case 'active': return <Badge variant="default" className="bg-green-600">Active</Badge>;
      case 'extension_pending': return <Badge variant="outline" className="text-amber-500">Ext. Req</Badge>;
      case 'completed': return <Badge variant="outline">Completed</Badge>;
      default: return <Badge>{status}</Badge>;
    }
};
