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

export let app: any = null;
export let auth: any = null;
export let googleAuthProvider: any = null;

export let loginWithGoogle = async () => ({ user: { uid: 'mock' }, token: 'mock' });
export let registerGuest = async (u: string) => ({ user: { uid: 'mock', displayName: u } });
export let loginGuest = async (u: string) => ({ user: { uid: 'mock' } });
export let logout = async () => {};

if (missingFirebaseVars.length > 0) {
  console.warn(`⚠️ Missing Firebase config. UI running in Mock Guest Mode.`);
  
  // Create dummy auth so React doesn't crash
  auth = {
    currentUser: { 
      uid: 'guest-instructor', 
      displayName: 'Instructor',
      email: 'instructor@watchit.local',
      photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mock',
      getIdToken: async () => 'mock-token-for-instructor'
    },
    onAuthStateChanged: (callback: any) => {
      callback({ 
        uid: 'guest-instructor', 
        displayName: 'Instructor',
        email: 'instructor@watchit.local',
        photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mock',
        getIdToken: async () => 'mock-token-for-instructor'
      });
      return () => {};
    },
    signOut: async () => {}
  };
} else {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleAuthProvider = new GoogleAuthProvider();

  loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleAuthProvider);
    const token = await result.user.getIdToken();
    return { user: result.user, token };
  };

  registerGuest = async (username: string, password: string) => {
    const email = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@guest.watchit.com`;
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (result.user) await updateProfile(result.user, { displayName: username }).catch(console.error);
    return result;
  };

  loginGuest = async (username: string, password: string) => {
    const email = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@guest.watchit.com`;
    return await signInWithEmailAndPassword(auth, email, password);
  };

  logout = () => signOut(auth);
}