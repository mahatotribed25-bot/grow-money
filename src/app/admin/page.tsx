
'use client';

import {
  Users,
  Wallet,
  Briefcase,
  HandCoins,
  Download,
  Upload,
  Users2,
  UserCheck,
  TrendingUp,
  Activity,
  Zap,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  Megaphone,
  Gift,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Database,
  RefreshCcw,
  Timer
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCollection, useUser, useDoc } from '@/firebase';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Timestamp } from 'firebase/firestore';
import { subDays, format, startOfDay, isSameDay, startOfMonth, isWithinInterval } from 'date-fns';
import { useMemo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type User = { id: string; name: string; walletBalance?: number; email?: string; isOnline?: boolean; lastSeen?: Timestamp; createdAt?: Timestamp; totalInvestment?: number; };
type Transaction = { id: string; amount: number; name: string; status: 'pending' | 'approved' | 'rejected'; createdAt: Timestamp; category?: string; };
type Investment = { planName: string; startDate: Timestamp; investedAmount: number; userId: string; };
type InvestmentPlan = { name: string; adminProfit?: number; };
type AdminSettings = { profitCalculationStartDate?: Timestamp; adminProfitBalance?: number; };

const ADMIN_EMAILS = ['admin@tribed.world', 'admin@tribed.com'];
const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function AdminDashboard() {
  const { user, loading: userIsLoading } = useUser();
  const isAdmin = useMemo(() => !userIsLoading && user?.email && ADMIN_EMAILS.includes(user.email), [user, userIsLoading]);
  
  const { data: users, loading: usersLoading } = useCollection<User>(isAdmin ? 'users' : null);
  const { data: allDeposits, loading: depositsLoading } = useCollection<Transaction>(isAdmin ? 'deposits' : null);
  const { data: allWithdrawals, loading: withdrawalsLoading } = useCollection<Transaction>(isAdmin ? 'withdrawals' : null);
  const { data: investmentPlans, loading: plansLoading } = useCollection<InvestmentPlan>(isAdmin ? 'investmentPlans' : null);
  const { data: allInvestments, loading: investmentsLoading } = useCollection<Investment>(isAdmin ? 'investments' : null, { subcollections: true });
  const { data: adminSettings, loading: settingsLoading } = useDoc<AdminSettings>(isAdmin ? 'settings/admin' : null);

  const stats = useMemo(() => {
    if (!users || !allDeposits || !allWithdrawals || !allInvestments) return null;
    
    const calculationStartDate = adminSettings?.profitCalculationStartDate?.toDate();
    const filteredInvestments = calculationStartDate 
        ? allInvestments?.filter(inv => inv.startDate && inv.startDate.toDate() > calculationStartDate)
        : allInvestments;

    const planProfitMap = new Map(investmentPlans?.map(p => [p.name, p.adminProfit || 0]) || []);
    
    let totalProfit = 0;
    let todayProfit = 0;
    const now = new Date();
    const todayStart = startOfDay(now);

    filteredInvestments.forEach(inv => {
        const profit = planProfitMap.get(inv.planName) || 0;
        totalProfit += profit;
        if (inv.startDate && isSameDay(inv.startDate.toDate(), todayStart)) todayProfit += profit;
    });

    const pendingRequests = (allDeposits.filter(d => d.status === 'pending').length) + (allWithdrawals.filter(w => w.status === 'pending').length);
    const totalDeposits = allDeposits.filter(d => d.status === 'approved').reduce((s, d) => s + d.amount, 0);
    const totalWithdrawals = allWithdrawals.filter(w => w.status === 'approved').reduce((s, w) => s + w.amount, 0);

    return { totalProfit, todayProfit, pendingRequests, totalDeposits, totalWithdrawals };
  }, [users, allDeposits, allWithdrawals, allInvestments, investmentPlans, adminSettings]);

  const overviewData = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => startOfDay(subDays(new Date(), i))).reverse();
    return days.map(day => {
        const dateStr = format(day, 'MMM d');
        const dSum = allDeposits?.filter(d => d.status === 'approved' && isSameDay(d.createdAt.toDate(), day)).reduce((s, d) => s + d.amount, 0) || 0;
        const wSum = allWithdrawals?.filter(w => w.status === 'approved' && isSameDay(w.createdAt.toDate(), day)).reduce((s, w) => s + w.amount, 0) || 0;
        return { name: dateStr, Deposits: dSum, Withdrawals: wSum };
    });
  }, [allDeposits, allWithdrawals]);

  const topInvestors = useMemo(() => {
    return users?.filter(u => !ADMIN_EMAILS.includes(u.email || '')).sort((a, b) => (b.totalInvestment || 0) - (a.totalInvestment || 0)).slice(0, 5) || [];
  }, [users]);

  const liveActivity = useMemo(() => {
    const acts = [
        ...(allDeposits?.map(d => ({ ...d, label: `${d.name} recharge ₹${d.amount}`, icon: Upload, color: 'text-blue-400' })) || []),
        ...(allInvestments?.map(i => ({ id: i.startDate.toMillis().toString(), label: `New plan secure ₹${i.investedAmount}`, icon: Zap, color: 'text-purple-400', createdAt: i.startDate })) || []),
        ...(allWithdrawals?.map(w => ({ ...w, label: `${w.name} requested ₹${w.amount}`, icon: Download, color: 'text-orange-400' })) || []),
    ].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 8);
    return acts;
  }, [allDeposits, allInvestments, allWithdrawals]);

  const loading = userIsLoading || usersLoading || depositsLoading || withdrawalsLoading || plansLoading || investmentsLoading || settingsLoading;

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><p className="animate-pulse font-black text-white/20 uppercase tracking-[5px]">Synchronizing Hub...</p></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter">Good Morning, Admin 👋</h1>
          <p className="text-white/40 font-medium mt-1">Here's the platform execution status for today.</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
           <Clock className="h-4 w-4 text-primary" />
           <span className="text-xs font-black text-white/80 tabular-nums uppercase tracking-widest">{format(new Date(), 'dd MMMM yyyy | HH:mm')}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard label="Total Profit (Today)" value={`₹${stats?.todayProfit.toLocaleString()}`} change="+12.5%" isUp icon={TrendingUp} color="primary" />
        <MetricCard label="Total Users" value={users?.length || 0} change="+8.3%" isUp icon={Users} color="green" />
        <MetricCard label="System Deposits" value={`₹${stats?.totalDeposits.toLocaleString()}`} change="+15.6%" isUp icon={Upload} color="blue" />
        <MetricCard label="System Payouts" value={`₹${stats?.totalWithdrawals.toLocaleString()}`} change="+10.2%" isUp icon={Download} color="orange" />
        <MetricCard label="Pending Protocols" value={stats?.pendingRequests || 0} change="-5.3%" isUp={false} icon={Timer} color="red" />
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-sm font-black text-white/20 uppercase tracking-[3px] pl-1">Quick Executive Controls</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <QuickActionButton label="Add Plan" icon={PlusCircle} color="bg-purple-600" href="/admin/investment-plans" />
            <QuickActionButton label="Approve Deposit" icon={CheckCircle2} color="bg-green-600" href="/admin/deposits" />
            <QuickActionButton label="Approve Payout" icon={Upload} color="bg-orange-600" href="/admin/withdrawals" />
            <QuickActionButton label="Broadcast News" icon={Megaphone} color="bg-blue-600" href="/admin/announcements" />
            <QuickActionButton label="Generate Coupon" icon={Gift} color="bg-pink-600" href="/admin/coupons" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-8 bg-[#030408]/40 border-white/[0.05] rounded-3xl shadow-2xl backdrop-blur-3xl">
          <CardHeader className="flex flex-row items-center justify-between">
             <div>
                <CardTitle className="text-lg font-bold">Execution Overview</CardTitle>
                <CardDescription className="text-[10px] uppercase font-black tracking-widest mt-1">L14 Performance Analytics</CardDescription>
             </div>
             <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-black bg-white/5 rounded-lg">7D</Button>
                <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-black bg-primary rounded-lg">30D</Button>
                <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-black bg-white/5 rounded-lg">1Y</Button>
             </div>
          </CardHeader>
          <CardContent className="h-[400px] w-full pt-4">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={overviewData}>
                    <defs>
                        <linearGradient id="colorD" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorW" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 10}} tickFormatter={(v) => `₹${v/1000}k`} />
                    <Tooltip contentStyle={{backgroundColor: '#0a0b14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px'}} />
                    <Area type="monotone" dataKey="Deposits" stroke="#3b82f6" fillOpacity={1} fill="url(#colorD)" strokeWidth={3} />
                    <Area type="monotone" dataKey="Withdrawals" stroke="#f59e0b" fillOpacity={1} fill="url(#colorW)" strokeWidth={3} />
                </AreaChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Live Activity */}
        <Card className="lg:col-span-4 bg-[#030408]/40 border-white/[0.05] rounded-3xl backdrop-blur-3xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold">Live Pulse</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase text-primary hover:bg-primary/10">View All</Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {liveActivity.map((act, i) => (
                <div key={i} className="flex gap-4 group">
                    <div className={cn("h-10 w-10 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5 group-hover:scale-110 transition-transform", act.color)}>
                        <act.icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white/90 truncate">{act.label}</p>
                        <p className="text-[10px] text-white/30 uppercase font-bold mt-0.5">{act.createdAt ? format(act.createdAt.toDate(), 'h:mm a') : 'Just now'}</p>
                    </div>
                </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-10">
        {/* Top Investors Table */}
        <Card className="lg:col-span-4 bg-[#030408]/40 border-white/[0.05] rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-widest">Market Giants</CardTitle>
                <Link href="/admin/users" className="text-[10px] font-bold text-primary">View All</Link>
            </CardHeader>
            <CardContent className="p-0 px-2">
                <div className="divide-y divide-white/[0.03]">
                    {topInvestors.map((inv, i) => (
                        <div key={i} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center text-[10px] font-black">{i+1}</div>
                                <div>
                                    <p className="text-xs font-bold">{inv.name}</p>
                                    <p className="text-[9px] text-white/30 font-bold uppercase">₹{inv.totalInvestment?.toLocaleString() || 0} Assets</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-black text-green-400">VIP {inv.totalInvestment && inv.totalInvestment > 50000 ? 'Gold' : 'Silver'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>

        {/* Financial Summary Donut */}
        <Card className="lg:col-span-4 bg-[#030408]/40 border-white/[0.05] rounded-3xl">
            <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest">Allocation Core</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
                <div className="h-[200px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={[
                                    { name: 'Available', value: stats?.totalDeposits || 1000 },
                                    { name: 'Reserved', value: stats?.totalProfit || 500 },
                                    { name: 'Pending', value: stats?.pendingRequests * 100 || 200 }
                                ]}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {CHART_COLORS.slice(0, 3).map((c, i) => <Cell key={i} fill={c} stroke="none" />)}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] text-white/30 font-black uppercase">Capital</span>
                        <span className="text-xl font-black">₹{stats?.totalDeposits.toLocaleString()}</span>
                    </div>
                </div>
                <div className="w-full space-y-2 mt-4 px-6">
                    <SummaryItem label="Operating Balance" value={`₹${stats?.totalDeposits.toLocaleString()}`} color="bg-purple-500" />
                    <SummaryItem label="Profit Wallet" value={`₹${stats?.totalProfit.toLocaleString()}`} color="bg-blue-500" />
                    <SummaryItem label="Pending Claims" value={stats?.pendingRequests} color="bg-emerald-500" />
                </div>
            </CardContent>
        </Card>

        {/* System Health */}
        <Card className="lg:col-span-4 bg-[#030408]/40 border-white/[0.05] rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-widest">Infrastructure</CardTitle>
                <Badge className="bg-green-500 text-white text-[9px] font-black">OPTIMAL</Badge>
            </CardHeader>
            <CardContent className="space-y-5 px-6">
                <HealthItem label="Firestore DB" status="Operational" icon={Database} />
                <HealthItem label="NextJS Server" status="Operational" icon={Activity} />
                <HealthItem label="Sync Engine" status="Synced" icon={RefreshCcw} />
                <HealthItem label="System Uptime" status="99.99%" icon={ShieldCheck} />
                <div className="pt-2">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/20">
                            <span>Revenue Target</span>
                            <span>80%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{width: '80%'}} />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value, change, isUp, icon: Icon, color }: { label: string, value: string | number, change: string, isUp: boolean, icon: any, color: string }) {
    const colors = {
        primary: 'bg-primary/10 text-primary border-primary/20',
        green: 'bg-green-500/10 text-green-500 border-green-500/20',
        blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
        red: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return (
        <Card className="bg-[#030408]/40 border-white/[0.05] rounded-3xl overflow-hidden group hover:bg-white/[0.02] transition-colors relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-3xl rounded-full -mr-12 -mt-12" />
            <CardHeader className="pb-2 relative">
                <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center border transition-all group-hover:scale-110", colors[color as keyof typeof colors])}>
                    <Icon size={18} />
                </div>
                <CardDescription className="text-[10px] font-black uppercase tracking-[2px] mt-4 text-white/30">{label}</CardDescription>
            </CardHeader>
            <CardContent className="relative">
                <div className="text-2xl font-black tracking-tighter">{value}</div>
                <div className={cn("flex items-center gap-1 text-[10px] font-black uppercase mt-1", isUp ? "text-green-500" : "text-red-500")}>
                    {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />} {change}
                    <span className="text-white/20 ml-1">vs yesterday</span>
                </div>
            </CardContent>
        </Card>
    )
}

function QuickActionButton({ label, icon: Icon, color, href }: { label: string, icon: any, color: string, href: string }) {
    return (
        <Link href={href} className="group flex items-center gap-3 bg-white/[0.03] border border-white/[0.05] p-3 rounded-2xl hover:bg-white/[0.06] transition-all">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-xl shadow-black/40 transition-transform group-hover:scale-110", color)}>
                <Icon size={20} />
            </div>
            <span className="text-xs font-black text-white/80 uppercase tracking-tighter">{label}</span>
        </Link>
    )
}

function SummaryItem({ label, value, color }: { label: string, value: any, color: string }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className={cn("h-2 w-2 rounded-full", color)} />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{label}</span>
            </div>
            <span className="text-xs font-black text-white/80">{typeof value === 'number' ? `₹${value.toLocaleString()}` : value}</span>
        </div>
    )
}

function HealthItem({ label, status, icon: Icon }: { label: string, status: string, icon: any }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Icon size={14} className="text-white/20" />
                <span className="text-xs font-bold text-white/60">{label}</span>
            </div>
            <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">{status}</span>
        </div>
    )
}
