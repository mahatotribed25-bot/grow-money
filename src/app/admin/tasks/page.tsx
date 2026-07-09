
'use client';
import { useState } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Edit, Trash2, Youtube, Facebook, Instagram, Globe, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Task = {
    id: string;
    title: string;
    description: string;
    reward: number;
    platform: 'YouTube' | 'Facebook' | 'Instagram' | 'Telegram' | 'Other';
    link: string;
    status: 'Active' | 'Hidden';
    totalStock: number;
    remainingStock: number;
    createdAt: Timestamp;
}

const emptyTask: Omit<Task, 'id' | 'createdAt' | 'remainingStock'> = {
    title: '',
    description: '',
    reward: 5,
    platform: 'YouTube',
    link: '',
    status: 'Active',
    totalStock: 100
};

export default function AdminTasksPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { data: tasks, loading } = useCollection<Task>('tasks');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);

    const handleCreateNew = () => {
        setEditingTask(emptyTask);
        setIsDialogOpen(true);
    };

    const handleEdit = (task: Task) => {
        setEditingTask(task);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteDoc(doc(firestore, 'tasks', id));
            toast({ title: "Task Deleted" });
        } catch (e) {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const handleSave = async () => {
        if (!editingTask?.title || !editingTask?.reward || editingTask?.totalStock === undefined) return;

        const taskData = {
            ...editingTask,
            reward: Number(editingTask.reward),
            totalStock: Number(editingTask.totalStock),
        };

        try {
            if (editingTask.id) {
                const { id, ...data } = taskData;
                await updateDoc(doc(firestore, 'tasks', id), data);
                toast({ title: "Task Updated" });
            } else {
                await addDoc(collection(firestore, 'tasks'), {
                    ...taskData,
                    remainingStock: Number(editingTask.totalStock),
                    createdAt: serverTimestamp(),
                });
                toast({ title: "Task Created Successfully" });
            }
            setIsDialogOpen(false);
            setEditingTask(null);
        } catch (e) {
            toast({ title: "Save Failed", variant: "destructive" });
        }
    };

    const getPlatformIcon = (platform: string) => {
        switch(platform) {
            case 'YouTube': return <Youtube size={14} className="text-red-500" />;
            case 'Facebook': return <Facebook size={14} className="text-blue-500" />;
            case 'Instagram': return <Instagram size={14} className="text-pink-500" />;
            default: return <Globe size={14} className="text-white/40" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">Earn Tasks Engine</h2>
                    <p className="text-sm text-white/40">Create daily work opportunities with stock limits.</p>
                </div>
                <Button onClick={handleCreateNew} className="bg-white text-black hover:bg-primary hover:text-white font-bold rounded-xl">
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Task
                </Button>
            </div>

            <Card className="bg-white/[0.03] border-white/[0.08] backdrop-blur-xl rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-white/[0.02]">
                            <TableRow className="border-white/10">
                                <TableHead className="text-white/30 text-[10px] uppercase font-black pl-6">Platform</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-black">Title</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-black">Reward</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-black">Stock</TableHead>
                                <TableHead className="text-white/30 text-[10px] uppercase font-black text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-20 opacity-20">Syncing Tasks...</TableCell></TableRow>
                            ) : tasks?.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-20 text-white/10 italic">No tasks created yet.</TableCell></TableRow>
                            ) : tasks?.map((task) => (
                                <TableRow key={task.id} className="border-white/[0.03] hover:bg-white/[0.01]">
                                    <TableCell className="pl-6">
                                        <Badge variant="outline" className="gap-1.5 border-white/5 text-[10px] h-6">
                                            {getPlatformIcon(task.platform)}
                                            {task.platform}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-bold text-white/80">{task.title}</TableCell>
                                    <TableCell className="font-black text-green-400">₹{task.reward}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-white/60">{task.remainingStock} / {task.totalStock} left</span>
                                            <div className="h-1 w-20 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary" style={{width: `${(task.remainingStock / task.totalStock) * 100}%`}} />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(task)} className="h-8 w-8 hover:bg-white/10"><Edit size={14}/></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(task.id)} className="h-8 w-8 text-red-500/40 hover:text-red-500 hover:bg-red-500/10"><Trash2 size={14}/></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-[#030408]/90 backdrop-blur-2xl border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>{editingTask?.id ? 'Modify Task' : 'New Task Protocol'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-white/60">Platform</Label>
                                <Select value={editingTask?.platform} onValueChange={(v: any) => setEditingTask({...editingTask, platform: v})}>
                                    <SelectTrigger className="bg-white/5 border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#030408] border-white/10">
                                        <SelectItem value="YouTube">YouTube</SelectItem>
                                        <SelectItem value="Facebook">Facebook</SelectItem>
                                        <SelectItem value="Instagram">Instagram</SelectItem>
                                        <SelectItem value="Telegram">Telegram</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white/60">Reward (INR)</Label>
                                <Input type="number" value={editingTask?.reward} onChange={e => setEditingTask({...editingTask, reward: Number(e.target.value)})} className="bg-white/5 border-white/10" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-white/60">Total Stock (Slots)</Label>
                                <Input type="number" value={editingTask?.totalStock} onChange={e => setEditingTask({...editingTask, totalStock: Number(e.target.value)})} className="bg-white/5 border-white/10" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white/60">Status</Label>
                                <Select value={editingTask?.status} onValueChange={(v: any) => setEditingTask({...editingTask, status: v})}>
                                    <SelectTrigger className="bg-white/5 border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#030408] border-white/10">
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Hidden">Hidden</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-white/60">Task Title</Label>
                            <Input value={editingTask?.title} onChange={e => setEditingTask({...editingTask, title: e.target.value})} className="bg-white/5 border-white/10" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-white/60">Description / Instructions</Label>
                            <Textarea value={editingTask?.description} onChange={e => setEditingTask({...editingTask, description: e.target.value})} className="bg-white/5 border-white/10 h-24" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-white/60">Target URL (Link)</Label>
                            <Input value={editingTask?.link} onChange={e => setEditingTask({...editingTask, link: e.target.value})} className="bg-white/5 border-white/10" />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost" className="text-white/40">Cancel</Button></DialogClose>
                        <Button onClick={handleSave} className="rounded-xl font-bold bg-primary text-white px-8">Confirm Protocol</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
