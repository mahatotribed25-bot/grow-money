'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import { doc, runTransaction, serverTimestamp, collection, getDocs, writeBatch, type Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { 
    IndianRupee, 
    TrendingUp, 
    ArrowUpRight, 
    History, 
    Briefcase,
    Users,
    Activity,
    HandCoins,
    Wallet,
    RefreshCcw
} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type AdminSettings = {
    adminProfitBalance?: number;
    profitCalculationStartDate?: Timestamp;
};

type InvestmentPlan = {
    id: string;
    name: string;
    price: number;
    adminProfit: number;
};

type Investment = {
    planId: string;
    planName: string;
    investedAmount: number;
    startDate: Timestamp;
};

type AdminWithdrawal = {
    id: string;
    amount: number;
    createdAt: Timestamp;
    status: 'completed';
};

type ActiveP2PLoan = {
    id: string;
    amount: number;
    createdAt: Timestamp;
};

export default function AdminFinancePage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { data: settings, loading: settingsLoading } = useDoc<AdminSettings>('settings/admin');
    const { data: plans, loading: plansLoading } = useCollection<InvestmentPlan>('investmentPlans');
    const { data: investments, loading: investmentsLoading } = useCollection<Investment>('investments', { subcollections: true });
    const { data: withdrawalLogs, loading: logsLoading } = useCollection<AdminWithdrawal>('adminWithdrawals');
    const { data: p2pLoans, loading: p2pLoading } = useCollection<ActiveP2PLoan>('p2pActiveLoans');

    const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');

    const profitBalance = settings?.adminProfitBalance || 0;
    const calcStartDate = settings?.profitCalculationStartDate;

    const stats = useMemo(() => {
        if (!investments || !plans) return null;

        // Filter based on reset date
        const filteredInvestments = calcStartDate 
            ? investments.filter(inv => inv.startDate && inv.startDate.toMillis() > calcStartDate.toMillis())
            : investments;

        const filteredP2PLoans = calcStartDate
            ? p2pLoans?.filter(l => l.createdAt && l.createdAt.toMillis() > calcStartDate.toMillis())
            : p2pLoans;

        const planStats = plans.map(plan => {
            const planInvestments = filteredInvestments.filter(inv => inv.planName === plan.name);
            const totalRevenue = planInvestments.reduce((sum, inv) => sum + (inv.investedAmount || 0), 0);
            const totalProfit = planInvestments.length * (plan.adminProfit || 0);
            
            return {
                id: plan.id,
                name: plan.name,
                salesCount: planInvestments.length,
                totalRevenue,
                totalProfit,
            };
        });

        const totalOverallRevenue = planStats.reduce((sum, p) => sum + p.totalRevenue, 0);
        const planProfits = planStats.reduce((sum, p) => sum + p.totalProfit, 0);
        
        // P2P Profits (2% constant)
        const p2pProfit = filteredP2PLoans?.reduce((sum, l) => sum + (l.amount * 0.02), 0) || 0;

        return {
            planStats,
            totalOverallRevenue,
            totalOverallProfit: planProfits + p2pProfit,
            p2pProfit
        };
    }, [investments, plans, p2pLoans, calcStartDate]);

    const handleWithdrawProfit = async () => {
        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount) || amount <= 0) {
            toast({ title: "Invalid Amount", variant: "destructive" });
            return;
        }
        if (amount > profitBalance) {
            toast({ title: "Insufficient Profit Balance", variant: "destructive" });
            return;
        }

        try {
            await runTransaction(firestore, async (transaction) => {
                const settingsRef = doc(firestore, 'settings', 'admin');
                const logRef = doc(collection(firestore, 'adminWithdrawals'));

                const settingsDoc = await transaction.get(settingsRef);
                if (!settingsDoc.exists()) throw new Error("Settings not found");

                const currentBalance = settingsDoc.data().adminProfitBalance || 0;
                transaction.update(settingsRef, { adminProfitBalance: currentBalance - amount });
                
                transaction.set(logRef, {
                    amount,
                    createdAt: serverTimestamp(),
                    status: 'completed'
                });
            });

            toast({ title: "Profit Withdrawn Successfully" });
            setIsWithdrawDialogOpen(false);
            setWithdrawAmount('');
        } catch (e) {
            toast({ title: "Withdrawal Failed", variant: "destructive" });
        }
    };

    const handleResetLedger = async () => {
        try {
            // 1. Reset Settings Balance and Start Date
            const settingsRef = doc(firestore, 'settings', 'admin');
            await runTransaction(firestore, async (transaction) => {
                transaction.update(settingsRef, { 
                    adminProfitBalance: 0,
                    profitCalculationStartDate: serverTimestamp()
                });
            });

            // 2. Clear Withdrawal History
            const logsSnapshot = await getDocs(collection(firestore, 'adminWithdrawals'));
            const batch = writeBatch(firestore);
            logsSnapshot.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();

            toast({ title: "Ledger Fully Reset", description: "Profit balance and history have been cleared." });
            setIsResetDialogOpen(false);
        } catch (e) {
            toast({ title: "Reset Failed", variant: "destructive" });
        }
    };

    const loading = settingsLoading || plansLoading || investmentsLoading || logsLoading || p2pLoading;

    if (loading) return <div className="flex h-full items-center justify-center"><p className="text-white/20 animate-pulse font-bold tracking-widest text-xs">CALCULATING BALANCES...</p></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-3xl font-bold tracking-tighter text-white">Finance Hub</h2>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsResetDialogOpen(true)} className="border-red-500/20 text-red-400 hover:bg-red-500/10 font-bold h-11 rounded-xl">
                        <RefreshCcw className="mr-2 h-4 w-4" /> Reset Ledger
                    </Button>
                    <Button onClick={() => setIsWithdrawDialogOpen(true)} className="bg-white text-black hover:bg-primary hover:text-white font-bold h-11 rounded-xl shadow-xl shadow-white/5 transition-all">
                        <IndianRupee className="mr-2 h-4 w-4" /> Withdraw Earnings
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-gradient-to-br from-primary/20 to-transparent border-white/[0.08] backdrop-blur-xl rounded-2xl shadow-2xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] uppercase font-black tracking-widest text-white/40">Profit Wallet</CardTitle>
                        <Wallet className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-white tracking-tighter">₹{profitBalance.toFixed(2)}</div>
                        <p className="text-[10px] text-white/20 mt-1 font-bold uppercase">Ready for Payout</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-2xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] uppercase font-black tracking-widest text-white/40">Market Revenue</CardTitle>
                        <Activity className="h-4 w-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-blue-400 tracking-tighter">₹{stats?.totalOverallRevenue.toFixed(2)}</div>
                        <p className="text-[10px] text-white/20 mt-1 font-bold uppercase">Volume since reset</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-2xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] uppercase font-black tracking-widest text-white/40">Gross Earnings</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-green-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-green-400 tracking-tighter">₹{stats?.totalOverallProfit.toFixed(2)}</div>
                        <p className="text-[10px] text-white/20 mt-1 font-bold uppercase">Net since reset</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-2xl border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] uppercase font-black tracking-widest text-white/40">P2P Fees</CardTitle>
                        <HandCoins className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-primary tracking-tighter">₹{stats?.p2pProfit.toFixed(2)}</div>
                        <p className="text-[10px] text-white/20 mt-1 font-bold uppercase">Matching Income</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4 bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl">
                    <CardHeader className="border-b border-white/[0.05] bg-white/[0.01]">
                        <CardTitle className="flex items-center gap-2 text-white font-bold"><Briefcase className="h-5 w-5 text-primary" /> Plan Performance</CardTitle>
                        <CardDescription className="text-white/30 text-xs">Earnings breakdown based on calculation window.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-white/[0.02]">
                                <TableRow className="border-white/10">
                                    <TableHead className="text-white/30 text-[10px] uppercase font-black tracking-widest pl-6">Plan Tier</TableHead>
                                    <TableHead className="text-white/30 text-[10px] uppercase font-black tracking-widest">Sales</TableHead>
                                    <TableHead className="text-white/30 text-[10px] uppercase font-black tracking-widest text-right pr-6">Profit</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats?.planStats.map((plan) => (
                                    <TableRow key={plan.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                                        <TableCell className="font-bold text-white/80 pl-6">{plan.name}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-xs text-white/60">
                                                <Users className="h-3 w-3 text-primary" />
                                                {plan.salesCount}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6 font-black text-green-400 text-sm">₹{plan.totalProfit.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                                {(!stats?.planStats || stats.planStats.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-20 text-white/20 italic">No investment data available.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3 bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl">
                    <CardHeader className="border-b border-white/[0.05] bg-white/[0.01]">
                        <CardTitle className="flex items-center gap-2 text-white font-bold"><History className="h-5 w-5 text-primary" /> Admin Payouts</CardTitle>
                        <CardDescription className="text-white/30 text-xs">Recent withdrawals from profit wallet.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-white/[0.02]">
                                <TableRow className="border-white/10">
                                    <TableHead className="text-white/30 text-[10px] uppercase font-black tracking-widest pl-6">Date</TableHead>
                                    <TableHead className="text-white/30 text-[10px] uppercase font-black tracking-widest text-right pr-6">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {withdrawalLogs?.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds).map((log) => (
                                    <TableRow key={log.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                                        <TableCell className="text-[10px] text-white/40 pl-6 font-bold">{new Date(log.createdAt.seconds * 1000).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right pr-6 text-red-400 font-black text-sm">- ₹{log.amount.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                                {(!withdrawalLogs || withdrawalLogs.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center py-20 text-white/20 italic">No payouts history found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Withdraw Dialog */}
            <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
                <DialogContent className="bg-[#030408]/90 backdrop-blur-2xl border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Withdraw Business Profit</DialogTitle>
                        <DialogDescription className="text-white/40">
                            Transfer accumulated profits from the platform wallet to your personal account.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-6">
                        <div className="bg-white/5 rounded-2xl p-5 border border-white/5 flex justify-between items-center">
                            <span className="text-[10px] uppercase font-black tracking-widest text-white/20">Available Credit</span>
                            <span className="text-2xl font-black text-white tracking-tighter">₹{profitBalance.toFixed(2)}</span>
                        </div>
                        <div className="space-y-2 px-1">
                            <Label htmlFor="withdraw-amount" className="text-white/60">Payout Amount (INR)</Label>
                            <Input 
                                id="withdraw-amount" 
                                type="number" 
                                placeholder="0.00" 
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                className="bg-white/5 border-white/10 rounded-xl h-12 text-lg font-bold"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <DialogClose asChild><Button variant="ghost" className="text-white/40">Cancel</Button></DialogClose>
                        <Button onClick={handleWithdrawProfit} className="rounded-xl font-bold bg-white text-black hover:bg-primary hover:text-white px-8">Confirm Payout</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reset Dialog */}
            <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <AlertDialogContent className="bg-[#030408] border-white/10 text-white backdrop-blur-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Full Ledger Reset?</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/40">
                            This will set the profit wallet to zero, delete all withdrawal logs, and restart revenue tracking from zero. This action is irreversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/5">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleResetLedger} className="bg-destructive hover:bg-destructive/90">Confirm Full Reset</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
