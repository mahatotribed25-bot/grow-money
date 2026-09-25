
'use client';

import {
  ChevronLeft,
  Home,
  User,
  Briefcase,
  HandCoins,
  Trophy,
  ShieldCheck,
  Copy,
  QrCode,
  Clock,
  Timer,
  CheckCircle2,
  CheckCircle,
  ArrowUpRight,
  AlertCircle,
  Info,
  Calendar,
  Fingerprint,
  Activity,
  History as HistoryIcon,
  Shield
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import { collection, Timestamp, where, query, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { useSettings } from '@/context/settings-context';

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
  activatedAt?: Timestamp;
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
        <span className="font-mono font-black text-foreground/80 tabular-nums">
            {timeLeft.d}D {timeLeft.h}H {timeLeft.m}M {timeLeft.s}S
        </span>
    );
};

export default function MyLoansPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useSettings();
  
  const { data: allLoans, loading: loansLoading } = useCollection<Loan>(user ? `users/${user.uid}/loans` : null);
  const { data: adminSettings, loading: settingsLoading } = useDoc<AdminSettings>(user ? 'settings/admin' : null);
  const { data: customLoans, loading: customLoansLoading } = useCollection<CustomLoanRequest>(user ? query(collection(firestore, 'customLoanRequests'), where('userId', '==', user.uid)) : null);

  const [selectedItems, setSelectedItems] = useState<{ id: string; emiIndex?: number; amount: number; isCustom: boolean; loanName: string }[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const loading = loansLoading || settingsLoading || customLoansLoading;
  
  const sortedLoans = useMemo(() => allLoans?.sort((a,b) => b.startDate.seconds - a.startDate.seconds) || [], [allLoans]);
  const activeStandardLoans = sortedLoans.filter(l => l.status !== 'Completed');
  
  const sortedCustomLoans = useMemo(() => customLoans?.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds) || [], [customLoans]);
  const activeCustomLoans = sortedCustomLoans.filter(l => ['active', 'payment_pending', 'extension_pending', 'pending_user_approval', 'approved_by_user'].includes(l.status));

  const totalSelectedAmount = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.amount, 0);
  }, [selectedItems]);

  const handleToggleSelect = (loan: Loan | CustomLoanRequest, amount: number, isCustom: boolean, emiIndex?: number) => {
    const itemKey = `${loan.id}-${emiIndex ?? 'custom'}`;
    const exists = selectedItems.find(item => `${item.id}-${item.emiIndex ?? 'custom'}` === itemKey);

    if (exists) {
        setSelectedItems(selectedItems.filter(item => `${item.id}-${item.emiIndex ?? 'custom'}` !== itemKey));
    } else {
        setSelectedItems([...selectedItems, { 
            id: loan.id, 
            emiIndex, 
            amount, 
            isCustom, 
            loanName: isCustom ? 'Flexi Protocol' : (loan as Loan).planName 
        }]);
    }
  };

  const handleBatchMarkAsPaid = async () => {
    if (!user || selectedItems.length === 0) return;
    
    const batch = writeBatch(firestore);
    
    selectedItems.forEach(item => {
        const loanRef = doc(firestore, item.isCustom ? 'customLoanRequests' : `users/${user.uid}/loans`, item.id);
        
        if (item.isCustom) {
            batch.update(loanRef, { status: 'payment_pending', paidNotificationAt: serverTimestamp() });
        } else {
            const originalLoan = allLoans?.find(l => l.id === item.id);
            if (originalLoan && originalLoan.emis && item.emiIndex !== undefined) {
                const updatedEmis = [...originalLoan.emis];
                updatedEmis[item.emiIndex].status = 'Payment Pending';
                batch.update(loanRef, { emis: updatedEmis });
            } else {
                batch.update(loanRef, { status: 'Payment Pending' });
            }
        }
    });

    try {
        await batch.commit();
        toast({ title: 'Notifications Sent', description: `${selectedItems.length} payments notified to admin.` });
        setSelectedItems([]);
        setIsPaymentModalOpen(false);
    } catch (e: any) {
        toast({ title: 'Update Failed', variant: 'destructive' });
    }
  };

  const handleCopyToClipboard = (text?: string, label?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: `${label} Copied!` });
  };

  const hasAnyCustomSelected = selectedItems.some(item => item.isCustom);
  const targetUpi = hasAnyCustomSelected ? (adminSettings?.customLoanUpi || adminSettings?.adminUpi) : adminSettings?.adminUpi;
  const upiDeeplink = targetUpi ? `upi://pay?pa=${targetUpi}&pn=Grow%20Money&am=${totalSelectedAmount.toFixed(2)}&cu=INR` : '';

  if (loading) return <div className="flex h-screen items-center justify-center bg-background"><Timer className="animate-spin text-primary" /></div>;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground transition-colors duration-300 pb-20">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 backdrop-blur-sm px-4 sm:px-6">
        <Link href="/dashboard"><Button variant="ghost" size="icon" className="hover:bg-accent text-foreground/70"><ChevronLeft /></Button></Link>
        <h1 className="text-lg font-bold tracking-tighter uppercase">{t.nav.loans}</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-10">
        
        {(activeStandardLoans.length > 0 || activeCustomLoans.length > 0) ? (
            <Card className="bg-card border-border rounded-[2.5rem] overflow-hidden shadow-2xl relative border-primary/10">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-transparent" />
                <CardHeader className="pb-2 pt-10 px-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[4px] text-primary/60">Active Obligations</p>
                            <h2 className="text-2xl font-black tracking-tight text-white mt-1">Live Credit Nodes</h2>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary">
                            <Activity size={20} className="animate-pulse" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-8 p-8">
                    <div className="flex justify-between items-end bg-black/20 p-6 rounded-3xl border border-white/5 shadow-inner">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-white/20 tracking-widest mb-1">Due for Settlement</span>
                            <span className="text-5xl font-black tracking-tighter text-white">
                                ₹{totalSelectedAmount > 0 ? totalSelectedAmount.toLocaleString() : "0.00"}
                            </span>
                        </div>
                        {selectedItems.length > 0 && (
                            <Button onClick={() => setIsPaymentModalOpen(true)} className="h-14 px-8 rounded-2xl bg-primary text-white font-black uppercase text-xs tracking-widest animate-in zoom-in-50 shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
                                Pay Selected
                            </Button>
                        )}
                    </div>

                    <div className="bg-muted border border-border rounded-2xl p-4 flex items-center justify-between shadow-inner">
                        <div className="flex items-center gap-3">
                            <Clock size={16} className="text-primary animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground">Next Protocol Deadline</span>
                        </div>
                        <TimeRemaining targetDate={activeStandardLoans[0]?.dueDate.toDate() || activeCustomLoans[0]?.dueDate?.toDate() || new Date()} />
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-1">
                             <p className="text-[10px] font-black uppercase tracking-[4px] text-muted-foreground">Repayment Schedule</p>
                             <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-50">Select nodes to settle</p>
                        </div>
                        
                        <div className="space-y-4">
                             {activeStandardLoans.map(loan => (
                                <div key={loan.id} className="space-y-3">
                                    <div className="flex justify-between items-end px-2">
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-black text-white uppercase tracking-widest">{loan.planName}</p>
                                            <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Protocol ID: #{loan.id.slice(-8).toUpperCase()}</p>
                                        </div>
                                        <Badge variant="outline" className="h-5 text-[8px] font-black tracking-widest border-primary/20 text-primary">AUTHORIZED</Badge>
                                    </div>
                                    <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-0.5">
                                                <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Disbursed On</p>
                                                <p className="text-xs font-bold text-white/60">{loan.startDate.toDate().toLocaleDateString()}</p>
                                            </div>
                                            <div className="space-y-0.5 text-right">
                                                <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Repayment Mode</p>
                                                <p className="text-xs font-bold text-white/60">{loan.repaymentMethod} Node</p>
                                            </div>
                                        </div>
                                        {loan.repaymentMethod === 'EMI' ? loan.emis?.map((emi, i) => (
                                            <RepaymentRow 
                                                key={`${loan.id}-${i}`}
                                                date={emi.dueDate.toDate()} 
                                                amount={emi.emiAmount} 
                                                status={emi.status} 
                                                isSelected={!!selectedItems.find(item => item.id === loan.id && item.emiIndex === i)}
                                                onToggle={() => handleToggleSelect(loan, emi.emiAmount, false, i)}
                                            />
                                        )) : (
                                            <RepaymentRow 
                                                date={loan.dueDate.toDate()} 
                                                amount={loan.totalPayable} 
                                                status={loan.status} 
                                                isSelected={!!selectedItems.find(item => item.id === loan.id && item.emiIndex === undefined)}
                                                onToggle={() => handleToggleSelect(loan, loan.totalPayable, false)}
                                            />
                                        )}
                                    </div>
                                </div>
                             ))}

                             {activeCustomLoans.map(loan => (
                                <div key={loan.id} className="space-y-3">
                                    <div className="flex justify-between items-end px-2">
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-black text-accent uppercase tracking-widest">Flexi Protocol Node</p>
                                            <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">ID: #{loan.id.slice(-8).toUpperCase()}</p>
                                        </div>
                                        <Badge variant="outline" className="h-5 text-[8px] font-black tracking-widest border-accent/20 text-accent uppercase">{loan.status}</Badge>
                                    </div>
                                    <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                             <div className="space-y-0.5">
                                                <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Protocol Start</p>
                                                <p className="text-xs font-bold text-white/60">{(loan.activatedAt || loan.createdAt).toDate().toLocaleDateString()}</p>
                                            </div>
                                            <div className="space-y-0.5 text-right">
                                                <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Risk Factor</p>
                                                <p className="text-xs font-bold text-green-400">Low (Verified)</p>
                                            </div>
                                        </div>
                                        <RepaymentRow 
                                            date={loan.dueDate?.toDate() || new Date()} 
                                            amount={loan.totalRepayment || 0} 
                                            status={loan.status === 'active' ? 'Active' : loan.status} 
                                            subtext={`Principal: ₹${loan.requestedAmount} | Matching Int: ₹${loan.interestAmount?.toFixed(2) || '0.00'}`}
                                            isSelected={!!selectedItems.find(item => item.id === loan.id)}
                                            onToggle={() => handleToggleSelect(loan, loan.totalRepayment || 0, true)}
                                        />
                                    </div>
                                </div>
                             ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        ) : (
            <Card className="bg-muted/20 border-dashed border-border rounded-[3rem] py-28 text-center shadow-inner">
                <CardContent className="space-y-6">
                    <div className="h-20 w-20 rounded-3xl bg-muted/50 border border-white/5 flex items-center justify-center mx-auto shadow-xl">
                        <HandCoins size={40} className="text-white/10" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-black uppercase text-white/40 tracking-widest">Protocol Clear</h3>
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">No active liabilities in current node</p>
                    </div>
                    <Button asChild variant="outline" className="border-border text-[10px] font-black uppercase tracking-widest h-12 px-8 rounded-xl hover:bg-primary hover:text-white transition-all">
                        <Link href="/loans">Acquire Capital</Link>
                    </Button>
                </CardContent>
            </Card>
        )}

        <div className="space-y-6">
            <h2 className="text-[10px] font-black uppercase tracking-[5px] text-muted-foreground flex items-center gap-2 px-2">
                <HistoryIcon size={14} className="text-accent" /> Protocol Archive (Settled)
            </h2>
            <div className="grid gap-4">
                {sortedLoans.filter(l => l.status === 'Completed').map(loan => <HistoryCard key={loan.id} loan={loan} />)}
                {sortedCustomLoans.filter(l => l.status === 'completed').map(loan => <HistoryCard key={loan.id} loan={loan} isCustom />)}
                {!sortedLoans.some(l => l.status === 'Completed') && !sortedCustomLoans.some(l => l.status === 'completed') && (
                    <div className="text-center py-20 bg-muted/10 rounded-[2rem] border border-white/5">
                        <p className="text-[10px] text-white/10 uppercase font-black tracking-widest">No past transactions archived</p>
                    </div>
                )}
            </div>
        </div>

        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
            <DialogContent className="rounded-[2.5rem] max-w-sm bg-[#030408]/90 backdrop-blur-2xl border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="text-center font-black uppercase tracking-tight text-xl">Protocol Settlement</DialogTitle>
                    <DialogDescription className="text-center text-white/40 text-[10px] uppercase tracking-widest pt-2">Authorize node dispatch for {selectedItems.length} items</DialogDescription>
                </DialogHeader>
                
                <div className="py-6 space-y-8">
                    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 flex flex-col items-center gap-1 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/30 relative z-10">Total Net Amount</span>
                        <span className="text-5xl font-black text-primary tracking-tighter relative z-10 drop-shadow-[0_0_15px_rgba(139,92,246,0.3)]">₹{totalSelectedAmount.toFixed(2)}</span>
                    </div>

                    <ScrollArea className="max-h-24 pr-4">
                        <div className="space-y-3">
                            {selectedItems.map((item, i) => (
                                <div key={i} className="flex justify-between text-[10px] font-bold text-white/40 uppercase tracking-widest border-l-2 border-primary/20 pl-3">
                                    <span>{item.loanName}</span>
                                    <span className="text-white">₹{item.amount.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>

                    <div className="flex flex-col items-center gap-6 pt-2">
                        <div className="bg-white p-4 rounded-[1.5rem] shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                            <Image
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiDeeplink)}`}
                                alt="UPI QR"
                                width={160}
                                height={160}
                            />
                        </div>
                        <div className="w-full space-y-3">
                            <Label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Destination Gateway (UPI)</Label>
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex justify-between items-center group hover:border-primary/40 transition-all">
                                <span className="font-mono text-sm font-bold text-primary">{targetUpi || 'NOT SET'}</span>
                                <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(targetUpi, 'UPI ID')} className="h-9 w-9 rounded-xl hover:bg-primary/20">
                                    <Copy size={16} className="text-primary" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        <Button asChild className="w-full h-12 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-white/90">
                            <a href={upiDeeplink}>
                                <QrCode size={18} className="mr-2" /> Open Mobile UPI Gateway
                            </a>
                        </Button>
                        <Button onClick={handleBatchMarkAsPaid} className="w-full h-16 rounded-[1.5rem] bg-primary text-white font-black shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                            <ShieldCheck size={22} className="mr-2" /> I HAVE PAID (VERIFY BATCH)
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/20 bg-background/95 backdrop-blur-xl h-16 flex items-center justify-around px-4">
          <BottomNavItem icon={Home} label={t.nav.home} href="/dashboard" />
          <BottomNavItem icon={Briefcase} label={t.nav.plans} href="/plans" />
          <BottomNavItem icon={Trophy} label={t.nav.leaders} href="/leaderboard" />
          <BottomNavItem icon={HandCoins} label={t.nav.loans} href="/my-loans" active/>
          <BottomNavItem icon={User} label={t.nav.profile} href="/profile" />
      </nav>
    </div>
  );
}

function RepaymentRow({ date, amount, status, isSelected, onToggle, subtext }: { date: Date, amount: number, status: string, isSelected: boolean, onToggle: () => void, subtext?: string }) {
    const isPaid = status.toLowerCase() === 'paid' || status.toLowerCase() === 'completed';
    const isPendingAdmin = status.toLowerCase() === 'payment pending';
    const isSelectable = !isPaid && !isPendingAdmin;

    return (
        <div 
            onClick={() => isSelectable && onToggle()}
            className={cn(
                "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group",
                isSelected ? "bg-primary/10 border-primary/40 shadow-lg scale-[1.02]" : "bg-muted/30 border-border hover:bg-muted",
                !isSelectable && "cursor-default opacity-60"
            )}
        >
            <div className="flex items-center gap-4">
                {isSelectable ? (
                    <Checkbox checked={isSelected} onCheckedChange={onToggle} className="h-6 w-6 rounded-lg border-border data-[state=checked]:bg-primary" />
                ) : (
                    <div className="h-6 w-6 rounded-lg border border-border flex items-center justify-center">
                        {isPaid ? <CheckCircle size={14} className="text-accent" /> : <Timer size={14} className="text-primary animate-pulse" />}
                    </div>
                )}
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{date.toLocaleDateString()}</span>
                    <span className="text-base font-black tracking-tight text-white">₹{amount.toFixed(2)}</span>
                    {subtext && <span className="text-[8px] font-bold text-primary/60 uppercase tracking-widest mt-0.5">{subtext}</span>}
                </div>
            </div>
            {isPaid ? (
                <Badge variant="outline" className="h-6 bg-accent/10 text-accent border-accent/20 text-[8px] font-black uppercase tracking-widest px-3">SETTLED</Badge>
            ) : isPendingAdmin ? (
                <Badge variant="outline" className="h-6 bg-primary/10 text-primary border-primary/20 text-[8px] font-black uppercase tracking-widest px-3">VERIFYING</Badge>
            ) : (
                <div className={cn("h-6 px-4 flex items-center justify-center rounded-full text-[8px] font-black uppercase tracking-widest border transition-all", isSelected ? "bg-primary text-white border-primary shadow-lg" : "bg-white/5 text-white/30 border-white/5")}>
                    {isSelected ? 'SELECTED' : 'SELECT'}
                </div>
            )}
        </div>
    )
}

function HistoryCard({ loan, isCustom }: { loan: any, isCustom?: boolean }) {
    const principal = isCustom ? (loan.requestedAmount || 0) : (loan.loanAmount || 0);
    const total = isCustom ? (loan.totalRepayment || 0) : (loan.totalPayable || 0);
    const interest = total - principal;
    const startDate = (loan.startDate || loan.activatedAt || loan.createdAt)?.toDate() || new Date();
    const settledDate = (loan.repaidAt || loan.paidNotificationAt || loan.dueDate)?.toDate() || new Date();

    return (
        <Card className="bg-muted/10 border-border rounded-3xl p-6 group grayscale hover:grayscale-0 transition-all duration-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <ShieldCheck size={100} className="text-accent" />
            </div>
            
            <div className="flex items-center justify-between relative z-10 mb-6">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-accent/5 flex items-center justify-center border border-accent/10 shadow-inner">
                        <Stamp size={24} className="text-accent -rotate-12" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                             <p className="text-base font-black text-white">{isCustom ? 'Flexi Protocol' : loan.planName}</p>
                             <Badge className="bg-accent/10 text-accent border-accent/20 text-[7px] font-black uppercase h-4 px-1.5">VERIFIED</Badge>
                        </div>
                        <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mt-0.5">Protocol Node: #{loan.id.slice(-8).toUpperCase()}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5 text-accent font-black text-[9px] uppercase tracking-widest">
                        <CheckCircle2 size={12} /> SETTLED
                    </div>
                    <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Archived {settledDate.toLocaleDateString()}</p>
                </div>
            </div>

            <div className="space-y-4 relative z-10">
                <div className="grid grid-cols-2 gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-white/5 pb-4">
                    <div className="flex justify-between"><span>Initiated</span><span className="text-white/60">{startDate.toLocaleDateString()}</span></div>
                    <div className="flex justify-between pl-4 border-l border-white/5"><span>Completed</span><span className="text-white/60">{settledDate.toLocaleDateString()}</span></div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-black/20 rounded-2xl p-3 text-center border border-white/5">
                        <p className="text-[7px] font-black text-muted-foreground uppercase tracking-widest mb-1">Principal</p>
                        <p className="text-xs font-bold text-white">₹{principal.toLocaleString()}</p>
                    </div>
                    <div className="bg-black/20 rounded-2xl p-3 text-center border border-white/5">
                        <p className="text-[7px] font-black text-muted-foreground uppercase tracking-widest mb-1">Fee/Interest</p>
                        <p className="text-xs font-bold text-primary/60">₹{interest.toFixed(2)}</p>
                    </div>
                    <div className="bg-accent/5 rounded-2xl p-3 text-center border border-accent/10">
                        <p className="text-[7px] font-black text-accent/60 uppercase tracking-widest mb-1">Final Payout</p>
                        <p className="text-xs font-black text-accent">₹{total.toFixed(2)}</p>
                    </div>
                </div>
            </div>
        </Card>
    );
}

function BottomNavItem({ icon: Icon, label, href, active = false }: { icon: React.ElementType, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={cn(
        "flex flex-col items-center justify-center gap-1 transition-all h-full relative",
        active ? 'text-primary scale-110' : 'text-white/40 hover:text-white/60'
    )}>
      <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]")} />
      <span className="text-[10px] tracking-tighter uppercase font-black">{label}</span>
      {active && <div className="absolute -bottom-1 h-1 w-8 bg-primary rounded-full blur-[2px]" />}
    </Link>
  );
}
