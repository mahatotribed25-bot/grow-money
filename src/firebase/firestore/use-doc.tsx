
'use client';
import { useEffect, useState, useRef } from 'react';
import { doc, onSnapshot, DocumentReference, DocumentData } from 'firebase/firestore';
import { useFirestore } from '../provider';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function useDoc<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetch, setRefetch] = useState(0);
  const firestore = useFirestore();
  
  useEffect(() => {
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }

    const docRef = doc(firestore, path);

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const docData = {
          id: snapshot.id,
          ...snapshot.data(),
        } as T;
        setData(docData);
      } else {
        setData(null);
      }
      setLoading(false);
    }, (error) => {
        const permissionError = new FirestorePermissionError({
            path: path,
            operation: 'get'
        });
        errorEmitter.emit('permission-error', permissionError);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, path, refetch]);

  const refetchData = () => {
    setLoading(true);
    setRefetch(prev => prev + 1);
  }

  return { data, loading, refetch: refetchData };
}
