import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase only once to prevent Next.js hot-reload errors
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Initialize Firestore with Enterprise-Grade Offline Persistence
// We use 'any' type here to avoid TypeScript conflicts between initializeFirestore and getFirestore return types in strict mode
let db: any; 

if (typeof window !== "undefined") {
  // We are in the browser: Activate Offline Mode
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ 
        tabManager: persistentMultipleTabManager() 
      })
    });
  } catch (error) {
    // Fallback if Firestore was already initialized during Next.js hot-reloading
    db = getFirestore(app);
  }
} else {
  // We are on the server (Next.js SSR): Standard initialization
  db = getFirestore(app);
}

export { db };