'use client';
import { useState, useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Link as LinkIcon, User, RefreshCcw, Search, MessageCircle, ArrowRight, ShieldCheck, Timer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type UserData = {
    id: string;
    name: string;
    email: string;
    photoURL?: string;
}

type ChatSession = {
    id: string;
    participants: string[];
    participantNames: Record<string, string>;
    createdAt: any;
    lastMessage: string;
}

export default function UserChatBridgePage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const { data: users, loading: usersLoading } = useCollection<UserData>('users');
    const { data: sessions, loading: sessionsLoading } = useCollection<ChatSession>('userChatSessions', undefined, orderBy('createdAt', 'desc'));

    const [user1, setUser1] = useState('');
    const [user2, setUser2] = useState('');

    const filteredUsers = useMemo(() => {
        return users?.filter(u => 
            u.email !== 'admin@tribed.world' && 
            u.email !== 'admin@tribed.com' &&
            (u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()))
        ) || [];
    }, [users, searchQuery]);

    const handleConnect = async () => {
        if (!user1 || !user2 || user1 === user2) {
            toast({ title: "Selection Error", description: "Choose two different investors to link.", variant: "destructive" });
            return;
        }

        const existing = sessions?.find(s => 
            s.participants.includes(user1) && s.participants.includes(user2)
        );

        if (existing) {
            toast({ title: "Node Exists", description: "These nodes are already connected." });
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
            lastMessage: 'Secure channel established by admin',
            lastMessageAt: serverTimestamp()
        };

        try {
            await addDoc(collection(firestore, 'userChatSessions'), sessionData);
            toast({ title: "Bridge Established", description: "Private communication node is now live." });
            setUser1('');
            setUser2('');
        } catch (e) {
            toast({ title: "Protocol Error", variant: "destructive" });
        }
    };

    const handleDeleteBridge = async (id: string) => {
        try {
            await deleteDoc(doc(firestore, 'userChatSessions', id));
            toast({ title: "Bridge Terminated", description: "Communication node has been purged." });
        } catch (e) {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const handleManualRefresh = () => {
        setIsRefreshing(true);
        // useCollection is reactive, so we just simulate a visual feedback
        setTimeout(() => setIsRefreshing(false), 800);
        toast({ title: "Syncing Bridges..." });
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Chat Bridges</h2>
                    <p className="text-[10px] font-black uppercase text-white/20 tracking-[4px]">P2P Communication Protocol</p>
                </div>
                <Button 
                    variant="outline" 
                    onClick={handleManualRefresh}
                    className="h-11 px-6 rounded-xl border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10"
                >
                    <RefreshCcw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} /> Refresh Nodes
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Bridge Creator */}
                <Card className="lg:col-span-1 bg-white/[0.03] border-white/[0.08] rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5"><LinkIcon size={120} className="text-primary rotate-45" /></div>
                    <CardHeader className="p-0 mb-8">
                        <CardTitle className="text-sm font-black uppercase tracking-[3px] text-primary">Forge Chat Node</CardTitle>
                        <CardDescription className="text-xs text-white/40 mt-1 uppercase font-bold">Link two investors for private chat</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 space-y-6 relative z-10">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-white/20 uppercase tracking-widest pl-1">Search Pipeline</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                                <Input 
                                    placeholder="Filter users..." 
                                    className="pl-10 bg-white/5 border-white/10 rounded-xl h-12 focus:ring-primary"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-white/20 uppercase tracking-widest pl-1">Investor Alpha</Label>
                                <Select value={user1} onValueChange={setUser1}>
                                    <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl">
                                        <SelectValue placeholder="Select first node" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#030408] border-white/10">
                                        {filteredUsers.map(u => (
                                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex justify-center"><ArrowRight className="text-white/10 rotate-90 lg:rotate-0" /></div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-white/20 uppercase tracking-widest pl-1">Investor Beta</Label>
                                <Select value={user2} onValueChange={setUser2}>
                                    <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl">
                                        <SelectValue placeholder="Select second node" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#030408] border-white/10">
                                        {filteredUsers.map(u => (
                                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Button 
                            onClick={handleConnect} 
                            disabled={!user1 || !user2 || user1 === user2}
                            className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all mt-4"
                        >
                            Establish Bridge
                        </Button>
                    </CardContent>
                </Card>

                {/* Active Bridges List */}
                <Card className="lg:col-span-2 bg-white/[0.03] border-white/[0.08] rounded-[2rem] overflow-hidden shadow-2xl">
                    <CardHeader className="bg-white/[0.02] p-6 border-b border-white/5 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-black uppercase tracking-[3px] text-white/40 flex items-center gap-2">
                            <MessageCircle size={16} className="text-primary" /> Active Communication Nodes
                        </CardTitle>
                        <Badge className="bg-primary/20 text-primary border-primary/20 text-[9px]">{sessions?.length || 0}</Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-white/[0.01]">
                                <TableRow className="border-white/5 hover:bg-transparent">
                                    <TableHead className="text-white/20 text-[10px] uppercase font-black pl-8 py-5">Node Connection</TableHead>
                                    <TableHead className="text-white/20 text-[10px] uppercase font-black">Status</TableHead>
                                    <TableHead className="text-white/20 text-[10px] uppercase font-black">Established At</TableHead>
                                    <TableHead className="text-white/20 text-[10px] uppercase font-black text-right pr-8">Decision</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sessionsLoading ? (
                                    <TableRow className="border-transparent">
                                        <TableCell colSpan={4} className="text-center py-20 opacity-20 italic">
                                            <Timer className="animate-spin h-6 w-6 mx-auto mb-2" />
                                            <p className="text-[10px] font-black uppercase tracking-[3px]">Syncing Registry...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : sessions?.length === 0 ? (
                                    <TableRow className="border-transparent">
                                        <TableCell colSpan={4} className="text-center py-20 text-white/10 italic text-sm font-bold uppercase tracking-widest">
                                            No active bridges detected
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sessions?.map(s => {
                                        const ids = s.participants;
                                        const names = Object.values(s.participantNames);
                                        return (
                                            <TableRow key={s.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                                                <TableCell className="pl-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex flex-col items-center">
                                                            <div className="text-xs font-black text-white/80">{names[0]}</div>
                                                            <span className="text-[8px] text-white/20">ID: {ids[0].slice(-6)}</span>
                                                        </div>
                                                        <div className="h-px w-8 bg-primary/20 relative">
                                                            <div className="absolute inset-0 bg-primary shadow-[0_0_10px_rgba(139,92,246,1)] scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                                                        </div>
                                                        <div className="flex flex-col items-center">
                                                            <div className="text-xs font-black text-white/80">{names[1]}</div>
                                                            <span className="text-[8px] text-white/20">ID: {ids[1].slice(-6)}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[8px] font-black uppercase h-5">Secured</Badge>
                                                </TableCell>
                                                <TableCell className="text-[10px] font-bold text-white/20 uppercase">
                                                    {s.createdAt ? new Date(s.createdAt.seconds * 1000).toLocaleDateString() : 'Active'}
                                                </TableCell>
                                                <TableCell className="pr-8 text-right">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => handleDeleteBridge(s.id)} 
                                                        className="h-9 w-9 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-xl"
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
