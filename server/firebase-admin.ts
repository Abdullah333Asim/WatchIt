import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { ServiceAccount } from 'firebase-admin';

export let adminAuth: ReturnType<typeof getAuth> | null = null;

if (!getApps().length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;

  if (serviceAccountJson) {
    let parsedServiceAccount: any;
    try {
      parsedServiceAccount = JSON.parse(serviceAccountJson);
      if (parsedServiceAccount.private_key?.includes('\\n')) {
        parsedServiceAccount.private_key = parsedServiceAccount.private_key.replace(/\\n/g, '\n');
      }
      initializeApp({
        credential: cert(parsedServiceAccount as ServiceAccount),
        projectId: parsedServiceAccount.project_id,
      });
      adminAuth = getAuth();
    } catch (e) {
      console.error(`Firebase Admin JSON error: ${(e as Error).message}`);
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp({
      credential: applicationDefault(),
      ...(firebaseProjectId ? { projectId: firebaseProjectId } : {}),
    });
    adminAuth = getAuth();
  } else {
    console.warn("⚠️ No Firebase Admin credentials found. Running backend in mock auth mode.");
  }
} else {
  adminAuth = getAuth();
}