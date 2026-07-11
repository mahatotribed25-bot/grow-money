
'use client';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import { doc, runTransaction, serverTimestamp, orderBy, Timestamp, collection } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Timer, ExternalLink, User, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type Submission = {
    id: string;
    userId: string;
    userName: string;
    taskId: string;
    taskTitle: string;
    reward: number;
    proofDetails: string;
    status: 'pending' | 'approved' | 'rejected';
    submittedAt: Timestamp;
}

type SubmitterData = {
    photoURL?: string;
}

export default function AdminTaskSubmissionsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { data: submissions, loading } = useCollection<Submission>('taskSubmissions', undefined, orderBy('submittedAt', 'desc'));

    const [isRejectOpen, setIsRejectOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleAction = async (sub: Submission, action: 'approved' | 'rejected') => {
        if (action === 'rejected' && !rejectionReason) {
            setSelectedSub(sub);
            setIsRejectOpen(true);
            return;
        }

        setProcessingId(sub.id);
        try {
            await runTransaction(firestore, async (transaction) => {
                const subRef = doc(firestore, 'taskSubmissions', sub.id);
                const userRef = doc(firestore, 'users', sub.userId);
                const taskRef = doc(firestore, 'tasks', sub.taskId);
                
                const userDoc = await transaction.get(userRef);
                const taskDoc = await transaction.get(taskRef);

                if (!userDoc.exists()) throw new Error("User not found");

                if (action === 'approved') {
                    const currentBalance = userDoc.data().walletBalance || 0;
                    const currentIncome = userDoc.data().totalIncome || 0;
                    const currentTrust = userDoc.data().trustScore || 500;

                    // Update User Wallet & Stats & Trust Score
                    transaction.update(userRef, {
                        walletBalance: currentBalance + sub.reward,
                        totalIncome: currentIncome + sub.reward,
                        trustScore: Math.min(900, currentTrust + 5)
                    });

                    // Add to History
                    const historyRef = doc(collection(firestore, `users/${sub.userId}/walletHistory`));
                    transaction.set(historyRef, {
                        amount: sub.reward,
                        type: 'credit',
                        category: 'Work Reward',
                        description: `Completed task: ${sub.taskTitle}`,
                        createdAt: serverTimestamp()
                    });
                } else {
                    // If rejected, increment the remaining stock back
                    if (taskDoc.exists()) {
                        const currentStock = taskDoc.data().remainingStock || 0;
                        transaction.update(taskRef, { remainingStock: currentStock + 1 });
                    }
                }

                transaction.update(subRef, {
                    status: action,
                    reviewedAt: serverTimestamp(),
                    rejectionReason: action === 'rejected' ? rejectionReason : ''
                });
            });

            toast({ title: action === 'approved' ? "Submission Verified" : "Submission Rejected" });
            setIsRejectOpen(false);
            setRejectionReason('');
        } catch (e: any) {
            console.error(e);
            toast({ title: "Action Failed", description: e.message || "Could not process request.", variant: "destructive" });
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white">Work Verification Terminal</h2>
                <p className="text-sm text-white/40">Review user proofs and authorize reward distributions.</p>
            </div>

            <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-white/[0.02]">
                            <TableRow className="border-white/10">
                                <TableHead className="text-white/30 text-[10px] uppercase font-black pl-6">Investor</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-black">Task Name</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-black">Proof Detail</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-black">Reward</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-black text-right pr-6">Decision</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-20 opacity-20"><Timer className="animate-spin mx-auto"/></TableCell></TableRow>
                            ) : !submissions || submissions.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-20 text-white/10 italic">No submissions pending review.</TableCell></TableRow>
                            ) : submissions.map(sub => (
                                <SubmissionRow key={sub.id} sub={sub} processingId={processingId} onAction={handleAction} />
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
                <DialogContent className="bg-[#030408] border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>State Reason for Denial</DialogTitle>
                        <DialogDescription className="text-white/40">Let the user know why their submission was rejected.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="e.g. Proof link invalid or image blurry..." className="bg-white/5 border-white/10" />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => { setIsRejectOpen(false); setRejectionReason(''); }}>Cancel</Button>
                        <Button variant="destructive" onClick={() => selectedSub && handleAction(selectedSub, 'rejected')} disabled={!rejectionReason || processingId !== null}>
                            {processingId ? <Loader2 className="animate-spin h-3 w-3 mr-2" /> : null}
                            Confirm Denial
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function SubmissionRow({ sub, processingId, onAction }: { sub: Submission, processingId: string | null, onAction: (sub: Submission, action: 'approved' | 'rejected') => void }) {
    const { data: submitter } = useDoc<SubmitterData>(`users/${sub.userId}`);

    return (
        <TableRow className="border-white/[0.03] hover:bg-white/[0.01]">
            <TableCell className="pl-6 py-4">
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-white/10">
                        <AvatarImage src={submitter?.photoURL} />
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black uppercase">
                            {sub.userName?.charAt(0) || 'U'}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-sm font-bold text-white/80">{sub.userName}</p>
                        <p className="text-[10px] text-white/40 font-black">{new Date(sub.submittedAt.seconds * 1000).toLocaleString()}</p>
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-sm font-medium text-white/60">{sub.taskTitle}</TableCell>
            <TableCell className="max-w-[200px]">
                <div className="flex items-center gap-2">
                    <p className="text-xs text-white/40 truncate">{sub.proofDetails}</p>
                    <a href={sub.proofDetails} target="_blank" className="text-primary hover:text-white shrink-0"><ExternalLink size={12}/></a>
                </div>
            </TableCell>
            <TableCell className="font-black text-green-400">₹{sub.reward}</TableCell>
            <TableCell className="text-right pr-6">
                {sub.status === 'pending' ? (
                    <div className="flex justify-end gap-2">
                        <Button 
                            size="sm" 
                            onClick={() => onAction(sub, 'approved')} 
                            disabled={processingId === sub.id}
                            className="bg-green-600 hover:bg-green-700 h-8 rounded-lg px-4 font-bold text-[10px]"
                        >
                            {processingId === sub.id ? <Loader2 className="animate-spin h-3 w-3" /> : "VERIFY"}
                        </Button>
                        <Button 
                            size="sm" 
                            onClick={() => onAction(sub, 'rejected')} 
                            disabled={processingId === sub.id}
                            variant="destructive" 
                            className="h-8 rounded-lg px-4 font-bold text-[10px]"
                        >
                            DENY
                        </Button>
                    </div>
                ) : (
                    <Badge className={cn("text-[9px] uppercase", sub.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')}>{sub.status}</Badge>
                )}
            </TableCell>
        </TableRow>
    )
}
