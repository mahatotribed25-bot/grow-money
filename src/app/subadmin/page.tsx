
'use client';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollection, useUser, useDoc } from '@/firebase';

type UserData = {
    role?: 'user' | 'subadmin';
    email?: string;
}

export default function SubAdminDashboard() {
  const { user, loading: userLoading } = useUser();
  const { data: userData, loading: userDataLoading } = useDoc<UserData>(user ? `users/${user.uid}` : null);
  const isAuthorized = !userDataLoading && (userData?.role === 'subadmin' || userData?.email === 'admin@tribed.world');
  
  const { data: customLoanRequests, loading: customLoansLoading } = useCollection(isAuthorized ? 'customLoanRequests' : null, { where: ['status', '==', 'pending_admin_review']});

  const loading = userLoading || userDataLoading || customLoansLoading;

  const pendingCustomLoans = customLoanRequests?.length || 0;
  
  const stats = [
    { title: 'Pending Custom Loan Requests', value: loading ? '...' : pendingCustomLoans, icon: FileText },
  ];

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
    </div>
  );
}
