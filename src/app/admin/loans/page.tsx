
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
import { Check, X, ShieldCheck } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import {
  doc,
  updateDoc,
  writeBatch,
  collection,
  Timestamp,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';

type LoanRequest = {
  id: string;
  userId: string;
  userName: string;
  planName: string;
  loanAmount: number;
  createdAt: Timestamp;
  status: 'pending' | 'approved' | 'rejected' | 'sent';
  planId: string;
  userUpiId?: string;
};

type DurationType = 'Days' | 'Weeks' | 'Months' | 'Years';

type LoanPlan = {
    id: string;
    name: string;
    loanAmount: number;
    interest: number;
    totalRepayment: number;
    duration: number;
    durationType: DurationType;
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
    
    try {
        if (newStatus === 'approved') {
            const plan = loanPlans?.find(p => p.id === request.planId);
            if (!plan) {
                throw new Error("Could not find the associated loan plan.");
            }

            const batch = writeBatch(firestore);

            // 1. Update the request status to approved
            batch.update(requestRef, { status: newStatus });
            
            // 2. Create an active loan document for the user
            const loanRef = doc(collection(firestore, 'users', request.userId, 'loans'));
            const startDate = new Date();
            let dueDate;

            switch(plan.durationType) {
                case 'Days':
                    dueDate = addDays(startDate, plan.duration);
                    break;
                case 'Weeks':
                    dueDate = addWeeks(startDate, plan.duration);
                    break;
                case 'Months':
                    dueDate = addMonths(startDate, plan.duration);
                    break;
                case 'Years':
                    dueDate = addYears(startDate, plan.duration);
                    break;
                default:
                    dueDate = addDays(startDate, plan.duration); // Fallback
            }

            batch.set(loanRef, {
                userId: request.userId,
                planName: plan.name,
                loanAmount: plan.loanAmount,
                interest: plan.interest,
                totalPayable: plan.totalRepayment,
                duration: plan.duration,
                durationType: plan.durationType || 'Days',
                startDate: Timestamp.fromDate(startDate),
                dueDate: Timestamp.fromDate(dueDate),
                status: 'Active',
                amountPaid: 0
            });

            await batch.commit();
            toast({
                title: 'Loan Approved',
                description: `Loan for ${request.userName} is approved. Please send the funds manually.`,
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

  const handleMarkAsSent = async (request: LoanRequest) => {
      const requestRef = doc(firestore, 'loanRequests', request.id);
      try {
          await updateDoc(requestRef, { status: 'sent' });
          toast({
              title: 'Amount Sent',
              description: `Loan amount for ${request.userName} has been marked as sent.`,
          });
      } catch (error) {
          console.error("Error marking as sent:", error);
          toast({
              title: "Error",
              description: "Could not mark the loan as sent.",
              variant: "destructive"
          });
      }
  }


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
              <TableHead>User UPI</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : (
              loanRequests?.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{request.userName}</TableCell>
                  <TableCell>{request.planName}</TableCell>
                  <TableCell>₹{(request.loanAmount || 0).toFixed(2)}</TableCell>
                  <TableCell>{request.userUpiId || 'N/A'}</TableCell>
                  <TableCell>{formatDate(request.createdAt)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        request.status === 'approved' || request.status === 'sent'
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
                       {request.status === 'pending' && (
                           <>
                             <Button
                                variant="outline"
                                size="sm"
                                className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                                onClick={() => handleUpdateStatus(request, 'approved')}
                              >
                                <Check className="h-4 w-4 mr-1" /> Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                onClick={() => handleUpdateStatus(request, 'rejected')}
                              >
                                <X className="h-4 w-4 mr-1" /> Reject
                              </Button>
                           </>
                       )}
                       {request.status === 'approved' && (
                           <Button
                                variant="outline"
                                size="sm"
                                className="text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                                onClick={() => handleMarkAsSent(request)}
                            >
                                <ShieldCheck className="h-4 w-4 mr-1" /> Mark as Sent
                           </Button>
                       )}

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

    
