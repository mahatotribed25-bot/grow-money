
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
    if (!pathOrQuery || (options?.where && options.where[2] === undefined)) {
      setData([]);
      setLoading(false);
      return;
    }

    let q: Query<DocumentData>;
    let allConstraints = [...queryConstraints];
    if (options?.where) {
      allConstraints.push(where(options.where[0], options.where[1], options.where[2]));
    }

    if (typeof pathOrQuery !== 'string') {
        q = query(pathOrQuery, ...allConstraints);
    } else if (options?.subcollections) {
        const subcollectionQuery: Query<DocumentData> = collectionGroup(firestore, pathOrQuery);
        q = query(subcollectionQuery, ...allConstraints);
    }
    else {
        q = query(collection(firestore, pathOrQuery), ...allConstraints);
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
