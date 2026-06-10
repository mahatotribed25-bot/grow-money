
'use client';

import { useCollection, useFirestore, useDoc } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HandCoins, Trash2, ShieldCheck, Timer, ArrowUpRight, Wallet, Users, History } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';
import { doc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

type P2PRequest = {
    id: string;
    borrowerName: string;
    amount: number;
    duration: number;
    status: string;
    createdAt: Timestamp;
    borrowerTrustScore: number;
}

type ActiveP2PLoan = {
    id: string;
    borrowerName: string;
    lenderName: string;
    amount: number;
    interestRate: number;
    status: string;
    createdAt: Timestamp;
}

type AdminSettings = {
    p2pPlatformFeePercent?: number;
}

export default function AdminP2PLoansPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const { data: requests, loading: reqLoading } = useCollection<P2PRequest>('p2pLoanRequests');
    const { data: activeLoans, loading: activeLoading } = useCollection<ActiveP2PLoan>('p2pActiveLoans');
    const { data: settings } = useDoc<AdminSettings>('settings/admin');

    const feePercent = settings?.p2pPlatformFeePercent || 2;

    const handleDeleteRequest = async (id: string) => {
        try {
            await deleteDoc(doc(firestore, 'p2pLoanRequests', id));
            toast({ title: "Request Purged", description: "Marketplace record deleted." });
        } catch (e) {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const stats = useMemo(() => {
        const volume = activeLoans?.reduce((sum, l) => sum + (l.amount || 0), 0) || 0;
        const estProfit = activeLoans?.reduce((sum, l) => sum + (l.amount * (feePercent / 100)), 0) || 0;
        return { volume, estProfit };
    }, [activeLoans, feePercent]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">P2P Marketplace Oversight</h2>
                    <p className="text-sm text-white/40">Monitor peer-to-peer lending activities and platform commissions.</p>
                </div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 h-8 px-4 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                    Live Monitoring
                </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                 <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-2xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] uppercase font-bold text-white/40 tracking-widest flex items-center gap-2">
                            <HandCoins size={12} className="text-primary" /> Market Volume
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-white tracking-tighter">₹{stats.volume.toLocaleString()}</div>
                        <p className="text-[10px] text-white/20 mt-1 font-bold">TOTAL CAPITAL LENT</p>
                    </CardContent>
                </Card>
                <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-2xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] uppercase font-bold text-white/40 tracking-widest flex items-center gap-2">
                            <ArrowUpRight size={12} className="text-green-400" /> Platform Revenue
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-green-400 tracking-tighter">₹{stats.estProfit.toLocaleString()}</div>
                        <p className="text-[10px] text-white/20 mt-1 font-bold">FROM {feePercent}% MATCHING FEES</p>
                    </CardContent>
                </Card>
                <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-2xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] uppercase font-bold text-white/40 tracking-widest flex items-center gap-2">
                            <ShieldCheck size={12} className="text-blue-400" /> Active Matches
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-white tracking-tighter">{activeLoans?.filter(l => l.status === 'active').length || 0}</div>
                        <p className="text-[10px] text-white/20 mt-1 font-bold">CURRENTLY REPAYING</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="marketplace" className="w-full">
                <TabsList className="bg-white/5 border-white/10 p-1 rounded-xl h-12">
                    <TabsTrigger value="marketplace" className="rounded-lg data-[state=active]:bg-white/10 font-bold uppercase tracking-widest text-[10px] px-6">Open Requests</TabsTrigger>
                    <TabsTrigger value="active" className="rounded-lg data-[state=active]:bg-white/10 font-bold uppercase tracking-widest text-[10px] px-6">Active Loans</TabsTrigger>
                </TabsList>

                <TabsContent value="marketplace" className="mt-6">
                    <Card className="shadow-2xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl rounded-2xl overflow-hidden">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-white/[0.02]">
                                    <TableRow className="border-white/10">
                                        <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest pl-6">Borrower</TableHead>
                                        <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Amount</TableHead>
                                        <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Trust Score</TableHead>
                                        <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest text-right pr-6">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reqLoading ? (
                                        <TableRow><TableCell colSpan={4} className="text-center py-10 opacity-20">Syncing Market...</TableCell></TableRow>
                                    ) : requests?.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center py-10 text-white/20 italic">No open requests in market.</TableCell></TableRow>
                                    ) : requests?.map((r) => (
                                        <TableRow key={r.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                                            <TableCell className="pl-6 font-bold text-white/80">{r.borrowerName}</TableCell>
                                            <TableCell className="font-mono text-white">₹{r.amount.toLocaleString()}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">
                                                    {r.borrowerTrustScore}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="pr-6 text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-red-400" onClick={() => handleDeleteRequest(r.id)}>
                                                    <Trash2 size={14} />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="active" className="mt-6">
                    <Card className="shadow-2xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl rounded-2xl overflow-hidden">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-white/[0.02]">
                                    <TableRow className="border-white/10">
                                        <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest pl-6">Participant Path</TableHead>
                                        <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Details</TableHead>
                                        <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Admin Fee</TableHead>
                                        <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest text-right pr-6">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {activeLoading ? (
                                        <TableRow><TableCell colSpan={4} className="text-center py-10 opacity-20">Loading Active Assets...</TableCell></TableRow>
                                    ) : activeLoans?.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center py-10 text-white/20 italic">No matched loans recorded.</TableCell></TableRow>
                                    ) : activeLoans?.map((loan) => (
                                        <TableRow key={loan.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                                            <TableCell className="pl-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-white/80">{loan.lenderName} <ArrowUpRight size={10} className="inline text-green-400 mx-1" /> {loan.borrowerName}</span>
                                                    <span className="text-[9px] text-white/20 uppercase font-black tracking-widest mt-1">{new Date(loan.createdAt.seconds * 1000).toLocaleDateString()}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-white">₹{loan.amount.toLocaleString()}</span>
                                                    <span className="text-[9px] text-primary font-bold uppercase tracking-widest">{loan.interestRate}% interest</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs font-black text-green-400">+₹{(loan.amount * (feePercent / 100)).toFixed(2)}</span>
                                            </TableCell>
                                            <TableCell className="pr-6 text-right">
                                                <Badge variant="outline" className={cn(
                                                    "text-[9px] font-black uppercase tracking-widest",
                                                    loan.status === 'active' ? "border-primary/20 text-primary" : "border-white/10 text-white/20"
                                                )}>
                                                    {loan.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
