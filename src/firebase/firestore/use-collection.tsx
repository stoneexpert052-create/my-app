'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  onSnapshot,
  Query,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';

interface CollectionState<T> {
  data: T[];
  loading: boolean;
  error: FirestoreError | null;
}

export function useCollection<T>(collectionPath: string): CollectionState<T> {
  const db = useFirestore();
  const [state, setState] = useState<CollectionState<T>>({
    data: [],
    loading: true,
    error: null,
  });

  const colRef = useMemo(
    () => (db ? collection(db, collectionPath) : null),
    [db, collectionPath]
  );

  useEffect(() => {
    if (!colRef) {
      setState(s => ({ ...s, loading: true }));
      return;
    }

    const unsubscribe = onSnapshot(
      colRef,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const data: T[] = snapshot.docs.map(doc => ({ ...doc.data() as object, id: doc.id } as T));
        setState({ data, loading: false, error: null });
      },
      (error: FirestoreError) => {
        const isQuota = error.code === 'resource-exhausted' || error.message?.includes('Quota exceeded') || error.message?.includes('Quota limit');
        if (error.code === 'unavailable') {
          console.warn(`Firestore collection [${collectionPath}] offline or waiting to reconnect:`, error.message);
        } else if (isQuota) {
          console.warn(`Firestore collection [${collectionPath}] reached free-tier quota limit:`, error.message);
        } else {
          console.error("Error fetching collection:", error);
        }
        setState({ data: [], loading: false, error });
      }
    );

    return () => unsubscribe();
  }, [colRef, collectionPath]);

  return state;
}

interface DocState<T> {
  data: T | null;
  loading: boolean;
  error: FirestoreError | null;
}

// useDoc can be in the same file if it's simple enough and related
// For this app, we'll keep it separate for clarity, so this is a placeholder.
// You would typically have a `use-doc.tsx` file for this.
export function useDoc<T>(docPath: string): DocState<T> {
    // This is a placeholder implementation.
    // A real implementation would use onSnapshot on a doc reference.
    const [state, setState] = useState<DocState<T>>({
        data: null,
        loading: true,
        error: null,
    });

    useEffect(() => {
        // In a real scenario, you'd create a doc reference and listen to it.
        // For now, we'll just simulate a loaded but empty state.
        setState({ data: null, loading: false, error: null });
    }, [docPath]);

    return state;
}
