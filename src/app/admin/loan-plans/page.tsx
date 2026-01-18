
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
        console.error('Error deleting plan: ', error);
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
          console.error('Error updating plan: ', error);
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
          console.error('Error creating plan: ', error);
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
              <TableHead>Tax</TableHead>
              <TableHead>Total Repayment</TableHead>
              <TableHead>Duration</TableHead>
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
                  <TableCell>₹{(plan.loanAmount || 0).toFixed(2)}</TableCell>
                  <TableCell>₹{(plan.interest || 0).toFixed(2)}</TableCell>
                  <TableCell>₹{(plan.tax || 0).toFixed(2)}</TableCell>
                  <TableCell>₹{(plan.totalRepayment || 0).toFixed(2)}</TableCell>
                  <TableCell>{plan.duration} {plan.durationType}</TableCell>
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
              <Label htmlFor="tax" className="text-right">
                Tax
              </Label>
              <Input
                id="tax"
                type="number"
                value={editingPlan?.tax || 0}
                onChange={(e) => handleFieldChange('tax', e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="duration" className="text-right">
                Duration
              </Label>
              <Input
                id="duration"
                type="number"
                value={editingPlan?.duration || 1}
                onChange={(e) => handleFieldChange('duration', e.target.value)}
                className="col-span-1"
              />
              <div className="col-span-2">
                <Select
                    value={editingPlan?.durationType || 'Days'}
                    onValueChange={(value: DurationType) => handleFieldChange('durationType', value)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Days">Days</SelectItem>
                        <SelectItem value="Weeks">Weeks</SelectItem>
                        <SelectItem value="Months">Months</SelectItem>
                        <SelectItem value="Years">Years</SelectItem>
                    </SelectContent>
                </Select>
              </div>
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
