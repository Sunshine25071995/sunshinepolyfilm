import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

let app;
let auth: any;
let db: any;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

export { auth, db };
export const googleProvider = new GoogleAuthProvider();
export const signInWithGoogle = () => auth ? signInWithPopup(auth, googleProvider) : Promise.reject("Auth not initialized");
export const logout = () => auth ? signOut(auth) : Promise.reject("Auth not initialized");
