
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDoc, useFirestore, useAuth, useUser } from '@/firebase';
import { doc, setDoc, serverTimestamp, deleteField, type Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Switch } from '@/components/ui/switch';
import { Timer, Mail, KeyRound, RefreshCcw, HandCoins, UserPlus, Gem } from 'lucide-react';
import { sendPasswordResetEmail, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';


type AdminSettings = {
  adminUpi?: string;
  minWithdrawal?: number;
  referralBonus?: number;
  withdrawalGstPercentage?: number;
  loanPenalty?: number;
  customLoanPenalty?: number;
  customLoanInterestPer1000?: number;
  kycGoogleFormUrl?: string;
  maxCustomLoanAmount?: number;
  totalCustomLoanLimit?: number;
  currentCustomLoanUsage?: number;
  isUnderMaintenance?: boolean;
  maintenanceEndTime?: Timestamp;
  profitCalculationStartDate?: Timestamp;
  delayCompensationEnabled?: boolean;
  delayBonusPerDay?: number;
  maxBonusDays?: number;
  dailyCheckInBonus?: number;
  vipTiers?: {
    silver: number;
    gold: number;
    platinum: number;
  };
  vipWithdrawalGst?: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
  }
};

export default function SettingsPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user: adminUser } = useUser();
  const { toast } = useToast();
  const { data: settings, loading } = useDoc<AdminSettings>('settings/admin');

  // General settings state
  const [adminUpi, setAdminUpi] = useState('');
  const [minWithdrawal, setMinWithdrawal] = useState(0);
  const [referralBonus, setReferralBonus] = useState(0);
  const [withdrawalGstPercentage, setWithdrawalGstPercentage] = useState(0);
  const [loanPenalty, setLoanPenalty] = useState(0);
  const [customLoanPenalty, setCustomLoanPenalty] = useState(0);
  const [customLoanInterest, setCustomLoanInterest] = useState(5);
  const [kycGoogleFormUrl, setKycGoogleFormUrl] = useState('');
  const [maxCustomLoanAmount, setMaxCustomLoanAmount] = useState(0);
  const [totalCustomLoanLimit, setTotalCustomLoanLimit] = useState(0);
  const [isUnderMaintenance, setIsUnderMaintenance] = useState(false);
  const [maintenanceDuration, setMaintenanceDuration] = useState(5);
  const [profitStartDate, setProfitStartDate] = useState<Date | null>(null);

  // Delay Bonus State
  const [delayCompensationEnabled, setDelayCompensationEnabled] = useState(false);
  const [delayBonusPerDay, setDelayBonusPerDay] = useState(0);
  const [maxBonusDays, setMaxBonusDays] = useState(0);

  // Engagement State
  const [dailyCheckInBonus, setDailyCheckInBonus] = useState(0);

  // VIP State
  const [vipTiers, setVipTiers] = useState({ silver: 0, gold: 0, platinum: 0 });
  const [vipGst, setVipGst] = useState({ bronze: 0, silver: 0, gold: 0, platinum: 0 });

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);


  useEffect(() => {
    if (settings) {
      setAdminUpi(settings.adminUpi || '');
      setMinWithdrawal(settings.minWithdrawal || 0);
      setReferralBonus(settings.referralBonus || 0);
      setWithdrawalGstPercentage(settings.withdrawalGstPercentage || 0);
      setLoanPenalty(settings.loanPenalty || 0);
      setCustomLoanPenalty(settings.customLoanPenalty || 0);
      setCustomLoanInterest(settings.customLoanInterestPer1000 || 5);
      setKycGoogleFormUrl(settings.kycGoogleFormUrl || '');
      setMaxCustomLoanAmount(settings.maxCustomLoanAmount || 5000);
      setTotalCustomLoanLimit(settings.totalCustomLoanLimit || 0);
      setProfitStartDate(settings.profitCalculationStartDate?.toDate() || null);
      
      setDelayCompensationEnabled(settings.delayCompensationEnabled || false);
      setDelayBonusPerDay(settings.delayBonusPerDay || 0);
      setMaxBonusDays(settings.maxBonusDays || 0);

      setDailyCheckInBonus(settings.dailyCheckInBonus || 0);
      setVipTiers(settings.vipTiers || { silver: 0, gold: 0, platinum: 0 });
      setVipGst(settings.vipWithdrawalGst || { bronze: 0, silver: 0, gold: 0, platinum: 0 });

      const isCurrentlyUnderMaintenance = settings.maintenanceEndTime
        ? settings.maintenanceEndTime.toDate() > new Date()
        : settings.isUnderMaintenance || false;

      setIsUnderMaintenance(isCurrentlyUnderMaintenance);
    }
  },[settings]);

  const handleSaveGeneral = () => {
    const settingsRef = doc(firestore, 'settings', 'admin');
    const settingsData = { 
      adminUpi, 
      minWithdrawal: Number(minWithdrawal),
      referralBonus: Number(referralBonus),
      withdrawalGstPercentage: Number(withdrawalGstPercentage),
      loanPenalty: Number(loanPenalty),
      customLoanPenalty: Number(customLoanPenalty),
      customLoanInterestPer1000: Number(customLoanInterest),
      kycGoogleFormUrl: kycGoogleFormUrl,
      maxCustomLoanAmount: Number(maxCustomLoanAmount),
      totalCustomLoanLimit: Number(totalCustomLoanLimit),
      delayCompensationEnabled,
      delayBonusPerDay: Number(delayBonusPerDay),
      maxBonusDays: Number(maxBonusDays),
      dailyCheckInBonus: Number(dailyCheckInBonus),
      vipTiers,
      vipWithdrawalGst: vipGst,
    };

    setDoc(settingsRef, settingsData, { merge: true })
      .then(() => {
        toast({ title: 'Settings Saved', description: 'Your general settings have been updated.' });
      })
      .catch((error) => {
        console.error('Error saving settings:', error);
        const permissionError = new FirestorePermissionError({
            path: settingsRef.path,
            operation: 'write',
            requestResourceData: settingsData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };
  
  const handleStartMaintenance = () => {
      const endTime = new Date(Date.now() + maintenanceDuration * 60 * 1000);
      const settingsRef = doc(firestore, 'settings', 'admin');
      const settingsData = {
          isUnderMaintenance: true,
          maintenanceEndTime: endTime,
      };

      setDoc(settingsRef, settingsData, { merge: true })
        .then(() => {
            toast({
                title: 'Maintenance Mode Started',
                description: `App will be in maintenance for ${maintenanceDuration} minutes.`
            });
        })
        .catch((error) => {
             console.error('Error starting maintenance:', error);
             const permissionError = new FirestorePermissionError({
                path: settingsRef.path,
                operation: 'write',
                requestResourceData: settingsData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
  };

  const handleStopMaintenance = () => {
       const settingsRef = doc(firestore, 'settings', 'admin');
        const settingsData = {
            isUnderMaintenance: false,
            maintenanceEndTime: deleteField()
        };
         setDoc(settingsRef, settingsData, { merge: true })
        .then(() => {
            toast({
                title: 'Maintenance Mode Stopped',
                description: `The application is now live.`
            });
        })
        .catch((error) => {
             console.error('Error stopping maintenance:', error);
             const permissionError = new FirestorePermissionError({
                path: settingsRef.path,
                operation: 'write',
                requestResourceData: settingsData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
  };
  
  const handleToggleIndefiniteMaintenance = (checked: boolean) => {
    const settingsRef = doc(firestore, 'settings', 'admin');
    const settingsData = {
        isUnderMaintenance: checked,
        maintenanceEndTime: deleteField()
    };
    setDoc(settingsRef, settingsData, { merge: true })
      .then(() => {
        toast({ title: 'Maintenance Mode Updated' });
      })
      .catch((error) => {
        console.error('Error saving settings:', error);
        const permissionError = new FirestorePermissionError({
            path: settingsRef.path,
            operation: 'write',
            requestResourceData: settingsData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  }

  const handleChangePassword = async () => {
    if (!adminUser || !adminUser.email) {
      toast({ title: 'Error', description: 'Admin user not found.', variant: 'destructive'});
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive'});
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Password too weak', description: 'New password must be at least 6 characters long.', variant: 'destructive'});
      return;
    }

    setIsChangingPassword(true);

    try {
      if (!oldPassword) {
        throw new Error('Old password is required.');
      }
      const credential = EmailAuthProvider.credential(adminUser.email, oldPassword);
      await reauthenticateWithCredential(adminUser, credential);
      
      await updatePassword(adminUser, newPassword);

      toast({
        title: 'Password Changed Successfully',
        description: 'Your admin password has been updated.',
      });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

    } catch (error: any) {
      let errorMessage = 'An unexpected error occurred.';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'The old password you entered is incorrect.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later.';
      } else if (error.message === 'Old password is required.') {
        errorMessage = error.message;
      }
      toast({
        title: 'Password Change Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleResetProfit = () => {
    const settingsRef = doc(firestore, 'settings', 'admin');
    const settingsData = {
        profitCalculationStartDate: serverTimestamp(),
    };
    setDoc(settingsRef, settingsData, { merge: true })
      .then(() => {
        toast({ title: 'Profit Calculation Reset', description: 'Profit will now be calculated from this moment onwards.' });
      })
      .catch((error) => {
         console.error('Error resetiing profit calculation:', error);
         const permissionError = new FirestorePermissionError({
            path: settingsRef.path,
            operation: 'write',
            requestResourceData: settingsData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };


  const maintenanceEndsAt = settings?.maintenanceEndTime ? settings.maintenanceEndTime.toDate().toLocaleString() : null;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Admin Settings</h2>
      <Card>
        <CardContent className="pt-6 space-y-6">
           {loading ? <p>Loading settings...</p> : (
            <>
                <div className="space-y-4 rounded-lg border border-amber-500/50 p-4">
                    <CardTitle className="flex items-center gap-2"><Timer className="text-amber-400"/>Maintenance Mode</CardTitle>
                    <CardDescription>
                       Use these controls to put the application into maintenance mode for users.
                    </CardDescription>

                    {isUnderMaintenance && maintenanceEndsAt && (
                      <div className="text-amber-400">Maintenance is active and will end at: {maintenanceEndsAt}</div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="maintenance-mode"
                            checked={isUnderMaintenance && !maintenanceEndsAt}
                            onCheckedChange={handleToggleIndefiniteMaintenance}
                        />
                        <Label htmlFor="maintenance-mode">
                           Enable Indefinite Maintenance
                        </Label>
                    </div>

                    <Separator className="bg-border/50"/>
                    
                    <div className="space-y-2">
                      <Label htmlFor="maintenance-duration">Timed Maintenance Duration (minutes)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="maintenance-duration"
                          type="number"
                          value={maintenanceDuration}
                          onChange={(e) => setMaintenanceDuration(Number(e.target.value))}
                          placeholder="e.g., 5"
                        />
                         <Button onClick={handleStartMaintenance} disabled={maintenanceDuration <= 0}>Start Timed Maintenance</Button>
                      </div>
                    </div>
                     <Button onClick={handleStopMaintenance} variant="destructive">Stop All Maintenance</Button>
                </div>
                <Separator />
                <div>
                    <CardTitle>Admin Account</CardTitle>
                    <CardDescription>
                        Manage your administrator account settings.
                    </CardDescription>
                    <div className="space-y-4 mt-4">
                       <div className="rounded-lg border p-4 space-y-4">
                           <h4 className="font-medium">Change Password</h4>
                           <div className="space-y-2">
                               <Label htmlFor="old-password">Old Password</Label>
                               <Input id="old-password" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="Enter your current password"/>
                           </div>
                           <div className="space-y-2">
                               <Label htmlFor="new-password">New Password</Label>
                               <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter a new password" />
                           </div>
                           <div className="space-y-2">
                               <Label htmlFor="confirm-password">Confirm New Password</Label>
                               <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your new password" />
                           </div>
                           <Button onClick={handleChangePassword} disabled={isChangingPassword}>
                               {isChangingPassword ? 'Changing...' : 'Change Password'}
                           </Button>
                       </div>
                    </div>
                </div>
                <Separator />
                <div>
                    <CardTitle>Profit Settings</CardTitle>
                    <CardDescription>
                        Manage how profit is calculated and displayed on the dashboard.
                    </CardDescription>
                    <div className="space-y-4 mt-4 rounded-lg border border-red-500/50 p-4">
                        <h4 className="font-medium text-red-400">Reset Profit Calculation</h4>
                        <p className="text-sm text-muted-foreground">
                            This will reset the start date for all profit calculations on your dashboard to the current time. This action is irreversible. Past profit data will not be shown.
                        </p>
                        {profitStartDate && (
                            <p className="text-sm">
                                Currently calculating profit from: <span className="font-semibold">{profitStartDate.toLocaleString()}</span>
                            </p>
                        )}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">
                                    <RefreshCcw className="mr-2 h-4 w-4" />
                                    Reset Profit Calculation to Now
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will reset the profit calculation start date. Your dashboard profit stats (Today, Month, All-Time) will restart from zero, based on new investments from this point forward. This does not delete any user data but changes how profit is displayed.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleResetProfit} className="bg-destructive hover:bg-destructive/90">
                                    Yes, reset calculation
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
                 <Separator />
                <div>
                    <CardTitle className="flex items-center gap-2"><HandCoins /> Delay Compensation Settings</CardTitle>
                     <CardDescription>
                        Reward users for withdrawal delays to build trust.
                    </CardDescription>
                    <div className="space-y-4 mt-4">
                        <div className="flex items-center space-x-2">
                           <Switch
                                id="delay-compensation-enabled"
                                checked={delayCompensationEnabled}
                                onCheckedChange={setDelayCompensationEnabled}
                            />
                            <Label htmlFor="delay-compensation-enabled">Enable Delay Bonus</Label>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="delay-bonus-per-day">Bonus Amount Per Day (₹)</Label>
                            <Input
                                id="delay-bonus-per-day"
                                type="number"
                                placeholder="e.g., 20"
                                value={delayBonusPerDay}
                                onChange={(e) => setDelayBonusPerDay(Number(e.target.value))}
                                disabled={!delayCompensationEnabled}
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="max-bonus-days">Maximum Bonus Days</Label>
                            <Input
                                id="max-bonus-days"
                                type="number"
                                placeholder="e.g., 10"
                                value={maxBonusDays}
                                onChange={(e) => setMaxBonusDays(Number(e.target.value))}
                                disabled={!delayCompensationEnabled}
                            />
                        </div>
                    </div>
                </div>
                <Separator />
                 <div>
                    <CardTitle className="flex items-center gap-2"><Gem /> VIP Level Settings</CardTitle>
                     <CardDescription>
                        Set the total investment amount required to reach each VIP level.
                    </CardDescription>
                    <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="vip-silver">Silver Level Threshold</Label>
                            <Input id="vip-silver" type="number" placeholder="e.g., 10000" value={vipTiers.silver} onChange={(e) => setVipTiers({...vipTiers, silver: Number(e.target.value)})} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="vip-gold">Gold Level Threshold</Label>
                            <Input id="vip-gold" type="number" placeholder="e.g., 50000" value={vipTiers.gold} onChange={(e) => setVipTiers({...vipTiers, gold: Number(e.target.value)})} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="vip-platinum">Platinum Level Threshold</Label>
                            <Input id="vip-platinum" type="number" placeholder="e.g., 100000" value={vipTiers.platinum} onChange={(e) => setVipTiers({...vipTiers, platinum: Number(e.target.value)})} />
                        </div>
                    </div>
                </div>
                 <Separator />
                 <div>
                    <CardTitle className="flex items-center gap-2"><Gem /> VIP Benefits Settings</CardTitle>
                     <CardDescription>
                        Set the withdrawal GST percentage for each VIP level.
                    </CardDescription>
                    <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="gst-bronze">Bronze GST (%)</Label>
                            <Input id="gst-bronze" type="number" placeholder="e.g., 5" value={vipGst.bronze} onChange={(e) => setVipGst({...vipGst, bronze: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gst-silver">Silver GST (%)</Label>
                            <Input id="gst-silver" type="number" placeholder="e.g., 4" value={vipGst.silver} onChange={(e) => setVipGst({...vipGst, silver: Number(e.target.value)})} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="gst-gold">Gold GST (%)</Label>
                            <Input id="gst-gold" type="number" placeholder="e.g., 3" value={vipGst.gold} onChange={(e) => setVipGst({...vipGst, gold: Number(e.target.value)})} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="gst-platinum">Platinum GST (%)</Label>
                            <Input id="gst-platinum" type="number" placeholder="e.g., 2" value={vipGst.platinum} onChange={(e) => setVipGst({...vipGst, platinum: Number(e.target.value)})} />
                        </div>
                    </div>
                </div>
                <Separator />
                <div>
                    <CardTitle className="flex items-center gap-2"><UserPlus /> User Engagement</CardTitle>
                    <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="daily-check-in">Daily Check-in Bonus</Label>
                            <Input id="daily-check-in" type="number" placeholder="e.g., 5" value={dailyCheckInBonus} onChange={(e) => setDailyCheckInBonus(Number(e.target.value))} />
                             <p className="text-sm text-muted-foreground">
                                Amount to be credited to user's wallet for daily check-in.
                            </p>
                        </div>
                    </div>
                </div>
                <Separator />
                <div>
                    <CardTitle>Payment Settings</CardTitle>
                    <CardDescription>
                        Configure how users make deposits and withdrawals.
                    </CardDescription>
                    <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="admin-upi">Admin UPI ID</Label>
                            <Input
                            id="admin-upi"
                            placeholder="your-upi@bank"
                            value={adminUpi}
                            onChange={(e) => setAdminUpi(e.target.value)}
                            />
                            <p className="text-sm text-muted-foreground">
                                This is the UPI ID users will send money to for deposits.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="min-withdrawal">Minimum Withdrawal Amount</Label>
                            <Input
                            id="min-withdrawal"
                            type="number"
                            placeholder="100"
                            value={minWithdrawal}
                            onChange={(e) => setMinWithdrawal(Number(e.target.value))}
                            />
                             <p className="text-sm text-muted-foreground">
                                The minimum amount a user can request to withdraw.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="withdrawal-gst">Default Withdrawal GST (%)</Label>
                            <Input
                            id="withdrawal-gst"
                            type="number"
                            placeholder="5"
                            value={withdrawalGstPercentage}
                            onChange={(e) => setWithdrawalGstPercentage(Number(e.target.value))}
                            />
                             <p className="text-sm text-muted-foreground">
                                Default tax to deduct if a user is not in a special VIP tier.
                            </p>
                        </div>
                    </div>
                </div>
                <Separator />
                 <div>
                    <CardTitle>Loan Settings</CardTitle>
                     <div className="space-y-4 mt-4">
                         <div className="space-y-2">
                            <Label htmlFor="custom-loan-interest">Daily Custom Loan Interest (per ₹1000)</Label>
                            <Input
                                id="custom-loan-interest"
                                type="number"
                                placeholder="e.g., 5"
                                value={customLoanInterest}
                                onChange={(e) => setCustomLoanInterest(Number(e.target.value))}
                            />
                            <p className="text-sm text-muted-foreground">
                                The amount of interest charged per day for every ₹1000 of the loan amount.
                            </p>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="loan-penalty">Daily Plan Loan Overdue Penalty</Label>
                            <Input
                            id="loan-penalty"
                            type="number"
                            placeholder="e.g., 100"
                            value={loanPenalty}
                            onChange={(e) => setLoanPenalty(Number(e.target.value))}
                            />
                             <p className="text-sm text-muted-foreground">
                                Penalty for plan-based loans. Applied daily after the grace period.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="custom-loan-penalty">Daily Custom Loan Overdue Penalty</Label>
                            <Input
                            id="custom-loan-penalty"
                            type="number"
                            placeholder="e.g., 50"
                            value={customLoanPenalty}
                            onChange={(e) => setCustomLoanPenalty(Number(e.target.value))}
                            />
                             <p className="text-sm text-muted-foreground">
                                Penalty for custom loans. Applied daily after the grace period.
                            </p>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="max-custom-loan">Max Custom Loan Amount (Per User)</Label>
                            <Input
                            id="max-custom-loan"
                            type="number"
                            placeholder="e.g., 5000"
                            value={maxCustomLoanAmount}
                            onChange={(e) => setMaxCustomLoanAmount(Number(e.target.value))}
                            />
                             <p className="text-sm text-muted-foreground">
                                The maximum amount a user can request for a single custom loan.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="total-custom-loan-limit">Total Custom Loan Limit (Platform-Wide)</Label>
                            <Input
                                id="total-custom-loan-limit"
                                type="number"
                                placeholder="e.g., 100000"
                                value={totalCustomLoanLimit}
                                onChange={(e) => setTotalCustomLoanLimit(Number(e.target.value))}
                            />
                            <p className="text-sm text-muted-foreground">
                                The total amount of active custom loans the platform will give out at any one time.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Current Loan Usage</Label>
                            <Input
                                type="number"
                                value={settings?.currentCustomLoanUsage || 0}
                                readOnly
                                className="bg-muted"
                            />
                            <p className="text-sm text-muted-foreground">
                                The current amount of active custom loans given out. This is updated automatically.
                            </p>
                        </div>
                    </div>
                </div>
                 <Separator />
                 <div>
                    <CardTitle>KYC Settings</CardTitle>
                     <div className="space-y-4 mt-4">
                         <div className="space-y-2">
                            <Label htmlFor="kyc-google-form-url">KYC Google Form URL</Label>
                            <Input
                            id="kyc-google-form-url"
                            type="url"
                            placeholder="https://docs.google.com/forms/..."
                            value={kycGoogleFormUrl}
                            onChange={(e) => setKycGoogleFormUrl(e.target.value)}
                            />
                             <p className="text-sm text-muted-foreground">
                                Link to the Google Form for users to submit their KYC documents.
                            </p>
                        </div>
                    </div>
                </div>
                <Separator />
                <div>
                    <CardTitle>Referral Settings</CardTitle>
                     <div className="space-y-4 mt-4">
                         <div className="space-y-2">
                            <Label htmlFor="referral-bonus">Referral Bonus</Label>
                            <Input
                            id="referral-bonus"
                            type="number"
                            placeholder="Amount for referrer"
                            value={referralBonus}
                            onChange={(e) => setReferralBonus(Number(e.target.value))}
                            />
                             <p className="text-sm text-muted-foreground">
                                Bonus amount the referring user receives when their referral makes their first investment.
                            </p>
                        </div>
                    </div>
                </div>

                <Button onClick={handleSaveGeneral} className="mt-4">
                  Save All Settings
                </Button>
            </>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
