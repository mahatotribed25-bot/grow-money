'use client';
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
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

type Plan = {
  id: string;
  name: string;
  investmentAmount: number;
  profit: number;
  duration: number;
  status: 'Available' | 'Coming Soon';
};

const emptyPlan: Omit<Plan, 'id'> = {
  name: '',
  investmentAmount: 0,
  profit: 0,
  duration: 1,
  status: 'Available',
};

export default function InvestmentsPage() {
  const { data: plans, loading } = useCollection<Plan>('investmentPlans');
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null);

  const handleCreateNew = () => {
    setEditingPlan(emptyPlan);
    setIsDialogOpen(true);
  };

  const handleEdit = (plan: Plan) => {
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

    try {
      if ('id' in editingPlan && editingPlan.id) {
        // Update existing plan
        const planRef = doc(firestore, 'investmentPlans', editingPlan.id);
        const { id, ...planData } = editingPlan;
        await updateDoc(planRef, planData);
        toast({ title: 'Plan updated successfully' });
      } else {
        // Create new plan
        await addDoc(collection(firestore, 'investmentPlans'), editingPlan);
        toast({ title: 'Plan created successfully' });
      }
      setIsDialogOpen(false);
      setEditingPlan(null);
    } catch (error) {
      console.error('Error saving plan: ', error);
      toast({ title: 'Error saving plan', variant: 'destructive' });
    }
  };

  const handleFieldChange = (field: keyof Plan, value: any) => {
    if (!editingPlan) return;
    const parsedValue =
      ['investmentAmount', 'profit', 'duration'].includes(field) &&
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
              <TableHead>Investment Amount</TableHead>
              <TableHead>Profit</TableHead>
              <TableHead>Duration (Days)</TableHead>
              <TableHead>Status</TableHead>
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
                  <TableCell>₹{plan.investmentAmount?.toFixed(2) || '0.00'}</TableCell>
                  <TableCell>₹{plan.profit?.toFixed(2) || '0.00'}</TableCell>
                  <TableCell>{plan.duration}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        plan.status === 'Available' ? 'default' : 'secondary'
                      }
                    >
                      {plan.status}
                    </Badge>
                  </TableCell>
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
              <Label htmlFor="investment" className="text-right">
                Investment
              </Label>
              <Input
                id="investment"
                type="number"
                value={editingPlan?.investmentAmount || 0}
                onChange={(e) =>
                  handleFieldChange('investmentAmount', e.target.value)
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="profit" className="text-right">
                Profit
              </Label>
              <Input
                id="profit"
                type="number"
                value={editingPlan?.profit || 0}
                onChange={(e) => handleFieldChange('profit', e.target.value)}
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
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select
                value={editingPlan?.status || 'Available'}
                onValueChange={(value) => handleFieldChange('status', value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Coming Soon">Coming Soon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave}>Save Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
