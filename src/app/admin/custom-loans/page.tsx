'use client';

import { useState, useMemo, useRef } from 'react';
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
    TrendingUp,
    Mail,
    ReceiptIndianRupee,
    Camera,
    Eye,
    ScanText,
    Loader2
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
import { addDays, differenceInDays } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  
  // Proof Fields
  adminDispatchScreenshot?: string;
  adminDispatchTid?: string;
  userPaymentScreenshot?: string;
  userPaymentTid?: string;
  paidNotificationAt?: Timestamp;
};

type UserData = {
  id: string;
  name: string;
  phoneNumber?: string;
  email?: string;
  trustScore?: number;
  kycStatus?: string;
};

type AdminSettings = {
    customLoanInterestLow?: number;
    customLoanInterestHigh?: number;
    customLoanThreshold?: number;
    totalCustomLoanLimit?: number;
    currentCustomLoanUsage?: number;
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
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);
  const [isCompletionNotificationOpen, setIsCompletionNotificationOpen] = useState(false);
  const [isExtensionDialogOpen, setIsExtensionDialogOpen] = useState(false);
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] = useState(false);
  
  const [editInterestRate, setEditInterestRate] = useState('');
  const [editTotalRepayment, setEditTotalRepayment] = useState('');
  const [extensionFee, setExtensionFee] = useState('');
  
  const [dispatchScreenshot, setDispatchScreenshot] = useState<string | null>(null);
  const [dispatchTid, setDispatchTid] = useState('');

  const [filterStatus, setFilterStatus] = useState<'all' | 'pending_admin_review' | 'pending_user_approval' | 'approved_by_user' | 'active' | 'completed' | 'rejected' | 'payment_pending' | 'extension_pending'>('pending_admin_review');

  const loading = requestsLoading || settingsLoading;

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    const sorted = [...requests].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
    
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setDispatchScreenshot(reader.result as string);
    reader.readAsDataURL(file);
  };

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
    setDispatchScreenshot(null);
    setDispatchTid('');
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
            toast({ title: "Failed to send offer", variant: "destructive" });
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
            dueDate: Timestamp.fromDate(dueDate),
            adminDispatchScreenshot: dispatchScreenshot || '',
            adminDispatchTid: dispatchTid || ''
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
        let currentUsage = 0;
        if (settingsDoc.exists()) {
            currentUsage = settingsDoc.data().currentCustomLoanUsage || 0;
        }
        transaction.update(requestRef, { status: 'completed', settledAt: serverTimestamp() });
        transaction.update(settingsRef, { currentCustomLoanUsage: Math.max(0, currentUsage - request.requestedAmount) });
    })
    .then(async () => {
        toast({ title: 'Loan Completed' });
        setIsVerificationDialogOpen(false);
        setRequestToUpdate(request);
        const userDoc = await getDoc(doc(firestore, 'users', request.userId));
        if (userDoc.exists()) setUserKycData({ id: userDoc.id, ...userDoc.data() } as UserData);
        setIsCompletionNotificationOpen(true);
    })
    .catch(() => toast({ title: 'Error settling loan', variant: 'destructive'}));
  };

  const handleWhatsAppNotify = (request: CustomLoanRequest, user: UserData | null, type: 'approval' | 'completion' = 'approval') => {
      const phone = user?.phoneNumber || '';
      if (!phone) {
          toast({ title: "Phone number not found", variant: "destructive" });
          return;
      }
      
      let message = "";
      if (type === 'approval') {
          message = `Hello *${request.userName}*, your Flexible Loan of *₹${request.requestedAmount}* has been approved and money has been sent. Thank you! 💰`;
      } else {
          message = `🚀 *Grow Money: Loan Settled!* 🚀\n\nHello *${request.userName}*,\n\nThank you for choosing *Grow Money*! Your loan has been successfully closed. It was a pleasure working with you, and we truly appreciate your timely settlement.\n\nWe look forward to supporting your future growth! 🙏💰`;
      }
      
      window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleEmailNotify = (request: CustomLoanRequest, user: UserData | null, type: 'approval' | 'completion' = 'approval') => {
      const email = user?.email || '';
      if (!email) {
          toast({ title: "Email not found", variant: "destructive" });
          return;
      }

      let subject = "";
      let body = "";

      if (type === 'approval') {
          subject = "Flexible Loan Approved - Grow Money";
          body = `Hello ${request.userName},\n\nYour flexible loan request for INR ${request.requestedAmount} has been approved and funds have been dispatched to your account.\n\nThank you for choosing Grow Money!`;
      } else {
          subject = "Loan Successfully Closed - Grow Money";
          body = `Hello ${request.userName},\n\nThank you for being part of Grow Money! Your loan has been successfully closed and archived.\n\nWe really enjoyed working with you and look forward to assisting you again in the future.\n\nBest Regards,\nTeam Grow Money`;
      }

      window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
                <TabsTrigger value="extension_pending" className="text-[10px] font-black uppercase">Extensions</TabsTrigger>
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
                <TableHead className="text-[10px] font-black uppercase text-white/30">Total Repayment</TableHead>
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
                      <div className="flex flex-col">
                          <span className="font-black text-white">₹{((request.totalRepayment || 0) + (request.penalty || 0)).toFixed(2)}</span>
                          {request.penalty ? (
                              <span className="text-[8px] text-red-500 font-bold uppercase tracking-tighter">Penalty: ₹{request.penalty.toFixed(2)}</span>
                          ) : (
                              <span className="text-[8px] text-white/20 font-bold uppercase tracking-widest">No Penalty</span>
                          )}
                      </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end items-center gap-2">
                        {request.status === 'pending_admin_review' && (
                            <Button size="sm" type="button" onClick={() => openApproveDialog(request)} className="h-8 rounded-lg font-black text-[10px] bg-primary">REVIEW & OFFER</Button>
                        )}
                        {request.status === 'extension_pending' && (
                            <Button size="sm" type="button" onClick={() => { setRequestToUpdate(request); setIsExtensionDialogOpen(true); }} className="h-8 rounded-lg font-black text-[10px] bg-amber-600">REVIEW EXTENSION</Button>
                        )}
                        {request.status === 'approved_by_user' && (
                            <Button size="sm" type="button" onClick={() => openPaymentDialog(request)} className="h-8 rounded-lg font-black text-[10px] bg-green-600">SEND MONEY</Button>
                        )}
                        {request.status === 'payment_pending' && (
                            <Button size="sm" type="button" onClick={() => { setRequestToUpdate(request); setIsVerificationDialogOpen(true); }} className="h-8 rounded-lg font-black text-[10px] bg-blue-600">VERIFY REPAYMENT</Button>
                        )}
                        {(request.status === 'active' || request.status === 'completed') && (
                            <div className="flex gap-2">
                                <Button size="sm" type="button" variant="ghost" onClick={() => handleWhatsAppNotify(request, null, 'completion')} className="h-8 w-8 text-green-500"><MessageSquare size={14}/></Button>
                                {request.status === 'active' && (
                                    <Button size="sm" type="button" onClick={() => handleMarkAsCompleted(request)} variant="outline" className="h-8 rounded-lg font-black text-[10px]">SETTLE</Button>
                                )}
                            </div>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody></Table>
      </div>

      {/* Dispatch Dialog (Admin sends money) */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem] max-w-sm">
            <DialogHeader>
                <DialogTitle className="text-center font-black uppercase">Send Funds</DialogTitle>
                <DialogDescription className="text-center text-white/40 text-xs">Send exact amount and upload proof.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[80vh] px-1">
                <div className="py-8 space-y-6">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="bg-white p-3 rounded-2xl">
                            <Image
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiDeeplink)}`}
                                alt="UPI QR"
                                width={180}
                                height={180}
                            />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-white/20 uppercase">Pay User Now</p>
                            <p className="text-3xl font-black text-green-400">₹{requestToUpdate?.requestedAmount.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center">
                            <span className="font-mono text-sm font-bold text-white/80">{requestToUpdate?.upiId || 'NO UPI ID'}</span>
                            <Button variant="ghost" type="button" size="icon" onClick={() => navigator.clipboard.writeText(requestToUpdate?.upiId || '')} className="h-8 w-8"><Copy size={14}/></Button>
                        </div>

                        <Separator className="bg-white/5" />

                        <div className="space-y-4">
                            <Label className="text-[10px] font-black text-white/20 uppercase pl-1">Payment Proof (Screenshot)</Label>
                            <input type="file" id="dispatch-upload" className="hidden" accept="image/*" onChange={handleFileChange} />
                            <Button variant="outline" type="button" onClick={() => document.getElementById('dispatch-upload')?.click()} className="w-full h-12 border-dashed border-primary/30 bg-primary/5 text-primary text-[10px] gap-2">
                                <Camera size={18} /> {dispatchScreenshot ? 'Change Photo' : 'Capture Receipt'}
                            </Button>
                            {dispatchScreenshot && <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10"><Image src={dispatchScreenshot} alt="dispatch" fill className="object-contain" /></div>}
                            
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-white/20 uppercase pl-1">Transaction ID (Optional)</Label>
                                <Input placeholder="Enter Ref/UTR ID" value={dispatchTid} onChange={e => setDispatchTid(e.target.value)} className="bg-white/5 border-white/10 h-11 rounded-xl" />
                            </div>
                        </div>
                    </div>

                    <Button onClick={handleMarkAsSent} type="button" className="w-full h-14 rounded-2xl bg-primary text-white font-black shadow-xl">I HAVE PAID (START LOAN)</Button>
                </div>
            </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Verification Dialog (Admin receives money) */}
      <Dialog open={isVerificationDialogOpen} onOpenChange={setIsVerificationDialogOpen}>
          <DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem] max-w-md">
              <DialogHeader>
                  <DialogTitle className="text-xl font-black uppercase tracking-tight">Verify Repayment</DialogTitle>
                  <DialogDescription className="text-white/40">Review user payment proof and settle the loan.</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[80vh] px-1">
                  <div className="space-y-6 py-6">
                       <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                           <div className="flex justify-between items-center">
                               <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Expected Sum</p>
                               <p className="text-2xl font-black text-green-400">₹{((requestToUpdate?.totalRepayment || 0) + (requestToUpdate?.penalty || 0)).toFixed(2)}</p>
                           </div>
                           <div className="flex justify-between items-center">
                               <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">User TID</p>
                               <p className="font-mono text-sm font-bold text-primary">{requestToUpdate?.userPaymentTid || 'No TID provided'}</p>
                           </div>
                       </div>

                       <div className="space-y-3">
                           <p className="text-[10px] font-black uppercase tracking-[3px] text-white/20">Digital Evidence</p>
                           <div className="relative aspect-[9/16] max-h-[400px] w-full rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                               {requestToUpdate?.userPaymentScreenshot ? (
                                   <Image src={requestToUpdate.userPaymentScreenshot} alt="user payment" fill className="object-contain" />
                               ) : (
                                   <div className="h-full w-full flex items-center justify-center text-white/10 italic text-xs">No screenshot uploaded by user</div>
                               )}
                           </div>
                       </div>

                       <div className="flex flex-col gap-3">
                            <Button onClick={() => requestToUpdate && handleMarkAsCompleted(requestToUpdate)} className="w-full h-14 rounded-2xl bg-green-600 text-white font-black shadow-xl">CONFIRM RECEIPT & SETTLE</Button>
                            <DialogClose asChild><Button variant="ghost" className="text-white/30">Close Audit</Button></DialogClose>
                       </div>
                  </div>
              </ScrollArea>
          </DialogContent>
      </Dialog>

      {/* Completion Notification */}
      <Dialog open={isCompletionNotificationOpen} onOpenChange={setIsCompletionNotificationOpen}>
        <DialogContent className="bg-[#030408] border-white/10 text-white rounded-3xl max-w-sm">
            <DialogHeader>
                <DialogTitle className="text-center font-black uppercase text-xl tracking-tight">Loan Closed!</DialogTitle>
                <DialogDescription className="text-center text-white/40 text-xs pt-2">Send a thank you message to the user.</DialogDescription>
            </DialogHeader>
            <div className="py-8 space-y-6">
                 <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
                    <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 shadow-lg">
                        <HeartHandshake size={32} />
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed font-medium italic">
                        "नमस्ते *${requestToUpdate?.userName}*, ग्रो मनी में जुड़ने के लिए धन्यवाद! आपका लोन सफलतापूर्वक क्लोज हो चुका है।"
                    </p>
                 </div>

                 <div className="flex flex-col gap-3">
                    <Button onClick={() => handleWhatsAppNotify(requestToUpdate!, userKycData, 'completion')} className="w-full h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black uppercase text-xs tracking-widest gap-2 shadow-xl shadow-green-600/20">
                        <MessageSquare size={18} /> Send WhatsApp Thanks
                    </Button>
                    <Button onClick={() => handleEmailNotify(requestToUpdate!, userKycData, 'completion')} variant="outline" className="w-full h-14 rounded-2xl border-white/10 bg-white/5 text-white font-black uppercase text-xs tracking-widest gap-2">
                        <Mail size={18} /> Send Official Email
                    </Button>
                 </div>
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
      case 'extension_pending': return <Badge variant="outline" className="text-[8px] font-black border-amber-500/30 text-amber-500 uppercase">Extension Req</Badge>;
      case 'payment_pending': return <Badge variant="outline" className="text-[8px] font-black border-amber-500/30 text-amber-400 uppercase">Verification</Badge>;
      case 'completed': return <Badge variant="outline" className="text-[8px] font-black border-white/5 text-white/20 uppercase">Settled</Badge>;
      default: return <Badge className="text-[8px] uppercase">{status}</Badge>;
    }
};
