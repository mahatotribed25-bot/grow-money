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
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useCollection } from '@/firebase';
import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

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
  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-slate-400';
    if (rank === 3) return 'text-amber-600';
    return 'text-muted-foreground';
  };

  return (
    <TableRow>
      <TableCell className={`text-center font-bold text-lg ${getRankColor(rank)}`}>
        {rank === 1 ? <Crown className="inline-block h-5 w-5" /> : rank}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{user.name}</span>
            {user.vipLevel && (
                 <Badge variant={user.vipLevel === 'Bronze' ? 'outline' : 'default'} className="w-fit text-xs">
                    {user.vipLevel}
                </Badge>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right font-semibold">
        {metric}
        <span className="text-xs text-muted-foreground ml-1">{metricLabel}</span>
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
      .sort((a, b) => (b.referralCount || 0) - (a.referralCount || 0))
      .slice(0, 10);
      
    return { topInvestors: investors, topReferrers: referrers };

  }, [users]);


  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 px-4 backdrop-blur-sm sm:px-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold flex items-center gap-2">
            <Trophy /> Leaderboards
        </h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
         <Tabs defaultValue="investors">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="investors">Top Investors</TabsTrigger>
                <TabsTrigger value="referrers">Top Referrers</TabsTrigger>
            </TabsList>
            <TabsContent value="investors">
                <Card className="mt-4">
                     <CardHeader>
                        <CardTitle>Top 10 Investors</CardTitle>
                        <CardDescription>Users who have invested the most in our platform.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p>Loading leaderboard...</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-center w-16">Rank</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead className="text-right">Total Investment</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {topInvestors.map((user, index) => (
                                        <LeaderboardRow 
                                            key={user.id}
                                            user={user}
                                            rank={index + 1}
                                            metric={`₹${(user.totalInvestment || 0).toLocaleString()}`}
                                            metricLabel=""
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="referrers">
                 <Card className="mt-4">
                     <CardHeader>
                        <CardTitle>Top 10 Referrers</CardTitle>
                        <CardDescription>Users who have brought the most new members to our platform.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p>Loading leaderboard...</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-center w-16">Rank</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead className="text-right">Referrals</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {topReferrers.map((user, index) => (
                                        <LeaderboardRow 
                                            key={user.id}
                                            user={user}
                                            rank={index + 1}
                                            metric={user.referralCount || 0}
                                            metricLabel="users"
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
         </Tabs>
      </main>

      <nav className="sticky bottom-0 z-10 border-t border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={Trophy} label="Leaders" href="/leaderboard" active/>
          <BottomNavItem icon={HandCoins} label="My Loans" href="/my-loans" />
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
      className={`flex flex-col items-center justify-center gap-1 ${
        active ? 'text-primary' : 'text-muted-foreground'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}
