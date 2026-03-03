'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SubAdminDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/subadmin/custom-loans');
  }, [router]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
