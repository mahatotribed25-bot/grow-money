'use client';

import { useEffect, useRef } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';

export function UserPresence() {
  const { user } = useUser();
  const firestore = useFirestore();
  const lastStatus = useRef<boolean | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) {
      lastStatus.current = null;
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);

    const updateStatus = (isOnline: boolean) => {
      // Clear any pending update to throttle
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // Throttling: Wait 2 seconds before committing to Firestore
      // This prevents rapid-fire writes during rapid navigation or tab switching
      timeoutRef.current = setTimeout(async () => {
        if (lastStatus.current === isOnline) return;

        try {
          await updateDoc(userDocRef, { 
            isOnline, 
            lastSeen: serverTimestamp() 
          });
          lastStatus.current = isOnline;
        } catch (e: any) {
          // Silent catch for quota errors to prevent UI crash
          if (e.code === 'resource-exhausted') {
            console.warn("Firestore write limit reached. Presence update skipped.");
          }
        }
      }, 2000);
    };

    // Set online on mount
    updateStatus(true);

    const handleVisibilityChange = () => {
      updateStatus(document.visibilityState !== 'hidden');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleBeforeUnload = () => {
        // Immediate update on close for accuracy
        updateDoc(userDocRef, { isOnline: false, lastSeen: serverTimestamp() });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, firestore]);

  return null;
}
