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
    Mail,
    BellRing, 
    Calendar, 
    AlertCircle, 
    CheckCircle2, 
    Timer, 
    ArrowUpRight,
    Users,
    Search,
    ShieldCheck,
    HandCoins,
    Zap
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
  userName?: string; 
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
    email: string;
}

export default function ReminderHubPage() {
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    
    const { data: allLoans, loading: loansLoading } = useCollection<Loan>('loans', { subcollections: true });
    const { data: users, loading: usersLoading } = useCollection<UserData>('users');

    const loading = loansLoading || usersLoading;

    const reminderData = useMemo(() => {
        if (!allLoans || !users) return [];

        return allLoans
            .filter(loan => loan.status !== 'Completed')
            .map(loan => {
                const user = users.find(u => u.id === loan.userId);
                
                const totalInstallments = loan.repaymentMethod === 'EMI' ? (loan.emis?.length || 0) : 1;
                const paidInstallments = loan.repaymentMethod === 'EMI' 
                    ? (loan.emis?.filter(e => e.status === 'Paid').length || 0) 
                    : 0;

                const nextEmi = loan.repaymentMethod === 'EMI' 
                    ? loan.emis?.find(e => e.status !== 'Paid') 
                    : null;

                // Check if current date has crossed the due date
                const now = new Date();
                const dueDateObj = nextEmi ? nextEmi.dueDate.toDate() : loan.dueDate.toDate();
                const isDateCrossed = now > dueDateObj;

                const isOverdue = loan.status === 'Due' || (loan.penalty && loan.penalty > 0) || isDateCrossed;

                return {
                    ...loan,
                    userName: user?.name || 'Unknown Investor',
                    phoneNumber: user?.phoneNumber || '',
                    userEmail: user?.email || '',
                    remainingInstallments: totalInstallments - paidInstallments,
                    totalInstallments,
                    isOverdue,
                    isDateCrossed,
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
            toast({ title: "Phone Not Found", variant: "destructive" });
            return;
        }
        window.location.href = `tel:+91${phoneNumber}`;
    };

    const handleSendReminder = (loan: any) => {
        if (!loan.phoneNumber) {
            toast({ title: "Missing Contact", description: "WhatsApp requires a linked phone node.", variant: "destructive" });
            return;
        }

        const dateStr = new Date(loan.nextDueDate.seconds * 1000).toLocaleDateString();
        const amount = (loan.nextAmount + (loan.penalty || 0)).toFixed(2);
        
        let message = '';
        if (loan.isOverdue) {
            message = `🚨 *URGENT REPAYMENT NOTICE* 🚨\n\nDear *${loan.userName}*,\n\nYour loan for *${loan.planName}* has *CROSSED THE DUE DATE*.\n\n💰 *Total Due:* ₹${amount}\n⚠️ *Includes Penalty:* ₹${loan.penalty?.toFixed(2) || '0.00'}\n\nPlease settle this immediately to avoid further penalties or account restrictions.\n\n*Grow Money Team* 💰`;
        } else {
            message = `🔔 *Repayment Reminder* 🔔\n\nHello *${loan.userName}*,\n\nFriendly reminder for your upcoming payment for *${loan.planName}*.\n\n💰 *Amount:* ₹${amount}\n🗓️ *Due Date:* ${dateStr}\n\n*Grow Money Team* 💰`;
        }

        window.open(`https://wa.me/91${loan.phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handleEmailReminder = (loan: any) => {
        if (!loan.userEmail) {
            toast({ title: "Email Not Found", variant: "destructive" });
            return;
        }

        const dateStr = new Date(loan.nextDueDate.seconds * 1000).toLocaleDateString();
        const amount = (loan.nextAmount + (loan.penalty || 0)).toFixed(2);
        
        const subject = loan.isOverdue ? `URGENT NOTICE: Due Date Crossed - Grow Money` : `Reminder: Upcoming Loan Payment - Grow Money`;
        
        let body = `Hello ${loan.userName},\n\n`;
        if (loan.isOverdue) {
            body += `This is an urgent formal notice regarding your loan for "${loan.planName}". Your repayment date has been CROSSED.\n\n`;
            body += `Pending Amount: INR ${amount}\n`;
            if (loan.penalty > 0) body += `Late Penalty Included: INR ${loan.penalty.toFixed(2)}\n`;
            body += `Original Due Date: ${dateStr}\n\n`;
            body += `Failure to settle this node immediately will impact your Trust Score and may lead to account termination.\n\n`;
        } else {
            body += `This is a friendly reminder for your upcoming loan installment for "${loan.planName}".\n\n`;
            body += `Amount Due: INR ${amount}\n`;
            body += `Payment Date: ${dateStr}\n\n`;
            body += `Please ensure your wallet has sufficient balance to avoid late fees.\n\n`;
        }
        body += `Regards,\nGrow Money Administration`;

        window.location.href = `mailto:${loan.userEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Reminder Hub</h2>
                    <p className="text-[10px] font-black uppercase text-white/20 tracking-[4px]">Asset Recovery Terminal</p>
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
                <StatusCard title="Date Crossed" value={reminderData.filter(l => l.isDateCrossed).length} icon={AlertCircle} color="text-red-500" />
                <StatusCard title="Upcoming Nodes" value={reminderData.filter(l => !l.isOverdue).length} icon={Calendar} color="text-blue-400" />
                <StatusCard title="Expected Collection" value={`₹${reminderData.reduce((s, l) => s + l.nextAmount, 0).toLocaleString()}`} icon={HandCoins} color="text-primary" />
                <StatusCard title="Node Integrity" value="98.2%" icon={ShieldCheck} color="text-green-400" />
            </div>

            <Card className="bg-white/[0.02] border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
                <CardHeader className="bg-white/[0.01] border-b border-white/[0.05] p-6">
                    <CardTitle className="text-sm font-black uppercase tracking-[3px] text-white/40 flex items-center gap-2">
                        <BellRing size={16} className="text-primary" /> Global Recovery Pipeline
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-white/[0.02]">
                                <TableRow className="border-white/10">
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/20 pl-8">Investor</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/20">Protocol Details</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/20">Progress</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/20">Deadline</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/20">Status</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/20 pr-8 text-right">Notice Dispatch</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow className="border-transparent">
                                        <TableCell colSpan={6} className="text-center py-20">
                                            <Timer className="animate-spin h-6 w-6 text-primary mx-auto mb-2" />
                                            <p className="text-[10px] font-black uppercase text-white/20 tracking-widest">Scanning Ledger...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : reminderData.length === 0 ? (
                                    <TableRow className="border-transparent">
                                        <TableCell colSpan={6} className="text-center py-20 text-white/10 italic text-sm">All liabilities settled.</TableCell>
                                    </TableRow>
                                ) : (
                                    reminderData.map((loan) => (
                                        <TableRow key={loan.id} className={cn(
                                            "border-white/[0.03] hover:bg-white/[0.01] transition-colors",
                                            loan.isDateCrossed && "bg-red-500/[0.02]"
                                        )}>
                                            <TableCell className="pl-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9 border border-white/10 rounded-xl">
                                                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black uppercase">
                                                            {loan.userName?.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="text-sm font-bold text-white/80">{loan.userName}</p>
                                                        <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">{loan.phoneNumber || 'NO CONTACT'}</p>
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
                                                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{loan.repaymentMethod}</span>
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
                                                        loan.isDateCrossed ? "text-red-400 animate-pulse" : "text-white/60"
                                                    )}>
                                                        {new Date(loan.nextDueDate.seconds * 1000).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-white/20 uppercase">Settlement Date</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {loan.isDateCrossed ? (
                                                    <Badge className="bg-red-600 text-white border-none text-[8px] font-black uppercase px-2 h-5 animate-bounce shadow-lg shadow-red-600/20">
                                                        DATE CROSSED
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className={cn(
                                                        "text-[8px] font-black uppercase px-2 h-5",
                                                        loan.isOverdue ? "border-amber-500/20 text-amber-500 bg-amber-500/5" : "border-primary/20 text-primary bg-primary/5"
                                                    )}>
                                                        {loan.isOverdue ? "OVERDUE" : "ON TRACK"}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="pr-8 text-right">
                                                <div className="flex justify-end gap-1.5">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => handleCall(loan.phoneNumber)}
                                                        className="h-9 w-9 rounded-xl bg-white/[0.03] border border-white/5 text-white/40 hover:text-white hover:bg-white/10"
                                                    >
                                                        <Phone size={14} />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEmailReminder(loan)}
                                                        className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:text-white hover:bg-blue-500"
                                                    >
                                                        <Mail size={14} />
                                                    </Button>
                                                    <Button 
                                                        onClick={() => handleSendReminder(loan)}
                                                        className={cn(
                                                            "h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg transition-all",
                                                            loan.isDateCrossed 
                                                                ? "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20" 
                                                                : "bg-green-600 hover:bg-green-700 text-white shadow-green-600/20"
                                                        )}
                                                    >
                                                        <MessageSquare size={14} />
                                                        {loan.isDateCrossed ? 'SEND NOTICE' : 'REMIND'}
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

            <div className="p-8 bg-red-500/5 border border-red-500/10 rounded-[2rem] flex flex-col justify-center gap-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                    <Zap size={140} className="text-red-500" />
                </div>
                <div className="space-y-4 relative z-10">
                    <div className="h-14 w-14 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500 shadow-xl shadow-red-500/10 border border-red-500/20">
                        <AlertCircle size={28} />
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Recovery Protocol</h3>
                    <p className="text-xs text-white/50 leading-relaxed font-medium max-w-lg">
                        The **Date Crossed** notice is triggered when a user fails to settle their node within the authorized term. Continued non-compliance should be met with formal system notices and Trust Score penalties.
                    </p>
                </div>
                <div className="pt-2">
                    <Button 
                        onClick={() => toast({ title: "Notice Pipeline", description: "Analyzing all overdue nodes..." })}
                        className="bg-white text-black font-black uppercase text-[10px] h-10 px-6 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-xl"
                    >
                        Execute Batch Notice Node
                    </Button>
                </div>
            </div>
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
