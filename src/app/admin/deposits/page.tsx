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
import { Check, X, Send, Loader2 } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import type { Timestamp } from 'firebase/firestore';
import { 
  doc, 
  updateDoc, 
  writeBatch, 
  collection, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

type DepositRequest = {
  id: string;
  userId: string;
  name: string;
  amount: number;
  transactionId: string;
  createdAt: Timestamp;
  status: 'pending' | 'approved' | 'rejected';
};

const formatDate = (timestamp: Timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleDateString();
};

export default function DepositsPage() {
  const { data: deposits, loading } = useCollection<DepositRequest>('deposits');
  const firestore = useFirestore();
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

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
    if (selectedIds.length === 0) return;
    
    setIsProcessing(true);
    const batch = writeBatch(firestore);
    let processedCount = 0;

    for (const id of selectedIds) {
      const deposit = filteredDeposits.find(d => d.id === id);
      if (deposit && deposit.status === 'pending') {
        const depositRef = doc(firestore, 'deposits', deposit.id);
        const userRef = doc(firestore, 'users', deposit.userId);

        if (newStatus === 'approved') {
          // Use atomic increment and batch update for efficiency
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
        
        batch.update(depositRef, { status: newStatus });
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

  const handleUpdateStatus = (deposit: DepositRequest, newStatus: 'approved' | 'rejected') => {
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
      
      batch.update(depositRef, { status: newStatus });

      batch.commit()
      .then(() => {
          toast({ title: `Deposit ${newStatus === 'approved' ? 'Approved' : 'Rejected'}` });
      })
      .catch((error) => {
          const permissionError = new FirestorePermissionError({
            path: `deposits/${deposit.id}`,
            operation: 'write',
          });
          errorEmitter.emit('permission-error', permissionError);
      });
  };

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
                    onClick={() => handleBatchAction('approved')} 
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700 h-8 rounded-lg font-bold text-[10px]"
                >
                    {isProcessing ? <Loader2 className="animate-spin h-3 w-3 mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                    APPROVE ALL
                </Button>
                <Button 
                    size="sm" 
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
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">Timestamp</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30">Status</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/30 pr-6 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-transparent">
                <TableCell colSpan={7} className="text-center py-20 text-white/20 font-black animate-pulse">Loading Deposits...</TableCell>
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
                  <TableCell className="font-bold text-white/90">{deposit.name || 'N/A'}</TableCell>
                  <TableCell className="font-black text-white">₹{deposit.amount.toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-[10px] text-white/40">{deposit.transactionId}</TableCell>
                  <TableCell className="text-[10px] font-bold text-white/20 uppercase">{formatDate(deposit.createdAt)}</TableCell>
                  <TableCell>
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
                    {deposit.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                           className="bg-green-600/10 text-green-500 border-green-500/20 hover:bg-green-600 hover:text-white h-8 rounded-lg px-4 font-bold text-[10px]"
                          onClick={() => handleUpdateStatus(deposit, 'approved')}
                        >
                          APPROVE
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                           className="bg-red-600/10 text-red-500 border-red-500/20 hover:bg-red-600 hover:text-white h-8 rounded-lg px-4 font-bold text-[10px]"
                          onClick={() => handleUpdateStatus(deposit, 'rejected')}
                        >
                          REJECT
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow className="border-transparent">
                    <TableCell colSpan={7} className="text-center py-20 text-white/10 italic text-sm">
                        No {filterStatus} requests found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
