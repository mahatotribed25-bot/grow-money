
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useCollection, useFirestore, useDoc } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Home, Briefcase, Trophy, HandCoins, User, PlusCircle, Timer, TrendingUp, ShieldCheck, Search, Users } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
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

type P2PRequest = {
    id: string;
    borrowerId: string;
    borrowerName: string;
    borrowerTrustScore: number;
    amount: number;
    duration: number;
    status: 'funding' | 'accepted' | 'completed' | 'expired';
    createdAt: Timestamp;
    expiresAt: Timestamp;
}

type AdminSettings = {
    p2pPlatformFeePercent?: number;
    maxP2PLoanAmount?: number;
}

export default function P2PMarketPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { data: adminSettings } = useDoc<AdminSettings>('settings/admin');
    const { data: requests, loading } = useCollection<P2PRequest>(
        query(collection(firestore, 'p2pLoanRequests'), where('status', '==', 'funding'))
    );

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [duration, setDuration] = useState('');
    const [searchTerm, setSearchQuery] = useState('');

    const filteredRequests = useMemo(() => {
        return requests?.filter(r => 
            r.borrowerId !== user?.uid && 
            r.borrowerName.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a,b) => b.createdAt.seconds - a.createdAt.seconds);
    }, [requests, user, searchTerm]);

    const handleCreateRequest = async () => {
        if (!user || !amount || !duration) return;
        const amt = parseFloat(amount);
        const dur = parseInt(duration);

        if (amt <= 0 || dur <= 0) {
             toast({ title: "Invalid input", variant: "destructive" });
             return;
        }

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const requestData = {
            borrowerId: user.uid,
            borrowerName: user.displayName || 'User',
            borrowerTrustScore: 500, // Initial default score
            amount: amt,
            duration: dur,
            status: 'funding',
            createdAt: serverTimestamp(),
            expiresAt: Timestamp.fromDate(expiresAt),
        };

        try {
            await addDoc(collection(firestore, 'p2pLoanRequests'), requestData);
            toast({ title: "Request Posted!", description: "Your loan request is now live in the market." });
            setIsCreateOpen(false);
            setAmount('');
            setDuration('');
        } catch (e) {
            toast({ title: "Error posting request", variant: "destructive" });
        }
    };

    return (
        <div className="flex min-h-screen w-full flex-col bg-transparent text-foreground relative z-10">
            <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.05] bg-black/40 px-4 backdrop-blur-xl sm:px-6">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white/70">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent flex items-center gap-2">
                    <Users className="text-primary" size={20} /> P2P Marketplace
                </h1>
                <Button onClick={() => setIsCreateOpen(true)} size="sm" className="h-8 px-3 rounded-lg text-xs font-bold gap-1.5">
                    <PlusCircle size={14} /> New Request
                </Button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-5xl mx-auto w-full">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                    <Input 
                        placeholder="Search borrowers..." 
                        className="pl-10 bg-white/[0.03] border-white/10 rounded-2xl h-12 focus:ring-primary"
                        value={searchTerm}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-20">
                        <Timer className="animate-spin" />
                        <p className="text-[10px] font-bold uppercase tracking-[4px]">Fetching Bids</p>
                    </div>
                ) : filteredRequests && filteredRequests.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredRequests.map(req => <RequestCard key={req.id} req={req} />)}
                    </div>
                ) : (
                    <div className="text-center py-20 space-y-4 bg-white/[0.02] border border-dashed border-white/[0.08] rounded-3xl">
                        <HandCoins size={48} className="mx-auto text-white/10" />
                        <p className="text-white/30 text-sm">No active loan requests. Be the first to post!</p>
                    </div>
                )}
            </main>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="bg-[#030408]/90 backdrop-blur-2xl border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Post Loan Request</DialogTitle>
                        <DialogDescription className="text-white/40">Request a custom loan from other users on the platform.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-white/60">Amount Needed (INR)</Label>
                            <Input 
                                type="number" 
                                placeholder="e.g., 5000" 
                                value={amount} 
                                onChange={e => setAmount(e.target.value)}
                                className="bg-white/5 border-white/10 rounded-xl h-12 text-lg font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-white/60">Repayment Term (Days)</Label>
                            <Input 
                                type="number" 
                                placeholder="e.g., 10" 
                                value={duration} 
                                onChange={e => setDuration(e.target.value)}
                                className="bg-white/5 border-white/10 rounded-xl h-12"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost" className="text-white/40">Cancel</Button></DialogClose>
                        <Button onClick={handleCreateRequest} className="rounded-xl font-bold bg-primary text-white">Post to Market</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <nav className="sticky bottom-0 z-20 border-t border-white/[0.05] bg-black/40 backdrop-blur-xl">
                <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs font-medium">
                    <BottomNavItem icon={Home} label="Home" href="/dashboard" />
                    <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
                    <BottomNavItem icon={Users} label="Market" href="/p2p-market" active/>
                    <BottomNavItem icon={HandCoins} label="P2P Hub" href="/p2p-my-dashboard" />
                    <BottomNavItem icon={User} label="Profile" href="/profile" />
                </div>
            </nav>
        </div>
    );
}

function RequestCard({ req }: { req: P2PRequest }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [bidRate, setBidRate] = useState('');
    const [isBidOpen, setIsBidOpen] = useState(false);

    const handleBid = async () => {
        if (!user || !bidRate) return;
        const rate = parseFloat(bidRate);
        if (rate <= 0) return;

        const bidData = {
            requestId: req.id,
            lenderId: user.uid,
            lenderName: user.displayName || 'Investor',
            interestRate: rate,
            status: 'pending',
            createdAt: serverTimestamp()
        };

        try {
            await addDoc(collection(firestore, `p2pLoanRequests/${req.id}/offers`), bidData);
            toast({ title: "Offer Sent!", description: `Bid of ${rate}% interest submitted.` });
            setIsBidOpen(false);
            setBidRate('');
        } catch (e) {
            toast({ title: "Error placing bid", variant: "destructive" });
        }
    };

    return (
        <Card className="shadow-2xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl rounded-3xl overflow-hidden group">
            <CardHeader className="pb-3 bg-white/[0.01]">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-1.5 mb-1">
                             <span className="text-xs font-black uppercase tracking-widest text-primary animate-rgb-glow">{req.borrowerName}</span>
                             <Badge className="bg-white/5 border-white/10 text-[8px] h-4">ID: {req.id.slice(-4)}</Badge>
                        </div>
                        <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest flex items-center gap-1">
                            <ShieldCheck size={10} className="text-green-500"/> Trust Score: {req.borrowerTrustScore}
                        </p>
                    </div>
                    <Badge variant="outline" className="border-primary/20 text-primary text-[10px] font-black tracking-tighter h-6">LIVE</Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                        <p className="text-[9px] text-white/20 uppercase font-bold tracking-widest mb-1">Principle</p>
                        <p className="text-lg font-black text-white">₹{req.amount.toLocaleString()}</p>
                    </div>
                    <div className="bg-black/20 p-3 rounded-2xl border border-white/5 text-right">
                        <p className="text-[9px] text-white/20 uppercase font-bold tracking-widest mb-1">Tenure</p>
                        <p className="text-sm font-bold text-white/80">{req.duration} Days</p>
                    </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/20 px-2">
                    <span className="flex items-center gap-1.5"><Timer size={12} className="text-primary animate-pulse" /> Expires In</span>
                    <CountdownTimer endDate={req.expiresAt.toDate()} />
                </div>

                <Button onClick={() => setIsBidOpen(true)} className="w-full h-11 rounded-xl font-bold bg-white text-black hover:bg-primary hover:text-white transition-all shadow-xl shadow-white/5">
                    Make Interest Offer
                </Button>
            </CardContent>

            <Dialog open={isBidOpen} onOpenChange={setIsBidOpen}>
                <DialogContent className="bg-[#030408]/90 backdrop-blur-2xl border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Interest Offer for {req.borrowerName}</DialogTitle>
                        <DialogDescription className="text-white/40">Enter the total interest percentage you want to earn on this loan.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex justify-between items-center">
                            <span className="text-xs font-bold text-white/40 uppercase">Principal</span>
                            <span className="text-lg font-black">₹{req.amount}</span>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-white/60">Your Interest Rate (%)</Label>
                            <Input 
                                type="number" 
                                placeholder="e.g., 5.5" 
                                value={bidRate} 
                                onChange={e => setBidRate(e.target.value)}
                                className="bg-white/5 border-white/10 rounded-xl h-12 text-lg font-bold text-green-400"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost" className="text-white/40">Cancel</Button></DialogClose>
                        <Button onClick={handleBid} className="rounded-xl font-bold bg-primary text-white px-8">Confirm Bid</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

const CountdownTimer = ({ endDate }: { endDate: Date }) => {
    const [timeLeft, setTimeLeft] = useState('...');
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const dist = endDate.getTime() - now.getTime();
            if (dist < 0) { setTimeLeft("EXPIRED"); clearInterval(interval); return; }
            const h = Math.floor((dist % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((dist % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((dist % (1000 * 60)) / 1000);
            setTimeLeft(`${h}h ${m}m ${s}s`);
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
