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
import { doc, updateDoc, runTransaction, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

type Deposit = {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  utr: string;
  createdAt: Timestamp;
  status: 'pending' | 'approved' | 'rejected';
};

const formatDate = (timestamp: Timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleDateString();
};

export default function DepositsPage() {
  const { data: deposits, loading } = useCollection<Deposit>('deposits');
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleUpdateStatus = async (
    deposit: Deposit,
    newStatus: 'approved' | 'rejected'
  ) => {
    const depositRef = doc(firestore, 'deposits', deposit.id);
    const userRef = doc(firestore, 'users', deposit.userId);

    try {
      if (newStatus === 'approved') {
        await runTransaction(firestore, async (transaction) => {
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists()) {
            throw 'User document does not exist!';
          }
          const newBalance = (userDoc.data().walletBalance || 0) + deposit.amount;
          transaction.update(userRef, { walletBalance: newBalance });
          transaction.update(depositRef, { status: newStatus });
        });
        toast({
          title: 'Deposit Approved',
          description: `₹${deposit.amount} has been added to the user's wallet.`,
        });
      } else {
        // Just reject the request
        await updateDoc(depositRef, { status: newStatus });
        toast({
          title: 'Deposit Rejected',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating deposit status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update deposit status.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Deposit Requests</h2>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Name</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>UTR Number</TableHead>
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
              deposits?.map((deposit) => (
                <TableRow key={deposit.id}>
                  <TableCell>{deposit.userName}</TableCell>
                  <TableCell>₹{deposit.amount.toFixed(2)}</TableCell>
                  <TableCell>{deposit.utr}</TableCell>
                  <TableCell>{formatDate(deposit.createdAt)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        deposit.status === 'approved'
                          ? 'default'
                          : deposit.status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="capitalize"
                    >
                      {deposit.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-green-500/10 text-green-500 hover:bg-green-500/20 hover:text-green-600"
                        onClick={() => handleUpdateStatus(deposit, 'approved')}
                        disabled={deposit.status !== 'pending'}
                      >
                        <Check className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600"
                        onClick={() => handleUpdateStatus(deposit, 'rejected')}
                        disabled={deposit.status !== 'pending'}
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
