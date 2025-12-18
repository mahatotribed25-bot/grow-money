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
import { doc, updateDoc } from 'firebase/firestore';

type Withdrawal = {
  id: string;
  userId: string;
  userEmail?: string; // This might not be on the withdrawal doc directly
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

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    const withdrawalRef = doc(firestore, 'withdrawals', id);
    try {
      await updateDoc(withdrawalRef, { status });
    } catch (error) {
      console.error('Error updating withdrawal status:', error);
      // You might want to show a toast message here
    }
  };


  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Withdrawal Requests</h2>
       <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User ID</TableHead>
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
                    <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                </TableRow>
            ) : (
                withdrawals?.map((withdrawal) => (
                <TableRow key={withdrawal.id}>
                    <TableCell className="font-mono text-xs">{withdrawal.userId}</TableCell>
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
                                onClick={() => handleUpdateStatus(withdrawal.id, 'approved')}
                                disabled={withdrawal.status !== 'pending'}
                            >
                                <Check className="h-4 w-4 mr-1" /> Paid
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600"
                                onClick={() => handleUpdateStatus(withdrawal.id, 'rejected')}
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
