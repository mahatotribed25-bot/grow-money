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
  AlertCircle,
  Zap,
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
import { Badge } from '@/components/ui/badge';

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
  
  // Dynamic Interest Logic based on Amount
  const calculatedInfo = useMemo(() => {
    const principal = parseFloat(amount);
    const days = parseInt(duration, 10);
    
    if (principal > 0 && days > 0) {
        // Logic: Low Amount (<5000) = Lower Interest, High Amount (>=5000) = Higher Interest
        const interestPer1000 = principal < 5000 ? 5 : 8;
        const dailyInterest = (principal / 1000) * interestPer1000;
        const totalInterest = dailyInterest * days;
        const totalRepayment = principal + totalInterest;
        return { dailyInterest, totalInterest, totalRepayment, rateLabel: interestPer1000 };
    }
    return null;
  }, [amount, duration]);


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
    
    // Strict 30-day limit
    if (requestedDuration > 30) {
      toast({ 
        title: 'Limit Exceeded', 
        description: 'Maximum duration for a flexible loan is 30 days.', 
        variant: 'destructive' 
      });
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
        description: 'Your flexible loan request has been sent to the admin for review.',
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

    const message = `🛠️ *Expedite My Custom Loan* 🛠️\n\nHello Admin,\n\nI am *${userData?.name || user?.displayName}*.\n\nI just submitted a *Flexible Loan* request for ₹${request.requestedAmount.toFixed(2)}.\n\nCould you please review and approve it? \n\n*User ID:* ${user?.uid}\n\nThank you!`;
    
    window.open(`https://wa.me/91${adminSettings.adminPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 px-4 backdrop-blur-sm sm:px-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-black tracking-tighter uppercase">Flexi Capital</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {(settingsLoading || requestsLoading) ? (
            <div className="flex h-40 items-center justify-center"><Timer className="animate-spin text-primary" /></div>
        ) : (
            !isServiceEnabled ? (
                <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-3xl p-10 text-center border-dashed">
                    <CardHeader>
                    <CardTitle className="text-white/80">Service Offline</CardTitle>
                    <CardDescription className="text-white/40">
                        The custom loan service is currently not available.
                    </CardDescription>
                    </CardHeader>
                </Card>
            ) : isLimitExhausted ? (
                <Card className="border-amber-500/50 bg-amber-500/5 backdrop-blur-3xl rounded-[2rem] overflow-hidden shadow-2xl">
                    <CardHeader className="text-center pt-10">
                        <div className="mx-auto w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(245,158,11,0.1)]">
                            <Timer className="text-amber-400 h-10 w-10 animate-pulse" />
                        </div>
                        <CardTitle className="text-white text-3xl font-black tracking-tight">Reservoir Empty</CardTitle>
                        <CardDescription className="text-amber-400/60 font-black uppercase tracking-[4px] text-[10px] mt-2">Allocated limit fully utilized</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center space-y-6 pb-12 px-8">
                        <p className="text-sm text-white/50 leading-relaxed max-w-xs mx-auto">
                            The platform's current custom loan allocation is fully exhausted. New limits will be released shortly.
                        </p>
                        <div className="inline-flex flex-col items-center gap-2 p-5 bg-white/5 rounded-2xl border border-white/5">
                             <p className="text-[9px] text-white/20 uppercase font-black tracking-widest">Platform Status</p>
                             <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                                <p className="text-sm font-black text-white uppercase tracking-tighter">Refilling Reserves</p>
                             </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    <div className="bg-primary/5 border border-primary/20 p-5 rounded-3xl flex items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                            <Zap size={20} className="fill-current" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-black text-white uppercase tracking-tight">Flexible Interest Node</p>
                            <p className="text-[10px] text-white/40 leading-relaxed">
                                <span className="text-green-400">Low Amount (&lt;₹5k)</span> = ₹5 per 1k daily.<br />
                                <span className="text-amber-400">High Amount (≥₹5k)</span> = ₹8 per 1k daily.
                            </p>
                        </div>
                    </div>

                    <Card className="bg-card border-border rounded-[2rem] shadow-2xl overflow-hidden">
                        <CardHeader className="pb-2 pt-8">
                            <CardTitle className="text-2xl font-black tracking-tighter">Application Terminal</CardTitle>
                            <CardDescription className="text-[10px] uppercase font-bold tracking-[3px] text-muted-foreground">Protocol Limit: 30 Days Max</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pb-10">
                            {hasActiveRequest ? (
                                <div className="text-center p-8 rounded-3xl bg-yellow-500/5 border border-yellow-500/20 space-y-6">
                                    <div className="h-16 w-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-auto text-yellow-500">
                                        <Timer size={32} />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="font-black text-white uppercase tracking-tight">Active Request in Pipeline</p>
                                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest leading-relaxed">Wait for admin to process your current request node.</p>
                                    </div>
                                    {pendingRequest && (
                                        <Button variant="outline" className="w-full h-12 rounded-xl text-green-500 border-green-500/20 hover:bg-green-500/10 font-black uppercase text-[10px] tracking-widest" onClick={handleNotifyAdmin}>
                                            <Send className="mr-2 h-4 w-4" /> Ping Admin WhatsApp
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Loan Amount</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₹</span>
                                                <Input
                                                    id="amount"
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={amount}
                                                    onChange={(e) => setAmount(e.target.value)}
                                                    className="h-12 pl-7 rounded-xl font-black text-lg bg-muted/50"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Days Node</Label>
                                            <div className="relative">
                                                <Timer className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="duration"
                                                    type="number"
                                                    placeholder="1-30"
                                                    value={duration}
                                                    onChange={(e) => setDuration(e.target.value)}
                                                    className={cn("h-12 pl-9 rounded-xl font-black text-lg bg-muted/50", parseInt(duration) > 30 && "border-red-500 text-red-500")}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {parseInt(duration) > 30 && (
                                        <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest flex items-center gap-1.5 px-2 animate-in slide-in-from-top-1">
                                            <AlertCircle size={12} /> Protocol violation: Max 30 days allowed
                                        </p>
                                    )}

                                    {calculatedInfo && (
                                        <Card className="bg-muted/30 border-border p-6 rounded-3xl space-y-4 animate-in zoom-in-95">
                                            <div className="flex justify-between items-center">
                                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Protocol Terms</p>
                                                <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase">₹{calculatedInfo.rateLabel}/1k Rate</Badge>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs font-bold">
                                                    <span className="text-muted-foreground">Daily Interest:</span>
                                                    <span className="text-white">₹{calculatedInfo.dailyInterest.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-xs font-bold">
                                                    <span className="text-muted-foreground">Total Accrued:</span>
                                                    <span className="text-red-400">+ ₹{calculatedInfo.totalInterest.toFixed(2)}</span>
                                                </div>
                                                <Separator className="bg-white/5 my-2" />
                                                <div className="flex justify-between items-end">
                                                    <span className="text-[10px] font-black uppercase tracking-[3px] text-muted-foreground">Settlement Node</span>
                                                    <span className="text-2xl font-black text-white tracking-tighter">₹{calculatedInfo.totalRepayment.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </Card>
                                    )}
                                    
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Dispatch Destination</Label>
                                        <RadioGroup onValueChange={(value: 'Bank' | 'UPI') => setPaymentMethod(value)} value={paymentMethod} className="grid grid-cols-2 gap-3">
                                            <div className="relative">
                                                <RadioGroupItem value="Bank" id="bank" className="peer sr-only" />
                                                <Label htmlFor="bank" className="flex flex-col items-center justify-center h-16 rounded-2xl border-2 border-border bg-muted/20 hover:bg-muted transition-all cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10">
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Bank IMPS</span>
                                                </Label>
                                            </div>
                                            <div className="relative">
                                                <RadioGroupItem value="UPI" id="upi" className="peer sr-only" />
                                                <Label htmlFor="upi" className="flex flex-col items-center justify-center h-16 rounded-2xl border-2 border-border bg-muted/20 hover:bg-muted transition-all cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10">
                                                    <span className="text-[10px] font-black uppercase tracking-widest">UPI ID</span>
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    {paymentMethod === 'Bank' && (
                                        <div className="space-y-4 rounded-3xl bg-muted/20 border border-border p-5 animate-in fade-in zoom-in-95">
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Account Holder</Label>
                                                <Input id="accountHolderName" placeholder="Full Name" value={bankDetails.accountHolderName} onChange={(e) => setBankDetails({...bankDetails, accountHolderName: e.target.value})} className="bg-muted/40 rounded-xl" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-2">
                                                    <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Account No.</Label>
                                                    <Input id="accountNumber" placeholder="XXXXXX" value={bankDetails.accountNumber} onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})} className="bg-muted/40 rounded-xl" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">IFSC Code</Label>
                                                    <Input id="ifscCode" placeholder="BANK0000" value={bankDetails.ifscCode} onChange={(e) => setBankDetails({...bankDetails, ifscCode: e.target.value})} className="bg-muted/40 rounded-xl font-mono uppercase" />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {paymentMethod === 'UPI' && (
                                        <div className="space-y-2 animate-in fade-in zoom-in-95">
                                            <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Your Virtual Payment Address</Label>
                                            <Input id="upiId" placeholder="username@bank" value={upiId} onChange={(e) => setUpiId(e.target.value)} className="h-12 bg-muted/40 rounded-xl font-mono" />
                                        </div>
                                    )}

                                    <Button 
                                        onClick={handleSubmit} 
                                        disabled={parseInt(duration) > 30 || !amount}
                                        className="w-full h-16 rounded-[1.5rem] bg-primary text-primary-foreground font-black uppercase tracking-[3px] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
                                    >
                                        Initiate Protocol
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )
        )}
      </main>

       <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/20 bg-background/95 backdrop-blur-xl h-16 flex items-center justify-around px-4">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={Trophy} label="Leaders" href="/leaderboard" />
          <BottomNavItem icon={HandCoins} label="My Loans" href="/my-loans" />
          <BottomNavItem icon={User} label="Profile" href="/profile" />
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
      <span className="text-[9px] font-black uppercase tracking-tight">{label}</span>
    </Link>
  );
}
