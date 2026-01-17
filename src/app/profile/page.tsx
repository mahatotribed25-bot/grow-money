
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
  HandCoins,
  Users as UsersIcon,
  Fingerprint,
  Phone,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth, useDoc, useFirestore } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollection } from '@/firebase';
import { Timestamp, doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';

type Transaction = {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
  userId?: string;
};

type GroupInvestment = {
    id: string;
    planId: string;
    planName: string;
    investedAmount: number;
    amountReceived: number;
    createdAt: Timestamp;
    investorId: string;
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
  aadhaarNumber?: string;
  phoneNumber?: string;
  kycTermsAccepted?: boolean;
};

function useUserGroupInvestments(userId?: string) {
    const [investments, setInvestments] = useState<GroupInvestment[]>([]);
    const [loading, setLoading] = useState(true);
    const firestore = useFirestore();

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const fetchInvestments = async () => {
            setLoading(true);
            const allInvestments: GroupInvestment[] = [];
            
            const plansSnapshot = await getDocs(collection(firestore, 'groupLoanPlans'));

            for (const planDoc of plansSnapshot.docs) {
                const investmentsRef = collection(firestore, `groupLoanPlans/${planDoc.id}/investments`);
                const q = query(investmentsRef, where('investorId', '==', userId));
                const investmentSnapshot = await getDocs(q);

                investmentSnapshot.forEach(invDoc => {
                    allInvestments.push({ id: invDoc.id, ...invDoc.data() } as GroupInvestment);
                });
            }
            
            setInvestments(allInvestments);
            setLoading(false);
        };

        fetchInvestments();
    }, [userId, firestore]);

    return { data: investments, loading };
}


export default function ProfilePage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const { data: deposits } = useCollection<Transaction>(user ? `deposits` : null, { where: ['userId', '==', user?.uid]});
  const { data: withdrawals } = useCollection<Transaction>(user ? `withdrawals` : null, { where: ['userId', '==', user?.uid]});
  const { data: groupInvestments } = useUserGroupInvestments(user?.uid);

  const { data: userData, loading: userDataloading } = useDoc<UserData>(user ? `users/${user.uid}` : null);
  
  const [upiId, setUpiId] = useState('');
  const [isUpiEditing, setIsUpiEditing] = useState(false);

  // KYC State
  const [panCard, setPanCard] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [kycTermsAccepted, setKycTermsAccepted] = useState(false);
  
  useEffect(() => {
    if (userData) {
      setUpiId(userData.upiId || '');
      setPanCard(userData.panCard || '');
      setAadhaarNumber(userData.aadhaarNumber || '');
      setPhoneNumber(userData.phoneNumber || '');
      setKycTermsAccepted(userData.kycTermsAccepted || false);
    }
  }, [userData]);


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

  const handleSaveKyc = async () => {
    if (!user) return;
    const panRegex = /[A-Z]{5}[0-9]{4}[A-Z]{1}/;
    const aadhaarRegex = /^[0-9]{12}$/;
    const phoneRegex = /^[0-9]{10}$/;

    if (!panRegex.test(panCard)) {
        toast({ title: "Invalid PAN", description: "Please enter a valid 10-digit PAN.", variant: "destructive" });
        return;
    }
    if (!aadhaarRegex.test(aadhaarNumber)) {
        toast({ title: "Invalid Aadhaar", description: "Please enter a valid 12-digit Aadhaar number.", variant: "destructive" });
        return;
    }
    if (!phoneRegex.test(phoneNumber)) {
        toast({ title: "Invalid Phone Number", description: "Please enter a valid 10-digit phone number.", variant: "destructive" });
        return;
    }
    if (!kycTermsAccepted) {
        toast({ title: "Terms Not Accepted", description: "You must accept the terms and conditions to proceed.", variant: "destructive" });
        return;
    }

    const userRef = doc(firestore, 'users', user.uid);
    try {
        await updateDoc(userRef, { 
            panCard: panCard,
            aadhaarNumber: aadhaarNumber,
            phoneNumber: phoneNumber,
            kycTermsAccepted: kycTermsAccepted,
        });
        toast({ title: "KYC Details Saved", description: "Your information has been saved successfully." });
    } catch (e) {
        console.error(e);
        toast({ title: "Update Failed", description: "Could not save your KYC details.", variant: "destructive" });
    }
  }
  
  const isKycFilled = userData?.panCard && userData?.aadhaarNumber && userData?.phoneNumber && userData?.kycTermsAccepted;


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
        <Card className="shadow-lg border-primary/10 bg-gradient-to-b from-card to-secondary/20">
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
        
         <Card className="shadow-lg border-primary/10 bg-gradient-to-b from-card to-secondary/20 mt-6">
          <CardHeader>
            <CardTitle>KYC Verification</CardTitle>
            <CardDescription>This information is required to apply for loans.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {userDataloading ? <p>Loading KYC status...</p> : (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="panCard">PAN Card Number</Label>
                        <Input id="panCard" value={panCard} onChange={(e) => setPanCard(e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="aadhaarNumber">Aadhaar Card Number</Label>
                        <Input id="aadhaarNumber" type="number" value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value)} placeholder="123456789012" maxLength={12}/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <Input id="phoneNumber" type="number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="9876543210" maxLength={10}/>
                    </div>
                     <div className="space-y-4 rounded-md border p-4">
                        <h4 className="text-sm font-medium">Terms and Conditions</h4>
                        <p className="text-xs text-muted-foreground">
                          If you do not repay the loan, if for some reason you run away, or if you abscond without repaying the loan, then legal action will be taken against you.
                        </p>
                         <div className="flex items-center space-x-2">
                            <Checkbox id="terms" checked={kycTermsAccepted} onCheckedChange={(checked) => setKycTermsAccepted(!!checked)} />
                            <label
                                htmlFor="terms"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                I agree to the terms and conditions
                            </label>
                        </div>
                    </div>
                    <Button onClick={handleSaveKyc} className="w-full">
                        {isKycFilled ? 'Update KYC Information' : 'Save KYC Information'}
                    </Button>
                </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-primary/10 bg-gradient-to-b from-card to-secondary/20 mt-6">
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
                <TransactionTable transactions={deposits} />
            </TabsContent>
            <TabsContent value="withdrawals">
                <TransactionTable transactions={withdrawals} />
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
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs">
          <BottomNavItem icon={Home} label="Home" href="/dashboard" />
          <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
          <BottomNavItem icon={UsersIcon} label="Team" href="/team" />
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
        <Card className="bg-gradient-to-b from-card to-secondary/20 border-primary/10">
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
    const { data: planData } = useDoc<GroupLoanPlan>(investment ? `groupLoanPlans/${investment.planId}`: null);
    
    const formatDate = (timestamp: Timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
    };
    
    const repaymentProgress = planData && planData.totalRepayment > 0 
        ? ((planData.amountRepaid || 0) / planData.totalRepayment) * 100 
        : 0;

    const investorShare = (planData && planData.loanAmount > 0) ? ((investment.investedAmount || 0) / planData.loanAmount) : 0;
    const totalProfitShare = (planData?.interest || 0) * investorShare;
    const expectedReturn = (investment.investedAmount || 0) + totalProfitShare;
    const remainingAmount = expectedReturn - (investment.amountReceived || 0);

    return (
        <TableRow>
            <TableCell>
                <div className='font-medium'>{investment.planName}</div>
                <div className='text-xs text-muted-foreground'>{formatDate(investment.createdAt)}</div>
            </TableCell>
            <TableCell>₹{(investment.investedAmount || 0).toFixed(2)}</TableCell>
            <TableCell className="text-cyan-400">₹{(totalProfitShare || 0).toFixed(2)}</TableCell>
            <TableCell className="text-green-400">₹{(investment.amountReceived || 0).toFixed(2)}</TableCell>
            <TableCell className="text-yellow-400">₹{(remainingAmount > 0 ? remainingAmount : 0).toFixed(2)}</TableCell>
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
        <Card className="bg-gradient-to-b from-card to-secondary/20 border-primary/10">
            <CardContent className="pt-6">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Plan</TableHead>
                                <TableHead>Invested</TableHead>
                                <TableHead>Profit</TableHead>
                                <TableHead>Received</TableHead>
                                <TableHead>Remaining</TableHead>
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
                                    <TableCell colSpan={6} className="text-center">No group investments found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
