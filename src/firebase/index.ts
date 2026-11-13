'use client';
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  setLogLevel,
  Firestore,
  FirestoreSettings,
} from 'firebase/firestore';
import { firebaseConfig } from './config';

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

// Silence internal @firebase/firestore WebChannel 10s transport timeout warnings/errors
// so offline fallback mode operates cleanly without triggering the Next.js error overlay.
try {
  setLogLevel('silent');
} catch (e) {
  // Ignore if setLogLevel is unavailable in current runtime
}

export function initializeFirebase() {
  if (!app) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  }

  if (!auth && typeof window !== 'undefined') {
    auth = getAuth(app);
  }

  if (!firestore) {
    const dbId = (firebaseConfig as any).firestoreDatabaseId;
    try {
      const firestoreOptions: FirestoreSettings = {
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true,
      };
      firestore =
        dbId && dbId !== '(default)'
          ? initializeFirestore(app, firestoreOptions, dbId)
          : initializeFirestore(app, firestoreOptions);
    } catch (e) {
      firestore =
        dbId && dbId !== '(default)' ? getFirestore(app, dbId) : getFirestore(app);
    }
  }

  // @ts-ignore - handled by provider
  return { app, auth, firestore };
}

export { useCollection, useDoc } from '@/firebase/firestore/use-collection';

export { useUser } from '@/firebase/auth/use-user';

export {
  FirebaseProvider,
  FirebaseClientProvider,
  useFirebase,
  useFirebaseApp,
  useFirestore,
  useAuth,
} from '@/firebase/provider';
