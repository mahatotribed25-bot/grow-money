
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
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


type InvestmentPlan = {
  id: string;
  name: string;
  price: number;
  dailyIncome: number;
  validity: number; // in days
  totalIncome: number;
  finalReturn: number;
  status: 'Available' | 'Coming Soon';
  stock?: number;
  adminProfit?: number;
  payoutFrequency: 'daily' | 'monthly' | 'on_maturity';
};

const emptyPlan: Omit<InvestmentPlan, 'id' | 'totalIncome' | 'finalReturn'> = {
  name: '',
  price: 0,
  dailyIncome: 0,
  validity: 1,
  status: 'Available',
  stock: 100,
  adminProfit: 0,
  payoutFrequency: 'on_maturity',
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

  const handleDelete = (planId: string) => {
    const docRef = doc(firestore, 'investmentPlans', planId);
    deleteDoc(docRef)
      .then(() => {
        toast({ title: 'Plan deleted successfully' });
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
        status: editingPlan.status || 'Available',
        stock: Number(editingPlan.stock || 0),
        adminProfit: Number(editingPlan.adminProfit || 0),
        payoutFrequency: editingPlan.payoutFrequency || 'on_maturity',
    };

    if ('id' in planToSave && planToSave.id) {
      const planRef = doc(firestore, 'investmentPlans', planToSave.id);
      const { id, ...planData } = planToSave;
      updateDoc(planRef, planData)
        .then(() => {
          toast({ title: 'Plan updated successfully' });
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
      const collectionRef = collection(firestore, 'investmentPlans');
      addDoc(collectionRef, planToSave)
        .then(() => {
          toast({ title: 'Plan created successfully' });
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

  const handleFieldChange = (field: keyof Omit<InvestmentPlan, 'id' | 'totalIncome' | 'finalReturn'>, value: any) => {
    if (!editingPlan) return;
    const parsedValue =
      ['price', 'dailyIncome', 'validity', 'stock', 'adminProfit'].includes(field) &&
      typeof value === 'string'
        ? parseFloat(value)
        : value;
    setEditingPlan({ ...editingPlan, [field]: parsedValue });
  };
  
  const getStatusVariant = (status: string) => {
    return status === 'Available' ? 'default' : 'secondary';
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">Investment Plans</h2>
        <Button onClick={handleCreateNew} className="rounded-xl font-bold bg-white text-black hover:bg-primary hover:text-white">
          <PlusCircle className="h-4 w-4 mr-2" />
          Create New Plan
        </Button>
      </div>
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
        <Table>
          <TableHeader className="bg-white/[0.02]">
            <TableRow className="border-white/10">
              <TableHead className="text-white/30 text-[10px] uppercase font-black tracking-widest pl-6">Plan Name</TableHead>
              <TableHead className="text-white/30 text-[10px] uppercase font-black tracking-widest">Price</TableHead>
              <TableHead className="text-white/30 text-[10px] uppercase font-black tracking-widest">Payout</TableHead>
              <TableHead className="text-white/30 text-[10px] uppercase font-black tracking-widest">Admin Profit</TableHead>
              <TableHead className="text-white/30 text-[10px] uppercase font-black tracking-widest">Validity</TableHead>
              <TableHead className="text-white/30 text-[10px] uppercase font-black tracking-widest">Stock</TableHead>
              <TableHead className="text-white/30 text-[10px] uppercase font-black tracking-widest">Status</TableHead>
              <TableHead className="text-white/30 text-[10px] uppercase font-black tracking-widest pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-20 text-white/20 animate-pulse font-bold tracking-widest">
                  SYNCING VAULT...
                </TableCell>
              </TableRow>
            ) : (
              plans?.map((plan) => (
                <TableRow key={plan.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                  <TableCell className="pl-6 font-bold text-white">{plan.name}</TableCell>
                  <TableCell className="text-white/80">₹{(plan.price || 0).toLocaleString()}</TableCell>
                  <TableCell>
                      <Badge variant="outline" className="capitalize border-primary/20 text-primary text-[9px] font-black">
                          {plan.payoutFrequency?.replace('_', ' ')}
                      </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-green-400">
                      ₹{(plan.adminProfit || 0).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-white/60 text-xs">{plan.validity} days</TableCell>
                  <TableCell className="text-white/60 text-xs">{plan.stock ?? 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(plan.status)} className="text-[9px] font-black">
                        {plan.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-6">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(plan)}
                        className="h-8 w-8 hover:bg-white/10"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500/40 hover:text-red-500 hover:bg-red-500/10"
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
        <DialogContent className="bg-[#030408]/90 backdrop-blur-2xl border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPlan && 'id' in editingPlan ? 'Edit Investment Plan' : 'Create High-Yield Plan'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-6">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right text-white/60">
                Plan Name
              </Label>
              <Input
                id="name"
                value={editingPlan?.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="col-span-3 bg-white/5 border-white/10 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right text-white/60">
                Price (₹)
              </Label>
              <Input
                id="price"
                type="number"
                value={editingPlan?.price || 0}
                onChange={(e) =>
                  handleFieldChange('price', e.target.value)
                }
                className="col-span-3 bg-white/5 border-white/10 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dailyIncome" className="text-right text-white/60">
                Daily ROI (₹)
              </Label>
              <Input
                id="dailyIncome"
                type="number"
                value={editingPlan?.dailyIncome || 0}
                onChange={(e) => handleFieldChange('dailyIncome', e.target.value)}
                className="col-span-3 bg-white/5 border-white/10 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="validity" className="text-right text-white/60">
                Term (Days)
              </Label>
              <Input
                id="validity"
                type="number"
                value={editingPlan?.validity || 1}
                onChange={(e) => handleFieldChange('validity', e.target.value)}
                className="col-span-3 bg-white/5 border-white/10 rounded-xl"
              />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="payoutFrequency" className="text-right text-white/60">
                    Payout Type
                </Label>
                <Select
                    value={editingPlan?.payoutFrequency || 'on_maturity'}
                    onValueChange={(value) => handleFieldChange('payoutFrequency', value)}
                >
                    <SelectTrigger className="col-span-3 bg-white/5 border-white/10 rounded-xl">
                        <SelectValue placeholder="Select payout frequency" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#030408] border-white/10">
                        <SelectItem value="daily">Daily Claims</SelectItem>
                        <SelectItem value="monthly">Monthly Claims</SelectItem>
                        <SelectItem value="on_maturity">End of Term Only</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="adminProfit" className="text-right text-white/60">
                    Platform Fee
                </Label>
                <Input
                    id="adminProfit"
                    type="number"
                    value={editingPlan?.adminProfit || 0}
                    onChange={(e) => handleFieldChange('adminProfit', e.target.value)}
                    className="col-span-3 bg-white/5 border-white/10 rounded-xl"
                />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="stock" className="text-right text-white/60">
                    Total Stock
                </Label>
                <Input
                    id="stock"
                    type="number"
                    value={editingPlan?.stock || 100}
                    onChange={(e) => handleFieldChange('stock', e.target.value)}
                    className="col-span-3 bg-white/5 border-white/10 rounded-xl"
                />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right text-white/60">
                    Availability
                </Label>
                <Select
                    value={editingPlan?.status || 'Available'}
                    onValueChange={(value) => handleFieldChange('status', value)}
                >
                    <SelectTrigger className="col-span-3 bg-white/5 border-white/10 rounded-xl">
                        <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#030408] border-white/10">
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="Coming Soon">Coming Soon</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="ghost" className="text-white/40 hover:bg-white/5" onClick={() => { setIsDialogOpen(false); setEditingPlan(null); }}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} className="rounded-xl font-bold bg-white text-black hover:bg-primary hover:text-white px-8">Save Master Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
