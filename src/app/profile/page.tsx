
'use client';

import {
  ChevronLeft,
  User,
  Mail,
  CreditCard,
  LogOut,
  Home,
  Copy,
  Gift,
  HandCoins,
  FileText,
  Save,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth, useDoc, useFirestore } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';

type UserData = {
  referralCode?: string;
  upiId?: string;
  panNumber?: string;
};

export default function ProfilePage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const { data: userData } = useDoc<UserData>(user ? `users/${user.uid}` : null);
  
  const [upiId, setUpiId] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  useEffect(() => {
    if (userData) {
      setUpiId(userData.upiId || '');
      setPanNumber(userData.panNumber || '');
    }
  }, [userData]);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };
  
  const handleCopyCode = () => {
    if (userData?.referralCode) {
      navigator.clipboard.writeText(userData.referralCode);
      toast({
        title: "Copied!",
        description: "Your referral code has been copied to the clipboard.",
      });
    }
  };

  const handleSaveChanges = async () => {
      if (!user) return;
      const userRef = doc(firestore, 'users', user.uid);
      try {
          await updateDoc(userRef, {
              upiId: upiId,
              panNumber: panNumber,
          });
          toast({
              title: "Profile Updated",
              description: "Your information has been saved successfully."
          });
          setIsEditing(false);
      } catch (error) {
          console.error("Error updating profile:", error);
          toast({
              title: "Update Failed",
              description: "Could not save your changes. Please try again.",
              variant: "destructive",
          })
      }
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 px-4 backdrop-blur-sm sm:px-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">Profile</h1>
        <div className="w-9"></div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <Card className="shadow-lg border-border/50">
          <CardHeader>
            <CardTitle>My Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow icon={User} label="Name" value={user?.displayName || 'N/A'} />
            <Separator />
            <InfoRow icon={Mail} label="Email" value={user?.email || 'N/A'} />
            <Separator />

             <div className="space-y-2">
                <Label htmlFor="upiId" className="flex items-center gap-3 text-sm font-medium">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <span>UPI ID for Payments</span>
                </Label>
                <Input id="upiId" value={upiId} onChange={(e) => {setUpiId(e.target.value); setIsEditing(true);}} placeholder="your-upi@bank" />
             </div>

             <div className="space-y-2">
                <Label htmlFor="panNumber" className="flex items-center gap-3 text-sm font-medium">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span>PAN Number</span>
                </Label>
                <Input id="panNumber" value={panNumber} onChange={(e) => {setPanNumber(e.target.value); setIsEditing(true);}} placeholder="ABCDE1234F" />
             </div>

            {isEditing && (
                <Button onClick={handleSaveChanges} className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                </Button>
            )}

          </CardContent>
        </Card>
        
        <Card className="shadow-lg border-border/50 mt-6">
          <CardHeader>
            <CardTitle>Referral Code</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-md bg-muted p-3">
              <div className="flex items-center gap-3">
                  <Gift className="h-6 w-6 text-primary" />
                  <span className="text-lg font-mono tracking-widest">{userData?.referralCode || 'Loading...'}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleCopyCode}>
                <Copy className="h-5 w-5" />
              </Button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Share this code with your friends. You'll get a bonus when they sign up!</p>
          </CardContent>
        </Card>

        <Button onClick={handleLogout} className="mt-6 w-full" variant="destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </main>
      <nav className="sticky bottom-0 z-10 border-t border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-md grid-cols-3 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={HandCoins} label="Loans" href="/loans" />
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
