'use client';
import { useEffect, useState } from 'react';
import {
  collection,
  query,
  onSnapshot,
  Query,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { useFirestore } from '../provider';

export function useCollection<T>(pathOrQuery: string | Query | null, ...queryConstraints: QueryConstraint[]) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const firestore = useFirestore();
  
  // Basic serialization for the query to use in dependency array
  const queryKey = typeof pathOrQuery === 'string' 
      ? pathOrQuery 
      : pathOrQuery ? pathOrQuery.path + JSON.stringify(pathOrQuery) : 'null';

  useEffect(() => {
    if (!pathOrQuery) {
      setData([]);
      setLoading(false);
      return;
    }

    let q: Query<DocumentData>;
    if (typeof pathOrQuery === 'string') {
        q = query(collection(firestore, pathOrQuery), ...queryConstraints);
    } else {
        q = pathOrQuery;
    }


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
  }, [firestore, queryKey]);

  return { data, loading };
}
