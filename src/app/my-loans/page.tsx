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
  ShieldCheck,
  Copy,
  QrCode
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
import Image from 'next/image';

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
    isCustom: boolean;
  } | null>(null);

  const loading = loansLoading || settingsLoading || customLoansLoading;
  
  const sortedLoans = allLoans?.sort((a,b) => b.startDate.seconds - a.startDate.seconds);
  const sortedCustomLoans = customLoans?.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds);

  const handleCopyToClipboard = (text?: string, label?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: `${label} Copied!` });
  };

  const handleMarkAsPaid = () => {
    if (!user || !paymentDetails) return;
    
    const { loan, isCustom } = paymentDetails;
    const collectionName = isCustom ? 'customLoanRequests' : `users/${user.uid}/loans`;
    const loanRef = doc(firestore, collectionName, loan.id);
    
    const dataToUpdate = { 
        status: isCustom ? 'payment_pending' : 'Payment Pending',
        paidNotificationAt: serverTimestamp()
    };

    updateDoc(loanRef, dataToUpdate)
        .then(() => {
            toast({ title: 'Notification Sent', description: "Admin will verify your payment and settle the node shortly." });
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

  const targetUpi = paymentDetails?.isCustom ? (adminSettings?.customLoanUpi || adminSettings?.adminUpi) : adminSettings?.adminUpi;
  const upiDeeplink = targetUpi ? `upi://pay?pa=${targetUpi}&pn=Grow%20Money&am=${paymentDetails?.amount.toFixed(2)}&cu=INR` : '';

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
            ) : sortedLoans?.map(loan => <LoanCard key={loan.id} loan={loan} onPayNow={(l, a) => setPaymentDetails({ isOpen: true, loan: l, amount: a, isCustom: false })} />)}
        </div>

        <div className="space-y-6">
            <h2 className="text-[10px] font-black uppercase tracking-[4px] text-white/20 flex items-center gap-2 px-2"><HandCoins size={12} className="text-primary" /> Custom Flexi Portfolio</h2>
            {loading ? (
                <div className="flex justify-center p-10 opacity-20"><Timer className="animate-spin" /></div>
            ) : sortedCustomLoans?.length === 0 ? (
                <Card className="bg-white/[0.02] border-white/5 border-dashed py-10 text-center rounded-[2rem]"><p className="text-white/20 text-[10px] uppercase font-black tracking-widest">No custom flexi requests</p></Card>
            ) : sortedCustomLoans?.map(loan => <CustomLoanCard key={loan.id} loan={loan} onPayNow={(l, a) => setPaymentDetails({ isOpen: true, loan: l, amount: a, isCustom: true })} />)}
        </div>

        {paymentDetails && (
          <Dialog open={paymentDetails.isOpen} onOpenChange={() => setPaymentDetails(null)}>
            <DialogContent className="bg-[#030408]/95 border-white/10 text-white rounded-[2.5rem] max-w-sm">
               <DialogHeader>
                  <DialogTitle className="text-center font-black uppercase tracking-tight">Manual Settlement</DialogTitle>
                  <DialogDescription className="text-center text-white/40 text-xs">Send the exact amount to the admin node below.</DialogDescription>
               </DialogHeader>
               
               <div className="py-6 space-y-6">
                  <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 flex flex-col items-center gap-1 shadow-inner">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Liability to Settle</span>
                      <span className="text-3xl font-black text-primary tracking-tighter">₹{paymentDetails.amount.toFixed(2)}</span>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                      <div className="bg-white p-3 rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                          <Image
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiDeeplink)}`}
                              alt="UPI QR"
                              width={150}
                              height={150}
                          />
                      </div>
                      <div className="w-full space-y-2">
                        <Label className="text-[10px] font-black text-white/20 uppercase tracking-widest pl-1">Admin Payment ID</Label>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center group">
                            <span className="font-mono text-sm font-bold text-white/80">{targetUpi || 'NOT SET'}</span>
                            <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(targetUpi, 'UPI ID')} className="h-8 w-8 hover:bg-white/10">
                                <Copy size={14} className="text-primary" />
                            </Button>
                        </div>
                      </div>
                  </div>

                  <div className="space-y-3">
                      <Button asChild className="w-full h-12 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] shadow-xl">
                          <a href={upiDeeplink}>
                              <QrCode size={16} className="mr-2" /> Launch UPI App
                          </a>
                      </Button>
                      <Button onClick={handleMarkAsPaid} className="w-full h-14 rounded-2xl bg-primary text-white font-black shadow-2xl shadow-primary/20">
                          <ShieldCheck size={18} className="mr-2" /> I HAVE PAID (NOTIFY ADMIN)
                      </Button>
                  </div>
               </div>
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
              {loan.status === 'Payment Pending' ? 'Verification Cycle Active' : 'Secure Settlement'}
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
                      {loan.status === 'payment_pending' ? 'Verification Cycle Active' : <span className="flex items-center gap-2">Secure Settlement <ArrowUpRight size={14}/></span>}
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