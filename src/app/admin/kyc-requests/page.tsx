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
import { Check, X, Timer, Eye, ImageIcon, Download } from 'lucide-react';
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
import Image from 'next/image';

type KycUser = {
  id: string; 
  name: string;
  panCard?: string;
  aadhaarNumber?: string;
  phoneNumber?: string;
  kycStatus: 'Not Submitted' | 'Pending' | 'Verified' | 'Rejected';
  kycSubmissionDate?: Timestamp;
  panImage?: string;
  aadhaarImage?: string;
};

const formatDate = (timestamp?: Timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleString();
};

export default function KycRequestsPage() {
  const { data: pendingUsers, loading } = useCollection<KycUser>('users', {
    where: ['kycStatus', '==', 'Pending'],
  });
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [userToUpdate, setUserToUpdate] = useState<KycUser | null>(null);
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUser, setPreviewUser] = useState<KycUser | null>(null);

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

  const openPreview = (user: KycUser) => {
      setPreviewUser(user);
      setIsPreviewOpen(true);
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
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">Documents</TableHead>
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
                  <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openPreview(user)} className="h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white px-3 gap-2">
                        <ImageIcon size={14} />
                        <span className="text-[10px] font-black uppercase">View Docs</span>
                      </Button>
                  </TableCell>
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

       {/* Image Preview Modal */}
       <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem] max-w-4xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">Identity Document Preview</DialogTitle>
                    <DialogDescription className="text-white/40">Review uploaded PAN and Aadhaar nodes for {previewUser?.name}.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">PAN CARD NODE</Label>
                        <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                            {previewUser?.panImage ? (
                                <Image src={previewUser.panImage} alt="PAN" fill className="object-contain" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-white/10 italic text-xs">No image uploaded</div>
                            )}
                        </div>
                        {previewUser?.panImage && (
                            <Button asChild variant="outline" size="sm" className="w-full border-white/5 bg-white/5 text-[10px] font-black uppercase">
                                <a href={previewUser.panImage} download={`${previewUser.name}_PAN.png`}><Download size={14} className="mr-2"/> Download PAN</a>
                            </Button>
                        )}
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-accent/60">AADHAAR NODE</Label>
                        <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                             {previewUser?.aadhaarImage ? (
                                <Image src={previewUser.aadhaarImage} alt="Aadhaar" fill className="object-contain" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-white/10 italic text-xs">No image uploaded</div>
                            )}
                        </div>
                        {previewUser?.aadhaarImage && (
                            <Button asChild variant="outline" size="sm" className="w-full border-white/5 bg-white/5 text-[10px] font-black uppercase">
                                <a href={previewUser.aadhaarImage} download={`${previewUser.name}_AADHAAR.png`}><Download size={14} className="mr-2"/> Download Aadhaar</a>
                            </Button>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">Close Library</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
       </Dialog>

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
