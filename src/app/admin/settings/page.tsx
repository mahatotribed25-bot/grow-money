
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDoc, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp, deleteField, type Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Switch } from '@/components/ui/switch';
import { Timer } from 'lucide-react';

type AdminSettings = {
  adminUpi?: string;
  minWithdrawal?: number;
  referralBonus?: number;
  withdrawalGstPercentage?: number;
  loanPenalty?: number;
  kycGoogleFormUrl?: string;
  isUnderMaintenance?: boolean;
  maintenanceEndTime?: Timestamp;
};

export default function SettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { data: settings, loading } = useDoc<AdminSettings>('settings/admin');

  const [adminUpi, setAdminUpi] = useState('');
  const [minWithdrawal, setMinWithdrawal] = useState(0);
  const [referralBonus, setReferralBonus] = useState(0);
  const [withdrawalGstPercentage, setWithdrawalGstPercentage] = useState(0);
  const [loanPenalty, setLoanPenalty] = useState(0);
  const [kycGoogleFormUrl, setKycGoogleFormUrl] = useState('');
  const [isUnderMaintenance, setIsUnderMaintenance] = useState(false);
  const [maintenanceDuration, setMaintenanceDuration] = useState(5);

  useEffect(() => {
    if (settings) {
      setAdminUpi(settings.adminUpi || '');
      setMinWithdrawal(settings.minWithdrawal || 0);
      setReferralBonus(settings.referralBonus || 0);
      setWithdrawalGstPercentage(settings.withdrawalGstPercentage || 0);
      setLoanPenalty(settings.loanPenalty || 0);
      setKycGoogleFormUrl(settings.kycGoogleFormUrl || '');
      
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
      kycGoogleFormUrl: kycGoogleFormUrl,
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
                            <Label htmlFor="withdrawal-gst">Withdrawal GST (%)</Label>
                            <Input
                            id="withdrawal-gst"
                            type="number"
                            placeholder="5"
                            value={withdrawalGstPercentage}
                            onChange={(e) => setWithdrawalGstPercentage(Number(e.target.value))}
                            />
                             <p className="text-sm text-muted-foreground">
                                The percentage of tax to deduct from withdrawal requests.
                            </p>
                        </div>
                    </div>
                </div>
                <Separator />
                 <div>
                    <CardTitle>Loan Settings</CardTitle>
                     <div className="space-y-4 mt-4">
                         <div className="space-y-2">
                            <Label htmlFor="loan-penalty">Loan Overdue Penalty</Label>
                            <Input
                            id="loan-penalty"
                            type="number"
                            placeholder="e.g., 100"
                            value={loanPenalty}
                            onChange={(e) => setLoanPenalty(Number(e.target.value))}
                            />
                             <p className="text-sm text-muted-foreground">
                                The flat penalty amount to apply when a loan becomes overdue.
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
                  Save All General Settings
                </Button>
            </>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
