'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, PiggyBank, Percent, Landmark } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCollection, useFirestore } from '@/firebase';
import { useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type SavingsPlan = {
  id: string;
  name: string;
  dailyRate: number; // Percentage per day
  minDeposit: number;
  status: 'Active' | 'Inactive';
};

const emptyPlan: Omit<SavingsPlan, 'id'> = {
  name: '',
  dailyRate: 0.5,
  minDeposit: 1000,
  status: 'Active',
};

export default function SavingsPlansAdminPage() {
  const { data: plans, loading } = useCollection<SavingsPlan>('savingsPlans');
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<SavingsPlan> | null>(null);

  const handleCreateNew = () => {
    setEditingPlan(emptyPlan);
    setIsDialogOpen(true);
  };

  const handleEdit = (plan: SavingsPlan) => {
    setEditingPlan(plan);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(firestore, 'savingsPlans', id));
      toast({ title: 'Savings Plan Deleted' });
    } catch (e) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    if (!editingPlan?.name || !editingPlan?.dailyRate) return;

    const planData = {
      ...editingPlan,
      dailyRate: Number(editingPlan.dailyRate),
      minDeposit: Number(editingPlan.minDeposit),
    };

    try {
      if (editingPlan.id) {
        const { id, ...data } = planData;
        await updateDoc(doc(firestore, 'savingsPlans', id), data);
        toast({ title: 'Plan Updated' });
      } else {
        await addDoc(collection(firestore, 'savingsPlans'), planData);
        toast({ title: 'Savings Plan Created' });
      }
      setIsDialogOpen(false);
      setEditingPlan(null);
    } catch (e) {
      toast({ title: 'Save Failed', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Savings Vault Forge</h2>
          <p className="text-[10px] font-black uppercase text-white/20 tracking-[4px]">Interest Rate Protocols</p>
        </div>
        <Button onClick={handleCreateNew} className="bg-white text-black font-black uppercase text-[10px] h-10 px-6 rounded-xl hover:bg-primary hover:text-white">
          <PlusCircle size={14} className="mr-2" /> Forge New Tier
        </Button>
      </div>

      <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-white/[0.03]">
            <TableRow className="border-white/5">
              <TableHead className="text-[10px] font-black uppercase text-white/30 pl-8 py-5">Tier Name</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-white/30">Daily ROI (%)</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-white/30">Min. Capital</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-white/30">Protocol</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-white/30 pr-8 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-20 font-black text-white/10 uppercase animate-pulse">Syncing Vaults...</TableCell></TableRow>
            ) : plans?.map((plan) => (
              <TableRow key={plan.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                <TableCell className="pl-8 font-bold text-white/80">{plan.name}</TableCell>
                <TableCell className="font-black text-accent">{plan.dailyRate}% / day</TableCell>
                <TableCell className="font-bold text-white/60">₹{plan.minDeposit.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn(
                    "text-[8px] font-black uppercase h-5",
                    plan.status === 'Active' ? "border-green-500/20 text-green-400 bg-green-500/5" : "border-white/10 text-white/20"
                  )}>
                    {plan.status}
                  </Badge>
                </TableCell>
                <TableCell className="pr-8 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)} className="h-8 w-8 hover:bg-white/10"><Edit size={14}/></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(plan.id)} className="h-8 w-8 text-red-500/40 hover:text-red-500 hover:bg-red-500/10"><Trash2 size={14}/></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#030408]/90 backdrop-blur-2xl border-white/10 text-white rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Tier Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-white/40 ml-1">Tier Identity</Label>
              <Input value={editingPlan?.name} onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} className="h-12 bg-white/5 border-white/10 rounded-xl font-bold" placeholder="e.g. Gold Savings" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-white/40 ml-1">Daily Rate (%)</Label>
                <Input type="number" step="0.1" value={editingPlan?.dailyRate} onChange={e => setEditingPlan({...editingPlan, dailyRate: parseFloat(e.target.value)})} className="h-12 bg-white/5 border-white/10 rounded-xl font-bold text-accent" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-white/40 ml-1">Min. Deposit (₹)</Label>
                <Input type="number" value={editingPlan?.minDeposit} onChange={e => setEditingPlan({...editingPlan, minDeposit: parseFloat(e.target.value)})} className="h-12 bg-white/5 border-white/10 rounded-xl font-bold" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} className="w-full h-14 rounded-2xl bg-primary text-white font-black shadow-xl shadow-primary/20">Authorize Tier Node</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
