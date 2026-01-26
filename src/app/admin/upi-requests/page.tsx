
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
  runTransaction,
  Timestamp,
  updateDoc,
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
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type UpiRequest = {
  id: string;
  userId: string;
  userName: string;
  upiId: string;
  upiProvider: string;
  createdAt: Timestamp;
  status: 'pending' | 'awaiting_confirmation' | 'approved' | 'rejected';
  rejectionReason?: string;
  confirmationAmount?: number;
};

const formatDate = (timestamp: Timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleDateString();
};

export default function UpiRequestsPage() {
  const { data: upiRequests, loading } = useCollection<UpiRequest>('upiRequests');
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [requestToUpdate, setRequestToUpdate] = useState<UpiRequest | null>(null);
  
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmationAmount, setConfirmationAmount] = useState<number | ''>('');


  const handleRejectRequest = (reason?: string) => {
    if (!requestToUpdate) return;
    
    runTransaction(firestore, async (transaction) => {
        const requestRef = doc(firestore, 'upiRequests', requestToUpdate.id);
        const userRef = doc(firestore, 'users', requestToUpdate.userId);

        transaction.update(requestRef, { status: 'rejected', rejectionReason: reason || 'Rejected by admin' });
        transaction.update(userRef, { upiStatus: 'Rejected' });
    })
    .then(() => {
      toast({
        title: `UPI Request Rejected`,
        description: `The request for ${requestToUpdate.userName} has been rejected.`,
        variant: 'destructive',
      });
    })
    .catch((error) => {
      console.error('Error rejecting UPI request:', error);
       const permissionError = new FirestorePermissionError({
        path: `upiRequests/${requestToUpdate.id} or users/${requestToUpdate.userId}`,
        operation: 'write',
        requestResourceData: { status: 'rejected' },
      });
      errorEmitter.emit('permission-error', permissionError);
    })
    .finally(() => {
        setIsRejectDialogOpen(false);
        setRejectionReason('');
        setRequestToUpdate(null);
    });
  };

  
  const openRejectDialog = (request: UpiRequest) => {
    setRequestToUpdate(request);
    setIsRejectDialogOpen(true);
  };

  const openConfirmDialog = (request: UpiRequest) => {
    setRequestToUpdate(request);
    setIsConfirmDialogOpen(true);
  };
  
  const handleSendConfirmation = () => {
    if (!requestToUpdate || !confirmationAmount) {
        toast({ title: 'Invalid amount', description: 'Please enter a valid confirmation amount.', variant: 'destructive'});
        return;
    }

    const requestRef = doc(firestore, 'upiRequests', requestToUpdate.id);
    const updateData = {
        status: 'awaiting_confirmation',
        confirmationAmount: Number(confirmationAmount),
    };
    updateDoc(requestRef, updateData)
    .then(() => {
        toast({ title: 'Confirmation Sent', description: 'Request is now waiting for user to confirm the amount.'});
    })
    .catch((error) => {
        console.error('Error sending confirmation:', error);
        const permissionError = new FirestorePermissionError({
            path: requestRef.path,
            operation: 'update',
            requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
    })
    .finally(() => {
        setIsConfirmDialogOpen(false);
        setConfirmationAmount('');
        setRequestToUpdate(null);
    });
  };

  const getStatusBadge = (status: UpiRequest['status']) => {
    switch (status) {
        case 'pending': return <Badge variant="secondary">Pending Admin</Badge>;
        case 'awaiting_confirmation': return <Badge variant="outline" className="border-blue-500 text-blue-400">Awaiting User</Badge>;
        case 'approved': return <Badge variant="default">Approved</Badge>;
        case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
        default: return <Badge variant="secondary">{status}</Badge>;
    }
  }


  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">UPI Verification Requests</h2>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Name</TableHead>
              <TableHead>UPI ID</TableHead>
              <TableHead>Provider</TableHead>
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
            ) : upiRequests && upiRequests.length > 0 ? (
              upiRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{request.userName}</TableCell>
                  <TableCell>{request.upiId}</TableCell>
                  <TableCell>
                      <Badge variant="outline">{request.upiProvider}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(request.createdAt)}</TableCell>
                  <TableCell>
                    {getStatusBadge(request.status)}
                  </TableCell>
                  <TableCell>
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                            onClick={() => openConfirmDialog(request)}
                        >
                            <Send className="h-4 w-4 mr-1" /> Send Confirmation
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => openRejectDialog(request)}
                        >
                            <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                     {request.status === 'awaiting_confirmation' && (
                        <span className="text-xs text-muted-foreground">Waiting for user...</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
                 <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No UPI requests found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

       <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reason for Rejection</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this UPI request. The user will see this. (Optional)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g., UPI ID is invalid"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => {setIsRejectDialogOpen(false); setRejectionReason('');}}>Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={() => handleRejectRequest(rejectionReason)}>Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Confirmation Amount</DialogTitle>
            <DialogDescription>
             Send a small, random amount (e.g., ₹1.07) to the user's UPI ID. Then, enter the exact amount you sent below to proceed.
            </DialogDescription>
          </DialogHeader>
           <div className="py-4 space-y-4">
             <p>Send payment to: <span className="font-mono p-1 bg-muted rounded">{requestToUpdate?.upiId}</span></p>
            <div className="space-y-2">
                <Label htmlFor="confirmationAmount">Amount Sent (e.g., 1.07)</Label>
                <Input
                    id="confirmationAmount"
                    type="number"
                    step="0.01"
                    placeholder="Enter the exact amount"
                    value={confirmationAmount}
                    onChange={(e) => setConfirmationAmount(Number(e.target.value))}
                />
            </div>
           </div>
           <DialogFooter>
             <DialogClose asChild>
              <Button variant="outline" onClick={() => {setIsConfirmDialogOpen(false); setConfirmationAmount('');}}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleSendConfirmation}>Submit Amount</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    