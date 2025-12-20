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

type Withdrawal = {
  id: string;
  userId: string;
  userName?: string;
  amount: number;
  upiId: string;
  createdAt: Timestamp;
  status: 'pending' | 'approved' | 'rejected';
};

const formatDate = (timestamp: Timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleDateString();
};

export default function WithdrawalsPage() {
  const { data: withdrawals, loading } = useCollection<Withdrawal>('withdrawals');
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleUpdateStatus = async (
    withdrawal: Withdrawal,
    status: 'approved' | 'rejected'
  ) => {
    const withdrawalRef = doc(firestore, 'withdrawals', withdrawal.id);
    const userRef = doc(firestore, 'users', withdrawal.userId);

    try {
      if (status === 'rejected') {
        // If rejected, refund the amount to the user's wallet
        await runTransaction(firestore, async (transaction) => {
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists()) {
            throw 'User document does not exist!';
          }
          const currentBalance = userDoc.data().walletBalance || 0;
          const newBalance = currentBalance + withdrawal.amount;
          transaction.update(userRef, { walletBalance: newBalance });
          transaction.update(withdrawalRef, { status: 'rejected' });
        });
        toast({
          title: 'Withdrawal Rejected',
          description: `₹${withdrawal.amount} has been refunded to the user's wallet.`,
        });
      } else {
        // If approved (paid), just update the status
        await updateDoc(withdrawalRef, { status });
        toast({
          title: 'Withdrawal Approved',
          description: 'The withdrawal has been marked as paid.',
        });
      }
    } catch (error) {
      console.error('Error updating withdrawal status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update withdrawal status.',
        variant: 'destructive',
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
              <TableHead>Amount</TableHead>
              <TableHead>User UPI ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : (
              withdrawals?.map((withdrawal) => (
                <TableRow key={withdrawal.id}>
                  <TableCell>{withdrawal.userName || withdrawal.userId}</TableCell>
                  <TableCell>₹{withdrawal.amount.toFixed(2)}</TableCell>
                  <TableCell>{withdrawal.upiId}</TableCell>
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
                      className="capitalize"
                    >
                      {withdrawal.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-green-500/10 text-green-500 hover:bg-green-500/20 hover:text-green-600"
                        onClick={() =>
                          handleUpdateStatus(withdrawal, 'approved')
                        }
                        disabled={withdrawal.status !== 'pending'}
                      >
                        <Check className="h-4 w-4 mr-1" /> Paid
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600"
                        onClick={() =>
                          handleUpdateStatus(withdrawal, 'rejected')
                        }
                        disabled={withdrawal.status !== 'pending'}
                      >
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
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
