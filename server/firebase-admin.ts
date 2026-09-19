import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { ServiceAccount } from 'firebase-admin';

if (!getApps().length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;

  if (serviceAccountJson) {
    let parsedServiceAccount: {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };

    try {
      parsedServiceAccount = JSON.parse(serviceAccountJson);
    } catch (e) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON: ${(e as Error).message}`);
    }

    if (!parsedServiceAccount.project_id || !parsedServiceAccount.client_email || !parsedServiceAccount.private_key) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing required fields (project_id, client_email, private_key).");
    }

    // Vercel (and many CI systems) store env vars with literal `\n` instead of
    // actual newline characters inside the private key PEM block.
    // Normalise both cases so the cert() call always gets real newlines.
    if (parsedServiceAccount.private_key.includes('\\n')) {
      parsedServiceAccount.private_key = parsedServiceAccount.private_key.replace(/\\n/g, '\n');
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
    throw new Error(
      "Firebase Admin credentials are not configured. " +
      "Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS in your environment variables."
    );
  }
}

export const adminAuth = getAuth();
