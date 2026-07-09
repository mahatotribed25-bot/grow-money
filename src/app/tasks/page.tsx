
'use client';
import { useState, useMemo } from 'react';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Home, Briefcase, Trophy, HandCoins, User, Youtube, Facebook, Instagram, Timer, ExternalLink, ClipboardCheck, Sparkles, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Task = {
    id: string;
    title: string;
    description: string;
    reward: number;
    platform: 'YouTube' | 'Facebook' | 'Instagram' | 'Telegram' | 'Other';
    link: string;
    status: 'Active' | 'Hidden';
}

type Submission = {
    taskId: string;
    status: string;
}

export default function UserTasksPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const { data: tasks, loading: tasksLoading } = useCollection<Task>(
        query(collection(firestore, 'tasks'), where('status', '==', 'Active'))
    );

    const { data: mySubmissions } = useCollection<Submission>(
        user ? query(collection(firestore, 'taskSubmissions'), where('userId', '==', user.uid)) : null
    );

    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [proof, setProof] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const completedTaskIds = useMemo(() => {
        return new Set(mySubmissions?.filter(s => s.status !== 'rejected').map(s => s.taskId) || []);
    }, [mySubmissions]);

    const handleSubmitProof = async () => {
        if (!user || !selectedTask || !proof.trim()) return;
        setIsSubmitting(true);

        const subData = {
            userId: user.uid,
            userName: user.displayName || 'Investor',
            taskId: selectedTask.id,
            taskTitle: selectedTask.title,
            reward: selectedTask.reward,
            proofDetails: proof,
            status: 'pending',
            submittedAt: serverTimestamp(),
        };

        try {
            await addDoc(collection(firestore, 'taskSubmissions'), subData);
            toast({ title: "Submission Sent!", description: "Admin will verify your proof shortly." });
            setSelectedTask(null);
            setProof('');
        } catch (e) {
            toast({ title: "Submission Failed", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full flex-col bg-transparent text-foreground relative z-10">
            <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.05] bg-black/40 px-4 backdrop-blur-xl sm:px-6">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white/70">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent flex items-center gap-2">
                    <ClipboardCheck className="text-primary" size={20} /> Work & Earn
                </h1>
                <div className="w-9" />
            </header>

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl mx-auto w-full">
                <Card className="bg-gradient-to-br from-primary/10 via-transparent to-transparent border-primary/20 rounded-3xl overflow-hidden relative group">
                    <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/work/1200/400')] opacity-5 mix-blend-overlay" />
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary animate-pulse">
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <CardTitle className="text-white text-xl">Community Tasks</CardTitle>
                                <CardDescription className="text-white/40">Complete simple social tasks and get paid instantly in your wallet.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <div className="grid gap-4 sm:grid-cols-2">
                    {tasksLoading ? (
                        <div className="col-span-full py-20 flex flex-col items-center gap-3 opacity-20">
                            <Timer className="animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-[4px]">Syncing Task Board</p>
                        </div>
                    ) : tasks?.length === 0 ? (
                        <div className="col-span-full text-center py-20 bg-white/[0.02] border border-dashed border-white/[0.08] rounded-3xl">
                            <p className="text-white/20 text-sm italic">No active tasks available right now.</p>
                        </div>
                    ) : tasks?.map(task => {
                        const isDone = completedTaskIds.has(task.id);
                        return (
                            <Card key={task.id} className={cn(
                                "shadow-2xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl rounded-3xl overflow-hidden transition-all",
                                isDone && "opacity-50 grayscale pointer-events-none"
                            )}>
                                <CardHeader className="pb-3 border-b border-white/[0.05]">
                                    <div className="flex justify-between items-start">
                                        <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] font-black tracking-widest gap-1.5 h-6">
                                            {task.platform === 'YouTube' && <Youtube size={12} className="text-red-500" />}
                                            {task.platform === 'Facebook' && <Facebook size={12} className="text-blue-500" />}
                                            {task.platform === 'Instagram' && <Instagram size={12} className="text-pink-500" />}
                                            {task.platform.toUpperCase()}
                                        </Badge>
                                        <span className="text-lg font-black text-green-400">+₹{task.reward}</span>
                                    </div>
                                    <CardTitle className="text-white/90 text-base mt-3">{task.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <p className="text-xs text-white/40 leading-relaxed line-clamp-2">{task.description}</p>
                                    <Button 
                                        onClick={() => setSelectedTask(task)} 
                                        className="w-full h-11 rounded-xl font-bold bg-white text-black hover:bg-primary hover:text-white"
                                    >
                                        {isDone ? 'Completed' : 'Start Task'}
                                    </Button>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </main>

            <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
                <DialogContent className="bg-[#030408]/95 backdrop-blur-3xl border-white/10 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black tracking-tight">{selectedTask?.title}</DialogTitle>
                        <DialogDescription className="text-white/40 pt-2">{selectedTask?.description}</DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-6 space-y-6">
                        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-[2px] text-primary/60">Step 1: Execute Protocol</p>
                            <Button asChild variant="outline" className="w-full h-12 rounded-xl bg-white text-black font-bold">
                                <a href={selectedTask?.link} target="_blank">
                                    Open Link <ExternalLink size={14} className="ml-2"/>
                                </a>
                            </Button>
                            <p className="text-[9px] text-white/30 italic">Note: Complete the task (Like/Follow/Subscribe) and take a screenshot.</p>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-white/60 text-[10px] font-black uppercase tracking-widest pl-1">Step 2: Submit Proof</Label>
                            <Input 
                                placeholder="Paste Screenshot Link or Username" 
                                value={proof} 
                                onChange={e => setProof(e.target.value)}
                                className="bg-white/5 border-white/10 h-12 rounded-xl"
                            />
                            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
                                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-amber-200/40 leading-relaxed">
                                    Submitting fake proofs will result in a Trust Score penalty and possible account block.
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button 
                            onClick={handleSubmitProof} 
                            disabled={!proof.trim() || isSubmitting}
                            className="w-full h-14 rounded-2xl font-black bg-primary text-white shadow-2xl shadow-primary/20"
                        >
                            {isSubmitting ? "Uploading Node..." : "Finalize Submission"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <nav className="sticky bottom-0 z-20 border-t border-white/[0.05] bg-black/40 backdrop-blur-xl">
                <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-4 text-xs font-medium">
                <BottomNavItem icon={Home} label="Home" href="/dashboard" />
                <BottomNavItem icon={Briefcase} label="Plans" href="/plans" />
                <BottomNavItem icon={Trophy} label="Leaders" href="/leaderboard" />
                <BottomNavItem icon={HandCoins} label="Loans" href="/my-loans" />
                <BottomNavItem icon={User} label="Profile" href="/profile" />
                </div>
            </nav>
        </div>
    );
}

function BottomNavItem({ icon: Icon, label, href, active = false }: { icon: React.ElementType, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={cn(
        "flex flex-col items-center justify-center gap-1 transition-all h-full relative",
        active ? 'text-primary scale-110' : 'text-white/40 hover:text-white/60'
    )}>
      <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]")} />
      <span className="text-[10px] tracking-tight">{label}</span>
      {active && <div className="absolute -bottom-1 h-1 w-8 bg-primary rounded-full blur-[2px]" />}
    </Link>
  );
}
