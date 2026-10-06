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
import { Check, X, HandCoins, Info, Copy, QrCode, Camera } from 'lucide-react';
import { useCollection, useFirestore, useDoc, useUser } from '@/firebase';
import type { Timestamp } from 'firebase/firestore';
import { doc, updateDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
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
  payoutScreenshot?: string;
  payoutTransactionId?: string;
  reviewedBy?: string;
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

  // Payout Proof State
  const [payoutScreenshot, setPayoutScreenshot] = useState<string | null>(null);
  const [payoutTid, setPayoutTid] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredWithdrawals = useMemo(() => {
    if (!withdrawals) return [];
    const sorted = [...withdrawals].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
    if (filterStatus === 'all') {
      return sorted;
    }
    return sorted.filter((w) => w.status === filterStatus);
  }, [withdrawals, filterStatus]);

  const handleReject = (withdrawal: WithdrawalRequest) => {
    if (!currentAdmin) return;
    const withdrawalRef = doc(firestore, 'withdrawals', withdrawal.id);
    const userRef = doc(firestore, 'users', withdrawal.userId);

    runTransaction(firestore, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
            throw 'User does not exist!';
        }
        const newBalance = (userDoc.data().walletBalance || 0) + withdrawal.amount;
        transaction.update(userRef, { walletBalance: newBalance });
        transaction.update(withdrawalRef, { 
            status: 'rejected',
            reviewedBy: currentAdmin.uid,
            reviewedAt: serverTimestamp()
        });
    })
    .then(() => {
        toast({
            title: 'Withdrawal Rejected',
            description: `The withdrawal request for ${withdrawal.name} has been rejected and the amount returned to their wallet.`,
            variant: 'destructive',
        });
    })
    .catch((error) => {
        console.error('Error rejecting withdrawal:', error);
        const permissionError = new FirestorePermissionError({
          path: `users/${withdrawal.userId} or withdrawals/${withdrawal.id}`,
          operation: 'write',
          requestResourceData: { status: 'rejected' },
        });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleActivateBonus = (withdrawal: WithdrawalRequest) => {
    if (!adminSettings?.delayBonusPerDay || adminSettings.delayBonusPerDay <= 0) {
        toast({ title: 'Set Bonus Amount First', description: 'Please set a bonus amount per day in admin settings.', variant: 'destructive'});
        return;
    }
    const withdrawalRef = doc(firestore, 'withdrawals', withdrawal.id);
    const updateData = {
        delayBonusActive: true,
        delayBonusAmountPerDay: adminSettings.delayBonusPerDay,
        delayBonusStartDate: serverTimestamp()
    };
    // Non-blocking update
    updateDoc(withdrawalRef, updateData)
    .then(() => {
        toast({ title: 'Bonus Activated', description: `Daily bonus of ₹${adminSettings.delayBonusPerDay} is now active for ${withdrawal.name}.` });
    })
    .catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: withdrawalRef.path,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
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
    setPayoutScreenshot(null);
    setPayoutTid('');
    setIsPaymentDialogOpen(true);
  };

  const handlePayoutFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        const MAX_DIM = 1000;

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
        // Compress to 60% quality JPEG
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        setPayoutScreenshot(compressedBase64);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmPaymentSent = () => {
    if (!requestToApprove || !currentAdmin) return;

    const baseAmount = requestToApprove.finalAmount || requestToApprove.amount;
    const totalPayout = baseAmount + calculatedBonus;
    
    const withdrawalRef = doc(firestore, 'withdrawals', requestToApprove.id);
    const updateData = {
        status: 'approved' as const,
        totalDelayBonus: calculatedBonus,
        finalAmount: totalPayout,
        paidDate: serverTimestamp(),
        reviewedBy: currentAdmin.uid,
        reviewedAt: serverTimestamp(),
        payoutScreenshot: payoutScreenshot || '',
        payoutTransactionId: payoutTid || ''
    };

    // Non-blocking update
    updateDoc(withdrawalRef, updateData)
    .then(() => {
        toast({ title: 'Withdrawal Approved', description: `Withdrawal for ${requestToApprove.name} has been marked as paid.` });
        setIsPaymentDialogOpen(false);
        setRequestToApprove(null);
    })
    .catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: withdrawalRef.path,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: `${label} Copied!`, description: text });
  };

  const totalPayout = requestToApprove ? (requestToApprove.finalAmount || requestToApprove.amount) + calculatedBonus : 0;
  const upiDeeplink = requestToApprove ? `upi://pay?pa=${requestToApprove.upiId}&pn=${encodeURIComponent(requestToApprove.name)}&am=${totalPayout.toFixed(2)}&cu=INR` : '';


  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Withdrawal Requests</h2>
      </div>

       <Tabs value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}>
            <TabsList>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
        </Tabs>
      
      <div className="rounded-lg border mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Name</TableHead>
              <TableHead>Payout</TableHead>
              <TableHead>UPI ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredWithdrawals.length > 0 ? (
              filteredWithdrawals.map((withdrawal) => (
                <TableRow key={withdrawal.id}>
                  <TableCell>
                    <div className="font-medium">{withdrawal.name || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(withdrawal.createdAt)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold">₹{(withdrawal.finalAmount || withdrawal.amount).toFixed(2)}</div>
                    <div className="text-xs text-destructive"> (inc. ₹{(withdrawal.gstAmount || 0).toFixed(2)} GST)</div>
                  </TableCell>
                  <TableCell>{withdrawal.upiId}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                        <Badge
                          variant={
                            withdrawal.status === 'approved'
                              ? 'default'
                              : withdrawal.status === 'rejected'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {withdrawal.status}
                        </Badge>
                        {withdrawal.delayBonusActive && withdrawal.status === 'pending' && (
                            <Badge variant="outline" className="border-blue-500 text-blue-400">Bonus Active</Badge>
                        )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {withdrawal.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                           className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                          onClick={() => openApproveDialog(withdrawal)}
                        >
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                           className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => handleReject(withdrawal)}
                        >
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                         {adminSettings?.delayCompensationEnabled && !withdrawal.delayBonusActive && (
                            <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                className="text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                                onClick={() => handleActivateBonus(withdrawal)}
                            >
                                <HandCoins className="h-4 w-4 mr-1" /> Bonus
                            </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No {filterStatus} withdrawals found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

       <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-lg bg-[#030408] border-white/10 text-white rounded-[2rem]">
            <DialogHeader>
                <DialogTitle className="text-center font-black uppercase tracking-tight">Process Payout Node</DialogTitle>
                <DialogDescription className="text-center text-white/40 text-xs">
                    Send payment and upload bank-verified proof.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[80vh] px-1">
                <div className="space-y-6 py-6">
                    <div className="flex flex-col items-center gap-4">
                        <div className="bg-white p-3 rounded-2xl shadow-xl">
                            <Image
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiDeeplink)}`}
                                alt="UPI QR Code"
                                width={200}
                                height={200}
                            />
                        </div>
                        <div className="text-center">
                             <p className="text-[10px] font-black text-white/20 uppercase tracking-[3px]">Payout Value</p>
                             <p className="text-3xl font-black text-green-400 tracking-tighter">₹{totalPayout.toFixed(2)}</p>
                        </div>
                    </div>
                    
                    <div className="space-y-2 px-1">
                        <Label className="text-[10px] font-black text-white/20 uppercase tracking-widest pl-1">Target Address (UPI)</Label>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center group">
                            <span className="font-mono text-sm font-bold text-primary">{requestToApprove?.upiId}</span>
                            <Button variant="ghost" size="icon" type="button" className="h-8 w-8 hover:bg-white/10" onClick={() => handleCopyToClipboard(requestToApprove?.upiId || '', 'UPI ID')}>
                                <Copy size={14} />
                            </Button>
                        </div>
                    </div>

                    <Separator className="bg-white/5" />

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-white/20 uppercase tracking-widest pl-1">Payout Receipt Screenshot</Label>
                            <input 
                                type="file" 
                                id="subadmin-payout-upload"
                                className="hidden" 
                                accept="image/*" 
                                onChange={handlePayoutFileChange} 
                            />
                            <Button 
                                variant="outline" 
                                type="button"
                                onClick={() => document.getElementById('subadmin-payout-upload')?.click()}
                                className="w-full h-14 rounded-2xl border-dashed border-primary/30 bg-primary/5 text-primary font-black uppercase text-[10px] gap-2"
                            >
                                <Camera size={18} /> {payoutScreenshot ? 'Change Receipt' : 'Upload Payment Receipt'}
                            </Button>
                            {payoutScreenshot && (
                                <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                                    <Image src={payoutScreenshot} alt="Payout proof" fill className="object-contain" />
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-white/20 uppercase tracking-widest pl-1">Official Transaction ID (UTR)</Label>
                            <Input 
                                placeholder="e.g. 4123..." 
                                value={payoutTid} 
                                onChange={e => setPayoutTid(e.target.value)}
                                className="bg-white/5 border-white/10 h-12 rounded-xl font-mono text-sm uppercase"
                            />
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        <Button asChild type="button" className="w-full h-12 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] shadow-xl">
                            <a href={upiDeeplink}>
                                <QrCode size={16} className="mr-2" /> Launch UPI Gateway
                            </a>
                        </Button>
                        <Button 
                            type="button"
                            onClick={handleConfirmPaymentSent} 
                            disabled={!payoutTid}
                            className="w-full h-14 rounded-2xl bg-primary text-white font-black shadow-2xl shadow-primary/20"
                        >
                            <Check className="mr-2" /> {payoutTid ? 'AUTHORIZE SETTLEMENT' : 'Enter UTR to Authorize'}
                        </Button>
                    </div>
                </div>
            </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
