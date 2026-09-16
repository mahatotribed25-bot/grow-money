'use client';

import {
  ChevronLeft,
  User,
  LogOut,
  Home,
  Briefcase,
  Copy,
  Gift,
  HandCoins,
  Trophy,
  Timer,
  Pencil,
  Eye,
  ShieldCheck,
  Smartphone,
  FileCheck,
  ArrowRight,
  FileSpreadsheet,
  Moon,
  Sun,
  Languages,
  Upload,
  ImageIcon,
  AlertTriangle,
  Camera
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth, useDoc, useFirestore } from '@/firebase';
import { signOut, updateProfile } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollection } from '@/firebase';
import { Timestamp, doc, updateDoc, collection, query, where, getDocs, orderBy, serverTimestamp, addDoc } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import TrustScoreMeter from '@/components/TrustScoreMeter';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as XLSX from 'xlsx';
import { useSettings } from '@/context/settings-context';
import { Language } from '@/lib/translations';
import Image from 'next/image';

type Transaction = {
  id: string;
  amount: number;
  status: 'approved' | 'rejected' | 'pending';
  createdAt: Timestamp;
  transactionId?: string;
  gstAmount?: number;
  finalAmount?: number;
  totalDelayBonus?: number;
};

type WalletHistoryEntry = {
    id: string;
    amount: number;
    type: 'credit' | 'debit';
    category: string;
    description: string;
    createdAt: Timestamp;
}

type UpiRequest = {
  id: string;
  status: 'pending' | 'awaiting_confirmation' | 'approved' | 'rejected';
  confirmationAmount?: number;
  upiId: string;
  upiProvider: string;
};

type GroupInvestment = {
    id: string;
    planName: string;
    investedAmount: number;
    amountReceived: number;
    createdAt: Timestamp;
}

type UserData = {
  name?: string;
  photoURL?: string;
  referralCode?: string;
  upiId?: string;
  upiProvider?: string;
  upiStatus?: 'Unverified' | 'Pending' | 'Verified' | 'Rejected';
  vipLevel?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  trustScore?: number;
  kycStatus?: 'Not Submitted' | 'Pending' | 'Verified' | 'Rejected';
  kycRejectionReason?: string;
  kycExpiryDate?: Timestamp;
  panCard?: string;
  aadhaarNumber?: string;
  phoneNumber?: string;
  panImage?: string;
  aadhaarImage?: string;
};

export default function ProfilePage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const { theme, language, setTheme, setLanguage, t } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: userData, refetch: refetchUser } = useDoc<UserData>(user ? `users/${user.uid}` : null);
  const { data: deposits } = useCollection<Transaction>(user ? `deposits` : null, { where: ['userId', '==', user?.uid]});
  const { data: withdrawals } = useCollection<Transaction>(user ? `withdrawals` : null, { where: ['userId', '==', user?.uid]});
  const { data: walletHistory } = useCollection<WalletHistoryEntry>(user ? `users/${user.uid}/walletHistory` : null, undefined, orderBy('createdAt', 'desc'));
  const { data: upiRequests } = useCollection<UpiRequest>(user ? `upiRequests` : null, { where: ['userId', '==', user?.uid] });

  const [groupInvestments, setGroupInvestments] = useState<GroupInvestment[]>([]);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isEditUpiOpen, setIsEditUpiOpen] = useState(false);
  const [isKycOpen, setIsKycOpen] = useState(false);
  
  const [editName, setEditName] = useState('');
  const [editUpiId, setEditUpiId] = useState('');
  const [editUpiProvider, setEditUpiProvider] = useState('');
  
  const [kycPan, setKycPan] = useState('');
  const [kycAadhaar, setKycAadhaar] = useState('');
  const [kycPhone, setKycPhone] = useState('');
  const [panImage, setPanImage] = useState<string | null>(null);
  const [aadhaarImage, setAadhaarImage] = useState<string | null>(null);

  const [selectedReceipt, setSelectedReceipt] = useState<{ tx: Transaction, type: 'deposit' | 'withdrawal' } | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchGroupInvestments = async () => {
        const allInvestments: GroupInvestment[] = [];
        const plansSnapshot = await getDocs(collection(firestore, 'groupLoanPlans'));
        for (const planDoc of plansSnapshot.docs) {
            const iq = query(collection(firestore, `groupLoanPlans/${planDoc.id}/investments`), where('investorId', '==', user.uid));
            const investmentSnapshot = await getDocs(iq);
            investmentSnapshot.forEach(invDoc => {
                allInvestments.push({ id: invDoc.id, ...invDoc.data() } as GroupInvestment);
            });
        }
        setGroupInvestments(allInvestments);
    };
    fetchGroupInvestments();
  }, [user, firestore]);

  useEffect(() => {
    if (userData) {
      setEditName(userData.name || '');
      setEditUpiId(userData.upiId || '');
      setEditUpiProvider(userData.upiProvider || '');
      setKycPan(userData.panCard || '');
      setKycAadhaar(userData.aadhaarNumber || '');
      setKycPhone(userData.phoneNumber || '');
      setPanImage(userData.panImage || null);
      setAadhaarImage(userData.aadhaarImage || null);
    }
  }, [userData]);

  const handleLogout = async () => { if (auth) { await signOut(auth); router.push('/login'); } };
  const handleCopyCode = () => { if (userData?.referralCode) { navigator.clipboard.writeText(userData.referralCode); toast({ title: "Copied!" }); } };
  
  const handleUpdateName = async () => {
    if (!user || !auth.currentUser) return;
    await updateProfile(auth.currentUser, { displayName: editName });
    await updateDoc(doc(firestore, 'users', user.uid), { name: editName });
    toast({ title: "Name Updated" });
    setIsEditProfileOpen(false);
    if (refetchUser) refetchUser();
  };

  const handleUpdateUpi = async () => {
    if (!user || !editUpiId || !editUpiProvider) {
        toast({ title: "Validation Error", description: "Please enter both UPI ID and Provider.", variant: "destructive" });
        return;
    }
    
    try {
        const userRef = doc(firestore, 'users', user.uid);
        const upiReqRef = collection(firestore, 'upiRequests');
        
        await updateDoc(userRef, { upiStatus: 'Pending' });
        await addDoc(upiReqRef, {
            userId: user.uid,
            userName: userData?.name || user.displayName,
            upiId: editUpiId,
            upiProvider: editUpiProvider,
            status: 'pending',
            createdAt: serverTimestamp()
        });

        toast({ title: "Update Request Sent", description: "Details verified by admin protocol." });
        setIsEditUpiOpen(false);
        if (refetchUser) refetchUser();
    } catch (e) {
        toast({ title: "Error", description: "Submission failed.", variant: "destructive" });
    }
  };

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 1 * 1024 * 1024) {
        toast({ title: "File Too Large", description: "Profile photo must be less than 1MB.", variant: "destructive" });
        return;
    }

    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
            const userRef = doc(firestore, 'users', user.uid);
            await updateDoc(userRef, { photoURL: base64String });
            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { photoURL: base64String });
            }
            toast({ title: "Photo Updated", description: "Your profile picture has been changed." });
            if (refetchUser) refetchUser();
        } catch (error) {
            toast({ title: "Upload Failed", variant: "destructive" });
        } finally {
            setIsUploadingPhoto(false);
        }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'pan' | 'aadhaar') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        toast({ title: "File Too Large", description: "Image must be less than 2MB.", variant: "destructive" });
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
        if (type === 'pan') setPanImage(reader.result as string);
        else setAadhaarImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitKyc = async () => {
    if (!user || !kycPan || !kycAadhaar || !kycPhone) {
        toast({ title: "Missing Data", description: "Fill in all fields.", variant: "destructive" });
        return;
    }

    if (!panImage || !aadhaarImage) {
        toast({ title: "Images Required", description: "Please upload photos of your PAN and Aadhaar.", variant: "destructive" });
        return;
    }

    try {
        const userRef = doc(firestore, 'users', user.uid);
        await updateDoc(userRef, {
            panCard: kycPan.toUpperCase(),
            aadhaarNumber: kycAadhaar,
            phoneNumber: kycPhone,
            panImage: panImage,
            aadhaarImage: aadhaarImage,
            kycStatus: 'Pending',
            kycSubmissionDate: serverTimestamp()
        });

        toast({ title: "KYC Submitted", description: "Under protocol review." });
        setIsKycOpen(false);
        if (refetchUser) refetchUser();
    } catch (e) {
        toast({ title: "Error", description: "Submission failed.", variant: "destructive" });
    }
  };

  const exportToExcel = () => {
    if (!walletHistory || walletHistory.length === 0) {
        toast({ title: "No Data", description: "No transaction history to export.", variant: "destructive" });
        return;
    }

    const dataToExport = walletHistory.map(item => ({
        Date: new Date(item.createdAt.seconds * 1000).toLocaleString(),
        Category: item.category,
        Description: item.description,
        Type: item.type.toUpperCase(),
        Amount: item.type === 'credit' ? item.amount : -item.amount
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    XLSX.writeFile(workbook, `Transactions_${user?.uid.slice(0, 5)}.xlsx`);
    
    toast({ title: "Export Successful", description: "Transaction ledger downloaded." });
  };

  const isKycExpired = useMemo(() => {
    if (!userData?.kycExpiryDate) return false;
    return userData.kycExpiryDate.toDate() < new Date();
  }, [userData]);

  const kycStatusDisplay = useMemo(() => {
    if (isKycExpired) return 'Expired';
    return userData?.kycStatus || 'Not Submitted';
  }, [userData, isKycExpired]);

  const kycProgress = useMemo(() => {
    if (isKycExpired) return 10;
    if (userData?.kycStatus === 'Verified') return 100;
    if (userData?.kycStatus === 'Pending') return 50;
    return 10;
  }, [userData, isKycExpired]);

  const awaitingConfirmationRequest = upiRequests?.find(req => req.status === 'awaiting_confirmation');

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground transition-colors duration-300">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/20 bg-background/95 px-4 backdrop-blur-sm sm:px-6">
        <Link href="/dashboard"><Button variant="ghost" size="icon" className="hover:bg-accent"><ChevronLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-lg font-bold tracking-tight">{t.profile.title}</h1>
        <div className="flex gap-2 items-center">
            <Select value={language} onValueChange={(v: Language) => setLanguage(v)}>
                <SelectTrigger className="w-10 h-8 p-0 border-none bg-transparent hover:bg-accent flex items-center justify-center rounded-full">
                    <Languages size={18} className="text-muted-foreground" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">हिंदी</SelectItem>
                    <SelectItem value="mr">मराठी</SelectItem>
                    <SelectItem value="gu">ગુજરાતી</SelectItem>
                    <SelectItem value="te">తెలుగు</SelectItem>
                    <SelectItem value="ml">മലയാളം</SelectItem>
                    <SelectItem value="ta">தமிழ்</SelectItem>
                    <SelectItem value="kn">ಕನ್ನಡ</SelectItem>
                    <SelectItem value="bn">বাংলা</SelectItem>
                    <SelectItem value="bh">बिहारी (भोजपुरी)</SelectItem>
                </SelectContent>
            </Select>

             <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="rounded-full w-8 h-8 hover:bg-accent">
                {theme === 'dark' ? <Sun size={18} className="text-muted-foreground" /> : <Moon size={18} className="text-muted-foreground" />}
            </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl mx-auto w-full">
        <Card className="bg-card border-border shadow-lg rounded-3xl overflow-hidden relative group">
          <CardHeader className="relative z-10">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative group/avatar">
                  <Avatar className="h-24 w-24 border-4 border-primary/20 rounded-[2rem] shadow-2xl overflow-hidden">
                    <AvatarImage src={userData?.photoURL} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary text-3xl font-black">{userData?.name?.charAt(0)}</AvatarFallback>
                    {isUploadingPhoto && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Timer className="animate-spin text-white h-6 w-6" />
                        </div>
                    )}
                  </Avatar>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-xl bg-background border-border shadow-xl hover:scale-110 transition-all"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera size={14} className="text-primary" />
                  </Button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleProfilePhotoChange} 
                  />
              </div>
              <div className="text-center sm:text-left space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                    <CardTitle className="text-2xl font-black tracking-tight">{userData?.name || t.profile.node}</CardTitle>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setIsEditProfileOpen(true)}>
                        <Pencil size={12} />
                    </Button>
                </div>
                <CardDescription className="text-muted-foreground font-medium">{user?.email}</CardDescription>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
                    <Badge className="bg-primary/20 border-primary/30 text-primary uppercase text-[9px] font-black tracking-widest px-3 py-1 rounded-lg">
                        {userData?.vipLevel || 'Bronze'} Tier
                    </Badge>
                    <Badge variant="outline" className="border-border text-muted-foreground text-[9px] font-black tracking-widest uppercase">NODE: {user?.uid.slice(-8).toUpperCase()}</Badge>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <TrustScoreMeter score={userData?.trustScore || 500} />

        <div className="grid gap-4 sm:grid-cols-2">
            <Card className="bg-card border-border rounded-3xl group">
                <CardHeader>
                    <CardTitle className="text-[10px] font-black flex items-center gap-2 uppercase tracking-[3px] text-muted-foreground group-hover:text-primary transition-colors">
                        <Gift size={14} className="text-primary" /> {t.profile.referral}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-between items-center bg-muted/30 p-4 rounded-2xl mx-4 mb-4 border border-border">
                    <span className="font-mono font-black tracking-[2px]">{userData?.referralCode || '------'}</span>
                    <Button variant="ghost" size="icon" onClick={handleCopyCode} className="hover:bg-accent text-primary"><Copy size={16} /></Button>
                </CardContent>
            </Card>
            
            <Card className="bg-card border-border rounded-3xl">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-[10px] font-black flex items-center gap-2 uppercase tracking-[3px] text-muted-foreground">
                        <Smartphone size={14} className="text-accent" /> {t.profile.payment}
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditUpiOpen(true)} className="h-6 text-[9px] font-black uppercase text-primary hover:text-primary-foreground">Update</Button>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                    {userData?.upiId ? (
                        <div className="space-y-1">
                            <p className="text-sm font-bold truncate">{userData.upiId}</p>
                            <div className="flex items-center gap-2">
                                <Badge className={cn(
                                    "text-[8px] font-black uppercase h-4",
                                    userData.upiStatus === 'Verified' ? "bg-accent/20 text-accent border-accent/30" : "bg-yellow-500/20 text-yellow-600 border-yellow-500/30"
                                )}>
                                    {userData.upiStatus || 'Pending Verification'}
                                </Badge>
                                <span className="text-[9px] text-muted-foreground font-bold uppercase">{userData.upiProvider}</span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground italic">No payment method linked</p>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-card border-border rounded-3xl sm:col-span-2 overflow-hidden relative p-6">
                <div className="flex flex-row items-center justify-between mb-4">
                    <CardTitle className="text-[10px] font-black flex items-center gap-2 uppercase tracking-[3px] text-muted-foreground">
                        <FileCheck size={14} className="text-primary" /> {t.profile.identity}
                    </CardTitle>
                    {(userData?.kycStatus !== 'Verified' || isKycExpired) && (
                        <Button onClick={() => setIsKycOpen(true)} size="sm" className="h-8 px-4 rounded-xl font-black uppercase text-[9px]">
                           {isKycExpired ? 'Re-Verify Node' : userData?.kycStatus === 'Rejected' ? 'Re-Submit' : 'Verify Node'}
                        </Button>
                    )}
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 px-1">
                        <span>Verification Protocol</span>
                        <span>{kycProgress}%</span>
                    </div>
                    <Progress value={kycProgress} className="h-2" />
                    <div className="flex items-center justify-between mt-2">
                        <div className="space-y-1">
                             <p className="text-sm font-bold">{t.profile.kyc_status}</p>
                             <Badge className={cn(
                                 "text-[8px] font-black uppercase h-5",
                                 isKycExpired ? "bg-red-500/20 text-red-500 border-red-500/30" :
                                 userData?.kycStatus === 'Verified' ? "bg-accent/20 text-accent border-accent/30" :
                                 userData?.kycStatus === 'Pending' ? "bg-primary/20 text-primary border-primary/30" :
                                 userData?.kycStatus === 'Rejected' ? "bg-destructive/20 text-destructive border-destructive/30" :
                                 "bg-muted text-muted-foreground border-border"
                             )}>
                                 {kycStatusDisplay}
                             </Badge>
                        </div>
                        {userData?.kycExpiryDate && userData.kycStatus === 'Verified' && !isKycExpired && (
                            <div className="text-right">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Valid Until</p>
                                <p className="text-xs font-bold">{userData.kycExpiryDate.toDate().toLocaleDateString()}</p>
                            </div>
                        )}
                        {userData?.kycStatus === 'Verified' && !isKycExpired && (
                             <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                                <ShieldCheck size={20} />
                             </div>
                        )}
                        {isKycExpired && (
                             <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center text-destructive">
                                <AlertTriangle size={20} />
                             </div>
                        )}
                    </div>
                    {isKycExpired && (
                        <p className="text-[10px] text-red-400 font-bold bg-red-500/5 p-3 rounded-xl border border-red-500/20 animate-pulse">
                            ⚠️ Identity protocol has expired. Re-verification required to maintain node access.
                        </p>
                    )}
                </div>
            </Card>
        </div>

        {awaitingConfirmationRequest && <AmountVerificationCard request={awaitingConfirmationRequest} />}

        <Tabs defaultValue="history">
            <div className="flex items-center justify-between mb-4">
                <TabsList className="grid w-full grid-cols-4 bg-muted h-14 rounded-2xl p-1.5 border border-border flex-1 mr-4">
                    <TabsTrigger value="history" className="rounded-xl font-bold uppercase tracking-widest text-[9px] data-[state=active]:bg-background">{t.profile.ledger}</TabsTrigger>
                    <TabsTrigger value="deposits" className="rounded-xl font-bold uppercase tracking-widest text-[9px] data-[state=active]:bg-background">{t.profile.recharge}</TabsTrigger>
                    <TabsTrigger value="withdrawals" className="rounded-xl font-bold uppercase tracking-widest text-[9px] data-[state=active]:bg-background">{t.profile.payout}</TabsTrigger>
                    <TabsTrigger value="groups" className="rounded-xl font-bold uppercase tracking-widest text-[9px] data-[state=active]:bg-background">{t.profile.pools}</TabsTrigger>
                </TabsList>
                <Button variant="outline" size="icon" onClick={exportToExcel} className="h-14 w-14 rounded-2xl border-border bg-card hover:bg-accent/10 text-accent shadow-lg" title={t.profile.export}>
                    <FileSpreadsheet size={20} />
                </Button>
            </div>
            <div className="mt-6">
                <TabsContent value="history">
                    <HistoryTable 
                        headers={['Protocol', 'Flow']} 
                        items={walletHistory} 
                        renderRow={(e) => (
                            <TableRow key={e.id} className="border-border hover:bg-muted/30">
                                <TableCell className="pl-6 py-4">
                                    <p className="text-xs font-bold">{e.category}</p>
                                    <p className="text-[9px] text-muted-foreground uppercase font-black">{e.description}</p>
                                </TableCell>
                                <TableCell className={cn("text-right pr-6 font-black", e.type === 'credit' ? 'text-accent' : 'text-destructive')}>
                                    {e.type === 'credit' ? '+' : '-'}₹{e.amount.toFixed(2)}
                                </TableCell>
                            </TableRow>
                        )} 
                    />
                </TabsContent>
                <TabsContent value="deposits">
                    <TransactionTable transactions={deposits} type="deposit" onViewReceipt={(tx) => setSelectedReceipt({ tx, type: 'deposit' })} />
                </TabsContent>
                <TabsContent value="withdrawals">
                    <TransactionTable transactions={withdrawals} type="withdrawal" onViewReceipt={(tx) => setSelectedReceipt({ tx, type: 'withdrawal' })} />
                </TabsContent>
                <TabsContent value="groups">
                    <GroupInvestmentTable investments={groupInvestments} />
                </TabsContent>
            </div>
        </Tabs>

        <Button onClick={handleLogout} className="w-full h-14 bg-muted border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 text-muted-foreground rounded-2xl font-black uppercase tracking-[3px] text-xs transition-all">
          <LogOut size={16} className="mr-3" /> {t.profile.logout}
        </Button>

        {/* Edit Profile Dialog */}
        <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
            <DialogContent className="rounded-[2.5rem]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">Update Node</DialogTitle>
                    <DialogDescription>Modify your public identifier.</DialogDescription>
                </DialogHeader>
                <div className="py-6 space-y-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground pl-1">Display Name</Label>
                        <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-12 rounded-xl" />
                    </div>
                </div>
                <DialogFooter><Button onClick={handleUpdateName} className="w-full h-12 rounded-xl font-bold bg-primary">Commit Changes</Button></DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Edit UPI Dialog */}
        <Dialog open={isEditUpiOpen} onOpenChange={setIsEditUpiOpen}>
            <DialogContent className="rounded-[2.5rem]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">Payment Protocol</DialogTitle>
                    <DialogDescription>Administrative validation required for updates.</DialogDescription>
                </DialogHeader>
                <div className="py-6 space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground pl-1">UPI Provider</Label>
                        <Select value={editUpiProvider} onValueChange={(v: any) => setEditUpiProvider(v)}>
                            <SelectTrigger className="h-12 rounded-xl">
                                <SelectValue placeholder="Select Method" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PhonePe">PhonePe</SelectItem>
                                <SelectItem value="Google Pay">Google Pay</SelectItem>
                                <SelectItem value="Paytm">Paytm</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground pl-1">UPI Address</Label>
                        <Input value={editUpiId} onChange={e => setEditUpiId(e.target.value)} placeholder="username@bank" className="h-12 rounded-xl font-mono" />
                    </div>
                </div>
                <DialogFooter><Button onClick={handleUpdateUpi} className="w-full h-12 rounded-xl font-bold bg-primary">Finalize Protocol</Button></DialogFooter>
            </DialogContent>
        </Dialog>

        {/* KYC Dialog */}
        <Dialog open={isKycOpen} onOpenChange={setIsKycOpen}>
            <DialogContent className="rounded-[2.5rem] max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">Identity Node</DialogTitle>
                    <DialogDescription>Verified status required for premium asset access.</DialogDescription>
                </DialogHeader>
                <div className="py-6 space-y-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground pl-1">PAN Card Number</Label>
                        <Input value={kycPan} onChange={e => setKycPan(e.target.value)} placeholder="ABCDE1234F" className="h-12 rounded-xl font-mono uppercase" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground pl-1">PAN Image</Label>
                            <div className="relative h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/20">
                                {panImage ? (
                                    <Image src={panImage} alt="PAN" fill className="object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center gap-1">
                                        <Upload size={16} className="text-muted-foreground" />
                                        <span className="text-[8px] font-black text-muted-foreground">UPLOAD</span>
                                    </div>
                                )}
                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'pan')} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground pl-1">Aadhaar Image</Label>
                            <div className="relative h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/20">
                                {aadhaarImage ? (
                                    <Image src={aadhaarImage} alt="Aadhaar" fill className="object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center gap-1">
                                        <Upload size={16} className="text-muted-foreground" />
                                        <span className="text-[8px] font-black text-muted-foreground">UPLOAD</span>
                                    </div>
                                )}
                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'aadhaar')} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground pl-1">Aadhaar Node Number</Label>
                        <Input value={kycAadhaar} onChange={e => setKycAadhaar(e.target.value)} placeholder="1234 5678 9012" className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground pl-1">Contact Node</Label>
                        <Input value={kycPhone} onChange={e => setKycPhone(e.target.value)} placeholder="9876543210" className="h-12 rounded-xl" />
                    </div>
                </div>
                <DialogFooter><Button onClick={handleSubmitKyc} className="w-full h-12 rounded-xl font-bold bg-primary">Commit Identity</Button></DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Receipt Dialog */}
        {selectedReceipt && (
          <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
            <DialogContent className="p-0 overflow-hidden rounded-[2rem] max-w-sm">
              <header className="bg-primary p-6 text-center">
                 <DialogTitle className="text-xl font-black tracking-tight uppercase text-primary-foreground">Protocol Receipt</DialogTitle>
                 <DialogDescription className="text-[10px] font-black text-primary-foreground/50 uppercase tracking-[4px]">Verified Transaction</DialogDescription>
              </header>
              <div className="p-8 space-y-6">
                 <div className="space-y-4">
                    <ReceiptRow label="Status" value={selectedReceipt.tx.status.toUpperCase()} highlight={selectedReceipt.tx.status === 'approved'} />
                    <ReceiptRow label="Protocol ID" value={selectedReceipt.tx.transactionId || selectedReceipt.tx.id.slice(-8).toUpperCase()} />
                    <ReceiptRow label="Settled On" value={new Date(selectedReceipt.tx.createdAt.seconds * 1000).toLocaleString()} />
                    
                    <Separator />
                    
                    <ReceiptRow label="Asset Value" value={`₹${selectedReceipt.tx.amount.toFixed(2)}`} />
                    
                    {selectedReceipt.type === 'withdrawal' && (
                      <>
                        <ReceiptRow label="GST Protocol" value={`- ₹${(selectedReceipt.tx.gstAmount || 0).toFixed(2)}`} isNegative />
                        {selectedReceipt.tx.totalDelayBonus ? (
                          <ReceiptRow label="Delay Bonus" value={`+ ₹${selectedReceipt.tx.totalDelayBonus.toFixed(2)}`} isPositive />
                        ) : null}
                      </>
                    )}
                 </div>

                 <div className="bg-muted rounded-3xl p-5 border border-border flex flex-col items-center gap-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase">Net Settlement</p>
                    <p className="text-3xl font-black tracking-tighter">
                      ₹{(selectedReceipt.tx.finalAmount ?? selectedReceipt.tx.amount).toFixed(2)}
                    </p>
                 </div>
              </div>
              <DialogFooter className="p-6 pt-0">
                 <DialogClose asChild><Button className="w-full h-12 rounded-xl font-bold">Close Archive</Button></DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </main>

      <nav className="sticky bottom-0 z-30 border-t border-border/20 bg-background/95 backdrop-blur-sm h-16 flex items-center justify-around px-4">
          <BottomNavItem icon={Home} label={t.nav.home} href="/dashboard" />
          <BottomNavItem icon={Briefcase} label={t.nav.plans} href="/plans" />
          <BottomNavItem icon={Trophy} label={t.nav.leaders} href="/leaderboard" />
          <BottomNavItem icon={HandCoins} label={t.nav.loans} href="/my-loans" />
          <BottomNavItem icon={User} label={t.nav.profile} active />
      </nav>
    </div>
  );
}

function HistoryTable({ headers, items, renderRow }: { headers: string[], items: any[] | null | undefined, renderRow: (item: any) => React.ReactNode }) {
  return (
    <Card className="bg-card border-border rounded-3xl overflow-hidden shadow-lg">
        <ScrollArea className="h-80">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow className="border-border">
                        {headers.map(h => <TableHead key={h} className="text-[10px] font-black text-muted-foreground uppercase tracking-[3px] py-4">{h}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items && items.length > 0 ? items.map(renderRow) : <TableRow><TableCell colSpan={headers.length} className="text-center py-20 opacity-20 italic">No nodes active.</TableCell></TableRow>}</TableBody>
            </Table>
        </ScrollArea>
    </Card>
  )
}

function TransactionTable({ transactions, type, onViewReceipt }: { transactions: Transaction[] | undefined | null, type: 'deposit' | 'withdrawal', onViewReceipt: (tx: Transaction) => void }) {
    return (
        <Card className="bg-card border-border rounded-3xl overflow-hidden shadow-lg">
            <ScrollArea className="h-80">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="border-border">
                            <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-[3px] pl-6 py-4">Value</TableHead>
                            <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-[3px] text-center">Status</TableHead>
                            <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-[3px] text-right pr-6">Ref</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions && transactions.length > 0 ? transactions.map(tx => (
                            <TableRow key={tx.id} className="border-border hover:bg-muted/30">
                                <TableCell className="pl-6 py-4">
                                    <p className="font-bold">₹{(tx.finalAmount ?? tx.amount).toFixed(2)}</p>
                                    <p className="text-[9px] text-muted-foreground uppercase">{new Date(tx.createdAt.seconds * 1000).toLocaleDateString()}</p>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline" className={cn(
                                      "text-[8px] uppercase font-black px-2 h-5",
                                      tx.status === 'approved' ? "border-accent/20 text-accent bg-accent/10" :
                                      tx.status === 'rejected' ? "border-destructive/20 text-destructive bg-destructive/10" :
                                      "border-border text-muted-foreground"
                                    )}>
                                      {tx.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <Button variant="ghost" size="icon" onClick={() => onViewReceipt(tx)} className="h-9 w-9 rounded-xl hover:bg-primary/20 text-primary">
                                        <Eye size={16} />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )) : <TableRow><TableCell colSpan={3} className="text-center py-20 opacity-20 italic">No {type} node found.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </ScrollArea>
        </Card>
    );
}

function GroupInvestmentTable({ investments }: { investments: GroupInvestment[] | undefined | null }) {
    return (
        <Card className="bg-card border-border rounded-3xl overflow-hidden shadow-lg">
            <ScrollArea className="h-80">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="border-border">
                          <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-[3px] pl-6 py-4">Consortium Plan</TableHead>
                          <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-[3px] text-right pr-6">Credits</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {investments && investments.length > 0 ? investments.map(inv => (
                            <TableRow key={inv.id} className="border-border hover:bg-muted/30">
                                <TableCell className="pl-6 py-4 font-bold">{inv.planName}</TableCell>
                                <TableCell className="text-right pr-6 text-accent font-bold">₹{inv.amountReceived.toFixed(2)}</TableCell>
                            </TableRow>
                        )) : <TableRow><TableCell colSpan={2} className="text-center py-20 opacity-20 italic">No pool node active.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </ScrollArea>
        </Card>
    );
}

function AmountVerificationCard({ request }: { request: UpiRequest }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  
  const handleVerify = async () => {
    if (parseFloat(amount) === request.confirmationAmount) {
      await updateDoc(doc(firestore, 'users', user!.uid), { upiStatus: 'Verified', upiId: request.upiId });
      await updateDoc(doc(firestore, 'upiRequests', request.id), { status: 'approved' });
      toast({ title: 'Payment Node Verified!' });
    } else {
        toast({ title: 'Mismatch', description: "Checksum error.", variant: 'destructive' });
    }
  };

  return (
    <Card className="border-primary/40 bg-primary/5 p-6 rounded-[2rem]">
        <CardTitle className="text-primary text-[10px] font-black uppercase tracking-[4px] mb-4">Protocol Challenge</CardTitle>
        <p className="text-xs text-muted-foreground mb-6">Enter micro-transaction sum received to finalize node.</p>
        <div className="flex gap-2">
            <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-14 rounded-2xl text-xl font-black" />
            <Button className="h-14 bg-primary px-8 rounded-2xl font-black text-primary-foreground" onClick={handleVerify}>Verify</Button>
        </div>
    </Card>
  );
}

function ReceiptRow({ label, value, highlight = false, isNegative = false, isPositive = false }: { label: string, value: string, highlight?: boolean, isNegative?: boolean, isPositive?: boolean }) {
    return (
        <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground font-bold uppercase">{label}</span>
            <span className={cn(
                "font-black",
                highlight ? "text-primary" : "text-foreground",
                isNegative && "text-destructive",
                isPositive && "text-accent"
            )}>
                {value}
            </span>
        </div>
    );
}

function BottomNavItem({ icon: Icon, label, href, active = false }: { icon: React.ElementType, label: string, href?: string, active?: boolean }) {
  return (
    <Link href={href || '#'} className={cn(
        "flex flex-col items-center gap-1 transition-all h-full justify-center relative",
        active ? 'text-primary scale-110' : 'text-muted-foreground hover:text-foreground'
    )}>
        <Icon className={cn("h-5 w-5", active && "drop-shadow-lg")} />
        <span className="text-[9px] font-black uppercase tracking-tight">{label}</span>
        {active && <div className="absolute -bottom-1 h-1 w-6 bg-primary rounded-full blur-[2px]" />}
    </Link>
  );
}
