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

const users = [
  {
    name: 'John Doe',
    email: 'john@example.com',
    walletBalance: 500,
    totalInvestment: 2000,
    totalIncome: 150,
    status: 'Active',
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    walletBalance: 1200,
    totalInvestment: 5000,
    totalIncome: 300,
    status: 'Active',
  },
    {
    name: 'Mike Johnson',
    email: 'mike@example.com',
    walletBalance: 0,
    totalInvestment: 0,
    totalIncome: 0,
    status: 'Blocked',
  },
];

export default function UsersPage() {
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
            {users.map((user) => (
              <TableRow key={user.email}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>₹{user.walletBalance.toFixed(2)}</TableCell>
                <TableCell>₹{user.totalInvestment.toFixed(2)}</TableCell>
                <TableCell>₹{user.totalIncome.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={user.status === 'Active' ? 'default' : 'destructive'}>
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
