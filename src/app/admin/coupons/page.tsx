
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
import { PlusCircle, Trash2, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
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

type Redemption = {
    userId: string;
    userName: string;
    redeemedAt: Timestamp;
}

type Coupon = {
  id: string;
  code: string;
  amount: number;
  status: 'active' | 'depleted';
  stock: number;
  maxStock: number;
  redemptions: Redemption[];
  createdAt: Timestamp;
};

const emptyCoupon: Omit<Coupon, 'id' | 'status' | 'createdAt' | 'redemptions' | 'maxStock'> = {
  code: '',
  amount: 0,
  stock: 1,
};

function generateCouponCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}


export default function CouponsPage() {
  const { data: coupons, loading } = useCollection<Coupon>('coupons');
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Partial<typeof emptyCoupon>>({});
  const [viewingRedemptions, setViewingRedemptions] = useState<Coupon | null>(null);

  const handleCreateNew = () => {
    setEditingCoupon({
        ...emptyCoupon,
        code: generateCouponCode(),
        stock: 1,
    });
    setIsCreateDialogOpen(true);
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
    if (!editingCoupon?.code || !editingCoupon?.amount || !editingCoupon?.stock) {
      toast({ variant: 'destructive', title: 'Code, amount and stock are required.' });
      return;
    }
     if (Number(editingCoupon.stock) <= 0) {
      toast({ variant: 'destructive', title: 'Stock must be greater than 0.' });
      return;
    }
    
    const couponData = {
        code: editingCoupon.code,
        amount: Number(editingCoupon.amount),
        stock: Number(editingCoupon.stock),
        maxStock: Number(editingCoupon.stock),
        status: 'active' as const,
        redemptions: [],
        createdAt: serverTimestamp(),
    };

    const couponsCollection = collection(firestore, 'coupons');
    addDoc(couponsCollection, couponData)
        .then(() => {
            toast({ title: 'Coupon created successfully' });
            setIsCreateDialogOpen(false);
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
    if (status === 'depleted') return 'destructive';
    return 'secondary';
  }
  
  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleString();
  };

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
              <TableHead>Redemptions</TableHead>
              <TableHead>Status</TableHead>
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
                    {coupon.redemptions?.length || 0} / {coupon.maxStock}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(coupon.status)} className="capitalize">
                      {coupon.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex gap-2">
                     <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewingRedemptions(coupon)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
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

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stock" className="text-right">
                Stock
              </Label>
              <Input
                id="stock"
                type="number"
                value={editingCoupon?.stock || 1}
                onChange={(e) =>
                  handleFieldChange('stock', e.target.value)
                }
                className="col-span-3"
                min={1}
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
      
      <Dialog open={!!viewingRedemptions} onOpenChange={() => setViewingRedemptions(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>'{viewingRedemptions?.code}' Redemptions</DialogTitle>
              <DialogDescription>
                List of users who have redeemed this coupon.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 max-h-80 overflow-y-auto">
              {viewingRedemptions && viewingRedemptions.redemptions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Name</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingRedemptions.redemptions.map((redemption) => (
                      <TableRow key={redemption.userId}>
                        <TableCell>{redemption.userName}</TableCell>
                        <TableCell>{formatDate(redemption.redeemedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No one has redeemed this coupon yet.
                </p>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}
