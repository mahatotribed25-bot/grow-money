
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth, useUser, useCollection } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useEffect, useMemo } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useUser();
  
  const isAdmin = useMemo(() => {
      const email = user?.email?.toLowerCase();
      return !loading && email && ADMIN_EMAILS.includes(email);
  }, [user, loading]);

  const { data: pendingDeposits } = useCollection<DepositRequest>(isAdmin ? 'deposits' : null, { where: ['status', '==', 'pending'] });
  const { data: pendingWithdrawals } = useCollection<WithdrawalRequest>(isAdmin ? 'withdrawals' : null, { where: ['status', '==', 'pending'] });
  const { data: pendingKycRequests } = useCollection<KycRequest>(isAdmin ? 'users' : null, { where: ['kycStatus', '==', 'pending'] });
  const { data: pendingUpiRequests } = useCollection<UpiRequest>(isAdmin ? 'upiRequests' : null, { where: ['status', '==', 'pending'] });
  const { data: pendingCustomLoanRequests } = useCollection<CustomLoanRequest>(isAdmin ? 'customLoanRequests' : null, { where: ['status', 'in', ['pending_admin_review', 'extension_pending']] });

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

  if (loading) return <div className="flex h-screen w-full items-center justify-center bg-[#030408]"><div className="h-10 w-10 animate-spin border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (pathname === '/admin/login' || !isAdmin) return pathname === '/admin/login' ? <>{children}</> : null;

  return (
    <div className="min-h-screen w-full bg-[#030408] text-white flex overflow-hidden">
      <aside className="hidden md:flex flex-col w-[260px] bg-[#030408] border-r border-white/5 relative z-20">
        <div className="h-16 flex items-center px-6 gap-3 border-b border-white/5"><Briefcase className="h-4 w-4 text-primary" /><span className="font-black text-lg">Grow Money</span></div>
        <ScrollArea className="flex-1">
          <nav className="p-4 space-y-1">
            <div className="text-[10px] font-black text-white/20 uppercase tracking-[3px] mb-4 mt-2 px-2">Control</div>
            <AdminNavItem icon={Home} href="/admin">Dashboard</AdminNavItem>
            <AdminNavItem icon={IndianRupee} href="/admin/finance">Finance</AdminNavItem>
            <AdminNavItem icon={Users} href="/admin/users">Investors</AdminNavItem>
            <AdminNavItem icon={FileCheck} href="/admin/kyc-requests" count={pendingKycRequests?.length}>KYC Pipeline</AdminNavItem>
            <AdminNavItem icon={Handshake} href="/admin/upi-requests" count={pendingUpiRequests?.length}>UPI Registry</AdminNavItem>
            <AdminNavItem icon={Upload} href="/admin/deposits" count={pendingDeposits?.length}>Deposits</AdminNavItem>
            <AdminNavItem icon={Download} href="/admin/withdrawals" count={pendingWithdrawals?.length}>Withdrawals</AdminNavItem>
            <AdminNavItem icon={FileText} href="/admin/custom-loans" count={pendingCustomLoanRequests?.length}>Custom Loans</AdminNavItem>
            <AdminNavItem icon={Megaphone} href="/admin/announcements">News Center</AdminNavItem>
            <AdminNavItem icon={Gift} href="/admin/coupons">Coupons</AdminNavItem>
            <AdminNavItem icon={MessageSquare} href="/admin/chat">Terminal Support</AdminNavItem>
            <AdminNavItem icon={Settings} href="/admin/settings">Configuration</AdminNavItem>
          </nav>
        </ScrollArea>
        <div className="p-4 border-t border-white/5"><Button variant="ghost" className="w-full justify-start rounded-xl text-white/40 hover:text-red-400" onClick={handleLogout}><LogOut className="mr-3 h-4 w-4" /> Sign Out</Button></div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-[#05060f]">
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#030408]/50 backdrop-blur-2xl">
          <div className="flex items-center gap-4 flex-1"><Search size={16} className="text-white/20" /><Input placeholder="Global search..." className="bg-white/5 border-none h-10 w-full max-w-md" /></div>
          <div className="flex items-center gap-4">
             <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="relative"><Bell className="h-5 w-5 text-white/60" />{notifications.length > 0 && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />}</Button></PopoverTrigger>
                <PopoverContent className="w-80 bg-[#0a0b14] border-white/10 p-0 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="p-4 border-b border-white/5 font-black text-[10px] uppercase tracking-widest text-white/40 bg-white/5">Protocol Alerts</div>
                    <ScrollArea className="max-h-[300px]">{notifications.length > 0 ? notifications.map(n => (<Link key={n.id} href={n.link} className="flex items-center gap-4 p-4 border-b border-white/5 hover:bg-white/5 transition-colors"><div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Bell size={14} /></div><div><p className="text-sm font-bold text-white/90">New {n.type}</p><p className="text-[10px] text-white/40 uppercase font-bold">{n.name}</p></div></Link>)) : <div className="p-10 text-center text-white/20 italic text-xs">No pending alerts</div>}</ScrollArea>
                </PopoverContent>
             </Popover>
             <Avatar className="h-9 w-9 border-2 border-primary/20"><AvatarImage src="/admin-pfp.jpg" /><AvatarFallback>AD</AvatarFallback></Avatar>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

function AdminNavItem({ icon: Icon, href, children, count }: { icon: any, href: string, children: React.ReactNode, count?: number }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link href={href} className={cn("flex items-center justify-between rounded-xl px-3 h-11 transition-all group", isActive ? "bg-primary/20 text-primary" : "text-white/40 hover:text-white hover:bg-white/[0.03]")}>
      <div className="flex items-center gap-3"><Icon size={16} className={cn(isActive && "text-primary")} /><span className="text-sm font-bold">{children}</span></div>
      {count && count > 0 && <Badge className="bg-primary/20 text-primary border-primary/20 text-[9px] font-black">{count}</Badge>}
    </Link>
  );
}
