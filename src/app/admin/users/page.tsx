
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
import { Eye, Trash2 } from 'lucide-react';
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

  const filteredUsers = users?.filter(user => user.email !== ADMIN_EMAIL);

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
        console.error('Error deleting user:', error);
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
    <div>
      <h2 className="text-2xl font-bold mb-4">User Management</h2>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Wallet Balance</TableHead>
              <TableHead>Account Status</TableHead>
              <TableHead>Online Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>₹{(user.walletBalance || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={user.status !== 'Blocked' ? 'default' : 'destructive'}>
                      {user.status || 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${isUserOnline(user) ? 'bg-green-500' : 'bg-gray-500'}`} />
                        <span>{isUserOnline(user) ? 'Online' : 'Offline'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button asChild variant="ghost" size="icon">
                      <Link href={`/admin/users/${user.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                     <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setSelectedUser(user)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure you want to delete this user?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the user account and remove their data from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setSelectedUser(null)}>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteUser}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
