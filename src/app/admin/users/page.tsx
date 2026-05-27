'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Trash2, Search, User as UserIcon } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type User = {
  id: string;
  name: string;
  email: string;
  walletBalance?: number;
  status?: 'Active' | 'Blocked';
  isOnline?: boolean;
  lastSeen?: Timestamp;
};

const ADMIN_EMAIL = "admin@tribed.world";

export default function UsersPage() {
  const { data: users, loading } = useCollection<User>('users');
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users?.filter(user => 
    user.email !== ADMIN_EMAIL && 
    (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
     user.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDeleteUser = () => {
    if (!selectedUser) return;
    
    const userRef = doc(firestore, 'users', selectedUser.id);
    deleteDoc(userRef)
      .then(() => {
        toast({
          title: 'User Deleted',
          description: `User ${selectedUser.name} has been successfully deleted.`,
        });
        setSelectedUser(null);
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };
  
  const isUserOnline = (user: User) => {
    if (!user.isOnline || !user.lastSeen) return false;
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return user.lastSeen.toMillis() > fiveMinutesAgo;
  };


  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-white">User Management</h2>
        <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
            <Input 
                placeholder="Search users..." 
                className="pl-10 bg-white/[0.03] border-white/10 rounded-xl focus:ring-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
      </div>

      <Card className="shadow-2xl border-white/[0.08] bg-white/[0.03] backdrop-blur-xl rounded-2xl overflow-hidden">
        <CardContent className="p-0">
            <div className="rounded-lg">
                <Table>
                <TableHeader className="bg-white/[0.02]">
                    <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest pl-6">User</TableHead>
                    <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Wallet</TableHead>
                    <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Account</TableHead>
                    <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Activity</TableHead>
                    <TableHead className="text-white/30 text-[10px] uppercase font-bold tracking-widest pr-6">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                    <TableRow className="border-transparent">
                        <TableCell colSpan={5} className="text-center py-20">
                            <p className="text-white/20 animate-pulse uppercase tracking-widest text-xs font-bold">Syncing Database...</p>
                        </TableCell>
                    </TableRow>
                    ) : (
                    filteredUsers?.map((user) => (
                        <TableRow key={user.id} className="border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <TableCell className="pl-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <UserIcon size={18} className="text-primary" />
                                </div>
                                <div>
                                    <p className="font-bold text-white tracking-tight leading-none">{user.name}</p>
                                    <p className="text-[10px] text-white/30 font-medium mt-1">{user.email}</p>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-white">₹{(user.walletBalance || 0).toFixed(2)}</TableCell>
                        <TableCell>
                            <Badge variant={user.status !== 'Blocked' ? 'default' : 'destructive'} className={cn(
                                "rounded-lg text-[10px] font-bold uppercase",
                                user.status === 'Blocked' ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-primary/20 text-primary border-primary/30"
                            )}>
                            {user.status || 'Active'}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${isUserOnline(user) ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-white/20'}`} />
                                <span className={cn("text-[10px] font-bold uppercase tracking-tight", isUserOnline(user) ? "text-green-500" : "text-white/20")}>
                                    {isUserOnline(user) ? 'Live' : 'Away'}
                                </span>
                            </div>
                        </TableCell>
                        <TableCell className="pr-6">
                            <div className="flex gap-1">
                                <Button asChild variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 rounded-lg text-white/60">
                                <Link href={`/admin/users/${user.id}`}>
                                    <Eye className="h-4 w-4" />
                                </Link>
                                </Button>
                                <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg" onClick={() => setSelectedUser(user)}>
                                    <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-[#030408] border-white/10 backdrop-blur-2xl">
                                    <AlertDialogHeader>
                                    <AlertDialogTitle className="text-white">Terminate User Data?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-white/40">
                                        This action is irreversible. It will permanently purge all cloud data for this user account.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setSelectedUser(null)} className="border-white/10 bg-transparent text-white hover:bg-white/5">Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90 text-white">Confirm Deletion</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </TableCell>
                        </TableRow>
                    ))
                    )}
                    {!loading && filteredUsers?.length === 0 && (
                        <TableRow className="border-transparent">
                            <TableCell colSpan={5} className="text-center py-20 text-white/20 italic">No users matching search.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
