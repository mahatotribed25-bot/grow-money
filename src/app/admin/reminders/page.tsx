
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Phone, 
    MessageSquare, 
    BellRing, 
    Calendar, 
    AlertCircle, 
    CheckCircle2, 
    Timer, 
    ArrowUpRight,
    Users,
    Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Timestamp } from 'firebase/firestore';

type EMI = {
  emiAmount: number;
  dueDate: Timestamp;
  status: 'Pending' | 'Paid' | 'Due' | 'Payment Pending';
}

type Loan = {
  id: string;
  userId: string;
  userName?: string; // We'll try to fetch these or fallback
  planName: string;
  loanAmount: number;
  totalPayable: number;
  penalty?: number;
  dueDate: Timestamp;
  status: 'Active' | 'Due' | 'Completed' | 'Payment Pending';
  repaymentMethod: 'EMI' | 'Direct';
  emis?: EMI[];
};

type UserData = {
    id: string;
    name: string;
    phoneNumber: string;
}

export default function ReminderHubPage() {
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    
    // Fetch all loans across all users
    const { data: allLoans, loading: loansLoading } = useCollection<Loan>('loans', { subcollections: true });
    // Fetch all users to map names and phone numbers
    const { data: users, loading: usersLoading } = useCollection<UserData>('users');

    const loading = loansLoading || usersLoading;

    const reminderData = useMemo(() => {
        if (!allLoans || !users) return [];

        return allLoans
            .filter(loan => loan.status !== 'Completed')
            .map(loan => {
                const user = users.find(u => u.id === loan.userId);
                
                // Calculate installments info
                const totalInstallments = loan.repaymentMethod === 'EMI' ? (loan.emis?.length || 0) : 1;
                const paidInstallments = loan.repaymentMethod === 'EMI' 
                    ? (loan.emis?.filter(e => e.status === 'Paid').length || 0) 
                    : 0;

                const nextEmi = loan.repaymentMethod === 'EMI' 
                    ? loan.emis?.find(e => e.status !== 'Paid') 
                    : null;

                const isOverdue = loan.status === 'Due' || (loan.penalty && loan.penalty > 0);

                return {
                    ...loan,
                    userName: user?.name || 'Unknown Investor',
                    phoneNumber: user?.phoneNumber || '',
                    remainingInstallments: totalInstallments - paidInstallments,
                    totalInstallments,
                    isOverdue,
                    nextDueDate: nextEmi ? nextEmi.dueDate : loan.dueDate,
                    nextAmount: nextEmi ? nextEmi.emiAmount : loan.totalPayable
                };
            })
            .filter(item => 
                item.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.planName.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .sort((a, b) => a.nextDueDate.seconds - b.nextDueDate.seconds);
    }, [allLoans, users, searchQuery]);

    const handleCall = (phoneNumber: string) => {
        if (!phoneNumber) {
            toast({ title: "Phone Not Found", description: "This user has not linked a phone number.", variant: "destructive" });
            return;
        }
        window.location.href = `tel:+91${phoneNumber}`;
    };

    const handleSendReminder = (loan: any) => {
        if (!loan.phoneNumber) {
            toast({ title: "Missing Node Link", description: "WhatsApp requires a linked phone node.", variant: "destructive" });
            return;
        }

        const dateStr = new Date(loan.nextDueDate.seconds * 1000).toLocaleDateString();
        const amount = (loan.nextAmount + (loan.penalty || 0)).toFixed(2);
        
        let message = '';
        if (loan.isOverdue) {
            message = `🚨 *URGENT REPAYMENT ALERT* 🚨\n\nDear *${loan.userName}*,\n\nYour loan for *${loan.planName}* is now *OVERDUE*.\n\n💰 *Total Due:* ₹${amount}\n⚠️ *Includes Penalty:* ₹${loan.penalty?.toFixed(2) || '0.00'}\n\nPlease settle this immediately to avoid account termination and trust score depletion.\n\n*Grow Money Admin Node* 💰`;
        } else {
            message = `🔔 *Repayment Reminder* 🔔\n\nHello *${loan.userName}*,\n\nThis is a friendly reminder for your upcoming installment for *${loan.planName}*.\n\n💰 *Amount:* ₹${amount}\n🗓️ *Due Date:* ${dateStr}\n\nMaintain your trust score by paying on time! \n\n*Grow Money Team* 💰`;
        }

        window.open(`https://wa.me/91${loan.phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Reminder Hub</h2>
                    <p className="text-[10px] font-black uppercase text-white/20 tracking-[4px]">Active Liability Oversight</p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                    <Input 
                        placeholder="Search borrowers..." 
                        className="pl-10 bg-white/5 border-white/10 rounded-xl h-11 focus:ring-primary"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatusCard title="Overdue Nodes" value={reminderData.filter(l => l.isOverdue).length} icon={AlertCircle} color="text-red-500" />
                <StatusCard title="Upcoming Payouts" value={reminderData.filter(l => !l.isOverdue).length} icon={Calendar} color="text-blue-400" />
                <StatusCard title="Total Active Capital" value={`₹${reminderData.reduce((s, l) => s + l.loanAmount, 0).toLocaleString()}`} icon={Users} color="text-primary" />
                <StatusCard title="Collection Integrity" value="94.2%" icon={CheckCircle2} color="text-green-400" />
            </div>

            <Card className="bg-white/[0.02] border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
                <CardHeader className="bg-white/[0.01] border-b border-white/[0.05] p-6">
                    <CardTitle className="text-sm font-black uppercase tracking-[3px] text-white/40 flex items-center gap-2">
                        <BellRing size={16} className="text-primary" /> Global Repayment Ledger
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-white/[0.02]">
                                <TableRow className="border-white/10">
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/20 pl-8">Borrower</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/20">Asset & Value</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/20">Protocol Progress</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/20">Deadline</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/20">Status</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/20 pr-8 text-right">Dispatch Alert</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow className="border-transparent">
                                        <TableCell colSpan={6} className="text-center py-20">
                                            <Timer className="animate-spin h-6 w-6 text-primary mx-auto mb-2" />
                                            <p className="text-[10px] font-black uppercase text-white/20 tracking-widest">Accessing Ledger Nodes...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : reminderData.length === 0 ? (
                                    <TableRow className="border-transparent">
                                        <TableCell colSpan={6} className="text-center py-20 text-white/10 italic text-sm">No active liabilities detected in current window.</TableCell>
                                    </TableRow>
                                ) : (
                                    reminderData.map((loan) => (
                                        <TableRow key={loan.id} className="border-white/[0.03] hover:bg-white/[0.01] transition-colors">
                                            <TableCell className="pl-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9 border border-white/10 rounded-xl">
                                                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black uppercase">
                                                            {loan.userName?.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="text-sm font-bold text-white/80">{loan.userName}</p>
                                                        <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">{loan.phoneNumber || 'NO PHONE LINK'}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="text-xs font-black text-white/70 uppercase truncate max-w-[120px]">{loan.planName}</p>
                                                    <p className="text-sm font-black text-white tracking-tighter">₹{loan.loanAmount.toLocaleString()}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between items-center gap-4">
                                                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{loan.repaymentMethod} Protocol</span>
                                                        <span className="text-[9px] font-black text-primary uppercase">{loan.totalInstallments - loan.remainingInstallments}/{loan.totalInstallments}</span>
                                                    </div>
                                                    <div className="h-1 w-24 bg-white/5 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-primary" 
                                                            style={{ width: `${((loan.totalInstallments - loan.remainingInstallments) / loan.totalInstallments) * 100}%` }} 
                                                        />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className={cn(
                                                        "text-xs font-black tracking-tighter",
                                                        loan.isOverdue ? "text-red-400" : "text-white/60"
                                                    )}>
                                                        {new Date(loan.nextDueDate.seconds * 1000).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-white/20 uppercase">Next Settlement</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn(
                                                    "text-[8px] font-black uppercase px-2 h-5",
                                                    loan.isOverdue ? "border-red-500/20 text-red-500 bg-red-500/5" : "border-primary/20 text-primary bg-primary/5"
                                                )}>
                                                    {loan.isOverdue ? "OVERDUE" : "ACTIVE"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="pr-8 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => handleCall(loan.phoneNumber)}
                                                        className="h-9 w-9 rounded-xl bg-white/[0.03] border border-white/5 text-white/40 hover:text-white hover:bg-white/10"
                                                    >
                                                        <Phone size={14} />
                                                    </Button>
                                                    <Button 
                                                        onClick={() => handleSendReminder(loan)}
                                                        className={cn(
                                                            "h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg transition-all",
                                                            loan.isOverdue 
                                                                ? "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20" 
                                                                : "bg-green-600 hover:bg-green-700 text-white shadow-green-600/20"
                                                        )}
                                                    >
                                                        <MessageSquare size={14} />
                                                        {loan.isOverdue ? 'WARN NODE' : 'SEND ALERT'}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function StatusCard({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: any, color: string }) {
    return (
        <Card className="bg-white/[0.02] border-white/5 p-5 rounded-3xl relative overflow-hidden group hover:bg-white/[0.04] transition-all">
            <div className="flex justify-between items-start relative z-10">
                <div className="space-y-4">
                    <p className="text-[9px] font-black uppercase tracking-[3px] text-white/20">{title}</p>
                    <p className="text-2xl font-black text-white tracking-tighter">{value}</p>
                </div>
                <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center bg-white/5 border border-white/5", color)}>
                    <Icon size={18} />
                </div>
            </div>
            <div className="absolute -bottom-2 -right-2 opacity-5 group-hover:opacity-10 transition-opacity">
                <Icon size={80} />
            </div>
        </Card>
    );
}
