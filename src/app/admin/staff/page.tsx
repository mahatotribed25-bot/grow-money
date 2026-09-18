
'use client';

import { useCollection, useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, User, Search, Eye, ShieldAlert, Timer, Settings2 } from 'lucide-react';
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

export default function StaffManagementPage() {
    const { data: staffMembers, loading } = useCollection<StaffUser>('users', { where: ['role', '==', 'subadmin'] });
    const [searchQuery, setSearchQuery] = useState('');

    const filteredStaff = useMemo(() => {
        return staffMembers?.filter(s => 
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            s.email.toLowerCase().includes(searchQuery.toLowerCase())
        ) || [];
    }, [staffMembers, searchQuery]);

    const getActivePermissionsCount = (permissions?: UserPermissions) => {
        if (!permissions) return 0;
        return Object.values(permissions).filter(p => p === true).length;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Staff Registry</h2>
                    <p className="text-[10px] font-black uppercase text-white/20 tracking-[4px]">Access Control & Roles</p>
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
                 <Card className="bg-white/[0.02] border-white/5 rounded-3xl p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                            <ShieldCheck size={24}/>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Total Staff</p>
                            <p className="text-2xl font-black text-white">{staffMembers?.length || 0}</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-white/[0.02] border-white/5 rounded-3xl p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                            <Settings2 size={24}/>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Delegated Nodes</p>
                            <p className="text-2xl font-black text-white">Active Access</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-white/[0.02] border-white/5 rounded-3xl p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-green-500/20 flex items-center justify-center text-green-400">
                            <User size={24}/>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">System Integrity</p>
                            <p className="text-2xl font-black text-white">99.8%</p>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="bg-white/[0.02] border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
                <CardHeader className="bg-white/[0.01] border-b border-white/[0.05] p-6">
                    <CardTitle className="text-sm font-black uppercase tracking-[3px] text-white/40 flex items-center gap-2">
                        <ShieldAlert size={16} className="text-primary" /> Active Staff Nodes
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-white/[0.02]">
                            <TableRow className="border-white/10">
                                <TableHead className="text-[10px] font-black uppercase text-white/20 pl-8 py-5">Personnel</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/20">Access Tier</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/20">Module Control</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/20 pr-8 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow className="border-transparent">
                                    <TableCell colSpan={4} className="text-center py-20">
                                        <Timer className="animate-spin h-6 w-6 text-primary mx-auto mb-2" />
                                        <p className="text-[10px] font-black uppercase text-white/20 tracking-widest">Accessing Registry...</p>
                                    </TableCell>
                                </TableRow>
                            ) : filteredStaff.length === 0 ? (
                                <TableRow className="border-transparent">
                                    <TableCell colSpan={4} className="text-center py-20 text-white/10 italic text-sm">No personnel found with staff privileges.</TableCell>
                                </TableRow>
                            ) : (
                                filteredStaff.map((staff) => (
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
                                            <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 text-[8px] font-black uppercase px-2 h-5">
                                                {staff.role.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {staff.permissions?.canManageKyc && <PermissionBadge label="KYC" />}
                                                {staff.permissions?.canManageDeposits && <PermissionBadge label="DEPOSITS" />}
                                                {staff.permissions?.canManageWithdrawals && <PermissionBadge label="PAYOUTS" />}
                                                {staff.permissions?.canManagePlanLoans && <PermissionBadge label="LOANS" />}
                                                {staff.permissions?.canManageCustomLoans && <PermissionBadge label="CUSTOM" />}
                                                {staff.permissions?.canManageMarket && <PermissionBadge label="MARKET" />}
                                                {getActivePermissionsCount(staff.permissions) === 0 && (
                                                    <span className="text-[9px] font-bold text-white/10 uppercase tracking-widest">No active permissions</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="pr-8 text-right">
                                            <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white/5 text-white/40 hover:text-primary">
                                                <Link href={`/admin/users/${staff.id}`}><Eye size={16} /></Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="p-6 bg-primary/5 border border-primary/10 rounded-3xl flex items-center gap-4">
                <ShieldAlert className="text-primary h-6 w-6 shrink-0" />
                <p className="text-xs text-white/60 leading-relaxed font-medium">
                    <strong className="text-white uppercase font-black tracking-widest block mb-1">Administrative Note:</strong>
                    To promote a user to staff or adjust their permissions, go to the "Investors" list, view the specific user profile, and use the "Permissions Node" section to authorize their access.
                </p>
            </div>
        </div>
    );
}

function PermissionBadge({ label }: { label: string }) {
    return (
        <span className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-[7px] font-black text-white/40 uppercase tracking-tighter group-hover:text-white transition-colors">
            {label}
        </span>
    );
}
