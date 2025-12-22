
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Home,
  Users,
  CreditCard,
  Landmark,
  Briefcase,
  LogOut,
  Menu,
  Settings,
  HandCoins,
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
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useEffect } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const ADMIN_EMAIL = "admin@tribed.world";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useUser();

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

  const getActiveAccordionItem = () => {
    if (pathname.startsWith('/admin/investments') || pathname.startsWith('/admin/deposits') || pathname.startsWith('/admin/withdrawals')) {
      return 'investments';
    }
    if (pathname.startsWith('/admin/loan-plans') || pathname.startsWith('/admin/loans')) {
      return 'loans';
    }
    return '';
  }


  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/admin" className="flex items-center gap-2 font-semibold">
              <Briefcase className="h-6 w-6 text-primary" />
              <span className="">Admin Panel</span>
            </Link>
          </div>
          <nav className="flex-1 grid items-start px-2 text-sm font-medium lg:px-4">
            <AdminNavItem icon={Home} href="/admin">Dashboard</AdminNavItem>
            <AdminNavItem icon={Users} href="/admin/users">Users</AdminNavItem>

            <Accordion type="single" collapsible defaultValue={getActiveAccordionItem()}>
              <AccordionItem value="investments" className="border-b-0">
                <AccordionTrigger className="py-2 hover:no-underline text-muted-foreground hover:bg-muted rounded-lg px-3">
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4" />
                    <span>Investments</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-8 pt-1">
                  <AdminNavItem icon={CreditCard} href="/admin/deposits">Deposits</AdminNavItem>
                  <AdminNavItem icon={Landmark} href="/admin/withdrawals">Withdrawals</AdminNavItem>
                  <AdminNavItem icon={FileText} href="/admin/investments">Investment Plans</AdminNavItem>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="loans" className="border-b-0">
                <AccordionTrigger className="py-2 hover:no-underline text-muted-foreground hover:bg-muted rounded-lg px-3">
                  <div className="flex items-center gap-3">
                    <HandCoins className="h-4 w-4" />
                    <span>Loans</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-8 pt-1">
                   <AdminNavItem icon={FileText} href="/admin/loan-plans">Loan Plans</AdminNavItem>
                   <AdminNavItem icon={FileText} href="/admin/loans">Loan Requests</AdminNavItem>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <AdminNavItem icon={Settings} href="/admin/settings">Settings</AdminNavItem>
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
                  <span >Admin Panel</span>
                </Link>
                <AdminNavItem icon={Home} href="/admin">Dashboard</AdminNavItem>
                <AdminNavItem icon={Users} href="/admin/users">Users</AdminNavItem>
                <AdminNavItem icon={CreditCard} href="/admin/deposits">Deposits</AdminNavItem>
                <AdminNavItem icon={Landmark} href="/admin/withdrawals">Withdrawals</AdminNavItem>
                <AdminNavItem icon={Briefcase} href="/admin/investments">Investment Plans</AdminNavItem>
                <AdminNavItem icon={FileText} href="/admin/loan-plans">Loan Plans</AdminNavItem>
                <AdminNavItem icon={HandCoins} href="/admin/loans">Loan Requests</AdminNavItem>
                <AdminNavItem icon={Settings} href="/admin/settings">Settings</AdminNavItem>
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
             <h1 className="text-lg font-semibold capitalize">{pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}</h1>
          </div>
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function AdminNavItem({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode }) {
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
