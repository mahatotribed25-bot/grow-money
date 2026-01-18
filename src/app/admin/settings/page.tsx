
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDoc, useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type AdminSettings = {
  adminUpi?: string;
  minWithdrawal?: number;
  referralBonus?: number;
  withdrawalGstPercentage?: number;
  loanPenalty?: number;
  kycGoogleFormUrl?: string;
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


  useEffect(() => {
    if (settings) {
      setAdminUpi(settings.adminUpi || '');
      setMinWithdrawal(settings.minWithdrawal || 0);
      setReferralBonus(settings.referralBonus || 0);
      setWithdrawalGstPercentage(settings.withdrawalGstPercentage || 0);
      setLoanPenalty(settings.loanPenalty || 0);
      setKycGoogleFormUrl(settings.kycGoogleFormUrl || '');
    }
  },[settings]);

  const handleSave = () => {
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
        toast({ title: 'Settings Saved', description: 'Your settings have been updated.' });
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

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Admin Settings</h2>
      <Card>
        <CardContent className="pt-6 space-y-6">
           {loading ? <p>Loading settings...</p> : (
            <>
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

                <Button onClick={handleSave} className="mt-4">
                  Save All Settings
                </Button>
            </>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
