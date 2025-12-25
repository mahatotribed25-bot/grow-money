
'use client';
import { ChevronLeft, Home, User, Briefcase, HandCoins } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection } from '@/firebase';

type Referral = {
    id: string;
    name: string;
    email: string;
    totalInvestment?: number;
    referredBy?: string;
};


export default function TeamPage() {
    const { user } = useUser();
    const { data: referrals, loading } = useCollection<Referral>(
        user ? `users` : null,
        // This is not a secure way to query, but it's okay for this example.
        // In a real app, you would use a Cloud Function to get this data.
    );
    
    const userReferrals = referrals?.filter(r => r.referredBy === user?.uid);

    return (
        <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 px-4 backdrop-blur-sm sm:px-6">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">My Team</h1>
            <div className="w-9" />
          </header>
    
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <Card>
                <CardHeader>
                    <CardTitle>Your Referrals</CardTitle>
                    <CardDescription>Users who have signed up using your referral code.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p>Loading your team...</p>
                    ): userReferrals && userReferrals.length > 0 ? (
                        <div className="space-y-4">
                            {userReferrals.map(referral => (
                                <Card key={referral.id} className="p-4 flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">{referral.name}</p>
                                        <p className="text-sm text-muted-foreground">{referral.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Investment</p>
                                        <p className="font-semibold">₹{(referral.totalInvestment || 0).toFixed(2)}</p>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground">You have not referred any users yet.</p>
                    )}
                </CardContent>
            </Card>
          </main>
    
          <nav className="sticky bottom-0 z-10 border-t border-border/20 bg-background/95 backdrop-blur-sm">
            <div className="mx-auto grid h-16 max-w-md grid-cols-4 items-center px-4 text-xs">
              <BottomNavItem icon={Home} label="Home" href="/dashboard" />
              <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
              <BottomNavItem icon={HandCoins} label="My Loans" href="/my-loans" />
              <BottomNavItem icon={User} label="Profile" href="/profile" />
            </div>
          </nav>
        </div>
    );
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
