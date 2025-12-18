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
import { Check, X } from 'lucide-react';


const withdrawals = [
    {
        userEmail: 'jane@example.com',
        amount: 200,
        upiId: 'jane@upi',
        date: '2023-10-27',
        status: 'Pending'
    },
    {
        userEmail: 'john@example.com',
        amount: 150,
        upiId: 'john@upi',
        date: '2023-10-25',
        status: 'Pending'
    }
]

export default function WithdrawalsPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Withdrawal Requests</h2>
       <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Email</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>User UPI ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {withdrawals.map((withdrawal) => (
              <TableRow key={withdrawal.userEmail + withdrawal.date}>
                <TableCell>{withdrawal.userEmail}</TableCell>
                <TableCell>₹{withdrawal.amount.toFixed(2)}</TableCell>
                <TableCell>{withdrawal.upiId}</TableCell>
                <TableCell>{withdrawal.date}</TableCell>
                <TableCell>
                   <Badge variant="secondary">{withdrawal.status}</Badge>
                </TableCell>
                <TableCell>
                    <div className="flex gap-2">
                         <Button variant="outline" size="sm" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 hover:text-green-600">
                            <Check className="h-4 w-4 mr-1" /> Paid
                        </Button>
                        <Button variant="outline" size="sm" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600">
                            <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                    </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
