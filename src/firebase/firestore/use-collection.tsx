'use client';
import { useEffect, useState, useMemo } from 'react';
import {
  collection,
  query,
  onSnapshot,
  Query,
  DocumentData,
  QueryConstraint,
  collectionGroup,
  where,
  getDocs,
  getDoc,
  doc
} from 'firebase/firestore';
import { useFirestore } from '../provider';

type UseCollectionOptions = {
    subcollections?: boolean;
    where?: [string, '==', any]
}

export function useCollection<T>(pathOrQuery: string | Query | null, options?: UseCollectionOptions, ...queryConstraints: QueryConstraint[]) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const firestore = useFirestore();
  
  const queryKey = typeof pathOrQuery === 'string' 
      ? pathOrQuery 
      : pathOrQuery ? pathOrQuery.path + JSON.stringify(pathOrQuery) : 'null';
  
  const optionsKey = useMemo(() => JSON.stringify(options), [options]);


  useEffect(() => {
    setLoading(true);
    if (!pathOrQuery) {
      setData([]);
      setLoading(false);
      return;
    }

    let q: Query<DocumentData>;
    if (typeof pathOrQuery !== 'string') {
        q = pathOrQuery;
    } else if (options?.subcollections) {
        let subcollectionQuery: Query<DocumentData> = collectionGroup(firestore, pathOrQuery);
        if(options.where) {
            subcollectionQuery = query(subcollectionQuery, where(options.where[0], '==', options.where[2]));
        }
        q = query(subcollectionQuery, ...queryConstraints);
    }
    else {
        q = query(collection(firestore, pathOrQuery), ...queryConstraints);
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
  }, [firestore, queryKey, optionsKey]);

  return { data, loading };
}
