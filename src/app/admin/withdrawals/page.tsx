
'use client';

import { useState } from 'react';
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
import { Check, X, HandCoins, Info } from 'lucide-react';
import { useCollection, useFirestore, useDoc } from '@/firebase';
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

  const [requestToApprove, setRequestToApprove] = useState<WithdrawalRequest | null>(null);
  const [calculatedBonus, setCalculatedBonus] = useState(0);

  const handleReject = (withdrawal: WithdrawalRequest) => {
    const withdrawalRef = doc(firestore, 'withdrawals', withdrawal.id);
    const userRef = doc(firestore, 'users', withdrawal.userId);

    runTransaction(firestore, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
            throw 'User does not exist!';
        }
        const newBalance = (userDoc.data().walletBalance || 0) + withdrawal.amount;
        transaction.update(userRef, { walletBalance: newBalance });
        transaction.update(withdrawalRef, { status: 'rejected' });
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
    updateDoc(withdrawalRef, updateData)
    .then(() => {
        toast({ title: 'Bonus Activated', description: `Daily bonus of ₹${adminSettings.delayBonusPerDay} is now active for ${withdrawal.name}.` });
    })
    .catch(error => {
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
  };

  const handleConfirmApproval = () => {
    if (!requestToApprove) return;

    const baseAmount = requestToApprove.finalAmount || requestToApprove.amount;
    const totalPayout = baseAmount + calculatedBonus;
    
    const withdrawalRef = doc(firestore, 'withdrawals', requestToApprove.id);
    const updateData = {
        status: 'approved',
        totalDelayBonus: calculatedBonus,
        finalAmount: totalPayout,
        paidDate: serverTimestamp()
    };

    updateDoc(withdrawalRef, updateData)
    .then(() => {
        toast({ title: 'Withdrawal Approved', description: `Please manually send ₹${totalPayout.toFixed(2)} to ${requestToApprove.name}.` });
        setRequestToApprove(null);
    })
    .catch(error => {
        const permissionError = new FirestorePermissionError({
          path: withdrawalRef.path,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Withdrawal Requests</h2>
      <div className="rounded-lg border">
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
            ) : (
              withdrawals?.map((withdrawal) => (
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
                           className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                          onClick={() => openApproveDialog(withdrawal)}
                        >
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                           className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => handleReject(withdrawal)}
                        >
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                         {adminSettings?.delayCompensationEnabled && !withdrawal.delayBonusActive && (
                            <Button
                                variant="outline"
                                size="sm"
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
            )}
          </TableBody>
        </Table>
      </div>

       <Dialog open={!!requestToApprove} onOpenChange={() => setRequestToApprove(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Confirm Final Payout</DialogTitle>
                <DialogDescription>
                    Review the final payout amount including any delay bonus before confirming. This will mark the request as approved.
                </DialogDescription>
            </DialogHeader>
            <div className="my-4 space-y-4 rounded-md border p-4">
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Original Amount:</span>
                    <span className="font-semibold">₹{(requestToApprove?.finalAmount || requestToApprove?.amount || 0).toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-green-400">
                    <span className="text-muted-foreground">Delay Bonus Earned:</span>
                    <span className="font-semibold">+ ₹{calculatedBonus.toFixed(2)}</span>
                 </div>
                 <hr className="border-border"/>
                 <div className="flex justify-between text-lg">
                    <span className="font-bold">Total Payout:</span>
                    <span className="font-bold">₹{((requestToApprove?.finalAmount || requestToApprove?.amount || 0) + calculatedBonus).toFixed(2)}</span>
                 </div>
                 <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded-md flex items-start gap-2">
                    <Info className="h-4 w-4 mt-0.5 shrink-0"/>
                    <span>
                     Make sure you have manually sent this total amount to the user's UPI ID: <b>{requestToApprove?.upiId}</b>
                    </span>
                 </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleConfirmApproval}>
                    Confirm & Approve
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
