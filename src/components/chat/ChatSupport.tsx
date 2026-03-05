
'use client';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, orderBy, query, doc, setDoc } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { ScrollArea } from '../ui/scroll-area';

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
    
    const messagesQuery = user ? query(collection(firestore, `chats/${user.uid}/messages`), orderBy('createdAt', 'asc')) : null;
    const { data: messages, loading } = useCollection<ChatMessage>(messagesQuery);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && scrollAreaRef.current) {
            setTimeout(() => {
                scrollAreaRef.current?.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
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

    if (!user) return null;

    return (
        <>
            <div className="fixed bottom-6 right-6 z-50">
                <Button size="icon" className="rounded-full w-14 h-14 shadow-lg" onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? <X /> : <MessageSquare />}
                </Button>
            </div>
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 animate-in fade-in-0 slide-in-from-bottom-10">
                    <Card className="w-80 h-[28rem] flex flex-col shadow-2xl">
                        <CardHeader>
                            <CardTitle>Support Chat</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden p-4 pt-0">
                            <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
                                <div className="space-y-4">
                                    {loading ? <p className="text-center text-muted-foreground">Loading messages...</p> : messages?.map(msg => (
                                        <div key={msg.id} className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`rounded-lg px-3 py-2 max-w-xs ${msg.senderId === user.uid ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                                <p className="text-sm">{msg.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                            <div className="flex gap-2 pt-2 border-t">
                                <Input 
                                    placeholder="Type a message..." 
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                />
                                <Button size="icon" onClick={handleSendMessage} disabled={!message.trim()}><Send /></Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
}
