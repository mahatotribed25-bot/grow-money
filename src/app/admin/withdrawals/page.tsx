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
import { Check, X, HandCoins, Copy, QrCode, Loader2, Camera } from 'lucide-react';
import { useCollection, useFirestore, useDoc, useUser } from '@/firebase';
import type { Timestamp } from 'firebase/firestore';
import { 
  doc, 
  updateDoc, 
  writeBatch, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

type AdminSettings = {
  delayCompensationEnabled?: boolean;
  delayBonusPerDay?: number;
  maxBonusDays?: number;
};

type WithdrawalRequest = {
  id: string;
  userId: string;
  name: string;
  amount: number;
  upiId: string;
  type: 'Investment Plan' | 'Group Investment' | 'General';
  createdAt: Timestamp;
  status: 'pending' | 'approved' | 'rejected';
  gstAmount?: number;
  finalAmount?: number;
  delayBonusActive?: boolean;
  delayBonusAmountPerDay?: number;
  delayBonusStartDate?: Timestamp;
  totalDelayBonus?: number;
  paidDate?: Timestamp;
  reviewedBy?: string;
  payoutScreenshot?: string;
  payoutTransactionId?: string;
};

const formatDate = (timestamp: Timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleDateString();
};

export default function WithdrawalsPage() {
  const { user: currentAdmin } = useUser();
  const { data: withdrawals, loading } = useCollection<WithdrawalRequest>('withdrawals');
  const { data: adminSettings } = useDoc<AdminSettings>('settings/admin');
  const firestore = useFirestore();
  const { toast } = useToast();

  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [requestToApprove, setRequestToApprove] = useState<WithdrawalRequest | null>(null);
  const [calculatedBonus, setCalculatedBonus] = useState(0);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [payoutScreenshot, setPayoutScreenshot] = useState<string | null>(null);
  const [payoutTid, setPayoutTid] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredWithdrawals = useMemo(() => {
    if (!withdrawals) return [];
    const sorted = [...withdrawals].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
    if (filterStatus === 'all') return sorted;
    return sorted.filter((w) => w.status === filterStatus);
  }, [withdrawals, filterStatus]);

  const handleBatchAction = async (newStatus: 'approved' | 'rejected') => {
    if (selectedIds.length === 0 || !currentAdmin) return;
    
    setIsProcessing(true);
    const batch = writeBatch(firestore);
    let processedCount = 0;

    for (const id of selectedIds) {
      const withdrawal = filteredWithdrawals.find(w => w.id === id);
      if (withdrawal && withdrawal.status === 'pending') {
        const withdrawalRef = doc(firestore, 'withdrawals', withdrawal.id);
        const userRef = doc(firestore, 'users', withdrawal.userId);

        if (newStatus === 'rejected') {
          batch.update(userRef, { walletBalance: increment(withdrawal.amount) });
          batch.update(withdrawalRef, { status: 'rejected', reviewedBy: currentAdmin.uid, reviewedAt: serverTimestamp() });
        } else {
          batch.update(withdrawalRef, { status: 'approved', paidDate: serverTimestamp(), finalAmount: withdrawal.finalAmount || withdrawal.amount, reviewedBy: currentAdmin.uid, reviewedAt: serverTimestamp() });
        }
        processedCount++;
      }
    }

    batch.commit()
    .then(() => { toast({ title: `${processedCount} Requests Processed` }); setSelectedIds([]); })
    .catch(() => toast({ title: "Batch Action Failed", variant: "destructive" }))
    .finally(() => setIsProcessing(false));
  };

  const handleUpdateStatus = (withdrawal: WithdrawalRequest, newStatus: 'approved' | 'rejected') => {
      if(!currentAdmin) return;
      const batch = writeBatch(firestore);
      const withdrawalRef = doc(firestore, 'withdrawals', withdrawal.id);
      const userRef = doc(firestore, 'users', withdrawal.userId);

      if (newStatus === 'rejected') {
          batch.update(userRef, { walletBalance: increment(withdrawal.amount) });
          batch.update(withdrawalRef, { status: 'rejected', reviewedBy: currentAdmin.uid, reviewedAt: serverTimestamp() });
      } else {
          batch.update(withdrawalRef, { status: 'approved', paidDate: serverTimestamp(), finalAmount: withdrawal.finalAmount || withdrawal.amount, reviewedBy: currentAdmin.uid, reviewedAt: serverTimestamp() });
      }

      batch.commit().then(() => toast({ title: `Withdrawal ${newStatus}` })).catch(() => toast({ title: "Update Failed", variant: "destructive" }));
  };

  const handleActivateBonus = (withdrawal: WithdrawalRequest) => {
    if (!adminSettings?.delayBonusPerDay) return;
    updateDoc(doc(firestore, 'withdrawals', withdrawal.id), {
        delayBonusActive: true,
        delayBonusAmountPerDay: adminSettings.delayBonusPerDay,
        delayBonusStartDate: serverTimestamp()
    }).then(() => toast({ title: 'Bonus Active' }));
  };

  const openApproveDialog = (withdrawal: WithdrawalRequest) => {
    let bonus = 0;
    if (withdrawal.delayBonusActive && withdrawal.delayBonusStartDate && adminSettings) {
        const days = Math.floor(Math.abs(new Date().getTime() - withdrawal.delayBonusStartDate.toDate().getTime()) / (1000 * 60 * 60 * 24));
        const cappedDays = adminSettings.maxBonusDays ? Math.min(days, adminSettings.maxBonusDays) : days;
        bonus = cappedDays * (withdrawal.delayBonusAmountPerDay || 0);
    }
    setCalculatedBonus(bonus);
    setRequestToApprove(withdrawal);
    setPayoutScreenshot(null);
    setPayoutTid('');
    setIsPaymentDialogOpen(true);
  };

  const handlePayoutFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPayoutScreenshot(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleConfirmPaymentSent = () => {
    if (!requestToApprove || !currentAdmin) return;
    const total = (requestToApprove.finalAmount || requestToApprove.amount) + calculatedBonus;
    updateDoc(doc(firestore, 'withdrawals', requestToApprove.id), {
        status: 'approved',
        totalDelayBonus: calculatedBonus,
        finalAmount: total,
        paidDate: serverTimestamp(),
        reviewedBy: currentAdmin.uid,
        reviewedAt: serverTimestamp(),
        payoutScreenshot: payoutScreenshot || '',
        payoutTransactionId: payoutTid || ''
    }).then(() => { toast({ title: 'Payment Confirmed' }); setIsPaymentDialogOpen(false); });
  };

  const totalPayout = requestToApprove ? (requestToApprove.finalAmount || requestToApprove.amount) + calculatedBonus : 0;
  const upiDeeplink = requestToApprove ? `upi://pay?pa=${requestToApprove.upiId}&pn=${encodeURIComponent(requestToApprove.name)}&am=${totalPayout.toFixed(2)}&cu=INR` : '';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-2xl font-bold">Payouts</h2>
        {selectedIds.length > 0 && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleBatchAction('approved')} disabled={isProcessing} className="bg-green-600 h-8 rounded-lg font-bold text-[10px]">APPROVE ALL</Button>
            <Button size="sm" variant="destructive" onClick={() => handleBatchAction('rejected')} disabled={isProcessing} className="h-8 rounded-lg font-bold text-[10px]">REJECT ALL</Button>
          </div>
        )}
      </div>

       <Tabs value={filterStatus} onValueChange={(v) => { setFilterStatus(v as any); setSelectedIds([]); }}>
            <TabsList className="bg-white/5 border-white/10 rounded-xl">
                <TabsTrigger value="pending" className="text-[10px] font-black uppercase">Pending</TabsTrigger>
                <TabsTrigger value="approved" className="text-[10px] font-black uppercase">Approved</TabsTrigger>
                <TabsTrigger value="rejected" className="text-[10px] font-black uppercase">Rejected</TabsTrigger>
                <TabsTrigger value="all" className="text-[10px] font-black uppercase">Archive</TabsTrigger>
            </TabsList>
        </Tabs>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden mt-4 shadow-2xl">
        <Table>
          <TableHeader className="bg-white/[0.03]">
            <TableRow className="border-white/5">
              <TableHead className="w-12 pl-6">
                <Checkbox checked={selectedIds.length === filteredWithdrawals.length && filteredWithdrawals.length > 0} onCheckedChange={() => setSelectedIds(selectedIds.length === filteredWithdrawals.length ? [] : filteredWithdrawals.map(w => w.id))} />
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase text-white/30">User</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-white/30">Amount</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-white/30">UPI ID</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-white/30">Status</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-white/30 text-right pr-6">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-20 text-white/20 font-black animate-pulse">Loading...</TableCell></TableRow>
            ) : filteredWithdrawals.map((withdrawal) => (
                <TableRow key={withdrawal.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                  <TableCell className="pl-6"><Checkbox checked={selectedIds.includes(withdrawal.id)} onCheckedChange={() => setSelectedIds(prev => prev.includes(withdrawal.id) ? prev.filter(i => i !== withdrawal.id) : [...prev, withdrawal.id])} /></TableCell>
                  <TableCell className="py-4"><div className="font-bold text-white/90">{withdrawal.name}</div><div className="text-[9px] text-white/20 font-bold">{formatDate(withdrawal.createdAt)}</div></TableCell>
                  <TableCell><div className="font-black text-white">₹{(withdrawal.finalAmount || withdrawal.amount).toLocaleString()}</div><div className="text-[9px] text-red-400 font-bold uppercase">₹{(withdrawal.gstAmount || 0).toFixed(2)} Fee</div></TableCell>
                  <TableCell className="font-mono text-[10px] text-primary">{withdrawal.upiId}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[9px] uppercase">{withdrawal.status}</Badge></TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex justify-end gap-2">
                        {withdrawal.status === 'pending' && (
                          <>
                            <Button variant="outline" size="sm" className="bg-green-600/10 text-green-500 font-bold text-[10px]" onClick={() => openApproveDialog(withdrawal)}>PAY</Button>
                            <Button variant="outline" size="sm" className="bg-red-600/10 text-red-500 font-bold text-[10px]" onClick={() => handleUpdateStatus(withdrawal, 'rejected')}>X</Button>
                             {adminSettings?.delayCompensationEnabled && !withdrawal.delayBonusActive && (
                                <Button variant="outline" size="sm" className="bg-blue-600/10 text-blue-400 font-bold text-[9px]" onClick={() => handleActivateBonus(withdrawal)}>BONUS</Button>
                            )}
                          </>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

       <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="bg-[#030408] border-white/10 text-white rounded-3xl max-w-lg">
            <DialogHeader><DialogTitle className="text-center font-black uppercase">Process Payment</DialogTitle></DialogHeader>
            <ScrollArea className="max-h-[80vh] px-1">
                <div className="space-y-6 py-6">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="bg-white p-3 rounded-2xl">
                            <Image src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiDeeplink)}`} alt="QR" width={180} height={180} />
                        </div>
                        <p className="text-3xl font-black text-green-400">₹{totalPayout.toFixed(2)}</p>
                        {calculatedBonus > 0 && <p className="text-[9px] font-bold text-blue-400 uppercase">+₹{calculatedBonus} Delay Bonus</p>}
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-white/20 pl-1">User UPI ID</Label>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center">
                            <span className="font-mono text-sm font-bold text-primary">{requestToApprove?.upiId}</span>
                            <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(requestToApprove?.upiId || '')} className="h-8 w-8"><Copy size={14} /></Button>
                        </div>
                    </div>
                    <Separator className="bg-white/5" />
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase text-white/20 pl-1">Upload Receipt (Optional)</Label>
                        <Input type="file" id="payout-upload" className="hidden" accept="image/*" onChange={handlePayoutFileChange} />
                        <Button variant="outline" type="button" onClick={() => document.getElementById('payout-upload')?.click()} className="w-full h-12 border-dashed border-primary/30 bg-primary/5 text-primary text-[10px] gap-2">
                            <Camera size={18} /> {payoutScreenshot ? 'Change Photo' : 'Capture Receipt'}
                        </Button>
                        {payoutScreenshot && <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10"><Image src={payoutScreenshot} alt="proof" fill className="object-contain" /></div>}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-white/20 pl-1">Bank Transaction ID (UTR)</Label>
                            <Input placeholder="Enter ID from your bank app" value={payoutTid} onChange={e => setPayoutTid(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl" />
                        </div>
                    </div>
                    <div className="space-y-3 pt-2">
                        <Button asChild className="w-full h-12 rounded-xl bg-white text-black font-black uppercase text-[10px]"><a href={upiDeeplink}><QrCode size={16} className="mr-2" /> Open UPI App</a></Button>
                        <Button type="button" onClick={handleConfirmPaymentSent} disabled={!payoutTid} className="w-full h-14 rounded-2xl bg-primary text-white font-black shadow-2xl shadow-primary/20">CONFIRM & NOTIFY USER</Button>
                    </div>
                </div>
            </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
