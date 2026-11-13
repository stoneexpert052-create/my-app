// src/firebase/admin.ts
import { initializeApp, getApp, getApps, App, cert } from 'firebase-admin/app';
import { firebaseConfig } from './config';

// It's safe to import this on the client, as it will be tree-shaken.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : undefined;

let adminApp: App;

if (typeof window === 'undefined') {
  if (serviceAccount) {
    adminApp = getApps().length > 0 
      ? getApp() 
      : initializeApp({
          credential: cert({
            projectId: serviceAccount.project_id,
            clientEmail: serviceAccount.client_email,
            privateKey: serviceAccount.private_key,
          }),
        });
  } else {
    // This is for local development without the service account env var
    // It uses the same config as the client, which is fine for local emulation
    adminApp = getApps().length > 0 
      ? getApp() 
      : initializeApp({ projectId: firebaseConfig.projectId });
  }
}

export { adminApp };
