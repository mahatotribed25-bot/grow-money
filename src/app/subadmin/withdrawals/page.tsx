
'use client';

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
import { Check, X } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import type { Timestamp } from 'firebase/firestore';
import { doc, updateDoc, runTransaction } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
};

const formatDate = (timestamp: Timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleDateString();
};

export default function WithdrawalsPage() {
  const { data: withdrawals, loading } = useCollection<WithdrawalRequest>('withdrawals');
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleUpdateStatus = (
    withdrawal: WithdrawalRequest,
    newStatus: 'approved' | 'rejected'
  ) => {
    const withdrawalRef = doc(firestore, 'withdrawals', withdrawal.id);
    const userRef = doc(firestore, 'users', withdrawal.userId);

    if (newStatus === 'rejected') {
        // If rejecting, add the amount back to the user's wallet
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
    } else { // approved
        const updateData = { status: newStatus };
        updateDoc(withdrawalRef, updateData)
            .then(() => {
                toast({
                    title: 'Withdrawal Approved',
                    description: `Please manually send ₹${(withdrawal.finalAmount || withdrawal.amount).toFixed(2)} to ${withdrawal.name} at UPI ID: ${withdrawal.upiId}`,
                });
            })
            .catch((error) => {
                console.error('Error approving withdrawal:', error);
                const permissionError = new FirestorePermissionError({
                  path: withdrawalRef.path,
                  operation: 'update',
                  requestResourceData: updateData,
                });
                errorEmitter.emit('permission-error', permissionError);
            });
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Withdrawal Requests</h2>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Name</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>GST</TableHead>
              <TableHead>Final Payout</TableHead>
              <TableHead>UPI ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : (
              withdrawals?.map((withdrawal) => (
                <TableRow key={withdrawal.id}>
                  <TableCell>{withdrawal.name || 'N/A'}</TableCell>
                  <TableCell>₹{withdrawal.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-destructive">₹{(withdrawal.gstAmount || 0).toFixed(2)}</TableCell>
                  <TableCell className="font-bold">₹{(withdrawal.finalAmount || withdrawal.amount).toFixed(2)}</TableCell>
                  <TableCell>{withdrawal.upiId}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{withdrawal.type || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(withdrawal.createdAt)}</TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
                    {withdrawal.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                           className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                          onClick={() => handleUpdateStatus(withdrawal, 'approved')}
                        >
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                           className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => handleUpdateStatus(withdrawal, 'rejected')}
                        >
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
