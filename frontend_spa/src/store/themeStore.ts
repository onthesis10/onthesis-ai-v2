import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'happy';

interface ThemeState {
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;
    cycleTheme: () => void;
}

const applyThemeToDOM = (theme: ThemeMode) => {
    const root = document.documentElement;
    root.classList.remove('dark', 'happy');
    if (theme === 'dark') root.classList.add('dark');
    if (theme === 'happy') root.classList.add('happy');
    localStorage.setItem('onthesis-theme', theme);
};

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            theme: (typeof window !== 'undefined'
                ? (localStorage.getItem('onthesis-theme') as ThemeMode) || 'light'
                : 'light'),

            setTheme: (theme: ThemeMode) => {
                applyThemeToDOM(theme);
                set({ theme });
            },

            cycleTheme: () => {
                const order: ThemeMode[] = ['light', 'dark', 'happy'];
                const current = get().theme;
                const next = order[(order.indexOf(current) + 1) % order.length];
                applyThemeToDOM(next);
                set({ theme: next });
            },
        }),
        {
            name: 'onthesis-theme-store',
            onRehydrate: () => {
                return (state) => {
                    if (state) applyThemeToDOM(state.theme);
                };
            },
        }
    )
);
