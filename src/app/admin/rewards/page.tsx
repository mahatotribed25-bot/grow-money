
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, deleteDoc, doc, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Gift, Trash2, Send, Sparkles, User, Timer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type UserData = {
    id: string;
    name: string;
    email: string;
}

type ScratchCard = {
    id: string;
    userId: string;
    userName: string;
    amount: number;
    status: 'unscratched' | 'scratched';
    createdAt: any;
}

export default function AdminRewardsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { data: users, loading: usersLoading } = useCollection<UserData>('users');
    const { data: rewards, loading: rewardsLoading } = useCollection<ScratchCard>('scratchCards', undefined, orderBy('createdAt', 'desc'));

    const [selectedUser, setSelectedUser] = useState('');
    const [amount, setAmount] = useState('');
    const [isIssuing, setIsIssuing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredUsers = useMemo(() => {
        return users?.filter(u => u.email !== 'admin@tribed.world' && (
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            u.email.toLowerCase().includes(searchQuery.toLowerCase())
        )) || [];
    }, [users, searchQuery]);

    const handleIssueReward = async () => {
        if (!selectedUser || !amount) {
            toast({ title: "Validation Error", description: "Select a user and amount.", variant: "destructive" });
            return;
        }

        const userObj = users?.find(u => u.id === selectedUser);
        if (!userObj) return;

        setIsIssuing(true);
        const rewardData = {
            userId: selectedUser,
            userName: userObj.name,
            amount: parseFloat(amount),
            status: 'unscratched',
            createdAt: serverTimestamp(),
        };

        try {
            await addDoc(collection(firestore, 'scratchCards'), rewardData);
            toast({ title: "Reward Dispatched!", description: `Scratch card worth ₹${amount} sent to ${userObj.name}.` });
            setAmount('');
            setSelectedUser('');
        } catch (e) {
            toast({ title: "Error", variant: "destructive" });
        } finally {
            setIsIssuing(false);
        }
    };

    const handleDeleteReward = async (id: string) => {
        try {
            await deleteDoc(doc(firestore, 'scratchCards', id));
            toast({ title: "Reward Revoked" });
        } catch (e) {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">Engagement Rewards</h2>
                    <p className="text-sm text-white/40">Issue digital scratch cards to boost user loyalty and engagement.</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Gift className="text-primary" size={20} />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-2xl">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-white/60">New Scratch Card</CardTitle>
                        <CardDescription>Select a target node and define the reward credits.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black tracking-widest text-white/20">Target User</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                                <Input 
                                    placeholder="Search by name or email..." 
                                    className="pl-10 bg-white/5 border-white/10 rounded-xl"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Select value={selectedUser} onValueChange={setSelectedUser}>
                                <SelectTrigger className="bg-white/5 border-white/10 rounded-xl">
                                    <SelectValue placeholder="Confirm user selection" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#030408] border-white/10">
                                    {filteredUsers.map(u => (
                                        <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                                    ))}
                                    {filteredUsers.length === 0 && <p className="p-4 text-center text-xs text-white/20">No matching users</p>}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black tracking-widest text-white/20">Reward Amount (INR)</Label>
                            <Input 
                                type="number" 
                                placeholder="0.00" 
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="bg-white/5 border-white/10 rounded-xl h-12 text-lg font-bold"
                            />
                        </div>

                        <Button 
                            onClick={handleIssueReward} 
                            disabled={isIssuing || !selectedUser || !amount}
                            className="w-full h-12 rounded-xl font-bold bg-primary text-white shadow-lg shadow-primary/20"
                        >
                            <Send size={16} className="mr-2" />
                            Dispatch Scratch Card
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-2xl overflow-hidden">
                    <CardHeader className="bg-white/[0.01] border-b border-white/[0.05]">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-white/60">Recent Dispatches</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-white/[0.02]">
                                <TableRow className="border-white/10">
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/20 pl-6">Recipient</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/20">Credits</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/20">Status</TableHead>
                                    <TableHead className="text-right pr-6"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rewardsLoading ? (
                                    <TableRow><TableCell colSpan={4} className="text-center py-10 opacity-20"><Timer className="animate-spin mx-auto"/></TableCell></TableRow>
                                ) : rewards?.length === 0 ? (
                                    <TableRow><TableCell colSpan={4} className="text-center py-20 text-white/10 italic text-sm">No rewards in history</TableCell></TableRow>
                                ) : (
                                    rewards?.map(r => (
                                        <TableRow key={r.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                                            <TableCell className="pl-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-white/80">{r.userName}</span>
                                                    <span className="text-[9px] text-white/20 font-bold uppercase tracking-widest">{new Date(r.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-bold text-green-400 text-sm">₹{r.amount}</TableCell>
                                            <TableCell>
                                                <Badge className={cn(
                                                    "text-[8px] font-black uppercase h-5",
                                                    r.status === 'scratched' ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-white/10 text-white/40 border-white/10"
                                                )}>
                                                    {r.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-red-400" onClick={() => handleDeleteReward(r.id)}>
                                                    <Trash2 size={14} />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
