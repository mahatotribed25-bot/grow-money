'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  Home,
  User,
  Briefcase,
  HandCoins,
  Send,
  Timer,
  AlertCircle,
  Zap,
  CheckCircle2,
  Loader2,
  Trophy,
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
      user ? query(collection(firestore, 'customLoanRequests'), where('userId', '==', user.uid), where('status', 'in', ['pending_admin_review', 'pending_user_approval', 'approved_by_user', 'active', 'payment_pending', 'extension_pending'])) : null
  );

  const maxAmount = adminSettings?.maxCustomLoanAmount || 5000;
  const totalLimit = adminSettings?.totalCustomLoanLimit || 0;
  const currentUsage = adminSettings?.currentCustomLoanUsage || 0;
  const availableLimit = Math.max(0, totalLimit - currentUsage);

  const isServiceEnabled = totalLimit > 0;
  const isLimitExhausted = isServiceEnabled && availableLimit <= 0;

  const hasActiveRequest = existingRequests && existingRequests.length > 0;
  const pendingRequest = existingRequests?.find(r => r.status === 'pending_admin_review');
  
  useEffect(() => {
    if (userData?.upiId && userData?.upiStatus === 'Verified' && !upiId) {
        setUpiId(userData.upiId);
    }
  }, [userData, upiId]);

  const calculatedInfo = useMemo(() => {
    const principal = parseFloat(amount);
    const days = parseInt(duration, 10);
    
    if (principal > 0 && days > 0) {
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
      toast({ title: 'Please login first.', variant: 'destructive' });
      return;
    }
    const requestedAmount = parseFloat(amount);
    const requestedDuration = parseInt(duration, 10);

    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      toast({ title: 'Invalid Amount', description: 'Enter a valid amount.', variant: 'destructive' });
      return;
    }
    if (isNaN(requestedDuration) || requestedDuration <= 0 || requestedDuration > 30) {
      toast({ title: 'Invalid Days', description: 'Duration must be between 1 to 30 days.', variant: 'destructive' });
      return;
    }

    if (requestedAmount > maxAmount) {
      toast({ title: 'Amount Too High', description: `Max limit per user is ₹${maxAmount}.`, variant: 'destructive' });
      return;
    }
    if (requestedAmount > availableLimit) {
        toast({ title: 'Limit Exceeded', description: `Only ₹${availableLimit.toFixed(2)} is available right now.`, variant: 'destructive' });
        return;
    }
    if (hasActiveRequest) {
        toast({ title: 'Request Exists', description: 'You already have an active loan or request.', variant: 'destructive' });
        return;
    }

    if (!paymentMethod) {
        toast({ title: 'Select Payment Method', variant: 'destructive' });
        return;
    }

    const requestData: any = {
      userId: user.uid,
      userName: userData?.name || user.displayName,
      requestedAmount,
      requestedDuration,
      paymentMethod,
      status: 'pending_admin_review' as const,
      createdAt: serverTimestamp(),
    };

    if (paymentMethod === 'UPI') {
        if (!upiId.trim()) { toast({ title: 'Enter UPI ID', variant: 'destructive' }); return; }
        requestData.upiId = upiId;
    } else {
        if (!bankDetails.accountNumber || !bankDetails.ifscCode) { toast({ title: 'Fill Bank Details', variant: 'destructive' }); return; }
        requestData.bankDetails = bankDetails;
    }

    const customLoanRequestsCollection = collection(firestore, 'customLoanRequests');
    addDoc(customLoanRequestsCollection, requestData)
        .then(() => {
            toast({ title: 'Request Sent', description: 'Admin will review and send you an offer soon.' });
            setAmount('');
            setDuration('');
        })
        .catch((error) => {
            const permissionError = new FirestorePermissionError({
                path: '/customLoanRequests',
                operation: 'create',
                requestResourceData: requestData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
  };

  const handleNotifyAdmin = () => {
    if (!adminSettings?.adminPhone) return;
    const request = pendingRequest || existingRequests?.[0];
    if (!request) return;
    const message = `Hello Admin, I am *${userData?.name || user?.displayName}*. I have requested a loan of ₹${request.requestedAmount}. Please check.`;
    window.open(`https://wa.me/91${adminSettings.adminPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 px-4 backdrop-blur-sm sm:px-6">
        <Link href="/dashboard"><Button variant="ghost" size="icon"><ChevronLeft /></Button></Link>
        <h1 className="text-lg font-black tracking-tight uppercase">Flexible Loan</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {(settingsLoading || requestsLoading) ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
        ) : (
            !isServiceEnabled ? (
                <Card className="bg-muted/20 border-dashed border-border py-12 text-center">
                    <p className="text-muted-foreground font-bold">Service Temporarily Unavailable</p>
                </Card>
            ) : isLimitExhausted ? (
                <Card className="border-amber-500/50 bg-amber-500/5 rounded-3xl p-8 text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500"><Timer size={32} /></div>
                    <h3 className="text-xl font-bold">Platform Limit Reached</h3>
                    <p className="text-xs text-white/40">The platform has given out all available loans. Please check back later today.</p>
                </Card>
            ) : (
                <div className="space-y-6">
                    <div className="bg-primary/5 border border-primary/20 p-5 rounded-3xl flex justify-between items-center shadow-sm">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Available Platform Fund</p>
                            <p className="text-2xl font-black text-white">₹{availableLimit.toLocaleString()}</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><HandCoins /></div>
                    </div>

                    <Card className="bg-card border-border rounded-[2rem] shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-xl font-black">Apply for Loan</CardTitle>
                            <CardDescription>Max tenure is 30 days. No paperwork required.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pb-10">
                            {hasActiveRequest ? (
                                <div className="text-center p-6 rounded-2xl bg-yellow-500/5 border border-yellow-500/10 space-y-4">
                                    <p className="text-sm font-bold text-yellow-500">You already have an active loan or pending request.</p>
                                    <Button variant="outline" className="w-full h-12 rounded-xl text-green-500 border-green-500/20" onClick={handleNotifyAdmin}>
                                        Message Admin on WhatsApp
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Loan Amount</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">₹</span>
                                                <Input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} className="h-12 pl-7 rounded-xl font-black bg-muted/50" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Duration (Days)</Label>
                                            <Input type="number" placeholder="1-30" value={duration} onChange={e => setDuration(e.target.value)} className="h-12 rounded-xl font-black bg-muted/50" />
                                        </div>
                                    </div>

                                    {calculatedInfo && (
                                        <div className="bg-muted/40 p-4 rounded-2xl border border-border space-y-3 animate-in zoom-in-95">
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="text-muted-foreground">Daily Interest:</span>
                                                <span className="text-white">₹{calculatedInfo.dailyInterest.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="text-muted-foreground">Total Interest:</span>
                                                <span className="text-red-400">+ ₹{calculatedInfo.totalInterest.toFixed(2)}</span>
                                            </div>
                                            <Separator className="bg-border/10" />
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black uppercase text-muted-foreground">Total Repayment</span>
                                                <span className="text-xl font-black">₹{calculatedInfo.totalRepayment.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Receive Money In</Label>
                                        <RadioGroup onValueChange={(v: any) => setPaymentMethod(v)} value={paymentMethod} className="grid grid-cols-2 gap-3">
                                            <div className="relative">
                                                <RadioGroupItem value="Bank" id="bank" className="peer sr-only" />
                                                <Label htmlFor="bank" className="flex flex-col items-center justify-center h-14 rounded-xl border-2 border-border bg-muted/20 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10">
                                                    <span className="text-xs font-bold">Bank IMPS</span>
                                                </Label>
                                            </div>
                                            <div className="relative">
                                                <RadioGroupItem value="UPI" id="upi" className="peer sr-only" />
                                                <Label htmlFor="upi" className="flex flex-col items-center justify-center h-14 rounded-xl border-2 border-border bg-muted/20 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10">
                                                    <span className="text-xs font-bold">UPI ID</span>
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    {paymentMethod === 'UPI' && (
                                        <div className="space-y-3 animate-in fade-in">
                                            <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Your UPI Address</Label>
                                            <Input placeholder="username@bank" value={upiId} onChange={e => setUpiId(e.target.value)} className="h-12 rounded-xl font-mono" />
                                            {userData?.upiId && userData?.upiStatus === 'Verified' && (
                                                <Button variant="ghost" size="sm" onClick={() => setUpiId(userData.upiId)} className="h-7 text-[9px] font-black text-primary gap-1.5 uppercase hover:bg-primary/5">
                                                    <CheckCircle2 size={12} /> Use Verified UPI
                                                </Button>
                                            )}
                                        </div>
                                    )}

                                    {paymentMethod === 'Bank' && (
                                        <div className="space-y-3 animate-in fade-in">
                                            <Input placeholder="Account Holder Name" value={bankDetails.accountHolderName} onChange={e => setBankDetails({...bankDetails, accountHolderName: e.target.value})} className="h-11 rounded-xl" />
                                            <div className="grid grid-cols-2 gap-3">
                                                <Input placeholder="Account Number" value={bankDetails.accountNumber} onChange={e => setBankDetails({...bankDetails, accountNumber: e.target.value})} className="h-11 rounded-xl" />
                                                <Input placeholder="IFSC Code" value={bankDetails.ifscCode} onChange={e => setBankDetails({...bankDetails, ifscCode: e.target.value})} className="h-11 rounded-xl uppercase" />
                                            </div>
                                        </div>
                                    )}

                                    <Button onClick={handleSubmit} disabled={!amount || !duration || !paymentMethod} className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95">
                                        Submit Loan Request
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

function BottomNavItem({ icon: Icon, label, href, active = false }: { icon: React.ElementType, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={cn("flex flex-col items-center justify-center gap-1 transition-all h-full relative", active ? 'text-primary' : 'text-muted-foreground')}>
      <Icon className="h-5 w-5" />
      <span className="text-[9px] font-black uppercase tracking-tight">{label}</span>
    </Link>
  );
}
