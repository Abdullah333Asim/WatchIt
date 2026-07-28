import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingFirebaseVars = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingFirebaseVars.length > 0) {
  throw new Error(`Missing Firebase config env vars: ${missingFirebaseVars.join(', ')}`);
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleAuthProvider);
  const token = await result.user.getIdToken();
  return { user: result.user, token };
};

export const registerGuest = async (username: string, password: string) => {
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!cleanUsername) throw new Error("Username must contain alphanumeric characters.");
  const email = `${cleanUsername}@guest.watchit.com`;
  const result = await createUserWithEmailAndPassword(auth, email, password);
  if (result.user) {
    await updateProfile(result.user, { displayName: username }).catch(console.error);
  }
  return result;
};

export const loginGuest = async (username: string, password: string) => {
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!cleanUsername) throw new Error("Username must contain alphanumeric characters.");
  const email = `${cleanUsername}@guest.watchit.com`;
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result;
};

export const logout = () => signOut(auth);
