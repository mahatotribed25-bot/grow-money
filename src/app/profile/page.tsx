
'use client';

import {
  ChevronLeft,
  User,
  Mail,
  Wallet,
  LogOut,
  Home,
  Briefcase,
  Copy,
  Gift,
  CreditCard,
  Users2,
  HandCoins
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth, useDoc, useFirestore } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollection } from '@/firebase';
import { Timestamp, doc, updateDoc, collection } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';

type Transaction = {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
  userId?: string; // Add userId to filter transactions client-side
};

type GroupInvestment = {
    id: string;
    planId: string;
    planName: string;
    investedAmount: number;
    amountReceived: number;
    amountPending: number;
    createdAt: Timestamp;
}

type GroupLoanPlan = {
    id: string;
    loanAmount: number;
    interest: number;
    totalRepayment: number;
    amountRepaid: number;
}

type UserData = {
  referralCode?: string;
  upiId?: string;
  panCard?: string;
};

export default function ProfilePage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const { data: deposits } = useCollection<Transaction>(user ? `deposits` : null);
  const { data: withdrawals } = useCollection<Transaction>(user ? `withdrawals` : null);
  const { data: groupInvestments } = useCollection<GroupInvestment>(user ? `groupLoanPlans` : null, { subcollections: ['investments'], where: ['investorId', '==', user?.uid] });
  const { data: userData, loading: userDataloading } = useDoc<UserData>(user ? `users/${user.uid}` : null);
  
  const [upiId, setUpiId] = useState('');
  const [panCard, setPanCard] = useState('');
  const [isUpiEditing, setIsUpiEditing] = useState(false);
  const [isPanEditing, setIsPanEditing] = useState(false);
  
  useEffect(() => {
    if (userData) {
      setUpiId(userData.upiId || '');
      setPanCard(userData.panCard || '');
    }
  }, [userData]);

  const userDeposits = deposits?.filter((d) => d.userId === user?.uid);
  const userWithdrawals = withdrawals?.filter((w) => w.userId === user?.uid);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };
  
  const handleCopyCode = () => {
    if (userData?.referralCode) {
      navigator.clipboard.writeText(userData.referralCode);
      toast({
        title: "Copied!",
        description: "Your referral code has been copied to the clipboard.",
      });
    }
  };

  const handleSaveUpi = async () => {
      if (!user) return;
      const userRef = doc(firestore, 'users', user.uid);
      try {
          await updateDoc(userRef, { upiId: upiId });
          toast({
              title: "UPI ID Saved",
              description: "Your UPI ID has been updated successfully."
          });
          setIsUpiEditing(false);
      } catch (error) {
          console.error("Error saving UPI ID:", error);
          toast({
              title: "Update Failed",
              description: "Could not save your UPI ID. Please try again.",
              variant: "destructive",
          })
      }
  }
  
  const handleSavePan = async () => {
      if (!user) return;
      // Basic PAN validation
      const panRegex = /[A-Z]{5}[0-9]{4}[A-Z]{1}/;
      if (!panRegex.test(panCard)) {
          toast({
              title: "Invalid PAN",
              description: "Please enter a valid PAN card number.",
              variant: "destructive",
          });
          return;
      }
      const userRef = doc(firestore, 'users', user.uid);
      try {
          await updateDoc(userRef, { panCard: panCard });
          toast({
              title: "PAN Card Saved",
              description: "Your PAN card number has been updated."
          });
          setIsPanEditing(false);
      } catch (error) {
          console.error("Error saving PAN:", error);
          toast({
              title: "Update Failed",
              description: "Could not save your PAN card. Please try again.",
              variant: "destructive",
          })
      }
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 px-4 backdrop-blur-sm sm:px-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">Profile</h1>
        <div className="w-9"></div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <Card className="shadow-lg border-border/50">
          <CardHeader>
            <CardTitle>My Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {userDataloading ? <p>Loading...</p> : <>
              <InfoRow icon={User} label="Name" value={user?.displayName || 'N/A'} />
              <Separator />
              <InfoRow icon={Mail} label="Email" value={user?.email || 'N/A'} />
              <Separator />
              <div className="space-y-2">
                  <Label htmlFor="panCard">Your PAN Card</Label>
                  <div className="flex gap-2">
                      <Input id="panCard" value={panCard} onChange={(e) => {setPanCard(e.target.value.toUpperCase()); setIsPanEditing(true);}} placeholder="ABCDE1234F" maxLength={10} />
                      {isPanEditing && <Button onClick={handleSavePan}>Save</Button>}
                  </div>
                  <p className="text-xs text-muted-foreground">Required for applying for loans.</p>
              </div>
              <Separator />
              <div className="space-y-2">
                  <Label htmlFor="upiId">Your UPI ID</Label>
                  <div className="flex gap-2">
                      <Input id="upiId" value={upiId} onChange={(e) => {setUpiId(e.target.value); setIsUpiEditing(true);}} placeholder="your-upi@bank" />
                      {isUpiEditing && <Button onClick={handleSaveUpi}>Save</Button>}
                  </div>
                  <p className="text-xs text-muted-foreground">Your withdrawals will be sent to this UPI ID.</p>
              </div>
            </>
          }
          </CardContent>
        </Card>
        
        <Card className="shadow-lg border-border/50 mt-6">
          <CardHeader>
            <CardTitle>Referral Code</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-md bg-muted p-3">
              <div className="flex items-center gap-3">
                  <Gift className="h-6 w-6 text-primary" />
                  <span className="text-lg font-mono tracking-widest">{userData?.referralCode || 'Loading...'}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleCopyCode}>
                <Copy className="h-5 w-5" />
              </Button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Share this code with friends. You'll get a bonus when they make their first investment!</p>
          </CardContent>
        </Card>

        <Tabs defaultValue="deposits" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="deposits">Deposit History</TabsTrigger>
                <TabsTrigger value="withdrawals">Withdrawal History</TabsTrigger>
                <TabsTrigger value="group-investments">Group Investments</TabsTrigger>
            </TabsList>
            <TabsContent value="deposits">
                <TransactionTable transactions={userDeposits} />
            </TabsContent>
            <TabsContent value="withdrawals">
                <TransactionTable transactions={userWithdrawals} />
            </TabsContent>
             <TabsContent value="group-investments">
                <GroupInvestmentTable investments={groupInvestments} />
            </TabsContent>
        </Tabs>

        <Button onClick={handleLogout} className="mt-6 w-full" variant="destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </main>
      <nav className="sticky bottom-0 z-10 border-t border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-md grid-cols-4 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={HandCoins} label="My Loans" href="/my-loans" />
          <BottomNavItem icon={User} label="Profile" href="/profile" active />
        </div>
      </nav>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-sm text-muted-foreground">{value}</span>
    </div>
  );
}

function BottomNavItem({ icon: Icon, label, href, active = false }: { icon: React.ElementType, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center justify-center gap-1 ${active ? 'text-primary' : 'text-muted-foreground'}`}>
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}


function TransactionTable({ transactions }: { transactions: Transaction[] | undefined | null }) {
    const formatDate = (timestamp: Timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp.seconds * 1000).toLocaleString();
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'approved': return 'default';
            case 'rejected': return 'destructive';
            default: return 'secondary';
        }
    };
    
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions && transactions.length > 0 ? (
                                transactions.map(tx => (
                                    <TableRow key={tx.id}>
                                        <TableCell>₹{tx.amount.toFixed(2)}</TableCell>
                                        <TableCell><Badge variant={getStatusVariant(tx.status)}>{tx.status}</Badge></TableCell>
                                        <TableCell>{formatDate(tx.createdAt)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center">No transactions found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

function GroupInvestmentTableRow({ investment }: { investment: GroupInvestment }) {
    const { data: planData } = useDoc<GroupLoanPlan>(`groupLoanPlans/${investment.planId}`);
    
    const formatDate = (timestamp: Timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
    };
    
    const repaymentProgress = planData && planData.totalRepayment > 0 
        ? ((planData.amountRepaid || 0) / planData.totalRepayment) * 100 
        : 0;

    const investorShare = (planData && planData.loanAmount > 0) ? (investment.investedAmount / planData.loanAmount) : 0;
    const expectedReturn = investment.investedAmount + ( (planData?.interest || 0) * investorShare);
    const pendingProfit = expectedReturn - (investment.amountReceived || 0);


    return (
        <TableRow>
            <TableCell>
                <div className='font-medium'>{investment.planName}</div>
                <div className='text-xs text-muted-foreground'>{formatDate(investment.createdAt)}</div>
            </TableCell>
            <TableCell>₹{(investment.investedAmount || 0).toFixed(2)}</TableCell>
            <TableCell className="text-green-400">₹{(investment.amountReceived || 0).toFixed(2)}</TableCell>
            <TableCell className="text-yellow-400">₹{(pendingProfit > 0 ? pendingProfit : 0).toFixed(2)}</TableCell>
            <TableCell>
                {planData ? (
                    <div className="w-24">
                        <Progress value={repaymentProgress} className="h-2" />
                        <span className="text-xs text-muted-foreground">{repaymentProgress.toFixed(0)}% Repaid</span>
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground">Loading...</span>
                )}
            </TableCell>
        </TableRow>
    );
}


function GroupInvestmentTable({ investments }: { investments: GroupInvestment[] | undefined | null }) {

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Plan</TableHead>
                                <TableHead>Invested</TableHead>
                                <TableHead>Received</TableHead>
                                <TableHead>Pending Profit</TableHead>
                                <TableHead>Loan Progress</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {investments && investments.length > 0 ? (
                                investments.map(inv => (
                                    <GroupInvestmentTableRow key={inv.id} investment={inv} />
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">No group investments found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
