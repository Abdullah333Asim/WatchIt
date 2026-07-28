import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { ServiceAccount } from 'firebase-admin';

if (!getApps().length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;

  if (serviceAccountJson) {
    const parsedServiceAccount = JSON.parse(serviceAccountJson) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };

    if (!parsedServiceAccount.project_id || !parsedServiceAccount.client_email || !parsedServiceAccount.private_key) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing required fields.");
    }

    initializeApp({
      credential: cert(parsedServiceAccount as ServiceAccount),
      projectId: parsedServiceAccount.project_id,
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp({
      credential: applicationDefault(),
      ...(firebaseProjectId ? { projectId: firebaseProjectId } : {}),
    });
  } else {
    throw new Error("Firebase Admin credentials are not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.");
  }
}

export const adminAuth = getAuth();
