
'use client';
import {
  Users,
  Wallet,
  Briefcase,
  HandCoins,
  FileWarning,
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
  email?: string;
};

type Loan = {
  status: 'Active' | 'Due' | 'Completed';
  loanAmount: number;
  startDate: Timestamp;
}

type LoanRequest = {
  status: 'pending' | 'approved' | 'rejected';
};


// Function to process data for the chart
const processFinancialData = (
  loans: Loan[] | null,
) => {
  const last7Days = Array.from({ length: 7 }, (_, i) =>
    startOfDay(subDays(new Date(), i))
  ).reverse();

  const chartData = last7Days.map((day) => {
    const formattedDate = format(day, 'MMM d');

    const dailyLoans =
      loans
        ?.filter(
          (l) =>
            l.startDate &&
            startOfDay(l.startDate.toDate()).getTime() === day.getTime()
        )
        .reduce((sum, l) => sum + l.loanAmount, 0) || 0;

    return {
      date: formattedDate,
      'Loans Disbursed': dailyLoans,
    };
  });

  return chartData;
};

export default function AdminDashboard() {
  const { data: users, loading: usersLoading } = useCollection<User>('users');
  const { data: loans, loading: loansLoading } = useCollection<Loan>('loans'); // This should ideally query all loans across all users
  const { data: loanRequests, loading: requestsLoading } =
    useCollection<LoanRequest>('loanRequests');
    
  const { data: loanPlans, loading: plansLoading } =
    useCollection<LoanPlan>('loanPlans');


  const loading =
    usersLoading || loansLoading || requestsLoading || plansLoading;

  const totalUsers =
    users?.filter((u) => u.email !== 'admin@tribed.world').length || 0;
  const totalLoanAmountDisbursed = loans?.reduce((sum, loan) => sum + loan.loanAmount, 0) || 0;
  const pendingLoanRequests = loanRequests?.filter(d => d.status === 'pending').length || 0;
  const dueLoans = loans?.filter(l => l.status === 'Due').length || 0;
  const activeLoanPlans = loanPlans?.length || 0;
  
  type LoanPlan = {
      id: string;
  }

  const stats = [
    {
      title: 'Total Users',
      value: loading ? '...' : totalUsers,
      icon: Users,
    },
    {
      title: 'Total Disbursed',
      value: loading ? '...' : `₹${totalLoanAmountDisbursed.toFixed(2)}`,
      icon: HandCoins,
    },
    {
      title: 'Pending Requests',
      value: loading ? '...' : pendingLoanRequests,
      icon: Wallet, // Using wallet icon for pending requests
    },
    {
      title: 'Loans Due',
      value: loading ? '...' : dueLoans,
      icon: FileWarning,
    },
    {
      title: 'Loan Plans',
      value: loading ? '...' : activeLoanPlans,
      icon: Briefcase,
    },
  ];

  const financialChartData = processFinancialData(loans);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
          <CardTitle>Last 7 Days Loan Disbursement</CardTitle>
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
                <Bar dataKey="Loans Disbursed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
