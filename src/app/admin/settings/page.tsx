
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

type AdminSettings = {
  adminUpi?: string;
  minWithdrawal?: number;
  referralBonus?: number;
  withdrawalGstPercentage?: number;
};

export default function SettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { data: settings, loading } = useDoc<AdminSettings>('settings/admin');

  const [adminUpi, setAdminUpi] = useState('');
  const [minWithdrawal, setMinWithdrawal] = useState(0);
  const [referralBonus, setReferralBonus] = useState(0);
  const [withdrawalGstPercentage, setWithdrawalGstPercentage] = useState(0);


  useEffect(() => {
    if (settings) {
      setAdminUpi(settings.adminUpi || '');
      setMinWithdrawal(settings.minWithdrawal || 0);
      setReferralBonus(settings.referralBonus || 0);
      setWithdrawalGstPercentage(settings.withdrawalGstPercentage || 0);
    }
  },[settings]);

  const handleSave = async () => {
    const settingsRef = doc(firestore, 'settings', 'admin');
    try {
      await setDoc(settingsRef, { 
        adminUpi, 
        minWithdrawal: Number(minWithdrawal),
        referralBonus: Number(referralBonus),
        withdrawalGstPercentage: Number(withdrawalGstPercentage),
      }, { merge: true });
      toast({ title: 'Settings Saved', description: 'Your settings have been updated.' });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' });
    }
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
