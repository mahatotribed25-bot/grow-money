
'use client';

import { useCollection, useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HandCoins, TrendingUp, Users, Trash2, ShieldCheck, Timer } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';
import { doc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type P2PLoan = {
    id: string;
    borrowerName: string;
    amount: number;
    duration: number;
    status: string;
    createdAt: Timestamp;
}

export default function AdminP2PLoansPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { data: requests, loading } = useCollection<P2PLoan>('p2pLoanRequests');

    const handleDelete = async (id: string) => {
        try {
            await deleteDoc(doc(firestore, 'p2pLoanRequests', id));
            toast({ title: "Loan Purged", description: "Marketplace record deleted." });
        } catch (e) {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const sortedRequests = requests?.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">P2P Marketplace Oversight</h2>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    Live Board Tracking
                </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                 <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase font-bold text-white/40 tracking-widest">Active Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{requests?.filter(r => r.status === 'funding').length || 0}</div>
                    </CardContent>
                </Card>
                <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase font-bold text-white/40 tracking-widest">Successful Matches</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-400">{requests?.filter(r => r.status === 'accepted').length || 0}</div>
                    </CardContent>
                </Card>
                <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase font-bold text-white/40 tracking-widest">Total Market Volume</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">
                            ₹{requests?.reduce((sum, r) => sum + (r.amount || 0), 0).toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-2xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-white/[0.02]">
                            <TableRow className="border-white/10">
                                <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest pl-6">Borrower</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Amount</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Duration</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Status</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest pr-6 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-10 opacity-20">Syncing Market...</TableCell></TableRow>
                            ) : sortedRequests?.map((r) => (
                                <TableRow key={r.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                                    <TableCell className="pl-6 font-bold">{r.borrowerName}</TableCell>
                                    <TableCell className="font-mono">₹{r.amount.toFixed(2)}</TableCell>
                                    <TableCell>{r.duration} Days</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn(
                                            "text-[10px] uppercase font-bold",
                                            r.status === 'funding' ? "border-primary/20 text-primary" : 
                                            r.status === 'accepted' ? "border-green-500/20 text-green-400" : "text-white/20"
                                        )}>
                                            {r.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="pr-6 text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-red-400" onClick={() => handleDelete(r.id)}>
                                            <Trash2 size={14} />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
