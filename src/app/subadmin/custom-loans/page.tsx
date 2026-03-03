
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
import { Check, X, Send } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import {
  doc,
  updateDoc,
  Timestamp,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { addDays } from 'date-fns';

type CustomLoanRequest = {
  id: string;
  userId: string;
  userName: string;
  requestedAmount: number;
  requestedDuration: number;
  status: 'pending_admin_review' | 'pending_user_approval' | 'approved_by_user' | 'active' | 'completed' | 'rejected_by_user' | 'rejected_by_admin';
  interestRate?: number;
  interestAmount?: number;
  totalRepayment?: number;
  rejectionReason?: string;
  createdAt: Timestamp;
  dueDate?: Timestamp;
};

type UserData = {
  id: string;
  panCard?: string;
  aadhaarNumber?: string;
  phoneNumber?: string;
  kycStatus?: 'Not Submitted' | 'Pending' | 'Verified' | 'Rejected';
};

const formatDate = (timestamp?: Timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleString();
};

export default function CustomLoansPage() {
  const { data: requests, loading } = useCollection<CustomLoanRequest>('customLoanRequests');
  const firestore = useFirestore();
  const { toast } = useToast();

  const [requestToUpdate, setRequestToUpdate] = useState<CustomLoanRequest | null>(null);
  const [userKycData, setUserKycData] = useState<UserData | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [interestRate, setInterestRate] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const openApproveDialog = async (request: CustomLoanRequest) => {
    setRequestToUpdate(request);
    setInterestRate('');
    
    // Fetch user data for KYC
    try {
        const userRef = doc(firestore, 'users', request.userId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            setUserKycData({ id: userDoc.id, ...userDoc.data() } as UserData);
        } else {
            setUserKycData(null);
            toast({ title: 'User data not found', variant: 'destructive'});
        }
    } catch(e) {
        setUserKycData(null);
        toast({ title: 'Error fetching user data', variant: 'destructive'});
    }

    setIsApproveDialogOpen(true);
  };

  const openRejectDialog = (request: CustomLoanRequest) => {
    setRequestToUpdate(request);
    setRejectionReason('');
    setIsRejectDialogOpen(true);
  };
  
  const handleApprove = async () => {
    if (!requestToUpdate || !interestRate) {
        toast({ title: "Interest rate is required", variant: 'destructive'});
        return;
    }
    const rate = parseFloat(interestRate);
    if(isNaN(rate) || rate < 0) {
        toast({ title: "Invalid interest rate", variant: 'destructive'});
        return;
    }

    const interestAmount = (requestToUpdate.requestedAmount * rate) / 100;
    const totalRepayment = requestToUpdate.requestedAmount + interestAmount;

    const requestRef = doc(firestore, 'customLoanRequests', requestToUpdate.id);
    const updateData = {
        status: 'pending_user_approval',
        interestRate: rate,
        interestAmount: interestAmount,
        totalRepayment: totalRepayment,
        adminApprovedAt: serverTimestamp(),
    };

    try {
        await updateDoc(requestRef, updateData);
        toast({ title: 'Offer Sent', description: 'Loan offer sent to user for approval.'});
        setIsApproveDialogOpen(false);
        setRequestToUpdate(null);
    } catch(e) {
        const permissionError = new FirestorePermissionError({
            path: requestRef.path,
            operation: 'update',
            requestResourceData: updateData
        });
        errorEmitter.emit('permission-error', permissionError);
    }
  };

  const handleReject = async () => {
    if (!requestToUpdate) return;
    
    const requestRef = doc(firestore, 'customLoanRequests', requestToUpdate.id);
    const updateData = {
        status: 'rejected_by_admin',
        rejectionReason: rejectionReason || 'Rejected by admin'
    };
     try {
        await updateDoc(requestRef, updateData);
        toast({ title: 'Request Rejected', variant: 'destructive'});
        setIsRejectDialogOpen(false);
        setRequestToUpdate(null);
    } catch(e) {
        const permissionError = new FirestorePermissionError({
            path: requestRef.path,
            operation: 'update',
            requestResourceData: updateData
        });
        errorEmitter.emit('permission-error', permissionError);
    }
  }

  const handleMarkAsSent = async (request: CustomLoanRequest) => {
    const requestRef = doc(firestore, 'customLoanRequests', request.id);
    const now = new Date();
    const dueDate = addDays(now, request.requestedDuration);

    const updateData = {
        status: 'active',
        activatedAt: Timestamp.fromDate(now),
        dueDate: Timestamp.fromDate(dueDate),
    };
    try {
        await updateDoc(requestRef, updateData);
        toast({ title: 'Loan Activated', description: 'Loan has been marked as sent and is now active.'});
    } catch(e) {
        const permissionError = new FirestorePermissionError({
            path: requestRef.path,
            operation: 'update',
            requestResourceData: updateData
        });
        errorEmitter.emit('permission-error', permissionError);
    }
  };

  const handleMarkAsCompleted = async (request: CustomLoanRequest) => {
    const requestRef = doc(firestore, 'customLoanRequests', request.id);
    const updateData = {
        status: 'completed',
    };
    try {
        await updateDoc(requestRef, updateData);
        toast({ title: 'Loan Completed', description: 'Loan has been marked as completed.'});
    } catch(e) {
        const permissionError = new FirestorePermissionError({
            path: requestRef.path,
            operation: 'update',
            requestResourceData: updateData
        });
        errorEmitter.emit('permission-error', permissionError);
    }
  };


  const getStatusBadge = (status: CustomLoanRequest['status']) => {
    switch (status) {
      case 'pending_admin_review': return <Badge variant="secondary">Pending Admin</Badge>;
      case 'pending_user_approval': return <Badge variant="outline" className="border-blue-500 text-blue-400">Pending User</Badge>;
      case 'approved_by_user': return <Badge variant="default">User Approved</Badge>;
      case 'active': return <Badge variant="default" className="bg-green-600">Active</Badge>;
      case 'completed': return <Badge variant="outline">Completed</Badge>;
      case 'rejected_by_user':
      case 'rejected_by_admin':
        return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };
  
  const sortedRequests = requests?.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));


  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Custom Loan Requests History</h2>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Name</TableHead>
              <TableHead>Loan Details</TableHead>
              <TableHead>Interest</TableHead>
              <TableHead>Total Repayment</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>
            ) : sortedRequests?.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{request.userName}</TableCell>
                  <TableCell>
                      <div className="font-semibold">₹{request.requestedAmount.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">{request.requestedDuration} days</div>
                  </TableCell>
                  <TableCell>
                    {request.interestRate !== undefined ? (
                        <>
                            <div className="font-semibold">{request.interestRate}%</div>
                            <div className="text-xs text-muted-foreground">₹{request.interestAmount?.toFixed(2)}</div>
                        </>
                    ) : (
                        'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                    {request.totalRepayment !== undefined ? `₹${request.totalRepayment.toFixed(2)}` : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs">
                        <span>Created: {formatDate(request.createdAt)}</span>
                        {request.dueDate && <span>Due: {formatDate(request.dueDate)}</span>}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                        {request.status === 'pending_admin_review' && (
                            <>
                                <Button size="sm" onClick={() => openApproveDialog(request)}><Check className="mr-2 h-4 w-4" />Approve</Button>
                                <Button size="sm" variant="destructive" onClick={() => openRejectDialog(request)}><X className="mr-2 h-4 w-4"/>Reject</Button>
                            </>
                        )}
                        {request.status === 'approved_by_user' && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleMarkAsSent(request)}><Send className="mr-2 h-4 w-4"/>Mark as Sent</Button>
                        )}
                         {request.status === 'active' && (
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleMarkAsCompleted(request)}><Check className="mr-2 h-4 w-4"/>Mark as Repaid</Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </div>
      
      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Approve Loan & Set Interest</DialogTitle>
            <DialogDescription>Review KYC and set the interest rate. The offer will be sent to the user.</DialogDescription>
          </DialogHeader>
          
          {userKycData ? (
            <div className="space-y-2 rounded-md border p-4 my-4">
                <h4 className="font-semibold">KYC Details for {requestToUpdate?.userName}</h4>
                <p className="text-sm"><strong>Status:</strong> {userKycData.kycStatus}</p>
                <p className="text-sm"><strong>PAN:</strong> {userKycData.panCard || 'N/A'}</p>
                <p className="text-sm"><strong>Aadhaar:</strong> {userKycData.aadhaarNumber || 'N/A'}</p>
                <p className="text-sm"><strong>Phone:</strong> {userKycData.phoneNumber || 'N/A'}</p>
            </div>
            ) : <p>Loading KYC data...</p>
          }
          
          <div className="space-y-2">
            <Label htmlFor="interestRate">Interest Rate (%)</Label>
            <Input id="interestRate" type="number" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="e.g., 5" />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" onClick={() => setUserKycData(null)}>Cancel</Button></DialogClose>
            <Button onClick={handleApprove}>Send Offer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       {/* Reject Dialog */}
       <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Loan Request</DialogTitle>
            <DialogDescription>Provide a reason for rejection (optional). This will be visible to the user.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="rejectionReason">Reason</Label>
            <Textarea id="rejectionReason" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="e.g., Credit score too low" />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={handleReject}>Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
