'use client';
import {
  ChevronLeft,
  Home,
  User,
  Briefcase,
  HandCoins,
  Trophy,
  ArrowUpRight,
  Timer,
  IndianRupee,
  Percent,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import { collection, Timestamp, where, query, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
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

type Loan = {
  id: string;
  planName: string;
  loanAmount: number;
  totalPayable: number;
  interest?: number;
  penalty?: number;
  startDate: Timestamp;
  dueDate: Timestamp;
  status: 'Active' | 'Due' | 'Completed' | 'Payment Pending';
};

type AdminSettings = {
    adminUpi?: string;
    customLoanUpi?: string;
}

type CustomLoanRequest = {
  id: string;
  requestedAmount: number;
  requestedDuration: number;
  status: 'pending_admin_review' | 'pending_user_approval' | 'approved_by_user' | 'active' | 'completed' | 'rejected_by_user' | 'rejected_by_admin' | 'payment_pending' | 'extension_pending';
  totalRepayment?: number;
  interestAmount?: number;
  penalty?: number;
  createdAt: Timestamp;
  dueDate?: Timestamp;
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
            {loading ? <Timer className="animate-spin" /> : sortedLoans?.length === 0 ? <p className="text-center py-4 text-white/10 text-xs">No active standard loans.</p> : sortedLoans?.map(loan => <LoanCard key={loan.id} loan={loan} onPayNow={handlePaymentInitiation} />)}
            
            <h2 className="text-sm font-bold uppercase tracking-[4px] text-white/30 flex items-center gap-2 pt-6"><HandCoins size={16} /> Custom Flexi Loans</h2>
            {loading ? <Timer className="animate-spin" /> : sortedCustomLoans?.length === 0 ? <p className="text-center py-4 text-white/10 text-xs">No active custom loans.</p> : sortedCustomLoans?.map(loan => <CustomLoanCard key={loan.id} loan={loan} onPayNow={handlePaymentInitiation} />)}
        </div>

        {paymentDetails && (
          <Dialog open={paymentDetails.isOpen} onOpenChange={() => setPaymentDetails(null)}>
            <DialogContent className="bg-[#030408]/95 border-white/10 text-white rounded-[2rem]">
               <DialogHeader>
                  <DialogTitle>Confirm Repayment Protocol</DialogTitle>
                  <DialogDescription className="text-white/40">Initiating settle node for the selected liability.</DialogDescription>
               </DialogHeader>
               <div className="py-6 space-y-4">
                  <div className="bg-white/5 p-5 rounded-2xl border border-white/5 flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Settle Amount</span>
                      <span className="text-xl font-black text-primary">₹{paymentDetails.amount.toFixed(2)}</span>
                  </div>
                  <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 text-[10px] font-bold text-primary text-center">
                      PAY TO: {paymentDetails.upiId}
                  </div>
               </div>
               <DialogFooter>
                  <Button onClick={handlePaymentConfirmation} className="w-full h-12 rounded-xl font-black bg-white text-black hover:bg-primary hover:text-white transition-all">Confirm Payment Sent</Button>
               </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </main>

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
  const interestAmount = loan.interest || (loan.totalPayable - loan.loanAmount);

  return (
    <Card className="border-white/[0.08] bg-white/[0.03] rounded-3xl p-5 space-y-6 overflow-hidden relative">
      <div className="flex justify-between items-center">
          <CardTitle className="text-white font-bold">{loan.planName}</CardTitle>
          <Badge className={cn("text-[10px] uppercase font-black", loan.status === 'Active' ? "bg-primary/20 text-primary border-primary/30" : "bg-red-500/20 text-red-400 border-red-500/30")}>{loan.status}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/20 p-3 rounded-xl border border-white/5">
              <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Principal</p>
              <p className="text-sm font-bold text-white/80">₹{loan.loanAmount.toLocaleString()}</p>
          </div>
          <div className="bg-black/20 p-3 rounded-xl border border-white/5 text-right">
              <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Interest</p>
              <p className="text-sm font-bold text-red-400">₹{interestAmount.toFixed(2)}</p>
          </div>
          {loan.penalty ? (
               <div className="bg-red-500/5 p-3 rounded-xl border border-red-500/10 col-span-2 flex justify-between items-center">
                  <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">Late Penalty</span>
                  <span className="text-sm font-bold text-red-400">₹{loan.penalty.toFixed(2)}</span>
              </div>
          ) : null}
      </div>

      <div className="bg-black/40 rounded-2xl p-4 flex justify-between items-center">
          <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Total Settlement</span>
          <span className="text-xl font-black text-white">₹{totalRepayment.toFixed(2)}</span>
      </div>
      
      <div className="flex justify-between px-1 text-[9px] font-bold text-white/20 uppercase tracking-widest">
           <span>Due Date: {new Date(loan.dueDate?.seconds * 1000).toLocaleDateString()}</span>
           <span>Loan ID: #{loan.id.slice(-6)}</span>
      </div>

      <Button className="w-full h-12 rounded-xl bg-white text-black font-black text-xs uppercase tracking-widest shadow-xl shadow-white/5" onClick={() => onPayNow(loan, totalRepayment)} disabled={loan.status === 'Payment Pending'}>
          {loan.status === 'Payment Pending' ? 'Verifying Node...' : 'Initiate Settle Protocol'}
      </Button>
    </Card>
  );
}

function CustomLoanCard({ loan, onPayNow }: { loan: CustomLoanRequest, onPayNow: (loan: CustomLoanRequest, amount: number) => void }) {
  const firestore = useFirestore();
  const handleAccept = () => updateDoc(doc(firestore, 'customLoanRequests', loan.id), { status: 'approved_by_user', userApprovedAt: serverTimestamp() });
  const totalRepayment = (loan.totalRepayment || 0) + (loan.penalty || 0);

  return (
    <Card className="border-white/[0.08] bg-white/[0.03] rounded-3xl p-5 space-y-6">
      <div className="flex justify-between items-center">
          <span className="text-xs font-black uppercase tracking-widest text-primary">Custom Flexi</span>
          <Badge className="bg-white/5 border-white/10 text-white/40 text-[9px] uppercase">{loan.status.replace('_', ' ')}</Badge>
      </div>

      {loan.status === 'pending_user_approval' ? (
          <div className="space-y-4">
              <div className="bg-primary/5 p-5 rounded-2xl border border-primary/20 space-y-3">
                  <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest text-center">Protocol Offer Received</p>
                  <div className="flex justify-between items-baseline font-black text-white">
                      <span className="text-[10px] uppercase opacity-40">Settlement Node</span>
                      <span className="text-2xl tracking-tighter text-primary">₹{loan.totalRepayment?.toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-primary/10" />
                  <p className="text-[9px] text-white/30 leading-relaxed text-center">Accepting this offer will credit assets immediately following administrative broadcast.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                  <Button onClick={handleAccept} className="h-12 rounded-xl bg-white text-black font-black uppercase text-xs tracking-widest">Accept</Button>
                  <Button variant="ghost" className="h-12 rounded-xl text-red-400 font-bold uppercase text-[10px]">Decline</Button>
              </div>
          </div>
      ) : (loan.status === 'active' || loan.status === 'payment_pending' || loan.status === 'extension_pending' || loan.status === 'Due') && (
           <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                   <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Principal</p>
                        <p className="text-sm font-bold text-white/80">₹{loan.requestedAmount.toLocaleString()}</p>
                    </div>
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5 text-right">
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Interest</p>
                        <p className="text-sm font-bold text-red-400">₹{loan.interestAmount?.toFixed(2) || '0.00'}</p>
                    </div>
              </div>
              
              <div className="bg-black/40 rounded-2xl p-4 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Total Liability</span>
                  <span className="text-xl font-black text-white">₹{totalRepayment.toFixed(2)}</span>
              </div>

              <div className="flex justify-between px-1 text-[9px] font-bold text-white/20 uppercase tracking-widest">
                <span>Due Date: {loan.dueDate ? new Date(loan.dueDate.seconds * 1000).toLocaleDateString() : 'Pending'}</span>
                <span>Node ID: #{loan.id.slice(-4).toUpperCase()}</span>
              </div>

              <Button className="w-full h-12 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] group shadow-xl shadow-white/5" onClick={() => onPayNow(loan, totalRepayment)} disabled={loan.status === 'payment_pending'}>
                  {loan.status === 'payment_pending' ? 'Verifying Settlement...' : <span className="flex items-center gap-2">INITIATE DEBT REPAYMENT <ArrowUpRight className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" size={14}/></span>}
              </Button>
          </div>
      )}
    </Card>
  )
}

function BottomNavItem({ icon: Icon, label, href, active = false }: { icon: React.ElementType, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={cn("flex flex-col items-center gap-1 transition-all h-full justify-center relative", active ? 'text-primary scale-110' : 'text-white/40')}>
      <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]")} />
      <span className="text-[9px] font-bold">{label}</span>
      {active && <div className="absolute -bottom-1 h-1 w-6 bg-primary rounded-full blur-[2px]" />}
    </Link>
  );
}
