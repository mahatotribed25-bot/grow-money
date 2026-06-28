
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Home,
  Users,
  LogOut,
  Menu,
  Settings,
  Briefcase,
  Download,
  Upload,
  Megaphone,
  HandCoins,
  Users2,
  FileCheck,
  Handshake,
  Gift,
  FileText,
  MessageSquare,
  Network,
  IndianRupee,
  Sparkles,
  Search,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth, useUser, useCollection } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useEffect, useMemo } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const ADMIN_EMAIL = 'admin@tribed.world';

type BaseRequest = {
  id: string;
  createdAt: Timestamp;
};

type DepositRequest = BaseRequest & { name: string };
type WithdrawalRequest = BaseRequest & { name: string };
type LoanRequest = BaseRequest & { userName: string };
type KycRequest = { id: string, name: string, kycSubmissionDate: Timestamp };
type UpiRequest = BaseRequest & { userName: string };
type CustomLoanRequest = BaseRequest & { userName: string, status: string };

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useUser();
  
  const isAdmin = !loading && user && user.email === ADMIN_EMAIL;

  const { data: pendingDeposits } = useCollection<DepositRequest>(isAdmin ? 'deposits' : null, { where: ['status', '==', 'pending'] });
  const { data: pendingWithdrawals } = useCollection<WithdrawalRequest>(isAdmin ? 'withdrawals' : null, { where: ['status', '==', 'pending'] });
  const { data: pendingLoanRequests } = useCollection<LoanRequest>(isAdmin ? 'loanRequests' : null, { where: ['status', '==', 'pending'] });
  const { data: pendingKycRequests } = useCollection<KycRequest>(isAdmin ? 'users' : null, { where: ['kycStatus', '==', 'pending'] });
  const { data: pendingUpiRequests } = useCollection<UpiRequest>(isAdmin ? 'upiRequests' : null, { where: ['status', '==', 'pending'] });
  const { data: pendingCustomLoanRequests } = useCollection<CustomLoanRequest>(isAdmin ? 'customLoanRequests' : null, { where: ['status', 'in', ['pending_admin_review', 'extension_pending']] });

  const notifications = useMemo(() => {
    if (!isAdmin) return [];
    
    const kycNotifs = pendingKycRequests?.map(k => ({ id: k.id, type: 'KYC', link: '/admin/kyc-requests', name: k.name, createdAt: k.kycSubmissionDate })) || [];
    const customLoanNotifs = pendingCustomLoanRequests?.map(c => ({ ...c, type: c.status === 'extension_pending' ? 'Loan Extension' : 'Custom Loan', link: '/admin/custom-loans', name: c.userName })) || [];

    return [
      ...(pendingDeposits?.map((d) => ({ ...d, type: 'Deposit', link: '/admin/deposits', name: d.name })) || []),
      ...(pendingWithdrawals?.map((w) => ({ ...w, type: 'Withdrawal', link: '/admin/withdrawals', name: w.name })) || []),
      ...(pendingLoanRequests?.map((l) => ({ ...l, type: 'Loan', link: '/admin/loans', name: l.userName })) || []),
      ...kycNotifs,
      ...(pendingUpiRequests?.map((u) => ({ ...u, type: 'UPI', link: '/admin/upi-requests', name: u.userName })) || []),
      ...customLoanNotifs,
    ].filter(n => n.createdAt).sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
  }, [isAdmin, pendingDeposits, pendingWithdrawals, pendingLoanRequests, pendingKycRequests, pendingUpiRequests, pendingCustomLoanRequests]);

  const notificationCount = notifications.length;

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/admin/login');
  };

  useEffect(() => {
    if (!loading && pathname !== '/admin/login' && (!user || user.email !== ADMIN_EMAIL)) {
      router.push('/admin/login');
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#030408]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (pathname === '/admin/login' || !user || user.email !== ADMIN_EMAIL) {
    return pathname === '/admin/login' ? <>{children}</> : null;
  }

  return (
    <div className="min-h-screen w-full bg-[#030408] text-white flex overflow-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] -right-[5%] w-[40%] h-[40%] rounded-full bg-secondary/10 blur-[100px]" />
      </div>

      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-[260px] lg:w-[280px] bg-[#030408] border-r border-white/5 relative z-20 overflow-hidden">
        <div className="h-16 flex items-center px-6 gap-3 border-b border-white/5 bg-black/20">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/20">
            <Briefcase className="h-4 w-4 text-primary" />
          </div>
          <span className="font-black tracking-tight text-lg text-white">Grow Money</span>
        </div>

        <ScrollArea className="flex-1">
          <nav className="p-4 space-y-1">
            <div className="text-[10px] font-black text-white/20 uppercase tracking-[3px] mb-4 mt-2 px-2">Core Hub</div>
            <AdminNavItem icon={Home} href="/admin">Dashboard</AdminNavItem>
            <AdminNavItem icon={IndianRupee} href="/admin/finance">Finance & Earnings</AdminNavItem>
            
            <div className="text-[10px] font-black text-white/20 uppercase tracking-[3px] mb-4 mt-6 px-2">Network Control</div>
            <AdminNavItem icon={Users} href="/admin/users">Investors</AdminNavItem>
            <AdminNavItem icon={Sparkles} href="/admin/rewards">Incentives</AdminNavItem>
            <AdminNavItem icon={Network} href="/admin/user-chats">Chat Bridge</AdminNavItem>
            <AdminNavItem icon={Users2} href="/admin/group-loans">Groups</AdminNavItem>

            <div className="text-[10px] font-black text-white/20 uppercase tracking-[3px] mb-4 mt-6 px-2">Verification</div>
            <AdminNavItem icon={FileCheck} href="/admin/kyc-requests" count={pendingKycRequests?.length}>KYC Pipeline</AdminNavItem>
            <AdminNavItem icon={Handshake} href="/admin/upi-requests" count={pendingUpiRequests?.length}>UPI Registry</AdminNavItem>

            <div className="text-[10px] font-black text-white/20 uppercase tracking-[3px] mb-4 mt-6 px-2">Transactions</div>
            <AdminNavItem icon={Upload} href="/admin/deposits" count={pendingDeposits?.length}>Deposits</AdminNavItem>
            <AdminNavItem icon={Download} href="/admin/withdrawals" count={pendingWithdrawals?.length}>Withdrawals</AdminNavItem>
            <AdminNavItem icon={FileText} href="/admin/custom-loans" count={pendingCustomLoanRequests?.length}>Custom Loans</AdminNavItem>
            
            <div className="text-[10px] font-black text-white/20 uppercase tracking-[3px] mb-4 mt-6 px-2">Systems</div>
            <AdminNavItem icon={Megaphone} href="/admin/announcements">News Center</AdminNavItem>
            <AdminNavItem icon={Gift} href="/admin/coupons">Coupons</AdminNavItem>
            <AdminNavItem icon={MessageSquare} href="/admin/chat">Terminal Support</AdminNavItem>
            <AdminNavItem icon={Settings} href="/admin/settings">Configuration</AdminNavItem>
          </nav>
        </ScrollArea>

        <div className="p-4 border-t border-white/5 bg-black/40">
          <Button variant="ghost" className="w-full justify-start rounded-xl text-white/40 hover:text-red-400 hover:bg-red-400/10 h-11" onClick={handleLogout}>
            <LogOut className="mr-3 h-4 w-4" />
            Termination Log
          </Button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 bg-[#05060f]">
        {/* Modern Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#030408]/50 backdrop-blur-2xl sticky top-0 z-30">
          <div className="flex items-center gap-4 flex-1">
             <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="md:hidden border-white/10">
                        <Menu className="h-5 w-5" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="bg-[#030408] border-r border-white/10 p-0 w-[280px]">
                    <div className="p-6 border-b border-white/5 font-black text-xl">Grow Money</div>
                    <ScrollArea className="h-full py-4 px-2">
                        <nav className="space-y-1">
                            <AdminNavItem icon={Home} href="/admin">Dashboard</AdminNavItem>
                            <AdminNavItem icon={Users} href="/admin/users">Investors</AdminNavItem>
                            <AdminNavItem icon={IndianRupee} href="/admin/finance">Finance</AdminNavItem>
                            <AdminNavItem icon={Settings} href="/admin/settings">Settings</AdminNavItem>
                        </nav>
                    </ScrollArea>
                </SheetContent>
             </Sheet>

             <div className="hidden lg:flex relative max-w-md w-full group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-primary transition-colors" />
                <Input 
                    placeholder="Global system search... (Ctrl + /)" 
                    className="bg-white/5 border-white/10 rounded-xl pl-10 h-10 w-full focus:ring-primary focus:border-primary/40 text-sm"
                />
             </div>
          </div>

          <div className="flex items-center gap-4">
             <Button variant="ghost" size="sm" asChild className="hidden sm:flex rounded-full px-4 h-9 bg-white/5 hover:bg-white/10 border border-white/5 text-white/60">
                <Link href="/dashboard" target="_blank">
                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                    Visit Live Node
                </Link>
             </Button>

             <div className="h-8 w-px bg-white/10" />

             <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-white/5">
                        <Bell className="h-5 w-5 text-white/60" />
                        {notificationCount > 0 && (
                            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_#8b5cf6]" />
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-[#0a0b14]/95 backdrop-blur-3xl border-white/10 p-0 shadow-2xl overflow-hidden rounded-2xl">
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <span className="text-xs font-black uppercase tracking-widest text-white/80">Pending Protocols</span>
                        <Badge className="bg-primary text-white text-[10px]">{notificationCount}</Badge>
                    </div>
                    <ScrollArea className="max-h-[300px]">
                        {notifications.length > 0 ? (
                            notifications.map(n => (
                                <Link key={`${n.type}-${n.id}`} href={n.link} className="flex items-center gap-4 p-4 border-b border-white/5 hover:bg-white/5 transition-colors group">
                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20">
                                        <Bell size={14} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white/90">New {n.type} Request</p>
                                        <p className="text-[10px] text-white/40 uppercase font-bold">{n.name}</p>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="p-10 text-center text-white/20 italic text-xs">No pending alerts</div>
                        )}
                    </ScrollArea>
                </PopoverContent>
             </Popover>

             <div className="flex items-center gap-3 pl-2">
                <div className="text-right hidden sm:block">
                    <p className="text-xs font-black text-white leading-none">Super Admin</p>
                    <p className="text-[9px] font-bold text-primary uppercase tracking-widest mt-1">Level 10</p>
                </div>
                <Avatar className="h-9 w-9 border-2 border-primary/20 shadow-lg shadow-primary/10">
                    <AvatarImage src="/admin-pfp.jpg" />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-black">AD</AvatarFallback>
                </Avatar>
             </div>
          </div>
        </header>

        {/* Dynamic Viewport */}
        <main className="flex-1 overflow-y-auto bg-transparent custom-scrollbar">
          <div className="p-6 lg:p-10 max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function AdminNavItem({ icon: Icon, href, children, count }: { icon: any, href: string, children: React.ReactNode, count?: number }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between rounded-xl px-3 h-11 transition-all group relative",
        isActive 
          ? "bg-gradient-to-r from-primary/20 to-transparent text-primary" 
          : "text-white/40 hover:text-white hover:bg-white/[0.03]"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive && "text-primary drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]")} />
        <span className="text-sm font-bold tracking-tight">{children}</span>
      </div>
      {count && count > 0 ? (
        <Badge className="h-5 min-w-[20px] px-1 bg-primary/20 text-primary border-primary/20 text-[9px] font-black">
            {count}
        </Badge>
      ) : isActive && (
        <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_#8b5cf6]" />
      )}
      {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] bg-primary rounded-r-full" />
      )}
    </Link>
  );
}
