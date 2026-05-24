
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import { doc, updateDoc, runTransaction, serverTimestamp, collection, type Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { 
    IndianRupee, 
    TrendingUp, 
    ArrowUpRight, 
    ArrowDownRight, 
    History, 
    LineChart, 
    Briefcase,
    Users
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

type AdminSettings = {
    adminProfitBalance?: number;
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
};

type AdminWithdrawal = {
    id: string;
    amount: number;
    createdAt: Timestamp;
    status: 'completed';
};

export default function AdminFinancePage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { data: settings, loading: settingsLoading } = useDoc<AdminSettings>('settings/admin');
    const { data: plans, loading: plansLoading } = useCollection<InvestmentPlan>('investmentPlans');
    const { data: investments, loading: investmentsLoading } = useCollection<Investment>('investments', { subcollections: true });
    const { data: withdrawalLogs, loading: logsLoading } = useCollection<AdminWithdrawal>('adminWithdrawals');

    const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');

    const profitBalance = settings?.adminProfitBalance || 0;

    const stats = useMemo(() => {
        if (!investments || !plans) return null;

        const planStats = plans.map(plan => {
            const planInvestments = investments.filter(inv => inv.planName === plan.name);
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
        const totalOverallProfit = planStats.reduce((sum, p) => sum + p.totalProfit, 0);

        return {
            planStats,
            totalOverallRevenue,
            totalOverallProfit
        };
    }, [investments, plans]);

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
            console.error(e);
            toast({ title: "Withdrawal Failed", variant: "destructive" });
        }
    };

    const loading = settingsLoading || plansLoading || investmentsLoading || logsLoading;

    if (loading) return <div className="flex h-full items-center justify-center"><p>Loading financial data...</p></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Finance & Earnings</h2>
                <Button onClick={() => setIsWithdrawDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
                    <IndianRupee className="mr-2 h-4 w-4" /> Withdraw to Account
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-gradient-to-br from-primary/10 to-background border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Available Profit Wallet</CardTitle>
                        <IndianRupee className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{profitBalance.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Net earnings ready for withdrawal</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-500/10 to-background border-blue-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Platform Revenue</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-400">₹{stats?.totalOverallRevenue.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total money spent by all users</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/10 to-background border-green-500/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lifetime Gross Profit</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-green-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-400">₹{stats?.totalOverallProfit.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total business earnings generated</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" /> Plan Performance</CardTitle>
                        <CardDescription>Breakdown of earnings generated by each investment plan.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Plan Name</TableHead>
                                    <TableHead>Sales</TableHead>
                                    <TableHead>Revenue</TableHead>
                                    <TableHead className="text-right">Admin Profit</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats?.planStats.map((plan) => (
                                    <TableRow key={plan.id}>
                                        <TableCell className="font-medium">{plan.name}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <Users className="h-3 w-3 text-muted-foreground" />
                                                {plan.salesCount}
                                            </div>
                                        </TableCell>
                                        <TableCell>₹{plan.totalRevenue.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-bold text-green-400">₹{plan.totalProfit.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                                {(!stats?.planStats || stats.planStats.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">No investment data available.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Withdrawal History</CardTitle>
                        <CardDescription>Recent profit withdrawals to personal accounts.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {withdrawalLogs?.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds).map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-xs">{new Date(log.createdAt.seconds * 1000).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right text-red-400 font-medium">- ₹{log.amount.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                                {(!withdrawalLogs || withdrawalLogs.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center py-10 text-muted-foreground text-xs">No withdrawals yet.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Withdraw Profit</DialogTitle>
                        <DialogDescription>
                            Transfer profit from the business wallet to your personal account.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Available to Withdraw:</span>
                            <span className="font-bold">₹{profitBalance.toFixed(2)}</span>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="withdraw-amount">Amount (INR)</Label>
                            <Input 
                                id="withdraw-amount" 
                                type="number" 
                                placeholder="Enter amount to withdraw" 
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleWithdrawProfit}>Confirm Withdrawal</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
