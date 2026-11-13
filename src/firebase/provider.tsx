'use client';

import * as React from 'react';
import { createContext, useContext, ReactNode, useMemo } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface FirebaseContextType {
  app: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
}

const FirebaseContext = React.createContext<FirebaseContextType>({
  app: null,
  auth: null,
  firestore: null,
});

let cachedServices: FirebaseContextType | null = null;

function getServices(): FirebaseContextType {
  if (typeof window === 'undefined') {
    return { app: null, auth: null, firestore: null };
  }
  if (!cachedServices) {
    try {
      cachedServices = initializeFirebase() as FirebaseContextType;
    } catch (e) {
      console.error("Firebase initialization failed in provider:", e);
      return { app: null, auth: null, firestore: null };
    }
  }
  return cachedServices;
}

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const services = getServices();

  return (
    <FirebaseContext.Provider value={services}>
      {children}
      {typeof window !== 'undefined' && <FirebaseErrorListener />}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = React.useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

export function useFirebaseApp() {
  return useFirebase().app;
}

export function useAuth() {
  return useFirebase().auth;
}

export function useFirestore() {
  return useFirebase().firestore;
}

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  return <FirebaseProvider>{children}</FirebaseProvider>;
}
