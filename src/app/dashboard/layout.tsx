
'use client';

import { useDoc } from '@/firebase';
import { Wrench } from 'lucide-react';
import { UserPresence } from '@/components/UserPresence';

type AdminSettings = {
  isUnderMaintenance?: boolean;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: settings, loading } = useDoc<AdminSettings>('settings/admin');

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (settings?.isUnderMaintenance) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <span className="text-8xl animate-bounce">🛠️</span>
        <h1 className="mt-8 text-3xl font-bold text-foreground">
          Under Maintenance
        </h1>
        <p className="mt-2 text-muted-foreground">
          The application is currently undergoing scheduled maintenance. We'll be
          back shortly. Thank you for your patience.
        </p>
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
