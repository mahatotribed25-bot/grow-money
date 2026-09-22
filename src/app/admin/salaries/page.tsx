
'use client';

import { useCollection, useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IndianRupee, Timer, CreditCard, Send, PlusCircle, History, Landmark, Coins, TrendingUp, Calendar, Calculator } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, orderBy, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

type StaffMember = {
    id: string;
    name: string;
    email: string;
    role: string;
    baseSalary?: number;
}

type SalaryRecord = {
    id: string;
    staffId: string;
    staffName: string;
    month: string;
    year: number;
    baseSalary: number;
    bonus: number;
    deductions: number;
    netPaid: number;
    paidAt: Timestamp;
    paymentMethod: string;
}

type AttendanceLog = {
    userId: string;
    month: string;
    year: number;
    status: string;
}

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function SalaryManagementPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { data: staffMembers } = useCollection<StaffMember>('users', { where: ['role', '==', 'subadmin'] });
    const { data: salaryHistory, loading } = useCollection<SalaryRecord>('staffSalaries', undefined, orderBy('paidAt', 'desc'));
    const { data: attendanceLogs } = useCollection<AttendanceLog>('attendance');

    const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState('');
    const [month, setMonth] = useState(months[new Date().getMonth()]);
    const [baseSalary, setBaseSalary] = useState('');
    const [bonus, setBonus] = useState('0');
    const [deductions, setDeductions] = useState('0');
    const [method, setMethod] = useState('UPI');

    // Attendance stats for calculation
    const attendanceStats = useMemo(() => {
        if (!selectedStaff || !attendanceLogs) return { present: 0, halfDay: 0, credit: 0 };
        const staffLogs = attendanceLogs.filter(l => l.userId === selectedStaff && l.month === month);
        const present = staffLogs.filter(l => l.status === 'present' || l.status === 'holiday').length;
        const halfDay = staffLogs.filter(l => l.status === 'half-day').length;
        return { present, halfDay, credit: present + (halfDay * 0.5) };
    }, [selectedStaff, month, attendanceLogs]);

    const daysInMonth = useMemo(() => {
        const date = new Date();
        const monthIndex = months.indexOf(month);
        return new Date(date.getFullYear(), monthIndex + 1, 0).getDate();
    }, [month]);

    const proRataSalary = useMemo(() => {
        const base = parseFloat(baseSalary) || 0;
        if (daysInMonth === 0) return 0;
        return (base / daysInMonth) * attendanceStats.credit;
    }, [baseSalary, daysInMonth, attendanceStats.credit]);

    const netAmount = useMemo(() => {
        const b = parseFloat(bonus) || 0;
        const d = parseFloat(deductions) || 0;
        return proRataSalary + b - d;
    }, [proRataSalary, bonus, deductions]);

    useEffect(() => {
        if (selectedStaff) {
            const staff = staffMembers?.find(s => s.id === selectedStaff);
            if (staff?.baseSalary) setBaseSalary(staff.baseSalary.toString());
        }
    }, [selectedStaff, staffMembers]);

    const stats = useMemo(() => {
        if (!salaryHistory) return { totalPaid: 0, currentMonth: 0 };
        const total = salaryHistory.reduce((sum, r) => sum + (r.netPaid || 0), 0);
        const thisMonth = salaryHistory
            .filter(r => r.month === months[new Date().getMonth()] && r.year === new Date().getFullYear())
            .reduce((sum, r) => sum + (r.netPaid || 0), 0);
        return { totalPaid: total, currentMonth: thisMonth };
    }, [salaryHistory]);

    const handlePaySalary = async () => {
        if (!selectedStaff || !baseSalary) {
            toast({ title: "Validation Error", description: "Select staff and enter base salary.", variant: "destructive" });
            return;
        }

        const staff = staffMembers?.find(s => s.id === selectedStaff);
        const salaryData = {
            staffId: selectedStaff,
            staffName: staff?.name || 'Unknown',
            month,
            year: new Date().getFullYear(),
            baseSalary: parseFloat(baseSalary),
            attendanceCreditDays: attendanceStats.credit,
            proRataBase: proRataSalary,
            bonus: parseFloat(bonus),
            deductions: parseFloat(deductions),
            netPaid: netAmount,
            paidAt: serverTimestamp(),
            paymentMethod: method,
            transactionId: `PAY-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
        };

        try {
            await addDoc(collection(firestore, 'staffSalaries'), salaryData);
            toast({ title: "Payment Recorded", description: `Salary for ${staff?.name} has been logged.` });
            setIsPayDialogOpen(false);
            setBaseSalary('');
            setBonus('0');
            setDeductions('0');
            setSelectedStaff('');
        } catch (e) {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Payroll Hub</h2>
                    <p className="text-[10px] font-black uppercase text-white/20 tracking-[4px]">Staff Remuneration & Logs</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild className="h-12 px-6 rounded-2xl border-white/10 bg-white/5 text-white/60 font-black uppercase tracking-widest text-[10px] hover:bg-white/10">
                        <Link href="/admin/attendance"><Calendar className="mr-2 h-4 w-4" /> Attendance Board</Link>
                    </Button>
                    <Button onClick={() => setIsPayDialogOpen(true)} className="h-12 px-8 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] hover:bg-primary hover:text-white transition-all shadow-xl shadow-white/5">
                        <PlusCircle size={16} className="mr-2" /> Issue Monthly Salary
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SummaryCard title="Monthly Payout" value={`₹${stats.currentMonth.toLocaleString()}`} icon={IndianRupee} desc={`For ${months[new Date().getMonth()]}`} color="text-primary" />
                <SummaryCard title="Lifetime Payroll" value={`₹${stats.totalPaid.toLocaleString()}`} icon={Coins} desc="Total system disbursement" color="text-green-400" />
                <SummaryCard title="Active Contracts" value={staffMembers?.length || 0} icon={Landmark} desc="Staff nodes requiring payment" color="text-blue-400" />
            </div>

            <Card className="bg-white/[0.02] border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
                <CardHeader className="bg-white/[0.01] border-b border-white/[0.05] p-6">
                    <CardTitle className="text-sm font-black uppercase tracking-[3px] text-white/40 flex items-center gap-2">
                        <History size={16} className="text-primary" /> Salary Disbursement Logs
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-white/[0.02]">
                            <TableRow className="border-white/10">
                                <TableHead className="text-[10px] font-black uppercase text-white/20 pl-8 py-5">Personnel</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/20">Period</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/20">Net Disbursed</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/20">Dispatch Data</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/20 pr-8 text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-20 opacity-20 italic">Syncing Ledger...</TableCell></TableRow>
                            ) : salaryHistory?.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-20 text-white/10 italic">No salary records archived yet.</TableCell></TableRow>
                            ) : (
                                salaryHistory?.map((log) => (
                                    <TableRow key={log.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                                        <TableCell className="pl-8 py-5">
                                            <div>
                                                <p className="text-sm font-bold text-white/80">{log.staffName}</p>
                                                <p className="text-[8px] text-white/20 font-black uppercase tracking-widest">ID: {log.staffId.slice(-8).toUpperCase()}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-xs font-bold text-white/60">{log.month} {log.year}</p>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-green-400">₹{log.netPaid.toLocaleString() ?? '0.00'}</span>
                                                <span className="text-[8px] text-white/20 font-bold uppercase">Base: ₹{log.baseSalary}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-white/40">{log.paymentMethod}</span>
                                                <span className="text-[8px] text-white/20 font-black">
                                                    {log.paidAt ? new Date(log.paidAt.seconds * 1000).toLocaleDateString() : 'Processing...'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="pr-8 text-right">
                                            <Badge className="bg-accent/10 text-accent border-accent/20 text-[8px] font-black uppercase tracking-widest px-2 h-5">Verified Paid</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
                <DialogContent className="bg-[#030408]/90 backdrop-blur-2xl border-white/10 text-white rounded-[2rem] max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tight">Issue Payroll Node</DialogTitle>
                        <DialogDescription className="text-white/40">Authorize and record monthly salary for staff personnel.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh] pr-4">
                        <div className="grid grid-cols-2 gap-4 py-6">
                            <div className="col-span-2 space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Staff Member</Label>
                                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                                    <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl">
                                        <SelectValue placeholder="Select staff personnel" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#030408] border-white/10">
                                        {staffMembers?.map(s => (
                                            <SelectItem key={s.id} value={s.id}>{s.name} ({s.role})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Payment Month</Label>
                                <Select value={month} onValueChange={setMonth}>
                                    <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#030408] border-white/10">
                                        {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Payment Method</Label>
                                <Select value={method} onValueChange={setMethod}>
                                    <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#030408] border-white/10">
                                        <SelectItem value="UPI">UPI Transfer</SelectItem>
                                        <SelectItem value="Bank">Bank IMPS</SelectItem>
                                        <SelectItem value="Cash">Cash Disbursement</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="col-span-2 p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Attendance Calculation</p>
                                    <Calculator className="h-4 w-4 text-primary" />
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-bold text-white/20 uppercase">Present</p>
                                        <p className="text-sm font-black">{attendanceStats.present}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-bold text-white/20 uppercase">Half-Day</p>
                                        <p className="text-sm font-black">{attendanceStats.halfDay}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-bold text-white/20 uppercase">Credit Days</p>
                                        <p className="text-sm font-black text-primary">{attendanceStats.credit}</p>
                                    </div>
                                </div>
                                <Separator className="bg-primary/20" />
                                <div className="flex justify-between items-center px-1">
                                    <p className="text-[9px] font-bold text-white/40 uppercase">Pro-Rata Base ({attendanceStats.credit}/{daysInMonth} Days)</p>
                                    <p className="text-base font-black text-white">₹{proRataSalary.toFixed(2)}</p>
                                </div>
                            </div>

                            <div className="space-y-2 col-span-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Full Month Base Salary (INR)</Label>
                                <Input type="number" value={baseSalary} onChange={e => setBaseSalary(e.target.value)} placeholder="0.00" className="bg-white/5 border-white/10 h-12 rounded-xl font-bold" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Bonus Credits</Label>
                                <Input type="number" value={bonus} onChange={e => setBonus(e.target.value)} placeholder="0.00" className="bg-white/5 border-white/10 h-12 rounded-xl font-bold text-green-400" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Deductions</Label>
                                <Input type="number" value={deductions} onChange={e => setDeductions(e.target.value)} placeholder="0.00" className="bg-white/5 border-white/10 h-12 rounded-xl font-bold text-red-400" />
                            </div>
                            <div className="bg-white/5 rounded-2xl p-5 border border-white/5 flex justify-between items-center col-span-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Final Net Payout</span>
                                <span className="text-2xl font-black text-white">₹{netAmount.toLocaleString()}</span>
                            </div>
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button onClick={handlePaySalary} className="w-full h-14 rounded-2xl bg-primary text-white font-black shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-all">
                            <Send className="mr-2" size={18}/> Authorize Disbursement
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function SummaryCard({ title, value, icon: Icon, desc, color }: { title: string, value: any, icon: any, desc: string, color: string }) {
    return (
        <Card className="bg-white/[0.02] border-white/5 p-6 rounded-[2rem] relative overflow-hidden group hover:bg-white/[0.04] transition-all">
            <div className="flex justify-between items-start relative z-10">
                <div className="space-y-4">
                    <p className="text-[9px] font-black uppercase tracking-[3px] text-white/20">{title}</p>
                    <p className={cn("text-3xl font-black tracking-tighter", color)}>{value}</p>
                    <p className="text-[8px] font-bold text-white/10 uppercase tracking-widest">{desc}</p>
                </div>
                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center bg-white/5 border border-white/5", color)}>
                    <Icon size={22} />
                </div>
            </div>
            <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Icon size={120} />
            </div>
        </Card>
    );
}

import Link from 'next/link';
