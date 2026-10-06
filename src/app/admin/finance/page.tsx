'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCollection, useFirestore, useDoc, useUser } from '@/firebase';
import { doc, runTransaction, serverTimestamp, collection, getDocs, writeBatch, type Timestamp, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { 
    IndianRupee, 
    ArrowUpRight, 
    History, 
    Briefcase,
    Activity,
    HandCoins,
    Wallet,
    RefreshCcw,
    Landmark,
    Zap,
    PieChart,
    Calendar,
    Target
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
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { startOfMonth, isSameMonth } from 'date-fns';

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

type StandardLoanRequest = {
    id: string;
    loanAmount: number;
    planId: string;
    status: string;
    createdAt: Timestamp;
};

type CustomLoanRequest = {
    id: string;
    requestedAmount: number;
    interestAmount?: number;
    status: string;
    createdAt: Timestamp;
};

type LoanPlan = {
    id: string;
    interest: number;
    tax?: number;
};

type WithdrawalTransaction = {
    id: string;
    amount: number;
    gstAmount?: number;
    status: string;
    createdAt: Timestamp;
};

const ADMIN_EMAILS = ['admin@tribed.world', 'admin@tribed.com'];

export default function AdminFinancePage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { user, loading: userLoading } = useUser();
    
    const isAdmin = useMemo(() => {
        const email = user?.email?.toLowerCase();
        return !userLoading && email && ADMIN_EMAILS.includes(email);
    }, [user, userLoading]);

    const { data: settings, loading: settingsLoading } = useDoc<AdminSettings>(isAdmin ? 'settings/admin' : null);
    const { data: plans, loading: plansLoading } = useCollection<InvestmentPlan>(isAdmin ? 'investmentPlans' : null);
    const { data: investments, loading: investmentsLoading } = useCollection<Investment>(isAdmin ? 'investments' : null, { subcollections: true });
    const { data: withdrawalLogs, loading: logsLoading } = useCollection<AdminWithdrawal>(isAdmin ? 'adminWithdrawals' : null);
    const { data: p2pLoans, loading: p2pLoading } = useCollection<ActiveP2PLoan>(isAdmin ? 'p2pActiveLoans' : null);
    
    const { data: standardLoans } = useCollection<StandardLoanRequest>(isAdmin ? 'loanRequests' : null);
    const { data: customLoans } = useCollection<CustomLoanRequest>(isAdmin ? 'customLoanRequests' : null);
    const { data: loanPlans } = useCollection<LoanPlan>(isAdmin ? 'loanPlans' : null);
    const { data: userWithdrawals } = useCollection<WithdrawalTransaction>(isAdmin ? 'withdrawals' : null);

    const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');

    const profitBalance = settings?.adminProfitBalance || 0;
    const calcStartDate = settings?.profitCalculationStartDate;

    const stats = useMemo(() => {
        if (!investments || !plans || !standardLoans || !customLoans || !loanPlans || !userWithdrawals) return null;

        const currentMonthStart = startOfMonth(new Date());

        const filterByDate = (item: any) => {
            if (!calcStartDate) return true;
            const itemDate = item.createdAt || item.startDate;
            return itemDate && itemDate.toMillis() > calcStartDate.toMillis();
        };

        const isCurrentMonth = (item: any) => {
            const itemDate = item.createdAt?.toDate() || item.startDate?.toDate();
            return itemDate && isSameMonth(itemDate, new Date());
        };

        const filteredInvestments = investments.filter(filterByDate);
        const filteredP2PLoans = p2pLoans?.filter(filterByDate);
        const filteredStdLoans = standardLoans.filter(filterByDate);
        const filteredCustomLoans = customLoans.filter(filterByDate);
        const filteredWithdrawals = userWithdrawals.filter(filterByDate);

        // Current Month Filtering
        const monthInvestments = filteredInvestments.filter(isCurrentMonth);
        const monthStdLoans = filteredStdLoans.filter(isCurrentMonth);
        const monthCustomLoans = filteredCustomLoans.filter(isCurrentMonth);
        const monthWithdrawals = filteredWithdrawals.filter(isCurrentMonth);

        const planStats = plans.map(plan => {
            const planInvestments = filteredInvestments.filter(inv => inv.planName === plan.name);
            const totalRevenue = planInvestments.reduce((sum, inv) => sum + (inv.investedAmount || 0), 0);
            const totalProfit = planInvestments.length * (plan.adminProfit || 0);
            
            // Monthly specific plan stats
            const monthPlanInvs = monthInvestments.filter(inv => inv.planName === plan.name);
            const monthRevenue = monthPlanInvs.reduce((sum, inv) => sum + (inv.investedAmount || 0), 0);
            const monthProfit = monthPlanInvs.length * (plan.adminProfit || 0);

            return { id: plan.id, name: plan.name, salesCount: planInvestments.length, totalRevenue, totalProfit, monthCount: monthPlanInvs.length, monthRevenue, monthProfit };
        });

        const totalInvestmentProfit = planStats.reduce((sum, p) => sum + p.totalProfit, 0);
        const monthInvestmentProfit = planStats.reduce((sum, p) => sum + p.monthProfit, 0);

        const p2pProfit = filteredP2PLoans?.reduce((sum, l) => sum + (l.amount * 0.02), 0) || 0;

        const stdLoansActive = filteredStdLoans.filter(l => l.status === 'sent');
        const stdLoanProfit = filteredStdLoans
            .filter(l => l.status === 'sent' || l.status === 'completed')
            .reduce((sum, loan) => {
                const plan = loanPlans.find(p => p.id === loan.planId);
                return sum + (plan ? (plan.interest + (plan.tax || 0)) : 0);
            }, 0);
        
        const monthStdLoanProfit = monthStdLoans
            .filter(l => l.status === 'sent' || l.status === 'completed')
            .reduce((sum, loan) => {
                const plan = loanPlans.find(p => p.id === loan.planId);
                return sum + (plan ? (plan.interest + (plan.tax || 0)) : 0);
            }, 0);

        const stdCapitalOut = stdLoansActive.reduce((sum, l) => sum + l.loanAmount, 0);

        const customLoansActive = filteredCustomLoans.filter(l => l.status === 'active' || l.status === 'extension_pending' || l.status === 'payment_pending');
        const customLoanProfit = filteredCustomLoans
            .filter(l => ['active', 'completed', 'payment_pending'].includes(l.status))
            .reduce((sum, l) => sum + (l.interestAmount || 0), 0);
        
        const monthCustomLoanProfit = monthCustomLoans
            .filter(l => ['active', 'completed', 'payment_pending'].includes(l.status))
            .reduce((sum, l) => sum + (l.interestAmount || 0), 0);
        
        const customCapitalOut = customLoansActive.reduce((sum, l) => sum + l.requestedAmount, 0);

        const totalWithdrawalFees = filteredWithdrawals
            .filter(w => w.status === 'approved')
            .reduce((sum, w) => sum + (w.gstAmount || 0), 0);

        const monthWithdrawalFees = monthWithdrawals
            .filter(w => w.status === 'approved')
            .reduce((sum, w) => sum + (w.gstAmount || 0), 0);

        return {
            planStats,
            totalOverallRevenue: planStats.reduce((sum, p) => sum + p.totalRevenue, 0),
            totalOverallProfit: totalInvestmentProfit + p2pProfit + stdLoanProfit + customLoanProfit + totalWithdrawalFees,
            monthRevenue: planStats.reduce((sum, p) => sum + p.monthRevenue, 0),
            monthProfit: monthInvestmentProfit + monthStdLoanProfit + monthCustomLoanProfit + monthWithdrawalFees,
            p2pProfit,
            stdLoanProfit,
            customLoanProfit,
            totalWithdrawalFees,
            totalLoanProfit: stdLoanProfit + customLoanProfit,
            totalCapitalOut: stdCapitalOut + customCapitalOut,
            stdCapitalOut,
            customCapitalOut
        };
    }, [investments, plans, p2pLoans, standardLoans, customLoans, loanPlans, userWithdrawals, calcStartDate]);

    const handleWithdrawProfit = async () => {
        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount) || amount <= 0 || amount > profitBalance) {
            toast({ title: "Check Amount", variant: "destructive" });
            return;
        }

        try {
            await runTransaction(firestore, async (transaction) => {
                const settingsRef = doc(firestore, 'settings', 'admin');
                const logRef = doc(collection(firestore, 'adminWithdrawals'));
                const settingsDoc = await transaction.get(settingsRef);
                if (!settingsDoc.exists()) throw new Error("Settings missing");
                const currentBalance = settingsDoc.data().adminProfitBalance || 0;
                transaction.update(settingsRef, { adminProfitBalance: currentBalance - amount });
                transaction.set(logRef, { amount, createdAt: serverTimestamp(), status: 'completed' });
            });
            toast({ title: "Withdrawal Successful" });
            setIsWithdrawDialogOpen(false);
            setWithdrawAmount('');
        } catch (e) {
            toast({ title: "Failed", variant: "destructive" });
        }
    };

    const handleResetLedger = async () => {
        try {
            await updateDoc(doc(firestore, 'settings', 'admin'), { 
                adminProfitBalance: 0,
                profitCalculationStartDate: serverTimestamp()
            });
            toast({ title: "Finance History Cleared" });
            setIsResetDialogOpen(false);
        } catch (e) {
            toast({ title: "Reset Failed", variant: "destructive" });
        }
    };

    if (userLoading || settingsLoading || plansLoading) return <div className="flex h-full items-center justify-center"><p className="text-white/20 animate-pulse font-black uppercase text-xs">Loading Hub...</p></div>;

    const currentMonthName = new Date().toLocaleString('default', { month: 'long' });

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase">Finance Hub</h2>
                    <p className="text-[10px] font-black uppercase text-white/20 tracking-[4px]">System Earnings & Payouts</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={() => setIsResetDialogOpen(true)} className="border-red-500/20 text-red-400 font-bold h-11 rounded-xl uppercase text-[10px]">
                        <RefreshCcw className="mr-2 h-4 w-4" /> Reset History
                    </Button>
                    <Button onClick={() => setIsWithdrawDialogOpen(true)} type="button" className="bg-white text-black hover:bg-primary hover:text-white font-black h-11 rounded-xl uppercase text-[10px] px-6">
                        <IndianRupee className="mr-2 h-4 w-4" /> Withdraw Earnings
                    </Button>
                </div>
            </div>

            {/* Lifetime Statistics Summary */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-white/[0.03] border-white/[0.08] rounded-3xl p-6">
                    <p className="text-[9px] uppercase font-black tracking-widest text-white/40 mb-2">My Profit Balance</p>
                    <p className="text-3xl font-black text-white">₹{profitBalance.toFixed(2)}</p>
                </Card>
                <Card className="bg-white/[0.03] border-white/[0.08] rounded-3xl p-6">
                    <p className="text-[9px] uppercase font-black tracking-widest text-white/40 mb-2">Lifetime Volume</p>
                    <p className="text-3xl font-black text-blue-400">₹{stats?.totalOverallRevenue.toLocaleString()}</p>
                </Card>
                <Card className="bg-white/[0.03] border-white/[0.08] rounded-3xl p-6">
                    <p className="text-[9px] uppercase font-black tracking-widest text-white/40 mb-2">Lifetime Earnings</p>
                    <p className="text-3xl font-black text-green-400">₹{stats?.totalOverallProfit.toLocaleString()}</p>
                </Card>
                <Card className="bg-white/[0.03] border-white/[0.08] rounded-3xl p-6">
                    <p className="text-[9px] uppercase font-black tracking-widest text-white/40 mb-2">Capital on Loans</p>
                    <p className="text-3xl font-black text-primary">₹{stats?.totalCapitalOut.toLocaleString()}</p>
                </Card>
            </div>

            {/* CURRENT MONTH PERFORMANCE NODE */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <Calendar size={16} className="text-accent" />
                    <h3 className="text-sm font-black uppercase tracking-[4px] text-accent">Performance Node: {currentMonthName}</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-accent/5 border-accent/20 rounded-3xl p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700"><Target size={80} className="text-accent" /></div>
                        <div className="relative z-10">
                            <p className="text-[9px] uppercase font-black tracking-widest text-accent/60 mb-2">Monthly Target Volume</p>
                            <p className="text-3xl font-black text-white">₹{stats?.monthRevenue.toLocaleString()}</p>
                            <p className="text-[8px] font-bold text-white/20 uppercase mt-2">New plan investments this month</p>
                        </div>
                    </Card>
                    <Card className="bg-primary/5 border-primary/20 rounded-3xl p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700"><Zap size={80} className="text-primary" /></div>
                        <div className="relative z-10">
                            <p className="text-[9px] uppercase font-black tracking-widest text-primary/60 mb-2">Monthly Net Profit</p>
                            <p className="text-3xl font-black text-white">₹{stats?.monthProfit.toLocaleString()}</p>
                            <p className="text-[8px] font-bold text-white/20 uppercase mt-2">Earnings from all modules</p>
                        </div>
                    </Card>
                    <Card className="bg-blue-500/5 border-blue-500/20 rounded-3xl p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700"><Briefcase size={80} className="text-blue-500" /></div>
                        <div className="relative z-10">
                            <p className="text-[9px] uppercase font-black tracking-widest text-blue-400/60 mb-2">Active Monthly Cycles</p>
                            <p className="text-3xl font-black text-white">{stats?.planStats.reduce((sum, p) => sum + p.monthCount, 0)} Units</p>
                            <p className="text-[8px] font-bold text-white/20 uppercase mt-2">Successful node activations</p>
                        </div>
                    </Card>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-7">
                <Card className="lg:col-span-4 bg-white/[0.03] border-white/[0.08] rounded-[2rem] overflow-hidden">
                    <CardHeader className="bg-white/[0.02] p-6 border-b border-white/5">
                        <CardTitle className="text-sm font-black uppercase text-white flex items-center gap-2">
                            <Briefcase className="h-4 w-4" /> Plan Sales Breakdown
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-white/[0.01]">
                                <TableRow className="border-white/5 hover:bg-transparent">
                                    <TableHead className="text-white/30 text-[10px] uppercase font-black pl-6 py-4">Plan Name</TableHead>
                                    <TableHead className="text-white/30 text-[10px] uppercase font-black text-center">Month Qty</TableHead>
                                    <TableHead className="text-white/30 text-[10px] uppercase font-black text-right pr-6">Month Profit</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats?.planStats.map((plan) => (
                                    <TableRow key={plan.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                                        <TableCell className="pl-6 py-4">
                                            <p className="font-bold text-white/80">{plan.name}</p>
                                            <p className="text-[8px] text-white/20 uppercase font-bold">LIFETIME: {plan.salesCount} Qty</p>
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-white/60">{plan.monthCount}</TableCell>
                                        <TableCell className="text-right pr-6 font-black text-green-400">₹{plan.monthProfit.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3 bg-white/[0.03] border-white/[0.08] rounded-[2rem] p-8 flex flex-col space-y-6">
                    <CardTitle className="text-sm font-black uppercase text-white flex items-center gap-2">
                        <HandCoins className="h-4 w-4" /> Revenue Architecture
                    </CardTitle>
                    <div className="space-y-6">
                        <div className="flex justify-between items-center group">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20"><Landmark size={18}/></div>
                                <div><p className="text-xs font-black text-white/80">Standard Loans</p><p className="text-[8px] text-white/20 uppercase font-bold">Fixed Interest</p></div>
                            </div>
                            <p className="text-sm font-black text-white">₹{stats?.stdLoanProfit.toLocaleString()}</p>
                        </div>
                        <div className="flex justify-between items-center group">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent border border-accent/20"><Zap size={18}/></div>
                                <div><p className="text-xs font-black text-white/80">Flexible Loans</p><p className="text-[8px] text-white/20 uppercase font-bold">Negotiated Node</p></div>
                            </div>
                            <p className="text-sm font-black text-white">₹{stats?.customLoanProfit.toLocaleString()}</p>
                        </div>
                         <div className="flex justify-between items-center group">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20"><Wallet size={18}/></div>
                                <div><p className="text-xs font-black text-white/80">Platform Fees</p><p className="text-[8px] text-white/20 uppercase font-bold">Service Tax</p></div>
                            </div>
                            <p className="text-sm font-black text-white">₹{stats?.totalWithdrawalFees.toLocaleString()}</p>
                        </div>
                    </div>
                    <Separator className="bg-white/5" />
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex justify-between items-center">
                        <div>
                            <p className="text-[9px] font-black text-primary uppercase">Total Assets at Risk</p>
                            <p className="text-xl font-black text-white">₹{(stats?.totalCapitalOut! + stats?.totalLoanProfit!).toLocaleString()}</p>
                        </div>
                        <Badge className="bg-primary text-white text-[8px] font-black uppercase px-2 h-5">Audit Pool</Badge>
                    </div>
                </Card>
            </div>

            <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
                <DialogContent className="bg-[#030408] border-white/10 text-white rounded-[2rem] max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase">Withdraw Profit</DialogTitle>
                        <DialogDescription className="text-white/40 text-xs">Transfer earnings from platform to your account.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-6">
                        <div className="bg-white/5 rounded-2xl p-5 border border-white/5 flex justify-between items-center">
                            <span className="text-[10px] uppercase font-black text-white/20">Available Profit</span>
                            <span className="text-2xl font-black text-white">₹{profitBalance.toFixed(2)}</span>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-white/40">Withdraw Amount (INR)</Label>
                            <Input type="number" placeholder="0" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl text-lg font-bold" />
                        </div>
                    </div>
                    <DialogFooter><Button onClick={handleWithdrawProfit} type="button" className="w-full h-14 rounded-2xl font-black bg-white text-black hover:bg-primary hover:text-white uppercase text-xs">Authorize Payment</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
