
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
import {
  doc,
  runTransaction,
  Timestamp,
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type UpiRequest = {
  id: string;
  userId: string;
  userName: string;
  upiId: string;
  upiProvider: string;
  createdAt: Timestamp;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
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

  const handleUpdateStatus = (
    request: UpiRequest,
    newStatus: 'approved' | 'rejected',
    reason?: string
  ) => {
    
    runTransaction(firestore, async (transaction) => {
        const requestRef = doc(firestore, 'upiRequests', request.id);
        const userRef = doc(firestore, 'users', request.userId);

        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw 'User does not exist!';

        if (newStatus === 'approved') {
            transaction.update(requestRef, { status: 'approved' });
            transaction.update(userRef, {
                upiId: request.upiId,
                upiProvider: request.upiProvider,
                upiStatus: 'Verified',
            });
        } else { // rejected
            transaction.update(requestRef, { status: 'rejected', rejectionReason: reason });
            transaction.update(userRef, { upiStatus: 'Rejected' });
        }
    })
    .then(() => {
      toast({
        title: `UPI Request ${newStatus === 'approved' ? 'Approved' : 'Rejected'}`,
        description: `The request for ${request.userName} has been updated.`,
        variant: newStatus === 'rejected' ? 'destructive' : 'default',
      });
    })
    .catch((error) => {
      console.error('Error updating UPI request status:', error);
      const permissionError = new FirestorePermissionError({
        path: `upiRequests/${request.id} or users/${request.userId}`,
        operation: 'write',
        requestResourceData: { status: newStatus },
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  
  const openRejectDialog = (request: UpiRequest) => {
    setRequestToUpdate(request);
    setIsRejectDialogOpen(true);
  };

  const handleConfirmRejection = () => {
    if (!requestToUpdate || !rejectionReason) {
      toast({ title: 'Reason is required', variant: 'destructive' });
      return;
    }
    handleUpdateStatus(requestToUpdate, 'rejected', rejectionReason);
    setIsRejectDialogOpen(false);
    setRejectionReason('');
    setRequestToUpdate(null);
  };

  const pendingRequests = upiRequests?.filter(r => r.status === 'pending');

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
            ) : pendingRequests && pendingRequests.length > 0 ? (
              pendingRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{request.userName}</TableCell>
                  <TableCell>{request.upiId}</TableCell>
                  <TableCell>
                      <Badge variant="outline">{request.upiProvider}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(request.createdAt)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={ request.status === 'approved' ? 'default' : request.status === 'rejected' ? 'destructive' : 'secondary'}
                      className="capitalize"
                    >
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
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
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
                 <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No pending UPI requests.
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
              Please provide a reason for rejecting this UPI request. The user will see this reason.
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
