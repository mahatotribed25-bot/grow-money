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
  Timer,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import { collection, Timestamp, where, query, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEffect, useState, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

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
  interest?: number;
  emis?: EMI[];
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
  status: 'pending_admin_review' | 'pending_user_approval' | 'approved_by_user' | 'active' | 'completed' | 'rejected_by_user' | 'rejected_by_admin' | 'payment_pending' | 'extension_pending';
  interestRate?: number;
  interestAmount?: number;
  totalRepayment?: number;
  rejectionReason?: string;
  createdAt: Timestamp;
  dueDate?: Timestamp;
  penalty?: number;
  extensionRequestedDays?: number;
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
    emiIndices?: number[];
    amount: number;
    upiId: string;
  } | null>(null);

  const [extensionLoan, setExtensionLoan] = useState<CustomLoanRequest | null>(null);
  const [extensionDays, setExtensionDays] = useState('5');

  const loading = userLoading || loansLoading || settingsLoading || customLoansLoading;
  
  const sortedLoans = allLoans?.sort((a,b) => b.startDate.seconds - a.startDate.seconds);
  const sortedCustomLoans = customLoans?.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds);

  const handlePaymentInitiation = (loan: Loan | CustomLoanRequest, amount: number, isEmi: boolean = false, emiIndices?: number[]) => {
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
      emiIndices,
      upiId: upiIdForPayment,
    });
  };

  const handlePaymentConfirmation = async () => {
    if (!user || !paymentDetails || !paymentDetails.loan) return;

    const { loan, isEmi, emiIndices } = paymentDetails;
    const isCustom = 'requestedAmount' in loan;
    const collectionName = isCustom ? 'customLoanRequests' : `users/${user.uid}/loans`;
    const loanRef = doc(firestore, collectionName, loan.id);
    
    let dataToUpdate: any;

    if (!isCustom && isEmi && emiIndices && emiIndices.length > 0) {
      const planLoan = loan as Loan;
      if (!planLoan.emis) return;
      
      const updatedEmis = planLoan.emis.map((emi, index) => 
          emiIndices.includes(index) ? { ...emi, status: 'Payment Pending' } : emi
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
      setPaymentDetails(null); 
    } catch (error) {
      const permissionError = new FirestorePermissionError({
        path: loanRef.path,
        operation: 'update',
        requestResourceData: dataToUpdate,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  const handleRequestExtension = async () => {
    if (!extensionLoan) return;
    const days = parseInt(extensionDays);
    if (isNaN(days) || days <= 0 || days > 15) {
      toast({ title: "Invalid Extension", description: "You can request between 1 and 15 extra days.", variant: "destructive" });
      return;
    }

    const loanRef = doc(firestore, 'customLoanRequests', extensionLoan.id);
    const updateData = {
      status: 'extension_pending',
      extensionRequestedDays: days,
      extensionRequestedAt: serverTimestamp()
    };

    try {
      await updateDoc(loanRef, updateData);
      toast({ title: "Extension Requested", description: "Your extension request has been sent to the admin." });
      setExtensionLoan(null);
    } catch (e) {
      const permissionError = new FirestorePermissionError({
        path: loanRef.path,
        operation: 'update',
        requestResourceData: updateData
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
    <div className="flex min-h-screen w-full flex-col bg-transparent text-foreground relative z-10">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.05] bg-black/40 px-4 backdrop-blur-xl sm:px-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white/70">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Loan Ledger</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-8">
         <div className="space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-[4px] text-white/30 flex items-center gap-2">
                <Briefcase size={16} /> Standard Loans
            </h2>
            {loading ? (
                 <div className="flex justify-center p-10"><Timer className="animate-spin text-primary" /></div>
            ) : sortedLoans && sortedLoans.length > 0 ? (
                <div className="grid gap-6">
                   {sortedLoans.map(loan => <LoanCard key={loan.id} loan={loan} adminSettings={adminSettings} onPayNow={handlePaymentInitiation} />)}
                </div>
            ) : (
                <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-3xl p-10 text-center border-dashed">
                    <CardContent className="space-y-4">
                       <p className="text-white/40 text-sm">You have no active plan-based loans.</p>
                       <Button asChild variant="outline" className="border-white/10 h-10 rounded-xl">
                        <Link href="/loans">Apply Now</Link>
                       </Button>
                    </CardContent>
                </Card>
            )}
            
            <h2 className="text-sm font-bold uppercase tracking-[4px] text-white/30 flex items-center gap-2 pt-6">
                <HandCoins size={16} /> Custom Flexi Loans
            </h2>
            {loading ? (
                <div className="flex justify-center p-10"><Timer className="animate-spin text-primary" /></div>
            ) : sortedCustomLoans && sortedCustomLoans.length > 0 ? (
                <div className="grid gap-6">
                    {sortedCustomLoans.map(loan => <CustomLoanCard key={loan.id} loan={loan} adminSettings={adminSettings} onPayNow={handlePaymentInitiation} onOpenExtension={() => setExtensionLoan(loan)} />)}
                </div>
            ) : (
                <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-3xl p-10 text-center border-dashed">
                    <CardContent className="space-y-4">
                       <p className="text-white/40 text-sm">No custom loan requests found.</p>
                       <Button asChild variant="outline" className="border-white/10 h-10 rounded-xl">
                        <Link href="/custom-loan">Quick Request</Link>
                       </Button>
                    </CardContent>
                </Card>
            )}
        </div>
      </main>

      <nav className="sticky bottom-0 z-20 border-t border-white/[0.05] bg-black/40 backdrop-blur-xl">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs font-medium">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={Trophy} label="Leaders" href="/leaderboard" />
          <BottomNavItem icon={HandCoins} label="Loans" href="/my-loans" active/>
          <BottomNavItem icon={User} label="Profile" href="/profile" />
        </div>
      </nav>

      {/* Payment Confirmation Dialog */}
      <Dialog open={!!paymentDetails?.isOpen} onOpenChange={() => setPaymentDetails(null)}>
        <DialogContent className="bg-[#030408]/90 backdrop-blur-2xl border-white/10 text-white sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Repay Your Loan</DialogTitle>
                <DialogDescription className="text-white/40">
                    Process your repayment securely via UPI. Admin verification required.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
               {paymentDetails?.upiId && upiDeeplink && (
                 <div className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-xs font-black uppercase tracking-widest text-white/30">Scan to Pay</p>
                     <div className="bg-white p-3 rounded-2xl shadow-2xl">
                        <Image
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiDeeplink)}`}
                            alt="UPI QR Code"
                            width={160}
                            height={160}
                        />
                    </div>
                </div>
               )}
                
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-white/30">Admin ID</span>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-white/80">{paymentDetails?.upiId || '---'}</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10" onClick={() => handleCopyToClipboard(paymentDetails?.upiId || '', 'UPI ID')}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <Separator className="bg-white/5" />
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-white/30">Total Payable</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-black text-green-400">₹{paymentDetails?.amount.toFixed(2)}</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10" onClick={() => handleCopyToClipboard(paymentDetails?.amount.toFixed(2) || '', 'Amount')}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {upiDeeplink && (
                    <Button asChild className="w-full h-12 rounded-xl font-bold bg-white text-black hover:bg-white/90 shadow-xl shadow-white/5 transition-all">
                        <a href={upiDeeplink}>
                            <QrCode className="mr-2" /> Pay with UPI App
                        </a>
                    </Button>
                )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                    <Button variant="ghost" className="text-white/40 hover:bg-white/5">Cancel</Button>
                </DialogClose>
                <Button onClick={handlePaymentConfirmation} className="rounded-xl font-bold bg-primary text-white">I Have Paid</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extension Dialog */}
      <Dialog open={!!extensionLoan} onOpenChange={() => setExtensionLoan(null)}>
        <DialogContent className="bg-[#030408]/90 backdrop-blur-2xl border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Request Loan Extension</DialogTitle>
            <DialogDescription className="text-white/40">
              Increase your repayment window. Extensions may involve extra fees.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white/60">Additional Time</Label>
              <Select value={extensionDays} onValueChange={setExtensionDays}>
                <SelectTrigger className="bg-white/5 border-white/10 rounded-xl h-11">
                  <SelectValue placeholder="Select extra days" />
                </SelectTrigger>
                <SelectContent className="bg-[#030408] border-white/10">
                  {[1, 3, 5, 7, 10, 15].map(d => (
                    <SelectItem key={d} value={d.toString()}>{d} Extra Days</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost" className="text-white/40 hover:bg-white/5">Discard</Button></DialogClose>
            <Button onClick={handleRequestExtension} className="rounded-xl font-bold bg-primary text-white">Apply Extension</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getBadgeStyle(status: string) {
    switch (status) {
        case 'Active':
        case 'active':
             return "bg-primary/20 text-primary border-primary/30";
        case 'Due':
             return "bg-red-500/20 text-red-400 border-red-500/30";
        case 'Completed':
        case 'completed':
             return "bg-green-500/20 text-green-400 border-green-500/30";
        case 'Payment Pending':
        case 'payment_pending':
             return "bg-blue-500/20 text-blue-400 border-blue-500/30";
        default: return "bg-white/5 text-white/40 border-white/10";
    }
}

function InfoItem({ label, value, isBadge = false, status }: { label: string, value: string | number, isBadge?: boolean, status?: string }) {
  return (
    <div className="flex flex-col bg-white/5 p-3 rounded-2xl border border-white/5">
      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">{label}</span>
      {isBadge ? (
        <Badge variant="outline" className={cn("text-[9px] uppercase font-black tracking-widest border-white/5", getBadgeStyle(status || String(value)))}>{String(value)}</Badge>
      ) : (
        <span className="text-sm font-bold text-white/90 tracking-tight">{value}</span>
      )}
    </div>
  );
}


function LoanCard({ loan, adminSettings, onPayNow }: { loan: Loan, adminSettings: AdminSettings | null, onPayNow: (loan: Loan, amount: number, isEmi: boolean, emiIndices?: number[]) => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [selectedEmis, setSelectedEmis] = useState<number[]>([]);


  useEffect(() => {
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

  const toggleEmiSelection = (index: number) => {
    setSelectedEmis(prev => 
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  }

  const selectedTotal = useMemo(() => {
    if (!loan.emis) return 0;
    return selectedEmis.reduce((sum, index) => sum + (loan.emis![index]?.emiAmount || 0), 0);
  }, [selectedEmis, loan.emis]);

  return (
    <Card className="shadow-2xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl rounded-3xl overflow-hidden relative group">
      <CardHeader className="pb-3 border-b border-white/[0.05] bg-white/[0.01]">
        <div className="flex justify-between items-center">
            <div>
                <CardTitle className="text-white font-bold tracking-tight">{loan.planName}</CardTitle>
                <CardDescription className="text-white/30 text-xs">Contract Start: {startDate.toLocaleDateString()}</CardDescription>
            </div>
            <Badge variant="outline" className={cn("text-[10px] uppercase font-black tracking-widest border-white/5", getBadgeStyle(loan.status))}>
                {loan.status}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid grid-cols-2 gap-3">
            <InfoItem label="Principal" value={`₹${(loan.loanAmount || 0).toFixed(2)}`} />
            <InfoItem label="Interest" value={`₹${(loan.interest || 0).toFixed(2)}`} />
            <InfoItem label="Repayment" value={loan.repaymentMethod} />
            <InfoItem label="End Date" value={dueDate.toLocaleDateString()} />
        </div>

        <div className="bg-black/40 rounded-2xl p-5 border border-white/5 space-y-4">
             <div className="flex justify-between text-[10px] font-black uppercase tracking-[3px] text-white/20">
                <span>Current Obligations</span>
                {loan.penalty! > 0 && <span className="text-red-400 font-black">+₹{loan.penalty?.toFixed(2)} Penalty</span>}
             </div>
             <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-white/60">Total Amount Due</span>
                <span className="text-2xl font-black text-white tracking-tighter">₹{totalRepayment.toFixed(2)}</span>
             </div>
        </div>
        
        {loan.status === 'Active' && currentTime && (
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/20 px-2">
                <span className="flex items-center gap-1.5"><Timer size={14} className="text-primary animate-pulse" /> Time Remaining</span>
                <CountdownTimer endDate={dueDate} />
            </div>
        )}
        
        {loan.repaymentMethod === 'EMI' && loan.emis ? (
            <div className="space-y-4">
                <div className="flex items-center justify-between pl-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Repayment Schedule</p>
                    {selectedEmis.length > 0 && (
                        <Button 
                            size="sm" 
                            className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest bg-green-500 hover:bg-green-600 text-white animate-in zoom-in-95"
                            onClick={() => onPayNow(loan, selectedTotal, true, selectedEmis)}
                        >
                            Pay Selected (₹{selectedTotal.toFixed(2)})
                        </Button>
                    )}
                </div>
                <div className="rounded-2xl border border-white/5 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-white/[0.02]">
                            <TableRow className="border-white/5">
                                <TableHead className="w-10 pl-4"></TableHead>
                                <TableHead className="text-[9px] uppercase font-black tracking-widest text-white/20">Due Date</TableHead>
                                <TableHead className="text-[9px] uppercase font-black tracking-widest text-white/20">Installment</TableHead>
                                <TableHead className="text-right pr-4 text-[9px] uppercase font-black tracking-widest text-white/20">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loan.emis.map((emi, index) => (
                                <TableRow key={index} className="border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                                    <TableCell className="pl-4">
                                        {emi.status === 'Pending' && (
                                            <Checkbox 
                                                checked={selectedEmis.includes(index)} 
                                                onCheckedChange={() => toggleEmiSelection(index)}
                                                className="border-white/20 data-[state=checked]:bg-primary"
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs text-white/60">{new Date(emi.dueDate.seconds * 1000).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <span className="text-sm font-bold text-white">₹{emi.emiAmount.toFixed(2)}</span>
                                    </TableCell>
                                    <TableCell className="text-right pr-4">
                                        <Badge variant="outline" className={cn("text-[8px] h-4 border-white/5 uppercase", getBadgeStyle(emi.status))}>{emi.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        ) : (
             loan.status !== 'Completed' && (
                <Button 
                    className="w-full h-12 rounded-xl font-bold bg-white text-black hover:bg-white/90 shadow-xl shadow-white/5 transition-all" 
                    onClick={() => onPayNow(loan, totalRepayment, false)}
                    disabled={loan.status === 'Payment Pending' || loan.status === 'Completed'}
                >
                    {loan.status === 'Payment Pending' ? 'Settlement Processing...' : 'Settle Full Debt Now'}
                </Button>
             )
        )}
      </CardContent>
    </Card>
  );
}


function CustomLoanCard({ loan, adminSettings, onPayNow, onOpenExtension }: { loan: CustomLoanRequest, adminSettings: AdminSettings | null, onPayNow: (loan: CustomLoanRequest, amount: number) => void, onOpenExtension: () => void }) {
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
        
        if (loan.status !== 'Due' || newPenalty > (loan.penalty || 0)) {
          const loanRef = doc(firestore, 'customLoanRequests', loan.id);
          const dataToUpdate = { penalty: newPenalty };

          try {
            await updateDoc(loanRef, dataToUpdate);
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

  const statusLabel = loan.status === 'extension_pending' ? 'Extension Pending' : loan.status;

  return (
    <Card className="shadow-2xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl rounded-3xl overflow-hidden relative group">
      <CardHeader className="pb-3 border-b border-white/[0.05] bg-white/[0.01]">
        <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-white tracking-tight">Flexi Request</span>
            <Badge variant="outline" className={cn("text-[10px] uppercase font-black tracking-widest border-white/5", getBadgeStyle(loan.status))}>
                {statusLabel.replace('_', ' ')}
            </Badge>
        </div>
        <CardDescription className="text-white/30 text-[10px] uppercase tracking-widest font-bold">Created: {loan.createdAt.toDate().toLocaleDateString()}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-5">
        <div className="grid grid-cols-2 gap-3">
            <InfoItem label="Requested Amount" value={`₹${(loan.requestedAmount || 0).toFixed(2)}`} />
            <InfoItem label="Term" value={`${loan.requestedDuration} days`} />
        </div>
        
        {loan.status === 'pending_user_approval' ? (
            <div className="bg-primary/10 rounded-2xl p-5 border border-primary/20 space-y-4">
                <div className="flex flex-col items-center text-center gap-1">
                    <p className="text-[10px] font-black uppercase tracking-[3px] text-primary/60">Administrative Offer</p>
                    <div className="flex items-center gap-4 py-2">
                        <div>
                             <p className="text-[10px] text-white/30 uppercase font-bold">Interest Rate</p>
                             <p className="text-sm font-bold text-white">{loan.interestRate}%</p>
                        </div>
                        <div className="h-6 w-px bg-white/10" />
                        <div>
                             <p className="text-[10px] text-white/30 uppercase font-bold">Cost</p>
                             <p className="text-sm font-bold text-red-400">₹{(loan.interestAmount || 0).toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                 <div className="flex justify-between items-center border-t border-primary/10 pt-4">
                    <span className="text-sm font-bold text-white/80">Total Repayment</span>
                    <span className="text-2xl font-black text-white tracking-tighter">₹{(loan.totalRepayment || 0).toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button className="rounded-xl font-bold bg-white text-black hover:bg-white/90" onClick={() => handleUpdateStatus('approved_by_user')}>Accept</Button>
                    <Button variant="ghost" className="rounded-xl font-bold text-red-400 hover:bg-red-400/10" onClick={() => handleUpdateStatus('rejected_by_user')}>Decline</Button>
                </div>
            </div>
        ) : (loan.status === 'active' || loan.status === 'payment_pending' || loan.status === 'extension_pending') && (
             <div className="space-y-4">
                <div className="bg-black/40 rounded-2xl p-5 border border-white/5 space-y-4">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-[3px] text-white/20">
                        <span>Repayment Detail</span>
                        {isOverdue && <span className="text-red-400 font-black">+₹{loan.penalty?.toFixed(2)} Penalty</span>}
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-white/60">Payable Now</span>
                        <span className="text-2xl font-black text-white tracking-tighter">₹{totalRepayment.toFixed(2)}</span>
                    </div>
                </div>

                {loan.status === 'active' && loan.dueDate && (
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/20 px-2">
                        <span className="flex items-center gap-1.5"><Timer size={14} className="text-primary animate-pulse" /> Time Remaining</span>
                        {isOverdue ? <span className="text-red-400">Past Due</span> : <CountdownTimer endDate={loan.dueDate.toDate()} />}
                    </div>
                )}
                
                {loan.status === 'extension_pending' && (
                   <div className="text-center p-3 rounded-xl bg-blue-500/10 text-blue-300 text-[10px] font-bold uppercase tracking-widest border border-blue-500/20">
                      Processing Extension Request (+{loan.extensionRequestedDays} days)
                   </div>
                )}

                <div className="grid gap-3 pt-2">
                    {(isOverdue || loan.status === 'payment_pending' || loan.status === 'active') && (
                        <Button className="h-12 rounded-xl font-bold bg-white text-black hover:bg-white/90 shadow-xl shadow-white/5" onClick={() => onPayNow(loan, totalRepayment)} disabled={loan.status === 'payment_pending'}>
                            {loan.status === 'payment_pending' ? 'Verification in Progress...' : 'Confirm Repayment'}
                        </Button>
                    )}
                    {loan.status === 'active' && !isOverdue && (
                        <Button variant="ghost" className="h-10 rounded-xl font-bold text-white/40 hover:bg-white/5" onClick={onOpenExtension}>
                            <PlusCircle className="h-4 w-4 mr-2" /> Request More Time
                        </Button>
                    )}
                </div>
            </div>
        )}
        
        {loan.status === 'rejected_by_admin' && (
             <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">Rejection Message</p>
                <p className="text-xs text-red-200/60 leading-relaxed">{loan.rejectionReason || 'No specific reason provided.'}</p>
             </div>
        )}

        {loan.status === 'approved_by_user' && (
            <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 text-center animate-pulse">
                <p className="text-sm font-bold text-primary/80">Approved. Transferring Funds...</p>
                <p className="text-[10px] text-white/20 uppercase tracking-widest mt-1">Check your wallet shortly.</p>
            </div>
        )}
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
      className={cn(
        "flex flex-col items-center justify-center gap-1 transition-all h-full relative",
        active ? 'text-primary scale-110' : 'text-white/40 hover:text-white/60'
      )}
    >
      <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]")} />
      <span className="text-[10px] tracking-tight">{label}</span>
      {active && <div className="absolute -bottom-1 h-1 w-8 bg-primary rounded-full blur-[2px]" />}
    </Link>
  );
}
