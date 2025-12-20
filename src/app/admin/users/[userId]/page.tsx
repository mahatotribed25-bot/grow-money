'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDoc, useCollection, useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Wallet, Briefcase, Download, Upload, Ban } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';
import { where, doc, updateDoc } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

type UserData = {
  id: string;
  name: string;
  email: string;
  walletBalance: number;
  totalInvestment: number;
  totalIncome: number;
  status?: 'Active' | 'Blocked';
};

type Investment = {
  id: string;
  planName: string;
  investmentAmount: number;
  dailyIncome: number;
  totalReturn: number;
  startDate: Timestamp;
  endDate: Timestamp;
  status: 'Active' | 'Completed';
};

type Deposit = {
  id: string;
  amount: number;
  utr: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
};

type Withdrawal = {
  id: string;
  amount: number;
  upiId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
};

const formatDate = (timestamp: Timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleString();
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'approved':
    case 'Active':
    case 'Completed':
      return 'default';
    case 'rejected':
    case 'Blocked':
      return 'destructive';
    default:
      return 'secondary';
  }
};

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const firestore = useFirestore();
  const { toast } = useToast();

  const { data: user, loading: userLoading } = useDoc<UserData>(userId ? `users/${userId}` : null);
  const { data: investments, loading: investmentsLoading } = useCollection<Investment>(userId ? `users/${userId}/investments` : null);
  const { data: deposits, loading: depositsLoading } = useCollection<Deposit>(
    userId ? 'deposits' : null,
    where('userId', '==', userId)
  );
  const { data: withdrawals, loading: withdrawalsLoading } = useCollection<Withdrawal>(
    userId ? 'withdrawals' : null,
    where('userId', '==', userId)
  );
  
  const loading = userLoading || investmentsLoading || depositsLoading || withdrawalsLoading;

  const handleToggleStatus = async () => {
    if (!user) return;
    const newStatus = user.status === 'Blocked' ? 'Active' : 'Blocked';
    try {
      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, { status: newStatus });
      toast({
        title: 'Status Updated',
        description: `User has been ${newStatus}.`,
      });
    } catch (error) {
      console.error("Error updating user status:", error);
      toast({
        title: 'Error',
        description: 'Failed to update user status.',
        variant: 'destructive',
      });
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <p>User not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-bold">User Details</h2>
        </div>
        <Button
            variant={user.status === 'Blocked' ? 'default' : 'destructive'}
            onClick={handleToggleStatus}
        >
            <Ban className="mr-2 h-4 w-4" />
            {user.status === 'Blocked' ? 'Unblock User' : 'Block User'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User /> {user.name}
          </CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoBox title="Wallet Balance" value={`₹${(user.walletBalance || 0).toFixed(2)}`} icon={Wallet} />
          <InfoBox title="Total Investment" value={`₹${(user.totalInvestment || 0).toFixed(2)}`} icon={Briefcase} />
          <InfoBox title="Total Income" value={`₹${(user.totalIncome || 0).toFixed(2)}`} icon={Download} />
          <InfoBox title="Status" value={user.status || 'Active'} icon={User} badgeVariant={getStatusVariant(user.status || 'Active')} />
        </CardContent>
      </Card>

      <Tabs defaultValue="investments">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="investments">Investments</TabsTrigger>
          <TabsTrigger value="deposits">Deposits</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
        </TabsList>
        <TabsContent value="investments">
          <HistoryTable
            title="Investment History"
            headers={['Plan Name', 'Amount', 'Daily Income', 'Status', 'Start Date', 'End Date']}
            items={investments}
            renderRow={(item: Investment) => (
              <TableRow key={item.id}>
                <TableCell>{item.planName}</TableCell>
                <TableCell>₹{item.investmentAmount.toFixed(2)}</TableCell>
                <TableCell>₹{item.dailyIncome.toFixed(2)}</TableCell>
                <TableCell><Badge variant={getStatusVariant(item.status)}>{item.status}</Badge></TableCell>
                <TableCell>{formatDate(item.startDate)}</TableCell>
                <TableCell>{formatDate(item.endDate)}</TableCell>
              </TableRow>
            )}
          />
        </TabsContent>
        <TabsContent value="deposits">
          <HistoryTable
            title="Deposit History"
            headers={['Amount', 'UTR', 'Status', 'Date']}
            items={deposits}
            renderRow={(item: Deposit) => (
              <TableRow key={item.id}>
                <TableCell>₹{item.amount.toFixed(2)}</TableCell>
                <TableCell>{item.utr}</TableCell>
                <TableCell><Badge variant={getStatusVariant(item.status)}>{item.status}</Badge></TableCell>
                <TableCell>{formatDate(item.createdAt)}</TableCell>
              </TableRow>
            )}
          />
        </TabsContent>
        <TabsContent value="withdrawals">
          <HistoryTable
            title="Withdrawal History"
            headers={['Amount', 'UPI ID', 'Status', 'Date']}
            items={withdrawals}
            renderRow={(item: Withdrawal) => (
              <TableRow key={item.id}>
                <TableCell>₹{item.amount.toFixed(2)}</TableCell>
                <TableCell>{item.upiId}</TableCell>
                <TableCell><Badge variant={getStatusVariant(item.status)}>{item.status}</Badge></TableCell>
                <TableCell>{formatDate(item.createdAt)}</TableCell>
              </TableRow>
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoBox({ title, value, icon: Icon, badgeVariant }: { title: string, value: string, icon: React.ElementType, badgeVariant?: "default" | "secondary" | "destructive" | "outline" | null | undefined }) {
  return (
    <div className="rounded-lg border p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between text-muted-foreground">
        <p className="text-sm font-medium">{title}</p>
        <Icon className="h-4 w-4" />
      </div>
      {badgeVariant ? (
        <Badge variant={badgeVariant} className="w-fit capitalize">{value}</Badge>
      ) : (
        <p className="text-2xl font-bold">{value}</p>
      )}
    </div>
  )
}

function HistoryTable({ title, headers, items, renderRow }: { title: string, headers: string[], items: any[] | null, renderRow: (item: any) => React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map(header => <TableHead key={header}>{header}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items && items.length > 0 ? (
                items.map(renderRow)
              ) : (
                <TableRow>
                  <TableCell colSpan={headers.length} className="text-center">No records found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
