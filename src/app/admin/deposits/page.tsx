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

const deposits = [
    {
        userEmail: 'john@example.com',
        amount: 500,
        utr: '123456789012',
        date: '2023-10-27',
        status: 'Pending'
    },
    {
        userEmail: 'jane@example.com',
        amount: 1000,
        utr: '234567890123',
        date: '2023-10-26',
        status: 'Pending'
    }
];

export default function DepositsPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Deposit Requests</h2>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Email</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>UPI Reference</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deposits.map((deposit) => (
              <TableRow key={deposit.utr}>
                <TableCell>{deposit.userEmail}</TableCell>
                <TableCell>₹{deposit.amount.toFixed(2)}</TableCell>
                <TableCell>{deposit.utr}</TableCell>
                <TableCell>{deposit.date}</TableCell>
                <TableCell>
                   <Badge variant="secondary">{deposit.status}</Badge>
                </TableCell>
                <TableCell>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 hover:text-green-600">
                            <Check className="h-4 w-4 mr-1" /> Approve
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
