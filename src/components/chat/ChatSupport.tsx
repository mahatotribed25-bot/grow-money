'use client';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, X, Trash2, MoreVertical, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, orderBy, query, doc, setDoc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { ScrollArea } from '../ui/scroll-area';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';

type ChatMessage = {
    id: string;
    text: string;
    senderId: string;
    createdAt: Timestamp;
}

export function ChatSupportWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const messagesQuery = user ? query(collection(firestore, `chats/${user.uid}/messages`), orderBy('createdAt', 'asc')) : null;
    const { data: messages, loading } = useCollection<ChatMessage>(messagesQuery);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && scrollAreaRef.current) {
            setTimeout(() => {
                const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
                if (scrollContainer) {
                    scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
                }
            }, 100);
        }
    }, [messages, isOpen]);
    
    const handleSendMessage = async () => {
        if (!user || !message.trim()) return;
        
        const messagesCol = collection(firestore, `chats/${user.uid}/messages`);
        const chatDoc = doc(firestore, `chats/${user.uid}`);
        
        const messageData = {
            text: message,
            senderId: user.uid,
            createdAt: serverTimestamp(),
            isRead: false,
        };
        
        const chatData = {
            userId: user.uid,
            userName: user.displayName,
            lastMessage: message,
            lastMessageAt: serverTimestamp(),
            unreadByAdmin: true,
            unreadByUser: false,
        };

        try {
            await addDoc(messagesCol, messageData);
            await setDoc(chatDoc, chatData, { merge: true });
            setMessage('');
        } catch (e) {
            console.error(e);
        }
    }

    const handleClearChat = async () => {
        if (!user) return;

        try {
            const messagesCol = collection(firestore, `chats/${user.uid}/messages`);
            const snapshot = await getDocs(messagesCol);
            
            const batch = writeBatch(firestore);
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            const chatDoc = doc(firestore, `chats/${user.uid}`);
            batch.update(chatDoc, {
                lastMessage: 'Chat history cleared',
                lastMessageAt: serverTimestamp(),
                unreadByAdmin: false,
                unreadByUser: false,
            });

            await batch.commit();
            toast({ title: "Chat Cleared", description: "Your chat history has been deleted." });
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Could not clear chat.", variant: "destructive" });
        }
    }

    if (!user) return null;

    const formatTime = (ts?: Timestamp) => {
        if (!ts) return '';
        return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return (
        <>
            <div className="fixed bottom-6 right-6 z-50">
                <Button size="icon" className="rounded-full w-14 h-14 shadow-2xl hover:scale-105 transition-transform" onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
                </Button>
            </div>
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 animate-in fade-in-0 slide-in-from-bottom-10 sm:w-96 w-[calc(100vw-3rem)]">
                    <Card className="h-[32rem] flex flex-col shadow-2xl border-primary/20 overflow-hidden">
                        <CardHeader className="bg-primary text-primary-foreground py-4 px-4 flex flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center font-bold text-lg">
                                        GM
                                    </div>
                                    <Circle className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 fill-green-500 stroke-primary text-green-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Support Team</CardTitle>
                                    <p className="text-[10px] text-primary-foreground/70 uppercase tracking-wider font-semibold">Online</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={handleClearChat} className="text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Clear Chat
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => setIsOpen(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden p-0 bg-muted/30">
                            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                                <div className="space-y-4">
                                    {loading ? (
                                        <div className="flex justify-center items-center h-20">
                                            <p className="text-xs text-muted-foreground animate-pulse">Loading conversation...</p>
                                        </div>
                                    ) : messages?.length === 0 ? (
                                        <div className="text-center py-10 space-y-2">
                                            <p className="text-sm text-muted-foreground">No messages yet.</p>
                                            <p className="text-xs text-muted-foreground/60">How can we help you today?</p>
                                        </div>
                                    ) : messages?.map(msg => (
                                        <div key={msg.id} className={`flex flex-col ${msg.senderId === user.uid ? 'items-end' : 'items-start'}`}>
                                            <div className={`rounded-2xl px-4 py-2.5 max-w-[85%] text-sm shadow-sm ${
                                                msg.senderId === user.uid 
                                                ? 'bg-primary text-primary-foreground rounded-tr-none' 
                                                : 'bg-card text-foreground rounded-tl-none border'
                                            }`}>
                                                <p>{msg.text}</p>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground mt-1 px-1">
                                                {formatTime(msg.createdAt)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                            <div className="p-4 bg-background border-t">
                                <div className="flex gap-2">
                                    <Input 
                                        placeholder="Type your message..." 
                                        className="rounded-full bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary h-10 px-4"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                    />
                                    <Button size="icon" className="rounded-full h-10 w-10 shrink-0 shadow-lg" onClick={handleSendMessage} disabled={!message.trim()}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
}