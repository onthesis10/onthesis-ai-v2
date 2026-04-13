import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useThemeStore } from '@/store/themeStore';

/**
 * PublicShell keeps theme application for marketing/auth-adjacent pages
 * without pulling the heavier app runtime into the public entry path.
 */
export function PublicShell() {
    const { theme } = useThemeStore();

    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('dark', 'happy');
        if (theme === 'dark') root.classList.add('dark');
        if (theme === 'happy') root.classList.add('happy');
    }, [theme]);

    return <Outlet />;
}
