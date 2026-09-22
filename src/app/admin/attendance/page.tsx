'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Calendar as CalendarIcon, 
    CheckCircle2, 
    XCircle, 
    Timer, 
    MoreVertical, 
    User,
    Search,
    Clock,
    ShieldCheck,
    AlertCircle
} from 'lucide-react';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter, 
    DialogClose,
    DialogDescription
} from '@/components/ui/dialog';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, setDoc, deleteDoc, Timestamp, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

type StaffMember = {
    id: string;
    name: string;
    email: string;
    photoURL?: string;
}

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

export default function AdminAttendancePage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [selectedMonth, setSelectedMonth] = useState(months[new Date().getMonth()]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchQuery, setSearchQuery] = useState('');

    const { data: staffMembers, loading: staffLoading } = useCollection<StaffMember>('users', { where: ['role', '==', 'subadmin'] });
    const { data: allLogs, loading: logsLoading } = useCollection<AttendanceLog>('attendance', undefined, orderBy('date', 'desc'));

    const [isLogOpen, setIsLogOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
    const [logStatus, setLogStatus] = useState<'present' | 'absent' | 'half-day' | 'holiday'>('present');
    const [logReason, setReason] = useState('');
    const [logDate, setLogDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const filteredStaff = useMemo(() => {
        return staffMembers?.filter(s => 
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            s.email.toLowerCase().includes(searchQuery.toLowerCase())
        ) || [];
    }, [staffMembers, searchQuery]);

    const handleSaveAttendance = async () => {
        if (!selectedStaff) return;

        const dateObj = new Date(logDate);
        dateObj.setHours(0, 0, 0, 0);

        // Check if log already exists for this day/user
        const existing = allLogs?.find(l => l.userId === selectedStaff.id && isSameDay(l.date.toDate(), dateObj));
        
        const logData = {
            userId: selectedStaff.id,
            userName: selectedStaff.name,
            date: Timestamp.fromDate(dateObj),
            status: logStatus,
            reason: logReason,
            month: months[dateObj.getMonth()],
            year: dateObj.getFullYear(),
            updatedAt: serverTimestamp()
        };

        try {
            if (existing) {
                await setDoc(doc(firestore, 'attendance', existing.id), logData, { merge: true });
            } else {
                await addDoc(collection(firestore, 'attendance'), logData);
            }
            toast({ title: "Attendance Updated", description: `Record saved for ${selectedStaff.name} on ${logDate}.` });
            setIsLogOpen(false);
            setReason('');
        } catch (e) {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const getAttendanceStats = (userId: string) => {
        const monthLogs = allLogs?.filter(l => 
            l.userId === userId && 
            l.month === selectedMonth && 
            l.year === selectedYear
        ) || [];

        const present = monthLogs.filter(l => l.status === 'present').length;
        const halfDay = monthLogs.filter(l => l.status === 'half-day').length;
        const absent = monthLogs.filter(l => l.status === 'absent').length;
        const holiday = monthLogs.filter(l => l.status === 'holiday').length;

        return { present, halfDay, absent, holiday, totalCredit: present + holiday + (halfDay * 0.5) };
    };

    const loading = staffLoading || logsLoading;

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Attendance Board</h2>
                    <p className="text-[10px] font-black uppercase text-white/20 tracking-[4px]">Daily Staff Tracking</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[140px] bg-white/5 border-white/10 rounded-xl h-11 text-xs font-bold uppercase">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#030408] border-white/10">
                            {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                        <Input 
                            placeholder="Search staff..." 
                            className="pl-10 bg-white/5 border-white/10 rounded-xl h-11 focus:ring-primary"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <Card className="bg-white/[0.02] border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
                <CardHeader className="bg-white/[0.01] border-b border-white/[0.05] p-6">
                    <CardTitle className="text-sm font-black uppercase tracking-[3px] text-white/40 flex items-center gap-2">
                        <CalendarIcon size={16} className="text-primary" /> Monthly Summary: {selectedMonth} {selectedYear}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-white/[0.02]">
                            <TableRow className="border-white/10">
                                <TableHead className="text-[10px] font-black uppercase text-white/20 pl-8 py-5">Personnel</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/20 text-center">Present</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/20 text-center">Half-Day</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/20 text-center">Absent</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/20 text-center">Credit Days</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/20 pr-8 text-right">Log Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-20 opacity-20 italic">Syncing Rosters...</TableCell></TableRow>
                            ) : filteredStaff.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-20 text-white/10 italic">No staff nodes detected.</TableCell></TableRow>
                            ) : (
                                filteredStaff.map((staff) => {
                                    const stats = getAttendanceStats(staff.id);
                                    return (
                                        <TableRow key={staff.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                                            <TableCell className="pl-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9 border border-white/10">
                                                        <AvatarImage src={staff.photoURL} />
                                                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black">{staff.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="text-sm font-bold text-white/80">{staff.name}</p>
                                                        <p className="text-[8px] text-white/20 font-black uppercase tracking-widest">{staff.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px] font-bold">{stats.present + stats.holiday}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] font-bold">{stats.halfDay}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] font-bold">{stats.absent}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-sm font-black text-white">{stats.totalCredit} Days</span>
                                            </TableCell>
                                            <TableCell className="pr-8 text-right">
                                                <Button 
                                                    onClick={() => { setSelectedStaff(staff); setIsLogOpen(true); }}
                                                    className="h-8 px-4 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10"
                                                >
                                                    Update Status
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-white/[0.02] border-white/5 rounded-[2rem] p-6 shadow-xl">
                    <CardTitle className="text-sm font-black uppercase tracking-[3px] text-white/40 mb-6 flex items-center gap-2">
                        <AlertCircle size={16} /> Recent Absence Notes
                    </CardTitle>
                    <ScrollArea className="h-64">
                        <div className="space-y-3">
                            {allLogs?.filter(l => l.status === 'absent' || l.status === 'half-day').slice(0, 10).map(log => (
                                <div key={log.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-start gap-4">
                                    <div className={cn(
                                        "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border",
                                        log.status === 'absent' ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                                    )}>
                                        <XCircle size={14} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white/80">{log.userName} • {format(log.date.toDate(), 'MMM dd')}</p>
                                        <p className="text-[10px] text-white/30 italic mt-1">"{log.reason || 'No reason provided'}"</p>
                                    </div>
                                </div>
                            ))}
                            {allLogs?.filter(l => l.status === 'absent' || l.status === 'half-day').length === 0 && <p className="text-center py-10 text-[10px] uppercase font-black text-white/10">No recent absences</p>}
                        </div>
                    </ScrollArea>
                </Card>

                <div className="p-6 bg-primary/5 border border-primary/10 rounded-[2rem] flex flex-col justify-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
                        <ShieldCheck size={24} />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Integrity Tracking</h3>
                    <p className="text-xs text-white/50 leading-relaxed font-medium">
                        Daily attendance logs are used to calculate the **Pro-Rata Salary** at the end of the month. Ensure all staff logs are updated before issuing payroll to prevent calculation discrepancies.
                    </p>
                </div>
            </div>

            <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
                <DialogContent className="bg-[#030408]/90 backdrop-blur-2xl border-white/10 text-white rounded-[2rem] max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase tracking-tight">Mark Attendance</DialogTitle>
                        <DialogDescription className="text-white/40">Log daily work status for {selectedStaff?.name}.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5 py-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-white/40 ml-1">Work Date</Label>
                            <Input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-white/40 ml-1">Status Node</Label>
                            <Select value={logStatus} onValueChange={(v: any) => setLogStatus(v)}>
                                <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#030408] border-white/10">
                                    <SelectItem value="present">Present (Full Credit)</SelectItem>
                                    <SelectItem value="half-day">Half-Day (0.5 Credit)</SelectItem>
                                    <SelectItem value="absent">Absent (No Credit)</SelectItem>
                                    <SelectItem value="holiday">Holiday (Paid)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-white/40 ml-1">Reason / Note (Optional)</Label>
                            <Input value={logReason} onChange={e => setReason(e.target.value)} placeholder="e.g. Sick leave, personal work" className="bg-white/5 border-white/10 h-12 rounded-xl" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveAttendance} className="w-full h-14 rounded-2xl bg-primary text-white font-black shadow-xl shadow-primary/20">
                            Commit Log Entry
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
