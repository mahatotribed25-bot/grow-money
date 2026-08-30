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
  Calendar,
  ShieldCheck,
  Info,
  TrendingUp,
  XCircle,
  ArrowUpRight,
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
import { Progress } from '@/components/ui/progress';

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
  activatedAt?: Timestamp;
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
        toast({ title: "Admin UPI not set", variant: "destructive"});
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

  const handlePaymentConfirmation = () => {
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
      dataToUpdate = { status: isCustom ? 'payment_pending' : 'Payment Pending' };
    }

    updateDoc(loanRef, dataToUpdate)
        .then(() => {
            toast({
                title: 'Payment Initiated',
                description: 'Your payment is being processed.',
            });
            setPaymentDetails(null);
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: loanRef.path,
                operation: 'update',
                requestResourceData: dataToUpdate,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
  };

  const handleRequestExtension = () => {
    if (!extensionLoan) return;
    const days = parseInt(extensionDays);
    if (isNaN(days) || days <= 0 || days > 15) {
      toast({ title: "Invalid Extension", variant: "destructive" });
      return;
    }

    const loanRef = doc(firestore, 'customLoanRequests', extensionLoan.id);
    const updateData = {
      status: 'extension_pending',
      extensionRequestedDays: days,
      extensionRequestedAt: serverTimestamp()
    };

    updateDoc(loanRef, updateData)
        .then(() => {
            toast({ title: "Extension Requested" });
            setExtensionLoan(null);
        })
        .catch(async (e) => {
            const permissionError = new FirestorePermissionError({
                path: loanRef.path,
                operation: 'update',
                requestResourceData: updateData
            });
            errorEmitter.emit('permission-error', permissionError);
        });
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
                       <p className="text-white/40 text-sm">No active plan-based loans.</p>
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
                <DialogDescription className="text-white/40">Process your repayment securely via UPI.</DialogDescription>
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
                        <span className="text-[10px] uppercase font-bold tracking-widest text-white/30">Total Payable</span>
                        <span className="text-xl font-black text-green-400">₹{paymentDetails?.amount.toFixed(2)}</span>
                    </div>
                </div>
                {upiDeeplink && (
                    <Button asChild className="w-full h-12 rounded-xl font-bold bg-white text-black hover:bg-white/90">
                        <a href={upiDeeplink}><QrCode className="mr-2" /> Pay with UPI App</a>
                    </Button>
                )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild><Button variant="ghost" className="text-white/40">Cancel</Button></DialogClose>
                <Button onClick={handlePaymentConfirmation} className="rounded-xl font-bold bg-primary text-white">I Have Paid</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extension Dialog */}
      <Dialog open={!!extensionLoan} onOpenChange={() => setExtensionLoan(null)}>
        <DialogContent className="bg-[#030408]/90 backdrop-blur-2xl border-white/10 text-white">
          <DialogHeader><DialogTitle>Request Loan Extension</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white/60">Additional Time</Label>
              <Select value={extensionDays} onValueChange={setExtensionDays}>
                <SelectTrigger className="bg-white/5 border-white/10 rounded-xl h-11"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#030408] border-white/10">
                  {[1, 3, 5, 7, 10, 15].map(d => <SelectItem key={d} value={d.toString()}>{d} Extra Days</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost" className="text-white/40">Discard</Button></DialogClose>
            <Button onClick={handleRequestExtension} className="rounded-xl font-bold bg-primary text-white">Apply Extension</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getBadgeStyle(status: string) {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'active') return "bg-primary/20 text-primary border-primary/30";
    if (lowerStatus === 'due') return "bg-red-500/20 text-red-400 border-red-500/30";
    if (lowerStatus === 'completed') return "bg-green-500/20 text-green-400 border-green-500/30";
    if (lowerStatus === 'payment pending' || lowerStatus === 'payment_pending') return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    return "bg-white/5 text-white/40 border-white/10";
}

function LoanCard({ loan, adminSettings, onPayNow }: { loan: Loan, adminSettings: AdminSettings | null, onPayNow: (loan: Loan, amount: number, isEmi: boolean, emiIndices?: number[]) => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedEmis, setSelectedEmis] = useState<number[]>([]);

  const totalRepayment = loan.totalPayable + (loan.penalty || 0);

  return (
    <Card className="shadow-2xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl rounded-3xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-white/[0.05] bg-white/[0.01]">
        <div className="flex justify-between items-center">
            <CardTitle className="text-white font-bold">{loan.planName}</CardTitle>
            <Badge variant="outline" className={cn("text-[10px] uppercase border-white/5", getBadgeStyle(loan.status))}>{loan.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white/5 p-3 rounded-xl border border-white/5"><p className="text-white/30 uppercase">Principal</p><p className="font-bold">₹{loan.loanAmount.toFixed(2)}</p></div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-right"><p className="text-white/30 uppercase">Due</p><p className="font-bold">{loan.dueDate.toDate().toLocaleDateString()}</p></div>
        </div>
        <div className="bg-black/40 rounded-2xl p-5 border border-white/5 flex justify-between items-center">
            <span className="text-sm font-bold text-white/60">Total Due</span>
            <span className="text-2xl font-black text-white">₹{totalRepayment.toFixed(2)}</span>
        </div>
        <Button className="w-full h-12 rounded-xl font-bold bg-white text-black hover:bg-white/90" onClick={() => onPayNow(loan, totalRepayment, false)} disabled={loan.status === 'Payment Pending'}>
            {loan.status === 'Payment Pending' ? 'Verifying...' : 'Repay Full Loan'}
        </Button>
      </CardContent>
    </Card>
  );
}

function CustomLoanCard({ loan, adminSettings, onPayNow, onOpenExtension }: { loan: CustomLoanRequest, adminSettings: AdminSettings | null, onPayNow: (loan: CustomLoanRequest, amount: number) => void, onOpenExtension: () => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleUpdateStatus = (newStatus: 'approved_by_user' | 'rejected_by_user') => {
    const requestRef = doc(firestore, 'customLoanRequests', loan.id);
    updateDoc(requestRef, { status: newStatus, userApprovedAt: serverTimestamp() })
        .then(() => toast({ title: "Offer Accepted" }));
  };
  
  const totalRepayment = (loan.totalRepayment || 0) + (loan.penalty || 0);

  return (
    <Card className="shadow-2xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl rounded-3xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-white/[0.05] bg-white/[0.01]">
        <div className="flex justify-between items-center">
            <span className="text-sm font-bold uppercase">Custom Flexi</span>
            <Badge variant="outline" className={cn("text-[10px] uppercase", getBadgeStyle(loan.status))}>{loan.status.replace('_', ' ')}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {loan.status === 'pending_user_approval' ? (
            <div className="bg-primary/10 rounded-2xl p-5 border border-primary/20 space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-white/60">Liability</span>
                    <span className="text-2xl font-black">₹{loan.totalRepayment?.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Button className="rounded-xl font-bold bg-white text-black" onClick={() => handleUpdateStatus('approved_by_user')}>Accept</Button>
                    <Button variant="ghost" className="rounded-xl font-bold text-red-400" onClick={() => handleUpdateStatus('rejected_by_user')}>Decline</Button>
                </div>
            </div>
        ) : (loan.status === 'active' || loan.status === 'payment_pending' || loan.status === 'extension_pending' || loan.status === 'Due') && (
             <div className="space-y-4">
                <div className="bg-black/40 rounded-2xl p-5 border border-white/5 flex justify-between items-center">
                    <span className="text-xs font-bold text-white/60">Balance Due</span>
                    <span className="text-2xl font-black">₹{totalRepayment.toFixed(2)}</span>
                </div>
                <Button className="w-full h-14 rounded-2xl font-black text-lg bg-white text-black hover:bg-white/90 group" onClick={() => onPayNow(loan, totalRepayment)} disabled={loan.status === 'payment_pending'}>
                    {loan.status === 'payment_pending' ? <span className="flex items-center gap-2"><Timer className="animate-spin" /> VERIFYING...</span> : <span className="flex items-center gap-2">SETTLE DEBT NOW <ArrowUpRight className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"/></span>}
                </Button>
                {loan.status === 'active' && <Button variant="ghost" className="w-full text-white/30" onClick={onOpenExtension}>Request Tenure Extension</Button>}
            </div>
        )}
      </CardContent>
    </Card>
  )
}

function BottomNavItem({ icon: Icon, label, href, active = false }: { icon: React.ElementType, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={cn("flex flex-col items-center justify-center gap-1 transition-all h-full relative", active ? 'text-primary scale-110' : 'text-white/40 hover:text-white/60')}>
      <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]")} />
      <span className="text-[10px] tracking-tight">{label}</span>
      {active && <div className="absolute -bottom-1 h-1 w-8 bg-primary rounded-full blur-[2px]" />}
    </Link>
  );
}