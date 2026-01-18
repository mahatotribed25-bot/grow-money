
'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCollection, useFirestore } from '@/firebase';
import { useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Timestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type Announcement = {
  id: string;
  message: string;
  link?: string;
  createdAt: Timestamp;
};

const emptyAnnouncement: Omit<Announcement, 'id' | 'createdAt'> = {
  message: '',
  link: '',
};

export default function AnnouncementsPage() {
  const { data: announcements, loading } = useCollection<Announcement>('announcements');
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Partial<Announcement> | null>(null);

  const handleCreateNew = () => {
    setEditingAnnouncement(emptyAnnouncement);
    setIsDialogOpen(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setIsDialogOpen(true);
  };

  const handleDelete = (announcementId: string) => {
    const docRef = doc(firestore, 'announcements', announcementId);
    deleteDoc(docRef)
      .then(() => {
        toast({ title: 'Announcement deleted successfully' });
      })
      .catch((error) => {
        console.error('Error deleting announcement: ', error);
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleSave = () => {
    if (!editingAnnouncement || !editingAnnouncement.message) {
      toast({ title: 'Message is required', variant: 'destructive' });
      return;
    }

    const { id, ...annData } = editingAnnouncement;

    if (id) {
      // Update existing
      const docRef = doc(firestore, 'announcements', id);
      updateDoc(docRef, annData)
        .then(() => {
          toast({ title: 'Announcement updated successfully' });
          setIsDialogOpen(false);
          setEditingAnnouncement(null);
        })
        .catch((error) => {
          console.error('Error updating announcement: ', error);
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: annData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    } else {
      // Create new
      const collectionRef = collection(firestore, 'announcements');
      const dataToCreate = {
        ...annData,
        createdAt: serverTimestamp(),
      };
      addDoc(collectionRef, dataToCreate)
        .then(() => {
          toast({ title: 'Announcement created successfully' });
          setIsDialogOpen(false);
          setEditingAnnouncement(null);
        })
        .catch((error) => {
          console.error('Error creating announcement: ', error);
          const permissionError = new FirestorePermissionError({
            path: collectionRef.path,
            operation: 'create',
            requestResourceData: dataToCreate,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    }
  };

  const handleFieldChange = (field: keyof Omit<Announcement, 'id' | 'createdAt'>, value: any) => {
    if (!editingAnnouncement) return;
    setEditingAnnouncement({ ...editingAnnouncement, [field]: value });
  };
  
  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleString();
  };

  const sortedAnnouncements = announcements?.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Announcements</h2>
        <Button onClick={handleCreateNew}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Create New Announcement
        </Button>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Message</TableHead>
              <TableHead>Link</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : (
              sortedAnnouncements?.map((ann) => (
                <TableRow key={ann.id}>
                  <TableCell className="max-w-xs truncate">{ann.message}</TableCell>
                  <TableCell className="max-w-xs truncate">{ann.link || 'None'}</TableCell>
                  <TableCell>{formatDate(ann.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(ann)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleDelete(ann.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement && 'id' in editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="message" className="text-right">
                Message
              </Label>
              <Textarea
                id="message"
                value={editingAnnouncement?.message || ''}
                onChange={(e) => handleFieldChange('message', e.target.value)}
                className="col-span-3"
                placeholder="Enter the announcement message"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="link" className="text-right">
                Link (Optional)
              </Label>
              <Input
                id="link"
                value={editingAnnouncement?.link || ''}
                onChange={(e) =>
                  handleFieldChange('link', e.target.value)
                }
                className="col-span-3"
                placeholder="https://example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => { setIsDialogOpen(false); setEditingAnnouncement(null); }}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave}>Save Announcement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
