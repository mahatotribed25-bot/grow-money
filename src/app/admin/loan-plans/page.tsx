
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
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
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

type LoanPlan = {
  id: string;
  name: string;
  loanAmount: number;
  interest: number;
  totalRepayment: number;
  duration: number; // in months
  emiOption: boolean;
  directPayOption: boolean;
};

const emptyPlan: Omit<LoanPlan, 'id'> = {
  name: '',
  loanAmount: 0,
  interest: 0,
  totalRepayment: 0,
  duration: 1,
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

  const handleDelete = async (planId: string) => {
    try {
      await deleteDoc(doc(firestore, 'loanPlans', planId));
      toast({ title: 'Loan Plan deleted successfully' });
    } catch (error) {
      console.error('Error deleting plan: ', error);
      toast({
        title: 'Error deleting plan',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    if (!editingPlan) return;
    
    const planToSave = {
        ...editingPlan,
        totalRepayment: (editingPlan.loanAmount || 0) + (editingPlan.interest || 0)
    };

    try {
      if ('id' in planToSave && planToSave.id) {
        const planRef = doc(firestore, 'loanPlans', planToSave.id);
        const { id, ...planData } = planToSave;
        await updateDoc(planRef, planData);
        toast({ title: 'Loan Plan updated successfully' });
      } else {
        await addDoc(collection(firestore, 'loanPlans'), planToSave);
        toast({ title: 'Loan Plan created successfully' });
      }
      setIsDialogOpen(false);
      setEditingPlan(null);
    } catch (error) {
      console.error('Error saving plan: ', error);
      toast({ title: 'Error saving plan', variant: 'destructive' });
    }
  };

  const handleFieldChange = (field: keyof Omit<LoanPlan, 'id' | 'totalRepayment'>, value: any) => {
    if (!editingPlan) return;
    const parsedValue =
      ['loanAmount', 'interest', 'duration'].includes(field) &&
      typeof value === 'string'
        ? parseFloat(value)
        : value;
    setEditingPlan({ ...editingPlan, [field]: parsedValue });
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Loan Plans</h2>
        <Button onClick={handleCreateNew}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Create New Loan Plan
        </Button>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan Name</TableHead>
              <TableHead>Loan Amount</TableHead>
              <TableHead>Interest</TableHead>
              <TableHead>Total Repayment</TableHead>
              <TableHead>Duration (Months)</TableHead>
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
            ) : (
              plans?.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>{plan.name}</TableCell>
                  <TableCell>₹{(plan.loanAmount || 0).toFixed(2)}</TableCell>
                  <TableCell>₹{(plan.interest || 0).toFixed(2)}</TableCell>
                  <TableCell>₹{(plan.totalRepayment || 0).toFixed(2)}</TableCell>
                  <TableCell>{plan.duration} months</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(plan)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleDelete(plan.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPlan && 'id' in editingPlan ? 'Edit Loan Plan' : 'Create New Loan Plan'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={editingPlan?.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="loanAmount" className="text-right">
                Loan Amount
              </Label>
              <Input
                id="loanAmount"
                type="number"
                value={editingPlan?.loanAmount || 0}
                onChange={(e) =>
                  handleFieldChange('loanAmount', e.target.value)
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="interest" className="text-right">
                Interest
              </Label>
              <Input
                id="interest"
                type="number"
                value={editingPlan?.interest || 0}
                onChange={(e) => handleFieldChange('interest', e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="duration" className="text-right">
                Duration (Months)
              </Label>
              <Input
                id="duration"
                type="number"
                value={editingPlan?.duration || 1}
                onChange={(e) => handleFieldChange('duration', e.target.value)}
                className="col-span-3"
              />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="emiOption" className="text-right">EMI Option</Label>
                <Switch 
                    id="emiOption" 
                    checked={editingPlan?.emiOption} 
                    onCheckedChange={(checked) => handleFieldChange('emiOption', checked)}
                    className="col-span-3"
                />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="directPayOption" className="text-right">Direct Pay Option</Label>
                <Switch 
                    id="directPayOption" 
                    checked={editingPlan?.directPayOption} 
                    onCheckedChange={(checked) => handleFieldChange('directPayOption', checked)}
                    className="col-span-3"
                />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => { setIsDialogOpen(false); setEditingPlan(null); }}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave}>Save Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
