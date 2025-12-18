'use client';
import { useEffect, useState, useRef } from 'react';
import { doc, onSnapshot, DocumentReference, DocumentData } from 'firebase/firestore';
import { useFirestore } from '../provider';

export function useDoc<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
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
        console.error("Error fetching document:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, path]);

  return { data, loading };
}
