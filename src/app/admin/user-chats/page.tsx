
'use client';
import { useState } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Link as LinkIcon, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type UserData = {
    id: string;
    name: string;
    email: string;
}

type ChatSession = {
    id: string;
    participants: string[];
    participantNames: Record<string, string>;
    createdAt: any;
}

export default function UserChatBridgePage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { data: users, loading: usersLoading } = useCollection<UserData>('users');
    const { data: sessions, loading: sessionsLoading } = useCollection<ChatSession>('userChatSessions');

    const [user1, setUser1] = useState('');
    const [user2, setUser2] = useState('');

    const handleConnect = async () => {
        if (!user1 || !user2 || user1 === user2) {
            toast({ title: "Invalid Selection", description: "Please select two different users.", variant: "destructive" });
            return;
        }

        const existing = sessions?.find(s => 
            s.participants.includes(user1) && s.participants.includes(user2)
        );

        if (existing) {
            toast({ title: "Already Connected", description: "These users are already linked." });
            return;
        }

        const u1 = users?.find(u => u.id === user1);
        const u2 = users?.find(u => u.id === user2);

        const sessionData = {
            participants: [user1, user2],
            participantNames: {
                [user1]: u1?.name || 'User 1',
                [user2]: u2?.name || 'User 2'
            },
            createdAt: serverTimestamp(),
            lastMessage: 'Chat opened by admin',
            lastMessageAt: serverTimestamp()
        };

        try {
            await addDoc(collection(firestore, 'userChatSessions'), sessionData);
            toast({ title: "Bridge Created", description: "Users can now chat with each other." });
            setUser1('');
            setUser2('');
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteBridge = async (id: string) => {
        try {
            await deleteDoc(doc(firestore, 'userChatSessions', id));
            toast({ title: "Bridge Removed" });
        } catch (e) {
            console.error(e);
        }
    };

    const filteredUsers = users?.filter(u => u.email !== 'admin@tribed.world');

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <LinkIcon className="h-5 w-5 text-primary" />
                        Create Chat Bridge
                    </CardTitle>
                    <CardDescription>Select two users to allow them to chat privately with each other.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">User 1</label>
                        <Select value={user1} onValueChange={setUser1}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select User" />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredUsers?.map(u => (
                                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">User 2</label>
                        <Select value={user2} onValueChange={setUser2}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select User" />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredUsers?.map(u => (
                                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleConnect}>Connect Users</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Active Bridges</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Connected Users</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sessions?.map(s => {
                                const names = Object.values(s.participantNames);
                                return (
                                    <TableRow key={s.id}>
                                        <TableCell className="font-medium">
                                            {names[0]} <span className="mx-2 text-muted-foreground">↔</span> {names[1]}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteBridge(s.id)} className="text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            {(!sessions || sessions.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center text-muted-foreground py-10">No active chat bridges found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
