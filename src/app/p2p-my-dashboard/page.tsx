
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useUser, useCollection, useFirestore, useDoc } from '@/firebase';
import { collection, query, where, doc, runTransaction, serverTimestamp, Timestamp, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, Home, Briefcase, Trophy, HandCoins, User, Timer, CheckCircle2, XCircle, Users, ArrowUpRight, Wallet, History, AlertCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { addDays } from 'date-fns';

type P2PRequest = {
    id: string;
    amount: number;
    duration: number;
    status: string;
    createdAt: Timestamp;
}

type P2POffer = {
    id: string;
    lenderName: string;
    interestRate: number;
    status: string;
    createdAt: Timestamp;
    lenderId: string;
    requestId: string;
}

type ActiveP2PLoan = {
    id: string;
    requestId: string;
    borrowerId: string;
    borrowerName: string;
    lenderId: string;
    lenderName: string;
    amount: number;
    interestRate: number;
    totalRepayment: number;
    dueDate: Timestamp;
    status: 'active' | 'repaid';
    createdAt: Timestamp;
}

type AdminSettings = {
    p2pPlatformFeePercent?: number;
}

export default function P2PMyDashboard() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { data: adminSettings } = useDoc<AdminSettings>('settings/admin');
    
    const { data: myRequests, loading: reqLoading } = useCollection<P2PRequest>(
        user ? query(collection(firestore, 'p2pLoanRequests'), where('borrowerId', '==', user.uid)) : null
    );

    const { data: myBorrowedLoans, loading: borrowedLoading } = useCollection<ActiveP2PLoan>(
        user ? query(collection(firestore, 'p2pActiveLoans'), where('borrowerId', '==', user.uid)) : null
    );

    const { data: myLentLoans, loading: lentLoading } = useCollection<ActiveP2PLoan>(
        user ? query(collection(firestore, 'p2pActiveLoans'), where('lenderId', '==', user.uid)) : null
    );

    const { data: allOffers } = useCollection<P2POffer>(
        user ? query(collection(firestore, 'offers'), { subcollections: true }, where('lenderId', '==', user.uid)) : null
    );

    const platformFeePercent = adminSettings?.p2pPlatformFeePercent || 2;

    return (
        <div className="flex min-h-screen w-full flex-col bg-transparent text-foreground relative z-10">
            <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.05] bg-black/40 px-4 backdrop-blur-xl sm:px-6">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white/70">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent flex items-center gap-2">
                    <HandCoins className="text-primary" size={20} /> P2P Hub
                </h1>
                <div className="w-9" />
            </header>

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6">
                <Tabs defaultValue="borrowing">
                    <TabsList className="grid w-full grid-cols-2 bg-white/5 border-white/10 p-1.5 h-14 rounded-2xl">
                        <TabsTrigger value="borrowing" className="rounded-xl data-[state=active]:bg-white/10 h-full font-bold uppercase tracking-widest text-[10px]">My Borrowings</TabsTrigger>
                        <TabsTrigger value="lending" className="rounded-xl data-[state=active]:bg-white/10 h-full font-bold uppercase tracking-widest text-[10px]">My Investments</TabsTrigger>
                    </TabsList>

                    <TabsContent value="borrowing" className="mt-8 space-y-8">
                        <div className="space-y-4">
                            <h2 className="text-xs font-black uppercase tracking-[3px] text-white/20 pl-2">Active Loans</h2>
                            {borrowedLoading ? (
                                <div className="flex justify-center p-10 opacity-20"><Timer className="animate-spin" /></div>
                            ) : myBorrowedLoans?.filter(l => l.status === 'active').length === 0 ? (
                                <Card className="bg-white/5 border-white/10 border-dashed py-8 text-center">
                                    <p className="text-white/30 text-xs uppercase font-bold">No unpaid loans</p>
                                </Card>
                            ) : (
                                myBorrowedLoans?.filter(l => l.status === 'active').map(loan => (
                                    <ActiveLoanCard key={loan.id} loan={loan} mode="borrower" />
                                ))
                            )}
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-xs font-black uppercase tracking-[3px] text-white/20 pl-2">Open Market Requests</h2>
                            {reqLoading ? (
                                <div className="flex justify-center p-10 opacity-20"><Timer className="animate-spin" /></div>
                            ) : myRequests?.filter(r => r.status === 'funding').length === 0 ? (
                                <Card className="bg-white/5 border-white/10 border-dashed py-8 text-center">
                                    <p className="text-white/30 text-xs uppercase font-bold">No active requests</p>
                                </Card>
                            ) : (
                                myRequests?.filter(r => r.status === 'funding').map(req => (
                                    <BorrowerRequestCard key={req.id} req={req} feePercent={platformFeePercent} />
                                ))
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="lending" className="mt-8 space-y-8">
                        <div className="space-y-4">
                            <h2 className="text-xs font-black uppercase tracking-[3px] text-white/20 pl-2">My Active Assets</h2>
                            {lentLoading ? (
                                <div className="flex justify-center p-10 opacity-20"><Timer className="animate-spin" /></div>
                            ) : myLentLoans?.filter(l => l.status === 'active').length === 0 ? (
                                <Card className="bg-white/5 border-white/10 border-dashed py-10 text-center">
                                    <Users size={32} className="mx-auto text-white/10 mb-2"/>
                                    <p className="text-white/30 text-sm">You haven't funded any loans yet.</p>
                                    <Button asChild variant="link" className="text-primary text-xs mt-2"><Link href="/p2p-market">Browse Marketplace</Link></Button>
                                </Card>
                            ) : (
                                myLentLoans?.filter(l => l.status === 'active').map(loan => (
                                    <ActiveLoanCard key={loan.id} loan={loan} mode="lender" />
                                ))
                            )}
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-xs font-black uppercase tracking-[3px] text-white/20 pl-2">Pending Bids</h2>
                            {allOffers?.filter(o => o.status === 'pending').length === 0 ? (
                                <p className="text-center text-[10px] text-white/10 uppercase font-black py-4">No active bids in market</p>
                            ) : (
                                allOffers?.filter(o => o.status === 'pending').map(offer => (
                                    <SentBidItem key={offer.id} offer={offer} />
                                ))
                            )}
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-xs font-black uppercase tracking-[3px] text-white/20 pl-2">Settled History</h2>
                            {borrowedLoading || lentLoading ? null : (
                                [...(myBorrowedLoans || []), ...(myLentLoans || [])].filter(l => l.status === 'repaid').length === 0 ? (
                                    <p className="text-center text-[10px] text-white/10 uppercase font-black">No past transactions</p>
                                ) : (
                                    [...(myBorrowedLoans || []), ...(myLentLoans || [])]
                                        .filter(l => l.status === 'repaid')
                                        .sort((a,b) => b.createdAt.seconds - a.createdAt.seconds)
                                        .map(loan => (
                                            <div key={loan.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center justify-between opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center">
                                                        <CheckCircle2 className="text-green-500/50" size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white/80">{loan.amount.toLocaleString()} Loan</p>
                                                        <p className="text-[10px] text-white/20 uppercase font-bold">{loan.borrowerId === user?.uid ? `Borrowed from ${loan.lenderName}` : `Lent to ${loan.borrowerName}`}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-white/60">SETTLED</p>
                                                    <p className="text-[9px] text-white/20 uppercase font-bold">{loan.status}</p>
                                                </div>
                                            </div>
                                        ))
                                )
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </main>

            <nav className="sticky bottom-0 z-20 border-t border-white/[0.05] bg-black/40 backdrop-blur-xl">
                <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs font-medium">
                    <BottomNavItem icon={Home} label="Home" href="/dashboard" />
                    <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
                    <BottomNavItem icon={Users} label="Market" href="/p2p-market" />
                    <BottomNavItem icon={HandCoins} label="P2P Hub" href="/p2p-my-dashboard" active/>
                    <BottomNavItem icon={User} label="Profile" href="/profile" />
                </div>
            </nav>
        </div>
    );
}

function SentBidItem({ offer }: { offer: P2POffer }) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleCancelBid = async () => {
        try {
            await deleteDoc(doc(firestore, `p2pLoanRequests/${offer.requestId}/offers`, offer.id));
            toast({ title: "Bid Withdrawn", description: "Your offer has been removed from the request." });
        } catch (e) {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    return (
        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
            <div>
                <p className="text-[10px] text-white/30 uppercase font-bold mb-1">Bid ID: {offer.id.slice(-4)}</p>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">{offer.interestRate}% Interest Offer</span>
                    <Badge variant="outline" className="text-[8px] h-4 border-white/10 text-white/40 uppercase">Pending</Badge>
                </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleCancelBid} className="text-red-400/40 hover:text-red-400 hover:bg-red-400/10 h-10 w-10 rounded-xl">
                <Trash2 size={16} />
            </Button>
        </div>
    );
}

function BorrowerRequestCard({ req, feePercent }: { req: P2PRequest, feePercent: number }) {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const { data: offers } = useCollection<P2POffer>(`p2pLoanRequests/${req.id}/offers`);

    const handleAcceptOffer = async (offer: P2POffer) => {
        if (!user || !user.displayName) return;

        try {
            await runTransaction(firestore, async (transaction) => {
                const borrowerRef = doc(firestore, 'users', user.uid);
                const lenderRef = doc(firestore, 'users', offer.lenderId);
                const requestRef = doc(firestore, 'p2pLoanRequests', req.id);
                const offerRef = doc(firestore, `p2pLoanRequests/${req.id}/offers`, offer.id);
                const settingsRef = doc(firestore, 'settings', 'admin');
                
                const lenderHistoryRef = doc(collection(firestore, 'users', offer.lenderId, 'walletHistory'));
                const borrowerHistoryRef = doc(collection(firestore, 'users', user.uid, 'walletHistory'));

                const lenderDoc = await transaction.get(lenderRef);
                const borrowerDoc = await transaction.get(borrowerRef);
                const settingsDoc = await transaction.get(settingsRef);

                if (!lenderDoc.exists()) throw new Error("Lender not found");
                if (!borrowerDoc.exists()) throw new Error("Borrower not found");

                const lenderBalance = lenderDoc.data().walletBalance || 0;
                if (lenderBalance < req.amount) {
                    throw new Error("Lender has insufficient balance anymore.");
                }

                const feeAmt = (req.amount * feePercent) / 100;
                const creditAmt = req.amount - feeAmt;

                const dueDate = addDays(new Date(), req.duration);
                const interestAmt = (req.amount * offer.interestRate) / 100;
                const totalRepayment = req.amount + interestAmt;

                // 1. Update Wallets
                transaction.update(lenderRef, { walletBalance: lenderBalance - req.amount });
                transaction.update(borrowerRef, { walletBalance: (borrowerDoc.data().walletBalance || 0) + creditAmt });

                // 2. Add History
                transaction.set(lenderHistoryRef, {
                    amount: req.amount,
                    type: 'debit',
                    category: 'P2P Asset',
                    description: `Funded P2P loan for ${user.displayName}`,
                    createdAt: serverTimestamp()
                });
                transaction.set(borrowerHistoryRef, {
                    amount: creditAmt,
                    type: 'credit',
                    category: 'P2P Loan',
                    description: `P2P Loan credited (After ${feePercent}% platform fee)`,
                    createdAt: serverTimestamp()
                });

                // 3. Admin Profit
                if (settingsDoc.exists()) {
                    transaction.update(settingsRef, {
                        adminProfitBalance: (settingsDoc.data().adminProfitBalance || 0) + feeAmt
                    });
                }

                // 4. Statuses
                transaction.update(requestRef, { status: 'accepted', acceptedOfferId: offer.id });
                transaction.update(offerRef, { status: 'accepted' });

                // 5. Create Active Loan Record
                const activeLoanRef = doc(collection(firestore, 'p2pActiveLoans'));
                transaction.set(activeLoanRef, {
                    requestId: req.id,
                    borrowerId: user.uid,
                    borrowerName: user.displayName,
                    lenderId: offer.lenderId,
                    lenderName: offer.lenderName,
                    amount: req.amount,
                    interestRate: offer.interestRate,
                    totalRepayment: totalRepayment,
                    dueDate: Timestamp.fromDate(dueDate),
                    status: 'active',
                    createdAt: serverTimestamp()
                });
            });

            toast({ title: "Funds Transferred!", description: `₹${req.amount} has been credited to your wallet.` });
        } catch (e: any) {
            toast({ title: "Acceptance Failed", description: e.message, variant: "destructive" });
        }
    };

    return (
        <Card className="shadow-2xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl rounded-3xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-white/[0.05]">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-white/90 text-sm font-bold">Request for ₹{req.amount.toLocaleString()}</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-white/30">{req.duration} Day Term</CardDescription>
                    </div>
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] uppercase font-bold">{req.status}</Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[3px] text-white/20">Received Bids ({offers?.length || 0})</p>
                <div className="space-y-3">
                    {offers?.map(offer => (
                        <div key={offer.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-primary/30 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary">
                                    {offer.lenderName.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white/80">{offer.lenderName}</p>
                                    <p className="text-xs text-green-400 font-bold">{offer.interestRate}% Interest</p>
                                </div>
                            </div>
                            <Button size="sm" onClick={() => handleAcceptOffer(offer)} className="h-9 px-5 rounded-xl font-bold bg-white text-black hover:bg-primary hover:text-white">
                                Accept
                            </Button>
                        </div>
                    ))}
                    {offers?.length === 0 && <p className="text-center text-xs text-white/20 py-4 italic">Waiting for bids...</p>}
                </div>
            </CardContent>
        </Card>
    );
}

function ActiveLoanCard({ loan, mode }: { loan: ActiveP2PLoan, mode: 'borrower' | 'lender' }) {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [isRepaying, setIsRepaying] = useState(false);

    const handleRepay = async () => {
        if (!user || isRepaying) return;
        setIsRepaying(true);

        const repaymentAmount = Number(loan.totalRepayment);

        try {
            await runTransaction(firestore, async (transaction) => {
                const borrowerRef = doc(firestore, 'users', loan.borrowerId);
                const lenderRef = doc(firestore, 'users', loan.lenderId);
                const loanRef = doc(firestore, 'p2pActiveLoans', loan.id);
                
                const borrowerHistoryRef = doc(collection(firestore, 'users', loan.borrowerId, 'walletHistory'));
                const lenderHistoryRef = doc(collection(firestore, 'users', loan.lenderId, 'walletHistory'));

                const borrowerDoc = await transaction.get(borrowerRef);
                const lenderDoc = await transaction.get(lenderRef);

                if (!borrowerDoc.exists()) throw new Error("Borrower record not found.");
                if (!lenderDoc.exists()) throw new Error("Lender record not found.");

                const borrowerBalance = borrowerDoc.data().walletBalance || 0;
                if (borrowerBalance < repaymentAmount) {
                    throw new Error(`Insufficient wallet balance. You need ₹${repaymentAmount.toFixed(2)} to repay this debt.`);
                }

                const lenderBalance = lenderDoc.data().walletBalance || 0;

                // 1. Deduct from Borrower
                transaction.update(borrowerRef, { walletBalance: borrowerBalance - repaymentAmount });
                
                // 2. Credit to Lender
                transaction.update(lenderRef, { walletBalance: lenderBalance + repaymentAmount });

                // 3. Add History
                transaction.set(borrowerHistoryRef, {
                    amount: repaymentAmount,
                    type: 'debit',
                    category: 'P2P Repayment',
                    description: `Repaid loan of ₹${loan.amount} to ${loan.lenderName}`,
                    createdAt: serverTimestamp()
                });
                transaction.set(lenderHistoryRef, {
                    amount: repaymentAmount,
                    type: 'credit',
                    category: 'P2P Asset Settlement',
                    description: `Received repayment from ${loan.borrowerName}`,
                    createdAt: serverTimestamp()
                });

                // 4. Mark Loan as Repaid
                transaction.update(loanRef, { status: 'repaid', repaidAt: serverTimestamp() });
            });

            toast({ title: "Loan Repaid!", description: `₹${repaymentAmount.toFixed(2)} transferred to ${loan.lenderName}.` });
        } catch (e: any) {
            console.error("Repayment Error:", e);
            toast({ title: "Repayment Failed", description: e.message || "An unexpected error occurred during repayment.", variant: "destructive" });
        } finally {
            setIsRepaying(false);
        }
    };

    const isOverdue = new Date() > loan.dueDate.toDate();

    return (
        <Card className={cn(
            "shadow-xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl rounded-3xl overflow-hidden group relative",
            isOverdue && mode === 'borrower' && "border-red-500/30 bg-red-500/[0.02]"
        )}>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-3 border-b border-white/[0.05] bg-white/[0.01]">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-white/5 text-[9px] font-black">{mode === 'borrower' ? 'MY DEBT' : 'MY ASSET'}</Badge>
                        <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">#{loan.id.slice(-4)}</p>
                    </div>
                    {isOverdue && <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[9px] font-black tracking-widest">OVERDUE</Badge>}
                </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[9px] text-white/20 uppercase font-black tracking-[2px] mb-1">{mode === 'borrower' ? 'Lender' : 'Borrower'}</p>
                        <p className="text-sm font-black text-white">{mode === 'borrower' ? loan.lenderName : loan.borrowerName}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] text-white/20 uppercase font-black tracking-[2px] mb-1">Repayment Date</p>
                        <p className="text-sm font-black text-white/80">{loan.dueDate.toDate().toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-black/20 p-4 rounded-2xl border border-white/5">
                    <div>
                        <p className="text-[9px] text-white/20 uppercase font-black tracking-widest mb-1">Principal</p>
                        <p className="text-lg font-black text-white">₹{loan.amount.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] text-white/20 uppercase font-black tracking-widest mb-1">Final Amount</p>
                        <p className="text-lg font-black text-green-400">₹{loan.totalRepayment.toFixed(2)}</p>
                    </div>
                </div>

                {mode === 'borrower' && (
                    <Button 
                        onClick={handleRepay} 
                        disabled={isRepaying}
                        className="w-full h-12 rounded-xl font-bold bg-white text-black hover:bg-green-500 hover:text-white transition-all shadow-xl shadow-white/5"
                    >
                        {isRepaying ? 'Processing Payment...' : 'Repay Full Debt Now'}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

const CountdownTimer = ({ endDate }: { endDate: Date }) => {
    const [timeLeft, setTimeLeft] = useState('...');
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const dist = endDate.getTime() - now.getTime();
            if (dist < 0) { setTimeLeft("PAST DUE"); clearInterval(interval); return; }
            const d = Math.floor(dist / (1000 * 60 * 60 * 24));
            const h = Math.floor((dist % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((dist % (1000 * 60 * 60)) / (1000 * 60));
            setTimeLeft(`${d}d ${h}h ${m}m`);
        }, 1000);
        return () => clearInterval(interval);
    }, [endDate]);
    return <span className="font-mono text-white/60">{timeLeft}</span>;
};

function BottomNavItem({ icon: Icon, label, href, active = false }: { icon: React.ElementType, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={cn(
        "flex flex-col items-center justify-center gap-1 transition-all h-full relative",
        active ? 'text-primary scale-110' : 'text-white/40 hover:text-white/60'
    )}>
      <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]")} />
      <span className="text-[10px] tracking-tight">{label}</span>
      {active && <div className="absolute -bottom-1 h-1 w-8 bg-primary rounded-full blur-[2px]" />}
    </Link>
  );
}
