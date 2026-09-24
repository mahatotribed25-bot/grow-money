'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Home,
  ArrowLeft,
  Menu,
  Briefcase,
  FileText,
  Download,
  Upload,
  FileCheck,
  HandCoins,
  IndianRupee,
  ShieldCheck,
  UserCircle,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useUser, useCollection, useDoc } from '@/firebase';
import { useEffect, useMemo } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Timer } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const ADMIN_EMAILS = ['admin@tribed.world', 'admin@tribed.com'];

type UserPermissions = {
    canManageDeposits?: boolean;
    canManageWithdrawals?: boolean;
    canManageKyc?: boolean;
    canManagePlanLoans?: boolean;
    canManageCustomLoans?: boolean;
}

type UserData = {
    role?: 'user' | 'subadmin';
    email?: string;
    permissions?: UserPermissions;
    name?: string;
}

type BaseRequest = {
  id: string;
  createdAt: Timestamp;
};

type DepositRequest = BaseRequest & { name: string };
type WithdrawalRequest = BaseRequest & { name: string };
type LoanRequest = BaseRequest & { userName: string };
type KycRequest = { id: string, name: string, kycSubmissionDate: Timestamp };
type CustomLoanRequest = BaseRequest & { userName: string, status: string };


export default function SubAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: userLoading } = useUser();
  const { data: userData, loading: userDataLoading } = useDoc<UserData>(user ? `users/${user.uid}` : null);
  
  const loading = userLoading || userDataLoading;
  const permissions = userData?.permissions;
  const isAuthorized = userData && (userData.role === 'subadmin' || (userData.email && ADMIN_EMAILS.includes(userData.email.toLowerCase())));

  const { data: pendingDeposits } = useCollection<DepositRequest>(
    isAuthorized && permissions?.canManageDeposits ? 'deposits' : null, 
    { where: ['status', '==', 'pending'] }
  );
  const { data: pendingWithdrawals } = useCollection<WithdrawalRequest>(
    isAuthorized && permissions?.canManageWithdrawals ? 'withdrawals' : null,
    { where: ['status', '==', 'pending'] }
  );
  const { data: pendingLoanRequests } = useCollection<LoanRequest>(
    isAuthorized && permissions?.canManagePlanLoans ? 'loanRequests' : null,
    { where: ['status', '==', 'pending'] }
  );
   const { data: pendingKycRequests } = useCollection<KycRequest>(
    isAuthorized && permissions?.canManageKyc ? 'users' : null,
    { where: ['kycStatus', '==', 'Pending'] }
  );
  const { data: pendingCustomLoanRequests } = useCollection<CustomLoanRequest>(
    isAuthorized && permissions?.canManageCustomLoans ? 'customLoanRequests' : null,
    { where: ['status', 'in', ['pending_admin_review', 'extension_pending']] }
  );


  const notifications = useMemo(() => {
    if (!isAuthorized) return [];
    
    const customLoanNotifs = pendingCustomLoanRequests?.map(c => ({
        ...c,
        type: c.status === 'extension_pending' ? 'Loan Extension' : 'Custom Loan',
        link: '/subadmin/custom-loans',
        name: c.userName,
    })) || [];

    return [
       ...(pendingDeposits?.map((d) => ({ ...d, type: 'Deposit', link: '/subadmin/deposits', name: d.name })) || []),
       ...(pendingWithdrawals?.map((w) => ({...w, type: 'Withdrawal', link: '/subadmin/withdrawals', name: w.name })) || []),
       ...(pendingLoanRequests?.map((l) => ({ ...l, type: 'Loan', link: '/subadmin/loans', name: l.userName })) || []),
       ...(pendingKycRequests?.map(k => ({ id: k.id, type: 'KYC', link: '/subadmin/kyc-requests', name: k.name, createdAt: k.kycSubmissionDate, })) || []),
       ...customLoanNotifs,
    ].filter(n => n.createdAt).sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
  }, [isAuthorized, pendingDeposits, pendingWithdrawals, pendingLoanRequests, pendingKycRequests, pendingCustomLoanRequests]);

  const notificationCount = notifications.length;

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !isAuthorized) router.push('/dashboard');
  }, [user, isAuthorized, loading, router]);


  if (loading || !isAuthorized) {
    return <div className="flex min-h-screen w-full items-center justify-center bg-background"><Timer className="animate-spin text-primary" /></div>;
  }

  const navLinks = [
    { href: "/subadmin/custom-loans", icon: FileText, label: "Custom Loans", permission: permissions?.canManageCustomLoans, count: pendingCustomLoanRequests?.length },
    { href: "/subadmin/kyc-requests", icon: FileCheck, label: "KYC Requests", permission: permissions?.canManageKyc, count: pendingKycRequests?.length },
    { href: "/subadmin/loans", icon: HandCoins, label: "Loan Requests", permission: permissions?.canManagePlanLoans, count: pendingLoanRequests?.length },
    { href: "/subadmin/attendance", icon: Calendar, label: "My Attendance", permission: true },
    { href: "/subadmin/deposits", icon: Upload, label: "Deposits", permission: permissions?.canManageDeposits, count: pendingDeposits?.length },
    { href: "/subadmin/withdrawals", icon: Download, label: "Withdrawals", permission: permissions?.canManageWithdrawals, count: pendingWithdrawals?.length },
  ].filter(link => (userData?.email && ADMIN_EMAILS.includes(userData.email.toLowerCase())) || link.permission);


  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr] bg-background">
      <aside className="hidden border-r border-white/5 bg-black/40 backdrop-blur-xl md:block">
        <div className="flex h-full max-h-screen flex-col">
          <div className="flex h-20 items-center px-6 gap-3 border-b border-white/5">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-lg border border-primary/20">
                <Briefcase size={22} />
            </div>
            <span className="font-black text-lg tracking-tighter uppercase text-white">Staff Node</span>
          </div>
          
          <div className="flex-1 px-4 py-8 space-y-8 overflow-y-auto custom-scrollbar">
            <nav className="space-y-1.5">
                <div className="text-[10px] font-black text-white/10 uppercase tracking-[4px] mb-4 px-4">Authorized Modules</div>
                {navLinks.map(link => (
                    <AdminNavItem key={link.href} icon={link.icon} href={link.href} count={link.count}>
                        {link.label}
                    </AdminNavItem>
                ))}
            </nav>
            
            <nav className="space-y-1.5 pt-4">
                <div className="text-[10px] font-black text-white/10 uppercase tracking-[4px] mb-4 px-4">My Dashboard</div>
                <AdminNavItem icon={UserCircle} href="/profile">Personal Profile</AdminNavItem>
            </nav>
          </div>

          <div className="p-6 border-t border-white/5">
            <Button variant="outline" className="w-full h-12 rounded-2xl border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10" asChild>
              <Link href="/dashboard"><ArrowLeft className="mr-3 h-4 w-4" /> User Portal</Link>
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex flex-col min-w-0">
        <header className="h-20 flex items-center justify-between px-8 border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-40">
          <div className="flex items-center gap-4 flex-1">
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden text-white/60">
                        <Menu size={24} />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 border-r border-white/5 bg-background w-[300px]">
                    <div className="h-full flex flex-col">
                        <div className="h-20 flex items-center px-8 border-b border-white/5"><span className="font-black text-lg uppercase">Staff Menu</span></div>
                        <nav className="flex-1 py-8 px-4 space-y-1.5">
                            {navLinks.map(link => (
                                <AdminNavItem key={link.href} icon={link.icon} href={link.href} count={link.count}>{link.label}</AdminNavItem>
                            ))}
                            <div className="pt-8"><AdminNavItem icon={UserCircle} href="/profile">My Profile</AdminNavItem></div>
                        </nav>
                    </div>
                </SheetContent>
            </Sheet>
            <div className="hidden sm:block">
                <h1 className="text-xl font-black uppercase tracking-tight text-white/90">
                    {pathname.split('/').pop()?.replace('-', ' ') || 'Overview'}
                </h1>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex flex-col items-end">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Active Node</p>
                <p className="text-xs font-black text-white/80">{userData?.name || 'Authorized Staff'}</p>
            </div>
            
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-12 w-12 rounded-2xl bg-white/5 border border-white/10">
                        <Bell className="h-5 w-5 text-white/60" />
                        {notificationCount > 0 && <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-primary animate-pulse" />}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-[#0a0b14] border-white/10 p-0 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="p-5 border-b border-white/5 bg-white/5 flex justify-between items-center">
                        <h4 className="font-black text-[10px] uppercase tracking-widest">Pipeline Alerts</h4>
                        <Badge className="bg-primary/20 text-primary border-primary/20 text-[9px]">{notificationCount}</Badge>
                    </div>
                    <ScrollArea className="max-h-[350px]">
                        {notificationCount > 0 ? (
                            notifications.map(n => (
                                <Link key={n.id} href={n.link} className="flex flex-col p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <p className="text-[11px] font-black text-white/80 uppercase">New {n.type}</p>
                                    <p className="text-[10px] text-white/20 font-bold mt-0.5">{n.name}</p>
                                </Link>
                            ))
                        ) : <div className="p-10 text-center text-[10px] uppercase font-black text-white/10">All Nodes Clear</div>}
                    </ScrollArea>
                </PopoverContent>
            </Popover>

            <Avatar className="h-11 w-11 rounded-xl border border-white/10 p-0.5">
                <AvatarImage src={user?.photoURL || undefined} className="rounded-[9px]" />
                <AvatarFallback className="bg-white/5 text-primary text-xs font-black">{userData?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 custom-scrollbar relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/40 to-transparent" />
          {children}
        </main>
      </div>
    </div>
  );
}

function AdminNavItem({ href, icon: Icon, children, count }: { href: string; icon: any; children: React.ReactNode; count?: number }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between h-12 px-4 rounded-2xl transition-all group",
        isActive 
            ? "bg-primary/20 text-primary border border-primary/10 shadow-lg" 
            : "text-white/40 hover:text-white hover:bg-white/5"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} className={cn("transition-transform group-hover:scale-110", isActive ? "text-primary" : "text-white/20")} />
        <span className={cn("text-[11px] font-black uppercase tracking-widest", isActive ? "text-white" : "")}>{children}</span>
      </div>
      {count !== undefined && count > 0 && (
          <Badge className="bg-primary/20 text-primary border-primary/20 text-[8px] font-black h-5 px-1.5 min-w-[20px] justify-center">{count}</Badge>
      )}
    </Link>
  );
}
