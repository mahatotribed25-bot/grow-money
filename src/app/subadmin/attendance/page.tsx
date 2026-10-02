'use client';

import { useMemo, useState } from 'react';
import { useCollection, useUser, useDoc } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, CheckCircle2, XCircle, Timer, Info, Calculator, IndianRupee, TrendingUp, Landmark } from 'lucide-react';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type AttendanceLog = {
    id: string;
    userId: string;
    userName: string;
    date: Timestamp;
    status: 'present' | 'absent' | 'half-day' | 'holiday';
    reason?: string;
    month: string;
    year: number;
}

type UserData = {
    baseSalary?: number;
}

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function SubAdminAttendancePage() {
    const { user } = useUser();
    const [selectedMonth, setSelectedMonth] = useState(months[new Date().getMonth()]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const { data: userData } = useDoc<UserData>(user ? `users/${user.uid}` : null);
    const { data: myLogs, loading } = useCollection<AttendanceLog>(
        user ? 'attendance' : null, 
        { where: ['userId', '==', user?.uid] }
    );

    const stats = useMemo(() => {
        const monthLogs = myLogs?.filter(l => l.month === selectedMonth && l.year === selectedYear) || [];
        const present = monthLogs.filter(l => l.status === 'present').length;
        const halfDay = monthLogs.filter(l => l.status === 'half-day').length;
        const absent = monthLogs.filter(l => l.status === 'absent').length;
        const holiday = monthLogs.filter(l => l.status === 'holiday').length;
        
        return { 
            present, 
            halfDay, 
            absent, 
            holiday,
            totalCredit: present + holiday + (halfDay * 0.5) 
        };
    }, [myLogs, selectedMonth, selectedYear]);

    const daysInMonth = useMemo(() => {
        const monthIndex = months.indexOf(selectedMonth);
        return new Date(selectedYear, monthIndex + 1, 0).getDate();
    }, [selectedMonth, selectedYear]);

    const salaryProjection = useMemo(() => {
        const base = userData?.baseSalary || 0;
        if (daysInMonth === 0) return 0;
        return (base / daysInMonth) * stats.totalCredit;
    }, [userData, daysInMonth, stats.totalCredit]);

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Attendance Hub</h2>
                    <p className="text-[10px] font-black uppercase text-white/20 tracking-[4px]">Personnel Record Terminal</p>
                </div>
                <div className="flex gap-2">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[160px] bg-white/5 border-white/10 rounded-xl h-11 text-xs font-bold uppercase">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#030408] border-white/10">
                            {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="Full Nodes" value={stats.present + stats.holiday} color="text-green-400" icon={CheckCircle2} />
                <StatCard title="Partial Nodes" value={stats.halfDay} color="text-blue-400" icon={Timer} />
                <StatCard title="Offline" value={stats.absent} color="text-red-400" icon={XCircle} />
                <StatCard title="Credit Days" value={stats.totalCredit} color="text-primary" icon={Calculator} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 bg-primary/5 border border-primary/20 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                        <IndianRupee size={120} className="text-primary" />
                    </div>
                    <CardHeader className="p-0 mb-6">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[3px] text-primary">Salary Projection</CardTitle>
                        <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Based on {selectedMonth} performance</p>
                    </CardHeader>
                    <div className="space-y-6 relative z-10">
                        <div>
                            <p className="text-4xl font-black text-white tracking-tighter">₹{salaryProjection.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            <p className="text-[9px] font-bold text-white/40 uppercase mt-1">Estimated Payout Node</p>
                        </div>
                        <Separator className="bg-primary/20" />
                        <div className="space-y-3">
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                                <span className="text-white/30">Contract Base</span>
                                <span className="text-white/60">₹{(userData?.baseSalary || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                                <span className="text-white/30">Efficiency</span>
                                <span className="text-primary">{Math.round((stats.totalCredit / daysInMonth) * 100)}%</span>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="lg:col-span-2 bg-white/[0.02] border-white/5 rounded-[2rem] p-8 shadow-2xl flex flex-col justify-center">
                    <CardHeader className="p-0 mb-8">
                        <CardTitle className="text-sm font-black uppercase tracking-[3px] text-white/40">Work Protocol Progress</CardTitle>
                    </CardHeader>
                    <div className="space-y-8">
                        <div className="space-y-3">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/20">
                                <span>Cycle Completion</span>
                                <span>{stats.totalCredit} / {daysInMonth} Days</span>
                            </div>
                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                <Progress value={(stats.totalCredit / daysInMonth) * 100} className="h-full" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/10 flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center text-green-500"><TrendingUp size={20}/></div>
                                <div><p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Payable Credit</p><p className="text-lg font-black text-white">{stats.totalCredit} Days</p></div>
                            </div>
                            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400"><Landmark size={20}/></div>
                                <div><p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Status</p><p className="text-lg font-black text-white uppercase tracking-tighter">Verified</p></div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="bg-white/[0.02] border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
                <CardHeader className="bg-white/[0.01] border-b border-white/[0.05] p-6">
                    <CardTitle className="text-sm font-black uppercase tracking-[3px] text-white/40 flex items-center gap-2">
                        <Info size={16} className="text-primary" /> Log Entry Archive: {selectedMonth}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-white/[0.02]">
                            <TableRow className="border-white/10">
                                <TableHead className="text-[10px] font-black uppercase text-white/20 pl-8 py-5">Work Date</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/20">Protocol Status</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/20">Credit Value</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/20 pr-8 text-right">System Note</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-20 opacity-20 italic">Loading Registry...</TableCell></TableRow>
                            ) : myLogs?.filter(l => l.month === selectedMonth && l.year === selectedYear).length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-20 text-white/10 italic text-sm">No log nodes detected for {selectedMonth}.</TableCell></TableRow>
                            ) : (
                                myLogs?.filter(l => l.month === selectedMonth && l.year === selectedYear).sort((a,b) => b.date.seconds - a.date.seconds).map(log => (
                                    <TableRow key={log.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                                        <TableCell className="pl-8 py-5">
                                            <p className="text-sm font-bold text-white/80">{format(log.date.toDate(), 'MMMM dd, yyyy')}</p>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={cn(
                                                "text-[8px] font-black uppercase px-2 h-5",
                                                log.status === 'present' || log.status === 'holiday' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                                                log.status === 'half-day' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                "bg-red-500/10 text-red-400 border-red-500/20"
                                            )}>
                                                {log.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs font-black text-white/60">
                                                {log.status === 'present' || log.status === 'holiday' ? '1.0' : log.status === 'half-day' ? '0.5' : '0.0'} Node
                                            </span>
                                        </TableCell>
                                        <TableCell className="pr-8 text-right">
                                            <p className="text-[10px] text-white/30 italic">{log.reason || 'Verified Automated Log'}</p>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

function StatCard({ title, value, color, icon: Icon }: { title: string, value: any, color: string, icon: any }) {
    return (
        <Card className="bg-white/[0.02] border-white/5 p-5 rounded-3xl relative overflow-hidden group hover:bg-white/[0.04] transition-all">
            <div className="flex justify-between items-start relative z-10">
                <div className="space-y-4">
                    <p className="text-[9px] font-black uppercase tracking-[3px] text-white/20">{title}</p>
                    <p className={cn("text-2xl font-black tracking-tighter", color)}>{value}</p>
                </div>
                <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center bg-white/5 border border-white/5", color)}>
                    <Icon size={18} />
                </div>
            </div>
        </Card>
    );
}
