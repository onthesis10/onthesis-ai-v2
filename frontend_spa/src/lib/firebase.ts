import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInWithCustomToken } from 'firebase/auth';

type FirebaseRuntimeConfig = {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
    measurementId?: string;
};

const envFirebaseConfig: FirebaseRuntimeConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const windowFirebaseConfig: FirebaseRuntimeConfig =
    typeof window !== 'undefined' && window.firebaseConfig ? window.firebaseConfig : {};

// Hybrid strategy: server-injected config first, Vite env as fallback.
const firebaseConfig: FirebaseRuntimeConfig = {
    ...envFirebaseConfig,
    ...windowFirebaseConfig,
};

const requiredConfigKeys: Array<keyof FirebaseRuntimeConfig> = [
    'apiKey',
    'authDomain',
    'projectId',
    'appId',
];

let app: any = null;
let db: any = null;
let auth: any = null;

try {
    const missingKeys = requiredConfigKeys.filter((key) => !firebaseConfig[key]);
    if (missingKeys.length === 0) {
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        db = getFirestore(app);
        auth = getAuth(app);
    } else {
        console.warn(
            `[Firebase] Config incomplete (${missingKeys.join(
                ', '
            )}). Source priority: window.firebaseConfig -> import.meta.env. Persistence features disabled.`
        );
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
