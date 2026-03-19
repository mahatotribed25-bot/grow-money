'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useDoc } from '@/firebase';

type UserPermissions = {
    canManageDeposits?: boolean;
    canManageWithdrawals?: boolean;
    canManageKyc?: boolean;
    canManagePlanLoans?: boolean;
    canManageCustomLoans?: boolean;
}

type UserData = {
    role?: 'user' | 'subadmin';
    email?: string;
    permissions?: UserPermissions;
}

const ADMIN_EMAIL = 'admin@tribed.world';

export default function SubAdminDashboard() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { data: userData, loading: userDataLoading } = useDoc<UserData>(user ? `users/${user.uid}` : null);

  const loading = userLoading || userDataLoading;

  useEffect(() => {
    if (loading || !userData) {
      return;
    }
    
    const permissions = userData.permissions || {};
    const isAdmin = userData.email === ADMIN_EMAIL;
    
    // Ordered by priority
    const possibleRedirects = [
        { path: '/subadmin/custom-loans', canAccess: isAdmin || permissions.canManageCustomLoans },
        { path: '/subadmin/kyc-requests', canAccess: isAdmin || permissions.canManageKyc },
        { path: '/subadmin/loans', canAccess: isAdmin || permissions.canManagePlanLoans },
        { path: '/subadmin/deposits', canAccess: isAdmin || permissions.canManageDeposits },
        { path: '/subadmin/withdrawals', canAccess: isAdmin || permissions.canManageWithdrawals },
    ];

    const redirectTo = possibleRedirects.find(p => p.canAccess)?.path;

    if (redirectTo) {
        router.replace(redirectTo);
    } else {
        // If no permissions, redirect to user dashboard
        router.replace('/dashboard');
    }

  }, [router, userData, loading]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
