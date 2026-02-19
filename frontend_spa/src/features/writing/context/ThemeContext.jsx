import React from 'react';
import { useThemeStore } from '@/store/themeStore';

export const useTheme = () => {
    const { theme, cycleTheme, setTheme } = useThemeStore();
    return {
        theme,
        toggleTheme: cycleTheme,
        setTheme
    };
};

export const ThemeProvider = ({ children }) => {
    return <>{children}</>;
};