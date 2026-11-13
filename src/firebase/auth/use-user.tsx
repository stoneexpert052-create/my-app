'use client';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useAuth } from '@/firebase/provider';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: Error | null;
}

export function useUser(): AuthState {
  const auth = useAuth();
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!auth) {
      // If auth is not ready, loading continues.
      setState(s => ({ ...s, loading: true }));
      return;
    }
    
    setState(s => ({ ...s, loading: true }));

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setState({ user, loading: false, error: null });
      },
      (error) => {
        setState({ user: null, loading: false, error });
      }
    );

    return () => unsubscribe();
  }, [auth]);

  return state;
}
