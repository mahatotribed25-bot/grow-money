'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useCollection, useFirestore, useUser, useDoc } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, where, getDocs, writeBatch } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, User, MessageCircle, ChevronLeft, Home, Briefcase, Trophy, HandCoins, MoreVertical, Trash2, Circle, Camera, X, Timer, RefreshCcw } from 'lucide-react';
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
import { format, isToday, isYesterday } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
    imageUrl?: string;
}

type OtherUserData = {
    id: string;
    isOnline?: boolean;
    lastSeen?: any;
    photoURL?: string;
}

export default function UserChatsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
    const [message, setMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [fullPreviewUrl, setFullPreviewUrl] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
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

    const compressImage = async (base64: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new window.Image();
            img.src = base64;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_DIM = 800;
                if (width > height) {
                    if (width > MAX_DIM) { height *= MAX_DIM / width; width = MAX_DIM; }
                } else {
                    if (height > MAX_DIM) { width *= MAX_DIM / height; height = MAX_DIM; }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = async () => {
            const compressed = await compressImage(reader.result as string);
            setSelectedImage(compressed);
        };
        reader.readAsDataURL(file);
    };

    const handleSendMessage = async () => {
        if (!selectedSession || (!message.trim() && !selectedImage) || !user) return;

        const messagesCol = collection(firestore, `userChatSessions/${selectedSession.id}/messages`);
        const sessionDoc = doc(firestore, `userChatSessions/${selectedSession.id}`);
        
        const messageData = {
            text: message,
            imageUrl: selectedImage || null,
            senderId: user.uid,
            createdAt: serverTimestamp(),
        };
        
        const sessionUpdate = {
            lastMessage: selectedImage ? "📷 Image" : message,
            lastMessageAt: serverTimestamp(),
        };

        try {
            await addDoc(messagesCol, messageData);
            await updateDoc(sessionDoc, sessionUpdate);
            setMessage('');
            setSelectedImage(null);
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

    const handleManualRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
            toast({ title: "Protocol Synced" });
        }, 800);
    };

    const renderDateSeparator = (date: Date) => {
        let label = format(date, 'dd MMM yyyy');
        if (isToday(date)) label = 'Today';
        else if (isYesterday(date)) label = 'Yesterday';

        return (
            <div className="flex justify-center my-4">
                <span className="px-4 py-1 rounded-full bg-muted text-[10px] font-black uppercase tracking-[2px] text-muted-foreground border border-white/5">
                    {label}
                </span>
            </div>
        );
    };

    if (sessionsLoading) return <div className="flex h-screen items-center justify-center bg-background"><Timer className="animate-spin text-primary" /></div>;

    return (
        <div className="flex flex-col h-screen bg-background">
            <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b px-4 bg-background/95 backdrop-blur-xl border-white/5">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon" className="hover:bg-white/5 text-white/60">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-lg font-black uppercase tracking-tight text-white/90 flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" /> Private Node
                </h1>
                <div className="w-9" />
            </header>

            <main className="flex-1 overflow-hidden flex flex-col md:flex-row">
                <div className={cn("md:w-80 border-r border-white/5 flex flex-col bg-muted/5", selectedSession && "hidden md:flex")}>
                    <ScrollArea className="flex-1">
                        {sessions?.length === 0 ? (
                            <div className="p-12 text-center space-y-4">
                                <MessageCircle size={48} className="mx-auto text-white/5" />
                                <p className="text-xs text-white/20 uppercase font-black leading-relaxed">No linked nodes found. Private channels are established by administrators.</p>
                            </div>
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

                <div className={cn("flex-1 flex flex-col", !selectedSession && "hidden md:flex items-center justify-center bg-black/20")}>
                    {selectedSession && user ? (
                        <>
                            <ChatHeader 
                                session={selectedSession} 
                                currentUserId={user.uid} 
                                onBack={() => setSelectedSession(null)} 
                                onClear={handleClearChat}
                                isRefreshing={isRefreshing}
                                onRefresh={handleManualRefresh}
                            />
                            <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
                                <div className="space-y-1">
                                    {messages?.map((msg, idx) => {
                                        const prevMsg = messages[idx - 1];
                                        const msgDate = msg.createdAt ? msg.createdAt.toDate() : null;
                                        const prevMsgDate = prevMsg?.createdAt ? prevMsg.createdAt.toDate() : null;
                                        const showDate = !prevMsg || (msgDate && prevMsgDate && format(msgDate, 'yyyyMMdd') !== format(prevMsgDate, 'yyyyMMdd'));

                                        return (
                                            <div key={msg.id}>
                                                {showDate && msgDate && renderDateSeparator(msgDate)}
                                                <div className={cn("flex flex-col mb-4", msg.senderId === user.uid ? "items-end" : "items-start")}>
                                                    <div className={cn(
                                                        "max-w-[85%] rounded-2xl px-4 py-2.5 shadow-xl transition-all",
                                                        msg.senderId === user.uid 
                                                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                                                        : "bg-white/[0.04] text-white border border-white/10 rounded-tl-none"
                                                    )}>
                                                        {msg.imageUrl && (
                                                            <div className="relative aspect-square w-56 mb-2 rounded-xl overflow-hidden cursor-pointer" onClick={() => setFullPreviewUrl(msg.imageUrl!)}>
                                                                <Image src={msg.imageUrl} alt="chat" fill className="object-cover" />
                                                            </div>
                                                        )}
                                                        {msg.text && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                                                        <div className={cn(
                                                            "flex items-center gap-1.5 mt-1 justify-end opacity-40 text-[9px] font-black uppercase",
                                                            msg.senderId === user.uid ? "text-primary-foreground" : "text-white"
                                                        )}>
                                                            {msg.createdAt ? format(msg.createdAt.toDate(), 'HH:mm') : '...'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                            <div className="p-6 bg-card border-t border-white/5">
                                {selectedImage && (
                                    <div className="mb-4 relative h-20 w-20 rounded-xl overflow-hidden border-2 border-primary animate-in zoom-in-95">
                                        <Image src={selectedImage} alt="preview" fill className="object-cover" />
                                        <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-5 w-5 rounded-full" onClick={() => setSelectedImage(null)}>
                                            <X size={10} />
                                        </Button>
                                    </div>
                                )}
                                <div className="flex gap-2 max-w-4xl mx-auto bg-black/40 p-2 rounded-2xl border border-white/5 shadow-inner">
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                    <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-white/30 hover:text-primary rounded-xl" onClick={() => fileInputRef.current?.click()}>
                                        <Camera size={18} />
                                    </Button>
                                    <Textarea 
                                        placeholder="Type a message..." 
                                        className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[40px] max-h-32 resize-none p-2 text-sm"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                    />
                                    <Button size="icon" className="rounded-xl h-10 w-10 shrink-0 bg-primary text-white shadow-lg hover:scale-105 transition-transform" onClick={handleSendMessage} disabled={!message.trim() && !selectedImage}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center p-10 space-y-4">
                            <div className="h-20 w-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center mx-auto shadow-2xl">
                                <MessageCircle className="h-8 w-8 text-white/10" />
                            </div>
                            <h3 className="text-lg font-black uppercase text-white/40 tracking-tight">Access Secure Channel</h3>
                            <p className="text-[10px] text-white/20 uppercase font-bold max-w-[200px] mx-auto leading-relaxed">Select an operational node from the sidebar to start communication.</p>
                        </div>
                    )}
                </div>
            </main>

            <nav className="sticky bottom-0 z-10 border-t border-white/5 bg-background/95 backdrop-blur-xl">
                <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs">
                <BottomNavItem icon={Home} label="Home" href="/dashboard" />
                <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
                <BottomNavItem icon={Trophy} label="Leaders" href="/leaderboard" />
                <BottomNavItem icon={HandCoins} label="Loans" href="/my-loans" />
                <BottomNavItem icon={User} label="Profile" href="/profile" />
                </div>
            </nav>

            {/* Image Preview Modal */}
            <Dialog open={!!fullPreviewUrl} onOpenChange={() => setFullPreviewUrl(null)}>
                <DialogContent className="max-w-[95vw] h-[85vh] p-0 border-none bg-black/95 rounded-3xl overflow-hidden">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Image Preview</DialogTitle>
                        <DialogDescription>Full screen view of the shared image.</DialogDescription>
                    </DialogHeader>
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                        {fullPreviewUrl && <Image src={fullPreviewUrl} alt="full" fill className="object-contain" />}
                        <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white" onClick={() => setFullPreviewUrl(null)}>
                            <X />
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
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
                "p-4 mx-2 my-1 rounded-2xl cursor-pointer transition-all flex items-center gap-3 relative overflow-hidden group",
                isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-white/[0.03] border border-transparent"
            )}
        >
            <div className="relative shrink-0">
                <Avatar className="h-10 w-10 rounded-xl border border-white/10 shadow-lg">
                    <AvatarImage src={otherUser?.photoURL} className="object-cover" />
                    <AvatarFallback className="bg-white/5 text-[10px] font-black">{otherName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                    isOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-white/20"
                )} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-white/80 truncate">{otherName}</p>
                <p className="text-[10px] text-white/30 truncate font-medium mt-0.5 italic">"{session.lastMessage}"</p>
            </div>
            {isSelected && <div className="absolute right-0 top-1/4 bottom-1/4 w-0.5 bg-primary rounded-full" />}
        </div>
    );
}

function ChatHeader({ session, currentUserId, onBack, onClear, isRefreshing, onRefresh }: { session: ChatSession, currentUserId: string, onBack: () => void, onClear: () => void, isRefreshing: boolean, onRefresh: () => void }) {
    const otherId = session.participants.find(p => p !== currentUserId);
    const otherName = otherId ? session.participantNames[otherId] : 'User';
    const { data: otherUser } = useDoc<OtherUserData>(otherId ? `users/${otherId}` : null);

    const isOnline = useMemo(() => {
        if (!otherUser?.isOnline || !otherUser?.lastSeen) return false;
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        return otherUser.lastSeen.toMillis() > fiveMinutesAgo;
    }, [otherUser]);

    return (
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-card/50 backdrop-blur-xl">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden text-white/40 h-8 w-8" onClick={onBack}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="relative">
                    <Avatar className="h-10 w-10 rounded-xl border border-white/10 shadow-lg">
                        <AvatarImage src={otherUser?.photoURL} className="object-cover" />
                        <AvatarFallback className="bg-white/5 text-[10px] font-black">{otherName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Circle className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 fill-current border-2 border-card",
                        isOnline ? "text-green-500" : "text-gray-500"
                    )} />
                </div>
                <div>
                    <h2 className="font-black text-white tracking-tight">{otherName}</h2>
                    <div className="flex items-center gap-1.5">
                        <div className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "bg-green-500 animate-pulse" : "bg-white/20")} />
                        <p className={cn("text-[9px] font-black uppercase tracking-widest", isOnline ? "text-green-500" : "text-white/20")}>
                            {isOnline ? 'Active Node' : 'Offline'}
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onRefresh}
                    className="rounded-xl border border-white/5 text-white/40 h-10 w-10 hover:text-white"
                >
                    <RefreshCcw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-xl border border-white/5 h-10 w-10 text-white/40">
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#0a0b14] border-white/10 rounded-2xl">
                        <DropdownMenuItem onClick={onClear} className="text-destructive font-black uppercase text-[10px] tracking-widest p-3">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Clear Node History
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
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
      className={cn(
        "flex flex-col items-center justify-center gap-1 transition-all h-full relative",
        active ? 'text-primary scale-110' : 'text-white/40 hover:text-white/60'
      )}
    >
      <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]")} />
      <span className="text-[10px] tracking-tight">{label}</span>
      {active && <div className="absolute -bottom-1 h-1 w-8 bg-primary rounded-full blur-[2px]" />}
    </Link>
  );
}
