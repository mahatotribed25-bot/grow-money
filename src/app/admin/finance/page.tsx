'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCollection, useFirestore, useDoc, useUser } from '@/firebase';
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
    RefreshCcw,
    Landmark,
    Zap,
    ArrowDownRight,
    PieChart
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
    
    // Loan tracking collections
    const { data: standardLoans } = useCollection<StandardLoanRequest>(isAdmin ? 'loanRequests' : null);
    const { data: customLoans } = useCollection<CustomLoanRequest>(isAdmin ? 'customLoanRequests' : null);
    const { data: loanPlans } = useCollection<LoanPlan>(isAdmin ? 'loanPlans' : null);

    const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');

    const profitBalance = settings?.adminProfitBalance || 0;
    const calcStartDate = settings?.profitCalculationStartDate;

    const stats = useMemo(() => {
        if (!investments || !plans || !standardLoans || !customLoans || !loanPlans) return null;

        const filterByDate = (item: any) => {
            if (!calcStartDate) return true;
            const itemDate = item.createdAt || item.startDate;
            return itemDate && itemDate.toMillis() > calcStartDate.toMillis();
        };

        const filteredInvestments = investments.filter(filterByDate);
        const filteredP2PLoans = p2pLoans?.filter(filterByDate);
        const filteredStdLoans = standardLoans.filter(filterByDate);
        const filteredCustomLoans = customLoans.filter(filterByDate);

        // 1. Investment Profits
        const planStats = plans.map(plan => {
            const planInvestments = filteredInvestments.filter(inv => inv.planName === plan.name);
            const totalRevenue = planInvestments.reduce((sum, inv) => sum + (inv.investedAmount || 0), 0);
            const totalProfit = planInvestments.length * (plan.adminProfit || 0);
            return { id: plan.id, name: plan.name, salesCount: planInvestments.length, totalRevenue, totalProfit };
        });

        const totalInvestmentProfit = planStats.reduce((sum, p) => sum + p.totalProfit, 0);

        // 2. P2P Profits (2% constant)
        const p2pProfit = filteredP2PLoans?.reduce((sum, l) => sum + (l.amount * 0.02), 0) || 0;

        // 3. Standard Loan Stats
        const stdLoansActive = filteredStdLoans.filter(l => l.status === 'sent');
        const stdLoanProfit = filteredStdLoans
            .filter(l => l.status === 'sent' || l.status === 'completed')
            .reduce((sum, loan) => {
                const plan = loanPlans.find(p => p.id === loan.planId);
                return sum + (plan ? (plan.interest + (plan.tax || 0)) : 0);
            }, 0);
        
        const stdCapitalOut = stdLoansActive.reduce((sum, l) => sum + l.loanAmount, 0);

        // 4. Custom Loan Stats
        const customLoansActive = filteredCustomLoans.filter(l => l.status === 'active' || l.status === 'extension_pending');
        const customLoanProfit = filteredCustomLoans
            .filter(l => l.status === 'active' || l.status === 'completed' || l.status === 'payment_pending')
            .reduce((sum, l) => sum + (l.interestAmount || 0), 0);
        
        const customCapitalOut = customLoansActive.reduce((sum, l) => sum + l.requestedAmount, 0);

        return {
            planStats,
            totalOverallRevenue: planStats.reduce((sum, p) => sum + p.totalRevenue, 0),
            totalOverallProfit: totalInvestmentProfit + p2pProfit + stdLoanProfit + customLoanProfit,
            p2pProfit,
            stdLoanProfit,
            customLoanProfit,
            totalLoanProfit: stdLoanProfit + customLoanProfit,
            totalCapitalOut: stdCapitalOut + customCapitalOut,
            stdCapitalOut,
            customCapitalOut
        };
    }, [investments, plans, p2pLoans, standardLoans, customLoans, loanPlans, calcStartDate]);

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
            const settingsRef = doc(firestore, 'settings', 'admin');
            await runTransaction(firestore, async (transaction) => {
                transaction.update(settingsRef, { 
                    adminProfitBalance: 0,
                    profitCalculationStartDate: serverTimestamp()
                });
            });

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

    const loading = userLoading || settingsLoading || plansLoading || investmentsLoading || logsLoading || p2pLoading;

    if (loading) return <div className="flex h-full items-center justify-center"><p className="text-white/20 animate-pulse font-black tracking-[5px] text-xs">CALCULATING BALANCES...</p></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter text-white uppercase">Finance Hub</h2>
                    <p className="text-[10px] font-black uppercase text-white/20 tracking-[4px]">System Revenue & Liquidity</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsResetDialogOpen(true)} className="border-red-500/20 text-red-400 hover:bg-red-500/10 font-bold h-11 rounded-xl uppercase text-[10px] tracking-widest">
                        <RefreshCcw className="mr-2 h-4 w-4" /> Reset Ledger
                    </Button>
                    <Button onClick={() => setIsWithdrawDialogOpen(true)} className="bg-white text-black hover:bg-primary hover:text-white font-black h-11 rounded-xl shadow-xl shadow-white/5 transition-all uppercase text-[10px] tracking-widest px-6">
                        <IndianRupee className="mr-2 h-4 w-4" /> Withdraw Earnings
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-gradient-to-br from-primary/20 to-transparent border-white/[0.08] backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Wallet size={80}/></div>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] uppercase font-black tracking-widest text-white/40">Profit Wallet</CardTitle>
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-white tracking-tighter">₹{profitBalance.toFixed(2)}</div>
                        <p className="text-[9px] text-white/20 mt-1 font-black uppercase tracking-widest">Withdrawal Credit Available</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-3xl relative group overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Activity size={80}/></div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] uppercase font-black tracking-widest text-white/40">Market Volume</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-blue-400 tracking-tighter">₹{stats?.totalOverallRevenue.toLocaleString()}</div>
                        <p className="text-[9px] text-white/20 mt-1 font-black uppercase tracking-widest">Gross Sales Volume</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-3xl relative group overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><ArrowUpRight size={80}/></div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] uppercase font-black tracking-widest text-white/40">Total Earnings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-green-400 tracking-tighter">₹{stats?.totalOverallProfit.toLocaleString()}</div>
                        <p className="text-[9px] text-white/20 mt-1 font-black uppercase tracking-widest">Combined Net Profit</p>
                    </CardContent>
                </Card>

                <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-3xl border-primary/20 relative group overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><HandCoins size={80}/></div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] uppercase font-black tracking-widest text-white/40">Capital Out</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-primary tracking-tighter">₹{stats?.totalCapitalOut.toLocaleString()}</div>
                        <p className="text-[9px] text-white/20 mt-1 font-black uppercase tracking-widest">Active Lending Debt</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                {/* Investment Stats */}
                <Card className="lg:col-span-4 bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-2xl">
                    <CardHeader className="border-b border-white/[0.05] bg-white/[0.01] p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-white font-black uppercase tracking-tight text-lg">
                                    <Briefcase className="h-5 w-5 text-primary" /> Investment Analytics
                                </CardTitle>
                                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">Plan Performance Node</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Gross Profit</p>
                                <p className="text-xl font-black text-green-400">₹{(stats?.totalOverallProfit! - stats?.totalLoanProfit!).toLocaleString()}</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-white/[0.02]">
                                <TableRow className="border-white/10 hover:bg-transparent">
                                    <TableHead className="text-white/30 text-[10px] uppercase font-black tracking-widest pl-6 py-4">Plan Module</TableHead>
                                    <TableHead className="text-white/30 text-[10px] uppercase font-black tracking-widest text-center">Nodes Sold</TableHead>
                                    <TableHead className="text-white/30 text-[10px] uppercase font-black tracking-widest text-right pr-6">Admin Profit</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats?.planStats.map((plan) => (
                                    <TableRow key={plan.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                                        <TableCell className="font-bold text-white/80 pl-6 py-4">{plan.name}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="border-primary/20 text-primary text-[10px] font-black">{plan.salesCount}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6 font-black text-white text-sm">₹{plan.totalProfit.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                                {(!stats?.planStats || stats.planStats.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-20 text-white/10 italic font-bold uppercase tracking-widest text-[10px]">No active modules found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Loan Ledger */}
                <Card className="lg:col-span-3 bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
                    <CardHeader className="border-b border-white/[0.05] bg-white/[0.01] p-6">
                        <CardTitle className="flex items-center gap-2 text-white font-black uppercase tracking-tight text-lg">
                            <HandCoins className="h-5 w-5 text-primary" /> Credit Portfolio
                        </CardTitle>
                        <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">Lending & Interest Logs</p>
                    </CardHeader>
                    <CardContent className="p-8 flex-1 flex flex-col justify-center space-y-8">
                        <div className="grid grid-cols-2 gap-6">
                             <div className="space-y-1">
                                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Capital Lent</p>
                                <p className="text-2xl font-black text-white">₹{stats?.totalCapitalOut.toLocaleString()}</p>
                             </div>
                             <div className="space-y-1 text-right">
                                <p className="text-[9px] font-black text-green-400/40 uppercase tracking-widest">Est. Interest</p>
                                <p className="text-2xl font-black text-green-400">₹{stats?.totalLoanProfit.toLocaleString()}</p>
                             </div>
                        </div>

                        <Separator className="bg-white/5" />

                        <div className="space-y-5">
                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20"><Landmark size={18}/></div>
                                    <div>
                                        <p className="text-xs font-black text-white/80">Standard Protocol</p>
                                        <p className="text-[8px] text-white/20 uppercase font-bold tracking-widest">Fixed Plans</p>
                                    </div>
                                </div>
                                <p className="text-sm font-black text-white">₹{stats?.stdLoanProfit.toLocaleString()}</p>
                            </div>

                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent border border-accent/20"><Zap size={18}/></div>
                                    <div>
                                        <p className="text-xs font-black text-white/80">Flexi Protocol</p>
                                        <p className="text-[8px] text-white/20 uppercase font-bold tracking-widest">Custom Loans</p>
                                    </div>
                                </div>
                                <p className="text-sm font-black text-white">₹{stats?.customLoanProfit.toLocaleString()}</p>
                            </div>

                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20"><Users size={18}/></div>
                                    <div>
                                        <p className="text-xs font-black text-white/80">P2P Matching</p>
                                        <p className="text-[8px] text-white/20 uppercase font-bold tracking-widest">2% Platform Fee</p>
                                    </div>
                                </div>
                                <p className="text-sm font-black text-white">₹{stats?.p2pProfit.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="pt-4">
                            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex justify-between items-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-10"><PieChart size={40} className="text-primary"/></div>
                                <div>
                                    <p className="text-[9px] font-black text-primary uppercase tracking-widest">Settlement Goal</p>
                                    <p className="text-lg font-black text-white tracking-tight">₹{(stats?.totalCapitalOut! + stats?.totalLoanProfit!).toLocaleString()}</p>
                                </div>
                                <Badge className="bg-primary text-white text-[8px] font-black uppercase px-2 h-5">Projected</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Admin Payouts History */}
            <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-2xl mt-6">
                <CardHeader className="border-b border-white/[0.05] bg-white/[0.01] p-6">
                    <CardTitle className="flex items-center gap-2 text-white font-black uppercase tracking-tight text-lg">
                        <History className="h-5 w-5 text-primary" /> Admin Payout Logs
                    </CardTitle>
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">Withdrawal Records from Profit Node</p>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-white/[0.02]">
                            <TableRow className="border-white/10 hover:bg-transparent">
                                <TableHead className="text-white/30 text-[10px] uppercase font-black tracking-widest pl-6 py-4">Protocol Date</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-black tracking-widest">Status Node</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-black tracking-widest text-right pr-6">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {withdrawalLogs?.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds).map((log) => (
                                <TableRow key={log.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                                    <TableCell className="text-[10px] text-white/40 pl-6 font-bold py-4 uppercase">{new Date(log.createdAt.seconds * 1000).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[8px] font-black uppercase h-5 px-2">Verified Dispatch</Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-6 text-red-400 font-black text-sm">- ₹{log.amount.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                            {(!withdrawalLogs || withdrawalLogs.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-20 text-white/20 italic font-bold uppercase tracking-widest text-[10px]">No payout sequences detected.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Withdraw Dialog */}
            <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
                <DialogContent className="bg-[#030408]/90 backdrop-blur-2xl border-white/10 text-white rounded-[2rem] max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase tracking-tight">Withdraw Protocol Profit</DialogTitle>
                        <DialogDescription className="text-white/40 text-xs">
                            Transfer accumulated profits from the platform node to your personal identifier.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-6">
                        <div className="bg-white/5 rounded-2xl p-5 border border-white/5 flex justify-between items-center shadow-inner">
                            <span className="text-[10px] uppercase font-black tracking-widest text-white/20">Available Assets</span>
                            <span className="text-2xl font-black text-white tracking-tighter">₹{profitBalance.toFixed(2)}</span>
                        </div>
                        <div className="space-y-2 px-1">
                            <Label htmlFor="withdraw-amount" className="text-[10px] font-black uppercase text-white/40 tracking-widest">Payout Amount (INR)</Label>
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
                        <Button onClick={handleWithdrawProfit} className="w-full h-14 rounded-2xl font-black bg-white text-black hover:bg-primary hover:text-white shadow-2xl transition-all uppercase tracking-widest text-xs">Authorize Dispatch</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reset Dialog */}
            <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <AlertDialogContent className="bg-[#030408] border-white/10 text-white backdrop-blur-2xl rounded-[2rem]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Full Ledger Reset?</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/40 text-sm">
                            This will set the profit wallet to zero, delete all withdrawal logs, and restart revenue tracking from zero. Past records will be archived.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="pt-4">
                        <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/5 rounded-xl uppercase text-[10px] font-black tracking-widest">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleResetLedger} className="bg-destructive hover:bg-destructive/90 rounded-xl uppercase text-[10px] font-black tracking-widest">Confirm Full Reset</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
