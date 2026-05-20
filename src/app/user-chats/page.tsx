
'use client';
import { useState, useEffect, useRef } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, where } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, User, MessageCircle, ChevronLeft, Home, Briefcase, Trophy, HandCoins } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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

export default function UserChatsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
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
                {/* Session List */}
                <div className={cn("md:w-80 border-r flex flex-col", selectedSession && "hidden md:flex")}>
                    <ScrollArea className="flex-1">
                        {sessions?.length === 0 ? (
                            <p className="p-8 text-center text-sm text-muted-foreground">No linked chats found. Only Admin can initiate private chats.</p>
                        ) : (
                            sessions?.map(s => {
                                const otherId = s.participants.find(p => p !== user?.uid);
                                const otherName = otherId ? s.participantNames[otherId] : 'Unknown';
                                return (
                                    <div 
                                        key={s.id} 
                                        onClick={() => setSelectedSession(s)}
                                        className={cn(
                                            "p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors",
                                            selectedSession?.id === s.id && "bg-primary/5 border-l-4 border-l-primary"
                                        )}
                                    >
                                        <p className="font-semibold text-sm">{otherName}</p>
                                        <p className="text-xs text-muted-foreground truncate">{s.lastMessage}</p>
                                    </div>
                                )
                            })
                        )}
                    </ScrollArea>
                </div>

                {/* Chat Area */}
                <div className={cn("flex-1 flex flex-col", !selectedSession && "hidden md:flex items-center justify-center bg-muted/5")}>
                    {selectedSession ? (
                        <>
                            <div className="p-4 border-b flex items-center gap-3 bg-card">
                                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedSession(null)}>
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-6 w-6 text-primary" />
                                </div>
                                <h2 className="font-bold">
                                    {selectedSession.participants.find(p => p !== user?.uid) 
                                        ? selectedSession.participantNames[selectedSession.participants.find(p => p !== user?.uid)!] 
                                        : 'User'}
                                </h2>
                            </div>
                            <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
                                <div className="space-y-6">
                                    {messages?.map(msg => (
                                        <div key={msg.id} className={cn("flex flex-col", msg.senderId === user?.uid ? "items-end" : "items-start")}>
                                            <div className={cn(
                                                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                                                msg.senderId === user?.uid 
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
