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
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldCheck
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
import { Label } from '@/components/ui/label';

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

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{
    isOpen: boolean;
    loan: Loan | CustomLoanRequest;
    amount: number;
  } | null>(null);

  const loading = loansLoading || settingsLoading || customLoansLoading;
  
  const sortedLoans = allLoans?.sort((a,b) => b.startDate.seconds - a.startDate.seconds);
  const sortedCustomLoans = customLoans?.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds);

  const initiateRazorpayPayment = async (loan: Loan | CustomLoanRequest, amount: number) => {
    if (!user) return;
    setIsProcessing(true);

    try {
        // Step 1: Create Order on Backend
        const orderRes = await fetch('/api/razorpay/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: amount * 100, // INR to Paise
                currency: 'INR',
                receipt: `loan_${loan.id}`
            })
        });

        const order = await orderRes.json();
        if (!orderRes.ok) throw new Error(order.error || 'Failed to create order');

        // Step 2: Open Razorpay Modal
        const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount: order.amount,
            currency: order.currency,
            name: "Grow Money",
            description: `Loan Settlement Node: #${loan.id.slice(-6).toUpperCase()}`,
            order_id: order.id,
            handler: async function (response: any) {
                // Step 3: Verify Payment Signature
                const verifyRes = await fetch('/api/razorpay/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(response)
                });
                
                const verifyData = await verifyRes.json();
                if (verifyData.status === 'ok') {
                    handlePaymentSuccess(loan);
                } else {
                    toast({ title: "Payment Verification Failed", variant: "destructive" });
                }
            },
            prefill: {
                name: user.displayName || 'Investor',
                email: user.email || '',
            },
            theme: {
                color: "#8b5cf6"
            }
        };

        const rzp1 = new (window as any).Razorpay(options);
        rzp1.open();
        
        rzp1.on('payment.failed', function (response: any) {
            toast({ title: "Payment Failed", description: response.error.description, variant: "destructive" });
        });

    } catch (e: any) {
        toast({ title: "Payment Initialization Error", description: e.message, variant: "destructive" });
    } finally {
        setIsProcessing(false);
        setPaymentDetails(null);
    }
  };

  const handlePaymentSuccess = (loan: Loan | CustomLoanRequest) => {
    const isCustom = 'requestedAmount' in loan;
    const collectionName = isCustom ? 'customLoanRequests' : `users/${user!.uid}/loans`;
    const loanRef = doc(firestore, collectionName, loan.id);
    
    const dataToUpdate = { 
        status: isCustom ? 'payment_pending' : 'Payment Pending',
        paidAt: serverTimestamp(),
        gateway: 'razorpay'
    };

    updateDoc(loanRef, dataToUpdate)
        .then(() => {
            toast({ title: 'Payment Verified & Secured', description: "Admin will settle the node shortly." });
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
        <h1 className="text-lg font-bold tracking-tight">Loan Ledger</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-10">
         <div className="space-y-6">
            <h2 className="text-[10px] font-black uppercase tracking-[4px] text-white/20 flex items-center gap-2 px-2"><Briefcase size={12} className="text-primary" /> Standard Liability</h2>
            {loading ? (
                <div className="flex justify-center p-10 opacity-20"><Timer className="animate-spin" /></div>
            ) : sortedLoans?.length === 0 ? (
                <Card className="bg-white/[0.02] border-white/5 border-dashed py-10 text-center rounded-[2rem]"><p className="text-white/20 text-[10px] uppercase font-black tracking-widest">No active standard protocols</p></Card>
            ) : sortedLoans?.map(loan => <LoanCard key={loan.id} loan={loan} onPayNow={(l, a) => setPaymentDetails({ isOpen: true, loan: l, amount: a })} />)}
        </div>

        <div className="space-y-6">
            <h2 className="text-[10px] font-black uppercase tracking-[4px] text-white/20 flex items-center gap-2 px-2"><HandCoins size={12} className="text-primary" /> Custom Flexi Portfolio</h2>
            {loading ? (
                <div className="flex justify-center p-10 opacity-20"><Timer className="animate-spin" /></div>
            ) : sortedCustomLoans?.length === 0 ? (
                <Card className="bg-white/[0.02] border-white/5 border-dashed py-10 text-center rounded-[2rem]"><p className="text-white/20 text-[10px] uppercase font-black tracking-widest">No custom flexi requests</p></Card>
            ) : sortedCustomLoans?.map(loan => <CustomLoanCard key={loan.id} loan={loan} onPayNow={(l, a) => setPaymentDetails({ isOpen: true, loan: l, amount: a })} />)}
        </div>

        {paymentDetails && (
          <Dialog open={paymentDetails.isOpen} onOpenChange={() => setPaymentDetails(null)}>
            <DialogContent className="bg-[#030408]/95 border-white/10 text-white rounded-[2.5rem] max-w-sm">
               <DialogHeader>
                  <DialogTitle className="text-center font-black uppercase tracking-tight">Protocol Settlement</DialogTitle>
                  <DialogDescription className="text-center text-white/40 text-xs">Execute settlement node via secure gateway.</DialogDescription>
               </DialogHeader>
               <div className="py-8 space-y-8">
                  <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 flex flex-col items-center gap-1 shadow-inner">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Liability to Settle</span>
                      <span className="text-3xl font-black text-primary tracking-tighter">₹{paymentDetails.amount.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-start gap-3 p-5 bg-primary/5 border border-primary/10 rounded-2xl">
                      <ShieldCheck className="text-primary h-5 w-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-white/90 font-black uppercase tracking-widest mb-1">Encrypted Gateway</p>
                        <p className="text-[9px] text-white/30 leading-relaxed font-bold">Your payment is secured by Razorpay Bank-Grade encryption. 100% verified protocol.</p>
                      </div>
                  </div>
               </div>
               <DialogFooter>
                  <Button 
                    onClick={() => initiateRazorpayPayment(paymentDetails.loan, paymentDetails.amount)} 
                    disabled={isProcessing}
                    className="w-full h-15 rounded-2xl font-black bg-white text-black hover:bg-primary hover:text-white shadow-2xl transition-all gap-2"
                  >
                      {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : null}
                      {isProcessing ? "INITIALIZING SECURE LINK..." : "PAY WITH RAZORPAY"}
                  </Button>
               </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </main>

      <nav className="sticky bottom-0 z-30 border-t border-white/[0.05] bg-black/40 backdrop-blur-xl h-16 flex items-center justify-around px-4">
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
    <Card className="border-white/[0.08] bg-white/[0.03] rounded-3xl p-5 space-y-6 overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex justify-between items-center relative z-10">
          <CardTitle className="text-white font-bold tracking-tight">{loan.planName}</CardTitle>
          <Badge className={cn(
              "text-[9px] uppercase font-black tracking-widest h-5", 
              loan.status === 'Active' ? "bg-primary/20 text-primary border-primary/30" : 
              loan.status === 'Completed' ? "bg-green-500/20 text-green-400 border-green-500/30" :
              "bg-red-500/20 text-red-400 border-red-500/30"
          )}>
              {loan.status}
          </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 relative z-10">
          <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
              <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Principal</p>
              <p className="text-sm font-black text-white/80">₹{loan.loanAmount.toLocaleString()}</p>
          </div>
          <div className="bg-black/20 p-3 rounded-2xl border border-white/5 text-right">
              <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Total Interest</p>
              <p className="text-sm font-black text-red-400">₹{interestAmount.toFixed(2)}</p>
          </div>
          {loan.penalty ? (
               <div className="bg-red-500/5 p-3 rounded-2xl border border-red-500/10 col-span-2 flex justify-between items-center">
                  <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">Late Penalty Applied</span>
                  <span className="text-sm font-black text-red-400">₹{loan.penalty.toFixed(2)}</span>
              </div>
          ) : null}
      </div>

      <div className="bg-black/40 rounded-2xl p-4 flex justify-between items-center border border-white/5 relative z-10">
          <span className="text-[9px] font-black uppercase text-white/40 tracking-widest">Current Balance</span>
          <span className="text-xl font-black text-white tracking-tighter">₹{totalRepayment.toFixed(2)}</span>
      </div>
      
      <div className="flex justify-between px-1 text-[8px] font-bold text-white/20 uppercase tracking-[2px] relative z-10">
           <span>Due Date: {new Date(loan.dueDate?.seconds * 1000).toLocaleDateString()}</span>
           <span>Node ID: #{loan.id.slice(-6).toUpperCase()}</span>
      </div>

      {loan.status !== 'Completed' ? (
          <Button 
            className="w-full h-12 rounded-xl bg-white text-black font-black text-[10px] uppercase tracking-[2px] shadow-xl relative z-10" 
            onClick={() => onPayNow(loan, totalRepayment)} 
            disabled={loan.status === 'Payment Pending'}
          >
              {loan.status === 'Payment Pending' ? 'Verifying Settle Node...' : 'Secure Settlement'}
          </Button>
      ) : (
          <div className="flex items-center justify-center gap-2 py-2 text-green-400/40 relative z-10">
             <CheckCircle2 size={16} />
             <span className="text-[9px] font-black uppercase tracking-widest">Asset Fully Repaid</span>
          </div>
      )}
    </Card>
  );
}

function CustomLoanCard({ loan, onPayNow }: { loan: CustomLoanRequest, onPayNow: (loan: CustomLoanRequest, amount: number) => void }) {
  const firestore = useFirestore();
  const handleAccept = () => updateDoc(doc(firestore, 'customLoanRequests', loan.id), { status: 'approved_by_user', userApprovedAt: serverTimestamp() });
  const totalRepayment = (loan.totalRepayment || 0) + (loan.penalty || 0);

  return (
    <Card className="border-white/[0.08] bg-white/[0.03] rounded-3xl p-5 space-y-6 relative overflow-hidden group">
       <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex justify-between items-center relative z-10">
          <span className="text-[9px] font-black uppercase tracking-[3px] text-primary">Custom Flexi Protocol</span>
          <Badge className="bg-white/5 border-white/10 text-white/40 text-[8px] font-black uppercase h-5">{loan.status.replace(/_/g, ' ')}</Badge>
      </div>

      {loan.status === 'pending_user_approval' ? (
          <div className="space-y-4 relative z-10">
              <div className="bg-primary/5 p-5 rounded-[2rem] border border-primary/20 space-y-4">
                  <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest text-center">Verified Offer Received</p>
                  <div className="flex justify-between items-baseline font-black text-white">
                      <span className="text-[8px] uppercase opacity-40 font-black">Capital Due</span>
                      <span className="text-2xl tracking-tighter text-primary">₹{loan.totalRepayment?.toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-primary/10" />
                  <p className="text-[9px] text-white/30 leading-relaxed text-center font-bold">Accepting this protocol will credit your node immediately after administrative broadcast.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                  <Button onClick={handleAccept} className="h-12 rounded-xl bg-white text-black font-black uppercase text-[10px] tracking-widest">Accept</Button>
                  <Button variant="ghost" className="h-12 rounded-xl text-red-400/40 font-bold uppercase text-[9px] hover:text-red-400">Decline</Button>
              </div>
          </div>
      ) : (loan.status === 'active' || loan.status === 'payment_pending' || loan.status === 'extension_pending' || loan.status === 'Due' || loan.status === 'completed') ? (
           <div className="space-y-4 relative z-10">
              <div className="grid grid-cols-2 gap-3">
                   <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Principal</p>
                        <p className="text-sm font-black text-white/80">₹{loan.requestedAmount.toLocaleString()}</p>
                    </div>
                    <div className="bg-black/20 p-3 rounded-2xl border border-white/5 text-right">
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Total ROI</p>
                        <p className="text-sm font-black text-red-400">₹{loan.interestAmount?.toFixed(2) || '0.00'}</p>
                    </div>
              </div>
              
              <div className="bg-black/40 rounded-2xl p-4 flex justify-between items-center border border-white/5">
                  <span className="text-[9px] font-black uppercase text-white/40 tracking-widest">Liability Node</span>
                  <span className="text-xl font-black text-white tracking-tighter">₹{totalRepayment.toFixed(2)}</span>
              </div>

              <div className="flex justify-between px-1 text-[8px] font-bold text-white/20 uppercase tracking-[2px]">
                <span>Expires: {loan.dueDate ? new Date(loan.dueDate.seconds * 1000).toLocaleDateString() : 'TBD'}</span>
                <span>Node ID: #{loan.id.slice(-4).toUpperCase()}</span>
              </div>

              {loan.status !== 'completed' ? (
                  <Button 
                    className="w-full h-12 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] group shadow-xl shadow-white/5" 
                    onClick={() => onPayNow(loan, totalRepayment)} 
                    disabled={loan.status === 'payment_pending'}
                  >
                      {loan.status === 'payment_pending' ? 'Verification Cycle Active' : <span className="flex items-center gap-2">Settle with Razorpay <ArrowUpRight size={14}/></span>}
                  </Button>
              ) : (
                  <div className="flex items-center justify-center gap-2 py-2 text-green-400/40">
                    <CheckCircle2 size={16} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Liability Terminated</span>
                  </div>
              )}
          </div>
      ) : (
          <div className="py-6 text-center">
              <p className="text-xs font-bold text-white/20 uppercase tracking-widest">{loan.status === 'pending_admin_review' ? 'Awaiting Protocol Analysis...' : 'Request Processed'}</p>
          </div>
      )}
    </Card>
  )
}

function BottomNavItem({ icon: Icon, label, href, active = false }: { icon: React.ElementType, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={cn("flex flex-col items-center gap-1 transition-all h-full justify-center relative", active ? 'text-primary scale-110' : 'text-white/40')}>
      <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]")} />
      <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
      {active && <div className="absolute -bottom-1 h-1 w-6 bg-primary rounded-full blur-[2px]" />}
    </Link>
  );
}