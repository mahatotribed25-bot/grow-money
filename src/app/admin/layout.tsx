
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth, useUser, useCollection } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useEffect, useMemo } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';

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

  const { data: pendingDeposits } = useCollection<DepositRequest>(
    isAdmin ? 'deposits' : null, 
    { where: ['status', '==', 'pending'] }
  );
  const { data: pendingWithdrawals } = useCollection<WithdrawalRequest>(
    isAdmin ? 'withdrawals' : null,
    { where: ['status', '==', 'pending'] }
  );
  const { data: pendingLoanRequests } = useCollection<LoanRequest>(
    isAdmin ? 'loanRequests' : null,
    { where: ['status', '==', 'pending'] }
  );
   const { data: pendingKycRequests } = useCollection<KycRequest>(
    isAdmin ? 'users' : null,
    { where: ['kycStatus', '==', 'pending'] }
  );
   const { data: pendingUpiRequests } = useCollection<UpiRequest>(
    isAdmin ? 'upiRequests' : null,
    { where: ['status', '==', 'pending'] }
  );
  const { data: pendingCustomLoanRequests } = useCollection<CustomLoanRequest>(
    isAdmin ? 'customLoanRequests' : null,
    { where: ['status', 'in', ['pending_admin_review', 'extension_pending']] }
  );


  const notifications = useMemo(() => {
    if (!isAdmin) return [];
    
    const kycNotifs = pendingKycRequests?.map(k => ({
        id: k.id,
        type: 'KYC',
        link: '/admin/kyc-requests',
        name: k.name,
        createdAt: k.kycSubmissionDate,
    })) || [];

    const customLoanNotifs = pendingCustomLoanRequests?.map(c => ({
        ...c,
        type: c.status === 'extension_pending' ? 'Loan Extension' : 'Custom Loan',
        link: '/admin/custom-loans',
        name: c.userName,
    })) || [];

    return [
      ...(pendingDeposits?.map((d) => ({
        ...d,
        type: 'Deposit',
        link: '/admin/deposits',
        name: d.name,
      })) || []),
      ...(pendingWithdrawals?.map((w) => ({
        ...w,
        type: 'Withdrawal',
        link: '/admin/withdrawals',
        name: w.name,
      })) || []),
      ...(pendingLoanRequests?.map((l) => ({
        ...l,
        type: 'Loan',
        link: '/admin/loans',
        name: l.userName,
      })) || []),
       ...kycNotifs,
       ...(pendingUpiRequests?.map((u) => ({
        ...u,
        type: 'UPI',
        link: '/admin/upi-requests',
        name: u.userName,
      })) || []),
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
    if (loading) {
      return; 
    }

    if (pathname !== '/admin/login' && (!user || user.email !== ADMIN_EMAIL)) {
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
    if (pathname === '/admin/login') {
      return <>{children}</>;
    }
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#030408]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#030408] relative flex flex-col md:flex-row">
      {/* Background Glow Blobs - Fixed layer to prevent layout shifts */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] -right-[5%] w-[40%] h-[40%] rounded-full bg-secondary/10 blur-[100px]" />
      </div>

      {/* Glassy Sidebar - Desktop */}
      <aside className="hidden border-r border-white/[0.05] bg-white/[0.02] backdrop-blur-xl md:flex md:w-[240px] lg:w-[280px] shrink-0 sticky top-0 h-screen z-20 flex-col overflow-hidden">
        <div className="flex h-16 items-center border-b border-white/[0.05] px-4 lg:px-6">
          <Link
            href="/admin"
            className="flex items-center gap-2 font-bold tracking-tight"
          >
            <div className="p-1.5 rounded-lg bg-primary/20">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Admin Panel</span>
          </Link>
        </div>
        <ScrollArea className="flex-1 px-4">
          <nav className="grid items-start py-4 gap-1">
              <AdminNavItem icon={Home} href="/admin">Dashboard</AdminNavItem>
              <AdminNavItem icon={IndianRupee} href="/admin/finance">Finance & Earnings</AdminNavItem>
              <AdminNavItem icon={Users} href="/admin/users">Users</AdminNavItem>
              <AdminNavItem icon={Network} href="/admin/user-chats">User Chat Bridge</AdminNavItem>
              <AdminNavItem icon={HandCoins} href="/admin/p2p-loans">P2P Market Oversight</AdminNavItem>
              <AdminNavItem icon={Briefcase} href="/admin/investment-plans">Investment Plans</AdminNavItem>
              <AdminNavItem icon={Users2} href="/admin/group-loans">Group Loans</AdminNavItem>
              <AdminNavItem icon={HandCoins} href="/admin/loan-plans">Loan Plans</AdminNavItem>
              <AdminNavItem icon={HandCoins} href="/admin/loans">Loan Requests</AdminNavItem>
              <AdminNavItem icon={FileText} href="/admin/custom-loans">Custom Loans</AdminNavItem>
              <AdminNavItem icon={FileCheck} href="/admin/kyc-requests">KYC Requests</AdminNavItem>
              <AdminNavItem icon={Handshake} href="/admin/upi-requests">UPI Requests</AdminNavItem>
              <AdminNavItem icon={Upload} href="/admin/deposits">Deposits</AdminNavItem>
              <AdminNavItem icon={Download} href="/admin/withdrawals">Withdrawals</AdminNavItem>
              <AdminNavItem icon={Gift} href="/admin/coupons">Coupons</AdminNavItem>
              <AdminNavItem icon={Megaphone} href="/admin/announcements">Announcements</AdminNavItem>
              <AdminNavItem icon={MessageSquare} href="/admin/chat">Chat Support</AdminNavItem>
              <AdminNavItem icon={Settings} href="/admin/settings">Settings</AdminNavItem>
          </nav>
        </ScrollArea>
        <div className="mt-auto p-4 border-t border-white/5 bg-black/20">
          <Button variant="ghost" size="sm" className="w-full text-white/50 hover:text-white hover:bg-destructive/20" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      <div className="flex flex-col flex-1 relative z-10 w-full min-w-0">
        {/* Glassy Header */}
        <header className="flex h-16 items-center gap-4 border-b border-white/[0.05] bg-black/40 px-4 backdrop-blur-xl lg:px-6 sticky top-0 z-30 w-full">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden border-white/10 hover:bg-white/5"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col bg-[#030408] border-r border-white/10 p-0 w-72">
              <SheetHeader className="px-4 py-6 border-b border-white/5">
                <SheetTitle className="text-left flex items-center gap-2">
                    <Briefcase className="h-6 w-6 text-primary" />
                    <span className="font-bold tracking-tight text-white">Admin Panel</span>
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-1 px-4">
                <nav className="grid gap-1 py-4">
                    <AdminNavItem icon={Home} href="/admin">Dashboard</AdminNavItem>
                    <AdminNavItem icon={IndianRupee} href="/admin/finance">Finance & Earnings</AdminNavItem>
                    <AdminNavItem icon={Users} href="/admin/users">Users</AdminNavItem>
                    <AdminNavItem icon={Network} href="/admin/user-chats">User Chat Bridge</AdminNavItem>
                    <AdminNavItem icon={HandCoins} href="/admin/p2p-loans">P2P Market</AdminNavItem>
                    <AdminNavItem icon={Briefcase} href="/admin/investment-plans">Investment Plans</AdminNavItem>
                    <AdminNavItem icon={Users2} href="/admin/group-loans">Group Loans</AdminNavItem>
                    <AdminNavItem icon={HandCoins} href="/admin/loan-plans">Loan Plans</AdminNavItem>
                    <AdminNavItem icon={HandCoins} href="/admin/loans">Loan Requests</AdminNavItem>
                    <AdminNavItem icon={FileText} href="/admin/custom-loans">Custom Loans</AdminNavItem>
                    <AdminNavItem icon={FileCheck} href="/admin/kyc-requests">KYC Requests</AdminNavItem>
                    <AdminNavItem icon={Handshake} href="/admin/upi-requests">UPI Requests</AdminNavItem>
                    <AdminNavItem icon={Upload} href="/admin/deposits">Deposits</AdminNavItem>
                    <AdminNavItem icon={Download} href="/admin/withdrawals">Withdrawals</AdminNavItem>
                    <AdminNavItem icon={Gift} href="/admin/coupons">Coupons</AdminNavItem>
                    <AdminNavItem icon={Megaphone} href="/admin/announcements">Announcements</AdminNavItem>
                    <AdminNavItem icon={MessageSquare} href="/admin/chat">Chat Support</AdminNavItem>
                    <AdminNavItem icon={Settings} href="/admin/settings">Settings</AdminNavItem>
                </nav>
              </ScrollArea>
              <div className="mt-auto p-4 border-t border-white/5">
                <Button size="sm" variant="ghost" className="w-full text-white/50 hover:bg-destructive/10" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            <h1 className="text-lg font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent uppercase tracking-wider text-[11px] truncate">
              {pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
            </h1>
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative hover:bg-white/5 rounded-full h-10 w-10">
                <Bell className="h-5 w-5 text-white/70" />
                {notificationCount > 0 && (
                  <span className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-white/[0.02] backdrop-blur-2xl border-white/[0.08] shadow-2xl p-0 overflow-hidden">
              <div className="p-4 border-b border-white/5 bg-white/5">
                  <h4 className="font-bold text-white tracking-tight">System Alerts</h4>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mt-1">
                    {notificationCount} Pending actions
                  </p>
              </div>
              <ScrollArea className="max-h-80">
                <div className="grid">
                  {notificationCount > 0 ? (
                    notifications.map((notification) => (
                      <Link
                        key={`${notification.type}-${notification.id}`}
                        href={notification.link}
                        className="flex items-start gap-4 p-4 border-b border-white/[0.03] transition-all hover:bg-white/5 group"
                      >
                        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <Briefcase className="h-4 w-4 text-primary" />
                        </div>
                        <div className="grid gap-0.5">
                          <p className="text-sm font-bold text-white/90">
                            New {notification.type} Request
                          </p>
                          <p className="text-xs text-white/40">
                            By {notification.name}
                          </p>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 opacity-20">
                        <Bell className="h-10 w-10 mb-2" />
                        <p className="text-xs font-bold uppercase tracking-widest">All Clear</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </header>

        <main className="flex-1 p-4 lg:p-8 min-h-screen w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

function AdminNavItem({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all text-sm font-medium border border-transparent",
          isActive 
            ? "bg-primary/20 text-primary border-primary/20 shadow-lg shadow-primary/5" 
            : "text-white/40 hover:text-white hover:bg-white/5"
      )}
    >
      <Icon className={cn("h-4 w-4 transition-transform", isActive && "scale-110")} />
      <span className="truncate">{children}</span>
    </Link>
  );
}
