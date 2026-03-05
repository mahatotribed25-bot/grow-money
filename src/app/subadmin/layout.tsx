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

const ADMIN_EMAIL = 'admin@tribed.world';

type UserData = {
    role?: 'user' | 'subadmin';
    email?: string;
}

type BaseRequest = {
  id: string;
  createdAt: Timestamp;
};

type CustomLoanRequest = BaseRequest & { userName: string };


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
  const isAuthorized = userData && (userData.role === 'subadmin' || userData.email === ADMIN_EMAIL);

  const { data: pendingCustomLoanRequests } = useCollection<CustomLoanRequest>(
    isAuthorized ? 'customLoanRequests' : null,
    { where: ['status', '==', 'pending_admin_review'] }
  );


  const notifications = useMemo(() => {
    if (!isAuthorized) return [];
    
    return [
       ...(pendingCustomLoanRequests?.map((c) => ({
        ...c,
        type: 'Custom Loan',
        link: '/subadmin/custom-loans',
        name: c.userName,
      })) || []),
    ].filter(n => n.createdAt).sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
  }, [isAuthorized, pendingCustomLoanRequests]);

  const notificationCount = notifications.length;

  useEffect(() => {
    if (loading) {
      return; // Wait until loading is complete
    }

    if (!user) {
      router.push('/login');
      return;
    }
    
    if (!isAuthorized) {
       router.push('/dashboard');
    }
  }, [user, isAuthorized, loading, router]);


  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthorized) {
    // While redirecting, show a spinner. This prevents a flash of the subadmin content.
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
              href="/subadmin"
              className="flex items-center gap-2 font-semibold"
            >
              <Briefcase className="h-6 w-6 text-primary" />
              <span className="">Sub-Admin Panel</span>
            </Link>
          </div>
          <nav className="flex-1 grid items-start px-2 text-sm font-medium lg:px-4">
            <AdminNavItem icon={FileText} href="/subadmin/custom-loans">
              Custom Loans
            </AdminNavItem>
          </nav>
          <div className="mt-auto p-4">
            <Button size="sm" className="w-full" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
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
                <SheetTitle className="sr-only">Sub-Admin Menu</SheetTitle>
              </SheetHeader>
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  href="/subadmin"
                  className="flex items-center gap-2 text-lg font-semibold mb-4"
                >
                  <Briefcase className="h-6 w-6 text-primary" />
                  <span>Sub-Admin Panel</span>
                </Link>
                 <AdminNavItem icon={FileText} href="/subadmin/custom-loans">
                    Custom Loans
                 </AdminNavItem>
              </nav>
              <div className="mt-auto">
                <Button size="sm" className="w-full" asChild>
                   <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                  </Link>
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
