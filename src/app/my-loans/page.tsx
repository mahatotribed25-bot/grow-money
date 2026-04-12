
'use client';
import {
  ChevronLeft,
  Home,
  User,
  Briefcase,
  HandCoins,
  Users as UsersIcon,
  Trophy,
  Copy,
  QrCode,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import { collection, Timestamp, where, query } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEffect, useState } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { addDays } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import Image from 'next/image';

type DurationType = 'Days' | 'Weeks' | 'Months' | 'Years';

type EMI = {
    emiAmount: number;
    dueDate: Timestamp;
    status: 'Pending' | 'Paid' | 'Due' | 'Payment Pending';
}

type Loan = {
  id: string;
  planName: string;
  loanAmount: number;
  totalPayable: number;
  penalty?: number;
  startDate: Timestamp;
  dueDate: Timestamp;
  status: 'Active' | 'Due' | 'Completed' | 'Payment Pending';
  duration: number;
  durationType: DurationType;
  repaymentMethod: 'EMI' | 'Direct';
  emis?: EMI[];
  interest?: number;
};

type AdminSettings = {
    loanPenalty?: number;
    customLoanPenalty?: number;
    adminUpi?: string;
    customLoanUpi?: string;
}

type CustomLoanRequest = {
  id: string;
  requestedAmount: number;
  requestedDuration: number;
  status: 'pending_admin_review' | 'pending_user_approval' | 'approved_by_user' | 'active' | 'completed' | 'rejected_by_user' | 'rejected_by_admin' | 'payment_pending';
  interestRate?: number;
  interestAmount?: number;
  totalRepayment?: number;
  rejectionReason?: string;
  createdAt: Timestamp;
  dueDate?: Timestamp;
  penalty?: number;
};

const CountdownTimer = ({ endDate }: { endDate: Date }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const distance = endDate.getTime() - now.getTime();

            if (distance < 0) {
                setTimeLeft("Due");
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        };
        
        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(interval);
    }, [endDate]);

    return <span className="font-mono">{timeLeft}</span>;
};


export default function MyLoansPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { data: allLoans, loading: loansLoading } =
    useCollection<Loan>(
      user ? `users/${user.uid}/loans` : null
    );
  const { data: adminSettings, loading: settingsLoading } = useDoc<AdminSettings>(user ? 'settings/admin' : null);
  const { data: customLoans, loading: customLoansLoading } = useCollection<CustomLoanRequest>(
      user ? query(collection(firestore, 'customLoanRequests'), where('userId', '==', user.uid)) : null
  );

  const [paymentDetails, setPaymentDetails] = useState<{
    isOpen: boolean;
    loan: Loan | CustomLoanRequest;
    isEmi: boolean;
    emiIndex?: number;
    amount: number;
    upiId: string;
  } | null>(null);

  const loading = userLoading || loansLoading || settingsLoading || customLoansLoading;
  
  const sortedLoans = allLoans?.sort((a,b) => b.startDate.seconds - a.startDate.seconds);
  const sortedCustomLoans = customLoans?.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds);

  const handlePaymentInitiation = (loan: Loan | CustomLoanRequest, amount: number, isEmi: boolean = false, emiIndex?: number) => {
    const isCustom = 'requestedAmount' in loan;
    const upiIdForPayment = isCustom 
        ? adminSettings?.customLoanUpi || adminSettings?.adminUpi || '' 
        : adminSettings?.adminUpi || '';

    if (!upiIdForPayment) {
        toast({ title: "Admin UPI not set", description: "The administrator has not configured a UPI ID for payments.", variant: "destructive"});
        return;
    }

    setPaymentDetails({
      isOpen: true,
      loan,
      amount,
      isEmi,
      emiIndex,
      upiId: upiIdForPayment,
    });
  };

  const handlePaymentConfirmation = async () => {
    if (!user || !paymentDetails || !paymentDetails.loan) return;

    const { loan, isEmi, emiIndex } = paymentDetails;
    const isCustom = 'requestedAmount' in loan;
    const collectionName = isCustom ? 'customLoanRequests' : `users/${user.uid}/loans`;
    const loanRef = doc(firestore, collectionName, loan.id);
    
    let dataToUpdate: any;

    if (!isCustom && isEmi && emiIndex !== undefined) {
      const planLoan = loan as Loan;
      if (!planLoan.emis) return;
      
      const updatedEmis = planLoan.emis.map((emi, index) => 
          index === emiIndex ? { ...emi, status: 'Payment Pending' } : emi
      );
      dataToUpdate = { emis: updatedEmis };
    } else {
      if(isCustom) {
        dataToUpdate = { status: 'payment_pending' };
      } else {
        dataToUpdate = { status: 'Payment Pending' };
      }
    }

    try {
      await updateDoc(loanRef, dataToUpdate);
      toast({
        title: 'Payment Initiated',
        description: 'Your payment is being processed. The admin will confirm it shortly.',
      });
      setPaymentDetails(null); // Close dialog
    } catch (error) {
      const permissionError = new FirestorePermissionError({
        path: loanRef.path,
        operation: 'update',
        requestResourceData: dataToUpdate,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  };
  
  const handleCopyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: `${label} Copied!`, description: text });
  };
  
  const upiDeeplink = paymentDetails?.isOpen && paymentDetails.upiId
    ? `upi://pay?pa=${paymentDetails.upiId}&pn=Grow%20Money&am=${paymentDetails.amount.toFixed(2)}&cu=INR`
    : '';

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 px-4 backdrop-blur-sm sm:px-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">My Loan History</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
         <div className="space-y-4">
            <h2 className="text-xl font-bold">Plan-Based Loans</h2>
            {loading ? <p>Loading loan history...</p> : 
                sortedLoans && sortedLoans.length > 0 ? (
                    sortedLoans.map(loan => <LoanCard key={loan.id} loan={loan} adminSettings={adminSettings} onPayNow={handlePaymentInitiation} />)
                ) : (
                    <Card>
                        <CardContent className="pt-6 text-center text-muted-foreground">
                           <p>You have no active or past loans from plans.</p>
                           <Button asChild variant="link">
                            <Link href="/loans">Apply for a loan</Link>
                           </Button>
                        </CardContent>
                    </Card>
                )
            }
            
            <h2 className="text-xl font-bold mt-8">Custom Loan Requests</h2>
            {loading ? <p>Loading custom loans...</p> : 
                sortedCustomLoans && sortedCustomLoans.length > 0 ? (
                    sortedCustomLoans.map(loan => <CustomLoanCard key={loan.id} loan={loan} adminSettings={adminSettings} onPayNow={handlePaymentInitiation} />)
                ) : (
                    <Card>
                        <CardContent className="pt-6 text-center text-muted-foreground">
                           <p>You have no custom loan requests.</p>
                           <Button asChild variant="link">
                            <Link href="/custom-loan">Request a custom loan</Link>
                           </Button>
                        </CardContent>
                    </Card>
                )
            }
        </div>
      </main>

      <nav className="sticky bottom-0 z-10 border-t border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={Trophy} label="Leaders" href="/leaderboard" />
          <BottomNavItem icon={HandCoins} label="My Loans" href="/my-loans" active/>
          <BottomNavItem icon={User} label="Profile" href="/profile" />
        </div>
      </nav>

      <Dialog open={!!paymentDetails?.isOpen} onOpenChange={() => setPaymentDetails(null)}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Repay Your Loan</DialogTitle>
                <DialogDescription>
                    Please send the payment to the admin's UPI ID. After paying, click the confirmation button below.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
               {paymentDetails?.upiId && upiDeeplink && (
                 <div className="flex flex-col items-center gap-2 p-4 rounded-md bg-muted">
                    <p className="font-semibold">Scan QR Code to Pay</p>
                     <div className="bg-white p-2 rounded-md">
                        <Image
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiDeeplink)}`}
                            alt="UPI QR Code"
                            width={200}
                            height={200}
                        />
                    </div>
                </div>
               )}
                
                <div className="flex items-center justify-between">
                    <Label htmlFor="upiId" className="text-muted-foreground">Admin UPI ID</Label>
                    <div className="flex items-center gap-2">
                        <span id="upiId" className="font-mono">{paymentDetails?.upiId || 'Not available'}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyToClipboard(paymentDetails?.upiId || '', 'UPI ID')}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                 
                <div className="flex items-center justify-between text-lg font-bold">
                    <Label htmlFor="totalAmount">Total to Pay</Label>
                    <div className="flex items-center gap-2">
                        <span id="totalAmount" className="font-mono">₹{paymentDetails?.amount.toFixed(2)}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyToClipboard(paymentDetails?.amount.toFixed(2) || '', 'Amount')}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {upiDeeplink && (
                    <Button asChild className="w-full">
                        <a href={upiDeeplink}>
                            <QrCode className="mr-2" /> Pay with UPI App
                        </a>
                    </Button>
                )}
            </div>
            <DialogFooter className="sm:justify-between">
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="button" onClick={handlePaymentConfirmation}>
                    I have paid, confirm now
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getStatusVariant(status: string) {
    switch (status) {
        case 'Active':
        case 'Paid':
        case 'approved_by_user':
             return 'default';
        case 'Due':
        case 'rejected_by_user':
        case 'rejected_by_admin':
            return 'destructive';
        case 'Payment Pending':
        case 'pending_user_approval':
             return 'outline';
        case 'Completed':
        case 'pending_admin_review':
            return 'secondary';
        default: return 'secondary';
    }
}

function InfoItem({ label, value, isBadge = false, badgeClass }: { label: string, value: string | number, isBadge?: boolean, badgeClass?: string }) {
  const valueAsString = String(value);
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      {isBadge ? (
        <Badge variant={getStatusVariant(valueAsString)} className={cn("capitalize", badgeClass)}>{valueAsString}</Badge>
      ) : (
        <p className="font-semibold">{value}</p>
      )}
    </div>
  );
}


function LoanCard({ loan, adminSettings, onPayNow }: { loan: Loan, adminSettings: AdminSettings | null, onPayNow: (loan: Loan, amount: number, isEmi: boolean, emiIndex?: number) => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);


  useEffect(() => {
    // This effect runs only on the client, preventing hydration mismatch
    const updateCurrentTime = () => setCurrentTime(new Date());
    updateCurrentTime();
    const timer = setInterval(updateCurrentTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkOverdue = async () => {
      if (!user || !adminSettings || !['Active', 'Due'].includes(loan.status) || !currentTime) {
        return;
      }
      
      const dueDate = loan.dueDate.toDate();
      const gracePeriodEndDate = addDays(dueDate, 1);
      
      if (currentTime > gracePeriodEndDate) {
        const dailyPenalty = adminSettings.loanPenalty || 0;
        if (dailyPenalty <= 0) return;

        const overdueMilliseconds = currentTime.getTime() - gracePeriodEndDate.getTime();
        const overdueDays = Math.floor(overdueMilliseconds / (1000 * 60 * 60 * 24)) + 1;
        
        const newPenalty = overdueDays * dailyPenalty;
        
        if (loan.status !== 'Due' || newPenalty > (loan.penalty || 0)) {
          const loanRef = doc(firestore, 'users', user.uid, 'loans', loan.id);
          const dataToUpdate = {
            status: 'Due',
            penalty: newPenalty
          };

          try {
            await updateDoc(loanRef, dataToUpdate);
            if (newPenalty > (loan.penalty || 0)) {
              toast({
                  title: 'Loan Overdue Penalty Applied',
                  description: `Your penalty has been updated. Total penalty is now ₹${newPenalty.toFixed(2)}.`,
                  variant: 'destructive'
              });
            }
          } catch (e) {
            const permissionError = new FirestorePermissionError({
                path: loanRef.path,
                operation: 'update',
                requestResourceData: dataToUpdate
            });
            errorEmitter.emit('permission-error', permissionError);
          }
        }
      }
    };
    
    checkOverdue();
  }, [currentTime, loan, user, firestore, adminSettings, toast]);

  if (!loan.startDate || !loan.dueDate) {
    return null;
  }
  
  const startDate = loan.startDate.toDate();
  const dueDate = loan.dueDate.toDate();
  
  const totalRepayment = loan.totalPayable + (loan.penalty || 0);

  const isEmiPayable = (emi: EMI) => {
      return currentTime && (new Date(emi.dueDate.seconds * 1000) <= currentTime) && emi.status === 'Pending';
  }

  return (
    <Card className="bg-gradient-to-br from-card to-secondary/30 border-primary/10">
      <CardHeader>
        <CardTitle>{loan.planName}</CardTitle>
        <CardDescription>Loan taken on: {startDate.toLocaleDateString()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <InfoItem label="Loan Amount" value={`₹${(loan.loanAmount || 0).toFixed(2)}`} />
            <InfoItem label="Interest" value={`₹${(loan.interest || 0).toFixed(2)}`} />
            <InfoItem label="Repayment Method" value={loan.repaymentMethod} />
            <InfoItem label="Status" value={loan.status} isBadge />
        </div>
        <Separator/>
        <div className="space-y-2">
            <div className="flex justify-between text-sm text-destructive">
                <p className="font-semibold">Overdue Penalty</p>
                <p className="font-semibold">₹{(loan.penalty || 0).toFixed(2)}</p>
            </div>
            <div className="flex justify-between text-lg font-bold">
                <p>Total Repayment Due</p>
                <p>₹{totalRepayment.toFixed(2)}</p>
            </div>
        </div>
        
        {loan.status === 'Active' && currentTime && (
            <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Time Remaining:</span>
                    <CountdownTimer endDate={dueDate} />
                </div>
            </div>
        )}
        
        {loan.repaymentMethod === 'EMI' && loan.emis ? (
            <div className="space-y-2">
                <h4 className="font-semibold text-sm">EMI Schedule</h4>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Amount</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loan.emis.map((emi, index) => (
                            <TableRow key={index}>
                                <TableCell>₹{emi.emiAmount.toFixed(2)}</TableCell>
                                <TableCell>{new Date(emi.dueDate.seconds * 1000).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <Badge variant={getStatusVariant(emi.status)} className="capitalize">{emi.status}</Badge>
                                </TableCell>
                                <TableCell>
                                    {loan.status !== 'Completed' && (
                                         <Button size="sm" onClick={() => onPayNow(loan, emi.emiAmount, true, index)} disabled={!isEmiPayable(emi) || emi.status !== 'Pending'}>
                                            {emi.status === 'Payment Pending' ? 'Processing...' : emi.status === 'Paid' ? 'Paid' : 'Pay Now'}
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        ) : loan.status !== 'Completed' && (
             <Button 
                className="w-full" 
                onClick={() => onPayNow(loan, totalRepayment, false)}
                disabled={loan.status === 'Payment Pending' || loan.status === 'Completed'}
            >
                {loan.status === 'Payment Pending' ? 'Processing Payment...' : 'Pay Full Amount Now'}
            </Button>
        )}

         {loan.status !== 'Completed' && <p className="text-xs text-muted-foreground text-center pt-2">
            Note: Clicking 'Pay Now' will require admin confirmation to complete the payment.
        </p>}
      </CardContent>
    </Card>
  );
}


function CustomLoanCard({ loan, adminSettings, onPayNow }: { loan: CustomLoanRequest, adminSettings: AdminSettings | null, onPayNow: (loan: CustomLoanRequest, amount: number) => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    const updateCurrentTime = () => setCurrentTime(new Date());
    updateCurrentTime();
    const timer = setInterval(updateCurrentTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkOverdue = async () => {
      if (!user || !adminSettings || loan.status !== 'active' || !loan.dueDate || !currentTime) {
        return;
      }
      
      const dueDate = loan.dueDate.toDate();
      const gracePeriodEndDate = addDays(dueDate, 1);
      
      if (currentTime > gracePeriodEndDate) {
        const dailyPenalty = adminSettings.customLoanPenalty || 0;
        if (dailyPenalty <= 0) return;

        const overdueMilliseconds = currentTime.getTime() - gracePeriodEndDate.getTime();
        const overdueDays = Math.floor(overdueMilliseconds / (1000 * 60 * 60 * 24)) + 1;
        
        const newPenalty = overdueDays * dailyPenalty;
        
        if (newPenalty > (loan.penalty || 0)) {
          const loanRef = doc(firestore, 'customLoanRequests', loan.id);
          const dataToUpdate = { penalty: newPenalty };

          try {
            await updateDoc(loanRef, dataToUpdate);
            if (newPenalty > (loan.penalty || 0)) {
              toast({
                  title: 'Custom Loan Overdue Penalty',
                  description: `Your penalty has been updated. Total penalty is now ₹${newPenalty.toFixed(2)}.`,
                  variant: 'destructive'
              });
            }
          } catch (e) {
            const permissionError = new FirestorePermissionError({
                path: loanRef.path,
                operation: 'update',
                requestResourceData: dataToUpdate
            });
            errorEmitter.emit('permission-error', permissionError);
          }
        }
      }
    };
    
    checkOverdue();
  }, [currentTime, loan, user, firestore, adminSettings, toast]);

  const handleUpdateStatus = async (newStatus: 'approved_by_user' | 'rejected_by_user') => {
    const requestRef = doc(firestore, 'customLoanRequests', loan.id);
    const updateData = { 
        status: newStatus,
        ...(newStatus === 'approved_by_user' && { userApprovedAt: serverTimestamp() })
    };
    try {
      await updateDoc(requestRef, updateData);
      toast({ title: `Loan offer ${newStatus === 'approved_by_user' ? 'Accepted' : 'Rejected'}` });
    } catch (e) {
      const permissionError = new FirestorePermissionError({
        path: requestRef.path,
        operation: 'update',
        requestResourceData: updateData,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  };
  
  const isOverdue = currentTime && loan.dueDate && currentTime > loan.dueDate.toDate();
  const totalRepayment = (loan.totalRepayment || 0) + (loan.penalty || 0);

  return (
    <Card className="bg-gradient-to-br from-card to-secondary/30 border-primary/10">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
            <span>Custom Loan Request</span>
            <Badge variant={getStatusVariant(loan.status)} className="capitalize">{loan.status}</Badge>
        </CardTitle>
        <CardDescription>Requested on: {loan.createdAt.toDate().toLocaleDateString()}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Requested Amount" value={`₹${(loan.requestedAmount || 0).toFixed(2)}`} />
                <InfoItem label="Requested Duration" value={`${loan.requestedDuration} days`} />
            </div>
            
            {loan.status === 'pending_user_approval' ? (
                <div className="p-4 bg-muted/50 rounded-lg space-y-3 mt-4">
                    <h4 className="font-bold text-center">Admin's Offer</h4>
                     <div className="flex justify-between text-sm">
                        <p className="text-muted-foreground">Interest Rate</p>
                        <p className="font-semibold">{loan.interestRate}%</p>
                    </div>
                     <div className="flex justify-between text-sm">
                        <p className="text-muted-foreground">Interest Amount</p>
                        <p className="font-semibold text-red-400">₹{(loan.interestAmount || 0).toFixed(2)}</p>
                    </div>
                     <div className="flex justify-between text-sm font-bold">
                        <p>Total Repayment</p>
                        <p>₹{(loan.totalRepayment || 0).toFixed(2)}</p>
                    </div>
                    <div className="flex gap-4 pt-2">
                        <Button className="w-full" onClick={() => handleUpdateStatus('approved_by_user')}>Accept Offer</Button>
                        <Button className="w-full" variant="destructive" onClick={() => handleUpdateStatus('rejected_by_user')}>Reject Offer</Button>
                    </div>
                </div>
            ) : (loan.status === 'active' || loan.status === 'payment_pending') && (
                 <div className="p-4 bg-muted/50 rounded-lg space-y-3 mt-4">
                    <h4 className="font-bold text-center">Active Loan Details</h4>
                    {isOverdue && (
                        <div className="flex justify-between text-sm text-destructive">
                            <p className="font-semibold">Overdue Penalty</p>
                            <p className="font-semibold">₹{(loan.penalty || 0).toFixed(2)}</p>
                        </div>
                    )}
                     <div className="flex justify-between text-lg font-bold">
                        <p>Total Repayment Due</p>
                        <p>₹{totalRepayment.toFixed(2)}</p>
                    </div>
                    {loan.status === 'active' && loan.dueDate && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Time Remaining:</span>
                                {isOverdue ? (
                                    <span className="font-semibold text-destructive">Overdue</span>
                                ) : (
                                    <CountdownTimer endDate={loan.dueDate.toDate()} />
                                )}
                            </div>
                        </div>
                    )}
                     {(isOverdue || loan.status === 'payment_pending') && (
                        <Button className="w-full" onClick={() => onPayNow(loan, totalRepayment)} disabled={loan.status === 'payment_pending'}>
                            {loan.status === 'payment_pending' ? 'Processing Payment...' : 'Pay Now'}
                        </Button>
                    )}
                </div>
            )}
            
            {loan.status === 'rejected_by_admin' && loan.rejectionReason && (
                 <p className="text-sm text-destructive">Reason for rejection: {loan.rejectionReason}</p>
            )}

            {loan.status === 'approved_by_user' && (
                <p className="text-sm text-green-400 text-center">You have approved the loan. Waiting for admin to send the funds.</p>
            )}
        </div>
      </CardContent>
    </Card>
  )
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
