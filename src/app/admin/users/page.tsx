'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { useCollection } from '@/firebase';

type User = {
  id: string;
  name: string;
  email: string;
  walletBalance: number;
  totalInvestment: number;
  totalIncome: number;
  status?: 'Active' | 'Blocked';
};

const ADMIN_EMAIL = "admin@tribed.world";

export default function UsersPage() {
  const { data: users, loading } = useCollection<User>('users');

  const filteredUsers = users?.filter(user => user.email !== ADMIN_EMAIL);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">User Management</h2>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Wallet Balance</TableHead>
              <TableHead>Total Investment</TableHead>
              <TableHead>Total Income</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>₹{user.walletBalance.toFixed(2)}</TableCell>
                  <TableCell>₹{user.totalInvestment.toFixed(2)}</TableCell>
                  <TableCell>₹{user.totalIncome.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={user.status !== 'Blocked' ? 'default' : 'destructive'}>
                      {user.status || 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
