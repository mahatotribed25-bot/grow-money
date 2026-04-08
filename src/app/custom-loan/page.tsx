'use client';

import { useState } from 'react';
import {
  ChevronLeft,
  Home,
  User,
  Briefcase,
  HandCoins,
  Users as UsersIcon,
  Trophy,
  Info,
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type AdminSettings = {
  maxCustomLoanAmount?: number;
  totalCustomLoanLimit?: number;
  currentCustomLoanUsage?: number;
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
  const [paymentMethod, setPaymentMethod] = useState<'Bank' | 'UPI' | ''>('');
  const [upiId, setUpiId] = useState('');
  const [bankDetails, setBankDetails] = useState({
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
  });


  const { data: adminSettings, loading: settingsLoading } = useDoc<AdminSettings>('settings/admin');
  const { data: existingRequests, loading: requestsLoading } = useCollection<CustomLoanRequest>(
      user ? query(collection(firestore, 'customLoanRequests'), where('userId', '==', user.uid), where('status', 'in', ['pending_admin_review', 'pending_user_approval', 'approved_by_user'])) : null
  );

  const maxAmount = adminSettings?.maxCustomLoanAmount || 0;
  const availableLimit = (adminSettings?.totalCustomLoanLimit || 0) - (adminSettings?.currentCustomLoanUsage || 0);

  const isServiceEnabled = adminSettings?.totalCustomLoanLimit && adminSettings.totalCustomLoanLimit > 0;

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
    if (requestedDuration > 30) {
      toast({ title: 'Invalid Duration', description: 'Loan duration cannot exceed 30 days.', variant: 'destructive' });
      return;
    }
    if (maxAmount > 0 && requestedAmount > maxAmount) {
      toast({ title: 'Amount Exceeds Limit', description: `You can request a maximum of ₹${maxAmount}.`, variant: 'destructive' });
      return;
    }
    if (availableLimit > 0 && requestedAmount > availableLimit) {
        toast({ title: 'Amount Exceeds Platform Limit', description: `The platform's available loan limit is ₹${availableLimit.toFixed(2)}.`, variant: 'destructive' });
        return;
    }
    if (hasActiveRequest) {
        toast({ title: 'Active Request Found', description: 'You already have a custom loan request being processed.', variant: 'destructive' });
        return;
    }

    if (!paymentMethod) {
        toast({ title: 'Payment Method Required', description: 'Please select how you want to receive the funds.', variant: 'destructive' });
        return;
    }

    let paymentDetails: any = {};
    if (paymentMethod === 'UPI') {
        if (!upiId.trim()) {
            toast({ title: 'UPI ID Required', description: 'Please enter your UPI ID.', variant: 'destructive' });
            return;
        }
        paymentDetails.upiId = upiId;
    } else if (paymentMethod === 'Bank') {
        if (!bankDetails.accountNumber.trim() || !bankDetails.ifscCode.trim() || !bankDetails.accountHolderName.trim()) {
            toast({ title: 'Bank Details Required', description: 'Please fill in all bank details.', variant: 'destructive' });
            return;
        }
        paymentDetails.bankDetails = bankDetails;
    }


    const requestData = {
      userId: user.uid,
      userName: user.displayName,
      requestedAmount,
      requestedDuration,
      paymentMethod,
      ...paymentDetails,
      status: 'pending_admin_review' as const,
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
      setUpiId('');
      setBankDetails({ accountHolderName: '', accountNumber: '', ifscCode: ''});
      setPaymentMethod('');

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
        {(settingsLoading || requestsLoading) ? <p>Loading...</p> : (
            !isServiceEnabled ? (
                <Card>
                    <CardHeader>
                    <CardTitle>Service Unavailable</CardTitle>
                    <CardDescription>
                        The custom loan service is currently not available. This may be because the admin has not set a lending limit. Please check back later.
                    </CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <Card className="bg-gradient-to-br from-card to-card/70">
                <CardHeader>
                    <CardTitle>Loan Application</CardTitle>
                    <CardDescription>
                    Enter the amount and duration (max 30 days) for the loan you need. Your request will be sent to an admin for approval.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {availableLimit > 0 && (
                        <div className="rounded-md border border-blue-500/50 bg-blue-500/10 p-4 text-center text-blue-300">
                            <p className="font-semibold flex items-center justify-center gap-2"><Info /> Platform Loan Limit</p>
                            <p className="text-sm">Available Limit for All Users: <span className="font-bold">₹{availableLimit.toFixed(2)}</span></p>
                        </div>
                    )}
                    {hasActiveRequest ? (
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
                            {maxAmount > 0 && <p className="text-xs text-muted-foreground">Maximum amount per user: ₹{maxAmount}</p>}
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
                            
                            <div className="space-y-2">
                                <Label>How would you like to receive the money?</Label>
                                <RadioGroup onValueChange={(value: 'Bank' | 'UPI') => setPaymentMethod(value)} value={paymentMethod} className="grid grid-cols-2 gap-4">
                                    <div>
                                        <RadioGroupItem value="Bank" id="bank" className="peer sr-only" />
                                        <Label htmlFor="bank" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                            Bank Transfer
                                        </Label>
                                    </div>
                                    <div>
                                        <RadioGroupItem value="UPI" id="upi" className="peer sr-only" />
                                        <Label htmlFor="upi" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                            UPI
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {paymentMethod === 'Bank' && (
                                <div className="space-y-4 rounded-md border p-4 animate-in fade-in-0 zoom-in-95">
                                    <div className="space-y-2">
                                        <Label htmlFor="accountHolderName">Account Holder Name</Label>
                                        <Input id="accountHolderName" placeholder="John Doe" value={bankDetails.accountHolderName} onChange={(e) => setBankDetails({...bankDetails, accountHolderName: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="accountNumber">Account Number</Label>
                                        <Input id="accountNumber" placeholder="Your bank account number" value={bankDetails.accountNumber} onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="ifscCode">IFSC Code</Label>
                                        <Input id="ifscCode" placeholder="Your bank's IFSC code" value={bankDetails.ifscCode} onChange={(e) => setBankDetails({...bankDetails, ifscCode: e.target.value})} />
                                    </div>
                                </div>
                            )}

                            {paymentMethod === 'UPI' && (
                                <div className="space-y-2 animate-in fade-in-0 zoom-in-95">
                                    <Label htmlFor="upiId">Your UPI ID</Label>
                                    <Input id="upiId" placeholder="yourname@oksbi" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
                                </div>
                            )}

                            <Button onClick={handleSubmit} className="w-full">
                            Submit Request
                            </Button>
                        </>
                    )}
                </CardContent>
                </Card>
            )
        )}
      </main>

       <nav className="sticky bottom-0 z-10 border-t border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={Trophy} label="Leaders" href="/leaderboard" />
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
