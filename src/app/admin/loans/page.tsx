
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
import { Check, X, ShieldCheck, Copy, QrCode } from 'lucide-react';
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
import Image from 'next/image';
import { Label } from '@/components/ui/label';

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
  const [requestToProcess, setRequestToProcess] = useState<LoanRequest | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const handleApproveClick = (request: LoanRequest) => {
    if (!request.userUpiId) {
        toast({
            title: "Missing UPI ID",
            description: "Cannot process loan because the user has not provided a UPI ID.",
            variant: "destructive",
        });
        return;
    }
    setRequestToProcess(request);
    setIsPaymentDialogOpen(true);
  };
  
  const handleConfirmPaymentSent = () => {
    if (!requestToProcess) return;

    const request = requestToProcess;
    const plan = loanPlans?.find(p => p.id === request.planId);
    if (!plan) {
        toast({ title: 'Error', description: 'Could not find the associated loan plan.', variant: 'destructive' });
        return;
    }

    const batch = writeBatch(firestore);
    const requestRef = doc(firestore, 'loanRequests', request.id);
    batch.update(requestRef, { status: 'sent' });
    
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
                title: 'Loan Approved & Sent',
                description: `Loan for ${request.userName} is now active.`,
            });
            setIsPaymentDialogOpen(false);
            setRequestToProcess(null);
        })
        .catch((error) => {
            console.error('Error approving loan request:', error);
            const permissionError = new FirestorePermissionError({
                path: `loanRequests or users subcollections`,
                operation: 'write',
                requestResourceData: { requestId: request.id, status: 'sent' },
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    };

  
  const openRejectDialog = (request: LoanRequest) => {
    setRequestToProcess(request);
    setIsRejectDialogOpen(true);
  };

  const handleConfirmRejection = () => {
    if (!requestToProcess) return;
    const requestRef = doc(firestore, 'loanRequests', requestToProcess.id);
    const updateData = { status: 'rejected' as const, rejectionReason: rejectionReason || 'Rejected by admin' };
     updateDoc(requestRef, updateData)
            .then(() => {
                toast({
                    title: 'Loan Rejected',
                    variant: 'destructive',
                });
                setIsRejectDialogOpen(false);
                setRejectionReason('');
                setRequestToProcess(null);
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
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: `${label} Copied!`, description: text });
  };
  
  const upiDeeplink = requestToProcess && requestToProcess.userUpiId ? `upi://pay?pa=${requestToProcess.userUpiId}&pn=${encodeURIComponent(requestToProcess.userName)}&am=${requestToProcess.loanAmount.toFixed(2)}&cu=INR` : '';


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
                                onClick={() => handleApproveClick(request)}
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
      
       <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Process Loan Payment</DialogTitle>
                <DialogDescription>
                    Send loan amount to {requestToProcess?.userName} and then confirm.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="flex flex-col items-center gap-2 p-4 rounded-md bg-muted">
                    <p className="font-semibold">Scan QR Code to Pay</p>
                     <div className="bg-white p-2 rounded-md">
                        <Image
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiDeeplink)}`}
                            alt="UPI QR Code"
                            width={200}
                            height={200}
                        />
                    </div>
                </div>
                
                <div className="flex items-center justify-between">
                    <Label htmlFor="upiId" className="text-muted-foreground">User UPI ID</Label>
                    <div className="flex items-center gap-2">
                        <span id="upiId" className="font-mono">{requestToProcess?.userUpiId}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyToClipboard(requestToProcess?.userUpiId || '', 'UPI ID')}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                 
                <div className="flex items-center justify-between text-lg font-bold">
                    <Label htmlFor="totalAmount">Amount to Pay</Label>
                    <div className="flex items-center gap-2">
                        <span id="totalAmount" className="font-mono">₹{(requestToProcess?.loanAmount || 0).toFixed(2)}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyToClipboard((requestToProcess?.loanAmount || 0).toFixed(2), 'Amount')}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                 <Button asChild className="w-full">
                    <a href={upiDeeplink}>
                        <QrCode className="mr-2" /> Pay with UPI App
                    </a>
                </Button>
            </div>
            <DialogFooter className="sm:justify-between">
                <DialogClose asChild>
                    <Button type="button" variant="secondary" onClick={() => setRequestToProcess(null)}>Cancel</Button>
                </DialogClose>
                <Button type="button" onClick={handleConfirmPaymentSent}>
                    <ShieldCheck className="mr-2" />
                    Confirm Payment Sent
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
