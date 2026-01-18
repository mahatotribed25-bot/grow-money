
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
  repaymentMethod: 'EMI' | 'Direct';
  rejectionReason?: string;
};

type DurationType = 'Days' | 'Weeks' | 'Months' | 'Years';

type LoanPlan = {
    id: string;
    name: string;
    loanAmount: number;
    interest: number;
    tax?: number;
    totalRepayment: number;
    duration: number;
    durationType: DurationType;
    emiOption: boolean;
    directPayOption: boolean;
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

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [requestToReject, setRequestToReject] = useState<LoanRequest | null>(null);

  const handleUpdateStatus = (
    request: LoanRequest,
    newStatus: 'approved' | 'rejected',
    reason?: string
  ) => {
    const requestRef = doc(firestore, 'loanRequests', request.id);
    
    if (newStatus === 'approved') {
        const plan = loanPlans?.find(p => p.id === request.planId);
        if (!plan) {
            toast({ title: 'Error', description: 'Could not find the associated loan plan.', variant: 'destructive' });
            return;
        }

        const batch = writeBatch(firestore);
        batch.update(requestRef, { status: newStatus });
        
        const loanRef = doc(collection(firestore, 'users', request.userId, 'loans'));
        const startDate = new Date();
        let dueDate;
        let addDuration;

        switch(plan.durationType) {
            case 'Days': addDuration = addDays; break;
            case 'Weeks': addDuration = addWeeks; break;
            case 'Months': addDuration = addMonths; break;
            case 'Years': addDuration = addYears; break;
            default: addDuration = addDays;
        }
        dueDate = addDuration(startDate, plan.duration);

        const activeLoanData: any = {
            userId: request.userId,
            planName: plan.name,
            loanAmount: plan.loanAmount,
            interest: plan.interest,
            totalPayable: plan.totalRepayment,
            duration: plan.duration,
            durationType: plan.durationType,
            startDate: Timestamp.fromDate(startDate),
            dueDate: Timestamp.fromDate(dueDate),
            status: 'Active',
            amountPaid: 0,
            repaymentMethod: request.repaymentMethod,
        };

        if (request.repaymentMethod === 'EMI') {
            const emis = [];
            let numberOfEmis = 0;
            let addEmiDuration: (date: Date, num: number) => Date = addMonths; // Default to monthly for EMI

            if (plan.durationType === 'Months') {
                numberOfEmis = plan.duration;
            } else if (plan.durationType === 'Years') {
                numberOfEmis = plan.duration * 12;
            } else if (plan.durationType === 'Weeks') {
                // Weekly EMIs if duration is in weeks
                numberOfEmis = plan.duration;
                addEmiDuration = addWeeks;
            }
            
            if (numberOfEmis > 0) {
                const emiAmount = plan.totalRepayment / numberOfEmis;
                for (let i = 1; i <= numberOfEmis; i++) {
                    emis.push({
                        emiAmount: emiAmount,
                        dueDate: Timestamp.fromDate(addEmiDuration(startDate, i)),
                        status: 'Pending',
                    });
                }
                activeLoanData.emis = emis;
            }
        }


        batch.set(loanRef, activeLoanData);

        batch.commit()
            .then(() => {
                toast({
                    title: 'Loan Approved',
                    description: `Loan for ${request.userName} is approved. Please send the funds manually.`,
                });
            })
            .catch((error) => {
                console.error('Error approving loan request:', error);
                const permissionError = new FirestorePermissionError({
                    path: `loanRequests or users subcollections`,
                    operation: 'write',
                    requestResourceData: { requestId: request.id, status: newStatus },
                });
                errorEmitter.emit('permission-error', permissionError);
            });

    } else { // 'rejected'
        const updateData = { status: newStatus, rejectionReason: reason };
        updateDoc(requestRef, updateData)
            .then(() => {
                toast({
                    title: 'Loan Rejected',
                    variant: 'destructive',
                });
            })
            .catch((error) => {
                 console.error('Error rejecting loan request:', error);
                const permissionError = new FirestorePermissionError({
                    path: requestRef.path,
                    operation: 'update',
                    requestResourceData: updateData,
                });
                errorEmitter.emit('permission-error', permissionError);
            });
    }
  };

  const handleMarkAsSent = (request: LoanRequest) => {
      const requestRef = doc(firestore, 'loanRequests', request.id);
      const updateData = { status: 'sent' };
      updateDoc(requestRef, updateData)
        .then(() => {
          toast({
              title: 'Amount Sent',
              description: `Loan amount for ${request.userName} has been marked as sent.`,
          });
        })
        .catch((error) => {
            console.error("Error marking as sent:", error);
            const permissionError = new FirestorePermissionError({
                path: requestRef.path,
                operation: 'update',
                requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
  }
  
  const openRejectDialog = (request: LoanRequest) => {
    setRequestToReject(request);
    setIsRejectDialogOpen(true);
  };

  const handleConfirmRejection = () => {
    if (!requestToReject || !rejectionReason) {
      toast({ title: 'Reason is required', variant: 'destructive' });
      return;
    }
    handleUpdateStatus(requestToReject, 'rejected', rejectionReason);
    setIsRejectDialogOpen(false);
    setRejectionReason('');
    setRequestToReject(null);
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
              <TableHead>User UPI</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
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
                  <TableCell>{request.rejectionReason || 'N/A'}</TableCell>
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
                                onClick={() => openRejectDialog(request)}
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
       <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reason for Rejection</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this loan request. The user will see this reason.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter reason here..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => {setIsRejectDialogOpen(false); setRejectionReason('');}}>Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleConfirmRejection}>Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
