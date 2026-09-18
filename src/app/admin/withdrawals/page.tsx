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
import { Check, X, HandCoins, Info, Copy, QrCode, Send, Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useDoc } from '@/firebase';
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
import Image from 'next/image';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

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
};

const formatDate = (timestamp: Timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleDateString();
};

export default function WithdrawalsPage() {
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

  const filteredWithdrawals = useMemo(() => {
    if (!withdrawals) return [];
    const sorted = [...withdrawals].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
    if (filterStatus === 'all') {
      return sorted;
    }
    return sorted.filter((w) => w.status === filterStatus);
  }, [withdrawals, filterStatus]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredWithdrawals.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredWithdrawals.map(w => w.id));
    }
  };

  const handleBatchAction = async (newStatus: 'approved' | 'rejected') => {
    if (selectedIds.length === 0) return;
    
    setIsProcessing(true);
    const batch = writeBatch(firestore);
    let processedCount = 0;

    for (const id of selectedIds) {
      const withdrawal = filteredWithdrawals.find(w => w.id === id);
      if (withdrawal && withdrawal.status === 'pending') {
        const withdrawalRef = doc(firestore, 'withdrawals', withdrawal.id);
        const userRef = doc(firestore, 'users', withdrawal.userId);

        if (newStatus === 'rejected') {
          // Return money to user wallet on rejection using atomic increment
          batch.update(userRef, { walletBalance: increment(withdrawal.amount) });
          batch.update(withdrawalRef, { status: 'rejected' });
        } else {
          batch.update(withdrawalRef, {
            status: 'approved',
            paidDate: serverTimestamp(),
            finalAmount: withdrawal.finalAmount || withdrawal.amount
          });
        }
        processedCount++;
      }
    }

    try {
      await batch.commit();
      toast({
        title: "Batch Action Complete",
        description: `${processedCount} requests ${newStatus} successfully.`,
      });
    } catch (e) {
      console.error(e);
      toast({ title: "Batch Operation Failed", variant: "destructive" });
    }

    setSelectedIds([]);
    setIsProcessing(false);
  };

  const handleReject = (withdrawal: WithdrawalRequest) => {
    const batch = writeBatch(firestore);
    const withdrawalRef = doc(firestore, 'withdrawals', withdrawal.id);
    const userRef = doc(firestore, 'users', withdrawal.userId);

    batch.update(userRef, { walletBalance: increment(withdrawal.amount) });
    batch.update(withdrawalRef, { status: 'rejected' });

    batch.commit()
    .then(() => {
        toast({ title: 'Withdrawal Rejected', variant: 'destructive' });
    })
    .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: `withdrawals/${withdrawal.id}`,
          operation: 'write',
        });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleActivateBonus = (withdrawal: WithdrawalRequest) => {
    if (!adminSettings?.delayBonusPerDay || adminSettings.delayBonusPerDay <= 0) {
        toast({ title: 'Error', description: 'Set bonus amount in settings first.', variant: "destructive"});
        return;
    }
    const withdrawalRef = doc(firestore, 'withdrawals', withdrawal.id);
    const updateData = {
        delayBonusActive: true,
        delayBonusAmountPerDay: adminSettings.delayBonusPerDay,
        delayBonusStartDate: serverTimestamp()
    };
    updateDoc(withdrawalRef, updateData)
    .then(() => {
        toast({ title: 'Bonus Activated' });
    });
  };

  const openApproveDialog = (withdrawal: WithdrawalRequest) => {
    let bonus = 0;
    if (withdrawal.delayBonusActive && withdrawal.delayBonusStartDate && adminSettings) {
        const startDate = withdrawal.delayBonusStartDate.toDate();
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - startDate.getTime());
        let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (adminSettings.maxBonusDays && diffDays > adminSettings.maxBonusDays) {
            diffDays = adminSettings.maxBonusDays;
        }
        bonus = diffDays * (withdrawal.delayBonusAmountPerDay || 0);
    }
    setCalculatedBonus(bonus);
    setRequestToApprove(withdrawal);
    setIsPaymentDialogOpen(true);
  };

  const handleConfirmPaymentSent = () => {
    if (!requestToApprove) return;
    const baseAmount = requestToApprove.finalAmount || requestToApprove.amount;
    const totalPayout = baseAmount + calculatedBonus;
    
    updateDoc(doc(firestore, 'withdrawals', requestToApprove.id), {
        status: 'approved',
        totalDelayBonus: calculatedBonus,
        finalAmount: totalPayout,
        paidDate: serverTimestamp()
    })
    .then(() => {
        toast({ title: 'Withdrawal Approved' });
        setIsPaymentDialogOpen(false);
        setRequestToApprove(null);
    });
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: `${label} Copied!` });
  };

  const totalPayout = requestToApprove ? (requestToApprove.finalAmount || requestToApprove.amount) + calculatedBonus : 0;
  const upiDeeplink = requestToApprove ? `upi://pay?pa=${requestToApprove.upiId}&pn=${encodeURIComponent(requestToApprove.name)}&am=${totalPayout.toFixed(2)}&cu=INR` : '';


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-2xl font-bold">Withdrawal Requests</h2>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl animate-in zoom-in-95">
             <span className="text-xs font-black uppercase text-primary">{selectedIds.length} Selected</span>
             <div className="flex gap-2">
                <Button 
                    size="sm" 
                    onClick={() => handleBatchAction('approved')} 
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700 h-8 rounded-lg font-bold text-[10px]"
                >
                    {isProcessing ? <Loader2 className="animate-spin h-3 w-3 mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                    APPROVE ALL
                </Button>
                <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => handleBatchAction('rejected')} 
                    disabled={isProcessing}
                    className="h-8 rounded-lg font-bold text-[10px]"
                >
                    {isProcessing ? <Loader2 className="animate-spin h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                    REJECT ALL
                </Button>
             </div>
          </div>
        )}
      </div>

       <Tabs value={filterStatus} onValueChange={(value) => { setFilterStatus(value as any); setSelectedIds([]); }}>
            <TabsList className="bg-white/5 border-white/10 p-1 rounded-xl">
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
                <Checkbox 
                    checked={selectedIds.length === filteredWithdrawals.length && filteredWithdrawals.length > 0}
                    onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">Investor</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">Payout</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">UPI ID</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">Status</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30 pr-6 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-transparent">
                <TableCell colSpan={6} className="text-center py-20 text-white/20 font-black animate-pulse">Loading Withdrawals...</TableCell>
              </TableRow>
            ) : filteredWithdrawals.length > 0 ? (
              filteredWithdrawals.map((withdrawal) => (
                <TableRow key={withdrawal.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                  <TableCell className="pl-6">
                    <Checkbox 
                        checked={selectedIds.includes(withdrawal.id)}
                        onCheckedChange={() => handleToggleSelect(withdrawal.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-white/90">{withdrawal.name || 'N/A'}</div>
                    <div className="text-[9px] text-white/20 uppercase font-bold">{formatDate(withdrawal.createdAt)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-black text-white">₹{(withdrawal.finalAmount || withdrawal.amount).toLocaleString()}</div>
                    <div className="text-[9px] text-red-400 font-bold uppercase">₹{(withdrawal.gstAmount || 0).toFixed(2)} TAX</div>
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-primary">{withdrawal.upiId}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] font-black uppercase h-5",
                            withdrawal.status === 'approved' ? "border-green-500/20 text-green-400 bg-green-500/5" :
                            withdrawal.status === 'rejected' ? "border-red-500/20 text-red-500 bg-red-500/5" :
                            "border-white/10 text-white/40"
                          )}
                        >
                          {withdrawal.status}
                        </Badge>
                        {withdrawal.delayBonusActive && withdrawal.status === 'pending' && (
                            <Badge variant="outline" className="border-blue-500/40 text-blue-400 bg-blue-500/5 text-[8px] h-4">BONUS ACTIVE</Badge>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    {withdrawal.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                           className="bg-green-600/10 text-green-500 border-green-500/20 hover:bg-green-600 hover:text-white h-8 rounded-lg px-4 font-bold text-[10px]"
                          onClick={() => openApproveDialog(withdrawal)}
                        >
                          PROCESS
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                           className="bg-red-600/10 text-red-500 border-red-500/20 hover:bg-red-600 hover:text-white h-8 rounded-lg px-4 font-bold text-[10px]"
                          onClick={() => handleReject(withdrawal)}
                        >
                          REJECT
                        </Button>
                         {adminSettings?.delayCompensationEnabled && !withdrawal.delayBonusActive && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-blue-600/10 text-blue-400 border-blue-400/20 hover:bg-blue-600 hover:text-white h-8 rounded-lg px-3 font-bold text-[9px]"
                                onClick={() => handleActivateBonus(withdrawal)}
                            >
                                <HandCoins className="h-3 w-3 mr-1" /> BONUS
                            </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow className="border-transparent">
                    <TableCell colSpan={6} className="text-center py-20 text-white/10 italic text-sm">
                        No {filterStatus} requests found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

       <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem] max-w-sm">
            <DialogHeader>
                <DialogTitle className="text-center font-black uppercase tracking-tight">Process Withdrawal</DialogTitle>
                <DialogDescription className="text-center text-white/40 text-xs">Send money to the user and confirm below.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-6">
                <div className="flex flex-col items-center gap-4">
                    <div className="bg-white p-3 rounded-2xl shadow-xl">
                        <Image
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiDeeplink)}`}
                            alt="UPI QR"
                            width={180}
                            height={180}
                        />
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[3px]">Amount to Send</p>
                        <p className="text-3xl font-black text-green-400 tracking-tighter">₹{totalPayout.toFixed(2)}</p>
                        {calculatedBonus > 0 && <p className="text-[9px] font-bold text-blue-400 uppercase mt-1">+₹{calculatedBonus} Bonus Included</p>}
                    </div>
                </div>
                
                <div className="space-y-2 px-1">
                    <Label className="text-[10px] font-black text-white/20 uppercase tracking-widest pl-1">Destination ID</Label>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center group">
                        <span className="font-mono text-sm font-bold text-primary">{requestToApprove?.upiId}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10" onClick={() => handleCopyToClipboard(requestToApprove?.upiId || '', 'UPI ID')}>
                            <Copy size={14} />
                        </Button>
                    </div>
                </div>

                 <Button asChild className="w-full h-12 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] shadow-xl">
                    <a href={upiDeeplink}>
                        <QrCode size={16} className="mr-2" /> Open UPI App
                    </a>
                </Button>
                <Button onClick={handleConfirmPaymentSent} className="w-full h-14 rounded-2xl bg-primary text-white font-black shadow-2xl shadow-primary/20">
                    <Check className="mr-2" /> Payment Confirmed
                </Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
