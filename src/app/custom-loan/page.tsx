'use client';

import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  Home,
  User,
  Briefcase,
  HandCoins,
  Users as UsersIcon,
  Trophy,
  Info,
  Send,
  Timer,
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
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type AdminSettings = {
  maxCustomLoanAmount?: number;
  totalCustomLoanLimit?: number;
  currentCustomLoanUsage?: number;
  customLoanInterestPer1000?: number;
  adminPhone?: string;
};

type CustomLoanRequest = {
    id: string;
    requestedAmount: number;
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
  const { data: userData } = useDoc<any>(user ? `users/${user.uid}` : null);
  const { data: existingRequests, loading: requestsLoading } = useCollection<CustomLoanRequest>(
      user ? query(collection(firestore, 'customLoanRequests'), where('userId', '==', user.uid), where('status', 'in', ['pending_admin_review', 'pending_user_approval', 'approved_by_user'])) : null
  );

  const maxAmount = adminSettings?.maxCustomLoanAmount || 0;
  const totalLimit = adminSettings?.totalCustomLoanLimit || 0;
  const currentUsage = adminSettings?.currentCustomLoanUsage || 0;
  const availableLimit = totalLimit - currentUsage;

  const isServiceEnabled = totalLimit > 0;
  const isLimitExhausted = isServiceEnabled && availableLimit <= 0;

  const hasActiveRequest = existingRequests && existingRequests.length > 0;
  const pendingRequest = existingRequests?.find(r => r.status === 'pending_admin_review');
  
  const calculatedInfo = useMemo(() => {
    const principal = parseFloat(amount);
    const days = parseInt(duration, 10);
    const interestPer1000 = adminSettings?.customLoanInterestPer1000 || 0;

    if (principal > 0 && days > 0 && interestPer1000 > 0) {
        const dailyInterest = (principal / 1000) * interestPer1000;
        const totalInterest = dailyInterest * days;
        const totalRepayment = principal + totalInterest;
        return { dailyInterest, totalInterest, totalRepayment };
    }
    return null;
  }, [amount, duration, adminSettings]);


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

  const handleNotifyAdmin = () => {
    if (!adminSettings?.adminPhone) {
        toast({ title: "Admin contact not set", description: "The platform administrator hasn't configured their WhatsApp number yet.", variant: "destructive"});
        return;
    }

    const request = pendingRequest || existingRequests?.[0];
    if (!request) return;

    const message = `🛠️ *Expedite My Custom Loan* 🛠️\n\nHello Admin,\n\nI am *${userData?.name || user?.displayName}*.\n\nI just submitted a *Custom Flexi Loan* request for ₹${request.requestedAmount.toFixed(2)}.\n\nCould you please review and approve it? \n\n*User ID:* ${user?.uid}\n\nThank you!`;
    
    window.open(`https://wa.me/91${adminSettings.adminPhone}?text=${encodeURIComponent(message)}`, '_blank');
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
                <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-3xl p-10 text-center border-dashed">
                    <CardHeader>
                    <CardTitle className="text-white/80">Service Offline</CardTitle>
                    <CardDescription className="text-white/40">
                        The custom loan service is currently not available. Our administrative team is currently adjusting the platform limits.
                    </CardDescription>
                    </CardHeader>
                </Card>
            ) : isLimitExhausted ? (
                <Card className="border-amber-500/50 bg-amber-500/5 backdrop-blur-3xl rounded-[2rem] overflow-hidden shadow-2xl">
                    <CardHeader className="text-center pt-10">
                        <div className="mx-auto w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(245,158,11,0.1)]">
                            <Timer className="text-amber-400 h-10 w-10 animate-pulse" />
                        </div>
                        <CardTitle className="text-white text-3xl font-black tracking-tight">Coming Soon</CardTitle>
                        <CardDescription className="text-amber-400/60 font-black uppercase tracking-[4px] text-[10px] mt-2">New Borrow Limit Pending</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center space-y-6 pb-12 px-8">
                        <p className="text-sm text-white/50 leading-relaxed max-w-xs mx-auto">
                            The current platform-wide custom loan allocation has been fully exhausted by our investors. 
                        </p>
                        <div className="inline-flex flex-col items-center gap-2 p-5 bg-white/5 rounded-2xl border border-white/5">
                             <p className="text-[9px] text-white/20 uppercase font-black tracking-widest">Platform Status</p>
                             <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                                <p className="text-sm font-black text-white">REFILLING RESERVES</p>
                             </div>
                        </div>
                        <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest pt-4">Check back in 24-48 hours</p>
                    </CardContent>
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
                        <div className="text-center p-6 rounded-md bg-yellow-500/10 text-yellow-300 space-y-4">
                            <div>
                                <p className="font-semibold">You have an active request.</p>
                                <p className="text-sm">Please wait for the admin to process your current custom loan request before creating a new one.</p>
                            </div>
                            {pendingRequest && (
                                <Button variant="outline" className="text-green-500 border-green-500/50 hover:bg-green-500/10" onClick={handleNotifyAdmin}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Notify Admin on WhatsApp
                                </Button>
                            )}
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

                             {calculatedInfo && (
                                <Card className="bg-muted/50 p-4 space-y-2 animate-in fade-in-0">
                                    <h4 className="font-semibold text-center mb-2">Loan Estimate</h4>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Daily Interest (@ ₹{adminSettings?.customLoanInterestPer1000 || 0} per ₹1000):</span>
                                        <span className="font-semibold">₹{calculatedInfo.dailyInterest.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Total Interest ({duration} days):</span>
                                        <span className="font-semibold text-red-400">₹{calculatedInfo.totalInterest.toFixed(2)}</span>
                                    </div>
                                    <Separator className="my-2" />
                                    <div className="flex justify-between text-lg font-bold">
                                        <span>Estimated Repayment:</span>
                                        <span>₹{calculatedInfo.totalRepayment.toFixed(2)}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center pt-2">This is an estimate. The final amount will be confirmed by the admin.</p>
                                </Card>
                            )}
                            
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
