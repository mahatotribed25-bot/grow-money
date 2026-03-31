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
import { Check, X } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import type { Timestamp } from 'firebase/firestore';
import { doc, updateDoc, runTransaction } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type DepositRequest = {
  id: string;
  userId: string;
  name: string;
  amount: number;
  transactionId: string;
  createdAt: Timestamp;
  status: 'pending' | 'approved' | 'rejected';
};

const formatDate = (timestamp: Timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleDateString();
};

export default function DepositsPage() {
  const { data: deposits, loading } = useCollection<DepositRequest>('deposits');
  const firestore = useFirestore();
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const filteredDeposits = useMemo(() => {
    if (!deposits) return [];
    const sorted = [...deposits].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
    if (filterStatus === 'all') {
      return sorted;
    }
    return sorted.filter((d) => d.status === filterStatus);
  }, [deposits, filterStatus]);


  const handleUpdateStatus = (
    deposit: DepositRequest,
    newStatus: 'approved' | 'rejected'
  ) => {
    const depositRef = doc(firestore, 'deposits', deposit.id);
    const userRef = doc(firestore, 'users', deposit.userId);

    if (newStatus === 'approved') {
      runTransaction(firestore, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw 'User does not exist!';
        }

        const newBalance = (userDoc.data().walletBalance || 0) + deposit.amount;
        transaction.update(userRef, { walletBalance: newBalance });
        transaction.update(depositRef, { status: newStatus });
      })
      .then(() => {
          toast({
            title: 'Deposit Approved',
            description: `₹${deposit.amount} has been added to ${deposit.name}'s wallet.`,
          });
      })
      .catch((error) => {
          console.error('Error updating deposit status:', error);
          const permissionError = new FirestorePermissionError({
            path: `users/${deposit.userId} or deposits/${deposit.id}`,
            operation: 'write',
            requestResourceData: { status: newStatus, amount: deposit.amount },
          });
          errorEmitter.emit('permission-error', permissionError);
      });
    } else {
      // Just reject the request
      updateDoc(depositRef, { status: newStatus })
      .then(() => {
          toast({
            title: 'Deposit Rejected',
            variant: 'destructive',
          });
      })
      .catch((error) => {
          console.error('Error updating deposit status:', error);
          const permissionError = new FirestorePermissionError({
            path: depositRef.path,
            operation: 'update',
            requestResourceData: { status: newStatus },
          });
          errorEmitter.emit('permission-error', permissionError);
      });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Deposit Requests</h2>
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
              <TableHead>Amount</TableHead>
              <TableHead>Transaction ID</TableHead>
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
            ) : filteredDeposits.length > 0 ? (
              filteredDeposits.map((deposit) => (
                <TableRow key={deposit.id}>
                  <TableCell>{deposit.name || 'N/A'}</TableCell>
                  <TableCell>₹{deposit.amount.toFixed(2)}</TableCell>
                  <TableCell>{deposit.transactionId}</TableCell>
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
                    >
                      {deposit.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {deposit.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                           className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                          onClick={() => handleUpdateStatus(deposit, 'approved')}
                        >
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                           className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => handleUpdateStatus(deposit, 'rejected')}
                        >
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No {filterStatus} deposits found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
