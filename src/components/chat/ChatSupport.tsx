'use client';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, X, Trash2, MoreVertical, Circle, Clock, Camera, ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, orderBy, query, doc, setDoc, getDocs, writeBatch } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { ScrollArea } from '../ui/scroll-area';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import Image from 'next/image';
import { Dialog, DialogContent } from '@/components/ui/dialog';

type ChatMessage = {
    id: string;
    text: string;
    senderId: string;
    createdAt: Timestamp;
    imageUrl?: string;
}

export function ChatSupportWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [fullPreviewUrl, setFullPreviewUrl] = useState<string | null>(null);
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const messagesQuery = user ? query(collection(firestore, `chats/${user.uid}/messages`), orderBy('createdAt', 'asc')) : null;
    const { data: messages, loading } = useCollection<ChatMessage>(messagesQuery);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
            }
        }
    };

    useEffect(() => {
        if (isOpen) {
            setTimeout(scrollToBottom, 100);
        }
    }, [messages, isOpen]);
    
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
        if (!user || (!message.trim() && !selectedImage)) return;
        
        const messagesCol = collection(firestore, `chats/${user.uid}/messages`);
        const chatDoc = doc(firestore, `chats/${user.uid}`);
        
        const currentMsg = message;
        const currentImg = selectedImage;
        setMessage('');
        setSelectedImage(null);

        try {
            await addDoc(messagesCol, {
                text: currentMsg,
                imageUrl: currentImg || null,
                senderId: user.uid,
                createdAt: serverTimestamp(),
                isRead: false,
            });
            await setDoc(chatDoc, {
                userId: user.uid,
                userName: user.displayName,
                lastMessage: currentImg ? "📷 Image" : currentMsg,
                lastMessageAt: serverTimestamp(),
                unreadByAdmin: true,
                unreadByUser: false,
            }, { merge: true });
        } catch (e) {
            console.error(e);
            toast({ title: "Failed to send message", variant: "destructive" });
        }
    }

    const handleClearChat = async () => {
        if (!user) return;

        try {
            const messagesCol = collection(firestore, `chats/${user.uid}/messages`);
            const snapshot = await getDocs(messagesCol);
            const batch = writeBatch(firestore);
            snapshot.docs.forEach((doc) => batch.delete(doc.ref));

            const chatDoc = doc(firestore, `chats/${user.uid}`);
            batch.update(chatDoc, {
                lastMessage: 'Chat history cleared',
                lastMessageAt: serverTimestamp(),
                unreadByAdmin: false,
                unreadByUser: false,
            });

            await batch.commit();
            toast({ title: "Chat Cleared" });
        } catch (e) {
            toast({ title: "Error clearing chat", variant: "destructive" });
        }
    }

    if (!user) return null;

    const renderDateSeparator = (date: Date) => {
        let label = format(date, 'dd MMMM yyyy');
        if (isToday(date)) label = 'Today';
        else if (isYesterday(date)) label = 'Yesterday';

        return (
            <div className="flex justify-center my-4">
                <span className="px-3 py-1 rounded-full bg-muted text-[10px] font-black uppercase tracking-widest text-muted-foreground border">
                    {label}
                </span>
            </div>
        );
    };

    return (
        <>
            <div className="fixed bottom-6 right-6 z-50">
                <Button size="icon" className="rounded-full w-14 h-14 shadow-2xl hover:scale-105 transition-transform bg-primary text-white" onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
                </Button>
            </div>
            
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-10 sm:w-96 w-[calc(100vw-3rem)]">
                    <Card className="h-[34rem] flex flex-col shadow-2xl border-primary/20 overflow-hidden bg-background/95 backdrop-blur-xl rounded-[2rem]">
                        <CardHeader className="bg-primary text-primary-foreground py-4 px-4 flex flex-row items-center justify-between space-y-0 shadow-lg">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center font-black text-lg border border-white/10 shadow-inner">
                                        GM
                                    </div>
                                    <Circle className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 fill-green-500 stroke-primary text-green-500 animate-pulse" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-black tracking-tight">Support Desk</CardTitle>
                                    <p className="text-[10px] text-primary-foreground/70 uppercase tracking-widest font-black">Secure Tunnel</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-white/10 rounded-lg">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl">
                                        <DropdownMenuItem onClick={handleClearChat} className="text-destructive font-bold">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Clear Chat History
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-white/10 rounded-lg" onClick={() => setIsOpen(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="flex-1 flex flex-col gap-0 overflow-hidden p-0 bg-muted/5">
                            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                                <div className="space-y-1">
                                    {messages?.length === 0 ? (
                                        <div className="text-center py-20 space-y-4">
                                            <div className="h-16 w-16 rounded-3xl bg-primary/5 flex items-center justify-center mx-auto border border-dashed border-primary/20">
                                                <MessageSquare className="text-primary/40 h-8 w-8" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-black uppercase text-muted-foreground tracking-widest">Protocol Start</p>
                                                <p className="text-xs text-muted-foreground/60 max-w-[200px] mx-auto">Hello! How can we assist with your wealth building today?</p>
                                            </div>
                                        </div>
                                    ) : messages?.map((msg, idx) => {
                                        const prevMsg = messages[idx - 1];
                                        const msgDate = msg.createdAt?.toDate();
                                        const prevMsgDate = prevMsg?.createdAt?.toDate();
                                        const showDate = !prevMsg || (msgDate && prevMsgDate && format(msgDate, 'yyyyMMdd') !== format(prevMsgDate, 'yyyyMMdd'));
                                        
                                        return (
                                            <div key={msg.id}>
                                                {showDate && msgDate && renderDateSeparator(msgDate)}
                                                <div className={cn(
                                                    "flex flex-col mb-2",
                                                    msg.senderId === user.uid ? "items-end" : "items-start"
                                                )}>
                                                    <div className={cn(
                                                        "rounded-2xl px-4 py-2.5 max-w-[85%] text-sm shadow-sm transition-all hover:shadow-md",
                                                        msg.senderId === user.uid 
                                                            ? "bg-primary text-primary-foreground rounded-tr-none" 
                                                            : "bg-card text-foreground rounded-tl-none border border-border/50"
                                                    )}>
                                                        {msg.imageUrl && (
                                                            <div className="relative aspect-square w-48 mb-2 rounded-xl overflow-hidden cursor-pointer bg-black/5" onClick={() => setFullPreviewUrl(msg.imageUrl!)}>
                                                                <Image src={msg.imageUrl} alt="chat" fill className="object-cover" />
                                                            </div>
                                                        )}
                                                        {msg.text && <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                                                        <div className={cn(
                                                            "flex items-center gap-1 mt-1 opacity-50 justify-end",
                                                            msg.senderId === user.uid ? "text-primary-foreground" : "text-muted-foreground"
                                                        )}>
                                                            <span className="text-[9px] font-bold">
                                                                {msg.createdAt ? format(msg.createdAt.toDate(), 'HH:mm') : '...'}
                                                            </span>
                                                            {msg.senderId === user.uid && <Clock size={8} />}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                            
                            <div className="p-4 bg-background border-t space-y-3">
                                {selectedImage && (
                                    <div className="relative h-20 w-20 rounded-xl overflow-hidden border-2 border-primary animate-in zoom-in-95">
                                        <Image src={selectedImage} alt="preview" fill className="object-cover" />
                                        <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-5 w-5 rounded-full" onClick={() => setSelectedImage(null)}>
                                            <X size={10} />
                                        </Button>
                                    </div>
                                )}
                                <div className="flex items-end gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border/50">
                                    <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={handleFileChange} />
                                    <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-muted-foreground hover:text-primary rounded-xl" onClick={() => fileInputRef.current?.click()}>
                                        <Camera size={18} />
                                    </Button>
                                    <Textarea 
                                        placeholder="Type your query..." 
                                        className="min-h-[44px] max-h-32 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none p-2 text-sm"
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
                                        className="rounded-xl h-10 w-10 shrink-0 bg-primary text-white shadow-lg hover:scale-105 transition-transform" 
                                        onClick={handleSendMessage} 
                                        disabled={!message.trim() && !selectedImage}
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Image Preview Modal */}
            <Dialog open={!!fullPreviewUrl} onOpenChange={() => setFullPreviewUrl(null)}>
                <DialogContent className="max-w-[95vw] h-[80vh] p-0 border-none bg-black/95 rounded-3xl overflow-hidden">
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                        {fullPreviewUrl && <Image src={fullPreviewUrl} alt="full" fill className="object-contain" />}
                        <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white" onClick={() => setFullPreviewUrl(null)}>
                            <X />
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}