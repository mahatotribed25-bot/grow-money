
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
import { Textarea } from '@/components/ui/textarea';
import { Megaphone, Save } from 'lucide-react';

type AdminSettings = {
  referralBonus?: number;
  broadcastMessage?: string;
};

export default function SettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { data: settings, loading } = useDoc<AdminSettings>('settings/admin');

  const [referralBonus, setReferralBonus] = useState(0);
  const [broadcastMessage, setBroadcastMessage] = useState('');


  useEffect(() => {
    if (settings) {
      setReferralBonus(settings.referralBonus || 0);
      setBroadcastMessage(settings.broadcastMessage || '');
    }
  },[settings]);

  const handleSave = async () => {
    const settingsRef = doc(firestore, 'settings', 'admin');
    try {
      await setDoc(settingsRef, { 
        referralBonus: Number(referralBonus),
        broadcastMessage,
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
                <Card className="bg-secondary/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Megaphone /> Broadcast Message</CardTitle>
                        <CardDescription>
                            This message will be displayed to all users on their dashboard. Leave it empty to hide it.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            placeholder="Enter your announcement..."
                            value={broadcastMessage}
                            onChange={(e) => setBroadcastMessage(e.target.value)}
                            rows={3}
                        />
                    </CardContent>
                </Card>
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
                                Bonus amount the referring user receives when their referral takes a loan.
                            </p>
                        </div>
                    </div>
                </div>

                <Button onClick={handleSave} className="mt-4">
                  <Save className="mr-2 h-4 w-4" />
                  Save All Settings
                </Button>
            </>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
