/**
 * Firebase Configuration
 *
 * Reads credentials from .env (VITE_* prefixed variables).
 * Initialize Firebase once at app startup.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// ============================================================
// READ REAL VALUES FROM .env (set by Vite)
// ============================================================
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if all required fields are present
const IS_CONFIGURED =
  !!firebaseConfig.apiKey &&
  !!firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'YOUR_API_KEY';

let app = null;
let db  = null;
let auth = null;

/**
 * Initialize Firebase services.
 * Safe to call multiple times — returns cached instance.
 */
export function initializeFirebase() {
  if (!IS_CONFIGURED) {
    console.warn(
      '[Firebase] Not configured — set VITE_FIREBASE_* in .env\n' +
      'Firestore sync will be skipped and the app will rely on API calls only.'
    );
    return { app: null, db: null, auth: null, configured: false };
  }

  if (!app) {
    app  = initializeApp(firebaseConfig);
    db   = getFirestore(app);
    auth = getAuth(app);
    console.log('[Firebase] Initialized successfully');
  }

  return { app, db, auth, configured: true };
}

/**
 * Get cached Firebase services.
 * Call initializeFirebase() first.
 */
export function getFirebaseServices() {
  return { app, db, auth, configured: IS_CONFIGURED };
}

/** Quick check whether Firebase is live */
export function isFirebaseConfigured() {
  return IS_CONFIGURED;
}

// Auto-initialize on module load
export const firebase = initializeFirebase();

export default firebase;