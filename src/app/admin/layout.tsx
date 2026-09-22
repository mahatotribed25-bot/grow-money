
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Home,
  Users,
  LogOut,
  Settings,
  Briefcase,
  Download,
  Upload,
  Megaphone,
  HandCoins,
  FileCheck,
  Handshake,
  Gift,
  FileText,
  MessageSquare,
  IndianRupee,
  Search,
  LayoutGrid,
  Menu,
  CheckCircle2,
  ArrowUpRight,
  BellRing,
  TrendingUp,
  Users2,
  ClipboardCheck,
  FileStack,
  Zap,
  Smartphone,
  ShieldCheck,
  Landmark,
  Hammer,
  ShieldAlert,
  Coins,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth, useUser, useCollection } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const ADMIN_EMAILS = ['admin@tribed.world', 'admin@tribed.com'];

type BaseRequest = {
  id: string;
  createdAt: Timestamp;
};

type DepositRequest = BaseRequest & { name: string };
type WithdrawalRequest = BaseRequest & { name: string };
type KycRequest = { id: string, name: string, kycSubmissionDate: Timestamp };
type UpiRequest = BaseRequest & { userName: string };
type CustomLoanRequest = BaseRequest & { userName: string, status: string };
type TaskSubmission = BaseRequest & { status: string };
type StandardLoanRequest = BaseRequest & { userName: string, status: string };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useUser();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  const isAdmin = useMemo(() => {
      const email = user?.email?.toLowerCase();
      return !loading && email && ADMIN_EMAILS.includes(email);
  }, [user, loading]);

  const { data: pendingDeposits } = useCollection<DepositRequest>(isAdmin ? 'deposits' : null, { where: ['status', '==', 'pending'] });
  const { data: pendingWithdrawals } = useCollection<WithdrawalRequest>(isAdmin ? 'withdrawals' : null, { where: ['status', '==', 'pending'] });
  const { data: pendingKycRequests } = useCollection<KycRequest>(isAdmin ? 'users' : null, { where: ['kycStatus', '==', 'Pending'] });
  const { data: pendingUpiRequests } = useCollection<UpiRequest>(isAdmin ? 'upiRequests' : null, { where: ['status', '==', 'pending'] });
  const { data: pendingCustomLoanRequests } = useCollection<CustomLoanRequest>(isAdmin ? 'customLoanRequests' : null, { where: ['status', 'in', ['pending_admin_review', 'extension_pending']] });
  const { data: pendingSubmissions } = useCollection<TaskSubmission>(isAdmin ? 'taskSubmissions' : null, { where: ['status', '==', 'pending'] });
  const { data: pendingStandardLoans } = useCollection<StandardLoanRequest>(isAdmin ? 'loanRequests' : null, { where: ['status', '==', 'pending'] });

  const notifications = useMemo(() => {
    if (!isAdmin) return [];
    return [
      ...(pendingDeposits?.map((d) => ({ ...d, type: 'Deposit', link: '/admin/deposits', name: d.name })) || []),
      ...(pendingWithdrawals?.map((w) => ({ ...w, type: 'Withdrawal', link: '/admin/withdrawals', name: w.name })) || []),
      ...(pendingKycRequests?.map(k => ({ id: k.id, type: 'KYC', link: '/admin/kyc-requests', name: k.name, createdAt: k.kycSubmissionDate })) || []),
      ...(pendingUpiRequests?.map((u) => ({ ...u, type: 'UPI', link: '/admin/upi-requests', name: u.userName })) || []),
      ...(pendingCustomLoanRequests?.map(c => ({ ...c, type: 'Custom Loan', link: '/admin/custom-loans', name: c.userName })) || []),
    ].filter(n => n.createdAt).sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
  }, [isAdmin, pendingDeposits, pendingWithdrawals, pendingKycRequests, pendingUpiRequests, pendingCustomLoanRequests]);

  const handleLogout = async () => { if (auth) { await signOut(auth); router.push('/admin/login'); } };

  useEffect(() => { if (!loading && pathname !== '/admin/login' && !isAdmin) router.push('/admin/login'); }, [isAdmin, loading, pathname, router]);

  if (loading) return <div className="flex h-screen w-full flex-col items-center justify-center bg-[#020306]"><div className="h-10 w-10 animate-spin border-4 border-primary border-t-transparent rounded-full shadow-[0_0_20px_rgba(139,92,246,0.5)]" /><p className="mt-4 text-[10px] font-black uppercase tracking-[5px] text-white/20">Loading Admin Portal</p></div>;
  if (pathname === '/admin/login' || !isAdmin) return pathname === '/admin/login' ? <>{children}</> : null;

  const NavContent = () => (
    <div className="flex flex-col h-full bg-[#020306] text-white">
        <div className="h-20 flex items-center px-8 gap-4 border-b border-white/[0.03]">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-lg border border-primary/20">
                <Briefcase size={22} />
            </div>
            <span className="font-black text-xl tracking-tighter">Grow Money</span>
        </div>
        <ScrollArea className="flex-1 px-4">
          <nav className="py-8 space-y-1.5">
            <div className="text-[10px] font-black text-white/10 uppercase tracking-[4px] mb-4 px-4">Main Dashboard</div>
            <AdminNavItem icon={Home} href="/admin">Overview</AdminNavItem>
            <AdminNavItem icon={IndianRupee} href="/admin/finance">Finance Hub</AdminNavItem>
            <AdminNavItem icon={Users} href="/admin/users">Investors</AdminNavItem>
            
            <div className="pt-6 pb-2 text-[10px] font-black text-white/10 uppercase tracking-[4px] px-4">Administrative</div>
            <AdminNavItem icon={ShieldAlert} href="/admin/staff">Staff Management</AdminNavItem>
            <AdminNavItem icon={Calendar} href="/admin/attendance">Attendance Record</AdminNavItem>
            <AdminNavItem icon={Coins} href="/admin/salaries">Payroll Hub</AdminNavItem>
            
            <div className="pt-6 pb-2 text-[10px] font-black text-white/10 uppercase tracking-[4px] px-4">Management</div>
            <AdminNavItem icon={TrendingUp} href="/admin/investment-plans">Manage Plans</AdminNavItem>
            <AdminNavItem icon={Users2} href="/admin/group-loans">Group Pools</AdminNavItem>
            <AdminNavItem icon={Hammer} href="/admin/loan-plans">Loan Setup</AdminNavItem>
            
            <div className="pt-6 pb-2 text-[10px] font-black text-white/10 uppercase tracking-[4px] px-4">Market & Tasks</div>
            <AdminNavItem icon={ClipboardCheck} href="/admin/tasks">Earn Tasks</AdminNavItem>
            <AdminNavItem icon={FileStack} href="/admin/task-submissions" count={pendingSubmissions?.length}>Work Submissions</AdminNavItem>
            <AdminNavItem icon={Handshake} href="/admin/p2p-loans">P2P Market</AdminNavItem>
            <AdminNavItem icon={Zap} href="/admin/custom-loans" count={pendingCustomLoanRequests?.length}>Flexible Loans</AdminNavItem>
            
            <div className="pt-6 pb-2 text-[10px] font-black text-white/10 uppercase tracking-[4px] px-4">Pending Approvals</div>
            <AdminNavItem icon={BellRing} href="/admin/reminders">Reminders</AdminNavItem>
            <AdminNavItem icon={Landmark} href="/admin/loans" count={pendingStandardLoans?.length}>Loan Requests</AdminNavItem>
            <AdminNavItem icon={FileCheck} href="/admin/kyc-requests" count={pendingKycRequests?.length}>KYC Checks</AdminNavItem>
            <AdminNavItem icon={Smartphone} href="/admin/upi-requests" count={pendingUpiRequests?.length}>UPI Registry</AdminNavItem>
            <AdminNavItem icon={Upload} href="/admin/deposits" count={pendingDeposits?.length}>Deposits</AdminNavItem>
            <AdminNavItem icon={Download} href="/admin/withdrawals" count={pendingWithdrawals?.length}>Withdrawals</AdminNavItem>
            
            <div className="pt-6 pb-2 text-[10px] font-black text-white/10 uppercase tracking-[4px] px-4">Communications</div>
            <AdminNavItem icon={Megaphone} href="/admin/announcements">News & Updates</AdminNavItem>
            <AdminNavItem icon={Gift} href="/admin/coupons">Gifts & Coupons</AdminNavItem>
            <AdminNavItem icon={MessageSquare} href="/admin/chat">Support Chat</AdminNavItem>
            <AdminNavItem icon={Settings} href="/admin/settings">Settings</AdminNavItem>
          </nav>
        </ScrollArea>
        <div className="p-6 border-t border-white/[0.03]">
            <Button variant="ghost" className="w-full justify-start rounded-2xl h-12 text-white/20 hover:text-red-400 hover:bg-red-400/5 transition-all" onClick={handleLogout}>
                <LogOut className="mr-3 h-4 w-4" /> 
                <span className="text-xs font-black uppercase tracking-widest">Logout</span>
            </Button>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#020306] text-white flex overflow-hidden">
      <aside className="hidden lg:flex flex-col w-[280px] bg-[#020306] border-r border-white/[0.03] relative z-20">
        <NavContent />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-[#05060f] relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-500 to-green-500 z-50" />
        
        <header className="h-20 flex items-center justify-between px-8 border-b border-white/[0.03] bg-[#020306]/60 backdrop-blur-3xl z-40 sticky top-0">
          <div className="flex items-center gap-6 flex-1">
             <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden text-white/60">
                        <Menu size={24} />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 border-r border-white/5 w-[300px]">
                    <SheetHeader>
                        <SheetTitle className="sr-only">Admin Navigation Menu</SheetTitle>
                    </SheetHeader>
                    <NavContent />
                </SheetContent>
             </Sheet>
             <div className="relative w-full max-w-md hidden md:block group">
                 <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
                 <Input placeholder="Search History..." className="bg-white/[0.03] border-white/5 h-12 w-full pl-12 rounded-2xl focus:ring-primary focus:bg-white/[0.05] text-xs font-black uppercase tracking-widest transition-all" />
             </div>
          </div>

          <div className="flex items-center gap-6">
             <div className="hidden sm:flex flex-col items-end">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Status</p>
                <p className="text-xs font-black text-white/80">Administrator</p>
             </div>
             
             <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/5">
                        <Bell className="h-5 w-5 text-white/60" />
                        {notifications.length > 0 && (
                            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_10px_#8b5cf6] border-2 border-[#020306] animate-pulse" />
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 bg-[#0a0b14] border-white/10 p-0 rounded-[2rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200">
                    <div className="p-6 border-b border-white/[0.03] flex justify-between items-center bg-white/[0.02]">
                        <h4 className="font-black text-[11px] uppercase tracking-[4px] text-primary">Alerts</h4>
                        <Badge className="bg-primary/20 text-primary border-primary/20 text-[9px]">{notifications.length}</Badge>
                    </div>
                    <ScrollArea className="max-h-[400px]">
                        {notifications.length > 0 ? (
                            notifications.map(n => (
                                <Link key={n.id} href={n.link} className="flex items-center gap-4 p-5 border-b border-white/[0.03] hover:bg-white/[0.03] transition-all group">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform border border-primary/10">
                                        <Bell size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-black text-white/90 uppercase tracking-tight">New {n.type}</p>
                                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-0.5">{n.name}</p>
                                    </div>
                                    <ArrowUpRight size={14} className="text-white/10 group-hover:text-primary transition-colors" />
                                </Link>
                            ))
                        ) : (
                            <div className="p-20 text-center flex flex-col items-center gap-3">
                                <CheckCircle2 size={32} className="text-white/5" />
                                <p className="text-[10px] font-black uppercase tracking-[3px] text-white/10">All items cleared</p>
                            </div>
                        )}
                    </ScrollArea>
                </PopoverContent>
             </Popover>

             <Avatar className="h-12 w-12 rounded-2xl border-2 border-primary/20 p-0.5 shadow-xl hover:scale-105 transition-transform cursor-pointer">
                <AvatarImage src="/admin-pfp.jpg" className="rounded-[14px]" />
                <AvatarFallback className="bg-[#12141d] text-primary text-sm font-black">AD</AvatarFallback>
             </Avatar>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10">
            {children}
        </main>
      </div>
    </div>
  );
}

function AdminNavItem({ icon: Icon, href, children, count }: { icon: any, href: string, children: React.ReactNode, count?: number }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link href={href} className={cn(
        "flex items-center justify-between rounded-2xl px-4 h-12 transition-all group relative overflow-hidden mb-1", 
        isActive 
            ? "bg-primary/20 text-primary border border-primary/10 shadow-[0_10px_20px_rgba(139,92,246,0.1)]" 
            : "text-white/30 hover:text-white hover:bg-white/[0.03]"
    )}>
      <div className="flex items-center gap-4 relative z-10">
        <Icon size={18} className={cn("transition-transform group-hover:scale-110", isActive ? "text-primary" : "text-white/20")} />
        <span className={cn("text-[11px] font-black uppercase tracking-widest", isActive ? "text-white" : "")}>{children}</span>
      </div>
      {count && count > 0 && (
          <Badge className="bg-primary/20 text-primary border-primary/20 text-[8px] font-black h-5 px-1.5 min-w-[20px] justify-center relative z-10">
              {count}
          </Badge>
      )}
      {isActive && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-full" />}
    </Link>
  );
}
