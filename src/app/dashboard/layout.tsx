'use client';

import { useDoc, useAuth, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useEffect, useMemo } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { FlipCountdown } from '@/components/dashboard/FlipCountdown';
import { LogOut } from 'lucide-react';
import { ChatSupportWidget } from '@/components/chat/ChatSupport';

type AdminSettings = {
  isUnderMaintenance?: boolean;
  maintenanceEndTime?: Timestamp;
};

type UserData = {
    role?: 'user' | 'subadmin';
    email?: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: userLoading } = useUser();
  const { data: settings, loading: settingsLoading } = useDoc<AdminSettings>(user ? 'settings/admin' : null);
  const { data: userData, loading: userDataLoading } = useDoc<UserData>(user ? `users/${user.uid}` : null);

  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [userLoading, user, router]);

  useEffect(() => {
    if (!userDataLoading && userData) {
      if (userData.email === 'admin@tribed.world') {
        router.push('/admin');
      }
    }
  }, [userData, userDataLoading, router]);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };
  
  const loading = userLoading || settingsLoading || userDataLoading;

  const isUnderMaintenance = useMemo(() => {
    if (!settings) return false;
    if (settings.maintenanceEndTime) {
      return settings.maintenanceEndTime.toDate() > new Date();
    }
    return settings.isUnderMaintenance || false;
  }, [settings]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#030408]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isUnderMaintenance && user?.email !== 'admin@tribed.world') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#030408] p-4 text-center relative overflow-hidden">
         <div className="absolute top-[-10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] pointer-events-none animate-pulse" />
         <div className="absolute bottom-[-10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-secondary/10 blur-[120px] pointer-events-none" />
        
        <div className="relative z-10">
            <div className="text-8xl mb-4 animate-bounce">
            <span>🛠️</span>
            </div>
            <h1 className="mt-8 text-3xl font-bold text-white">
            Under Maintenance
            </h1>
            <p className="mt-2 text-white/40 max-w-md">
            The application is currently undergoing scheduled maintenance. We'll be back shortly.
            </p>
            {settings?.maintenanceEndTime && (
            <>
                <p className="mt-6 text-lg text-white/60">Service will resume in:</p>
                <FlipCountdown endTime={settings.maintenanceEndTime.toDate()} />
            </>
            )}
            <p className="mt-6 text-white/30">
            Thank you for your patience.
            </p>
            <Button onClick={handleLogout} variant="outline" className="mt-8 border-white/10 hover:bg-white/5">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
            </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030408] relative overflow-hidden flex flex-col">
       {/* Global Glassy Background Elements */}
       <div className="fixed top-[-10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none animate-pulse z-0" />
       <div className="fixed bottom-[-10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-[120px] pointer-events-none z-0" />
       
       <div className="relative z-10 flex-1 flex flex-col">
         {children}
         <ChatSupportWidget />
       </div>
    </div>
  );
}
