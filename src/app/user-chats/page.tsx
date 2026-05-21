'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useCollection, useFirestore, useUser, useDoc } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, where, getDocs, writeBatch } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, User, MessageCircle, ChevronLeft, Home, Briefcase, Trophy, HandCoins, MoreVertical, Trash2, Circle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ChatSession = {
    id: string;
    participantNames: Record<string, string>;
    participants: string[];
    lastMessage: string;
    lastMessageAt: any;
}

type ChatMessage = {
    id: string;
    text: string;
    senderId: string;
    createdAt: any;
}

type OtherUserData = {
    id: string;
    isOnline?: boolean;
    lastSeen?: any;
}

export default function UserChatsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
    const [message, setMessage] = useState('');
    
    const sessionsQuery = user ? query(
        collection(firestore, 'userChatSessions'),
        where('participants', 'array-contains', user.uid)
    ) : null;
    
    const { data: sessions, loading: sessionsLoading } = useCollection<ChatSession>(sessionsQuery);
    
    const messagesQuery = selectedSession ? query(
        collection(firestore, `userChatSessions/${selectedSession.id}/messages`),
        orderBy('createdAt', 'asc')
    ) : null;
    
    const { data: messages, loading: messagesLoading } = useCollection<ChatMessage>(messagesQuery);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
            }
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (!selectedSession || !message.trim() || !user) return;

        const messagesCol = collection(firestore, `userChatSessions/${selectedSession.id}/messages`);
        const sessionDoc = doc(firestore, `userChatSessions/${selectedSession.id}`);
        
        const messageData = {
            text: message,
            senderId: user.uid,
            createdAt: serverTimestamp(),
        };
        
        const sessionUpdate = {
            lastMessage: message,
            lastMessageAt: serverTimestamp(),
        };

        try {
            await addDoc(messagesCol, messageData);
            await updateDoc(sessionDoc, sessionUpdate);
            setMessage('');
        } catch (e) {
            console.error(e);
        }
    };

    const handleClearChat = async () => {
        if (!selectedSession || !user) return;

        try {
            const messagesCol = collection(firestore, `userChatSessions/${selectedSession.id}/messages`);
            const snapshot = await getDocs(messagesCol);
            
            const batch = writeBatch(firestore);
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            const sessionDoc = doc(firestore, `userChatSessions/${selectedSession.id}`);
            batch.update(sessionDoc, {
                lastMessage: 'Chat history cleared',
                lastMessageAt: serverTimestamp()
            });

            await batch.commit();
            toast({ title: "Chat Cleared", description: "The conversation history has been deleted." });
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Could not clear chat.", variant: "destructive" });
        }
    };

    if (sessionsLoading) return <div className="flex h-screen items-center justify-center"><p>Loading Chats...</p></div>;

    return (
        <div className="flex flex-col h-screen bg-background">
            <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b px-4 bg-background/95 backdrop-blur-sm">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-lg font-semibold flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" /> Private Chats
                </h1>
                <div className="w-9" />
            </header>

            <main className="flex-1 overflow-hidden flex flex-col md:flex-row">
                <div className={cn("md:w-80 border-r flex flex-col", selectedSession && "hidden md:flex")}>
                    <ScrollArea className="flex-1">
                        {sessions?.length === 0 ? (
                            <p className="p-8 text-center text-sm text-muted-foreground">No linked chats found. Only Admin can initiate private chats.</p>
                        ) : (
                            sessions?.map(s => {
                                const otherId = s.participants.find(p => p !== user?.uid);
                                const otherName = otherId ? s.participantNames[otherId] : 'Unknown';
                                return (
                                    <ChatSessionItem 
                                        key={s.id} 
                                        session={s} 
                                        otherId={otherId!} 
                                        otherName={otherName} 
                                        isSelected={selectedSession?.id === s.id}
                                        onSelect={() => setSelectedSession(s)}
                                    />
                                )
                            })
                        )}
                    </ScrollArea>
                </div>

                <div className={cn("flex-1 flex flex-col", !selectedSession && "hidden md:flex items-center justify-center bg-muted/5")}>
                    {selectedSession && user ? (
                        <>
                            <ChatHeader 
                                session={selectedSession} 
                                currentUserId={user.uid} 
                                onBack={() => setSelectedSession(null)} 
                                onClear={handleClearChat}
                            />
                            <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
                                <div className="space-y-6">
                                    {messages?.map(msg => (
                                        <div key={msg.id} className={cn("flex flex-col", msg.senderId === user.uid ? "items-end" : "items-start")}>
                                            <div className={cn(
                                                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                                                msg.senderId === user.uid 
                                                ? "bg-primary text-primary-foreground rounded-tr-none" 
                                                : "bg-card text-foreground rounded-tl-none border"
                                            )}>
                                                <p>{msg.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                            <div className="p-4 border-t bg-card">
                                <div className="flex gap-2 max-w-4xl mx-auto">
                                    <Input 
                                        placeholder="Type your message..." 
                                        className="rounded-full bg-muted/50"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                    />
                                    <Button size="icon" className="rounded-full h-10 w-10 shrink-0" onClick={handleSendMessage} disabled={!message.trim()}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center p-10">
                            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                            <h3 className="text-lg font-medium">Select a chat to start messaging</h3>
                        </div>
                    )}
                </div>
            </main>

            <nav className="sticky bottom-0 z-10 border-t border-border/20 bg-background/95 backdrop-blur-sm">
                <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs">
                <BottomNavItem icon={Home} label="Home" href="/dashboard" />
                <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
                <BottomNavItem icon={Trophy} label="Leaders" href="/leaderboard" />
                <BottomNavItem icon={HandCoins} label="My Loans" href="/my-loans" />
                <BottomNavItem icon={User} label="Profile" href="/profile" />
                </div>
            </nav>
        </div>
    )
}

function ChatSessionItem({ session, otherId, otherName, isSelected, onSelect }: { session: ChatSession, otherId: string, otherName: string, isSelected: boolean, onSelect: () => void }) {
    const { data: otherUser } = useDoc<OtherUserData>(`users/${otherId}`);
    
    const isOnline = useMemo(() => {
        if (!otherUser?.isOnline || !otherUser?.lastSeen) return false;
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        return otherUser.lastSeen.toMillis() > fiveMinutesAgo;
    }, [otherUser]);

    return (
        <div 
            onClick={onSelect}
            className={cn(
                "p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors flex items-center gap-3",
                isSelected && "bg-primary/5 border-l-4 border-l-primary"
            )}
        >
            <div className="relative">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                </div>
                <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                    isOnline ? "bg-green-500" : "bg-gray-500"
                )} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{otherName}</p>
                <p className="text-xs text-muted-foreground truncate">{session.lastMessage}</p>
            </div>
        </div>
    );
}

function ChatHeader({ session, currentUserId, onBack, onClear }: { session: ChatSession, currentUserId: string, onBack: () => void, onClear: () => void }) {
    const otherId = session.participants.find(p => p !== currentUserId);
    const otherName = otherId ? session.participantNames[otherId] : 'User';
    const { data: otherUser } = useDoc<OtherUserData>(otherId ? `users/${otherId}` : null);

    const isOnline = useMemo(() => {
        if (!otherUser?.isOnline || !otherUser?.lastSeen) return false;
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        return otherUser.lastSeen.toMillis() > fiveMinutesAgo;
    }, [otherUser]);

    return (
        <div className="p-4 border-b flex items-center justify-between bg-card">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                    </div>
                    <Circle className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 fill-current border-2 border-card",
                        isOnline ? "text-green-500" : "text-gray-500"
                    )} />
                </div>
                <div>
                    <h2 className="font-bold">{otherName}</h2>
                    <p className={cn("text-[10px] font-bold uppercase tracking-widest", isOnline ? "text-green-500" : "text-muted-foreground")}>
                        {isOnline ? 'Online' : 'Offline'}
                    </p>
                </div>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <MoreVertical className="h-5 w-5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onClear} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear Chat History
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

function BottomNavItem({
  icon: Icon,
  label,
  href,
  active = false,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 ${
        active ? 'text-primary' : 'text-muted-foreground'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}
