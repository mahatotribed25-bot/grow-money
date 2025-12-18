'use client';

import { PropsWithChildren } from 'react';

import { initializeFirebase, FirebaseProvider } from '.';

export function FirebaseClientProvider({ children }: PropsWithChildren) {
  const firebase = initializeFirebase();
  return <FirebaseProvider value={firebase}>{children}</FirebaseProvider>;
}
