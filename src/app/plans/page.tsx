
'use client';

import {
  ChevronLeft,
  Briefcase,
  Home,
  User,
  Calendar,
  IndianRupee,
  TrendingUp,
  FileText,
  HandCoins,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection } from '@/firebase';
import type { Timestamp } from 'firebase/firestore';

type Investment = {
  id: string;
  planName: string;
  investmentAmount: number;
  dailyIncome: number;
  totalReturn: number;
  startDate: Timestamp;
  endDate: Timestamp;
  status: 'Active' | 'Completed';
  userId: string;
};

const formatDate = (timestamp: Timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleDateString();
};

export default function PlansPage() {
  const { user } = useUser();
  const { data: investments, loading } = useCollection<Investment>(
    user ? `users/${user.uid}/investments` : null
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 px-4 backdrop-blur-sm sm:px-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">My Investment Plans</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="space-y-4">
          {loading ? (
            <p>Loading plans...</p>
          ) : investments && investments.length > 0 ? (
            investments.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))
          ) : (
            <Card className="shadow-lg border-border/50">
              <CardContent className="p-6 text-center text-muted-foreground">
                <p>You have not invested in any plans yet.</p>
                <Button asChild className="mt-4">
                  <Link href="/dashboard">Explore Plans</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <nav className="sticky bottom-0 z-10 border-t border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-md grid-cols-4 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={FileText} label="My Plans" href="/plans" active />
          <BottomNavItem icon={HandCoins} label="Loans" href="/loans" />
          <BottomNavItem icon={User} label="Profile" href="/profile" />
        </div>
      </nav>
    </div>
  );
}

function PlanCard({ plan }: { plan: Investment }) {
  const isExpired = plan.endDate.toDate() < new Date() && plan.status === 'Active';
  
  return (
    <Card className="shadow-lg border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-primary">{plan.planName}</CardTitle>
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${
              plan.status === 'Active' && !isExpired
                ? 'bg-green-500/20 text-green-400'
                : 'bg-yellow-500/20 text-yellow-400'
            }`}
          >
            {isExpired ? 'Expired' : plan.status}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <PlanDetail
          icon={IndianRupee}
          label="Investment"
          value={`₹${plan.investmentAmount}`}
        />
        <PlanDetail
          icon={TrendingUp}
          label="Daily Income"
          value={`₹${plan.dailyIncome}`}
        />
         <PlanDetail
          icon={IndianRupee}
          label="Total Return"
          value={`₹${plan.totalReturn}`}
        />
        <PlanDetail
          icon={Calendar}
          label="Start Date"
          value={formatDate(plan.startDate)}
        />
        <PlanDetail
          icon={Calendar}
          label="End Date"
          value={formatDate(plan.endDate)}
        />
      </CardContent>
    </Card>
  );
}

function PlanDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function BottomNavItem({
  icon: Icon,
  label,
  href,
  active = false,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 ${
        active ? 'text-primary' : 'text-muted-foreground'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}
