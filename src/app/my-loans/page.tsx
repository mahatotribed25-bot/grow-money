
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
  Info
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
        <span className="font-mono font-black text-foreground/80">
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
            <Card className="bg-card border-border rounded-[2rem] overflow-hidden shadow-2xl relative">
                <CardHeader className="pb-2 pt-8">
                    <p className="text-[10px] font-black uppercase tracking-[4px] text-muted-foreground">Active Obligations</p>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Due for Settlement</span>
                            <span className="text-4xl font-black tracking-tighter">
                                ₹{totalSelectedAmount > 0 ? totalSelectedAmount.toLocaleString() : "0.00"}
                            </span>
                        </div>
                        {selectedItems.length > 0 && (
                            <Button onClick={() => setIsPaymentModalOpen(true)} className="h-12 px-6 rounded-2xl bg-accent text-accent-foreground font-black uppercase text-[10px] tracking-widest animate-in zoom-in-50">
                                Pay Selected ({selectedItems.length})
                            </Button>
                        )}
                    </div>

                    <div className="bg-muted border border-border rounded-2xl p-4 flex items-center justify-between shadow-inner">
                        <div className="flex items-center gap-3">
                            <Clock size={16} className="text-primary animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[2px] text-muted-foreground">Next Deadline</span>
                        </div>
                        <TimeRemaining targetDate={activeStandardLoans[0]?.dueDate.toDate() || activeCustomLoans[0]?.dueDate?.toDate() || new Date()} />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                             <p className="text-[10px] font-black uppercase tracking-[4px] text-muted-foreground">Repayment Schedule</p>
                             <p className="text-[8px] font-bold text-muted-foreground uppercase">Select items to pay</p>
                        </div>
                        
                        <div className="space-y-3">
                             {activeStandardLoans.map(loan => (
                                <div key={loan.id} className="space-y-2">
                                    <div className="flex justify-between items-end px-2">
                                        <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest">{loan.planName} Schedule</p>
                                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Node ID: #{loan.id.slice(-6).toUpperCase()}</p>
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
                             ))}

                             {activeCustomLoans.map(loan => (
                                <div key={loan.id} className="space-y-2">
                                    <div className="flex justify-between items-end px-2">
                                        <p className="text-[9px] font-black text-accent/60 uppercase tracking-widest">Flexi Protocol Node</p>
                                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">ID: {loan.id.slice(-6).toUpperCase()}</p>
                                    </div>
                                    <RepaymentRow 
                                        date={loan.dueDate?.toDate() || new Date()} 
                                        amount={loan.totalRepayment || 0} 
                                        status={loan.status === 'active' ? 'Active' : loan.status} 
                                        subtext={`Principal: ₹${loan.requestedAmount} | Int: ₹${loan.interestAmount?.toFixed(2) || '0.00'}`}
                                        isSelected={!!selectedItems.find(item => item.id === loan.id)}
                                        onToggle={() => handleToggleSelect(loan, loan.totalRepayment || 0, true)}
                                    />
                                </div>
                             ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        ) : (
            <Card className="bg-muted/20 border-dashed border-border rounded-[2rem] py-20 text-center">
                <CardContent className="space-y-4">
                    <HandCoins size={48} className="mx-auto text-muted-foreground/20" />
                    <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">No active liabilities</p>
                    <Button asChild variant="outline" className="border-border text-[10px] font-black uppercase tracking-widest h-10 rounded-xl">
                        <Link href="/loans">Apply for Capital</Link>
                    </Button>
                </CardContent>
            </Card>
        )}

        <div className="space-y-6">
            <h2 className="text-[10px] font-black uppercase tracking-[4px] text-muted-foreground flex items-center gap-2 px-2">
                <ShieldCheck size={14} className="text-accent" /> Settled History
            </h2>
            <div className="grid gap-4">
                {sortedLoans.filter(l => l.status === 'Completed').map(loan => <HistoryCard key={loan.id} loan={loan} />)}
                {sortedCustomLoans.filter(l => l.status === 'completed').map(loan => <HistoryCard key={loan.id} loan={loan} isCustom />)}
                {!sortedLoans.some(l => l.status === 'Completed') && !sortedCustomLoans.some(l => l.status === 'completed') && (
                    <p className="text-center text-[10px] text-muted-foreground uppercase font-black py-10">No past transactions archived</p>
                )}
            </div>
        </div>

        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
            <DialogContent className="rounded-[2.5rem] max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-center font-black uppercase tracking-tight">Batch Settlement</DialogTitle>
                    <DialogDescription className="text-center text-muted-foreground text-[10px] uppercase tracking-widest">Authorize dispatch for {selectedItems.length} selected items</DialogDescription>
                </DialogHeader>
                
                <div className="py-6 space-y-6">
                    <div className="bg-muted p-6 rounded-[2rem] border border-border flex flex-col items-center gap-1 shadow-inner">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Net Amount</span>
                        <span className="text-4xl font-black text-primary tracking-tighter">₹{totalSelectedAmount.toFixed(2)}</span>
                    </div>

                    <ScrollArea className="max-h-24 pr-4">
                        <div className="space-y-2">
                            {selectedItems.map((item, i) => (
                                <div key={i} className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                                    <span>{item.loanName}</span>
                                    <span>₹{item.amount.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>

                    <div className="flex flex-col items-center gap-4 pt-2">
                        <div className="bg-white p-3 rounded-2xl shadow-xl">
                            <Image
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiDeeplink)}`}
                                alt="UPI QR"
                                width={150}
                                height={150}
                            />
                        </div>
                        <div className="w-full space-y-2">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Admin UPI ID</Label>
                            <div className="bg-muted border border-border rounded-xl p-4 flex justify-between items-center group">
                                <span className="font-mono text-xs font-bold">{targetUpi || 'NOT SET'}</span>
                                <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(targetUpi, 'UPI ID')} className="h-8 w-8 hover:bg-background">
                                    <Copy size={14} className="text-primary" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Button asChild className="w-full h-12 rounded-xl bg-foreground text-background font-black uppercase tracking-widest text-[10px] shadow-xl">
                            <a href={upiDeeplink}>
                                <QrCode size={16} className="mr-2" /> Open UPI App Terminal
                            </a>
                        </Button>
                        <Button onClick={handleBatchMarkAsPaid} className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black shadow-xl hover:scale-[1.02] transition-all">
                            <ShieldCheck size={18} className="mr-2" /> I HAVE PAID (FINALIZE BATCH)
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
                isSelected ? "bg-primary/10 border-primary/40 shadow-lg" : "bg-muted/30 border-border hover:bg-muted",
                !isSelectable && "cursor-default opacity-80"
            )}
        >
            <div className="flex items-center gap-4">
                {isSelectable && (
                    <Checkbox checked={isSelected} onCheckedChange={onToggle} className="h-5 w-5 rounded-lg border-border" />
                )}
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{date.toLocaleDateString()}</span>
                    <span className="text-base font-black tracking-tight">₹{amount.toFixed(2)}</span>
                    {subtext && <span className="text-[8px] font-bold text-primary/40 uppercase tracking-widest">{subtext}</span>}
                </div>
            </div>
            {isPaid ? (
                <Badge variant="outline" className="h-6 bg-accent/10 text-accent border-accent/20 text-[8px] font-black uppercase tracking-widest px-3">PAID</Badge>
            ) : isPendingAdmin ? (
                <Badge variant="outline" className="h-6 bg-primary/10 text-primary border-primary/20 text-[8px] font-black uppercase tracking-widest px-3">VERIFYING</Badge>
            ) : (
                <div className={cn("h-6 px-3 flex items-center justify-center rounded-full text-[8px] font-black uppercase tracking-widest border transition-colors", isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border")}>
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

    return (
        <Card className="bg-muted/20 border-border rounded-2xl p-5 group grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all relative overflow-hidden">
            <div className="flex items-center justify-between relative z-10 mb-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-accent/5 flex items-center justify-center border border-accent/10">
                        <CheckCircle2 size={18} className="text-accent" />
                    </div>
                    <div>
                        <p className="text-sm font-bold">{isCustom ? 'Flexi Protocol' : loan.planName}</p>
                        <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Protocol Node ID: #{loan.id.slice(-6).toUpperCase()}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-accent/50 uppercase tracking-widest">SETTLED</p>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase">{new Date((loan.startDate || loan.createdAt || Timestamp.now()).seconds * 1000).toLocaleDateString()}</p>
                </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 relative z-10">
                <div className="bg-muted rounded-lg p-2 text-center border border-border">
                    <p className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">Principal</p>
                    <p className="text-[11px] font-bold">₹{principal}</p>
                </div>
                <div className="bg-muted rounded-lg p-2 text-center border border-border">
                    <p className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">Interest</p>
                    <p className="text-[11px] font-bold text-primary/60">₹{interest.toFixed(2)}</p>
                </div>
                <div className="bg-muted rounded-lg p-2 text-center border border-border">
                    <p className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">Settled</p>
                    <p className="text-[11px] font-bold text-accent">₹{total.toFixed(2)}</p>
                </div>
            </div>
        </Card>
    );
}

function BottomNavItem({ icon: Icon, label, href, active = false }: { icon: React.ElementType, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={cn(
        "flex flex-col items-center justify-center gap-1 transition-all h-full relative",
        active ? 'text-primary scale-110' : 'text-muted-foreground hover:text-foreground'
    )}>
      <Icon className={cn("h-5 w-5")} />
      <span className="text-[10px] tracking-tighter">{label}</span>
      {active && <div className="absolute -bottom-1 h-1 w-8 bg-primary rounded-full blur-[2px]" />}
    </Link>
  );
}
