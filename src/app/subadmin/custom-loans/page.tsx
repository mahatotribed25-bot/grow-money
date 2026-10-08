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
import { Check, X, Send, Landmark, Timer, Camera, Copy, QrCode, MessageSquare } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
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
  adminDispatchScreenshot?: string;
  adminDispatchTid?: string;
  userPaymentScreenshot?: string;
  userPaymentTid?: string;
};

type UserData = {
  id: string;
  phoneNumber?: string;
  email?: string;
  kycStatus?: string;
};

type AdminSettings = {
    customLoanInterestLow?: number;
    customLoanInterestHigh?: number;
    customLoanThreshold?: number;
    customLoanPenalty?: number;
    totalCustomLoanLimit?: number;
    currentCustomLoanUsage?: number;
}

const formatDate = (timestamp?: Timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleString();
};

export default function SubAdminCustomLoansPage() {
  const { data: requests, loading: requestsLoading } = useCollection<CustomLoanRequest>('customLoanRequests');
  const { data: adminSettings, loading: settingsLoading } = useDoc<AdminSettings>('settings/admin');
  const firestore = useFirestore();
  const { toast } = useToast();

  const [requestToUpdate, setRequestToUpdate] = useState<CustomLoanRequest | null>(null);
  const [userKycData, setUserKycData] = useState<UserData | null>(null);
  
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isExtensionDialogOpen, setIsExtensionDialogOpen] = useState(false);
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] = useState(false);
  
  const [editInterestRate, setEditInterestRate] = useState('');
  const [editTotalRepayment, setEditTotalRepayment] = useState('');
  const [extensionFee, setExtensionFee] = useState('');
  const [dispatchScreenshot, setDispatchScreenshot] = useState<string | null>(null);
  const [dispatchTid, setDispatchTid] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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
    reader.onloadend = () => {
      const img = new window.Image();
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_DIM = 800; // Efficient compression
        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        setDispatchScreenshot(canvas.toDataURL('image/jpeg', 0.6));
      };
    };
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
    setIsPaymentDialogOpen(true);
  };

  const handleSendOffer = () => {
    if (!requestToUpdate) return;
    const requestRef = doc(firestore, 'customLoanRequests', requestToUpdate.id);
    const updateData = {
        status: 'pending_user_approval' as const,
        interestRate: parseFloat(editInterestRate),
        interestAmount: parseFloat(editTotalRepayment) - requestToUpdate.requestedAmount,
        totalRepayment: parseFloat(editTotalRepayment),
        adminApprovedAt: serverTimestamp(),
    };
    updateDoc(requestRef, updateData).then(() => {
        toast({ title: 'Offer Sent' });
        setIsApproveDialogOpen(false);
    });
  };

  const handleMarkAsSent = () => {
    if (!requestToUpdate || !dispatchTid) {
        toast({ title: "TID Required", variant: "destructive" });
        return;
    }
    const request = requestToUpdate;
    const requestRef = doc(firestore, 'customLoanRequests', request.id);
    const settingsRef = doc(firestore, 'settings', 'admin');
    
    setIsProcessing(true);
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
    })
    .catch((e: any) => {
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
    })
    .finally(() => setIsProcessing(false));
  };

  const handleApproveExtension = async () => {
    if (!requestToUpdate || !requestToUpdate.dueDate) return;
    const fee = parseFloat(extensionFee) || 0;
    const extraDays = requestToUpdate.extensionRequestedDays || 0;

    const requestRef = doc(firestore, 'customLoanRequests', requestToUpdate.id);
    const newDueDate = addDays(requestToUpdate.dueDate.toDate(), extraDays);

    await updateDoc(requestRef, {
      status: 'active' as const,
      dueDate: Timestamp.fromDate(newDueDate),
      totalRepayment: (requestToUpdate.totalRepayment || 0) + fee,
      extensionApprovedAt: serverTimestamp(),
    });
    toast({ title: "Extension Approved" });
    setIsExtensionDialogOpen(false);
  };

  const handleMarkAsCompleted = async (request: CustomLoanRequest) => {
    const requestRef = doc(firestore, 'customLoanRequests', request.id);
    const settingsRef = doc(firestore, 'settings', 'admin');

    runTransaction(firestore, async (transaction) => {
        const settingsDoc = await transaction.get(settingsRef);
        let currentUsage = settingsDoc.data()?.currentCustomLoanUsage || 0;
        transaction.update(requestRef, { status: 'completed', settledAt: serverTimestamp() });
        transaction.update(settingsRef, { currentCustomLoanUsage: Math.max(0, currentUsage - request.requestedAmount) });
    }).then(() => toast({ title: 'Loan Settled' }));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Flexible Loan Pipeline</h2>
      </div>

       <Tabs value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}>
            <TabsList className="flex-wrap justify-start h-auto bg-white/5 p-1 rounded-xl">
                <TabsTrigger value="pending_admin_review" className="text-[10px] font-black uppercase">New</TabsTrigger>
                <TabsTrigger value="approved_by_user" className="text-[10px] font-black uppercase">Ready to Pay</TabsTrigger>
                <TabsTrigger value="active" className="text-[10px] font-black uppercase">Active</TabsTrigger>
                <TabsTrigger value="extension_pending" className="text-[10px] font-black uppercase">Extensions</TabsTrigger>
                <TabsTrigger value="payment_pending" className="text-[10px] font-black uppercase">Confirm Pay</TabsTrigger>
                <TabsTrigger value="all" className="text-[10px] font-black uppercase">History</TabsTrigger>
            </TabsList>
        </Tabs>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] mt-4 overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow>
              <TableHead className="text-[10px] font-black uppercase text-white/40 pl-6">Investor</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-white/40">Amount</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-white/40">Total Due</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-white/40">Deadline</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-white/40 pr-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-20">Syncing Pipeline...</TableCell></TableRow>
            ) : filteredRequests.length > 0 ? (
              filteredRequests.map((request) => (
                <TableRow key={request.id} className="border-white/5 hover:bg-white/[0.01]">
                  <TableCell className="pl-6 font-bold">{request.userName}</TableCell>
                  <TableCell className="font-bold">₹{request.requestedAmount.toFixed(2)}</TableCell>
                   <TableCell>
                    <div className="font-bold text-white">₹{((request.totalRepayment || 0) + (request.penalty || 0)).toFixed(2)}</div>
                    {request.penalty && <div className="text-[9px] text-red-500 font-black uppercase tracking-widest">+₹{request.penalty.toFixed(2)} Penalty</div>}
                  </TableCell>
                  <TableCell className="text-xs text-white/40">{formatDate(request.dueDate)}</TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex justify-end gap-2">
                        {request.status === 'pending_admin_review' && (
                            <Button size="sm" className="bg-primary text-[10px] font-black uppercase" onClick={() => openApproveDialog(request)}>Review</Button>
                        )}
                        {request.status === 'approved_by_user' && (
                            <Button size="sm" className="bg-green-600 text-[10px] font-black uppercase" onClick={() => openPaymentDialog(request)}>Send Money</Button>
                        )}
                        {request.status === 'extension_pending' && (
                          <Button size="sm" className="bg-amber-600 text-[10px] font-black uppercase" onClick={() => { setRequestToUpdate(request); setIsExtensionDialogOpen(true); }}>Review Ext.</Button>
                        )}
                        {request.status === 'payment_pending' && (
                            <Button size="sm" className="bg-blue-600 text-[10px] font-black uppercase" onClick={() => { setRequestToUpdate(request); setIsVerificationDialogOpen(true); }}>Verify</Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow><TableCell colSpan={5} className="text-center py-20 text-white/20 italic">No items found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Approve/Offer Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem] max-w-sm">
          <DialogHeader><DialogTitle className="font-black uppercase">Loan Offer Protocol</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-white/20">Interest Rate (%)</Label>
                      <Input type="number" value={editInterestRate} onChange={e => setEditInterestRate(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl font-bold" />
                  </div>
                  <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-white/20">Total Repayment</Label>
                      <Input type="number" value={editTotalRepayment} onChange={e => setEditTotalRepayment(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl font-bold text-green-400" />
                  </div>
              </div>
              <Button onClick={handleSendOffer} className="w-full h-14 rounded-2xl bg-primary text-white font-black shadow-xl">TRANSMIT OFFER</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dispatch Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem] max-w-sm">
            <DialogHeader><DialogTitle className="font-black uppercase text-center">Dispatch Funds</DialogTitle></DialogHeader>
            <ScrollArea className="max-h-[80vh] px-1">
                <div className="py-6 space-y-6">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="bg-white p-3 rounded-2xl">
                            <Image src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(requestToUpdate?.upiId ? `upi://pay?pa=${requestToUpdate.upiId}&pn=${encodeURIComponent(requestToUpdate.userName)}&am=${requestToUpdate.requestedAmount.toFixed(2)}&cu=INR` : '')}`} alt="QR" width={180} height={180} />
                        </div>
                        <p className="text-3xl font-black text-green-400">₹{requestToUpdate?.requestedAmount.toFixed(2)}</p>
                    </div>
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase text-white/20 pl-1">Payment Receipt (Required)</Label>
                        <input type="file" id="staff-dispatch-upload" className="hidden" accept="image/*" onChange={handleFileChange} />
                        <Button variant="outline" type="button" onClick={() => document.getElementById('staff-dispatch-upload')?.click()} className="w-full h-12 border-dashed border-primary/30 bg-primary/5 text-primary text-[10px] gap-2">
                            <Camera size={18} /> {dispatchScreenshot ? 'Change Photo' : 'Upload Receipt'}
                        </Button>
                        {dispatchScreenshot && <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10"><Image src={dispatchScreenshot} alt="dispatch" fill className="object-contain" /></div>}
                        <Input placeholder="Enter Ref/UTR ID" value={dispatchTid} onChange={e => setDispatchTid(e.target.value)} className="bg-white/5 border-white/10 h-11 rounded-xl" />
                    </div>
                    <Button onClick={handleMarkAsSent} disabled={isProcessing || !dispatchTid} className="w-full h-14 rounded-2xl bg-primary text-white font-black shadow-xl">
                        {isProcessing ? "PROCESSING..." : "CONFIRM DISPATCH"}
                    </Button>
                </div>
            </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Verification Dialog */}
      <Dialog open={isVerificationDialogOpen} onOpenChange={setIsVerificationDialogOpen}>
          <DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem] max-w-md">
              <DialogHeader><DialogTitle className="font-black uppercase">Verify Settlement</DialogTitle></DialogHeader>
              <ScrollArea className="max-h-[80vh] px-1">
                  <div className="space-y-6 py-6">
                       <div className="bg-white/5 p-5 rounded-2xl border border-white/5 flex justify-between items-center">
                           <span className="text-[10px] font-black text-white/30 uppercase">Sum Expected</span>
                           <span className="text-xl font-black text-green-400">₹{((requestToUpdate?.totalRepayment || 0) + (requestToUpdate?.penalty || 0)).toFixed(2)}</span>
                       </div>
                       <div className="relative aspect-[9/16] max-h-[400px] w-full rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                           {requestToUpdate?.userPaymentScreenshot ? <Image src={requestToUpdate.userPaymentScreenshot} alt="proof" fill className="object-contain" /> : <div className="h-full w-full flex items-center justify-center text-white/10">No image</div>}
                       </div>
                       <Button onClick={() => requestToUpdate && handleMarkAsCompleted(requestToUpdate)} className="w-full h-14 rounded-2xl bg-green-600 text-white font-black">CONFIRM & SETTLE</Button>
                  </div>
              </ScrollArea>
          </DialogContent>
      </Dialog>

      {/* Extension Dialog */}
      <Dialog open={isExtensionDialogOpen} onOpenChange={setIsExtensionDialogOpen}>
        <DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem] max-w-sm">
          <DialogHeader><DialogTitle className="font-black uppercase">Approve Extension</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-white/20">Extension Fee (INR)</Label>
              <Input type="number" value={extensionFee} onChange={e => setExtensionFee(e.target.value)} placeholder="e.g. 500" className="h-12 bg-white/5 border-white/10 rounded-xl font-bold" />
            </div>
            <Button onClick={handleApproveExtension} className="w-full h-12 rounded-xl bg-primary font-black uppercase text-xs">Authorize Time Extension</Button>
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
