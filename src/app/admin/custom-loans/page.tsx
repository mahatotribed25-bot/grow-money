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
    Mail, 
    BellRing,
    ExternalLink,
    PartyPopper,
    HeartHandshake
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
import { Textarea } from '@/components/ui/textarea';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { addDays } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';

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
  email?: string;
  kycStatus?: 'Not Submitted' | 'Pending' | 'Verified' | 'Rejected';
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

  const openPaymentDialog = async (request: CustomLoanRequest) => {
    setRequestToUpdate(request);
    try {
        const userRef = doc(firestore, 'users', request.userId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) setUserKycData({ id: userDoc.id, ...userDoc.data() } as UserData);
    } catch(e) { console.error(e); }
    setIsPaymentDialogOpen(true);
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

  const handleMarkAsSent = async () => {
    if (!requestToUpdate) return;
    const request = requestToUpdate;
    const requestRef = doc(firestore, 'customLoanRequests', request.id);
    const settingsRef = doc(firestore, 'settings', 'admin');
    
    runTransaction(firestore, async (transaction) => {
        const settingsDoc = await transaction.get(settingsRef);
        const totalLimit = settingsDoc.data()?.totalCustomLoanLimit || 0;
        const currentUsage = settingsDoc.data()?.currentCustomLoanUsage || 0;
        if (totalLimit > 0 && currentUsage + request.requestedAmount > totalLimit) throw new Error("Platform limit exceeded");

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
        toast({ title: 'Activation Failed', description: e.message, variant: 'destructive' });
    });
  };

  const handleWhatsAppNotify = (request: CustomLoanRequest, user: UserData | null) => {
      if (!user?.phoneNumber) {
          toast({ title: "Phone number missing", variant: "destructive" });
          return;
      }
      const message = `🚀 *Grow Money: Flexible Loan Approval* 🚀\n\nHello *${request.userName}*,\n\nWe are pleased to inform you that your *Flexible Loan* of *₹${request.requestedAmount.toLocaleString()}* has been approved!\n\n💰 The funds have been successfully dispatched to your account.\n🗓️ Tenure: ${request.requestedDuration} Days\n\nYou can track your loan status and repayment schedule in the *My Loans* section of the app.\n\nThank you for choosing *Grow Money*! 🙏`;
      window.open(`https://wa.me/91${user.phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleEmailNotify = (request: CustomLoanRequest, user: UserData | null) => {
    if (!user?.email) {
        toast({ title: "Email address missing", variant: "destructive" });
        return;
    }
    const subject = `Flexible Loan Approved - Grow Money`;
    const body = `Hello ${request.userName},\n\nYour Flexible Loan request for INR ${request.requestedAmount.toLocaleString()} has been approved.\n\nThe amount has been credited to your specified account.\n\nLoan Details:\n- Amount: INR ${request.requestedAmount}\n- Duration: ${request.requestedDuration} Days\n- Repayment: INR ${request.totalRepayment?.toFixed(2)}\n\nPlease login to your dashboard for more details.\n\nRegards,\nGrow Money Team`;
    window.location.href = `mailto:${user.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  
  const handleMarkAsCompleted = async (request: CustomLoanRequest) => {
    setRequestToUpdate(request);
    // Fetch user details for notification
    try {
        const userRef = doc(firestore, 'users', request.userId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) setUserKycData({ id: userDoc.id, ...userDoc.data() } as UserData);
    } catch(e) { console.error(e); }

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
        setIsCompletionNotificationOpen(true);
    })
    .catch((e) => {
        toast({ title: 'Error marking completed', variant: 'destructive'});
    });
  };

  const handleWhatsAppCompletionNotify = (request: CustomLoanRequest, user: UserData | null) => {
      if (!user?.phoneNumber) {
          toast({ title: "Phone number missing", variant: "destructive" });
          return;
      }
      const message = `✅ *Grow Money: Loan Settled* ✅\n\nHello *${request.userName}*,\n\nWe are pleased to inform you that your loan has been successfully completed.\n\n*आपका लोन सफलतापूर्वक समाप्त हो गया है। प्लेटफॉर्म से लोन लेने के लिए आपका बहुत-बहुत धन्यवाद!* 🙏\n\nWe look forward to serving you again! 💰\n\n*Grow Money Team*`;
      window.open(`https://wa.me/91${user.phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleEmailCompletionNotify = (request: CustomLoanRequest, user: UserData | null) => {
    if (!user?.email) {
        toast({ title: "Email address missing", variant: "destructive" });
        return;
    }
    const subject = `Loan Successfully Settled - Grow Money`;
    const body = `Hello ${request.userName},\n\nThis is to confirm that your loan has been successfully settled and completed in our records.\n\nThank you for choosing Grow Money for your financial needs. We appreciate your timely repayments.\n\nआपका लोन सफलतापूर्वक समाप्त हो गया है। प्लेटफॉर्म से लोन लेने के लिए आपका बहुत-बहुत धन्यवाद!\n\nRegards,\nGrow Money Administration`;
    window.location.href = `mailto:${user.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleCopyToClipboard = (text?: string, label?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: `${label} Copied!` });
  };

  const upiDeeplink = requestToUpdate?.upiId ? `upi://pay?pa=${requestToUpdate.upiId}&pn=${encodeURIComponent(requestToUpdate.userName)}&am=${requestToUpdate.requestedAmount.toFixed(2)}&cu=INR` : '';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">Custom Loans Registry</h2></div>
       <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <TabsList className="bg-white/5 border-white/10 p-1 rounded-xl h-11 flex-wrap">
                <TabsTrigger value="pending_admin_review" className="text-[10px] font-black uppercase">Pending Review</TabsTrigger>
                <TabsTrigger value="approved_by_user" className="text-[10px] font-black uppercase">To Be Sent</TabsTrigger>
                <TabsTrigger value="active" className="text-[10px] font-black uppercase">Active Nodes</TabsTrigger>
                <TabsTrigger value="payment_pending" className="text-[10px] font-black uppercase">Verify Receipt</TabsTrigger>
                <TabsTrigger value="all" className="text-[10px] font-black uppercase">History</TabsTrigger>
            </TabsList>
        </Tabs>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-white/[0.03]">
            <TableRow className="border-white/5">
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">Borrower</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">Capital</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">Node Info</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30 text-right pr-6">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20 animate-pulse text-white/20 font-black">SYNCING LEDGER...</TableCell></TableRow>
            ) : filteredRequests.map((request) => (
                <TableRow key={request.id} className="border-white/5 hover:bg-white/[0.02]">
                  <TableCell className="font-bold py-4">
                      {request.userName}
                      <p className="text-[8px] text-white/20 uppercase font-black tracking-widest">{formatDate(request.createdAt)}</p>
                  </TableCell>
                  <TableCell>
                      <div className="flex flex-col">
                          <span className="font-black text-white">₹{request.requestedAmount.toLocaleString()}</span>
                          <span className="text-[10px] text-white/40 font-bold">{request.requestedDuration} Days Term</span>
                      </div>
                  </TableCell>
                  <TableCell>
                      <div className="flex flex-col text-[10px] font-bold text-white/30">
                          <span>ROI: {request.interestRate?.toFixed(2)}%</span>
                          <span>DUE: {request.dueDate ? request.dueDate.toDate().toLocaleDateString() : 'TBD'}</span>
                      </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-2">
                        {request.status === 'pending_admin_review' && (
                            <Button size="sm" onClick={() => openApproveDialog(request)} className="h-8 rounded-lg font-black text-[10px] bg-primary">ANALYZE & OFFER</Button>
                        )}
                        {request.status === 'approved_by_user' && (
                            <Button size="sm" onClick={() => openPaymentDialog(request)} className="h-8 rounded-lg font-black text-[10px] bg-green-600">DISPATCH FUNDS</Button>
                        )}
                        {request.status === 'active' && (
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openPaymentDialog(request)} title="Notification Controls" className="h-8 w-8 text-primary hover:bg-primary/10">
                                    <BellRing size={14} />
                                </Button>
                                <Button size="sm" onClick={() => handleMarkAsCompleted(request)} variant="outline" className="h-8 rounded-lg font-black text-[10px] border-white/10 hover:bg-white/5">SETTLE</Button>
                            </div>
                        )}
                        {request.status === 'payment_pending' && (
                            <Button size="sm" onClick={() => handleMarkAsCompleted(request)} variant="outline" className="h-8 rounded-lg font-black text-[10px] border-white/10 hover:bg-white/5">CONFIRM RECEIPT</Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody></Table>
      </div>

      {/* Analysis Modal */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem]">
          <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight">Node Approval Protocol</DialogTitle>
              <DialogDescription className="text-xs text-white/40">Review borrower KYC and calculate risk factors.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
              {userKycData && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                    <p className="text-[9px] font-black uppercase text-white/20 tracking-widest">ID Verification</p>
                    <p className="text-sm font-bold">PAN: {userKycData.panCard || 'PENDING'}</p>
                    <p className="text-sm font-bold">PHONE: {userKycData.phoneNumber}</p>
                    <p className="text-xs text-white/40">EMAIL: {userKycData.email}</p>
                </div>
              )}
              {calculatedInterestInfo && (
                <Card className="bg-primary/10 border-primary/20 rounded-2xl p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-primary/60">Asset Capital</span>
                        <span className="text-xl font-black">₹{requestToUpdate?.requestedAmount}</span>
                    </div>
                    <div className="flex justify-between items-center text-red-400">
                        <span className="text-[10px] font-black uppercase">Matching Interest</span>
                        <span className="text-xl font-black">₹{calculatedInterestInfo.totalInterest.toFixed(2)}</span>
                    </div>
                    <Separator className="bg-primary/20" />
                    <div className="flex justify-between items-center text-white">
                        <span className="text-[10px] font-black uppercase tracking-widest">Settlement Goal</span>
                        <span className="text-2xl font-black tracking-tighter">₹{calculatedInterestInfo.totalRepayment.toFixed(2)}</span>
                    </div>
                </Card>
              )}
          </div>
          <DialogFooter><Button onClick={handleApprove} className="w-full h-12 rounded-xl font-black bg-primary">AUTHORIZE OFFER BROADCAST</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispatch Modal */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem] max-w-sm">
            <DialogHeader>
                <DialogTitle className="text-center font-black uppercase tracking-tight">Fund Dispatch Protocol</DialogTitle>
                <DialogDescription className="text-center text-white/40 text-xs">Execute manual transfer to borrower node.</DialogDescription>
            </DialogHeader>
            <div className="py-8 space-y-8">
                <div className="flex flex-col items-center gap-4">
                    <div className="bg-white p-3 rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                        <Image
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiDeeplink)}`}
                            alt="UPI QR"
                            width={180}
                            height={180}
                        />
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[3px]">Amount to Send</p>
                        <p className="text-3xl font-black text-green-400 tracking-tighter">₹{requestToUpdate?.requestedAmount.toFixed(2)}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <Label className="text-[10px] font-black text-white/20 uppercase tracking-widest pl-1">Borrower Payment Addr</Label>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center group">
                        <span className="font-mono text-sm font-bold text-white/80">{requestToUpdate?.upiId || 'NO UPI ID'}</span>
                        <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(requestToUpdate?.upiId, 'UPI ID')} className="h-8 w-8 hover:bg-white/10">
                            <Copy size={14} className="text-primary" />
                        </Button>
                    </div>
                </div>

                <div className="space-y-3">
                    <Button asChild className="w-full h-12 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] shadow-xl">
                        <a href={upiDeeplink}>
                            <QrCode size={16} className="mr-2" /> Launch UPI Terminal
                        </a>
                    </Button>
                    <Button onClick={handleMarkAsSent} className="w-full h-14 rounded-2xl bg-primary text-white font-black shadow-2xl shadow-primary/20">
                        <ShieldCheck size={18} className="mr-2" /> I HAVE PAID (ACTIVATE NODE)
                    </Button>
                </div>
            </div>
        </DialogContent>
      </Dialog>

      {/* Notification Modal (Approval) */}
      <Dialog open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}>
        <DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem] max-w-sm">
            <DialogHeader>
                <div className="mx-auto h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary mb-4">
                    <BellRing size={24} />
                </div>
                <DialogTitle className="text-center font-black uppercase tracking-tight">Broadcast Approval</DialogTitle>
                <DialogDescription className="text-center text-white/40 text-[10px] uppercase tracking-widest">Alert borrower of successful funding</DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-2">
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Protocol Message</p>
                    <p className="text-xs text-white/60 leading-relaxed italic">"Your flexible loan has been approved and funds dispatched to your account."</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <Button 
                        onClick={() => requestToUpdate && handleWhatsAppNotify(requestToUpdate, userKycData)}
                        className="h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-green-600/10"
                    >
                        <MessageSquare size={18} /> Notify via WhatsApp
                    </Button>
                    <Button 
                        onClick={() => requestToUpdate && handleEmailNotify(requestToUpdate, userKycData)}
                        variant="outline"
                        className="h-14 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl"
                    >
                        <Mail size={18} className="text-primary" /> Notify via Email ID
                    </Button>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="ghost" className="w-full text-white/20 text-[10px] font-black uppercase hover:text-white">Skip for now</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Completion Notification Modal */}
      <Dialog open={isCompletionNotificationOpen} onOpenChange={setIsCompletionNotificationOpen}>
        <DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem] max-w-sm">
            <DialogHeader>
                <div className="mx-auto h-12 w-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent mb-4">
                    <HeartHandshake size={24} />
                </div>
                <DialogTitle className="text-center font-black uppercase tracking-tight">Settlement Verified</DialogTitle>
                <DialogDescription className="text-center text-white/40 text-[10px] uppercase tracking-widest">Express gratitude for using the protocol</DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-2">
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Protocol Gratitude</p>
                    <p className="text-xs text-white/60 leading-relaxed italic">"आपका लोन सफलतापूर्वक समाप्त हो गया है। प्लेटफॉर्म से लोन लेने के लिए आपका बहुत-बहुत धन्यवाद!"</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <Button 
                        onClick={() => requestToUpdate && handleWhatsAppCompletionNotify(requestToUpdate, userKycData)}
                        className="h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-green-600/10"
                    >
                        <MessageSquare size={18} /> Send Thanks (WhatsApp)
                    </Button>
                    <Button 
                        onClick={() => requestToUpdate && handleEmailCompletionNotify(requestToUpdate, userKycData)}
                        variant="outline"
                        className="h-14 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl"
                    >
                        <Mail size={18} className="text-primary" /> Send Official Notice
                    </Button>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="ghost" className="w-full text-white/20 text-[10px] font-black uppercase hover:text-white">Skip Gratitude</Button>
                </DialogClose>
            </DialogFooter>
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
      case 'payment_pending': return <Badge variant="outline" className="text-[8px] font-black border-white/10 text-white/40 uppercase">Awaiting Verification</Badge>;
      case 'extension_pending': return <Badge variant="outline" className="text-[8px] font-black border-amber-500/20 text-amber-500 uppercase">Extension Requested</Badge>;
      case 'completed': return <Badge variant="outline" className="text-[8px] font-black border-white/5 text-white/20 uppercase">Settled</Badge>;
      default: return <Badge className="text-[8px] uppercase">{status}</Badge>;
    }
};
