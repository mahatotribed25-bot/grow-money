
'use client';
import {
  Users,
  Wallet,
  Briefcase,
  HandCoins,
  Download,
  Upload,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollection } from '@/firebase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Timestamp } from 'firebase/firestore';
import { subDays, format, startOfDay } from 'date-fns';

type User = {
  walletBalance?: number;
  email?: string;
};

type Transaction = {
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
};

type ActiveLoan = {
    id: string;
}

// Function to process data for the chart
const processFinancialData = (
  deposits: Transaction[] | null,
  withdrawals: Transaction[] | null
) => {
  const last7Days = Array.from({ length: 7 }, (_, i) =>
    startOfDay(subDays(new Date(), i))
  ).reverse();

  const chartData = last7Days.map((day) => {
    const formattedDate = format(day, 'MMM d');

    const dailyDeposits =
      deposits
        ?.filter(
          (d) =>
            d.status === 'approved' &&
            d.createdAt &&
            startOfDay(d.createdAt.toDate()).getTime() === day.getTime()
        )
        .reduce((sum, d) => sum + d.amount, 0) || 0;

    const dailyWithdrawals =
      withdrawals
        ?.filter(
          (w) =>
            w.status === 'approved' &&
            w.createdAt &&
            startOfDay(w.createdAt.toDate()).getTime() === day.getTime()
        )
        .reduce((sum, w) => sum + w.amount, 0) || 0;

    return {
      date: formattedDate,
      Deposits: dailyDeposits,
      Withdrawals: dailyWithdrawals,
    };
  });

  return chartData;
};

export default function AdminDashboard() {
  const { data: users, loading: usersLoading } = useCollection<User>('users');
  const { data: deposits, loading: depositsLoading } =
    useCollection<Transaction>('deposits');
  const { data: withdrawals, loading: withdrawalsLoading } =
    useCollection<Transaction>('withdrawals');
    
  const { data: investmentPlans, loading: plansLoading } =
    useCollection('investmentPlans');

  const { data: activeLoans, loading: loansLoading } = useCollection<ActiveLoan>('loanRequests', {
      where: ['status', 'in', ['approved', 'sent']]
  });


  const loading =
    usersLoading || depositsLoading || withdrawalsLoading || plansLoading || loansLoading;

  const totalUsers =
    users?.filter((u) => u.email !== 'admin@tribed.world').length || 0;
  const totalWalletBalance =
    users?.reduce((sum, user) => sum + (user.walletBalance || 0), 0) || 0;
  const pendingDeposits = deposits?.filter(d => d.status === 'pending').length || 0;
  const pendingWithdrawals = withdrawals?.filter(w => w.status === 'pending').length || 0;
  const activePlans = investmentPlans?.length || 0;
  const totalActiveLoans = activeLoans?.length || 0;
  
  const stats = [
    {
      title: 'Total Users',
      value: loading ? '...' : totalUsers,
      icon: Users,
    },
    {
      title: 'Total Wallet Balance',
      value: loading ? '...' : `₹${totalWalletBalance.toFixed(2)}`,
      icon: Wallet,
    },
    {
      title: 'Pending Deposits',
      value: loading ? '...' : pendingDeposits,
      icon: Upload,
    },
    {
      title: 'Pending Withdrawals',
      value: loading ? '...' : pendingWithdrawals,
      icon: Download,
    },
    {
      title: 'Investment Plans',
      value: loading ? '...' : activePlans,
      icon: Briefcase,
    },
    {
      title: 'Active Loans',
      value: loading ? '...' : totalActiveLoans,
      icon: HandCoins,
    },
  ];

  const financialChartData = processFinancialData(deposits, withdrawals);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Last 7 Days Financial Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[350px] w-full flex items-center justify-center">
              <p>Loading chart data...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={financialChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `₹${value}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                  }}
                />
                <Legend />
                <Bar dataKey="Deposits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Withdrawals" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
