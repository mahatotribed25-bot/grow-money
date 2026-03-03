
'use client';

import { useState } from 'react';
import {
  ChevronLeft,
  Home,
  User,
  Briefcase,
  HandCoins,
  Users as UsersIcon,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useDoc, useFirestore, useCollection } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp, where, query } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type AdminSettings = {
  maxCustomLoanAmount?: number;
};

type CustomLoanRequest = {
    id: string;
    status: string;
}

export default function CustomLoanPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('');

  const { data: adminSettings, loading: settingsLoading } = useDoc<AdminSettings>('settings/admin');
  const { data: existingRequests, loading: requestsLoading } = useCollection<CustomLoanRequest>(
      user ? query(collection(firestore, 'customLoanRequests'), where('userId', '==', user.uid), where('status', 'in', ['pending_admin_review', 'pending_user_approval', 'approved_by_user'])) : null
  );

  const maxAmount = adminSettings?.maxCustomLoanAmount || 0;
  const hasActiveRequest = existingRequests && existingRequests.length > 0;

  const handleSubmit = async () => {
    if (!user || !user.displayName) {
      toast({ title: 'You must be logged in.', variant: 'destructive' });
      return;
    }
    const requestedAmount = parseFloat(amount);
    const requestedDuration = parseInt(duration, 10);

    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      toast({ title: 'Invalid Amount', description: 'Please enter a valid loan amount.', variant: 'destructive' });
      return;
    }
    if (isNaN(requestedDuration) || requestedDuration <= 0) {
      toast({ title: 'Invalid Duration', description: 'Please enter a valid duration in days.', variant: 'destructive' });
      return;
    }
    if (maxAmount > 0 && requestedAmount > maxAmount) {
      toast({ title: 'Amount Exceeds Limit', description: `You can request a maximum of ₹${maxAmount}.`, variant: 'destructive' });
      return;
    }
    if (hasActiveRequest) {
        toast({ title: 'Active Request Found', description: 'You already have a custom loan request being processed.', variant: 'destructive' });
        return;
    }

    const requestData = {
      userId: user.uid,
      userName: user.displayName,
      requestedAmount,
      requestedDuration,
      status: 'pending_admin_review',
      createdAt: serverTimestamp(),
    };

    try {
      const customLoanRequestsCollection = collection(firestore, 'customLoanRequests');
      await addDoc(customLoanRequestsCollection, requestData);
      toast({
        title: 'Request Submitted',
        description: 'Your custom loan request has been sent to the admin for review.',
      });
      setAmount('');
      setDuration('');
    } catch (error) {
      const permissionError = new FirestorePermissionError({
        path: '/customLoanRequests',
        operation: 'create',
        requestResourceData: requestData,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 px-4 backdrop-blur-sm sm:px-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">Request a Custom Loan</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Loan Application</CardTitle>
            <CardDescription>
              Enter the amount and duration for the loan you need. Your request will be sent to an admin for approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settingsLoading || requestsLoading ? <p>Loading...</p> : hasActiveRequest ? (
                <div className="text-center p-4 rounded-md bg-yellow-500/10 text-yellow-300">
                    <p className="font-semibold">You have an active request.</p>
                    <p className="text-sm">Please wait for the admin to process your current custom loan request before creating a new one.</p>
                </div>
            ) : (
                <>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Loan Amount (₹)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder={`e.g., 2000`}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                      {maxAmount > 0 && <p className="text-xs text-muted-foreground">Maximum amount: ₹{maxAmount}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration">Loan Duration (in days)</Label>
                      <Input
                        id="duration"
                        type="number"
                        placeholder="e.g., 30"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleSubmit} className="w-full">
                      Submit Request
                    </Button>
                </>
            )}
          </CardContent>
        </Card>
      </main>

       <nav className="sticky bottom-0 z-10 border-t border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={UsersIcon} label="Team" href="/team" />
          <BottomNavItem icon={HandCoins} label="My Loans" href="/my-loans" />
          <BottomNavItem icon={User} label="Profile" href="/profile" />
        </div>
      </nav>
    </div>
  );
}

function BottomNavItem({
  icon: Icon,
  label,
  href,
  active = false,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 ${
        active ? 'text-primary' : 'text-muted-foreground'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}
