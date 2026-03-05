
'use client';
import { useState, useEffect, useRef } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import type { Timestamp } from 'firebase/firestore';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, setDoc, updateDoc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, User } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
    const { data: chats, loading: chatsLoading } = useCollection<Chat>('chats', undefined, orderBy('lastMessageAt', 'desc'));
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [message, setMessage] = useState('');
    
    const messagesQuery = selectedChat ? query(collection(firestore, `chats/${selectedChat.id}/messages`), orderBy('createdAt', 'asc')) : null;
    const { data: messages, loading: messagesLoading } = useCollection<ChatMessage>(messagesQuery);
    
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
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
            unreadByUser: true, // User has not read the admin's message yet
            unreadByAdmin: false, // Admin just sent it, so it's read by admin
        };

        try {
            await addDoc(messagesCol, messageData);
            await setDoc(chatDoc, chatData, { merge: true });
            setMessage('');
        } catch (e) {
            console.error(e);
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-8rem)]">
            <div className="col-span-1 border rounded-lg overflow-hidden flex flex-col">
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold">User Chats</h2>
                </div>
                <ScrollArea className="h-full">
                    {chatsLoading ? <p className="p-4">Loading chats...</p> : (
                        chats?.map(chat => (
                            <div 
                                key={chat.id} 
                                onClick={() => handleSelectChat(chat)}
                                className={cn(
                                    "p-4 border-b cursor-pointer hover:bg-muted/50",
                                    selectedChat?.id === chat.id && "bg-muted"
                                )}
                            >
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold">{chat.userName}</p>
                                    {chat.unreadByAdmin && <Badge>New</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {chat.lastMessageAt?.toDate().toLocaleTimeString()}
                                </p>
                            </div>
                        ))
                    )}
                </ScrollArea>
            </div>
            <div className="col-span-2 border rounded-lg flex flex-col">
                {selectedChat ? (
                    <>
                        <div className="p-4 border-b flex items-center gap-2">
                             <User className="h-6 w-6" />
                             <h2 className="text-xl font-bold">{selectedChat.userName}</h2>
                        </div>
                        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                            <div className="space-y-4">
                                {messagesLoading ? <p>Loading messages...</p> : messages?.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.senderId === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`rounded-lg px-3 py-2 max-w-xs ${msg.senderId === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                            <p className="text-sm">{msg.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        <div className="p-4 border-t flex gap-2">
                            <Input 
                                placeholder="Type a message..." 
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <Button size="icon" onClick={handleSendMessage}><Send /></Button>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">Select a chat to view messages</p>
                    </div>
                )}
            </div>
        </div>
    )
}
