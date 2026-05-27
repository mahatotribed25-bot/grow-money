'use client';

import {
  ChevronLeft,
  Home,
  User,
  Briefcase,
  HandCoins,
  Users as UsersIcon,
  Trophy,
  Crown,
  Timer,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { useCollection } from '@/firebase';
import { useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type LeaderboardUser = {
  id: string;
  name: string;
  email: string;
  totalInvestment?: number;
  referredBy?: string;
  referralCount?: number;
  vipLevel?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
};

const LeaderboardRow = ({
  user,
  rank,
  metric,
  metricLabel,
}: {
  user: LeaderboardUser;
  rank: number;
  metric: string | number;
  metricLabel: string;
}) => {
  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    if (rank === 2) return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    if (rank === 3) return 'text-amber-600 bg-amber-600/10 border-amber-600/20';
    return 'text-white/20 border-transparent';
  };

  return (
    <TableRow className="border-white/[0.03] hover:bg-white/[0.02] transition-colors">
      <TableCell className="text-center w-20">
         <div className={cn("h-8 w-8 rounded-lg border flex items-center justify-center mx-auto font-black text-xs shadow-lg", getRankStyle(rank))}>
            {rank === 1 ? <Crown size={14} className="animate-bounce" /> : rank}
         </div>
      </TableCell>
      <TableCell className="py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-bold text-white/40">
            {user.name.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-white/90 tracking-tight leading-none">{user.name}</span>
            {user.vipLevel && (
                 <Badge variant="outline" className={cn(
                     "w-fit text-[8px] h-4 mt-1.5 uppercase font-black tracking-[2px] border-white/5",
                     user.vipLevel === 'Gold' && "text-yellow-400",
                     user.vipLevel === 'Platinum' && "text-purple-400",
                     user.vipLevel === 'Silver' && "text-slate-300",
                     user.vipLevel === 'Bronze' && "text-amber-600",
                 )}>
                    {user.vipLevel}
                </Badge>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right pr-6">
        <div className="flex flex-col items-end">
            <span className="text-sm font-black text-white tracking-tight">{metric}</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-white/20">{metricLabel}</span>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default function LeaderboardPage() {
  const { data: users, loading } = useCollection<LeaderboardUser>('users');

  const { topInvestors, topReferrers } = useMemo(() => {
    if (!users) {
      return { topInvestors: [], topReferrers: [] };
    }

    const filteredUsers = users.filter(u => u.email !== 'admin@tribed.world');

    // Top Investors
    const investors = [...filteredUsers]
      .sort((a, b) => (b.totalInvestment || 0) - (a.totalInvestment || 0))
      .slice(0, 10);

    // Top Referrers
    const referralCounts: { [key: string]: number } = {};
    const userMap: { [key: string]: LeaderboardUser } = {};

    filteredUsers.forEach(user => {
      userMap[user.id] = user;
      if (user.referredBy && user.referredBy in referralCounts) {
        referralCounts[user.referredBy]++;
      } else if (user.referredBy) {
        referralCounts[user.referredBy] = 1;
      }
    });

    const referrers = Object.entries(referralCounts)
      .map(([userId, count]) => ({
        ...userMap[userId],
        referralCount: count,
      }))
      .filter(r => r.name) // Ensure valid users
      .sort((a, b) => (b.referralCount || 0) - (a.referralCount || 0))
      .slice(0, 10);
      
    return { topInvestors: investors, topReferrers: referrers };

  }, [users]);


  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent text-foreground relative z-10">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.05] bg-black/40 px-4 backdrop-blur-xl sm:px-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white/70">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent flex items-center gap-2">
            <Trophy className="text-yellow-400" size={20} /> Hall of Fame
        </h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6">
         <Tabs defaultValue="investors">
            <TabsList className="grid w-full grid-cols-2 bg-white/5 border-white/10 p-1 h-14 rounded-2xl">
                <TabsTrigger value="investors" className="rounded-xl data-[state=active]:bg-white/10 h-full font-bold uppercase tracking-widest text-[10px]">Top Investors</TabsTrigger>
                <TabsTrigger value="referrers" className="rounded-xl data-[state=active]:bg-white/10 h-full font-bold uppercase tracking-widest text-[10px]">Top Referrers</TabsTrigger>
            </TabsList>
            
            <TabsContent value="investors" className="mt-6">
                <Card className="shadow-2xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl rounded-3xl overflow-hidden">
                    <CardHeader className="border-b border-white/[0.05] bg-white/[0.02]">
                        <CardTitle className="text-white font-bold tracking-tight">Investment Giants</CardTitle>
                        <CardDescription className="text-white/30 text-xs">Our community's leading contributors by lifetime value.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                             <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <Timer className="animate-spin text-primary" />
                                <p className="text-[10px] font-bold uppercase tracking-[4px] text-white/20">Syncing Ranks</p>
                             </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-white/[0.02]">
                                    <TableRow className="border-white/10 hover:bg-transparent">
                                        <TableHead className="text-center w-20 text-[10px] uppercase font-black tracking-widest text-white/20">Rank</TableHead>
                                        <TableHead className="text-[10px] uppercase font-black tracking-widest text-white/20">Investor</TableHead>
                                        <TableHead className="text-right pr-6 text-[10px] uppercase font-black tracking-widest text-white/20">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {topInvestors.map((user, index) => (
                                        <LeaderboardRow 
                                            key={user.id}
                                            user={user}
                                            rank={index + 1}
                                            metric={`₹${(user.totalInvestment || 0).toLocaleString()}`}
                                            metricLabel="invested"
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            
            <TabsContent value="referrers" className="mt-6">
                 <Card className="shadow-2xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl rounded-3xl overflow-hidden">
                    <CardHeader className="border-b border-white/[0.05] bg-white/[0.02]">
                        <CardTitle className="text-white font-bold tracking-tight">Networking Elite</CardTitle>
                        <CardDescription className="text-white/30 text-xs">Top users building the Grow Money community.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                             <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <Timer className="animate-spin text-primary" />
                                <p className="text-[10px] font-bold uppercase tracking-[4px] text-white/20">Syncing Ranks</p>
                             </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-white/[0.02]">
                                    <TableRow className="border-white/10 hover:bg-transparent">
                                        <TableHead className="text-center w-20 text-[10px] uppercase font-black tracking-widest text-white/20">Rank</TableHead>
                                        <TableHead className="text-[10px] uppercase font-black tracking-widest text-white/20">Member</TableHead>
                                        <TableHead className="text-right pr-6 text-[10px] uppercase font-black tracking-widest text-white/20">Volume</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {topReferrers.map((user, index) => (
                                        <LeaderboardRow 
                                            key={user.id}
                                            user={user}
                                            rank={index + 1}
                                            metric={user.referralCount || 0}
                                            metricLabel="invites"
                                        />
                                    ))}
                                    {(!topReferrers || topReferrers.length === 0) && (
                                        <TableRow className="border-transparent">
                                            <TableCell colSpan={3} className="text-center py-20 text-white/20 italic">No referral data yet.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
         </Tabs>
      </main>

      <nav className="sticky bottom-0 z-20 border-t border-white/[0.05] bg-black/40 backdrop-blur-xl">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs font-medium">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={Trophy} label="Leaders" href="/leaderboard" active/>
          <BottomNavItem icon={HandCoins} label="Loans" href="/my-loans" />
          <BottomNavItem icon={User} label="Profile" href="/profile" />
        </div>
      </nav>
    </div>
  );
}

function BottomNavItem({
  icon: Icon,
  label,
  href,
  active = false,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-1 transition-all h-full relative",
        active ? 'text-primary scale-110' : 'text-white/40 hover:text-white/60'
      )}
    >
      <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]")} />
      <span className="text-[10px] tracking-tight">{label}</span>
      {active && <div className="absolute -bottom-1 h-1 w-8 bg-primary rounded-full blur-[2px]" />}
    </Link>
  );
}
