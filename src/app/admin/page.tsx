'use client';
import {
  Users,
  Wallet,
  ArrowDownToDot,
  ArrowUpFromDot,
  Briefcase,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminDashboard() {
  const stats = [
    {
      title: 'Total Users',
      value: '1,250',
      icon: Users,
    },
    {
      title: 'Total Wallet Balance',
      value: '₹1,50,000',
      icon: Wallet,
    },
    {
      title: 'Pending Deposits',
      value: '15',
      icon: ArrowDownToDot,
    },
    {
      title: 'Pending Withdrawals',
      value: '8',
      icon: ArrowUpFromDot,
    },
    {
      title: 'Active Plans',
      value: '500',
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
