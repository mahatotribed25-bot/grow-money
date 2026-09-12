
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
import { Check, X, Timer } from 'lucide-react';
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
  id: string; 
  name: string;
  panCard?: string;
  aadhaarNumber?: string;
  phoneNumber?: string;
  kycStatus: 'Not Submitted' | 'Pending' | 'Verified' | 'Rejected';
  kycSubmissionDate?: Timestamp;
};

const formatDate = (timestamp?: Timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleString();
};

export default function KycRequestsPage() {
  // Fixed: matching 'Pending' with capital P
  const { data: pendingUsers, loading } = useCollection<KycUser>('users', {
    where: ['kycStatus', '==', 'Pending'],
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
        updateData.kycRejectionReason = ''; 
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
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">KYC Verification Requests</h2>
      <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Name</TableHead>
              <TableHead>PAN Card</TableHead>
              <TableHead>Aadhaar</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>Submitted On</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                   <Timer className="animate-spin h-5 w-5 mx-auto mb-2 text-primary" />
                   Loading Identities...
                </TableCell>
              </TableRow>
            ) : pendingUsers && pendingUsers.length > 0 ? (
              pendingUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-bold">{user.name}</TableCell>
                  <TableCell className="font-mono">{user.panCard || 'N/A'}</TableCell>
                  <TableCell className="font-mono">{user.aadhaarNumber || 'N/A'}</TableCell>
                  <TableCell>{user.phoneNumber || 'N/A'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(user.kycSubmissionDate)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-green-500 border-green-500/20 hover:bg-green-500/10"
                            onClick={() => handleUpdateStatus(user, 'Verified')}
                        >
                            <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 border-red-500/20 hover:bg-red-500/10"
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
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground italic">
                      No pending KYC requests.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
       <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="bg-[#030408] border-white/10 text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle>Reason for Rejection</DialogTitle>
            <DialogDescription className="text-white/40">
              Please provide a reason for rejecting this KYC request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter reason here..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="bg-white/5 border-white/10"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleConfirmRejection}>Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
