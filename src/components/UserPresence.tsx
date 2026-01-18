
'use client';

import { useEffect, useRef } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';

export function UserPresence() {
  const { user } = useUser();
  const firestore = useFirestore();
  
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(firestore, 'users', user.uid);

    // Set online on initial load
    updateDoc(userDocRef, { isOnline: true, lastSeen: serverTimestamp() });

    const handleVisibilityChange = () => {
      if (!user) return; 
      if (document.visibilityState === 'hidden') {
        updateDoc(userDocRef, { isOnline: false, lastSeen: serverTimestamp() });
      } else {
        updateDoc(userDocRef, { isOnline: true, lastSeen: serverTimestamp() });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // This is a fallback for when the tab is closed
    const handleBeforeUnload = () => {
        if (!user) return;
        updateDoc(userDocRef, { isOnline: false, lastSeen: serverTimestamp() });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Try to set offline on component unmount (e.g., logout)
       if (user) {
         updateDoc(doc(firestore, 'users', user.uid), { isOnline: false, lastSeen: serverTimestamp() });
       }
    };
  }, [user, firestore]);

  return null;
}
