'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * A component that listens for FirestorePermissionError events and throws them.
 * This triggers the Next.js error overlay with rich debugging information.
 */
export function FirebaseErrorListener() {
  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      // Log the permission error clearly to console instead of throwing uncaught exception
      // that crashes Next.js ReactDevOverlay with circular structure errors.
      console.error("[Firestore Permission Error]:", error.message, error.request);
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, []);

  return null;
}
