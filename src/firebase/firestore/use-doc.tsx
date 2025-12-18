'use client';
import { useEffect, useState, useRef } from 'react';
import { doc, onSnapshot, DocumentReference, DocumentData } from 'firebase/firestore';
import { useFirestore } from '../provider';

export function useDoc<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const firestore = useFirestore();
  const ref = useRef<DocumentReference<DocumentData> | null>(null);

  useEffect(() => {
    ref.current = doc(firestore, path);

    const unsubscribe = onSnapshot(ref.current, (snapshot) => {
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
    });

    return () => unsubscribe();
  }, [firestore, path]);

  return { data, loading };
}
