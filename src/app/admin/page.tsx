'use client';
import {
  Users,
  Wallet,
  ArrowDownToDot,
  ArrowUpFromDot,
  Briefcase,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollection } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useEffect, useState } from 'react';

type User = {
  walletBalance?: number;
  email?: string;
};

type Deposit = {
  status: 'pending' | 'approved' | 'rejected';
};

type Withdrawal = {
  status: 'pending' | 'approved' | 'rejected';
};

type InvestmentPlan = {
  status: 'Available' | 'Coming Soon';
};


export default function AdminDashboard() {
  const { data: users, loading: usersLoading } = useCollection<User>('users');
  const { data: deposits, loading: depositsLoading } = useCollection<Deposit>('deposits');
  const { data: withdrawals, loading: withdrawalsLoading } = useCollection<Withdrawal>('withdrawals');
  const { data: investmentPlans, loading: plansLoading } = useCollection<InvestmentPlan>('investmentPlans');


  const loading = usersLoading || depositsLoading || withdrawalsLoading || plansLoading;

  const totalUsers = users?.filter(u => u.email !== 'admin@tribed.world').length || 0;
  const totalWalletBalance = users?.reduce((sum, user) => sum + (user.walletBalance || 0), 0) || 0;
  const pendingDeposits = deposits?.filter(d => d.status === 'pending').length || 0;
  const pendingWithdrawals = withdrawals?.filter(w => w.status === 'pending').length || 0;
  const activePlansCount = investmentPlans?.filter(p => p.status === 'Available').length || 0;


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
      icon: ArrowDownToDot,
    },
    {
      title: 'Pending Withdrawals',
      value: loading ? '...' : pendingWithdrawals,
      icon: ArrowUpFromDot,
    },
    {
      title: 'Active Plans',
      value: loading ? '...' : activePlansCount,
      icon: Briefcase,
    },
  ];

  return (
    <div>
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
      <div className="mt-6">
        {/* We can add recent activity or charts here later */}
      </div>
    </div>
  );
}
