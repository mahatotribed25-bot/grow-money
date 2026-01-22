'use client';

import { useDoc, useAuth, useUser } from '@/firebase';
import { UserPresence } from '@/components/UserPresence';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useEffect, useMemo } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { FlipCountdown } from '@/components/dashboard/FlipCountdown';
import { LogOut } from 'lucide-react';

type AdminSettings = {
  isUnderMaintenance?: boolean;
  maintenanceEndTime?: Timestamp;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: userLoading } = useUser();
  const { data: settings, loading: settingsLoading } = useDoc<AdminSettings>(user ? 'settings/admin' : null);
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [userLoading, user, router]);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };
  
  const loading = userLoading || (user && settingsLoading);

  const isUnderMaintenance = useMemo(() => {
    if (!settings) return false;
    if (settings.maintenanceEndTime) {
      return settings.maintenanceEndTime.toDate() > new Date();
    }
    return settings.isUnderMaintenance || false;
  }, [settings]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isUnderMaintenance && user?.email !== 'admin@tribed.world') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <div className="text-8xl mb-4 animate-bounce">
          <span>🛠️</span>
        </div>
        <h1 className="mt-8 text-3xl font-bold text-foreground">
          Under Maintenance
        </h1>
        <p className="mt-2 text-muted-foreground">
          The application is currently undergoing scheduled maintenance. We'll be back shortly.
        </p>
        {settings?.maintenanceEndTime && (
          <>
            <p className="mt-6 text-lg text-muted-foreground">Service will resume in:</p>
            <FlipCountdown endTime={settings.maintenanceEndTime.toDate()} />
          </>
        )}
         <p className="mt-6 text-muted-foreground">
          Thank you for your patience.
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
