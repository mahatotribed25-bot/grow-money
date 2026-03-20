'use client';

import {
  ChevronLeft,
  Home,
  User,
  Briefcase,
  HandCoins,
  Users as UsersIcon,
  BarChart2,
  Download,
  TrendingUp,
  PieChart as PieChartIcon,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection, useDoc } from '@/firebase';
import type { Timestamp } from 'firebase/firestore';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Pie,
  Cell,
  PieChart,
} from 'recharts';
import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';

type Investment = {
  id: string;
  planName: string;
  investedAmount: number;
  startDate: Timestamp;
  status: 'Active' | 'Matured' | 'Stopped';
};

type UserData = {
    totalIncome?: number;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F', '#FFBB28'];

// Helper function to process data for the line chart
const processInvestmentHistory = (investments: Investment[] | null) => {
    if (!investments || investments.length === 0) return [];

    const sortedInvestments = [...investments].sort((a, b) => a.startDate.seconds - b.startDate.seconds);

    let cumulativeAmount = 0;
    const data = sortedInvestments.map(inv => {
        cumulativeAmount += inv.investedAmount;
        return {
            date: inv.startDate.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            'Total Investment': cumulativeAmount,
        };
    });

    return data;
};

// Helper function to process data for the pie chart
const processInvestmentAllocation = (investments: Investment[] | null) => {
    if (!investments) return [];

    const activeInvestments = investments.filter(inv => inv.status === 'Active');
    const allocation = activeInvestments.reduce((acc, inv) => {
        if (!acc[inv.planName]) {
            acc[inv.planName] = 0;
        }
        acc[inv.planName] += inv.investedAmount;
        return acc;
    }, {} as { [key: string]: number });

    return Object.entries(allocation).map(([name, value]) => ({ name, value }));
};


export default function ReportsPage() {
    const { user } = useUser();
    const { data: investments, loading: investmentsLoading } = useCollection<Investment>(user ? `users/${user.uid}/investments` : null);
    const { data: userData, loading: userLoading } = useDoc<UserData>(user ? `users/${user.uid}`: null);
    const { toast } = useToast();

    const loading = investmentsLoading || userLoading;

    const investmentHistoryData = useMemo(() => processInvestmentHistory(investments), [investments]);
    const investmentAllocationData = useMemo(() => processInvestmentAllocation(investments), [investments]);

    const handleDownloadReport = () => {
        toast({
            title: "Coming Soon!",
            description: "This feature is under development and will be available soon.",
        });
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
            <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 px-4 backdrop-blur-sm sm:px-6">
                <Link href="/dashboard">
                <Button variant="ghost" size="icon">
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                </Link>
                <h1 className="text-lg font-semibold">Portfolio Report</h1>
                <div className="w-9" />
            </header>

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {loading ? <p className="text-center">Loading your reports...</p> :
                <>
                    <Card className="shadow-lg border-primary/10 bg-gradient-to-br from-card to-secondary/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp /> Total Earnings
                            </CardTitle>
                            <CardDescription>The total profit you have made from all your investments so far.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <p className="text-4xl font-bold text-green-400">₹{(userData?.totalIncome || 0).toFixed(2)}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart2 /> Investment Growth
                            </CardTitle>
                            <CardDescription>This chart shows the growth of your total invested amount over time.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={investmentHistoryData}>
                                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--background))',
                                            borderColor: 'hsl(var(--border))',
                                        }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="Total Investment" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <PieChartIcon /> Investment Allocation
                            </CardTitle>
                             <CardDescription>This chart shows how your active investments are distributed across different plans.</CardDescription>
                        </CardHeader>
                         <CardContent>
                            {investmentAllocationData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={investmentAllocationData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                                                const RADIAN = Math.PI / 180;
                                                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                                return (
                                                <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                                                    {`${(percent * 100).toFixed(0)}%`}
                                                </text>
                                                );
                                            }}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {investmentAllocationData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                             contentStyle={{
                                                backgroundColor: 'hsl(var(--background))',
                                                borderColor: 'hsl(var(--border))',
                                            }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-center text-muted-foreground">No active investments to display.</p>
                            )}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Download /> Download Reports
                            </CardTitle>
                            <CardDescription>Get a summary of your earnings for your records.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex gap-4">
                            <Button onClick={handleDownloadReport} variant="outline" className="w-full">Download Monthly Report</Button>
                            <Button onClick={handleDownloadReport} variant="outline" className="w-full">Download Yearly Report</Button>
                        </CardContent>
                    </Card>
                </>
                }
            </main>

            <nav className="sticky bottom-0 z-10 border-t border-border/20 bg-background/95 backdrop-blur-sm">
                <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs">
                <BottomNavItem icon={Home} label="Home" href="/dashboard" />
                <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
                <BottomNavItem icon={UsersIcon} label="Team" href="/team" />
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
