import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInWithCustomToken } from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: any = null;
let db: any = null;
let auth: any = null;

try {
    if (firebaseConfig.apiKey) {
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        db = getFirestore(app);
        auth = getAuth(app);
    } else {
        console.warn('[Firebase] Config missing. Persistence features disabled.');
    }
} catch (e) {
    console.warn('[Firebase] Initialization failed:', e);
}

/**
 * Authenticate with a custom token from the Flask backend.
 */
export const authenticateWithBackendToken = async (token: string) => {
    if (!token || !auth) return null;
    try {
        const cred = await signInWithCustomToken(auth, token);
        console.log('[Firebase] Authenticated:', cred.user.uid);
        return cred.user;
    } catch (error) {
        console.error('[Firebase] Auth failed:', error);
        throw error;
    }
};

export const getCurrentUserId = () => {
    return auth?.currentUser?.uid ?? null;
};

export { app, db, auth };
