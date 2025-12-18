
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDoc, useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

type AdminSettings = {
  upiId?: string;
  upiQrCodeUrl?: string;
};

export default function SettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { data: settings, loading } = useDoc<AdminSettings>('settings/admin');

  const [upiId, setUpiId] = useState('');
  const [upiQrCodeUrl, setUpiQrCodeUrl] = useState('');

  useState(() => {
    if (settings) {
      setUpiId(settings.upiId || '');
      setUpiQrCodeUrl(settings.upiQrCodeUrl || '');
    }
  });
  
  // A simple effect to update local state when Firestore data loads
  useState(() => {
    if (settings) {
      setUpiId(settings.upiId || '');
      setUpiQrCodeUrl(settings.upiQrCodeUrl || '');
    }
  });


  const handleSave = async () => {
    const settingsRef = doc(firestore, 'settings', 'admin');
    try {
      await setDoc(settingsRef, { upiId, upiQrCodeUrl }, { merge: true });
      toast({ title: 'Settings Saved', description: 'Your UPI details have been updated.' });
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
                    placeholder="https://example.com/qr.png"
                    value={upiQrCodeUrl}
                    onChange={(e) => setUpiQrCodeUrl(e.target.value)}
                    />
                </div>
                <Button onClick={handleSave}>Save Settings</Button>
            </>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
