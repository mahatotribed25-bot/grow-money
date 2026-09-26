
'use client';

import {
  Users,
  Upload,
  Download,
  Clock,
  CheckCircle2,
  HandCoins,
  Settings,
  Timer,
  Activity,
  Zap,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Bell,
  RefreshCcw,
  Globe,
  MessageSquare,
  ShieldCheck,
  ZapOff,
  Menu,
  ChevronDown
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
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { format, startOfDay, isSameDay, subDays } from 'date-fns';
import { useMemo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const ADMIN_EMAILS = ['admin@tribed.world', 'admin@tribed.com'];

type User = { id: string; name: string; photoURL?: string; walletBalance?: number; email?: string; isOnline?: boolean; lastSeen?: Timestamp; createdAt?: Timestamp; totalInvestment?: number; };
type Transaction = { id: string; amount: number; name: string; status: 'pending' | 'approved' | 'rejected'; createdAt: Timestamp; category?: string; };

export default function AdminDashboard() {
  const { user, loading: userIsLoading } = useUser();
  const [timeRange, setTimeRange] = useState('All');
  
  const isAdmin = useMemo(() => {
      const email = user?.email?.toLowerCase();
      return !userIsLoading && email && ADMIN_EMAILS.includes(email);
  }, [user, userIsLoading]);
  
  const { data: users, loading: usersLoading } = useCollection<User>(isAdmin ? 'users' : null);
  const { data: allDeposits, loading: depositsLoading } = useCollection<Transaction>(isAdmin ? 'deposits' : null);
  const { data: allWithdrawals, loading: withdrawalsLoading } = useCollection<Transaction>(isAdmin ? 'withdrawals' : null);

  const stats = useMemo(() => {
    if (!allDeposits || !allWithdrawals) return null;
    const pendingDeposits = allDeposits.filter(d => d.status === 'pending').length;
    const pendingWithdrawals = allWithdrawals.filter(w => w.status === 'pending').length;
    const totalDeposits = allDeposits.filter(d => d.status === 'approved').reduce((s, d) => s + d.amount, 0);
    const totalWithdrawals = allWithdrawals.filter(w => w.status === 'approved').reduce((s, w) => s + w.amount, 0);
    return { pendingDeposits, pendingWithdrawals, totalDeposits, totalWithdrawals };
  }, [allDeposits, allWithdrawals]);

  const performanceData = useMemo(() => {
    // Generate dates for the last 15 days
    const days = Array.from({ length: 15 }, (_, i) => startOfDay(subDays(new Date(), i))).reverse();
    
    return days.map(day => {
        const dSum = allDeposits?.filter(d => 
            d.status === 'approved' && 
            d.createdAt && 
            isSameDay(d.createdAt.toDate(), day)
        ).reduce((s, d) => s + d.amount, 0) || 0;

        const wSum = allWithdrawals?.filter(w => 
            w.status === 'approved' && 
            w.createdAt && 
            isSameDay(w.createdAt.toDate(), day)
        ).reduce((s, w) => s + w.amount, 0) || 0;

        // The "Value" represents the Net Protocol Volume for that day
        return { 
            name: format(day, 'MMM d'), 
            // We use a baseline of 100 to ensure the chart always has some visual height
            value: (dSum - wSum) + 100, 
            Deposits: dSum, 
            Withdrawals: wSum 
        };
    });
  }, [allDeposits, allWithdrawals]);

  // Logic to determine overall trend color based on the 15-day window
  const isTrendingUp = useMemo(() => {
    if (performanceData.length < 2) return true;
    const first = performanceData[0].value;
    const last = performanceData[performanceData.length - 1].value;
    return last >= first;
  }, [performanceData]);

  const pieData = [
    { name: 'Fixed Yield', value: 45, color: '#8b5cf6' },
    { name: 'Group Pool', value: 25, color: '#3b82f6' },
    { name: 'P2P Market', value: 20, color: '#10b981' },
    { name: 'Referral', value: 10, color: '#f59e0b' },
  ];

  const recentEvents = useMemo(() => {
    const combined = [
        ...(allDeposits || []).map(d => ({ ...d, type: 'Deposit' })),
        ...(allWithdrawals || []).map(w => ({ ...w, type: 'Withdrawal' }))
    ];
    return combined.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds).slice(0, 5);
  }, [allDeposits, allWithdrawals]);

  if (userIsLoading || usersLoading || depositsLoading || withdrawalsLoading) return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
          <div className="h-12 w-12 rounded-2xl border-4 border-primary border-t-transparent animate-spin shadow-[0_0_20px_rgba(139,92,246,0.3)]" />
          <p className="text-[10px] font-black uppercase tracking-[5px] text-white/20">Syncing Master Terminal</p>
      </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      {/* Top Header - Financial Hub Style */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="space-y-1">
            <h1 className="text-5xl font-black text-white tracking-tighter">Grow Money Inc.</h1>
            <div className="flex items-center gap-4 pt-2">
                 <div className="flex items-center gap-1.5">
                    {isTrendingUp ? (
                        <div className="flex items-center gap-1 text-green-400 animate-glow-green">
                            <ArrowUpRight size={20} strokeWidth={3} />
                            <span className="text-lg font-black tracking-tight">+14.2%</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-red-500">
                            <ArrowDownRight size={20} strokeWidth={3} />
                            <span className="text-lg font-black tracking-tight">-2.4%</span>
                        </div>
                    )}
                 </div>
                 <span className="text-[10px] font-black uppercase tracking-[3px] text-white/20">Live System Pulse</span>
            </div>
        </div>
        
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5 p-1 rounded-2xl">
            {['1m', '3m', '6m', 'YTD', '1y', 'All'].map((range) => (
                <Button 
                    key={range}
                    variant="ghost" 
                    size="sm"
                    onClick={() => setTimeRange(range)}
                    className={cn(
                        "h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        timeRange === range ? "bg-white/10 text-white shadow-lg" : "text-white/30 hover:text-white/60"
                    )}
                >
                    {range}
                </Button>
            ))}
            <div className="w-px h-4 bg-white/10 mx-2" />
            <Button variant="ghost" size="icon" className="h-9 w-9 text-white/30 hover:text-white">
                <Menu size={16} />
            </Button>
        </div>
      </div>

      {/* Main Performance Graph - High Fidelity Area Chart */}
      <Card className="bg-transparent border-none p-0 shadow-none relative overflow-hidden">
          <div className="h-[450px] w-full mt-4">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={isTrendingUp ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={isTrendingUp ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: 700}} 
                        dy={15}
                    />
                    <YAxis 
                        orientation="right"
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: 700}} 
                        dx={10}
                        tickFormatter={(v) => `${v.toFixed(0)}`}
                        domain={['auto', 'auto']}
                    />
                    <Tooltip 
                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                        contentStyle={{
                            backgroundColor: 'rgba(10, 11, 20, 0.95)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '16px', 
                            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(10px)'
                        }} 
                        labelStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 900, marginBottom: '4px', textTransform: 'uppercase' }}
                        itemStyle={{fontSize: '14px', fontWeight: 900, color: '#fff'}}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="value" 
                        name="Protocol Strength"
                        stroke={isTrendingUp ? "#10b981" : "#ef4444"} 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                        animationDuration={2500}
                        activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: isTrendingUp ? "#10b981" : "#ef4444" }}
                    />
                </AreaChart>
             </ResponsiveContainer>
          </div>
      </Card>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassMetricCard 
            title="Total Investors" 
            value={users?.length || 0} 
            change="+12.4%" 
            trend="up"
            icon={Users} 
            color="text-primary"
            chartData={[20, 35, 25, 45, 30, 55, 60]}
        />
        <GlassMetricCard 
            title="Total Deposits" 
            value={`₹${(stats?.totalDeposits || 0).toLocaleString()}`} 
            change="+8.7%" 
            trend="up"
            icon={TrendingUp} 
            color="text-green-400"
            chartType="bar"
            chartData={[10, 20, 30, 25, 40, 35, 50]}
        />
        <GlassMetricCard 
            title="Active Node Health" 
            value="Stable" 
            change="-2.1%" 
            trend="down"
            icon={Zap} 
            color="text-amber-400"
            subInfo="System Overhead: Low"
        />
        <GlassMetricCard 
            title="Market Activity" 
            value="12.5M" 
            change="+19.1%" 
            trend="up"
            icon={Activity} 
            color="text-blue-400"
            chartType="bar"
            chartData={[30, 25, 45, 50, 40, 60, 55]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="bg-white/[0.02] border-white/5 rounded-[2rem] p-6 shadow-2xl">
                <CardHeader className="p-0 mb-8">
                    <CardTitle className="text-sm font-black uppercase tracking-[3px] text-white/40">Income Channels</CardTitle>
                </CardHeader>
                <div className="h-[280px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                innerRadius={70}
                                outerRadius={100}
                                paddingAngle={8}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{backgroundColor: '#0a0b14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px'}}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Total</p>
                        <p className="text-2xl font-black text-white tracking-tighter">100%</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6">
                    {pieData.map(item => (
                        <div key={item.name} className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{backgroundColor: item.color}} />
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{item.name}</span>
                            <span className="text-[9px] font-black text-white/80 ml-auto">{item.value}%</span>
                        </div>
                    ))}
                </div>
            </Card>

            <Card className="lg:col-span-1 bg-white/[0.02] border-white/5 rounded-[2rem] p-6 shadow-2xl">
                <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-black uppercase tracking-[3px] text-white/40">Recent Activity</CardTitle>
                    <Link href="/admin/users" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">View All</Link>
                </CardHeader>
                <div className="space-y-4">
                    {recentEvents.map(event => (
                        <div key={event.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                             <div className="flex items-center gap-3">
                                <div className={cn(
                                    "h-10 w-10 rounded-xl flex items-center justify-center border",
                                    event.type === 'Deposit' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-blue-500/10 border-blue-500/20 text-blue-500"
                                )}>
                                    {event.type === 'Deposit' ? <Upload size={16}/> : <Download size={16}/>}
                                </div>
                                <div>
                                    <p className="text-xs font-black text-white/90 uppercase tracking-tight">{event.name}</p>
                                    <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest">{event.type} • {format(event.createdAt.toDate(), 'HH:mm')}</p>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className={cn("text-sm font-black tracking-tighter", event.type === 'Deposit' ? "text-green-400" : "text-blue-400")}>
                                    ₹{event.amount.toLocaleString()}
                                </p>
                             </div>
                        </div>
                    ))}
                </div>
            </Card>

            <Card className="bg-white/[0.02] border-white/5 rounded-[2rem] p-6 shadow-2xl overflow-hidden relative group">
                <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-black uppercase tracking-[3px] text-white/40">Member Locations</CardTitle>
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Live Heatmap</span>
                </CardHeader>
                
                <div className="aspect-square relative flex items-center justify-center border border-white/5 rounded-[1.5rem] bg-black/40 shadow-inner">
                    <div className="absolute inset-0 bg-primary/5 rounded-full blur-[60px] animate-pulse" />
                    <FuturisticWorldMap />
                </div>

                <div className="space-y-4 mt-8 px-2">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Main Server: INDIA</span>
                        </div>
                        <Badge variant="outline" className="h-5 border-white/5 text-[8px] font-bold text-white/30 uppercase px-2">Operational</Badge>
                    </div>
                </div>
            </Card>
      </div>
    </div>
  );
}

function FuturisticWorldMap() {
    return (
        <svg viewBox="0 0 1000 600" className="w-full h-full drop-shadow-[0_0_30px_rgba(139,92,246,0.1)]">
            <g className="fill-white/[0.04] stroke-white/[0.08]" strokeWidth="0.5">
                <path d="M150,150 L250,140 L300,180 L280,300 L180,320 L120,250 Z" />
                <path d="M280,320 L350,330 L380,450 L320,550 L270,450 Z" />
                <path d="M450,140 L550,130 L580,180 L540,240 L480,220 Z" />
                <path d="M480,240 L580,220 L620,350 L580,480 L450,450 L420,300 Z" />
                <path d="M580,130 L850,120 L920,250 L850,400 L650,420 L580,250 Z" />
                <path d="M800,430 L880,440 L900,500 L820,520 Z" />
                <path d="M660,250 L710,240 L730,300 L680,340 Z" className="fill-primary/20 stroke-primary/40" />
            </g>
            <circle cx="695" cy="290" r="8" className="fill-primary animate-pulse" />
        </svg>
    )
}

function GlassMetricCard({ 
    title, 
    value, 
    change, 
    trend, 
    icon: Icon, 
    color, 
    chartType = 'line', 
    chartData,
    subInfo
}: { 
    title: string, 
    value: string | number, 
    change: string, 
    trend: 'up' | 'down' | 'none',
    icon: any, 
    color: string,
    chartType?: 'line' | 'bar',
    chartData?: number[],
    subInfo?: string
}) {
    const data = chartData?.map((v, i) => ({ value: v })) || [];

    return (
        <Card className="bg-white/[0.02] border-white/5 backdrop-blur-xl rounded-3xl p-5 shadow-2xl relative overflow-hidden group hover:bg-white/[0.04] transition-all">
            <div className="flex items-start justify-between relative z-10">
                <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[3px] text-white/30">{title}</p>
                    <div className="space-y-0.5">
                        <p className="text-3xl font-black text-white tracking-tighter">{value}</p>
                        <div className="flex items-center gap-1.5">
                             {trend === 'up' ? (
                                <ArrowUpRight size={14} className="text-green-400 animate-glow-green" />
                             ) : trend === 'down' ? (
                                <ArrowDownRight size={14} className="text-red-500" />
                             ) : null}
                             <span className={cn(
                                 "text-[10px] font-black uppercase tracking-tight",
                                 trend === 'up' ? "text-green-400" : trend === 'down' ? "text-red-500" : "text-white/20"
                             )}>
                                 {change}
                             </span>
                        </div>
                    </div>
                </div>
                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center bg-white/[0.03] border border-white/5 group-hover:scale-110 transition-transform shadow-lg", color)}>
                    <Icon size={22} strokeWidth={2.5} />
                </div>
            </div>

            {chartData && (
                <div className="h-16 w-full mt-6 -mx-5 -mb-5 relative z-0 opacity-40 group-hover:opacity-100 transition-opacity">
                    <ResponsiveContainer width="100%" height="100%">
                        {chartType === 'line' ? (
                            <AreaChart data={data}>
                                <Area type="monotone" dataKey="value" stroke={color.includes('primary') ? '#8b5cf6' : '#10b981'} fill={color.includes('primary') ? '#8b5cf6' : '#10b981'} fillOpacity={0.1} strokeWidth={3} isAnimationActive={true} />
                            </AreaChart>
                        ) : (
                            <BarChart data={data}>
                                <Bar dataKey="value" fill={color.includes('green') ? '#10b981' : '#3b82f6'} radius={[4, 4, 0, 0]} barSize={4} />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>
            )}

            {subInfo && (
                <div className="mt-8 pt-4 border-t border-white/5 relative z-10">
                     <p className="text-[9px] font-black text-white/20 uppercase tracking-[2px]">{subInfo}</p>
                </div>
            )}
        </Card>
    )
}
