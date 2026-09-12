
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
  // Fixed: matching 'Pending' with capital P as set in profile page
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
      <div>
        <h2 className="text-2xl font-bold text-white">KYC Verification Registry</h2>
        <p className="text-sm text-white/40">Review identities and authorize investor nodes.</p>
      </div>
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-white/[0.02]">
            <TableRow className="border-white/5">
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30 pl-6">Investor</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">PAN Node</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">Aadhaar Node</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">Contact</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">Submitted At</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30 pr-6 text-right">Decision</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20">
                   <Timer className="animate-spin h-6 w-6 text-primary mx-auto mb-2" />
                   <p className="text-[10px] font-black uppercase text-white/20 tracking-widest">Accessing Identities...</p>
                </TableCell>
              </TableRow>
            ) : pendingUsers && pendingUsers.length > 0 ? (
              pendingUsers.map((user) => (
                <TableRow key={user.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                  <TableCell className="pl-6 font-bold text-white/90">{user.name}</TableCell>
                  <TableCell className="font-mono text-xs">{user.panCard || 'N/A'}</TableCell>
                  <TableCell className="font-mono text-xs">{user.aadhaarNumber || 'N/A'}</TableCell>
                  <TableCell className="text-xs">{user.phoneNumber || 'N/A'}</TableCell>
                  <TableCell className="text-[10px] font-bold text-white/20 uppercase">{formatDate(user.kycSubmissionDate)}</TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-green-600/10 text-green-500 border-green-500/20 hover:bg-green-600 hover:text-white h-8 rounded-lg px-4 font-bold text-[10px]"
                            onClick={() => handleUpdateStatus(user, 'Verified')}
                        >
                            <Check className="h-3 w-3 mr-1" /> VERIFY
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-red-600/10 text-red-500 border-red-500/20 hover:bg-red-600 hover:text-white h-8 rounded-lg px-4 font-bold text-[10px]"
                            onClick={() => openRejectDialog(user)}
                        >
                            <X className="h-3 w-3 mr-1" /> DENY
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                 <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-white/10 italic">
                      No identities pending protocol review.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
       <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Identity Rejection</DialogTitle>
            <DialogDescription className="text-white/40 text-xs">
              Provide a clear reason for denying this node's verification request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g. Identity blur or mismatched data..."
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
    </div>
  );
}
