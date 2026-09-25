
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useDoc } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck, ArrowRight, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type UserPermissions = {
    canManageDeposits?: boolean;
    canManageWithdrawals?: boolean;
    canManageKyc?: boolean;
    canManagePlanLoans?: boolean;
    canManageCustomLoans?: boolean;
    canManageMarket?: boolean;
}

type UserData = {
    role?: 'user' | 'subadmin';
    email?: string;
    permissions?: UserPermissions;
    name?: string;
}

const ADMIN_EMAILS = ['admin@tribed.world', 'admin@tribed.com'];

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
    const isRootAdmin = userData.email && ADMIN_EMAILS.includes(userData.email.toLowerCase());
    
    // Auto-redirect to the first available module if not root admin
    if (!isRootAdmin) {
        const possibleRedirects = [
            { path: '/subadmin/custom-loans', canAccess: permissions.canManageCustomLoans },
            { path: '/subadmin/kyc-requests', canAccess: permissions.canManageKyc },
            { path: '/subadmin/loans', canAccess: permissions.canManagePlanLoans },
            { path: '/subadmin/deposits', canAccess: permissions.canManageDeposits },
            { path: '/subadmin/withdrawals', canAccess: permissions.canManageWithdrawals },
        ];

        const redirectTo = possibleRedirects.find(p => p.canAccess)?.path;

        if (redirectTo) {
            router.replace(redirectTo);
        }
    }

  }, [router, userData, loading]);

  if (loading) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <Timer className="animate-spin text-primary" />
        </div>
    );
  }

  // If we land here, it means we are a SubAdmin but might not have specific module redirects
  // Or we are a root admin landing on the base subadmin path
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <Card className="max-w-md w-full bg-primary/5 border-primary/20 rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
        <CardContent className="p-10 text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_40px_rgba(139,92,246,0.2)]">
                <ShieldCheck size={40} />
            </div>
            <div className="space-y-2">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Staff Portal Active</h2>
                <p className="text-sm text-white/40 leading-relaxed">
                    Hello, <span className="text-white font-bold">{userData?.name}</span>. You are authorized as platform staff. 
                    {Object.values(userData?.permissions || {}).some(v => v === true) 
                        ? "Please use the sidebar to access your assigned modules." 
                        : "Your access nodes are being configured by the Super Admin."}
                </p>
            </div>
            <Button asChild className="w-full h-12 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px]">
                <Link href="/profile">My Personal Profile <ArrowRight size={14} className="ml-2" /></Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
