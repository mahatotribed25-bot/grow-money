'use client';

import {
  Users,
  Upload,
  Download,
  Clock,
  CheckCircle2,
  HandCoins,
  Settings,
  Timer
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCollection, useUser } from '@/firebase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfDay, isSameDay, subDays } from 'date-fns';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';

const ADMIN_EMAILS = ['admin@tribed.world', 'admin@tribed.com'];

type User = { id: string; name: string; photoURL?: string; walletBalance?: number; email?: string; isOnline?: boolean; lastSeen?: Timestamp; createdAt?: Timestamp; totalInvestment?: number; };
type Transaction = { id: string; amount: number; name: string; status: 'pending' | 'approved' | 'rejected'; createdAt: Timestamp; category?: string; };

export default function AdminDashboard() {
  const { user, loading: userIsLoading } = useUser();
  const isAdmin = useMemo(() => {
      const email = user?.email?.toLowerCase();
      return !userIsLoading && email && ADMIN_EMAILS.includes(email);
  }, [user, userIsLoading]);
  
  const { data: users, loading: usersLoading } = useCollection<User>(isAdmin ? 'users' : null);
  const { data: allDeposits, loading: depositsLoading } = useCollection<Transaction>(isAdmin ? 'deposits' : null);
  const { data: allWithdrawals, loading: withdrawalsLoading } = useCollection<Transaction>(isAdmin ? 'withdrawals' : null);

  const stats = useMemo(() => {
    if (!allDeposits || !allWithdrawals) return null;
    const pendingRequests = (allDeposits.filter(d => d.status === 'pending').length) + (allWithdrawals.filter(w => w.status === 'pending').length);
    const totalDeposits = allDeposits.filter(d => d.status === 'approved').reduce((s, d) => s + d.amount, 0);
    const totalWithdrawals = allWithdrawals.filter(w => w.status === 'approved').reduce((s, w) => s + w.amount, 0);
    return { pendingRequests, totalDeposits, totalWithdrawals };
  }, [allDeposits, allWithdrawals]);

  const overviewData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => startOfDay(subDays(new Date(), i))).reverse();
    return days.map(day => {
        const dSum = allDeposits?.filter(d => d.status === 'approved' && isSameDay(d.createdAt.toDate(), day)).reduce((s, d) => s + d.amount, 0) || 0;
        const wSum = allWithdrawals?.filter(w => w.status === 'approved' && isSameDay(w.createdAt.toDate(), day)).reduce((s, w) => s + w.amount, 0) || 0;
        return { name: format(day, 'MMM d'), Deposits: dSum, Withdrawals: wSum };
    });
  }, [allDeposits, allWithdrawals]);

  if (userIsLoading || usersLoading || depositsLoading || withdrawalsLoading) return <div className="flex h-[80vh] items-center justify-center"><Timer className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-black text-white">System Protocol Status</h1><p className="text-white/40 text-xs mt-1">Live execution pulse from the GM Ledger Engine.</p></div>
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10"><Clock className="h-4 w-4 text-primary" /><span className="text-xs font-black uppercase tracking-widest">{format(new Date(), 'dd MMM | HH:mm')}</span></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Investors" value={users?.length || 0} icon={Users} color="primary" />
        <MetricCard label="Total Recharges" value={`₹${stats?.totalDeposits.toLocaleString()}`} icon={Upload} color="blue" />
        <MetricCard label="Total Settlements" value={`₹${stats?.totalWithdrawals.toLocaleString()}`} icon={Download} color="orange" />
        <MetricCard label="Pending Nodes" value={stats?.pendingRequests || 0} icon={Timer} color="red" />
      </div>

      <Card className="bg-[#030408]/40 border-white/[0.05] rounded-3xl p-6">
          <CardTitle className="text-sm uppercase font-black tracking-widest text-white/20 mb-6">Asset Flow Protocol</CardTitle>
          <div className="h-[300px] w-full">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={overviewData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 10}} />
                    <Tooltip contentStyle={{backgroundColor: '#0a0b14', border: '1px solid rgba(255,255,255,0.1)'}} />
                    <Area type="monotone" dataKey="Deposits" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
                    <Area type="monotone" dataKey="Withdrawals" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
             </ResponsiveContainer>
          </div>
      </Card>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <QuickLink label="Plans" icon={Upload} href="/admin/investment-plans" color="bg-purple-600" />
            <QuickLink label="Deposits" icon={CheckCircle2} href="/admin/deposits" color="bg-green-600" />
            <QuickLink label="Payouts" icon={Download} href="/admin/withdrawals" color="bg-orange-600" />
            <QuickLink label="Custom" icon={HandCoins} href="/admin/custom-loans" color="bg-red-600" />
            <QuickLink label="Settings" icon={Settings} href="/admin/settings" color="bg-blue-600" />
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color }: { label: string, value: string | number, icon: any, color: string }) {
    const colors = { primary: 'text-primary border-primary/20 bg-primary/5', blue: 'text-blue-500 border-blue-500/20 bg-blue-500/5', orange: 'text-orange-500 border-orange-500/20 bg-orange-500/5', red: 'text-red-500 border-red-500/20 bg-red-500/5' };
    return (
        <Card className="bg-[#030408]/40 border-white/[0.05] rounded-2xl p-4">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center border", colors[color as keyof typeof colors])}><Icon size={18} /></div>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mt-4">{label}</p>
            <p className="text-2xl font-black mt-1">{value}</p>
        </Card>
    )
}

function QuickLink({ label, icon: Icon, color, href }: { label: string, icon: any, color: string, href: string }) {
    return (
        <Link href={href} className="group flex flex-col items-center gap-3 bg-white/[0.02] border border-white/[0.05] p-5 rounded-2xl hover:bg-white/[0.05] transition-all">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-xl shadow-black/40", color)}><Icon size={18} /></div>
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{label}</span>
        </Link>
    )
}
