import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

const getEnv = (key: string): string | undefined => {
  if (typeof window !== "undefined" && (window as any).__ENV__?.[key]) {
    return (window as any).__ENV__[key];
  }
  return import.meta.env[key] as string | undefined;
};

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("VITE_FIREBASE_APP_ID"),
  measurementId: getEnv("VITE_FIREBASE_MEASUREMENT_ID"),
};

// Indica se o Firebase está configurado corretamente
export const isFirebaseConfigured =
  typeof window !== "undefined" &&
  !!firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== "undefined" &&
  firebaseConfig.apiKey.length > 10;

let db: Firestore | null = null;
let auth: Auth | null = null;

if (typeof window !== "undefined" && isFirebaseConfigured) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (e) {
    console.warn("[OmniForge] Firebase initialization failed — running in offline mode.", e);
  }
}

export { db, auth };
export const googleProvider = new GoogleAuthProvider();
