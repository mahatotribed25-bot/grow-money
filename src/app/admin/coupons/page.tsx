
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
import { PlusCircle, Trash2, CalendarIcon } from 'lucide-react';
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type Coupon = {
  id: string;
  code: string;
  amount: number;
  expiryDate: Timestamp;
  status: 'active' | 'redeemed' | 'expired';
  createdAt: Timestamp;
  redeemedBy?: string;
  redeemedAt?: Timestamp;
};

const emptyCoupon: Omit<Coupon, 'id' | 'status' | 'createdAt' | 'expiryDate'> & { expiryDate?: Date } = {
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
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

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
    if (!editingCoupon?.code || !editingCoupon?.amount || !editingCoupon?.expiryDate) {
      toast({ variant: 'destructive', title: 'All fields are required.' });
      return;
    }
    
    const couponData = {
        code: editingCoupon.code,
        amount: Number(editingCoupon.amount),
        expiryDate: Timestamp.fromDate(editingCoupon.expiryDate),
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

  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
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
              <TableHead>Expiry Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Redeemed By</TableHead>
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
              sortedCoupons?.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-mono">{coupon.code}</TableCell>
                  <TableCell>₹{coupon.amount.toFixed(2)}</TableCell>
                  <TableCell>{formatDate(coupon.expiryDate)}</TableCell>
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
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="expiryDate" className="text-right">Expiry Date</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                        <Button
                        variant={"outline"}
                        className={cn(
                            "col-span-3 justify-start text-left font-normal",
                            !editingCoupon?.expiryDate && "text-muted-foreground"
                        )}
                        >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editingCoupon?.expiryDate ? format(editingCoupon.expiryDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                        mode="single"
                        selected={editingCoupon?.expiryDate}
                        onSelect={(date) => {
                            handleFieldChange('expiryDate', date);
                            setIsCalendarOpen(false);
                        }}
                        initialFocus
                        />
                    </PopoverContent>
                </Popover>
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
