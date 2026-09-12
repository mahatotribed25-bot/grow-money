
'use client';

import { useState, useMemo } from 'react';
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
import { Check, X, Send, Copy, Smartphone, CreditCard, Wallet } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';


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
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'awaiting_confirmation' | 'approved' | 'rejected'>('pending');

  const filteredUpiRequests = useMemo(() => {
    if (!upiRequests) return [];
    const sorted = [...upiRequests].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
    if (filterStatus === 'all') {
      return sorted;
    }
    return sorted.filter((r) => r.status === filterStatus);
  }, [upiRequests, filterStatus]);



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

  const handleCopyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast({ title: "UPI Copied!" });
  }

  const getStatusBadge = (status: UpiRequest['status']) => {
    switch (status) {
        case 'pending': return <Badge variant="secondary" className="rounded-lg uppercase text-[10px] font-bold">Pending Admin</Badge>;
        case 'awaiting_confirmation': return <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/5 rounded-lg uppercase text-[10px] font-bold">Awaiting User</Badge>;
        case 'approved': return <Badge variant="default" className="bg-green-600 rounded-lg uppercase text-[10px] font-bold">Approved</Badge>;
        case 'rejected': return <Badge variant="destructive" className="rounded-lg uppercase text-[10px] font-bold">Rejected</Badge>;
        default: return <Badge variant="secondary" className="rounded-lg uppercase text-[10px] font-bold">{status}</Badge>;
    }
  }

  const getProviderBadge = (provider: string) => {
    const p = provider.toLowerCase();
    if (p.includes('phonepe')) {
        return (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider">PhonePe</span>
            </div>
        );
    }
    if (p.includes('google') || p.includes('gpay')) {
        return (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider">GPay</span>
            </div>
        );
    }
    if (p.includes('paytm')) {
        return (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400">
                <div className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider">Paytm</span>
            </div>
        );
    }
    return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-400">
            <CreditCard size={10} />
            <span className="text-[10px] font-black uppercase tracking-wider">{provider}</span>
        </div>
    );
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">UPI Verification Pipeline</h2>
      </div>

       <Tabs value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}>
            <TabsList className="bg-white/5 border-white/10 p-1 rounded-xl h-11">
                <TabsTrigger value="pending" className="text-[10px] font-black uppercase">Pending</TabsTrigger>
                <TabsTrigger value="awaiting_confirmation" className="text-[10px] font-black uppercase">Awaiting User</TabsTrigger>
                <TabsTrigger value="approved" className="text-[10px] font-black uppercase">Approved</TabsTrigger>
                <TabsTrigger value="rejected" className="text-[10px] font-black uppercase">Rejected</TabsTrigger>
                <TabsTrigger value="all" className="text-[10px] font-black uppercase">Archive</TabsTrigger>
            </TabsList>
        </Tabs>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden mt-4 shadow-2xl">
        <Table>
          <TableHeader className="bg-white/[0.03]">
            <TableRow className="border-white/5">
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30 pl-6">Investor Node</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">Payment Address</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">Network Node</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">Timestamp</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">Protocol Status</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30 pr-6 text-right">Dispatch</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-transparent">
                <TableCell colSpan={6} className="text-center py-20">
                  <div className="flex flex-col items-center gap-3 opacity-20">
                      <Smartphone className="animate-pulse" />
                      <p className="text-[10px] font-black uppercase tracking-[4px]">Syncing Payment Registry</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredUpiRequests.length > 0 ? (
              filteredUpiRequests.map((request) => (
                <TableRow key={request.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                  <TableCell className="pl-6 font-bold text-white/90">{request.userName}</TableCell>
                  <TableCell>
                      <div className="flex items-center gap-2 group">
                        <span className="font-mono text-xs text-white/70 bg-white/5 px-2 py-1 rounded border border-white/5">{request.upiId}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/20 hover:text-primary transition-colors" onClick={() => handleCopyToClipboard(request.upiId)}>
                            <Copy size={12}/>
                        </Button>
                      </div>
                  </TableCell>
                  <TableCell>
                      {getProviderBadge(request.upiProvider)}
                  </TableCell>
                  <TableCell className="text-[10px] font-bold text-white/20 uppercase">{formatDate(request.createdAt)}</TableCell>
                  <TableCell>
                    {getStatusBadge(request.status)}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    {request.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-blue-600/10 text-blue-500 border-blue-500/20 hover:bg-blue-600 hover:text-white h-8 rounded-lg px-4 font-bold text-[10px]"
                            onClick={() => openConfirmDialog(request)}
                        >
                            <Send className="h-3 w-3 mr-2" /> SEND CHALLENGE
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-red-600/10 text-red-500 border-red-500/20 hover:bg-red-600 hover:text-white h-8 rounded-lg px-4 font-bold text-[10px]"
                            onClick={() => openRejectDialog(request)}
                        >
                            <X className="h-3 w-3 mr-2" /> DENY
                        </Button>
                      </div>
                    )}
                     {request.status === 'awaiting_confirmation' && (
                        <span className="text-[10px] font-black uppercase text-white/20 italic tracking-widest">Waiting for checksum...</span>
                    )}
                    {request.status === 'approved' && (
                         <div className="flex justify-end items-center text-green-500 gap-1.5">
                            <Check size={14}/>
                            <span className="text-[9px] font-black uppercase">Verified</span>
                         </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
                 <TableRow className="border-transparent">
                    <TableCell colSpan={6} className="text-center py-20 text-white/10 italic text-sm">
                      No active {filterStatus.replace(/_/g, ' ')} nodes in registry.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

       <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Node Rejection</DialogTitle>
            <DialogDescription className="text-white/40">
              Provide a clear reason for denying this payment identifier.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g. Invalid checksum or suspicious node pattern..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="bg-white/5 border-white/10 rounded-xl"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" className="text-white/40">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" className="rounded-xl font-bold px-8" onClick={() => handleRejectRequest(rejectionReason)}>Confirm Denial</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-center">Protocol Challenge</DialogTitle>
            <DialogDescription className="text-white/40 text-center text-xs">
             Execute a micro-transaction to verify node ownership.
            </DialogDescription>
          </DialogHeader>
           <div className="py-6 space-y-6">
             <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-1">
                <p className="text-[9px] font-black uppercase text-white/20 tracking-widest">Destination Address</p>
                <p className="font-mono text-sm font-bold text-primary">{requestToUpdate?.upiId}</p>
             </div>

            <div className="space-y-2 px-1">
                <Label htmlFor="confirmationAmount" className="text-white/50 text-[10px] font-black uppercase tracking-widest">Amount Dispatched (INR)</Label>
                <Input
                    id="confirmationAmount"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1.07"
                    value={confirmationAmount}
                    onChange={(e) => setConfirmationAmount(Number(e.target.value))}
                    className="h-12 bg-white/5 border-white/10 rounded-xl text-lg font-bold focus:ring-primary"
                />
            </div>
            <p className="text-[10px] text-white/20 italic leading-relaxed text-center px-4">
                The user must enter this exact sum to finalize their identity node.
            </p>
           </div>
           <DialogFooter className="sm:justify-center">
            <Button onClick={handleSendConfirmation} className="w-full h-12 rounded-xl font-bold bg-primary shadow-xl shadow-primary/20">Authorize Challenge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

