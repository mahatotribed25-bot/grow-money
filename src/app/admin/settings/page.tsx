
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
  upiId?: string;
  upiQrCodeUrl?: string;
  signupBonus?: number;
  referralBonus?: number;
};

export default function SettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { data: settings, loading } = useDoc<AdminSettings>('settings/admin');

  const [upiId, setUpiId] = useState('');
  const [upiQrCodeUrl, setUpiQrCodeUrl] = useState('');
  const [signupBonus, setSignupBonus] = useState(0);
  const [referralBonus, setReferralBonus] = useState(0);


  useEffect(() => {
    if (settings) {
      setUpiId(settings.upiId || '');
      setUpiQrCodeUrl(settings.upiQrCodeUrl || '');
      setSignupBonus(settings.signupBonus || 0);
      setReferralBonus(settings.referralBonus || 0);
    }
  },[settings]);

  const handleSave = async () => {
    const settingsRef = doc(firestore, 'settings', 'admin');
    try {
      await setDoc(settingsRef, { 
        upiId, 
        upiQrCodeUrl,
        signupBonus: Number(signupBonus),
        referralBonus: Number(referralBonus),
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
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>
            This UPI ID and QR code will be shown to users when they recharge their wallets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           {loading ? <p>Loading settings...</p> : (
            <>
                <div className="space-y-2">
                    <Label htmlFor="upi-id">UPI ID</Label>
                    <Input
                    id="upi-id"
                    placeholder="your-upi@bank"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="qr-code-url">UPI QR Code Image URL</Label>
                    <Input
                    id="qr-code-url"
                    type="url"
                    placeholder="https://example.com/qr.png"
                    value={upiQrCodeUrl}
                    onChange={(e) => setUpiQrCodeUrl(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                        Please provide a direct link (URL) to the QR code image, not the UPI payment link.
                    </p>
                </div>
                <Separator className="my-6" />
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Referral Settings</h3>
                     <div className="space-y-2">
                        <Label htmlFor="signup-bonus">Signup Bonus</Label>
                        <Input
                        id="signup-bonus"
                        type="number"
                        placeholder="Amount for new user"
                        value={signupBonus}
                        onChange={(e) => setSignupBonus(Number(e.target.value))}
                        />
                         <p className="text-sm text-muted-foreground">
                            Bonus amount a new user receives when they sign up with a referral code.
                        </p>
                    </div>
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
                            Bonus amount the referring user receives.
                        </p>
                    </div>
                </div>

                <Button onClick={handleSave} className="mt-4">Save Settings</Button>
            </>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
