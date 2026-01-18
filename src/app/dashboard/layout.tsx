'use client';

import { useDoc } from '@/firebase';
import { UserPresence } from '@/components/UserPresence';
import Image from 'next/image';

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
        <div className="relative h-48 w-48 mb-4">
          <Image
            src="https://picsum.photos/seed/maintenance/400/400"
            alt="Under Maintenance"
            fill
            className="object-cover rounded-full"
            data-ai-hint="worker fixing website"
          />
        </div>
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
