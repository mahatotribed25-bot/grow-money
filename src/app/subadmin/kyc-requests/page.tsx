
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
  updateDoc,
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

type KycUser = {
  id: string; // This will be the user's ID
  name: string;
  panCard?: string;
  aadhaarNumber?: string;
  phoneNumber?: string;
  kycStatus: 'Not Submitted' | 'Pending' | 'Verified' | 'Rejected';
  kycSubmissionDate?: Timestamp;
};

const formatDate = (timestamp?: Timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleDateString();
};

export default function KycRequestsPage() {
  const { data: pendingUsers, loading } = useCollection<KycUser>('users', {
    where: ['kycStatus', '==', 'pending'],
  });
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [userToUpdate, setUserToUpdate] = useState<KycUser | null>(null);

  const handleUpdateStatus = (
    user: KycUser,
    newStatus: 'Verified' | 'Rejected',
    reason?: string
  ) => {
    const userRef = doc(firestore, 'users', user.id);
    const updateData: any = { kycStatus: newStatus };
    if (newStatus === 'Rejected') {
        updateData.kycRejectionReason = reason;
    } else {
        updateData.kycRejectionReason = ''; // Clear reason on approval
    }

    updateDoc(userRef, updateData)
        .then(() => {
            toast({
                title: `KYC Request ${newStatus}`,
                description: `The request for ${user.name} has been updated.`,
                variant: newStatus === 'Rejected' ? 'destructive' : 'default',
            });
        })
        .catch((error) => {
            console.error('Error updating KYC status:', error);
            const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'update',
                requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
  };

  const openRejectDialog = (user: KycUser) => {
    setUserToUpdate(user);
    setIsRejectDialogOpen(true);
  };

  const handleConfirmRejection = () => {
    if (!userToUpdate || !rejectionReason) {
      toast({ title: 'Reason is required', variant: 'destructive' });
      return;
    }
    handleUpdateStatus(userToUpdate, 'Rejected', rejectionReason);
    setIsRejectDialogOpen(false);
    setRejectionReason('');
    setUserToUpdate(null);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">KYC Verification Requests</h2>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Name</TableHead>
              <TableHead>PAN Card</TableHead>
              <TableHead>Aadhaar</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>Submitted On</TableHead>
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
            ) : pendingUsers && pendingUsers.length > 0 ? (
              pendingUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.panCard || 'N/A'}</TableCell>
                  <TableCell>{user.aadhaarNumber || 'N/A'}</TableCell>
                  <TableCell>{user.phoneNumber || 'N/A'}</TableCell>
                  <TableCell>{formatDate(user.kycSubmissionDate)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                            onClick={() => handleUpdateStatus(user, 'Verified')}
                        >
                            <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => openRejectDialog(user)}
                        >
                            <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                 <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No pending KYC requests.
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
              Please provide a reason for rejecting this KYC request. The user will see this reason.
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
