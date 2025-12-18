'use client';

import {
  ChevronLeft,
  User,
  Mail,
  CreditCard,
  LogOut,
  Briefcase,
  Home,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';

export default function ProfilePage() {
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">Profile</h1>
        <div className="w-9"></div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>My Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow icon={User} label="Name" value={user?.displayName || 'N/A'} />
            <Separator />
            <InfoRow icon={Mail} label="Email" value={user?.email || 'N/A'} />
            <Separator />
            <InfoRow icon={CreditCard} label="Saved UPI ID" value="Not set" />
          </CardContent>
        </Card>

        <Button onClick={handleLogout} className="mt-6 w-full" variant="destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </main>
      <nav className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-md grid-cols-4 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="#" />
          <BottomNavItem icon={Wallet} label="Team" href="#" />
          <BottomNavItem icon={User} label="Profile" href="/profile" active />
        </div>
      </nav>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-sm text-muted-foreground">{value}</span>
    </div>
  );
}

function BottomNavItem({ icon: Icon, label, href, active = false }: { icon: React.ElementType, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center justify-center gap-1 ${active ? 'text-primary' : 'text-muted-foreground'}`}>
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}
