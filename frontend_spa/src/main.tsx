import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from '@/app/AppRouter';
import '@/styles/globals.css';

import { ThemeProvider } from '@/features/writing/context/ThemeContext';

const rootElement = document.getElementById('root');

if (rootElement) {
    createRoot(rootElement).render(
        <StrictMode>
            <ThemeProvider>
                <BrowserRouter>
                    <AppRouter />
                </BrowserRouter>
            </ThemeProvider>
        </StrictMode>
    );
} else {
    console.error('[OnThesis] Root element not found!');
}
