import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useThemeStore } from '@/store/themeStore';
import { authenticateWithBackendToken } from '@/lib/firebase';

/**
 * AppShell — Top-level layout.
 * Applies theme to DOM, provides toast container.
 * Handles initial Firebase authentication using backend token.
 */
export function AppShell() {
    const { theme } = useThemeStore();

    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('dark', 'happy');
        if (theme === 'dark') root.classList.add('dark');
        if (theme === 'happy') root.classList.add('happy');
    }, [theme]);

    useEffect(() => {
        const token = window.__FIREBASE_TOKEN__;
        if (token) {
            authenticateWithBackendToken(token)
                .then(user => {
                    console.log('[AppShell] Auth success:', user?.uid);
                    // Optional: clear token to separate concerns, though not strictly required
                    // window.__FIREBASE_TOKEN__ = undefined; 
                })
                .catch(err => {
                    console.error('[AppShell] Auth failed:', err);
                });
        } else {
            console.log('[AppShell] No Firebase token found in window');
        }
    }, []);

    return (
        <>
            <Toaster
                position="bottom-right"
                toastOptions={{
                    className: '!bg-card !text-foreground !border !border-border/30 !shadow-lg !rounded-xl',
                    duration: 3000,
                }}
            />
            <Outlet />
        </>
    );
}
