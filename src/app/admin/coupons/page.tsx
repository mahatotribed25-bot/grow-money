
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
import { PlusCircle, Trash2 } from 'lucide-react';
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
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type Coupon = {
  id: string;
  code: string;
  amount: number;
  status: 'active' | 'redeemed' | 'expired';
  createdAt: Timestamp;
  redeemedBy?: string;
  redeemedAt?: Timestamp;
};

const emptyCoupon: Omit<Coupon, 'id' | 'status' | 'createdAt'> = {
  code: '',
  amount: 0,
};

function generateCouponCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}


export default function CouponsPage() {
  const { data: coupons, loading } = useCollection<Coupon>('coupons');
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Partial<typeof emptyCoupon>>({});

  const handleCreateNew = () => {
    setEditingCoupon({
        ...emptyCoupon,
        code: generateCouponCode()
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (couponId: string) => {
    const couponRef = doc(firestore, 'coupons', couponId);
    deleteDoc(couponRef)
      .then(() => {
        toast({ title: 'Coupon deleted successfully' });
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: couponRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleSave = () => {
    if (!editingCoupon?.code || !editingCoupon?.amount) {
      toast({ variant: 'destructive', title: 'Code and amount are required.' });
      return;
    }
    
    const couponData = {
        code: editingCoupon.code,
        amount: Number(editingCoupon.amount),
        status: 'active' as const,
        createdAt: serverTimestamp(),
    };

    const couponsCollection = collection(firestore, 'coupons');
    addDoc(couponsCollection, couponData)
        .then(() => {
            toast({ title: 'Coupon created successfully' });
            setIsDialogOpen(false);
        })
        .catch((error) => {
             const permissionError = new FirestorePermissionError({
              path: couponsCollection.path,
              operation: 'create',
              requestResourceData: couponData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
  };

  const handleFieldChange = (field: keyof typeof emptyCoupon, value: any) => {
    setEditingCoupon(prev => ({ ...prev, [field]: value }));
  };

  const getStatusVariant = (status: Coupon['status']) => {
    if (status === 'redeemed') return 'default';
    if (status === 'expired') return 'destructive';
    return 'secondary';
  }

  const sortedCoupons = coupons?.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Coupon Management</h2>
        <Button onClick={handleCreateNew}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Create New Coupon
        </Button>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Redeemed By</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : (
              sortedCoupons?.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-mono">{coupon.code}</TableCell>
                  <TableCell>₹{coupon.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(coupon.status)} className="capitalize">
                      {coupon.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{coupon.redeemedBy || 'N/A'}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(coupon.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
            <DialogTitle>Create New Coupon</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="code" className="text-right">
                Code
              </Label>
              <Input
                id="code"
                value={editingCoupon?.code || ''}
                onChange={(e) => handleFieldChange('code', e.target.value)}
                className="col-span-3 font-mono"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                value={editingCoupon?.amount || 0}
                onChange={(e) =>
                  handleFieldChange('amount', e.target.value)
                }
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave}>Save Coupon</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
