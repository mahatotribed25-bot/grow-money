'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import type { Timestamp } from 'firebase/firestore';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, setDoc, updateDoc, getDocs, writeBatch } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, User, Search, MessageSquare, MoreVertical, Trash2, Clock, CheckCircle2, Circle, Timer, Camera, ImageIcon, X, RefreshCcw } from 'lucide-react';
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
import { format, isToday, isYesterday } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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
    imageUrl?: string;
}

export default function AdminChatPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { data: chats, loading: chatsLoading } = useCollection<Chat>('chats', undefined, orderBy('lastMessageAt', 'desc'));
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [message, setMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [fullPreviewUrl, setFullPreviewUrl] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const messagesQuery = useMemo(() => 
        selectedChat ? query(collection(firestore, `chats/${selectedChat.id}/messages`), orderBy('createdAt', 'asc')) : null
    , [selectedChat?.id, firestore]);

    const { data: messages, loading: messagesLoading } = useCollection<ChatMessage>(messagesQuery);
    
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'auto' });
            }
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSelectChat = (chat: Chat) => {
        setSelectedChat(chat);
        if (chat.unreadByAdmin) {
            updateDoc(doc(firestore, 'chats', chat.id), { unreadByAdmin: false });
        }
    }

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
        if (!selectedChat || (!message.trim() && !selectedImage)) return;

        const chatRef = doc(firestore, 'chats', selectedChat.id);
        const messagesCol = collection(firestore, `chats/${selectedChat.id}/messages`);
        
        const currentMsg = message;
        const currentImg = selectedImage;
        setMessage('');
        setSelectedImage(null);

        try {
            await addDoc(messagesCol, {
                text: currentMsg,
                imageUrl: currentImg || null,
                senderId: 'admin',
                createdAt: serverTimestamp(),
                isRead: false,
            });
            await updateDoc(chatRef, {
                lastMessage: currentImg ? "📷 Image" : currentMsg,
                lastMessageAt: serverTimestamp(),
                unreadByUser: true,
                unreadByAdmin: false,
            });
        } catch (e) {
            toast({ title: "Failed to send message", variant: "destructive" });
        }
    }

    const handleClearChat = async () => {
        if (!selectedChat) return;

        try {
            const messagesCol = collection(firestore, `chats/${selectedChat.id}/messages`);
            const snapshot = await getDocs(messagesCol);
            
            const batch = writeBatch(firestore);
            snapshot.docs.forEach((doc) => batch.delete(doc.ref));

            const chatDoc = doc(firestore, `chats/${selectedChat.id}`);
            batch.update(chatDoc, {
                lastMessage: 'History cleared by admin',
                lastMessageAt: serverTimestamp(),
                unreadByAdmin: false,
            });

            await batch.commit();
            toast({ title: "Conversation Cleared" });
        } catch (e) {
            toast({ title: "Error", description: "Could not clear chat history.", variant: "destructive" });
        }
    }

    const handleManualRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
            toast({ title: "Chat Refreshed" });
        }, 1000);
    }

    const filteredChats = chats?.filter(chat => 
        chat.userName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderDateSeparator = (date: Date) => {
        let label = format(date, 'dd MMM yyyy');
        if (isToday(date)) label = 'Today';
        else if (isYesterday(date)) label = 'Yesterday';

        return (
            <div className="flex justify-center my-6">
                <span className="px-4 py-1 rounded-full bg-muted text-[10px] font-black uppercase tracking-[2px] text-muted-foreground border border-white/5">
                    {label}
                </span>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[calc(100vh-12rem)] border border-white/5 rounded-3xl overflow-hidden bg-background shadow-2xl">
            {/* Sidebar */}
            <div className="col-span-1 border-r border-white/5 flex flex-col bg-muted/5">
                <div className="p-6 border-b border-white/5 space-y-4 bg-muted/10">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-black uppercase tracking-[3px] text-white/40 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-primary" />
                            Active Nodes
                        </h2>
                        <Badge className="bg-primary/20 text-primary border-primary/20 text-[9px]">{chats?.length || 0}</Badge>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                        <Input 
                            placeholder="Filter users..." 
                            className="pl-10 bg-white/5 border-white/10 rounded-xl h-11 focus:ring-primary text-xs font-bold"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    {chatsLoading ? (
                        <div className="p-4 space-y-4 opacity-20">
                            {[1,2,3,4,5].map(i => <div key={i} className="h-16 w-full bg-white/10 animate-pulse rounded-2xl" />)}
                        </div>
                    ) : filteredChats?.length === 0 ? (
                        <div className="p-12 text-center text-white/10 italic text-sm">No connections found.</div>
                    ) : (
                        filteredChats?.map(chat => (
                            <div 
                                key={chat.id} 
                                onClick={() => handleSelectChat(chat)}
                                className={cn(
                                    "p-4 mx-2 my-1 rounded-2xl cursor-pointer transition-all relative group flex items-center gap-3",
                                    selectedChat?.id === chat.id 
                                        ? "bg-primary/10 border border-primary/20" 
                                        : "hover:bg-white/[0.03] border border-transparent"
                                )}
                            >
                                <div className="relative shrink-0">
                                    <Avatar className="h-10 w-10 rounded-xl border border-white/10">
                                        <AvatarFallback className="bg-white/5 text-[10px] font-black">{chat.userName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    {chat.unreadByAdmin && (
                                        <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full border-2 border-background animate-pulse" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-0.5">
                                        <p className="font-bold text-sm text-white/80 truncate pr-2">{chat.userName}</p>
                                        <span className="text-[9px] text-white/20 font-black uppercase whitespace-nowrap">
                                            {chat.lastMessageAt ? format(chat.lastMessageAt.toDate(), 'HH:mm') : ''}
                                        </span>
                                    </div>
                                    <p className="text-xs text-white/40 truncate italic">"{chat.lastMessage}"</p>
                                </div>
                            </div>
                        ))
                    )}
                </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="col-span-3 flex flex-col relative">
                {selectedChat ? (
                    <>
                        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-card/50 backdrop-blur-md">
                             <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-lg border border-primary/20">
                                    <User className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="font-black text-white uppercase tracking-tight">{selectedChat.userName}</h2>
                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-green-500 uppercase tracking-widest">
                                        <Circle className="fill-current h-1.5 w-1.5 animate-pulse" /> Live Terminal
                                    </div>
                                </div>
                             </div>
                             <div className="flex items-center gap-2">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={handleManualRefresh}
                                    className="rounded-xl border border-white/5 text-white/40 hover:text-white"
                                >
                                    <RefreshCcw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="rounded-xl border border-white/5">
                                            <MoreVertical className="h-5 w-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-2xl bg-[#0a0b14] border-white/10">
                                        <DropdownMenuItem onClick={handleClearChat} className="text-destructive font-black uppercase text-[10px] tracking-widest p-3">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Clear History Node
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                             </div>
                        </div>

                        <ScrollArea className="flex-1 p-8 bg-black/20" ref={scrollAreaRef}>
                            <div className="space-y-1">
                                {messagesLoading ? (
                                    <div className="flex items-center justify-center h-40 opacity-20"><Timer className="animate-spin" /></div>
                                ) : messages?.length === 0 ? (
                                    <div className="text-center py-20 text-white/10 uppercase font-black text-xs tracking-widest">Awaiting Communication</div>
                                ) : (
                                    messages?.map((msg, idx) => {
                                        const prevMsg = messages[idx - 1];
                                        const msgDate = msg.createdAt ? msg.createdAt.toDate() : null;
                                        const prevMsgDate = prevMsg?.createdAt ? prevMsg.createdAt.toDate() : null;
                                        const showDate = !prevMsg || (msgDate && prevMsgDate && format(msgDate, 'yyyyMMdd') !== format(prevMsgDate, 'yyyyMMdd'));
                                        
                                        return (
                                            <div key={msg.id}>
                                                {showDate && msgDate && renderDateSeparator(msgDate)}
                                                <div className={cn(
                                                    "flex flex-col mb-4",
                                                    msg.senderId === 'admin' ? "items-end" : "items-start"
                                                )}>
                                                    <div className={cn(
                                                        "max-w-[70%] rounded-2xl px-5 py-3 shadow-xl relative transition-all hover:scale-[1.01]",
                                                        msg.senderId === 'admin' 
                                                            ? "bg-primary text-primary-foreground rounded-tr-none border border-primary/20" 
                                                            : "bg-white/[0.04] text-white rounded-tl-none border border-white/10"
                                                    )}>
                                                        {msg.imageUrl && (
                                                            <div className="relative aspect-square w-64 mb-2 rounded-xl overflow-hidden cursor-pointer bg-black/5" onClick={() => setFullPreviewUrl(msg.imageUrl!)}>
                                                                <Image src={msg.imageUrl} alt="chat" fill className="object-cover" />
                                                            </div>
                                                        )}
                                                        {msg.text && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                                                        <div className={cn(
                                                            "flex items-center gap-1.5 mt-2 justify-end opacity-40 text-[9px] font-black uppercase",
                                                            msg.senderId === 'admin' ? "text-primary-foreground" : "text-white"
                                                        )}>
                                                            {msg.createdAt ? format(msg.createdAt.toDate(), 'HH:mm') : '...'}
                                                            {msg.senderId === 'admin' && <CheckCircle2 size={10} />}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </ScrollArea>

                        <div className="p-6 border-t border-white/5 bg-card/80 backdrop-blur-xl">
                            {selectedImage && (
                                <div className="mb-4 relative h-24 w-24 rounded-2xl overflow-hidden border-2 border-primary shadow-2xl animate-in zoom-in-95">
                                    <Image src={selectedImage} alt="preview" fill className="object-cover" />
                                    <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 rounded-full shadow-lg" onClick={() => setSelectedImage(null)}>
                                        <X size={12} />
                                    </Button>
                                </div>
                            )}
                            <div className="flex gap-3 max-w-5xl mx-auto bg-black/40 p-2 rounded-2xl border border-white/5 shadow-inner">
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl text-white/40 hover:text-primary mt-auto" onClick={() => fileInputRef.current?.click()}>
                                    <Camera size={20} />
                                </Button>
                                <Textarea 
                                    placeholder="Type your response... (Shift+Enter for new line)" 
                                    className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[50px] max-h-40 resize-none text-sm font-medium py-3 px-4"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                />
                                <Button 
                                    size="icon" 
                                    className="h-12 w-12 rounded-xl bg-primary text-white shadow-2xl hover:scale-105 active:scale-95 transition-all mt-auto" 
                                    onClick={handleSendMessage} 
                                    disabled={!message.trim() && !selectedImage}
                                >
                                    <Send className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center px-8">
                        <div className="h-24 w-24 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-2xl group overflow-hidden">
                            <MessageSquare className="h-10 w-10 text-white/10 group-hover:text-primary transition-all duration-700" />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Support Dashboard</h3>
                        <p className="text-xs text-white/30 max-w-xs mt-2 uppercase font-bold tracking-widest leading-relaxed">Select an active node from the registry to initiate a secure communication session.</p>
                    </div>
                )}
            </div>

            {/* Image Preview Modal */}
            <Dialog open={!!fullPreviewUrl} onOpenChange={() => setFullPreviewUrl(null)}>
                <DialogContent className="max-w-[95vw] h-[90vh] p-0 border-none bg-black/95 rounded-3xl overflow-hidden">
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
