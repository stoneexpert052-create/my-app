'use client';
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  setLogLevel,
  doc,
  getDocFromServer,
  Firestore,
  FirestoreSettings,
} from 'firebase/firestore';
import { firebaseConfig } from './config';

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let connectionTested = false;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Silence internal @firebase/firestore WebChannel 10s transport timeout warnings/errors
// so offline fallback mode operates cleanly without triggering the Next.js error overlay.
try {
  setLogLevel('silent');
} catch (e) {
  // Ignore if setLogLevel is unavailable in current runtime
}

async function testConnection(dbInstance: Firestore) {
  if (connectionTested || typeof window === 'undefined') return;
  connectionTested = true;
  try {
    await Promise.race([
      getDocFromServer(doc(dbInstance, 'test', 'connection')),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is currently offline; using local cache fallback.');
    }
  }
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
        experimentalAutoDetectLongPolling: true,
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
    if (typeof window !== 'undefined' && firestore) {
      void testConnection(firestore);
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
