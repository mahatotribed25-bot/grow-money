'use client';
import { ChevronLeft, Home, User, Briefcase, HandCoins, Users, Trophy, Copy, Gift, ArrowUpRight, CheckCircle2, UserPlus, Info, Timer, Users2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection, useDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import Image from 'next/image';

type Referral = {
    id: string;
    name: string;
    email: string;
    totalInvestment?: number;
    referredBy?: string;
    createdAt?: any;
    photoURL?: string;
};

type UserData = {
    referralCode?: string;
}

type AdminSettings = {
    referralBonus?: number;
}

export default function TeamPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const { data: userData } = useDoc<UserData>(user ? `users/${user.uid}` : null);
    const { data: adminSettings } = useDoc<AdminSettings>('settings/admin');
    
    const { data: userReferrals, loading } = useCollection<Referral>(
        user ? 'users' : null,
        { where: ['referredBy', '==', user?.uid] }
    );

    const bonusAmount = adminSettings?.referralBonus || 0;
    const totalReferrals = userReferrals?.length || 0;
    const activeReferrals = userReferrals?.filter(r => (r.totalInvestment || 0) > 0).length || 0;
    const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${userData?.referralCode}` : '';

    const handleCopyLink = () => {
        navigator.clipboard.writeText(referralLink);
        toast({ title: "Link Copied!", description: "Share this link with your friends to earn rewards." });
    };

    return (
        <div className="flex min-h-screen w-full flex-col bg-background text-foreground transition-colors duration-300 pb-20">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 backdrop-blur-sm px-4 sm:px-6">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="hover:bg-accent text-foreground/70">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold tracking-tight uppercase">My Team Node</h1>
            <div className="w-9" />
          </header>
    
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl mx-auto w-full">
            <Card className="bg-gradient-to-br from-primary/10 via-card to-card border-primary/20 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><UserPlus size={100} className="text-primary rotate-12" /></div>
                <div className="relative z-10 space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase">Network Master</h2>
                        <p className="text-xs font-bold text-white/40 uppercase tracking-[3px]">Grow your wealth by building your team.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Invites</p>
                            <p className="text-2xl font-black text-white">{totalReferrals}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Active Nodes</p>
                            <p className="text-2xl font-black text-accent">{activeReferrals}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-white/20 uppercase tracking-[4px] pl-1">Your Referral Engine</Label>
                        <div className="flex gap-2">
                            <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-4 h-14 flex items-center justify-between shadow-inner">
                                <span className="font-mono font-black text-primary tracking-[3px] text-lg uppercase">{userData?.referralCode || '------'}</span>
                                <Button variant="ghost" size="icon" onClick={() => { if(userData?.referralCode) { navigator.clipboard.writeText(userData.referralCode); toast({ title: "Code Copied!" }); } }} className="h-10 w-10 text-primary hover:bg-primary/10 rounded-xl">
                                    <Copy size={16} />
                                </Button>
                            </div>
                            <Button onClick={handleCopyLink} className="h-14 px-6 rounded-2xl bg-white text-black font-black uppercase text-[10px] tracking-widest hover:bg-primary hover:text-white transition-all shadow-xl">
                                Copy Link
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="p-6 bg-accent/5 border border-accent/20 rounded-3xl space-y-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent"><Info size={20}/></div>
                    <h3 className="text-sm font-black uppercase text-white tracking-widest">Protocol Rules</h3>
                </div>
                <div className="space-y-3">
                    <p className="text-xs text-white/50 leading-relaxed font-medium">1. Share your code or link with friends.</p>
                    <p className="text-xs text-white/50 leading-relaxed font-medium">2. When they join and make their <strong className="text-accent">first investment</strong>, you get credited.</p>
                    <p className="text-xs text-white/50 leading-relaxed font-medium">3. Reward: <strong className="text-white font-black">₹{bonusAmount}</strong> per successful referral.</p>
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-[10px] font-black uppercase tracking-[5px] text-muted-foreground px-2 flex items-center gap-2">
                    <Users size={14} className="text-primary" /> Active Network Nodes
                </h2>
                {loading ? (
                    <div className="py-20 flex flex-col items-center gap-3 opacity-20">
                        <Timer className="animate-spin" />
                        <p className="text-[9px] font-black uppercase tracking-[4px]">Syncing Team</p>
                    </div>
                ) : userReferrals && userReferrals.length > 0 ? (
                    <div className="grid gap-3">
                        {userReferrals.map(referral => (
                            <Card key={referral.id} className="bg-card border-border hover:border-primary/20 transition-all rounded-2xl overflow-hidden group">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-xl bg-muted border border-border flex items-center justify-center font-black text-muted-foreground relative overflow-hidden">
                                            {referral.photoURL ? <Image src={referral.photoURL} alt={referral.name} fill className="object-cover" /> : referral.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-white/90">{referral.name}</p>
                                            <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">
                                                {referral.createdAt ? new Date(referral.createdAt.seconds * 1000).toLocaleDateString() : 'Active Node'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Portfolio Value</p>
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-sm font-black text-white">₹{(referral.totalInvestment || 0).toLocaleString()}</span>
                                            {(referral.totalInvestment || 0) > 0 ? (
                                                <Badge className="bg-accent/10 text-accent border-accent/20 text-[7px] font-black uppercase h-4 px-1">BONUS PAID</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[7px] font-black uppercase h-4 px-1 border-white/5 text-white/20">PENDING</Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-muted/20 border-border border-dashed rounded-[3rem] shadow-inner space-y-4">
                        <Users2 size={48} className="mx-auto text-muted-foreground/20" />
                        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Your team list is empty.</p>
                        <Button onClick={handleCopyLink} variant="outline" className="h-10 rounded-xl font-black uppercase text-[10px] border-primary/20 text-primary">Invite Friends Now</Button>
                    </div>
                )}
            </div>
          </main>
    
          <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border/20 bg-background/95 backdrop-blur-sm h-16 flex items-center justify-around px-4">
              <BottomNavItem icon={Home} label="Home" href="/dashboard" />
              <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
              <BottomNavItem icon={Trophy} label="Leaders" href="/leaderboard" />
              <BottomNavItem icon={HandCoins} label="Loans" href="/my-loans" />
              <BottomNavItem icon={User} label="Profile" href="/profile" />
          </nav>
        </div>
    );
}

function BottomNavItem({ icon: Icon, label, href, active = false }: { icon: React.ElementType, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={cn("flex flex-col items-center justify-center gap-1 transition-all h-full relative", active ? 'text-primary' : 'text-muted-foreground')}>
      <Icon className="h-5 w-5" />
      <span className="text-[9px] font-black uppercase tracking-tight">{label}</span>
    </Link>
  );
}
