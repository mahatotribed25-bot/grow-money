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
import { Check, X, Trash2 } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import type { Timestamp } from 'firebase/firestore';
import {
  doc,
  updateDoc,
  runTransaction,
  getDoc,
  deleteDoc,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);

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
          const newBalance =
            (userDoc.data().walletBalance || 0) + deposit.amount;
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

  const handleDeleteDeposit = async () => {
    if (!selectedDeposit) return;
    try {
      await deleteDoc(doc(firestore, 'deposits', selectedDeposit.id));
      toast({
        title: 'Deposit Deleted',
        description: 'The deposit request has been successfully deleted.',
      });
      setSelectedDeposit(null);
    } catch (error) {
      console.error('Error deleting deposit:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete deposit request.',
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => setSelectedDeposit(deposit)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Are you sure you want to delete this deposit?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will
                              permanently delete the deposit request.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel
                              onClick={() => setSelectedDeposit(null)}
                            >
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteDeposit}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
