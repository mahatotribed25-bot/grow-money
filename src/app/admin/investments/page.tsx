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
import { PlusCircle, Edit, Trash2 } from 'lucide-react';


const plans = [
    {
        name: 'Day Plan',
        investment: 2000,
        profit: 100,
        duration: 1,
        status: 'Available'
    },
    {
        name: 'Weekly Plan',
        investment: 5000,
        profit: 300,
        duration: 7,
        status: 'Available'
    },
    {
        name: 'Monthly Plan',
        investment: 20000,
        profit: 1500,
        duration: 30,
        status: 'Coming Soon'
    }
]

export default function InvestmentsPage() {
  return (
    <div>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Investment Plans</h2>
            <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Create New Plan
            </Button>
        </div>
       <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan Name</TableHead>
              <TableHead>Investment Amount</TableHead>
              <TableHead>Profit</TableHead>
              <TableHead>Duration (Days)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.name}>
                <TableCell>{plan.name}</TableCell>
                <TableCell>₹{plan.investment.toFixed(2)}</TableCell>
                <TableCell>₹{plan.profit.toFixed(2)}</TableCell>
                <TableCell>{plan.duration}</TableCell>
                <TableCell>
                    <Badge variant={plan.status === 'Available' ? 'default' : 'secondary'}>
                        {plan.status}
                    </Badge>
                </TableCell>
                <TableCell>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
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
