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
import { Check, X, Send, Loader2, Eye, ScanText, ShieldCheck, AlertCircle, MessageSquare, Mail } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import type { Timestamp } from 'firebase/firestore';
import { 
  doc, 
  updateDoc, 
  writeBatch, 
  collection, 
  serverTimestamp, 
  increment,
  getDoc
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import { createWorker } from 'tesseract.js';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

type DepositRequest = {
  id: string;
  userId: string;
  name: string;
  amount: number;
  transactionId: string;
  createdAt: Timestamp;
  status: 'pending' | 'approved' | 'rejected';
  screenshot?: string;
  reviewedBy?: string;
};

type UserData = {
    phoneNumber?: string;
    email?: string;
};

const formatDate = (timestamp: Timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleDateString();
};

export default function DepositsPage() {
  const { user: currentAdmin } = useUser();
  const { data: deposits, loading } = useCollection<DepositRequest>('deposits');
  const firestore = useFirestore();
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [auditTarget, setAuditTarget] = useState<DepositRequest | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<{ tid: string, matched: boolean } | null>(null);

  // Notification State
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  const [notifyTarget, setNotifyTarget] = useState<(DepositRequest & { phoneNumber?: string, email?: string }) | null>(null);

  const filteredDeposits = useMemo(() => {
    if (!deposits) return [];
    const sorted = [...deposits].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
    if (filterStatus === 'all') {
      return sorted;
    }
    return sorted.filter((d) => d.status === filterStatus);
  }, [deposits, filterStatus]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredDeposits.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDeposits.map(d => d.id));
    }
  };

  const handleBatchAction = async (newStatus: 'approved' | 'rejected') => {
    if (selectedIds.length === 0 || !currentAdmin) return;
    
    setIsProcessing(true);
    const batch = writeBatch(firestore);
    let processedCount = 0;

    for (const id of selectedIds) {
      const deposit = filteredDeposits.find(d => d.id === id);
      if (deposit && deposit.status === 'pending') {
        const depositRef = doc(firestore, 'deposits', deposit.id);
        const userRef = doc(firestore, 'users', deposit.userId);

        if (newStatus === 'approved') {
          batch.update(userRef, { walletBalance: increment(deposit.amount) });
          
          const historyRef = doc(collection(firestore, 'users', deposit.userId, 'walletHistory'));
          batch.set(historyRef, {
              amount: deposit.amount,
              type: 'credit',
              category: 'Deposit',
              description: `Approved recharge request ID: ${deposit.transactionId}`,
              createdAt: serverTimestamp()
          });
        }
        
        batch.update(depositRef, { 
            status: newStatus, 
            reviewedBy: currentAdmin.uid,
            reviewedAt: serverTimestamp()
        });
        processedCount++;
      }
    }

    try {
      await batch.commit();
      toast({
        title: "Batch Action Complete",
        description: `${processedCount} requests ${newStatus} successfully.`,
      });
    } catch (e) {
      console.error(e);
      toast({ title: "Batch Operation Failed", variant: "destructive" });
    }

    setSelectedIds([]);
    setIsProcessing(false);
  };

  const handleUpdateStatus = async (deposit: DepositRequest, newStatus: 'approved' | 'rejected') => {
      if (deposit.status !== 'pending' || !currentAdmin) {
          toast({ title: "Action Restricted", variant: "destructive" });
          return;
      }

      const batch = writeBatch(firestore);
      const depositRef = doc(firestore, 'deposits', deposit.id);
      const userRef = doc(firestore, 'users', deposit.userId);

      if (newStatus === 'approved') {
          batch.update(userRef, { walletBalance: increment(deposit.amount) });
          const historyRef = doc(collection(firestore, 'users', deposit.userId, 'walletHistory'));
          batch.set(historyRef, {
              amount: deposit.amount,
              type: 'credit',
              category: 'Deposit',
              description: `Approved recharge request ID: ${deposit.transactionId}`,
              createdAt: serverTimestamp()
          });
      }
      
      batch.update(depositRef, { 
          status: newStatus,
          reviewedBy: currentAdmin.uid,
          reviewedAt: serverTimestamp()
      });

      batch.commit()
      .then(async () => {
          toast({ title: `Deposit ${newStatus === 'approved' ? 'Approved' : 'Rejected'}` });
          if (auditTarget?.id === deposit.id) setAuditTarget(null);

          if (newStatus === 'approved') {
              // Fetch user contact info for notification
              const userSnap = await getDoc(userRef);
              const userData = userSnap.exists() ? userSnap.data() as UserData : {};
              setNotifyTarget({ ...deposit, ...userData });
              setIsNotifyOpen(true);
          }
      })
      .catch((error) => {
          const permissionError = new FirestorePermissionError({
            path: `deposits/${deposit.id}`,
            operation: 'write',
          });
          errorEmitter.emit('permission-error', permissionError);
      });
  };

  const openNotifyDialog = async (deposit: DepositRequest) => {
      const userSnap = await getDoc(doc(firestore, 'users', deposit.userId));
      const userData = userSnap.exists() ? userSnap.data() as UserData : {};
      setNotifyTarget({ ...deposit, ...userData });
      setIsNotifyOpen(true);
  };

  const handleWhatsAppNotify = () => {
      if (!notifyTarget?.phoneNumber) return;
      const message = `💰 *Grow Money: Deposit Credited!* 💰\n\nHello *${notifyTarget.name}*,\n\nYour deposit of *₹${notifyTarget.amount}* has been verified and added to your wallet. You are now ready to invest and build your wealth node!\n\nThank you for your trust.\n*Team Grow Money*`;
      window.open(`https://wa.me/91${notifyTarget.phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleEmailNotify = () => {
      if (!notifyTarget?.email) return;
      const subject = `Deposit Verified - Grow Money`;
      const body = `Hello ${notifyTarget.name},\n\nYour deposit request for INR ${notifyTarget.amount} (Ref: ${notifyTarget.transactionId}) has been successfully verified and credited to your wallet balance.\n\nYou can now start investing in our plans.\n\nBest Regards,\nGrow Money Team`;
      window.location.href = `mailto:${notifyTarget.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const runAIAudit = async () => {
      if (!auditTarget?.screenshot) return;
      setIsAuditing(true);
      setAuditResult(null);

      try {
          const worker = await createWorker('eng');
          const { data: { text } } = await worker.recognize(auditTarget.screenshot);
          await worker.terminate();

          const utrMatch = text.match(/\b\d{12}\b/);
          const foundTid = utrMatch ? utrMatch[0] : 'Not Found';

          const tidMatches = foundTid === auditTarget.transactionId;

          setAuditResult({
              tid: foundTid,
              matched: tidMatches
          });

          if (tidMatches) {
              toast({ title: "AI Audit: UTR Match", description: "Reference ID verified from screenshot." });
          } else {
              toast({ title: "AI Audit: UTR Mismatch", description: "The Transaction ID in screenshot does not match the input.", variant: "destructive" });
          }

      } catch (e) {
          toast({ title: "Audit Node Failed", description: "Could not process AI vision." });
      } finally {
          setIsAuditing(false);
      }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-2xl font-bold">Deposit Requests</h2>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl animate-in zoom-in-95">
             <span className="text-xs font-black uppercase text-primary">{selectedIds.length} Selected</span>
             <div className="flex gap-2">
                <Button 
                    size="sm" 
                    type="button"
                    onClick={() => handleBatchAction('approved')} 
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700 h-8 rounded-lg font-bold text-[10px]"
                >
                    {isProcessing ? <Loader2 className="animate-spin h-3 w-3 mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                    APPROVE ALL
                </Button>
                <Button 
                    size="sm" 
                    type="button"
                    variant="destructive" 
                    onClick={() => handleBatchAction('rejected')} 
                    disabled={isProcessing}
                    className="h-8 rounded-lg font-bold text-[10px]"
                >
                    {isProcessing ? <Loader2 className="animate-spin h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                    REJECT ALL
                </Button>
             </div>
          </div>
        )}
      </div>

       <Tabs value={filterStatus} onValueChange={(value) => { setFilterStatus(value as any); setSelectedIds([]); }}>
            <TabsList className="bg-white/5 border-white/10 p-1 rounded-xl">
                <TabsTrigger value="pending" className="text-[10px] font-black uppercase">Pending</TabsTrigger>
                <TabsTrigger value="approved" className="text-[10px] font-black uppercase">Approved</TabsTrigger>
                <TabsTrigger value="rejected" className="text-[10px] font-black uppercase">Rejected</TabsTrigger>
                <TabsTrigger value="all" className="text-[10px] font-black uppercase">Archive</TabsTrigger>
            </TabsList>
        </Tabs>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden mt-4 shadow-2xl">
        <Table>
          <TableHeader className="bg-white/[0.03]">
            <TableRow className="border-white/5">
              <TableHead className="w-12 pl-6">
                <Checkbox 
                    checked={selectedIds.length === filteredDeposits.length && filteredDeposits.length > 0}
                    onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">Investor</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">Amount</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">Reference ID</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30 text-center">Protocol</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30 pr-6 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-transparent">
                <TableCell colSpan={6} className="text-center py-20 text-white/20 font-black animate-pulse">Loading Deposits...</TableCell>
              </TableRow>
            ) : filteredDeposits.length > 0 ? (
              filteredDeposits.map((deposit) => (
                <TableRow key={deposit.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                  <TableCell className="pl-6">
                    <Checkbox 
                        checked={selectedIds.includes(deposit.id)}
                        onCheckedChange={() => handleToggleSelect(deposit.id)}
                    />
                  </TableCell>
                  <TableCell className="font-bold text-white/90">
                      {deposit.name || 'N/A'}
                      <p className="text-[8px] text-white/20 uppercase font-black tracking-widest mt-1">{formatDate(deposit.createdAt)}</p>
                  </TableCell>
                  <TableCell className="font-black text-white">₹{deposit.amount.toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-[10px] text-white/40">{deposit.transactionId}</TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] font-black uppercase h-5",
                        deposit.status === 'approved' ? "border-green-500/20 text-green-400 bg-green-500/5" :
                        deposit.status === 'rejected' ? "border-red-500/20 text-red-500 bg-red-500/5" :
                        "border-white/10 text-white/40"
                      )}
                    >
                      {deposit.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex justify-end items-center gap-2">
                        {/* Notify Button for History Persistence */}
                        {deposit.status === 'approved' && (
                            <Button 
                                variant="ghost" 
                                type="button"
                                size="icon" 
                                className="h-8 w-8 text-green-500/40 hover:text-green-500 hover:bg-green-500/10"
                                onClick={() => openNotifyDialog(deposit)}
                                title="Notify User Again"
                            >
                                <MessageSquare size={16} />
                            </Button>
                        )}

                        {deposit.screenshot && (
                            <Button 
                                variant="ghost" 
                                type="button"
                                size="icon" 
                                className="h-8 w-8 text-primary/40 hover:text-primary hover:bg-primary/10"
                                onClick={() => { setAuditTarget(deposit); setAuditResult(null); }}
                            >
                                <ScanText size={16} />
                            </Button>
                        )}
                        {deposit.status === 'pending' && (
                            <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  type="button"
                                  className="bg-green-600/10 text-green-500 border-green-500/20 hover:bg-green-600 hover:text-white h-8 rounded-lg px-4 font-bold text-[10px]"
                                  onClick={() => handleUpdateStatus(deposit, 'approved')}
                                >
                                  APPROVE
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  type="button"
                                  className="bg-red-600/10 text-red-500 border-red-500/20 hover:bg-red-600 hover:text-white h-8 rounded-lg px-4 font-bold text-[10px]"
                                  onClick={() => handleUpdateStatus(deposit, 'rejected')}
                                >
                                  REJECT
                                </Button>
                            </>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow className="border-transparent">
                    <TableCell colSpan={6} className="text-center py-20 text-white/10 italic text-sm">
                        No {filterStatus} requests found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* AI Audit Dialog */}
      <Dialog open={!!auditTarget} onOpenChange={() => setAuditTarget(null)}>
        <DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem] max-w-4xl">
            <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase tracking-tight">AI Audit Terminal</DialogTitle>
                <DialogDescription className="text-white/40">Verify user screenshot against protocol data.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
                <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[3px] text-primary/60">Digital Proof Image</p>
                    <div className="relative aspect-[9/16] max-h-[500px] w-full rounded-2xl overflow-hidden border border-white/10 bg-black/40 group">
                        {auditTarget?.screenshot ? (
                            <Image src={auditTarget.screenshot} alt="Payment Screenshot" fill className="object-contain" />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-white/10 italic text-xs">No screenshot uploaded</div>
                        )}
                        {isAuditing && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                                <ScanText className="h-12 w-12 text-primary animate-bounce" />
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-white uppercase tracking-[5px] animate-pulse">Executing AI Vision</p>
                                    <div className="h-1 w-32 bg-white/10 rounded-full mt-3 overflow-hidden">
                                        <div className="h-full bg-primary animate-progress-indefinite w-full origin-left" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-8 flex flex-col">
                    <Card className="bg-white/5 border-white/10 p-6 rounded-3xl space-y-6">
                         <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase text-white/30 tracking-[3px]">Protocol Data (User Input)</p>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-white/40 uppercase">Investor Name</span>
                                    <span className="text-sm font-bold text-white/80">{auditTarget?.name}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-white/40 uppercase">Reported Sum</span>
                                    <span className="text-lg font-black text-primary">₹{auditTarget?.amount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-white/40 uppercase">Reported TID</span>
                                    <span className="font-mono text-sm font-bold text-white/80">{auditTarget?.transactionId}</span>
                                </div>
                            </div>
                         </div>

                         <Separator className="bg-white/5" />

                         <div className="space-y-4">
                             <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black uppercase text-accent tracking-[3px]">AI Verification Node</p>
                                {auditResult && (
                                    <Badge className={cn(
                                        "h-5 text-[8px] font-black uppercase",
                                        auditResult.matched ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"
                                    )}>
                                        {auditResult.matched ? "MATCHED" : "MISMATCH"}
                                    </Badge>
                                )}
                             </div>
                             
                             {!auditResult ? (
                                 <div className="py-6 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                                     <p className="text-[9px] font-bold text-white/20 uppercase">Awaiting AI Audit Scan</p>
                                 </div>
                             ) : (
                                 <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                     <div className="flex justify-between items-center">
                                         <span className="text-[10px] font-bold text-white/40 uppercase">OCR Detected TID</span>
                                         <span className={cn("font-mono text-sm font-bold", auditResult.tid === auditTarget?.transactionId ? "text-green-400" : "text-red-400")}>
                                             {auditResult.tid}
                                         </span>
                                     </div>
                                 </div>
                             )}
                         </div>

                         <Button 
                            onClick={runAIAudit} 
                            disabled={isAuditing}
                            type="button"
                            className="w-full h-14 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs hover:scale-[1.02] transition-all shadow-xl"
                        >
                            {isAuditing ? <Loader2 className="animate-spin mr-2" /> : <ScanText className="mr-2" />}
                            Execute AI Audit Scan
                        </Button>
                    </Card>

                    {auditResult && auditResult.matched && (
                        <div className="p-5 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-4 animate-in zoom-in-95">
                            <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center text-green-500">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-green-400 uppercase tracking-tight">Data Integrity Verified</p>
                                <p className="text-[10px] text-green-200/40 font-medium">Reference ID matches user reporting protocol.</p>
                            </div>
                        </div>
                    )}

                    {auditResult && !auditResult.matched && (
                        <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 animate-in shake">
                            <div className="h-10 w-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500">
                                <AlertCircle size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-red-500 uppercase tracking-tight">Protocol Discrepancy</p>
                                <p className="text-[10px] text-red-200/40 font-medium">Reference ID does not match screenshot node data.</p>
                            </div>
                        </div>
                    )}

                    <div className="mt-auto grid grid-cols-2 gap-3">
                        <Button 
                            onClick={() => auditTarget && handleUpdateStatus(auditTarget, 'approved')}
                            type="button"
                            className="h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest text-[10px]"
                            disabled={isAuditing || (auditTarget?.status !== 'pending')}
                        >
                            Approve Deposit
                        </Button>
                        <Button 
                            variant="destructive"
                            type="button"
                            onClick={() => auditTarget && handleUpdateStatus(auditTarget, 'rejected')}
                            className="h-14 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                            disabled={isAuditing || (auditTarget?.status !== 'pending')}
                        >
                            Reject Request
                        </Button>
                    </div>
                </div>
            </div>
        </DialogContent>
      </Dialog>

      {/* Deposit Success Notification Dialog */}
      <Dialog open={isNotifyOpen} onOpenChange={setIsNotifyOpen}>
        <DialogContent className="bg-[#030408] border-white/10 text-white rounded-3xl max-w-sm">
            <DialogHeader>
                <DialogTitle className="text-center font-black uppercase tracking-tight text-xl">Deposit Verified!</DialogTitle>
                <DialogDescription className="text-center text-white/40 text-[10px] uppercase tracking-widest pt-2">Notify the investor node</DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-6">
                <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 flex flex-col items-center gap-3">
                    <div className="h-14 w-14 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                        <ShieldCheck size={32} />
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[3px]">Amount Credited</p>
                        <p className="text-3xl font-black text-green-400">₹{notifyTarget?.amount.toLocaleString()}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <Button 
                        onClick={handleWhatsAppNotify} 
                        disabled={!notifyTarget?.phoneNumber}
                        className="w-full h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black uppercase text-xs tracking-widest gap-2 shadow-lg shadow-green-600/20 transition-all"
                    >
                        <MessageSquare size={18} /> Notify on WhatsApp
                    </Button>
                    <Button 
                        onClick={handleEmailNotify} 
                        disabled={!notifyTarget?.email}
                        variant="outline"
                        className="w-full h-14 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-xs tracking-widest gap-2"
                    >
                        <Mail size={18} /> Send Email Notice
                    </Button>
                </div>

                {!notifyTarget?.phoneNumber && (
                    <p className="text-[9px] text-center text-red-400 font-bold uppercase tracking-tight italic">User has not linked a phone number node.</p>
                )}
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="ghost" className="w-full text-white/40 uppercase text-[10px] font-black">Close Library</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
