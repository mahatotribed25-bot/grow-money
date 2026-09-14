
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
import { PlusCircle, Edit, Trash2, IndianRupee, Timer, Percent, Landmark } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Badge } from '@/components/ui/badge';

type DurationType = 'Days' | 'Weeks' | 'Months' | 'Years';

type LoanPlan = {
  id: string;
  name: string;
  loanAmount: number;
  interest: number;
  tax?: number;
  totalRepayment: number;
  duration: number; 
  durationType: DurationType;
  emiOption: boolean;
  directPayOption: boolean;
};

const emptyPlan: Omit<LoanPlan, 'id'> = {
  name: '',
  loanAmount: 0,
  interest: 0,
  tax: 0,
  totalRepayment: 0,
  duration: 1,
  durationType: 'Days',
  emiOption: true,
  directPayOption: true,
};

export default function LoanPlansPage() {
  const { data: plans, loading } = useCollection<LoanPlan>('loanPlans');
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<LoanPlan> | null>(null);

  const handleCreateNew = () => {
    setEditingPlan(emptyPlan);
    setIsDialogOpen(true);
  };

  const handleEdit = (plan: LoanPlan) => {
    setEditingPlan(plan);
    setIsDialogOpen(true);
  };

  const handleDelete = (planId: string) => {
    const docRef = doc(firestore, 'loanPlans', planId);
    deleteDoc(docRef)
      .then(() => {
        toast({ title: 'Loan Plan deleted successfully' });
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleSave = () => {
    if (!editingPlan) return;
    
    const planToSave = {
        ...editingPlan,
        totalRepayment: (editingPlan.loanAmount || 0) + (editingPlan.interest || 0) + (editingPlan.tax || 0)
    };

    if ('id' in planToSave && planToSave.id) {
      const planRef = doc(firestore, 'loanPlans', planToSave.id);
      const { id, ...planData } = planToSave;
      updateDoc(planRef, planData)
        .then(() => {
          toast({ title: 'Loan Plan updated successfully' });
          setIsDialogOpen(false);
          setEditingPlan(null);
        })
        .catch((error) => {
          const permissionError = new FirestorePermissionError({
            path: planRef.path,
            operation: 'update',
            requestResourceData: planData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    } else {
      const collectionRef = collection(firestore, 'loanPlans');
      addDoc(collectionRef, planToSave)
        .then(() => {
          toast({ title: 'Loan Plan created successfully' });
          setIsDialogOpen(false);
          setEditingPlan(null);
        })
        .catch((error) => {
          const permissionError = new FirestorePermissionError({
            path: collectionRef.path,
            operation: 'create',
            requestResourceData: planToSave,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    }
  };

  const handleFieldChange = (field: keyof Omit<LoanPlan, 'id' | 'totalRepayment'>, value: any) => {
    if (!editingPlan) return;
    const parsedValue =
      ['loanAmount', 'interest', 'duration', 'tax'].includes(field) &&
      typeof value === 'string'
        ? parseFloat(value)
        : value;
    setEditingPlan({ ...editingPlan, [field]: parsedValue });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">Standard Loan Forge</h2>
        <Button onClick={handleCreateNew} className="rounded-xl font-bold bg-white text-black hover:bg-primary hover:text-white">
          <PlusCircle className="h-4 w-4 mr-2" />
          Craft New Template
        </Button>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
        <Table>
          <TableHeader className="bg-white/[0.02]">
            <TableRow className="border-white/10">
              <TableHead className="text-white/30 text-[10px] uppercase font-black tracking-widest pl-6">Node Name</TableHead>
              <TableHead className="text-white/30 text-[10px] uppercase font-black tracking-widest">Principal</TableHead>
              <TableHead className="text-white/30 text-[10px] uppercase font-black tracking-widest">Interest / Tax</TableHead>
              <TableHead className="text-white/30 text-[10px] uppercase font-black tracking-widest">Settlement</TableHead>
              <TableHead className="text-white/30 text-[10px] uppercase font-black tracking-widest">Term</TableHead>
              <TableHead className="text-white/30 text-[10px] uppercase font-black tracking-widest pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20 text-white/20 animate-pulse font-bold">
                  SYNCING LOAN REGISTRY...
                </TableCell>
              </TableRow>
            ) : (
              plans?.map((plan) => (
                <TableRow key={plan.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                  <TableCell className="pl-6 font-bold text-white/80">{plan.name}</TableCell>
                  <TableCell className="text-white/60">₹{(plan.loanAmount || 0).toLocaleString()}</TableCell>
                  <TableCell>
                      <div className="flex flex-col text-[10px] font-bold">
                          <span className="text-red-400">Int: ₹{(plan.interest || 0).toLocaleString()}</span>
                          <span className="text-blue-400">Tax: ₹{(plan.tax || 0).toLocaleString()}</span>
                      </div>
                  </TableCell>
                  <TableCell className="font-black text-white">₹{(plan.totalRepayment || 0).toLocaleString()}</TableCell>
                  <TableCell>
                      <Badge variant="outline" className="border-white/10 text-white/40 text-[9px] uppercase font-black">
                          {plan.duration} {plan.durationType}
                      </Badge>
                  </TableCell>
                  <TableCell className="pr-6">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)} className="h-8 w-8 hover:bg-white/10">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500/40 hover:text-red-500 hover:bg-red-500/10" onClick={() => handleDelete(plan.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading && plans?.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-white/10 italic">No loan templates forged yet.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#030408]/90 backdrop-blur-2xl border-white/10 text-white max-w-lg rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">
              {editingPlan && 'id' in editingPlan ? 'Modify Loan Template' : 'Forge New Loan Protocol'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-6">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right text-white/60 text-xs">Node Name</Label>
              <Input id="name" value={editingPlan?.name || ''} onChange={(e) => handleFieldChange('name', e.target.value)} className="col-span-3 bg-white/5 border-white/10 rounded-xl" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="loanAmount" className="text-right text-white/60 text-xs">Principal (₹)</Label>
              <Input id="loanAmount" type="number" value={editingPlan?.loanAmount || 0} onChange={(e) => handleFieldChange('loanAmount', e.target.value)} className="col-span-3 bg-white/5 border-white/10 rounded-xl" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="interest" className="text-right text-white/60 text-xs">Interest (₹)</Label>
              <Input id="interest" type="number" value={editingPlan?.interest || 0} onChange={(e) => handleFieldChange('interest', e.target.value)} className="col-span-3 bg-white/5 border-white/10 rounded-xl" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tax" className="text-right text-white/60 text-xs">Tax (₹)</Label>
              <Input id="tax" type="number" value={editingPlan?.tax || 0} onChange={(e) => handleFieldChange('tax', e.target.value)} className="col-span-3 bg-white/5 border-white/10 rounded-xl" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="duration" className="text-right text-white/60 text-xs">Term</Label>
              <Input id="duration" type="number" value={editingPlan?.duration || 1} onChange={(e) => handleFieldChange('duration', e.target.value)} className="col-span-1 bg-white/5 border-white/10 rounded-xl" />
              <div className="col-span-2">
                <Select value={editingPlan?.durationType || 'Days'} onValueChange={(value: DurationType) => handleFieldChange('durationType', value)}>
                    <SelectTrigger className="bg-white/5 border-white/10 rounded-xl">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#030408] border-white/10">
                        <SelectItem value="Days">Days</SelectItem>
                        <SelectItem value="Weeks">Weeks</SelectItem>
                        <SelectItem value="Months">Months</SelectItem>
                        <SelectItem value="Years">Years</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="emiOption" className="text-right text-white/60 text-xs">EMI Node</Label>
                <Switch id="emiOption" checked={editingPlan?.emiOption} onCheckedChange={(checked) => handleFieldChange('emiOption', checked)} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="directPayOption" className="text-right text-white/60 text-xs">Full Payout</Label>
                <Switch id="directPayOption" checked={editingPlan?.directPayOption} onCheckedChange={(checked) => handleFieldChange('directPayOption', checked)} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="ghost" className="text-white/40" onClick={() => { setIsDialogOpen(false); setEditingPlan(null); }}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} className="rounded-xl font-bold bg-white text-black hover:bg-primary hover:text-white px-8">Authorize Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
