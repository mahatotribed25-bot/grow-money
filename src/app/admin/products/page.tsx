
'use client';

import { useState } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Edit, Trash2, ShoppingBag, ExternalLink, Image as ImageIcon, Timer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Image from 'next/image';

type Product = {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    affiliateLink: string;
    status: 'Active' | 'Hidden';
    createdAt: Timestamp;
}

const emptyProduct: Omit<Product, 'id' | 'createdAt'> = {
    name: '',
    description: '',
    price: 0,
    imageUrl: '',
    affiliateLink: '',
    status: 'Active',
};

export default function AdminProductsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { data: products, loading } = useCollection<Product>('products');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

    const handleCreateNew = () => {
        setEditingProduct(emptyProduct);
        setIsDialogOpen(true);
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteDoc(doc(firestore, 'products', id));
            toast({ title: "Product Deleted" });
        } catch (e) {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const handleSave = async () => {
        if (!editingProduct?.name || !editingProduct?.price || !editingProduct?.imageUrl || !editingProduct?.affiliateLink) {
            toast({ title: "Missing Data", description: "All fields except description are required.", variant: "destructive" });
            return;
        }

        const productData = {
            ...editingProduct,
            price: Number(editingProduct.price),
        };

        try {
            if (editingProduct.id) {
                const { id, ...data } = productData;
                await updateDoc(doc(firestore, 'products', id), data as any);
                toast({ title: "Product Updated" });
            } else {
                await addDoc(collection(firestore, 'products'), {
                    ...productData,
                    createdAt: serverTimestamp(),
                });
                toast({ title: "Product Added to Market" });
            }
            setIsDialogOpen(false);
            setEditingProduct(null);
        } catch (e) {
            toast({ title: "Save Failed", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tight">Marketplace Forge</h2>
                    <p className="text-[10px] font-black uppercase text-white/20 tracking-[4px]">Manage Shopping Catalog</p>
                </div>
                <Button onClick={handleCreateNew} className="bg-white text-black hover:bg-primary hover:text-white font-black h-12 px-6 rounded-xl uppercase text-[10px] transition-all shadow-xl">
                    <PlusCircle className="mr-2 h-4 w-4" /> Forge New Product
                </Button>
            </div>

            <Card className="bg-white/[0.03] border-white/[0.08] rounded-[2rem] overflow-hidden shadow-2xl">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-white/[0.02]">
                            <TableRow className="border-white/10">
                                <TableHead className="text-white/30 text-[10px] uppercase font-black pl-8 py-5">Visual Node</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-black">Identity</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-black">Value</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-black">Protocol</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-black text-right pr-8">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-20"><Timer className="animate-spin h-6 w-6 mx-auto mb-2 text-primary opacity-20" /></TableCell></TableRow>
                            ) : products?.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-20 text-white/10 italic">No products forged in the marketplace node.</TableCell></TableRow>
                            ) : products?.sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds).map((product) => (
                                <TableRow key={product.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                                    <TableCell className="pl-8">
                                        <div className="relative h-12 w-12 rounded-xl overflow-hidden border border-white/10 bg-black/40">
                                            <Image src={product.imageUrl} alt="P" fill className="object-cover" />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-white/80">{product.name}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <a href={product.affiliateLink} target="_blank" className="text-[9px] text-primary font-black uppercase flex items-center gap-1 hover:underline">
                                                    <ExternalLink size={10} /> Link Node
                                                </a>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-black text-green-400 text-base">₹{product.price.toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn(
                                            "text-[9px] font-black uppercase h-5",
                                            product.status === 'Active' ? "border-green-500/20 text-green-400 bg-green-500/5" : "border-white/10 text-white/20"
                                        )}>
                                            {product.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-8">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(product)} className="h-9 w-9 rounded-xl hover:bg-white/10"><Edit size={16}/></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)} className="h-9 w-9 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl"><Trash2 size={16}/></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-[#030408]/90 backdrop-blur-2xl border-white/10 text-white rounded-[2rem] max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase tracking-tight">{editingProduct?.id ? 'Modify Protocol' : 'Forge New Entry'}</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh] pr-4">
                        <div className="space-y-6 py-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-white/40 ml-1">Identity Node (Product Name)</Label>
                                <Input value={editingProduct?.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="h-12 bg-white/5 border-white/10 rounded-xl font-bold" placeholder="e.g. Premium Smart Watch" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-white/40 ml-1">Price Value (INR)</Label>
                                    <Input type="number" value={editingProduct?.price} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} className="h-12 bg-white/5 border-white/10 rounded-xl font-bold text-green-400" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-white/40 ml-1">Protocol Status</Label>
                                    <Select value={editingProduct?.status} onValueChange={(v: any) => setEditingProduct({...editingProduct, status: v})}>
                                        <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#030408] border-white/10">
                                            <SelectItem value="Active">Active Market</SelectItem>
                                            <SelectItem value="Hidden">Encrypted (Hidden)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-white/40 ml-1">Visual Address (Image URL)</Label>
                                <div className="flex gap-2">
                                    <Input value={editingProduct?.imageUrl} onChange={e => setEditingProduct({...editingProduct, imageUrl: e.target.value})} className="h-12 bg-white/5 border-white/10 rounded-xl text-xs" placeholder="https://picsum.photos/600/400" />
                                    {editingProduct?.imageUrl && (
                                        <div className="relative h-12 w-12 rounded-xl overflow-hidden border border-white/10 shrink-0">
                                            <Image src={editingProduct.imageUrl} alt="P" fill className="object-cover" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-white/40 ml-1">Gateway Link (Flipkart/Amazon/etc)</Label>
                                <Input value={editingProduct?.affiliateLink} onChange={e => setEditingProduct({...editingProduct, affiliateLink: e.target.value})} className="h-12 bg-white/5 border-white/10 rounded-xl text-xs" placeholder="Paste product link here..." />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-white/40 ml-1">Metadata (Description)</Label>
                                <Textarea value={editingProduct?.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="bg-white/5 border-white/10 h-24 rounded-xl text-xs" placeholder="Technical specs or details..." />
                            </div>
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button onClick={handleSave} className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
                            {editingProduct?.id ? 'Update Market Node' : 'Forge Entry'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
