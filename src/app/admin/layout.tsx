
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
import { useAuth, useUser, useCollection } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useEffect, useMemo } from 'react';
import type { Timestamp } from 'firebase/firestore';

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

  const notifications = useMemo(() => {
    if (!isAdmin) return [];
    
    const kycNotifs = pendingKycRequests?.map(k => ({
        id: k.id,
        type: 'KYC',
        link: '/admin/kyc-requests',
        name: k.name,
        createdAt: k.kycSubmissionDate,
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
    ].filter(n => n.createdAt).sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
  }, [isAdmin, pendingDeposits, pendingWithdrawals, pendingLoanRequests, pendingKycRequests, pendingUpiRequests]);

  const notificationCount = notifications.length;

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/admin/login');
  };

  useEffect(() => {
    if (loading) {
      return; // Wait for user status to be determined
    }

    if (pathname !== '/admin/login' && (!user || user.email !== ADMIN_EMAIL)) {
      router.push('/admin/login');
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (pathname === '/admin/login' || !user || user.email !== ADMIN_EMAIL) {
    if (pathname === '/admin/login') {
      return <>{children}</>;
    }
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link
              href="/admin"
              className="flex items-center gap-2 font-semibold"
            >
              <Briefcase className="h-6 w-6 text-primary" />
              <span className="">Admin Panel</span>
            </Link>
          </div>
          <nav className="flex-1 grid items-start px-2 text-sm font-medium lg:px-4">
            <AdminNavItem icon={Home} href="/admin">
              Dashboard
            </AdminNavItem>
            <AdminNavItem icon={Users} href="/admin/users">
              Users
            </AdminNavItem>
            <AdminNavItem icon={Briefcase} href="/admin/investment-plans">
              Investment Plans
            </AdminNavItem>
            <AdminNavItem icon={Users2} href="/admin/group-loans">
              Group Loans
            </AdminNavItem>
            <AdminNavItem icon={HandCoins} href="/admin/loan-plans">
              Loan Plans
            </AdminNavItem>
            <AdminNavItem icon={HandCoins} href="/admin/loans">
              Loan Requests
            </AdminNavItem>
            <AdminNavItem icon={FileCheck} href="/admin/kyc-requests">
              KYC Requests
            </AdminNavItem>
            <AdminNavItem icon={Handshake} href="/admin/upi-requests">
              UPI Requests
            </AdminNavItem>
            <AdminNavItem icon={Upload} href="/admin/deposits">
              Deposits
            </AdminNavItem>
            <AdminNavItem icon={Download} href="/admin/withdrawals">
              Withdrawals
            </AdminNavItem>
             <AdminNavItem icon={Gift} href="/admin/coupons">
              Coupons
            </AdminNavItem>
            <AdminNavItem icon={Megaphone} href="/admin/announcements">
              Announcements
            </AdminNavItem>
            <AdminNavItem icon={Settings} href="/admin/settings">
              Settings
            </AdminNavItem>
          </nav>
          <div className="mt-auto p-4">
            <Button size="sm" className="w-full" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <SheetHeader>
                <SheetTitle className="sr-only">Admin Menu</SheetTitle>
              </SheetHeader>
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  href="#"
                  className="flex items-center gap-2 text-lg font-semibold mb-4"
                >
                  <Briefcase className="h-6 w-6 text-primary" />
                  <span>Admin Panel</span>
                </Link>
                <AdminNavItem icon={Home} href="/admin">
                  Dashboard
                </AdminNavItem>
                <AdminNavItem icon={Users} href="/admin/users">
                  Users
                </AdminNavItem>
                <AdminNavItem icon={Briefcase} href="/admin/investment-plans">
                  Investment Plans
                </AdminNavItem>
                <AdminNavItem icon={Users2} href="/admin/group-loans">
                  Group Loans
                </AdminNavItem>
                <AdminNavItem icon={HandCoins} href="/admin/loan-plans">
                  Loan Plans
                </AdminNavItem>
                <AdminNavItem icon={HandCoins} href="/admin/loans">
                  Loan Requests
                </AdminNavItem>
                 <AdminNavItem icon={FileCheck} href="/admin/kyc-requests">
                  KYC Requests
                </AdminNavItem>
                 <AdminNavItem icon={Handshake} href="/admin/upi-requests">
                  UPI Requests
                </AdminNavItem>
                <AdminNavItem icon={Upload} href="/admin/deposits">
                  Deposits
                </AdminNavItem>
                <AdminNavItem icon={Download} href="/admin/withdrawals">
                  Withdrawals
                </AdminNavItem>
                <AdminNavItem icon={Gift} href="/admin/coupons">
                  Coupons
                </AdminNavItem>
                <AdminNavItem icon={Megaphone} href="/admin/announcements">
                  Announcements
                </AdminNavItem>
                <AdminNavItem icon={Settings} href="/admin/settings">
                  Settings
                </AdminNavItem>
              </nav>
              <div className="mt-auto">
                <Button size="sm" className="w-full" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            <h1 className="text-lg font-semibold capitalize">
              {pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
            </h1>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute top-0 right-0 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Notifications</h4>
                  <p className="text-sm text-muted-foreground">
                    You have {notificationCount} new notifications.
                  </p>
                </div>
                <div className="grid gap-2">
                  {notificationCount > 0 ? (
                    notifications.slice(0, 5).map((notification) => (
                      <Link
                        key={`${notification.type}-${notification.id}`}
                        href={notification.link}
                        className="flex items-start gap-4 p-2 -mx-2 rounded-lg hover:bg-accent"
                      >
                        <div className="grid gap-1">
                          <p className="text-sm font-medium">
                            New {notification.type} Request
                          </p>
                          <p className="text-sm text-muted-foreground">
                            From: {notification.name}
                          </p>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No new notifications.
                    </p>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
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
      className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all text-sm ${
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted'
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}
