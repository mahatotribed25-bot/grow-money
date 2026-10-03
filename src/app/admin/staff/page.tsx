'use client';

import { useCollection, useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, User, Search, Eye, ShieldAlert, Timer, Settings2, BarChart3, Activity, HandCoins, CheckSquare, CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type UserPermissions = {
    canManageDeposits?: boolean;
    canManageWithdrawals?: boolean;
    canManageKyc?: boolean;
    canManagePlanLoans?: boolean;
    canManageCustomLoans?: boolean;
    canManageMarket?: boolean;
}

type StaffUser = {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  role: string;
  permissions?: UserPermissions;
};

type ActionLog = {
    id: string;
    reviewedBy: string;
    status: string;
}

export default function StaffManagementPage() {
    const { data: staffMembers, loading: staffLoading } = useCollection<StaffUser>('users', { where: ['role', '==', 'subadmin'] });
    const { data: deposits } = useCollection<ActionLog>('deposits');
    const { data: withdrawals } = useCollection<ActionLog>('withdrawals');
    
    const [searchQuery, setSearchQuery] = useState('');

    const filteredStaff = useMemo(() => {
        return staffMembers?.filter(s => 
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            s.email.toLowerCase().includes(searchQuery.toLowerCase())
        ) || [];
    }, [staffMembers, searchQuery]);

    const getStaffStats = (staffId: string) => {
        const approvedDeposits = deposits?.filter(d => d.reviewedBy === staffId).length || 0;
        const approvedWithdrawals = withdrawals?.filter(w => w.reviewedBy === staffId).length || 0;
        return { totalActions: approvedDeposits + approvedWithdrawals };
    };

    const getActivePermissionsCount = (permissions?: UserPermissions) => {
        if (!permissions) return 0;
        return Object.values(permissions).filter(p => p === true).length;
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Staff Registry</h2>
                    <p className="text-[10px] font-black uppercase text-white/20 tracking-[4px]">Access Control & Monitoring</p>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                    <Input 
                        placeholder="Search staff members..." 
                        className="pl-10 bg-white/5 border-white/10 rounded-xl h-11 focus:ring-primary"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <Card className="bg-white/[0.02] border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><ShieldCheck size={80}/></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-lg border border-primary/20">
                            <ShieldCheck size={24}/>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Active Staff</p>
                            <p className="text-2xl font-black text-white">{staffMembers?.length || 0} Nodes</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-white/[0.02] border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Activity size={80}/></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="h-12 w-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 shadow-lg border border-blue-500/20">
                            <Activity size={24}/>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Protocol Throughput</p>
                            <p className="text-2xl font-black text-white">Live Monitoring</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-white/[0.02] border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><HandCoins size={80}/></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="h-12 w-12 rounded-2xl bg-green-500/20 flex items-center justify-center text-green-400 shadow-lg border border-green-500/20">
                            <HandCoins size={24}/>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">System Integrity</p>
                            <p className="text-2xl font-black text-white">99.9% Secured</p>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="bg-white/[0.02] border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
                <CardHeader className="bg-white/[0.01] border-b border-white/[0.05] p-6">
                    <CardTitle className="text-sm font-black uppercase tracking-[3px] text-white/40 flex items-center gap-2">
                        <ShieldAlert size={16} className="text-primary" /> Personnel Efficiency Hub
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-white/[0.02]">
                            <TableRow className="border-white/10">
                                <TableHead className="text-[10px] font-black uppercase text-white/20 pl-8 py-5">Personnel</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/20">Module Control</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/20 text-center">Protocol Actions</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/20 pr-8 text-right">Performance Node</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {staffLoading ? (
                                <TableRow className="border-transparent">
                                    <TableCell colSpan={4} className="text-center py-20 font-black text-white/20 animate-pulse">SYNCING REGISTRY...</TableCell>
                                </TableRow>
                            ) : filteredStaff.length === 0 ? (
                                <TableRow className="border-transparent">
                                    <TableCell colSpan={4} className="text-center py-20 text-white/10 italic text-sm">No personnel found with staff privileges.</TableCell>
                                </TableRow>
                            ) : (
                                filteredStaff.map((staff) => {
                                    const stats = getStaffStats(staff.id);
                                    return (
                                        <TableRow key={staff.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                                            <TableCell className="pl-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 border border-white/10 rounded-xl">
                                                        <AvatarImage src={staff.photoURL} />
                                                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black uppercase">
                                                            {staff.name?.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="text-sm font-bold text-white/80">{staff.name}</p>
                                                        <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">{staff.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                    {staff.permissions?.canManageKyc && <PermissionBadge label="KYC" />}
                                                    {staff.permissions?.canManageDeposits && <PermissionBadge label="DEPOSITS" />}
                                                    {staff.permissions?.canManageWithdrawals && <PermissionBadge label="PAYOUTS" />}
                                                    {staff.permissions?.canManagePlanLoans && <PermissionBadge label="LOANS" />}
                                                    {staff.permissions?.canManageCustomLoans && <PermissionBadge label="FLEXI" />}
                                                    {staff.permissions?.canManageMarket && <PermissionBadge label="MARKET" />}
                                                    {getActivePermissionsCount(staff.permissions) === 0 && (
                                                        <span className="text-[8px] font-bold text-white/10 uppercase tracking-widest">Standard Access</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-black text-white">{stats.totalActions}</span>
                                                    <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Validations</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="pr-8 text-right">
                                                <Button asChild variant="ghost" size="sm" className="h-9 px-4 rounded-xl border border-white/5 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                                                    <Link href={`/admin/users/${staff.id}`}><Eye size={14} className="mr-2" /> Audit Node</Link>
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
                <Card className="p-8 bg-white/[0.02] border border-white/5 rounded-[2rem] flex flex-col justify-between gap-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:scale-110 transition-transform duration-1000">
                        <CheckSquare size={200} />
                    </div>
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-lg border border-primary/20">
                            <BarChart3 size={24} />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Accountability Engine</h3>
                        <p className="text-xs text-white/40 leading-relaxed font-medium">
                            Every approval node in the system (Deposits, Withdrawals, KYC) is now tagged with the staff member's Protocol ID. This creates a transparent audit trail for the Super Admin.
                        </p>
                    </div>
                    <Button variant="outline" className="w-fit h-10 px-6 rounded-xl border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest hover:bg-white/10">
                        View Audit Logs
                    </Button>
                </Card>

                <div className="p-8 bg-primary/5 border border-primary/10 rounded-[2rem] flex flex-col justify-center gap-6 shadow-2xl">
                    <div className="flex items-center gap-4">
                         <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-xl border border-primary/20">
                            <CalendarDays size={28} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Dynamic Roster Control</h3>
                            <p className="text-[10px] font-black text-primary uppercase tracking-[3px]">Payroll Sync Active</p>
                        </div>
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed font-medium">
                        Staff salaries are calculated pro-rata based on the attendance registry. Use the **Bulk Protocol Update** in the Attendance Board to manage entire departments or team leaves simultaneously.
                    </p>
                    <Button asChild className="w-full h-12 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-primary hover:text-white transition-all">
                        <Link href="/admin/attendance">Open Attendance Board</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

function PermissionBadge({ label }: { label: string }) {
    return (
        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[7px] font-black text-white/40 uppercase tracking-tighter hover:text-white transition-colors">
            {label}
        </span>
    );
}