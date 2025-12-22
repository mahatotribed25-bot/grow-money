
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

type InvestmentPlan = {
  id: string;
  name: string;
  price: number;
  dailyIncome: number;
  validity: number; // in days
  totalIncome: number;
  finalReturn: number;
};

const emptyPlan: Omit<InvestmentPlan, 'id'> = {
  name: '',
  price: 0,
  dailyIncome: 0,
  validity: 1,
  totalIncome: 0,
  finalReturn: 0,
};

export default function InvestmentPlansPage() {
  const { data: plans, loading } = useCollection<InvestmentPlan>('investmentPlans');
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<InvestmentPlan> | null>(null);

  const handleCreateNew = () => {
    setEditingPlan(emptyPlan);
    setIsDialogOpen(true);
  };

  const handleEdit = (plan: InvestmentPlan) => {
    setEditingPlan(plan);
    setIsDialogOpen(true);
  };

  const handleDelete = async (planId: string) => {
    try {
      await deleteDoc(doc(firestore, 'investmentPlans', planId));
      toast({ title: 'Plan deleted successfully' });
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
    
    // Auto-calculate totalIncome and finalReturn
    const validity = editingPlan.validity || 0;
    const dailyIncome = editingPlan.dailyIncome || 0;
    const price = editingPlan.price || 0;
    const totalIncome = validity * dailyIncome;
    const finalReturn = price + totalIncome;

    const planToSave = {
        ...editingPlan,
        totalIncome,
        finalReturn,
    };

    try {
      if ('id' in planToSave && planToSave.id) {
        const planRef = doc(firestore, 'investmentPlans', planToSave.id);
        const { id, ...planData } = planToSave;
        await updateDoc(planRef, planData);
        toast({ title: 'Plan updated successfully' });
      } else {
        await addDoc(collection(firestore, 'investmentPlans'), planToSave);
        toast({ title: 'Plan created successfully' });
      }
      setIsDialogOpen(false);
      setEditingPlan(null);
    } catch (error) {
      console.error('Error saving plan: ', error);
      toast({ title: 'Error saving plan', variant: 'destructive' });
    }
  };

  const handleFieldChange = (field: keyof Omit<InvestmentPlan, 'id' | 'totalIncome' | 'finalReturn'>, value: any) => {
    if (!editingPlan) return;
    const parsedValue =
      ['price', 'dailyIncome', 'validity'].includes(field) &&
      typeof value === 'string'
        ? parseFloat(value)
        : value;
    setEditingPlan({ ...editingPlan, [field]: parsedValue });
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Investment Plans</h2>
        <Button onClick={handleCreateNew}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Create New Plan
        </Button>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Daily Income</TableHead>
              <TableHead>Validity</TableHead>
              <TableHead>Total Income</TableHead>
              <TableHead>Final Return</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : (
              plans?.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>{plan.name}</TableCell>
                  <TableCell>₹{plan.price.toFixed(2)}</TableCell>
                  <TableCell>₹{plan.dailyIncome.toFixed(2)}</TableCell>
                  <TableCell>{plan.validity} days</TableCell>
                  <TableCell>₹{plan.totalIncome.toFixed(2)}</TableCell>
                  <TableCell>₹{plan.finalReturn.toFixed(2)}</TableCell>
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
              {editingPlan && 'id' in editingPlan ? 'Edit Plan' : 'Create New Plan'}
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
              <Label htmlFor="price" className="text-right">
                Price
              </Label>
              <Input
                id="price"
                type="number"
                value={editingPlan?.price || 0}
                onChange={(e) =>
                  handleFieldChange('price', e.target.value)
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dailyIncome" className="text-right">
                Daily Income
              </Label>
              <Input
                id="dailyIncome"
                type="number"
                value={editingPlan?.dailyIncome || 0}
                onChange={(e) => handleFieldChange('dailyIncome', e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="validity" className="text-right">
                Validity (Days)
              </Label>
              <Input
                id="validity"
                type="number"
                value={editingPlan?.validity || 1}
                onChange={(e) => handleFieldChange('validity', e.target.value)}
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
