'use client';

import { useEffect, useRef } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';

/**
 * Manages user online status and last seen timestamp.
 * Optimized to minimize Firestore write quota usage.
 */
export function UserPresence() {
  const { user } = useUser();
  const firestore = useFirestore();
  const lastStatus = useRef<boolean | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdating = useRef(false);

  useEffect(() => {
    if (!user) {
      lastStatus.current = null;
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);

    const updateStatus = (isOnline: boolean) => {
      // Clear any pending update to throttle
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // Throttling: Wait 60 seconds before committing to Firestore
      // This significantly reduces write volume for active users.
      timeoutRef.current = setTimeout(async () => {
        // Prevent redundant writes if status hasn't changed or an update is in progress
        if (lastStatus.current === isOnline || isUpdating.current) return;

        isUpdating.current = true;
        try {
          await updateDoc(userDocRef, { 
            isOnline, 
            lastSeen: serverTimestamp() 
          });
          lastStatus.current = isOnline;
        } catch (e: any) {
          // Silent catch for quota or connectivity errors to prevent UI crashes
          if (e.code === 'resource-exhausted') {
            console.warn("Firestore write limit reached. Presence update skipped.");
          }
        } finally {
          isUpdating.current = false;
        }
      }, 60000); // 60 seconds throttle
    };

    // Set online on mount
    updateStatus(true);

    const handleVisibilityChange = () => {
      updateStatus(document.visibilityState !== 'hidden');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleBeforeUnload = () => {
        // Immediate clean-up on tab close (non-blocking)
        updateDoc(userDocRef, { isOnline: false, lastSeen: serverTimestamp() }).catch(() => {});
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
