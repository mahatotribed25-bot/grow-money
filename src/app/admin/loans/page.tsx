
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
import { Check, X, ShieldCheck, Copy, QrCode, Timer, Landmark, Smartphone } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import {
  doc,
  updateDoc,
  writeBatch,
  collection,
  Timestamp,
  serverTimestamp,
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
    const historyRef = doc(collection(firestore, 'users', request.userId, 'walletHistory'));
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
        let addEmiDuration: (date: Date, num: number) => Date = addMonths; 

        if (plan.durationType === 'Months') {
            numberOfEmis = plan.duration;
        } else if (plan.durationType === 'Years') {
            numberOfEmis = plan.duration * 12;
        } else if (plan.durationType === 'Weeks') {
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

    batch.set(historyRef, {
        amount: plan.loanAmount,
        type: 'credit',
        category: 'Loan Disbursal',
        description: `Disbursed loan for ${plan.name}`,
        createdAt: serverTimestamp()
    });

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
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">Standard Loan Requests</h2>
        <p className="text-[10px] font-black uppercase text-white/20 tracking-[4px]">Validation Pipeline</p>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-white/[0.02]">
            <TableRow className="border-white/5">
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30 pl-6 py-5">Investor</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">Asset Details</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">Principal</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">Payment Address</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">Status</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30 pr-6 text-right">Dispatch</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20">
                   <Timer className="animate-spin h-6 w-6 text-primary mx-auto mb-2" />
                   <p className="text-[10px] font-black uppercase text-white/20 tracking-widest">Accessing Pipeline...</p>
                </TableCell>
              </TableRow>
            ) : loanRequests && loanRequests.length > 0 ? (
              loanRequests.map((request) => (
                <TableRow key={request.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                  <TableCell className="pl-6 py-4 font-bold text-white/90">{request.userName}</TableCell>
                  <TableCell>
                      <div className="flex flex-col">
                          <span className="text-xs font-bold text-white/80">{request.planName}</span>
                          <span className="text-[9px] text-white/20 uppercase font-black">{request.repaymentMethod} Node</span>
                      </div>
                  </TableCell>
                  <TableCell className="font-black text-white">₹{(request.loanAmount || 0).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-[10px] text-primary">{request.userUpiId || 'NO UPI'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                        "text-[9px] font-black uppercase h-6 px-3",
                        request.status === 'sent' ? "border-green-500/20 text-green-400 bg-green-500/5" :
                        request.status === 'rejected' ? "border-red-500/20 text-red-500 bg-red-500/5" :
                        "border-white/10 text-white/40"
                    )}>
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex justify-end gap-2">
                       {request.status === 'pending' && (
                           <>
                             <Button
                                variant="outline"
                                size="sm"
                                className="bg-green-600/10 text-green-500 border-green-500/20 hover:bg-green-600 hover:text-white h-8 rounded-lg px-4 font-bold text-[10px]"
                                onClick={() => handleApproveClick(request)}
                              >
                                DISPATCH
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-red-600/10 text-red-500 border-red-500/20 hover:bg-red-600 hover:text-white h-8 rounded-lg px-4 font-bold text-[10px]"
                                onClick={() => openRejectDialog(request)}
                              >
                                DENY
                              </Button>
                           </>
                       )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-white/10 italic">No loan requests in current window.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

       <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Request Denial</DialogTitle>
            <DialogDescription className="text-white/40 text-xs">
              Provide a clear reason for rejecting this protocol request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g. Identity mismatch or low trust score..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="bg-white/5 border-white/10"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" className="text-white/40">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" className="rounded-xl font-bold px-8" onClick={handleConfirmRejection}>Confirm Denial</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem] max-w-sm">
            <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase tracking-tight text-center">Fund Dispatch Node</DialogTitle>
                <DialogDescription className="text-white/40 text-center text-xs">
                    Execute manual transfer to investor node.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-6">
                <div className="flex flex-col items-center gap-4">
                    <div className="bg-white p-3 rounded-2xl shadow-xl">
                        <Image
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiDeeplink)}`}
                            alt="UPI QR"
                            width={180}
                            height={180}
                        />
                    </div>
                    <div className="text-center">
                         <p className="text-[10px] font-black text-white/20 uppercase tracking-[3px]">Dispatch Sum</p>
                         <p className="text-3xl font-black text-green-400 tracking-tighter">₹{(requestToProcess?.loanAmount || 0).toLocaleString()}</p>
                    </div>
                </div>
                
                <div className="space-y-2 px-1">
                    <Label className="text-[10px] font-black text-white/20 uppercase tracking-widest pl-1">Destination ID</Label>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center">
                        <span className="font-mono text-sm font-bold text-primary">{requestToProcess?.userUpiId}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10" onClick={() => handleCopyToClipboard(requestToProcess?.userUpiId || '', 'UPI ID')}>
                            <Copy size={14} />
                        </Button>
                    </div>
                </div>

                 <Button asChild className="w-full h-12 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] shadow-xl">
                    <a href={upiDeeplink}>
                        <QrCode size={16} className="mr-2" /> Launch UPI Terminal
                    </a>
                </Button>
                <Button onClick={handleConfirmPaymentSent} className="w-full h-14 rounded-2xl bg-primary text-white font-black shadow-2xl shadow-primary/20">
                    <ShieldCheck size={18} className="mr-2" /> I HAVE PAID (ACTIVATE NODE)
                </Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
