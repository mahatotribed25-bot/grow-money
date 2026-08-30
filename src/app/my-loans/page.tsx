'use client';
import {
  ChevronLeft,
  Home,
  User,
  Briefcase,
  HandCoins,
  Trophy,
  QrCode,
  Timer,
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
import { useEffect, useState } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { addDays } from 'date-fns';
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
};

export default function MyLoansPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const { data: allLoans, loading: loansLoading } = useCollection<Loan>(user ? `users/${user.uid}/loans` : null);
  const { data: adminSettings, loading: settingsLoading } = useDoc<AdminSettings>(user ? 'settings/admin' : null);
  const { data: customLoans, loading: customLoansLoading } = useCollection<CustomLoanRequest>(user ? query(collection(firestore, 'customLoanRequests'), where('userId', '==', user.uid)) : null);

  const [paymentDetails, setPaymentDetails] = useState<{
    isOpen: boolean;
    loan: Loan | CustomLoanRequest;
    amount: number;
    upiId: string;
  } | null>(null);

  const [extensionLoan, setExtensionLoan] = useState<CustomLoanRequest | null>(null);
  const [extensionDays, setExtensionDays] = useState('5');

  const loading = loansLoading || settingsLoading || customLoansLoading;
  
  const sortedLoans = allLoans?.sort((a,b) => b.startDate.seconds - a.startDate.seconds);
  const sortedCustomLoans = customLoans?.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds);

  const handlePaymentInitiation = (loan: Loan | CustomLoanRequest, amount: number) => {
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
      upiId: upiIdForPayment,
    });
  };

  const handlePaymentConfirmation = () => {
    if (!user || !paymentDetails || !paymentDetails.loan) return;

    const { loan } = paymentDetails;
    const isCustom = 'requestedAmount' in loan;
    const collectionName = isCustom ? 'customLoanRequests' : `users/${user.uid}/loans`;
    const loanRef = doc(firestore, collectionName, loan.id);
    
    const dataToUpdate = { status: isCustom ? 'payment_pending' : 'Payment Pending' };

    updateDoc(loanRef, dataToUpdate)
        .then(() => {
            toast({ title: 'Payment Initiated' });
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
    const loanRef = doc(firestore, 'customLoanRequests', extensionLoan.id);
    const updateData = { status: 'extension_pending', extensionRequestedDays: days };

    updateDoc(loanRef, updateData).then(() => {
        toast({ title: "Extension Requested" });
        setExtensionLoan(null);
    });
  };
  
  const upiDeeplink = paymentDetails?.isOpen && paymentDetails.upiId
    ? `upi://pay?pa=${paymentDetails.upiId}&pn=Grow%20Money&am=${paymentDetails.amount.toFixed(2)}&cu=INR`
    : '';

  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent text-foreground relative z-10">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.05] bg-black/40 px-4 backdrop-blur-xl sm:px-6">
        <Link href="/dashboard"><Button variant="ghost" size="icon" className="hover:bg-white/10 text-white/70"><ChevronLeft /></Button></Link>
        <h1 className="text-lg font-bold">Loan Ledger</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-8">
         <div className="space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-[4px] text-white/30 flex items-center gap-2"><Briefcase size={16} /> Standard Loans</h2>
            {loading ? <Timer className="animate-spin" /> : sortedLoans?.map(loan => <LoanCard key={loan.id} loan={loan} onPayNow={handlePaymentInitiation} />)}
            
            <h2 className="text-sm font-bold uppercase tracking-[4px] text-white/30 flex items-center gap-2 pt-6"><HandCoins size={16} /> Custom Flexi Loans</h2>
            {loading ? <Timer className="animate-spin" /> : sortedCustomLoans?.map(loan => <CustomLoanCard key={loan.id} loan={loan} onPayNow={handlePaymentInitiation} onOpenExtension={() => setExtensionLoan(loan)} />)}
        </div>
      </main>

      <Dialog open={!!paymentDetails?.isOpen} onOpenChange={() => setPaymentDetails(null)}>
        <DialogContent className="bg-[#030408]/90 backdrop-blur-2xl border-white/10 text-white">
            <DialogHeader><DialogTitle>Repay Your Loan</DialogTitle></DialogHeader>
            <div className="space-y-6 py-4 flex flex-col items-center">
               {paymentDetails?.upiId && upiDeeplink && (
                 <div className="bg-white p-3 rounded-2xl">
                    <Image src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiDeeplink)}`} alt="QR" width={160} height={160} />
                </div>
               )}
                <p className="text-xl font-black text-green-400">Total: ₹{paymentDetails?.amount.toFixed(2)}</p>
                <Button asChild className="w-full h-12 rounded-xl font-bold bg-white text-black"><a href={upiDeeplink}><QrCode className="mr-2" /> Pay with UPI App</a></Button>
            </div>
            <DialogFooter><Button onClick={handlePaymentConfirmation} className="w-full h-12">I Have Paid</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!extensionLoan} onOpenChange={() => setExtensionLoan(null)}>
        <DialogContent className="bg-[#030408] border-white/10 text-white">
          <DialogHeader><DialogTitle>Request Extension</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
              <Select value={extensionDays} onValueChange={setExtensionDays}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>{[1, 3, 5, 7, 10, 15].map(d => <SelectItem key={d} value={d.toString()}>{d} Extra Days</SelectItem>)}</SelectContent>
              </Select>
          </div>
          <DialogFooter><Button onClick={handleRequestExtension} className="w-full h-12">Apply Extension</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <nav className="sticky bottom-0 z-20 border-t border-white/[0.05] bg-black/40 backdrop-blur-xl h-16 flex items-center justify-around px-4">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={Trophy} label="Leaders" href="/leaderboard" />
          <BottomNavItem icon={HandCoins} label="Loans" href="/my-loans" active/>
          <BottomNavItem icon={User} label="Profile" href="/profile" />
      </nav>
    </div>
  );
}

function LoanCard({ loan, onPayNow }: { loan: Loan, onPayNow: (loan: Loan, amount: number) => void }) {
  const totalRepayment = loan.totalPayable + (loan.penalty || 0);
  return (
    <Card className="border-white/[0.08] bg-white/[0.03] rounded-3xl p-5 space-y-6">
      <div className="flex justify-between items-center">
          <CardTitle className="text-white font-bold">{loan.planName}</CardTitle>
          <Badge className={cn("text-[10px] uppercase", loan.status === 'Active' ? "bg-primary/20 text-primary" : "bg-red-500/20 text-red-400")}>{loan.status}</Badge>
      </div>
      <div className="bg-black/40 rounded-2xl p-4 flex justify-between items-center">
          <span className="text-sm font-bold text-white/60">Total Due</span>
          <span className="text-xl font-black text-white">₹{totalRepayment.toFixed(2)}</span>
      </div>
      <Button className="w-full h-12 rounded-xl bg-white text-black" onClick={() => onPayNow(loan, totalRepayment)} disabled={loan.status === 'Payment Pending'}>
          {loan.status === 'Payment Pending' ? 'Verifying...' : 'Repay Full Loan'}
      </Button>
    </Card>
  );
}

function CustomLoanCard({ loan, onPayNow, onOpenExtension }: { loan: CustomLoanRequest, onPayNow: (loan: CustomLoanRequest, amount: number) => void, onOpenExtension: () => void }) {
  const firestore = useFirestore();
  const handleAccept = () => updateDoc(doc(firestore, 'customLoanRequests', loan.id), { status: 'approved_by_user', userApprovedAt: serverTimestamp() });
  const totalRepayment = (loan.totalRepayment || 0) + (loan.penalty || 0);

  return (
    <Card className="border-white/[0.08] bg-white/[0.03] rounded-3xl p-5 space-y-6">
      <div className="flex justify-between items-center">
          <span className="text-sm font-bold uppercase">Custom Flexi</span>
          <Badge className="bg-white/5 text-white/40">{loan.status.replace('_', ' ')}</Badge>
      </div>
      {loan.status === 'pending_user_approval' ? (
          <div className="space-y-4">
              <div className="flex justify-between font-black text-lg"><span>Liability</span><span>₹{loan.totalRepayment?.toFixed(2)}</span></div>
              <div className="grid grid-cols-2 gap-3">
                  <Button onClick={handleAccept} className="bg-white text-black">Accept</Button>
                  <Button variant="ghost" className="text-red-400">Decline</Button>
              </div>
          </div>
      ) : (loan.status === 'active' || loan.status === 'payment_pending' || loan.status === 'extension_pending' || loan.status === 'Due') && (
           <div className="space-y-4">
              <div className="bg-black/40 rounded-2xl p-4 flex justify-between items-center"><span className="text-sm font-bold">Total Due</span><span className="text-xl font-black">₹{totalRepayment.toFixed(2)}</span></div>
              <Button className="w-full h-12 rounded-xl bg-white text-black group" onClick={() => onPayNow(loan, totalRepayment)} disabled={loan.status === 'payment_pending'}>
                  {loan.status === 'payment_pending' ? 'Verifying...' : <span className="flex items-center gap-2">SETTLE DEBT NOW <ArrowUpRight className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"/></span>}
              </Button>
              {loan.status === 'active' && <Button variant="ghost" className="w-full text-white/30" onClick={onOpenExtension}>Request Extension</Button>}
          </div>
      )}
    </Card>
  )
}

function BottomNavItem({ icon: Icon, label, href, active = false }: { icon: React.ElementType, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={cn("flex flex-col items-center gap-1", active ? 'text-primary' : 'text-white/40')}>
      <Icon className="h-5 w-5" /><span className="text-[9px] font-bold">{label}</span>
    </Link>
  );
}