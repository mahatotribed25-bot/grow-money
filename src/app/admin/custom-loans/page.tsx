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
import { Card } from '@/components/ui/card';
import { 
    Check, 
    X, 
    Send, 
    Landmark, 
    Timer, 
    QrCode, 
    Copy, 
    ShieldCheck, 
    MessageSquare, 
    BellRing,
    HeartHandshake,
    AlertCircle,
    ShieldAlert,
    TrendingUp
} from 'lucide-react';
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { addDays } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { cn } from '@/lib/utils';

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
  name: string;
  phoneNumber?: string;
  trustScore?: number;
  kycStatus?: string;
};

type AdminSettings = {
    customLoanInterestPer1000?: number;
    totalCustomLoanLimit?: number;
    currentCustomLoanUsage?: number;
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
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);
  const [isCompletionNotificationOpen, setIsCompletionNotificationOpen] = useState(false);
  
  // Editable offer fields
  const [editInterestRate, setEditInterestRate] = useState('');
  const [editTotalRepayment, setEditTotalRepayment] = useState('');

  const [filterStatus, setFilterStatus] = useState<'all' | 'pending_admin_review' | 'pending_user_approval' | 'approved_by_user' | 'active' | 'completed' | 'rejected' | 'payment_pending' | 'extension_pending'>('pending_admin_review');

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
    
    // Auto-calculate suggested terms
    const ratePer1k = request.requestedAmount < 5000 ? 5 : 8;
    const dailyInterest = (request.requestedAmount / 1000) * ratePer1k;
    const totalInterest = dailyInterest * request.requestedDuration;
    const totalRepayment = request.requestedAmount + totalInterest;
    const interestRate = (totalInterest / request.requestedAmount) * 100;

    setEditInterestRate(interestRate.toFixed(2));
    setEditTotalRepayment(totalRepayment.toFixed(2));
    
    try {
        const userDoc = await getDoc(doc(firestore, 'users', request.userId));
        if (userDoc.exists()) setUserKycData({ id: userDoc.id, ...userDoc.data() } as UserData);
    } catch(e) {}
    setIsApproveDialogOpen(true);
  };

  const openPaymentDialog = async (request: CustomLoanRequest) => {
    setRequestToUpdate(request);
    try {
        const userDoc = await getDoc(doc(firestore, 'users', request.userId));
        if (userDoc.exists()) setUserKycData({ id: userDoc.id, ...userDoc.data() } as UserData);
    } catch(e) {}
    setIsPaymentDialogOpen(true);
  };

  const handleSendOffer = () => {
    if (!requestToUpdate) return;
    const requestRef = doc(firestore, 'customLoanRequests', requestToUpdate.id);
    
    const rate = parseFloat(editInterestRate);
    const repayment = parseFloat(editTotalRepayment);
    const intAmount = repayment - requestToUpdate.requestedAmount;

    const updateData = {
        status: 'pending_user_approval' as const,
        interestRate: rate,
        interestAmount: intAmount,
        totalRepayment: repayment,
        adminApprovedAt: serverTimestamp(),
    };
    
    updateDoc(requestRef, updateData)
        .then(() => {
            toast({ title: 'Offer Sent to User' });
            setIsApproveDialogOpen(false);
        })
        .catch(async () => {
            const permissionError = new FirestorePermissionError({
                path: requestRef.path,
                operation: 'update',
                requestResourceData: updateData
            });
            errorEmitter.emit('permission-error', permissionError);
        });
  };

  const handleMarkAsSent = () => {
    if (!requestToUpdate) return;
    const request = requestToUpdate;
    const requestRef = doc(firestore, 'customLoanRequests', request.id);
    const settingsRef = doc(firestore, 'settings', 'admin');
    
    runTransaction(firestore, async (transaction) => {
        const settingsDoc = await transaction.get(settingsRef);
        const currentUsage = settingsDoc.data()?.currentCustomLoanUsage || 0;
        const totalLimit = settingsDoc.data()?.totalCustomLoanLimit || 0;

        if (totalLimit > 0 && currentUsage + request.requestedAmount > totalLimit) {
            throw new Error("Platform fund limit reached!");
        }

        const dueDate = addDays(new Date(), request.requestedDuration);
        transaction.update(requestRef, { 
            status: 'active', 
            activatedAt: serverTimestamp(), 
            dueDate: Timestamp.fromDate(dueDate) 
        });
        transaction.update(settingsRef, { currentCustomLoanUsage: currentUsage + request.requestedAmount });
    })
    .then(() => {
        toast({ title: 'Loan Activated' });
        setIsPaymentDialogOpen(false);
        setIsNotificationDialogOpen(true);
    })
    .catch((e: any) => {
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
    });
  };

  const handleMarkAsCompleted = async (request: CustomLoanRequest) => {
    const requestRef = doc(firestore, 'customLoanRequests', request.id);
    const settingsRef = doc(firestore, 'settings', 'admin');
    
    runTransaction(firestore, async (transaction) => {
        const settingsDoc = await transaction.get(settingsRef);
        const currentUsage = settingsDoc.data()?.currentCustomLoanUsage || 0;
        transaction.update(requestRef, { status: 'completed', settledAt: serverTimestamp() });
        transaction.update(settingsRef, { currentCustomLoanUsage: Math.max(0, currentUsage - request.requestedAmount) });
    })
    .then(() => {
        toast({ title: 'Loan Completed' });
        setIsCompletionNotificationOpen(true);
    })
    .catch(() => toast({ title: 'Error settling loan', variant: 'destructive'}));
  };

  const handleWhatsAppNotify = (request: CustomLoanRequest, user: UserData | null) => {
      if (!user?.phoneNumber) return;
      const message = `Hello *${request.userName}*, your Loan of *₹${request.requestedAmount}* is approved and money has been sent. Thank you!`;
      window.open(`https://wa.me/91${user.phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const upiDeeplink = requestToUpdate?.upiId ? `upi://pay?pa=${requestToUpdate.upiId}&pn=${encodeURIComponent(requestToUpdate.userName)}&am=${requestToUpdate.requestedAmount.toFixed(2)}&cu=INR` : '';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Flexible Loans</h2>
            <p className="text-xs text-white/40">Review and manage custom loan applications.</p>
          </div>
      </div>
       <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <TabsList className="bg-white/5 border-white/10 p-1 rounded-xl h-11 flex-wrap">
                <TabsTrigger value="pending_admin_review" className="text-[10px] font-black uppercase">New Requests</TabsTrigger>
                <TabsTrigger value="approved_by_user" className="text-[10px] font-black uppercase">Ready to Pay</TabsTrigger>
                <TabsTrigger value="active" className="text-[10px] font-black uppercase">Active Loans</TabsTrigger>
                <TabsTrigger value="payment_pending" className="text-[10px] font-black uppercase">Verify Receipt</TabsTrigger>
                <TabsTrigger value="all" className="text-[10px] font-black uppercase">All History</TabsTrigger>
            </TabsList>
        </Tabs>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-white/[0.03]">
            <TableRow className="border-white/5">
                <TableHead className="text-[10px] font-black uppercase text-white/30 pl-6">Borrower</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-white/30">Amount</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-white/30">Interest / Fee</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-white/30">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-white/30 text-right pr-6">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20 text-white/20 font-black">Syncing...</TableCell></TableRow>
            ) : filteredRequests.map((request) => (
                <TableRow key={request.id} className="border-white/5 hover:bg-white/[0.02]">
                  <TableCell className="font-bold py-4 pl-6">
                      {request.userName}
                      <p className="text-[8px] text-white/20 uppercase font-black tracking-widest">{formatDate(request.createdAt)}</p>
                  </TableCell>
                  <TableCell>
                      <div className="flex flex-col">
                          <span className="font-black text-white">₹{request.requestedAmount.toLocaleString()}</span>
                          <span className="text-[10px] text-white/40 font-bold">{request.requestedDuration} Days</span>
                      </div>
                  </TableCell>
                  <TableCell>
                      <div className="flex flex-col text-[10px] font-bold">
                          <span className="text-red-400">ROI: ₹{request.interestAmount?.toFixed(2) || '---'}</span>
                          <span className="text-white/20">Final: ₹{request.totalRepayment?.toFixed(2) || '---'}</span>
                      </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-2">
                        {request.status === 'pending_admin_review' && (
                            <Button size="sm" type="button" onClick={() => openApproveDialog(request)} className="h-8 rounded-lg font-black text-[10px] bg-primary">REVIEW & OFFER</Button>
                        )}
                        {request.status === 'approved_by_user' && (
                            <Button size="sm" type="button" onClick={() => openPaymentDialog(request)} className="h-8 rounded-lg font-black text-[10px] bg-green-600">SEND MONEY</Button>
                        )}
                        {(request.status === 'payment_pending' || request.status === 'active') && (
                            <Button size="sm" type="button" onClick={() => handleMarkAsCompleted(request)} variant="outline" className="h-8 rounded-lg font-black text-[10px] border-white/10 hover:bg-white/5">CONFIRM SETTLEMENT</Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody></Table>
      </div>

      {/* Review Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem]">
          <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase">Loan Review</DialogTitle>
              <DialogDescription className="text-xs text-white/40">Set the custom interest and repayment amount below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
              {userKycData && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex justify-between items-center">
                    <div>
                        <p className="text-[9px] font-black uppercase text-white/20">User Trust Score</p>
                        <p className="text-sm font-bold">{userKycData.trustScore || 500} / 900</p>
                    </div>
                    <Badge variant="outline" className="text-[8px] uppercase">{userKycData.kycStatus}</Badge>
                </div>
              )}
              
              <div className="space-y-4">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-4 shadow-inner">
                      <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase text-white/30">Principal Amount</span>
                          <span className="text-lg font-black">₹{requestToUpdate?.requestedAmount}</span>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-white/40">Interest Rate (%)</Label>
                        <Input type="number" value={editInterestRate} onChange={e => setEditInterestRate(e.target.value)} className="bg-white/5 border-white/10 h-11 font-bold text-red-400" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-white/40">Final Repayment (₹)</Label>
                        <Input type="number" value={editTotalRepayment} onChange={e => setEditTotalRepayment(e.target.value)} className="bg-white/5 border-white/10 h-11 font-black text-green-400" />
                      </div>
                  </div>
              </div>
          </div>
          <DialogFooter><Button onClick={handleSendOffer} type="button" className="w-full h-12 rounded-xl font-black bg-primary">SEND OFFER TO USER</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dispatch Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem] max-w-sm">
            <DialogHeader>
                <DialogTitle className="text-center font-black uppercase">Send Funds</DialogTitle>
                <DialogDescription className="text-center text-white/40 text-xs">Send exact amount to user's UPI.</DialogDescription>
            </DialogHeader>
            <div className="py-8 space-y-6">
                <div className="flex flex-col items-center gap-4">
                    <div className="bg-white p-3 rounded-2xl">
                        <Image
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiDeeplink)}`}
                            alt="UPI QR"
                            width={180}
                            height={180}
                        />
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-black text-white/20 uppercase">Pay User Now</p>
                        <p className="text-3xl font-black text-green-400">₹{requestToUpdate?.requestedAmount.toFixed(2)}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <Label className="text-[10px] font-black text-white/20 uppercase pl-1">Target UPI ID</Label>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center">
                        <span className="font-mono text-sm font-bold text-white/80">{requestToUpdate?.upiId || 'NO UPI ID'}</span>
                        <Button variant="ghost" type="button" size="icon" onClick={() => navigator.clipboard.writeText(requestToUpdate?.upiId || '')} className="h-8 w-8"><Copy size={14}/></Button>
                    </div>
                </div>

                <Button onClick={handleMarkAsSent} type="button" className="w-full h-14 rounded-2xl bg-primary text-white font-black">I HAVE PAID (START LOAN)</Button>
            </div>
        </DialogContent>
      </Dialog>

      {/* Offer Sent Notification */}
      <Dialog open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}>
        <DialogContent className="bg-[#030408] border-white/10 text-white rounded-2xl max-w-sm">
            <DialogHeader>
                <DialogTitle className="text-center font-black uppercase">Success!</DialogTitle>
                <DialogDescription className="text-center text-white/40 text-xs">Notify the user about the payment.</DialogDescription>
            </DialogHeader>
            <div className="py-6">
                <Button onClick={() => handleWhatsAppNotify(requestToUpdate!, userKycData)} className="w-full h-14 rounded-xl bg-green-600 font-bold uppercase gap-2">
                    <MessageSquare size={18} /> Notify on WhatsApp
                </Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_admin_review': return <Badge variant="outline" className="text-[8px] font-black border-yellow-500/20 text-yellow-500 uppercase">Analysis</Badge>;
      case 'pending_user_approval': return <Badge variant="outline" className="text-[8px] font-black border-blue-500/20 text-blue-400 uppercase">Offer Sent</Badge>;
      case 'approved_by_user': return <Badge variant="outline" className="text-[8px] font-black border-primary/20 text-primary uppercase">Ready to Fund</Badge>;
      case 'active': return <Badge variant="outline" className="text-[8px] font-black border-green-500/20 text-green-400 uppercase">Running</Badge>;
      case 'payment_pending': return <Badge variant="outline" className="text-[8px] font-black border-amber-500/30 text-amber-400 uppercase">Verification</Badge>;
      case 'completed': return <Badge variant="outline" className="text-[8px] font-black border-white/5 text-white/20 uppercase">Settled</Badge>;
      default: return <Badge className="text-[8px] uppercase">{status}</Badge>;
    }
};
