'use client';

import { useDoc, useAuth, useUser } from '@/firebase';
import { UserPresence } from '@/components/UserPresence';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { LogOut } from 'lucide-react';
import { useEffect } from 'react';

type AdminSettings = {
  isUnderMaintenance?: boolean;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: userLoading } = useUser();
  // Only attempt to fetch settings if we know we have a user
  const { data: settings, loading: settingsLoading } = useDoc<AdminSettings>(user ? 'settings/admin' : null);
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If loading is finished and there's no user, redirect to login
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [userLoading, user, router]);


  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };
  
  // The overall loading state depends on auth and then settings
  const loading = userLoading || (user && settingsLoading);

  // If we're still loading or there's no user, show the spinner.
  // The useEffect above will handle the redirect.
  if (loading || !user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (settings?.isUnderMaintenance && user?.email !== 'admin@tribed.world') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <div className="text-8xl mb-4 animate-bounce">
          <span>🛠️</span>
        </div>
        <h1 className="mt-8 text-3xl font-bold text-foreground">
          Under Maintenance
        </h1>
        <p className="mt-2 text-muted-foreground">
          The application is currently undergoing scheduled maintenance. We'll be
          back shortly. Thank you for your patience.
        </p>
        <Button onClick={handleLogout} variant="outline" className="mt-8">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    );
  }

  return (
    <>
      <UserPresence />
      {children}
    </>
  );
}
