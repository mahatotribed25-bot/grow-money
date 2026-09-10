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
  CheckCircle2,
  ShieldCheck,
  Copy,
  QrCode,
  Clock,
  CircleDot,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import { collection, Timestamp, where, query, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
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
  interest?: number;
  penalty?: number;
  startDate: Timestamp;
  dueDate: Timestamp;
  status: 'Active' | 'Due' | 'Completed' | 'Payment Pending';
  repaymentMethod?: 'EMI' | 'Direct';
  emis?: EMI[];
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

const TimeRemaining = ({ targetDate }: { targetDate: Date }) => {
    const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const diff = targetDate.getTime() - now.getTime();
            if (diff <= 0) {
                clearInterval(interval);
                return;
            }
            setTimeLeft({
                d: Math.floor(diff / (1000 * 60 * 60 * 24)),
                h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                s: Math.floor((diff % (1000 * 60)) / 1000)
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [targetDate]);

    return (
        <span className="font-mono font-black text-white/80">
            {timeLeft.d}D {timeLeft.h}H {timeLeft.m}M {timeLeft.s}S
        </span>
    );
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
    emiIndex?: number;
  } | null>(null);

  const loading = loansLoading || settingsLoading || customLoansLoading;
  
  const sortedLoans = useMemo(() => allLoans?.sort((a,b) => b.startDate.seconds - a.startDate.seconds) || [], [allLoans]);
  const activeStandardLoans = sortedLoans.filter(l => l.status !== 'Completed');
  
  const sortedCustomLoans = useMemo(() => customLoans?.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds) || [], [customLoans]);
  const activeCustomLoans = sortedCustomLoans.filter(l => ['active', 'payment_pending', 'extension_pending', 'pending_user_approval'].includes(l.status));

  const totalDueAmount = useMemo(() => {
    const standardDue = activeStandardLoans.reduce((sum, l) => {
        if (l.repaymentMethod === 'EMI') {
            return sum + (l.emis?.filter(e => e.status !== 'Paid').reduce((s, e) => s + e.emiAmount, 0) || 0);
        }
        return sum + l.totalPayable;
    }, 0);
    const customDue = activeCustomLoans.reduce((sum, l) => sum + (l.totalRepayment || 0), 0);
    return standardDue + customDue;
  }, [activeStandardLoans, activeCustomLoans]);

  const handleCopyToClipboard = (text?: string, label?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: `${label} Copied!` });
  };

  const handleMarkAsPaid = () => {
    if (!user || !paymentDetails) return;
    
    const { loan, isCustom, emiIndex } = paymentDetails;
    const loanRef = doc(firestore, isCustom ? 'customLoanRequests' : `users/${user.uid}/loans`, loan.id);
    
    let updatePayload: any = { 
        status: isCustom ? 'payment_pending' : 'Payment Pending',
        paidNotificationAt: serverTimestamp()
    };

    if (!isCustom && emiIndex !== undefined && (loan as Loan).emis) {
        const updatedEmis = [...(loan as Loan).emis!];
        updatedEmis[emiIndex].status = 'Payment Pending';
        updatePayload = { emis: updatedEmis, paidNotificationAt: serverTimestamp() };
    }

    updateDoc(loanRef, updatePayload)
        .then(() => {
            toast({ title: 'Notification Sent', description: "Admin will verify your payment shortly." });
            setPaymentDetails(null);
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: loanRef.path,
                operation: 'update',
                requestResourceData: updatePayload,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
  };

  const targetUpi = paymentDetails?.isCustom ? (adminSettings?.customLoanUpi || adminSettings?.adminUpi) : adminSettings?.adminUpi;
  const upiDeeplink = targetUpi ? `upi://pay?pa=${targetUpi}&pn=Grow%20Money&am=${paymentDetails?.amount.toFixed(2)}&cu=INR` : '';

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#030408]"><Timer className="animate-spin text-primary" /></div>;

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#030408] text-foreground relative z-10 pb-20">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.05] bg-black/40 px-4 backdrop-blur-xl sm:px-6">
        <Link href="/dashboard"><Button variant="ghost" size="icon" className="hover:bg-white/10 text-white/70"><ChevronLeft /></Button></Link>
        <h1 className="text-lg font-bold tracking-tighter uppercase">Loan Ledger</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-10">
        
        {/* SECTION 1: TOTAL OBLIGATIONS (Screenshot Style) */}
        {(activeStandardLoans.length > 0 || activeCustomLoans.length > 0) ? (
            <Card className="bg-[#0a0b14] border-white/5 rounded-[2rem] overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <HandCoins size={120} className="text-primary" />
                </div>
                <CardHeader className="pb-2 pt-8">
                    <p className="text-[10px] font-black uppercase tracking-[4px] text-white/20">Current Obligations</p>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="flex justify-between items-baseline">
                        <span className="text-sm font-bold text-white/60">Total Amount Due</span>
                        <span className="text-4xl font-black text-white tracking-tighter">
                            ₹{totalDueAmount.toLocaleString()}
                        </span>
                    </div>

                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between shadow-inner">
                        <div className="flex items-center gap-3">
                            <Clock size={16} className="text-primary animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[2px] text-white/40">Next Deadline</span>
                        </div>
                        <TimeRemaining targetDate={activeStandardLoans[0]?.dueDate.toDate() || activeCustomLoans[0]?.dueDate?.toDate() || new Date()} />
                    </div>

                    <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[4px] text-white/20 pl-1">Repayment Schedule</p>
                        
                        <div className="space-y-3">
                             {/* Standard Loan EMI List */}
                             {activeStandardLoans.map(loan => (
                                <div key={loan.id} className="space-y-2">
                                    <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest pl-2">{loan.planName} Schedule</p>
                                    {loan.repaymentMethod === 'EMI' ? loan.emis?.map((emi, i) => (
                                        <RepaymentRow 
                                            key={`${loan.id}-${i}`}
                                            date={emi.dueDate.toDate()} 
                                            amount={emi.emiAmount} 
                                            status={emi.status} 
                                            onPay={() => setPaymentDetails({ isOpen: true, loan: loan, amount: emi.emiAmount, isCustom: false, emiIndex: i })}
                                        />
                                    )) : (
                                        <RepaymentRow 
                                            date={loan.dueDate.toDate()} 
                                            amount={loan.totalPayable} 
                                            status={loan.status} 
                                            onPay={() => setPaymentDetails({ isOpen: true, loan: loan, amount: loan.totalPayable, isCustom: false })}
                                        />
                                    )}
                                </div>
                             ))}

                             {/* Custom Loan List */}
                             {activeCustomLoans.map(loan => (
                                <div key={loan.id} className="space-y-2">
                                    <p className="text-[9px] font-black text-green-400/60 uppercase tracking-widest pl-2">Flexi Protocol Node</p>
                                    <RepaymentRow 
                                        date={loan.dueDate?.toDate() || new Date()} 
                                        amount={loan.totalRepayment || 0} 
                                        status={loan.status === 'active' ? 'Active' : loan.status} 
                                        onPay={() => setPaymentDetails({ isOpen: true, loan: loan, amount: loan.totalRepayment || 0, isCustom: true })}
                                    />
                                </div>
                             ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        ) : (
            <Card className="bg-white/5 border-dashed border-white/10 rounded-[2rem] py-20 text-center">
                <CardContent className="space-y-4">
                    <HandCoins size={48} className="mx-auto text-white/10" />
                    <p className="text-white/20 text-sm font-bold uppercase tracking-widest">No active liabilities</p>
                    <Button asChild variant="outline" className="border-white/10 text-[10px] font-black uppercase tracking-widest h-10 rounded-xl">
                        <Link href="/loans">Apply for Capital</Link>
                    </Button>
                </CardContent>
            </Card>
        )}

        {/* SECTION 2: HISTORY (Settled Nodes) */}
        <div className="space-y-6">
            <h2 className="text-[10px] font-black uppercase tracking-[4px] text-white/20 flex items-center gap-2 px-2">
                <ShieldCheck size={14} className="text-green-500" /> Settled History
            </h2>
            <div className="grid gap-4">
                {sortedLoans.filter(l => l.status === 'Completed').map(loan => <HistoryCard key={loan.id} loan={loan} />)}
                {sortedCustomLoans.filter(l => l.status === 'completed').map(loan => <HistoryCard key={loan.id} loan={loan} isCustom />)}
                {!sortedLoans.some(l => l.status === 'Completed') && !sortedCustomLoans.some(l => l.status === 'completed') && (
                    <p className="text-center text-[10px] text-white/10 uppercase font-black py-10">No past transactions archived</p>
                )}
            </div>
        </div>

        {/* SETTLEMENT DIALOG */}
        {paymentDetails && (
          <Dialog open={paymentDetails.isOpen} onOpenChange={() => setPaymentDetails(null)}>
            <DialogContent className="bg-[#030408]/95 border-white/10 text-white rounded-[2.5rem] max-w-sm">
               <DialogHeader>
                  <DialogTitle className="text-center font-black uppercase tracking-tight">Manual Settlement</DialogTitle>
                  <DialogDescription className="text-center text-white/40 text-xs">Authorize dispatch to the GM Admin Node.</DialogDescription>
               </DialogHeader>
               
               <div className="py-6 space-y-6">
                  <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 flex flex-col items-center gap-1 shadow-inner">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Target Amount</span>
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
                        <Label className="text-[10px] font-black text-white/20 uppercase tracking-widest pl-1">Admin UPI ID</Label>
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
                              <QrCode size={16} className="mr-2" /> Launch UPI Terminal
                          </a>
                      </Button>
                      <Button onClick={handleMarkAsPaid} className="w-full h-14 rounded-2xl bg-primary text-white font-black shadow-2xl shadow-primary/20">
                          <ShieldCheck size={18} className="mr-2" /> I HAVE PAID (FINALIZE)
                      </Button>
                  </div>
               </div>
            </DialogContent>
          </Dialog>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/[0.05] bg-black/40 backdrop-blur-xl h-16 flex items-center justify-around px-4">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={Trophy} label="Leaders" href="/leaderboard" />
          <BottomNavItem icon={HandCoins} label="Loans" href="/my-loans" active/>
          <BottomNavItem icon={User} label="Profile" href="/profile" />
      </nav>
    </div>
  );
}

function RepaymentRow({ date, amount, status, onPay }: { date: Date, amount: number, status: string, onPay: () => void }) {
    const isPaid = status.toLowerCase() === 'paid' || status.toLowerCase() === 'completed';
    const isPendingAdmin = status.toLowerCase() === 'payment pending';

    return (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03] group hover:bg-white/5 transition-all">
            <div className="flex flex-col">
                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{date.toLocaleDateString()}</span>
                <span className="text-base font-black text-white tracking-tight">₹{amount.toFixed(2)}</span>
            </div>
            {isPaid ? (
                <Badge variant="outline" className="h-6 bg-green-500/10 text-green-400 border-green-500/20 text-[8px] font-black uppercase tracking-widest px-3">PAID</Badge>
            ) : isPendingAdmin ? (
                <Badge variant="outline" className="h-6 bg-primary/10 text-primary border-primary/20 text-[8px] font-black uppercase tracking-widest px-3">PENDING ADMIN</Badge>
            ) : (
                <Button size="sm" onClick={onPay} className="h-8 rounded-lg bg-[#22c55e] text-white font-black uppercase text-[9px] tracking-widest shadow-lg shadow-green-500/20 hover:scale-105 active:scale-95 transition-all">
                    PAY NOW
                </Button>
            )}
        </div>
    )
}

function HistoryCard({ loan, isCustom }: { loan: any, isCustom?: boolean }) {
    return (
        <Card className="bg-white/[0.02] border-white/5 rounded-2xl p-4 flex items-center justify-between group grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-green-500/5 flex items-center justify-center border border-green-500/10">
                    <CheckCircle2 size={18} className="text-green-500" />
                </div>
                <div>
                    <p className="text-sm font-bold text-white/80">{isCustom ? 'Flexi Protocol' : loan.planName}</p>
                    <p className="text-[9px] text-white/20 uppercase font-bold tracking-widest">
                        ₹{(isCustom ? (loan.requestedAmount || 0) : (loan.loanAmount || 0)).toLocaleString()} • Node: #{loan.id.slice(-6).toUpperCase()}
                    </p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-[10px] font-black text-green-500/50 uppercase tracking-widest">SETTLED</p>
                <p className="text-[9px] text-white/10 font-bold uppercase">{new Date((loan.startDate || loan.createdAt || Timestamp.now()).seconds * 1000).toLocaleDateString()}</p>
            </div>
        </Card>
    );
}

function BottomNavItem({ icon: Icon, label, href, active = false }: { icon: React.ElementType, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={cn(
        "flex flex-col items-center justify-center gap-1 transition-all h-full relative",
        active ? 'text-primary scale-110' : 'text-white/20 hover:text-white/40'
    )}>
      <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]")} />
      <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
      {active && <div className="absolute -bottom-1 h-1 w-6 bg-primary rounded-full blur-[2px]" />}
    </Link>
  );
}
