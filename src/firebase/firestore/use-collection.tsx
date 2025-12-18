'use client';
import { useEffect, useState, useRef } from 'react';
import {
  collection,
  query,
  onSnapshot,
  Query,
  DocumentData,
  where,
  QueryConstraint
} from 'firebase/firestore';
import { useFirestore } from '../provider';

export function useCollection<T>(path: string | null, ...queryConstraints: QueryConstraint[]) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const firestore = useFirestore();
  
  useEffect(() => {
    if (!path) {
      setData([]);
      setLoading(false);
      return;
    }

    const collectionRef = collection(firestore, path);
    const q = query(collectionRef, ...queryConstraints);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as T[];
      setData(docs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching collection: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore, path, ...queryConstraints.map(c => c.type + ('_field' in c ? c._field.toString() + c._op + c._value : ''))]);

  return { data, loading };
}
