'use client';
import { useState, useEffect, useRef } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import type { Timestamp } from 'firebase/firestore';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, setDoc, updateDoc, getDocs, writeBatch } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, User, Trash2, MoreVertical, Search, MessageSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Chat = {
    id: string;
    userName: string;
    lastMessage: string;
    lastMessageAt: Timestamp;
    unreadByAdmin: boolean;
}

type ChatMessage = {
    id: string;
    text: string;
    senderId: string;
    createdAt: Timestamp;
}

export default function AdminChatPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { data: chats, loading: chatsLoading } = useCollection<Chat>('chats', undefined, orderBy('lastMessageAt', 'desc'));
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [message, setMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    
    const messagesQuery = selectedChat ? query(collection(firestore, `chats/${selectedChat.id}/messages`), orderBy('createdAt', 'asc')) : null;
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

    const handleSelectChat = async (chat: Chat) => {
        setSelectedChat(chat);
        if (chat.unreadByAdmin) {
            const chatRef = doc(firestore, 'chats', chat.id);
            await updateDoc(chatRef, { unreadByAdmin: false });
        }
    }
    
    const handleSendMessage = async () => {
        if (!selectedChat || !message.trim()) return;

        const messagesCol = collection(firestore, `chats/${selectedChat.id}/messages`);
        const chatDoc = doc(firestore, `chats/${selectedChat.id}`);
        
        const messageData = {
            text: message,
            senderId: 'admin',
            createdAt: serverTimestamp(),
            isRead: false,
        };
        
        const chatData = {
            lastMessage: message,
            lastMessageAt: serverTimestamp(),
            unreadByUser: true,
            unreadByAdmin: false,
        };

        try {
            await addDoc(messagesCol, messageData);
            await setDoc(chatDoc, chatData, { merge: true });
            setMessage('');
        } catch (e) {
            console.error(e);
        }
    }

    const handleClearHistory = async () => {
        if (!selectedChat) return;

        try {
            const messagesCol = collection(firestore, `chats/${selectedChat.id}/messages`);
            const snapshot = await getDocs(messagesCol);
            
            const batch = writeBatch(firestore);
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            const chatDoc = doc(firestore, `chats/${selectedChat.id}`);
            batch.update(chatDoc, {
                lastMessage: 'Chat history cleared by admin',
                lastMessageAt: serverTimestamp(),
                unreadByAdmin: false,
                unreadByUser: false,
            });

            await batch.commit();
            toast({ title: "Chat Cleared", description: `Conversation with ${selectedChat.userName} has been reset.` });
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Could not clear chat history.", variant: "destructive" });
        }
    }

    const filteredChats = chats?.filter(chat => 
        chat.userName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatTime = (ts?: Timestamp) => {
        if (!ts) return '';
        return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[calc(100vh-10rem)] border rounded-xl overflow-hidden bg-background">
            <div className="col-span-1 border-r flex flex-col bg-muted/10">
                <div className="p-4 border-b space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        User Chats
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search users..." 
                            className="pl-9 bg-background"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    {chatsLoading ? (
                        <div className="p-4 space-y-4">
                            {[1,2,3].map(i => <div key={i} className="h-16 w-full bg-muted animate-pulse rounded-lg" />)}
                        </div>
                    ) : filteredChats?.length === 0 ? (
                        <p className="p-8 text-center text-sm text-muted-foreground">No conversations found.</p>
                    ) : (
                        filteredChats?.map(chat => (
                            <div 
                                key={chat.id} 
                                onClick={() => handleSelectChat(chat)}
                                className={cn(
                                    "p-4 border-b cursor-pointer transition-colors relative group",
                                    selectedChat?.id === chat.id ? "bg-primary/5 border-l-4 border-l-primary" : "hover:bg-muted/50"
                                )}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <p className="font-semibold text-sm truncate pr-4">{chat.userName}</p>
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                        {formatTime(chat.lastMessageAt)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-muted-foreground truncate max-w-[150px]">{chat.lastMessage}</p>
                                    {chat.unreadByAdmin && (
                                        <Badge className="h-4 px-1.5 min-w-[1rem] flex items-center justify-center text-[10px]">New</Badge>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </ScrollArea>
            </div>

            <div className="col-span-3 flex flex-col">
                {selectedChat ? (
                    <>
                        <div className="p-4 border-b flex items-center justify-between bg-card">
                             <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h2 className="font-bold">{selectedChat.userName}</h2>
                                    <p className="text-[10px] text-green-500 font-semibold uppercase tracking-wider">Active Session</p>
                                </div>
                             </div>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreVertical className="h-5 w-5 text-muted-foreground" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={handleClearHistory} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Clear Chat History
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                             </DropdownMenu>
                        </div>
                        <ScrollArea className="flex-1 p-6 bg-muted/5" ref={scrollAreaRef}>
                            <div className="space-y-6">
                                {messagesLoading ? (
                                    <div className="space-y-4">
                                        {[1,2,3].map(i => <div key={i} className="h-10 w-32 bg-muted animate-pulse rounded-lg" />)}
                                    </div>
                                ) : messages?.length === 0 ? (
                                    <div className="text-center py-20 text-muted-foreground">
                                        <p className="text-sm">Conversation cleared.</p>
                                    </div>
                                ) : (
                                    messages?.map(msg => (
                                        <div key={msg.id} className={cn("flex flex-col", msg.senderId === 'admin' ? "items-end" : "items-start")}>
                                            <div className={cn(
                                                "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                                                msg.senderId === 'admin' 
                                                ? "bg-primary text-primary-foreground rounded-tr-none" 
                                                : "bg-card text-foreground rounded-tl-none border"
                                            )}>
                                                <p>{msg.text}</p>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground mt-1 px-1">
                                                {formatTime(msg.createdAt)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                        <div className="p-4 border-t bg-card">
                            <div className="flex gap-2 max-w-4xl mx-auto">
                                <Input 
                                    placeholder="Type your response..." 
                                    className="bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary h-11"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                />
                                <Button size="icon" className="h-11 w-11 shrink-0 shadow-lg" onClick={handleSendMessage} disabled={!message.trim()}>
                                    <Send className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/5">
                        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                            <MessageSquare className="h-10 w-10 opacity-20" />
                        </div>
                        <h3 className="text-lg font-medium">Select a user to start chatting</h3>
                        <p className="text-sm">Customer support history will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    )
}