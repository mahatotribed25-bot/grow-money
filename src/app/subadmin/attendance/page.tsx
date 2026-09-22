
'use client';

import { useMemo, useState } from 'react';
import { useCollection, useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, CheckCircle2, XCircle, Timer, Info, Calculator, User } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Timestamp, orderBy } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

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

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function SubAdminAttendancePage() {
    const { user } = useUser();
    const [selectedMonth, setSelectedMonth] = useState(months[new Date().getMonth()]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">My Work Log</h2>
                    <p className="text-[10px] font-black uppercase text-white/20 tracking-[4px]">Attendance Records</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-3">
                        <CalendarIcon size={14} className="text-primary" />
                        <span className="text-xs font-bold text-white/70">{selectedMonth} {selectedYear}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="Full Days" value={stats.present + stats.holiday} color="text-green-400" icon={CheckCircle2} />
                <StatCard title="Half Days" value={stats.halfDay} color="text-blue-400" icon={Timer} />
                <StatCard title="Absences" value={stats.absent} color="text-red-400" icon={XCircle} />
                <StatCard title="Total Credit" value={`${stats.totalCredit} / ${daysInMonth}`} color="text-primary" icon={Calculator} />
            </div>

            <Card className="bg-white/[0.02] border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5"><CalendarIcon size={120} className="text-white" /></div>
                <CardHeader className="p-0 mb-8">
                    <CardTitle className="text-sm font-black uppercase tracking-[3px] text-white/40">Efficiency Summary</CardTitle>
                </CardHeader>
                <div className="space-y-6 relative z-10">
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/20">
                            <span>Month Completion</span>
                            <span>{Math.round((stats.totalCredit / daysInMonth) * 100)}%</span>
                        </div>
                        <Progress value={(stats.totalCredit / daysInMonth) * 100} className="h-2" />
                    </div>
                    <p className="text-xs text-white/40 italic leading-relaxed">
                        Note: Your final salary will be calculated based on the total credit days shown above. Holiday credits are included in the payout calculation.
                    </p>
                </div>
            </Card>

            <Card className="bg-white/[0.02] border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
                <CardHeader className="bg-white/[0.01] border-b border-white/[0.05] p-6">
                    <CardTitle className="text-sm font-black uppercase tracking-[3px] text-white/40 flex items-center gap-2">
                        <Info size={16} className="text-primary" /> Log History
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-white/[0.02]">
                            <TableRow className="border-white/10">
                                <TableHead className="text-[10px] font-black uppercase text-white/20 pl-8 py-5">Work Date</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/20">System Status</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/20 pr-8 text-right">Admin Notes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={3} className="text-center py-20 opacity-20 italic">Loading Registry...</TableCell></TableRow>
                            ) : myLogs?.length === 0 ? (
                                <TableRow><TableCell colSpan={3} className="text-center py-20 text-white/10 italic">No attendance logs found for your account.</TableCell></TableRow>
                            ) : (
                                myLogs?.sort((a,b) => b.date.seconds - a.date.seconds).map(log => (
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
                                        <TableCell className="pr-8 text-right">
                                            <p className="text-[10px] text-white/30 italic">{log.reason || '-'}</p>
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
