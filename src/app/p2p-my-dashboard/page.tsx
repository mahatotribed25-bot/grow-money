
'use client';

import { useState } from 'react';
import { useUser, useCollection, useFirestore, useDoc } from '@/firebase';
import { collection, query, where, doc, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, Home, Briefcase, Trophy, HandCoins, User, Timer, CheckCircle2, XCircle, Users, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
}

type AdminSettings = {
    p2pPlatformFeePercent?: number;
}

export default function P2PMyDashboard() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { data: adminSettings } = useDoc<AdminSettings>('settings/admin');
    
    const { data: myRequests, loading: reqLoading } = useCollection<P2PRequest>(
        user ? query(collection(firestore, 'p2pLoanRequests'), where('borrowerId', '==', user.uid)) : null
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
                        <TabsTrigger value="borrowing" className="rounded-xl data-[state=active]:bg-white/10 h-full font-bold uppercase tracking-widest text-[10px]">As Borrower</TabsTrigger>
                        <TabsTrigger value="lending" className="rounded-xl data-[state=active]:bg-white/10 h-full font-bold uppercase tracking-widest text-[10px]">As Lender</TabsTrigger>
                    </TabsList>

                    <TabsContent value="borrowing" className="mt-8 space-y-6">
                        {reqLoading ? (
                             <div className="flex justify-center p-10 opacity-20"><Timer className="animate-spin" /></div>
                        ) : myRequests?.length === 0 ? (
                            <Card className="bg-white/5 border-white/10 border-dashed py-10 text-center">
                                <p className="text-white/30 text-sm">No P2P requests active.</p>
                            </Card>
                        ) : myRequests?.map(req => (
                            <BorrowerRequestCard key={req.id} req={req} feePercent={platformFeePercent} />
                        ))}
                    </TabsContent>

                    <TabsContent value="lending" className="mt-8">
                         <Card className="bg-white/5 border-white/10 border-dashed py-10 text-center">
                            <Users size={32} className="mx-auto text-white/10 mb-2"/>
                            <p className="text-white/30 text-sm">Track your investment offers here.</p>
                            <Button asChild variant="link" className="text-primary text-xs mt-2"><Link href="/p2p-market">Browse Market</Link></Button>
                        </Card>
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

function BorrowerRequestCard({ req, feePercent }: { req: P2PRequest, feePercent: number }) {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const { data: offers } = useCollection<P2POffer>(`p2pLoanRequests/${req.id}/offers`);

    const handleAcceptOffer = async (offer: P2POffer) => {
        if (!user) return;

        try {
            await runTransaction(firestore, async (transaction) => {
                const borrowerRef = doc(firestore, 'users', user.uid);
                const lenderRef = doc(firestore, 'users', offer.lenderId);
                const requestRef = doc(firestore, 'p2pLoanRequests', req.id);
                const offerRef = doc(firestore, `p2pLoanRequests/${req.id}/offers`, offer.id);
                const settingsRef = doc(firestore, 'settings', 'admin');

                // PERFORM ALL READS FIRST
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

                // PERFORM ALL WRITES SECOND
                
                // 1. Deduct from Lender
                transaction.update(lenderRef, {
                    walletBalance: lenderBalance - req.amount
                });

                // 2. Add to Borrower
                transaction.update(borrowerRef, {
                    walletBalance: (borrowerDoc.data().walletBalance || 0) + creditAmt
                });

                // 3. Admin Profit
                if (settingsDoc.exists()) {
                    transaction.update(settingsRef, {
                        adminProfitBalance: (settingsDoc.data().adminProfitBalance || 0) + feeAmt
                    });
                }

                // 4. Update Statuses
                transaction.update(requestRef, { status: 'accepted', acceptedOfferId: offer.id });
                transaction.update(offerRef, { status: 'accepted' });

                // 5. Active P2P Loan record
                const p2pHistoryRef = doc(collection(firestore, 'p2pHistory'));
                transaction.set(p2pHistoryRef, {
                    requestId: req.id,
                    borrowerId: user.uid,
                    lenderId: offer.lenderId,
                    amount: req.amount,
                    fee: feeAmt,
                    interestRate: offer.interestRate,
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
                <p className="text-[10px] font-black uppercase tracking-[3px] text-white/20">Active Bids ({offers?.length || 0})</p>
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
                    {offers?.length === 0 && <p className="text-center text-xs text-white/20 py-4 italic">Waiting for lenders to bid...</p>}
                </div>
            </CardContent>
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
      <span className="text-[10px] tracking-tight">{label}</span>
      {active && <div className="absolute -bottom-1 h-1 w-8 bg-primary rounded-full blur-[2px]" />}
    </Link>
  );
}
