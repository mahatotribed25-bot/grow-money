
'use client';

import { useDoc, useAuth, useUser } from '@/firebase';
import { UserPresence } from '@/components/UserPresence';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { LogOut } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Timestamp } from 'firebase/firestore';

type AdminSettings = {
  isUnderMaintenance?: boolean;
  maintenanceEndTime?: Timestamp;
};

const CountdownTimer = ({ endTime }: { endTime: Date }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = new Date().getTime();
      const distance = endTime.getTime() - now;

      if (distance < 0) {
        clearInterval(intervalId);
        setTimeLeft('Maintenance is over. The page will reload shortly.');
        setTimeout(() => window.location.reload(), 3000);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      let timeString = '';
      if (days > 0) timeString += `${days}d `;
      if (hours > 0 || days > 0) timeString += `${hours}h `;
      timeString += `${minutes}m ${seconds}s`;

      setTimeLeft(timeString);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [endTime]);

  return <p className="mt-4 text-xl font-mono text-yellow-300">{timeLeft}</p>;
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
    if (!settings?.isUnderMaintenance) return false;
    
    // If there's an end time, check if it's in the future
    if (settings.maintenanceEndTime) {
      return settings.maintenanceEndTime.toDate() > new Date();
    }
    
    // If no end time, maintenance is on indefinitely
    return true;
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
            <p className="mt-4 text-muted-foreground">Service will resume in:</p>
            <CountdownTimer endTime={settings.maintenanceEndTime.toDate()} />
          </>
        )}
         <p className="mt-2 text-muted-foreground">
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
