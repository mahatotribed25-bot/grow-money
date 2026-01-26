
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollection, useUser } from '@/firebase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Timestamp } from 'firebase/firestore';
import { subDays, format, startOfDay } from 'date-fns';

type User = {
  walletBalance?: number;
  email?: string;
  isOnline?: boolean;
  lastSeen?: Timestamp;
  createdAt?: Timestamp;
};

type Transaction = {
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
};

type ActiveLoan = {
    id: string;
    userId: string;
}

type GroupLoanPlan = {
    id: string;
    status: 'Funding' | 'Active' | 'Completed';
}

type KycRequest = {
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

const processUserSignupData = (users: User[] | null) => {
    const last7Days = Array.from({ length: 7 }, (_, i) =>
        startOfDay(subDays(new Date(), i))
    ).reverse();

    const chartData = last7Days.map((day) => {
        const formattedDate = format(day, 'MMM d');
        const dailySignups = users?.filter(u => u.createdAt && startOfDay(u.createdAt.toDate()).getTime() === day.getTime()).length || 0;
        return {
            date: formattedDate,
            "New Users": dailySignups,
        };
    });

    return chartData;
};


export default function AdminDashboard() {
  const { user, loading: userIsLoading } = useUser();
  const isAdmin = !userIsLoading && user?.email === 'admin@tribed.world';
  
  const { data: users, loading: usersLoading } = useCollection<User>(isAdmin ? 'users' : null);
  const { data: deposits, loading: depositsLoading } = useCollection<Transaction>(isAdmin ? 'deposits' : null);
  const { data: withdrawals, loading: withdrawalsLoading } = useCollection<Transaction>(isAdmin ? 'withdrawals' : null);
  const { data: investmentPlans, loading: investmentPlansLoading } = useCollection(isAdmin ? 'investmentPlans' : null);
  const { data: loanPlans, loading: loanPlansLoading } = useCollection(isAdmin ? 'loanPlans' : null);
  const { data: groupLoanPlans, loading: groupLoanPlansLoading } = useCollection<GroupLoanPlan>(isAdmin ? 'groupLoanPlans' : null);
  const { data: activeLoans, loading: loansLoading } = useCollection<ActiveLoan>(isAdmin ? 'loanRequests' : null, { where: ['status', 'in', ['approved', 'sent']] });
  const { data: pendingKycUsers, loading: kycLoading } = useCollection(isAdmin ? 'users' : null, { where: ['kycStatus', '==', 'pending']});


  const loading =
    usersLoading || depositsLoading || withdrawalsLoading || investmentPlansLoading || loanPlansLoading || loansLoading || groupLoanPlansLoading || kycLoading;

  const totalUsers =
    users?.filter((u) => u.email !== 'admin@tribed.world').length || 0;
  const totalWalletBalance =
    users?.reduce((sum, user) => sum + (user.walletBalance || 0), 0) || 0;
  const pendingDeposits = deposits?.filter(d => d.status === 'pending').length || 0;
  const pendingWithdrawals = withdrawals?.filter(w => w.status === 'pending').length || 0;
  const totalInvestmentPlans = investmentPlans?.length || 0;
  const totalLoanPlans = loanPlans?.length || 0;
  const activeGroupLoans = groupLoanPlans?.filter(p => p.status === 'Active').length || 0;
  const pendingKyc = pendingKycUsers?.length || 0;
  
  const onlineUsers = users?.filter(u => u.isOnline && u.lastSeen && u.lastSeen.toMillis() > Date.now() - 5 * 60 * 1000).length || 0;

  const uniqueUsersWithLoans = activeLoans ? new Set(activeLoans.map(loan => loan.userId)).size : 0;
  
  const stats = [
    { title: 'Total Users', value: loading ? '...' : totalUsers, icon: Users },
    { title: 'Total Wallet Balance', value: loading ? '...' : `₹${totalWalletBalance.toFixed(2)}`, icon: Wallet },
    { title: 'Pending Deposits', value: loading ? '...' : pendingDeposits, icon: Upload },
    { title: 'Pending Withdrawals', value: loading ? '...' : pendingWithdrawals, icon: Download },
    { title: 'Investment Plans', value: loading ? '...' : totalInvestmentPlans, icon: Briefcase },
    { title: 'Loan Plans', value: loading ? '...' : totalLoanPlans, icon: HandCoins },
    { title: 'Active Group Loans', value: loading ? '...' : activeGroupLoans, icon: Users2 },
    { title: 'Users with Loans', value: loading ? '...' : uniqueUsersWithLoans, icon: Users },
    { title: 'Pending KYC', value: loading ? '...' : pendingKyc, icon: UserCheck },
    { title: 'Online Users', value: loading ? '...' : onlineUsers, icon: Users },
  ];

  const financialChartData = processFinancialData(deposits, withdrawals);
  const userSignupChartData = processUserSignupData(users);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
      <div className="grid gap-6 md:grid-cols-2">
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
         <Card>
            <CardHeader>
            <CardTitle>Last 7 Days User Signups</CardTitle>
            </CardHeader>
            <CardContent>
            {loading ? (
                <div className="h-[350px] w-full flex items-center justify-center">
                <p>Loading chart data...</p>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={userSignupChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                borderColor: 'hsl(var(--border))',
                            }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="New Users" stroke="hsl(var(--chart-2))" strokeWidth={2} activeDot={{ r: 8 }} />
                    </LineChart>
                </ResponsiveContainer>
            )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
