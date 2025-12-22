
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDoc, useCollection, useFirestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Briefcase, Ban, RefreshCcw, Wallet, Download, Upload } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';
import { where, doc, updateDoc, writeBatch, collection, getDocs, query } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type UserData = {
  id: string;
  name: string;
  email: string;
  panNumber?: string;
  status?: 'Active' | 'Blocked';
};

type Loan = {
  id: string;
  planName: string;
  loanAmount: number;
  totalPayable: number;
  startDate: Timestamp;
  dueDate: Timestamp;
  status: 'Active' | 'Due' | 'Completed';
}

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
    case 'Due':
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
  const { data: loans, loading: loansLoading } = useCollection<Loan>(userId ? `users/${userId}/loans` : null);
  
  const loading = userLoading || loansLoading;

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

  const handleResetData = async () => {
    if (!user) return;

    try {
        const batch = writeBatch(firestore);

        // Delete all loans
        const loansRef = collection(firestore, 'users', userId, 'loans');
        const loansSnapshot = await getDocs(loansRef);
        loansSnapshot.forEach(doc => batch.delete(doc.ref));

        // Delete all loan requests
        const loanRequestsRef = collection(firestore, 'loanRequests');
        const loanRequestsQuery = query(loanRequestsRef, where('userId', '==', userId));
        const loanRequestsSnapshot = await getDocs(loanRequestsQuery);
        loanRequestsSnapshot.forEach(doc => batch.delete(doc.ref));

        // Commit the batch
        await batch.commit();

        toast({
            title: 'User Loan Data Reset',
            description: `All loan data for ${user.name} has been erased.`,
        });

    } catch (error) {
        console.error("Error resetting user data:", error);
        toast({
            title: 'Error Resetting Data',
            description: 'Could not reset user data. Please try again.',
            variant: 'destructive',
        });
    }
  }


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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-bold">User Details</h2>
        </div>
        <div className="flex gap-2">
            <Button
                variant={user.status === 'Blocked' ? 'default' : 'destructive'}
                onClick={handleToggleStatus}
            >
                <Ban className="mr-2 h-4 w-4" />
                {user.status === 'Blocked' ? 'Unblock User' : 'Block User'}
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                     <Button variant="destructive" className="bg-orange-500 hover:bg-orange-600">
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Reset User Data
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action is irreversible. This will permanently delete all of the user's loan history and active loans.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetData} className="bg-destructive hover:bg-destructive/90">
                      Yes, reset data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User /> {user.name}
          </CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoBox title="PAN Number" value={user.panNumber || 'Not provided'} icon={Briefcase} />
          <InfoBox title="Status" value={user.status || 'Active'} icon={User} badgeVariant={getStatusVariant(user.status || 'Active')} />
        </CardContent>
      </Card>

      <HistoryTable
        title="Loan History"
        headers={['Plan Name', 'Amount', 'Total Payable', 'Status', 'Start Date', 'Due Date']}
        items={loans}
        renderRow={(item: Loan) => (
          <TableRow key={item.id}>
            <TableCell>{item.planName}</TableCell>
            <TableCell>₹{item.loanAmount.toFixed(2)}</TableCell>
            <TableCell>₹{item.totalPayable.toFixed(2)}</TableCell>
            <TableCell><Badge variant={getStatusVariant(item.status)}>{item.status}</Badge></TableCell>
            <TableCell>{formatDate(item.startDate)}</TableCell>
            <TableCell>{formatDate(item.dueDate)}</TableCell>
          </TableRow>
        )}
      />
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
        <p className="text-lg font-bold">{value}</p>
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
