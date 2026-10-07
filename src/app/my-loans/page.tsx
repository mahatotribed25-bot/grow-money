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
  Shield,
  ReceiptIndianRupee,
  FileBadge,
  Zap,
  ArrowRight,
  Lock,
  Camera,
  ImageIcon,
  X,
  XCircle,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import { collection, Timestamp, where, query, doc, serverTimestamp, writeBatch, updateDoc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo, useRef } from 'react';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { useSettings } from '@/context/settings-context';
import { differenceInDays } from 'date-fns';
import { Separator } from '@/components/ui/separator';

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
  tax?: number;
  penalty?: number;
  startDate: Timestamp;
  dueDate: Timestamp;
  settledAt?: Timestamp;
  status: 'Active' | 'Due' | 'Completed' | 'Payment Pending';
  repaymentMethod?: 'EMI' | 'Direct';
  emis?: EMI[];
};

type AdminSettings = {
    adminUpi?: string;
    customLoanUpi?: string;
    loanPenalty?: number;
    customLoanPenalty?: number;
}

type CustomLoanRequest = {
  id: string;
  requestedAmount: number;
  requestedDuration: number;
  status: 'pending_admin_review' | 'pending_user_approval' | 'approved_by_user' | 'active' | 'completed' | 'rejected_by_user' | 'rejected_by_admin' | 'payment_pending' | 'extension_pending';
  totalRepayment?: number;
  interestAmount?: number;
  interestRate?: number;
  penalty?: number;
  createdAt: Timestamp;
  activatedAt?: Timestamp;
  dueDate?: Timestamp;
  settledAt?: Timestamp;
  extensionRequestedDays?: number;
  adminDispatchScreenshot?: string;
  adminDispatchTid?: string;
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [extensionDays, setExtensionDays] = useState('7');
  const [extTargetId, setExtTargetId] = useState<string | null>(null);
  
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [paymentTid, setPaymentTid] = useState('');
  const [viewingAdminProof, setViewingAdminProof] = useState<string | null>(null);

  const loading = loansLoading || settingsLoading || customLoansLoading;

  const processedStandardLoans = useMemo(() => {
    if (!allLoans) return [];
    return allLoans.map(loan => {
        if (loan.status !== 'Completed' && loan.dueDate && adminSettings?.loanPenalty) {
            const now = new Date();
            const due = loan.dueDate.toDate();
            if (now > due) {
                const daysLate = differenceInDays(now, due);
                const accruedPenalty = daysLate * adminSettings.loanPenalty;
                return { ...loan, penalty: accruedPenalty };
            }
        }
        return loan;
    });
  }, [allLoans, adminSettings]);
  
  const sortedLoans = useMemo(() => processedStandardLoans.sort((a,b) => b.startDate.seconds - a.startDate.seconds), [processedStandardLoans]);
  
  const processedCustomLoans = useMemo(() => {
    if (!customLoans) return [];
    return customLoans.map(loan => {
        if (loan.status === 'active' && loan.dueDate && adminSettings?.customLoanPenalty) {
            const now = new Date();
            const due = loan.dueDate.toDate();
            if (now > due) {
                const daysLate = differenceInDays(now, due);
                const accruedPenalty = daysLate * adminSettings.customLoanPenalty;
                return { ...loan, penalty: accruedPenalty };
            }
        }
        return loan;
    });
  }, [customLoans, adminSettings]);

  const sortedCustomLoans = useMemo(() => processedCustomLoans.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds), [processedCustomLoans]);

  // Filters for Tabs
  const activeStandard = sortedLoans.filter(l => l.status !== 'Completed');
  const historyStandard = sortedLoans.filter(l => l.status === 'Completed').sort((a,b) => (b.settledAt?.seconds || 0) - (a.settledAt?.seconds || 0));
  
  const activeCustom = sortedCustomLoans.filter(l => ['active', 'payment_pending', 'extension_pending', 'pending_user_approval', 'approved_by_user'].includes(l.status));
  const historyCustom = sortedCustomLoans.filter(l => l.status === 'completed').sort((a,b) => (b.settledAt?.seconds || 0) - (a.settledAt?.seconds || 0));

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const img = new window.Image();
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_DIM = 1000;
        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        setPaymentScreenshot(canvas.toDataURL('image/jpeg', 0.6));
      };
    };
    reader.readAsDataURL(file);
  };

  const handleAcceptOffer = async (requestId: string) => {
    try {
        await updateDoc(doc(firestore, 'customLoanRequests', requestId), {
            status: 'approved_by_user',
            userAcceptedAt: serverTimestamp()
        });
        toast({ title: "Offer Accepted", description: "Funds will be dispatched soon." });
    } catch (e) {
        toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleRequestExtension = async () => {
    if (!extTargetId) return;
    try {
        await updateDoc(doc(firestore, 'customLoanRequests', extTargetId), {
            status: 'extension_pending',
            extensionRequestedDays: parseInt(extensionDays),
            extensionRequestedAt: serverTimestamp()
        });
        toast({ title: "Extension Requested", description: "The admin will review your request shortly." });
        setExtTargetId(null);
    } catch (e) {
        toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleBatchMarkAsPaid = async () => {
    if (!user || selectedItems.length === 0) return;
    if (!paymentTid || !paymentScreenshot) {
      toast({ title: "Verification Error", description: "Please provide both the Transaction ID and Screenshot.", variant: "destructive" });
      return;
    }
    
    setIsProcessing(true);
    const batch = writeBatch(firestore);
    
    selectedItems.forEach(item => {
        const loanRef = doc(firestore, item.isCustom ? 'customLoanRequests' : `users/${user.uid}/loans`, item.id);
        
        if (item.isCustom) {
            batch.update(loanRef, { 
                status: 'payment_pending', 
                paidNotificationAt: serverTimestamp(),
                userPaymentScreenshot: paymentScreenshot,
                userPaymentTid: paymentTid
            });
        } else {
            const originalLoan = processedStandardLoans.find(l => l.id === item.id);
            if (originalLoan && originalLoan.emis && item.emiIndex !== undefined) {
                const updatedEmis = [...originalLoan.emis];
                updatedEmis[item.emiIndex].status = 'Payment Pending';
                batch.update(loanRef, { 
                  emis: updatedEmis,
                  lastUserPaymentTid: paymentTid,
                  lastUserPaymentScreenshot: paymentScreenshot
                });
            } else {
                batch.update(loanRef, { 
                  status: 'Payment Pending',
                  lastUserPaymentTid: paymentTid,
                  lastUserPaymentScreenshot: paymentScreenshot
                });
            }
        }
    });

    try {
        await batch.commit();
        toast({ title: 'Success', description: 'Repayment notified for verification.' });
        setSelectedItems([]);
        setIsPaymentModalOpen(false);
        setPaymentScreenshot(null);
        setPaymentTid('');
    } catch (e: any) {
        toast({ title: 'Update Failed', description: "Could not save records. Image might be too large.", variant: 'destructive' });
    } finally {
        setIsProcessing(false);
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

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground transition-colors duration-300 pb-20">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 backdrop-blur-sm px-4 sm:px-6">
        <Link href="/dashboard"><Button variant="ghost" size="icon" className="hover:bg-accent text-foreground/70"><ChevronLeft /></Button></Link>
        <h1 className="text-lg font-bold tracking-tighter uppercase">{t.nav.loans}</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8">
        
        <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted h-14 rounded-2xl p-1.5 border border-border">
                <TabsTrigger value="active" className="rounded-xl font-bold uppercase tracking-widest text-[9px] data-[state=active]:bg-background">Active Obligations</TabsTrigger>
                <TabsTrigger value="history" className="rounded-xl font-bold uppercase tracking-widest text-[9px] data-[state=active]:bg-background">Repayment History</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-8 space-y-8">
                {(activeStandard.length > 0 || activeCustom.length > 0) ? (
                    <Card className="bg-card border-border rounded-[2rem] overflow-hidden shadow-2xl relative border-primary/10">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-transparent" />
                        <CardHeader className="pb-2 pt-10 px-8">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[4px] text-primary/60">Current Dues</p>
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

                            <div className="space-y-6">
                                <div className="flex items-center justify-between px-1">
                                    <p className="text-[10px] font-black uppercase tracking-[4px] text-muted-foreground">Repayment Schedule</p>
                                    <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-50">Select items to pay</p>
                                </div>
                                
                                <div className="space-y-4">
                                    {activeStandard.map(loan => (
                                        <div key={loan.id} className="space-y-3">
                                            <div className="flex justify-between items-end px-2">
                                                <div className="space-y-0.5">
                                                    <p className="text-[10px] font-black text-white uppercase tracking-widest">{loan.planName}</p>
                                                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">#{loan.id.slice(-8).toUpperCase()}</p>
                                                </div>
                                                <Badge variant="outline" className="h-5 text-[8px] font-black tracking-widest border-primary/20 text-primary uppercase">{loan.status}</Badge>
                                            </div>
                                            <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5 space-y-4">
                                                <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-4">
                                                    <div className="space-y-0.5">
                                                        <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Disbursed On</p>
                                                        <p className="text-xs font-bold text-white/60">{loan.startDate.toDate().toLocaleDateString()}</p>
                                                    </div>
                                                    <div className="space-y-0.5 text-right">
                                                        <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Late Penalty</p>
                                                        <p className={cn("text-xs font-bold", (loan.penalty || 0) > 0 ? "text-red-400" : "text-white/40")}>₹{(loan.penalty || 0).toFixed(2)}</p>
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
                                                        amount={loan.totalPayable + (loan.penalty || 0)} 
                                                        status={loan.status} 
                                                        subtext={loan.penalty ? `Includes ₹${loan.penalty.toFixed(2)} Late Penalty` : undefined}
                                                        isSelected={!!selectedItems.find(item => item.id === loan.id && item.emiIndex === undefined)}
                                                        onToggle={() => handleToggleSelect(loan, loan.totalPayable + (loan.penalty || 0), false)}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {activeCustom.map(loan => {
                                        const isRepaymentVisible = ['active', 'payment_pending', 'extension_pending'].includes(loan.status);

                                        return (
                                        <div key={loan.id} className="space-y-3">
                                            <div className="flex justify-between items-end px-2">
                                                <div className="space-y-0.5">
                                                    <p className="text-[10px] font-black text-accent uppercase tracking-widest">Flexi Protocol Node</p>
                                                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">#{loan.id.slice(-8).toUpperCase()}</p>
                                                </div>
                                                <Badge variant="outline" className={cn(
                                                    "h-5 text-[8px] font-black tracking-widest uppercase border-accent/20 text-accent",
                                                    loan.status === 'pending_user_approval' && "text-blue-400 border-blue-400/20"
                                                )}>
                                                    {loan.status.replace(/_/g, ' ')}
                                                </Badge>
                                            </div>
                                            <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5 space-y-4">
                                                {loan.status === 'pending_user_approval' ? (
                                                    <div className="space-y-4">
                                                        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl space-y-3">
                                                            <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Offer Available</p>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <p className="text-[8px] font-bold text-white/20 uppercase">Interest</p>
                                                                    <p className="text-sm font-black text-white">{loan.interestRate?.toFixed(2)}%</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-[8px] font-bold text-white/20 uppercase">Settlement</p>
                                                                    <p className="text-sm font-black text-green-400">₹{loan.totalRepayment?.toFixed(2)}</p>
                                                                </div>
                                                            </div>
                                                            <Button onClick={() => handleAcceptOffer(loan.id)} className="w-full bg-blue-600 text-white font-black uppercase text-[10px] h-10 rounded-lg">Accept Offer</Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-0.5">
                                                                <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Protocol Start</p>
                                                                <p className="text-xs font-bold text-white/60">{(loan.activatedAt || loan.createdAt).toDate().toLocaleDateString()}</p>
                                                            </div>
                                                            <div className="space-y-0.5 text-right">
                                                                <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Penalty</p>
                                                                <p className={cn("text-xs font-bold", (loan.penalty || 0) > 0 ? "text-red-400" : "text-white/40")}>₹{(loan.penalty || 0).toFixed(2)}</p>
                                                            </div>
                                                        </div>
                                                        
                                                        {loan.adminDispatchScreenshot && (
                                                            <Button variant="outline" size="sm" onClick={() => setViewingAdminProof(loan.adminDispatchScreenshot!)} className="w-full h-8 text-[9px] font-black uppercase border-primary/20 text-primary gap-2">
                                                                <ImageIcon size={12}/> View Dispatch Receipt
                                                            </Button>
                                                        )}

                                                        {isRepaymentVisible ? (
                                                            <RepaymentRow 
                                                                date={loan.dueDate?.toDate() || new Date()} 
                                                                amount={(loan.totalRepayment || 0) + (loan.penalty || 0)} 
                                                                status={loan.status === 'active' ? 'Active' : loan.status} 
                                                                subtext={loan.penalty ? `Includes ₹${loan.penalty.toFixed(2)} Late Penalty` : `Principal: ₹${loan.requestedAmount} | Int: ₹${loan.interestAmount?.toFixed(2) || '0.00'}`}
                                                                isSelected={!!selectedItems.find(item => item.id === loan.id)}
                                                                onToggle={() => handleToggleSelect(loan, (loan.totalRepayment || 0) + (loan.penalty || 0), true)}
                                                            />
                                                        ) : (
                                                            <div className="p-8 text-center text-[10px] font-black uppercase text-white/10 italic">Awaiting Fund Dispatch</div>
                                                        )}

                                                        {loan.status === 'active' && (
                                                            <Button variant="ghost" onClick={() => setExtTargetId(loan.id)} className="w-full text-[9px] font-black uppercase tracking-widest text-primary h-8 gap-2">
                                                                <Zap size={12}/> Request Time Extension
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="bg-muted/20 border-dashed border-border rounded-[3rem] py-28 text-center shadow-inner">
                        <CardContent className="space-y-6">
                            <div className="h-20 w-20 rounded-3xl bg-muted/50 border border-white/5 flex items-center justify-center mx-auto">
                                <HandCoins size={40} className="text-white/10" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-black uppercase text-white/40 tracking-widest">Protocol Clear</h3>
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">No active liabilities</p>
                            </div>
                            <Button asChild variant="outline" className="border-border text-[10px] font-black uppercase tracking-widest h-12 px-8 rounded-xl">
                                <Link href="/loans">Acquire Capital</Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </TabsContent>

            <TabsContent value="history" className="mt-8 space-y-6">
                {(historyStandard.length > 0 || historyCustom.length > 0) ? (
                    <div className="space-y-6">
                        {historyStandard.map(loan => (
                             <Card key={loan.id} className="bg-card border-border rounded-3xl p-6 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5"><ShieldCheck size={100} /></div>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <p className="text-[10px] font-black text-primary uppercase tracking-[3px] mb-1">Standard Protocol Node</p>
                                        <h3 className="text-lg font-black text-white tracking-tight">{loan.planName}</h3>
                                    </div>
                                    <Badge className="bg-accent/20 text-accent border-accent/20 text-[9px] font-black uppercase px-3 h-6">SETTLED</Badge>
                                </div>

                                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <HistoryMetric label="Base Principal" value={`₹${loan.loanAmount.toLocaleString()}`} />
                                        <HistoryMetric label="Interest Paid" value={`+ ₹${(loan.interest || 0).toLocaleString()}`} />
                                        <HistoryMetric label="Penalty Node" value={`+ ₹${(loan.penalty || 0).toLocaleString()}`} isPenalty />
                                        <HistoryMetric label="Final Settlement" value={`₹${(loan.totalPayable + (loan.penalty || 0)).toLocaleString()}`} isHighlight />
                                    </div>
                                    <Separator className="bg-white/5" />
                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-white/30">
                                        <div className="flex items-center gap-1.5"><Calendar size={12}/> Disbursed: {loan.startDate.toDate().toLocaleDateString()}</div>
                                        <div className="flex items-center gap-1.5"><CheckCircle size={12} className="text-accent"/> Settled: {loan.settledAt ? loan.settledAt.toDate().toLocaleDateString() : 'N/A'}</div>
                                    </div>
                                </div>
                             </Card>
                        ))}
                        {historyCustom.map(loan => (
                             <Card key={loan.id} className="bg-card border-border rounded-3xl p-6 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5"><Zap size={100} className="text-accent" /></div>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <p className="text-[10px] font-black text-accent uppercase tracking-[3px] mb-1">Flexible Protocol Node</p>
                                        <h3 className="text-lg font-black text-white tracking-tight">Flexible Loan Portfolio</h3>
                                    </div>
                                    <Badge className="bg-accent/20 text-accent border-accent/20 text-[9px] font-black uppercase px-3 h-6">ARCHIVED</Badge>
                                </div>

                                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <HistoryMetric label="Base Principal" value={`₹${loan.requestedAmount.toLocaleString()}`} />
                                        <HistoryMetric label="Agreed Interest" value={`+ ₹${(loan.interestAmount || 0).toLocaleString()}`} />
                                        <HistoryMetric label="Penalty Node" value={`+ ₹${(loan.penalty || 0).toLocaleString()}`} isPenalty />
                                        <HistoryMetric label="Final Settlement" value={`₹${((loan.totalRepayment || 0) + (loan.penalty || 0)).toLocaleString()}`} isHighlight />
                                    </div>
                                    <Separator className="bg-white/5" />
                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-white/30">
                                        <div className="flex items-center gap-1.5"><Calendar size={12}/> Active: {loan.activatedAt ? loan.activatedAt.toDate().toLocaleDateString() : loan.createdAt.toDate().toLocaleDateString()}</div>
                                        <div className="flex items-center gap-1.5"><CheckCircle size={12} className="text-accent"/> Settled: {loan.settledAt ? loan.settledAt.toDate().toLocaleDateString() : 'N/A'}</div>
                                    </div>
                                </div>
                             </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-muted/20 border-dashed border-border rounded-[3rem] shadow-inner space-y-4">
                        <HistoryIcon size={48} className="mx-auto text-white/10" />
                        <p className="text-white/20 text-xs uppercase font-black tracking-widest">No repayment history recorded</p>
                    </div>
                )}
            </TabsContent>
        </Tabs>

        {/* Extension Dialog */}
        <Dialog open={!!extTargetId} onOpenChange={() => setExtTargetId(null)}>
            <DialogContent className="bg-[#030408] border-white/10 text-white rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase">Term Extension</DialogTitle>
                    <DialogDescription className="text-white/40">Request more time to settle.</DialogDescription>
                </DialogHeader>
                <div className="py-6 space-y-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-white/20 tracking-widest pl-1">Extra Days Node</Label>
                        <Select value={extensionDays} onValueChange={setExtensionDays}>
                            <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#030408] border-white/10">
                                <SelectItem value="3">3 Days</SelectItem>
                                <SelectItem value="7">7 Days</SelectItem>
                                <SelectItem value="15">15 Days</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleRequestExtension} className="w-full h-14 rounded-2xl bg-primary text-white font-black">Submit Request</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Settlement Dialog (User pays money) */}
        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
            <DialogContent className="rounded-[2.5rem] max-w-sm bg-[#030408]/90 backdrop-blur-2xl border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="text-center font-black uppercase tracking-tight text-xl">Protocol Settlement</DialogTitle>
                    <DialogDescription className="text-center text-white/40 text-[10px] uppercase pt-2">Send payment and upload proof</DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="max-h-[80vh] px-1">
                    <div className="py-6 space-y-8">
                        <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 flex flex-col items-center gap-1 shadow-2xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30 relative z-10">Total Net Amount</span>
                            <span className="text-5xl font-black text-primary tracking-tighter relative z-10">₹{totalSelectedAmount.toFixed(2)}</span>
                        </div>

                        <div className="flex flex-col items-center gap-6">
                            <div className="bg-white p-4 rounded-[1.5rem] shadow-xl">
                                <Image
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiDeeplink)}`}
                                    alt="UPI QR"
                                    width={160}
                                    height={160}
                                />
                            </div>
                            <div className="w-full space-y-3">
                                <Label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Destination Gateway (UPI)</Label>
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex justify-between items-center group">
                                    <span className="font-mono text-sm font-bold text-primary">{targetUpi || 'NOT SET'}</span>
                                    <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(targetUpi, 'UPI ID')} className="h-9 w-9 rounded-xl hover:bg-primary/20">
                                        <Copy size={16} className="text-primary" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-white/5" />

                        <div className="space-y-4">
                            <Label className="text-[10px] font-black text-white/20 uppercase tracking-widest pl-1">Payment Proof (Required)</Label>
                            <input type="file" id="repay-upload" className="hidden" accept="image/*" onChange={handleFileChange} />
                            <Button variant="outline" type="button" onClick={() => document.getElementById('repay-upload')?.click()} className="w-full h-14 rounded-2xl border-dashed border-primary/30 bg-primary/5 text-primary font-black uppercase text-[10px] gap-2">
                                <Camera size={18} /> {paymentScreenshot ? 'Change Photo' : 'Capture Payment Screenshot'}
                            </Button>
                            {paymentScreenshot && <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10"><Image src={paymentScreenshot} alt="repayment proof" fill className="object-contain" /></div>}
                            
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-white/20 uppercase tracking-widest pl-1">Transaction Ref ID (UTR)</Label>
                                <Input placeholder="12-digit Ref ID" value={paymentTid} onChange={e => setPaymentTid(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl font-mono" />
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            <Button asChild className="w-full h-12 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] shadow-xl">
                                <a href={upiDeeplink}><QrCode size={18} className="mr-2" /> Open UPI Gateway</a>
                            </Button>
                            <Button 
                              onClick={handleBatchMarkAsPaid} 
                              disabled={!paymentTid || !paymentScreenshot || isProcessing} 
                              className="w-full h-16 rounded-[1.5rem] bg-primary text-white font-black shadow-2xl transition-all"
                            >
                                {isProcessing ? (
                                  <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck size={22} className="mr-2" /> 
                                    I HAVE PAID
                                  </>
                                )}
                            </Button>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>

        {/* Full Image Proof Modal */}
        <Dialog open={!!viewingAdminProof} onOpenChange={() => setViewingAdminProof(null)}>
            <DialogContent className="max-w-md bg-black/95 p-0 border-none overflow-hidden rounded-3xl">
                 <div className="relative aspect-[9/16] w-full">
                     {viewingAdminProof && <Image src={viewingAdminProof} alt="proof" fill className="object-contain" />}
                 </div>
                 <Button variant="ghost" onClick={() => setViewingAdminProof(null)} className="absolute top-4 right-4 text-white"><X/></Button>
            </DialogContent>
        </Dialog>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/20 bg-background/95 backdrop-blur-sm h-16 flex items-center justify-around px-4">
          <BottomNavItem icon={Home} label={t.nav.home} href="/dashboard" />
          <BottomNavItem icon={Briefcase} label={t.nav.plans} href="/plans" />
          <BottomNavItem icon={Trophy} label={t.nav.leaders} href="/leaderboard" />
          <BottomNavItem icon={HandCoins} label={t.nav.loans} href="/my-loans" active/>
          <BottomNavItem icon={User} label={t.nav.profile} href="/profile" />
      </nav>
    </div>
  );
}

function HistoryMetric({ label, value, isHighlight, isPenalty }: { label: string, value: string, isHighlight?: boolean, isPenalty?: boolean }) {
    return (
        <div className="space-y-1">
            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">{label}</p>
            <p className={cn(
                "text-base font-black tracking-tight",
                isHighlight ? "text-white" : isPenalty ? "text-red-400" : "text-white/60"
            )}>
                {value}
            </p>
        </div>
    )
}

function RepaymentRow({ date, amount, status, isSelected, onToggle, subtext }: { date: Date, amount: number, status: string, isSelected: boolean, onToggle: () => void, subtext?: string }) {
    const s = status.toLowerCase();
    const isPaid = s === 'paid' || s === 'completed';
    const isPendingAdmin = s === 'payment pending' || s === 'payment_pending';
    const isSelectable = !isPaid && !isPendingAdmin;

    return (
        <div 
            onClick={() => isSelectable && onToggle()}
            className={cn(
                "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer",
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
                <Badge variant="outline" className="h-6 bg-accent/10 text-accent border-accent/20 text-[8px] font-black uppercase px-3">SETTLED</Badge>
            ) : isPendingAdmin ? (
                <Badge variant="outline" className="h-6 bg-primary/10 text-primary border-primary/20 text-[8px] font-black uppercase px-3">VERIFYING</Badge>
            ) : (
                <div className={cn("h-6 px-4 flex items-center justify-center rounded-full text-[8px] font-black uppercase tracking-widest border transition-all", isSelected ? "bg-primary text-white border-primary shadow-lg" : "bg-white/5 text-white/30 border-white/5")}>
                    {isSelected ? 'SELECTED' : 'SELECT'}
                </div>
            )}
        </div>
    )
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
