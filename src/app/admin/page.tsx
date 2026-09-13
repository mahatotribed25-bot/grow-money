
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
  Search,
  Bell,
  RefreshCcw,
  Globe,
  MessageSquare,
  ShieldCheck,
  ZapOff
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
  const isAdmin = useMemo(() => {
      const email = user?.email?.toLowerCase();
      return !userIsLoading && email && ADMIN_EMAILS.includes(email);
  }, [user, userIsLoading]);
  
  const { data: users, loading: usersLoading } = useCollection<User>(isAdmin ? 'users' : null);
  const { data: allDeposits, loading: depositsLoading } = useCollection<Transaction>(isAdmin ? 'deposits' : null);
  const { data: allWithdrawals, loading: withdrawalsLoading } = useCollection<Transaction>(isAdmin ? 'withdrawals' : null);
  const { data: kycRequests } = useCollection<any>(isAdmin ? 'users' : null, { where: ['kycStatus', '==', 'Pending'] });

  const stats = useMemo(() => {
    if (!allDeposits || !allWithdrawals) return null;
    const pendingDeposits = allDeposits.filter(d => d.status === 'pending').length;
    const pendingWithdrawals = allWithdrawals.filter(w => w.status === 'pending').length;
    const totalDeposits = allDeposits.filter(d => d.status === 'approved').reduce((s, d) => s + d.amount, 0);
    const totalWithdrawals = allWithdrawals.filter(w => w.status === 'approved').reduce((s, w) => s + w.amount, 0);
    return { pendingDeposits, pendingWithdrawals, totalDeposits, totalWithdrawals };
  }, [allDeposits, allWithdrawals]);

  const performanceData = useMemo(() => {
    const days = Array.from({ length: 15 }, (_, i) => startOfDay(subDays(new Date(), i))).reverse();
    return days.map(day => {
        const dSum = allDeposits?.filter(d => d.status === 'approved' && isSameDay(d.createdAt.toDate(), day)).reduce((s, d) => s + d.amount, 0) || 0;
        const wSum = allWithdrawals?.filter(w => w.status === 'approved' && isSameDay(w.createdAt.toDate(), day)).reduce((s, w) => s + w.amount, 0) || 0;
        return { 
            name: format(day, 'MMM d'), 
            Inflow: dSum, 
            Outflow: wSum 
        };
    });
  }, [allDeposits, allWithdrawals]);

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
          <p className="text-[10px] font-black uppercase tracking-[5px] text-white/20">Syncing Protocol Nodes</p>
      </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      {/* Top Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Dashboard Overview</h1>
            <div className="flex items-center gap-2 mt-1">
                 <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                 <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Protocol System Operational</p>
            </div>
        </div>
        <div className="flex items-center gap-3">
             <div className="flex items-center bg-white/[0.03] border border-white/5 rounded-xl px-4 h-11">
                <Clock size={16} className="text-primary mr-3" />
                <span className="text-xs font-black text-white/80">{format(new Date(), 'MMM dd, yyyy | HH:mm')}</span>
             </div>
             <Button variant="outline" className="bg-white/[0.03] border-white/10 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5">
                <RefreshCcw size={14} className="mr-2" /> Refresh Data
             </Button>
        </div>
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassMetricCard 
            title="Active Investors" 
            value={users?.length || 0} 
            change="+12.4%" 
            trend="up"
            icon={Users} 
            color="text-primary"
            chartData={[20, 35, 25, 45, 30, 55, 60]}
        />
        <GlassMetricCard 
            title="Protocol Revenue" 
            value={`₹${(stats?.totalDeposits || 0).toLocaleString()}`} 
            change="+8.7%" 
            trend="up"
            icon={TrendingUp} 
            color="text-green-400"
            chartType="bar"
            chartData={[10, 20, 30, 25, 40, 35, 50]}
        />
        <GlassMetricCard 
            title="Critical Alerts" 
            value={stats?.pendingWithdrawals || 0} 
            change="System Warnings" 
            trend="none"
            icon={AlertTriangle} 
            color="text-red-400"
            subInfo={`${kycRequests?.length || 0} Pending KYC`}
        />
        <GlassMetricCard 
            title="Ledger Volume" 
            value="12.5M" 
            change="+19.1%" 
            trend="up"
            icon={Activity} 
            color="text-blue-400"
            chartType="bar"
            chartData={[30, 25, 45, 50, 40, 60, 55]}
        />
      </div>

      {/* System Performance Main Chart */}
      <Card className="bg-white/[0.02] border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
          <div className="flex items-center justify-between mb-10 relative z-10">
              <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">System Performance Node</h3>
                  <p className="text-[10px] font-black uppercase text-white/20 tracking-[4px]">Inflow vs Outflow analysis</p>
              </div>
              <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                      <div className="h-2 w-4 rounded-full bg-primary" />
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Inflow (₹)</span>
                  </div>
                  <div className="flex items-center gap-2">
                      <div className="h-2 w-4 rounded-full bg-blue-500" />
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Outflow (₹)</span>
                  </div>
              </div>
          </div>
          
          <div className="h-[380px] w-full relative z-10">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                    <defs>
                        <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 900}} 
                        dy={15}
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 900}} 
                        dx={-10}
                        tickFormatter={(v) => `₹${v >= 1000 ? (v/1000).toFixed(1) + 'k' : v}`}
                    />
                    <Tooltip 
                        contentStyle={{backgroundColor: '#0a0b14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'}} 
                        itemStyle={{fontSize: '11px', fontWeight: 900, textTransform: 'uppercase'}}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="Inflow" 
                        stroke="#8b5cf6" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorInflow)" 
                        animationDuration={2000}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="Outflow" 
                        stroke="#3b82f6" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorOutflow)" 
                        animationDuration={2500}
                    />
                </AreaChart>
             </ResponsiveContainer>
          </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Traffic Sources - Left */}
            <Card className="bg-white/[0.02] border-white/5 rounded-[2rem] p-6 shadow-2xl">
                <CardHeader className="p-0 mb-8">
                    <CardTitle className="text-sm font-black uppercase tracking-[3px] text-white/40">Asset Channels</CardTitle>
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
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Global</p>
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

            {/* Top System Events - Middle */}
            <Card className="lg:col-span-1 bg-white/[0.02] border-white/5 rounded-[2rem] p-6 shadow-2xl">
                <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-black uppercase tracking-[3px] text-white/40">System Events</CardTitle>
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

            {/* Geographic Traffic - Right */}
            <Card className="bg-white/[0.02] border-white/5 rounded-[2rem] p-6 shadow-2xl overflow-hidden relative group">
                <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-black uppercase tracking-[3px] text-white/40">Geographic Nodes</CardTitle>
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Live Activity</span>
                </CardHeader>
                
                <div className="aspect-square relative flex items-center justify-center">
                    <div className="absolute inset-0 bg-primary/5 rounded-full blur-[60px] animate-pulse" />
                    <FuturisticWorldMap />
                </div>

                <div className="space-y-4 mt-8 px-2">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Main Node: INDIA</span>
                        </div>
                        <Badge variant="outline" className="h-5 border-white/5 text-[8px] font-bold text-white/30 uppercase px-2">Operational</Badge>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-500 w-[85%] rounded-full shadow-[0_0_15px_rgba(139,92,246,0.5)]" />
                        <div className="absolute inset-0 w-full h-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" style={{ backgroundSize: '200% 100%' }} />
                    </div>
                </div>
            </Card>
      </div>
    </div>
  );
}

/**
 * A futuristic stylized SVG World Map with animated nodes and traffic.
 */
function FuturisticWorldMap() {
    return (
        <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-[0_0_30px_rgba(139,92,246,0.1)]">
            {/* Stylized World Map Paths */}
            <g className="fill-white/5 stroke-white/[0.03]" strokeWidth="1">
                {/* Asia/India focus */}
                <path d="M220,150 Q250,140 280,160 T320,180 L340,220 Q310,250 280,240 T240,200 Z" />
                <path d="M200,180 Q210,195 215,220 L205,240 Q190,220 185,200 Z" className="fill-primary/20 stroke-primary/30" /> {/* India focus */}
                {/* Americas */}
                <path d="M60,140 Q90,130 110,160 T130,220 L100,280 Q70,250 50,220 Z" />
                {/* Europe/Africa */}
                <path d="M150,140 Q180,130 200,150 L210,200 Q180,240 150,250 T130,190 Z" />
            </g>

            {/* Glowing Connection Lines (Traffic) */}
            <g className="stroke-primary/20" strokeWidth="0.5" fill="none">
                <path d="M110,170 Q160,150 205,210" className="animate-pulse" />
                <path d="M210,220 Q260,180 290,170" className="animate-pulse delay-700" />
                <path d="M180,170 Q160,200 110,240" className="animate-pulse delay-300" />
            </g>

            {/* Moving Data Particles */}
            <circle r="1.5" className="fill-primary shadow-lg">
                <animateMotion 
                    dur="4s" 
                    repeatCount="indefinite" 
                    path="M110,170 Q160,150 205,210"
                />
            </circle>
            <circle r="1.5" className="fill-blue-400">
                <animateMotion 
                    dur="5s" 
                    begin="1s"
                    repeatCount="indefinite" 
                    path="M210,220 Q260,180 290,170"
                />
            </circle>

            {/* Glowing Nodes */}
            <g>
                {/* Node: Mumbai/India */}
                <circle cx="205" cy="210" r="4" className="fill-primary animate-pulse" />
                <circle cx="205" cy="210" r="8" className="stroke-primary/40 fill-none animate-ping" strokeWidth="1" />
                
                {/* Node: London/Europe */}
                <circle cx="160" cy="155" r="2.5" className="fill-white/20" />
                
                {/* Node: New York/US */}
                <circle cx="110" cy="170" r="2.5" className="fill-white/20" />
                
                {/* Node: Tokyo/Japan */}
                <circle cx="310" cy="180" r="2.5" className="fill-white/20" />
            </g>
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
                             {trend === 'up' && <ArrowUpRight size={12} className="text-green-400" />}
                             <span className={cn(
                                 "text-[10px] font-black uppercase tracking-tight",
                                 trend === 'up' ? "text-green-400" : trend === 'down' ? "text-red-400" : "text-white/20"
                             )}>
                                 {change}
                             </span>
                             {trend === 'up' && <span className="text-[9px] font-bold text-white/10 uppercase">vs last month</span>}
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
