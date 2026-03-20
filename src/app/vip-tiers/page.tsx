
'use client';

import {
  ChevronLeft,
  Home,
  User,
  Briefcase,
  HandCoins,
  Users as UsersIcon,
  Gem,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useDoc } from '@/firebase';
import { cn } from '@/lib/utils';


type AdminSettings = {
  vipTiers?: {
    silver: number;
    gold: number;
    platinum: number;
  };
  vipWithdrawalGst?: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
  }
};


export default function VipTiersPage() {
  const { data: settings, loading } = useDoc<AdminSettings>('settings/admin');
  
  const tiers = [
    {
        name: 'Bronze',
        investment: 0,
        gst: settings?.vipWithdrawalGst?.bronze,
        className: 'border-amber-800/50 bg-gradient-to-br from-amber-900/40 to-background'
    },
    {
        name: 'Silver',
        investment: settings?.vipTiers?.silver,
        gst: settings?.vipWithdrawalGst?.silver,
        className: 'border-slate-400/50 bg-gradient-to-br from-slate-500/40 to-background'
    },
    {
        name: 'Gold',
        investment: settings?.vipTiers?.gold,
        gst: settings?.vipWithdrawalGst?.gold,
        className: 'border-yellow-400/50 bg-gradient-to-br from-yellow-500/40 to-background'
    },
     {
        name: 'Platinum',
        investment: settings?.vipTiers?.platinum,
        gst: settings?.vipWithdrawalGst?.platinum,
        className: 'border-purple-400/50 bg-gradient-to-br from-purple-500/40 to-background'
    },
  ];


  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 px-4 backdrop-blur-sm sm:px-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">VIP Tiers & Benefits</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <p className="text-center">Loading VIP benefits...</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {tiers.map(tier => (
                <Card key={tier.name} className={cn('shadow-lg', tier.className)}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Gem /> {tier.name}
                        </CardTitle>
                        <CardDescription>
                            Total Investment: ₹{tier.investment?.toLocaleString() ?? 0}+
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Benefit icon={TrendingDown} label="Withdrawal GST" value={`${tier.gst ?? 'N/A'}%`} />
                        <Benefit icon={ShieldCheck} label="Priority Support" value="Active" />
                    </CardContent>
                </Card>
            ))}
          </div>
        )}
      </main>

       <nav className="sticky bottom-0 z-10 border-t border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={UsersIcon} label="Team" href="/team" />
          <BottomNavItem icon={HandCoins} label="My Loans" href="/my-loans" />
          <BottomNavItem icon={User} label="Profile" href="/profile" />
        </div>
      </nav>
    </div>
  );
}

function Benefit({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number }) {
    return (
        <div className="flex items-center justify-between text-sm rounded-md bg-foreground/5 p-3">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-4 w-4 text-primary"/>
                <span>{label}</span>
            </div>
            <span className="font-semibold">{value}</span>
        </div>
    )
}

function BottomNavItem({
  icon: Icon,
  label,
  href,
  active = false,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 ${
        active ? 'text-primary' : 'text-muted-foreground'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}
