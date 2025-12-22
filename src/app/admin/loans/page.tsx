
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
import { Check, X } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import type { Timestamp } from 'firebase/firestore';
import {
  doc,
  updateDoc,
  runTransaction,
  collection,
  writeBatch,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { add } from 'date-fns';

type LoanRequest = {
  id: string;
  userId: string;
  userName: string;
  planName: string;
  loanAmount: number;
  createdAt: Timestamp;
  status: 'pending' | 'approved' | 'rejected';
  planId: string;
};

type LoanPlan = {
    id: string;
    name: string;
    loanAmount: number;
    interest: number;
    totalRepayment: number;
    duration: number; // in months
};

const formatDate = (timestamp: Timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleDateString();
};

export default function LoanRequestsPage() {
  const { data: loanRequests, loading } = useCollection<LoanRequest>('loanRequests');
  const { data: loanPlans } = useCollection<LoanPlan>('loanPlans');
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleUpdateStatus = async (
    request: LoanRequest,
    newStatus: 'approved' | 'rejected'
  ) => {
    const requestRef = doc(firestore, 'loanRequests', request.id);
    const userRef = doc(firestore, 'users', request.userId);

    try {
      if (newStatus === 'approved') {
        const plan = loanPlans?.find(p => p.id === request.planId);
        if (!plan) {
            throw new Error("Could not find the associated loan plan.");
        }

        await runTransaction(firestore, async (transaction) => {
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists()) {
            throw 'User document does not exist!';
          }

          // 1. Credit loan amount to user's wallet
          const newBalance = (userDoc.data().walletBalance || 0) + plan.loanAmount;
          transaction.update(userRef, { walletBalance: newBalance });

          // 2. Update the request status
          transaction.update(requestRef, { status: newStatus });
          
          // 3. Create an active loan document for the user
          const loanRef = doc(collection(firestore, 'users', request.userId, 'loans'));
          const startDate = new Date();
          const dueDate = add(startDate, { months: plan.duration });

          transaction.set(loanRef, {
              userId: request.userId,
              planName: plan.name,
              loanAmount: plan.loanAmount,
              interest: plan.interest,
              totalPayable: plan.totalRepayment,
              duration: plan.duration,
              startDate: Timestamp.fromDate(startDate),
              dueDate: Timestamp.fromDate(dueDate),
              status: 'Active',
              amountPaid: 0
          });
        });

        toast({
          title: 'Loan Approved',
          description: `₹${request.loanAmount} has been credited to ${request.userName}'s wallet.`,
        });

      } else { // 'rejected'
        await updateDoc(requestRef, { status: newStatus });
        toast({
          title: 'Loan Rejected',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating loan request status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update loan request status.',
        variant: 'destructive',
      });
    }
  };


  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Loan Requests</h2>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Name</TableHead>
              <TableHead>Plan Name</TableHead>
              <TableHead>Loan Amount</TableHead>
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
              loanRequests?.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{request.userName}</TableCell>
                  <TableCell>{request.planName}</TableCell>
                  <TableCell>₹{request.loanAmount.toFixed(2)}</TableCell>
                  <TableCell>{formatDate(request.createdAt)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        request.status === 'approved'
                          ? 'default'
                          : request.status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="capitalize"
                    >
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                        onClick={() => handleUpdateStatus(request, 'approved')}
                        disabled={request.status !== 'pending'}
                      >
                        <Check className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => handleUpdateStatus(request, 'rejected')}
                        disabled={request.status !== 'pending'}
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
