import { Routes, Route } from 'react-router-dom';
import WritingStudioPage from './pages/WritingStudioPage';
import { ProjectProvider } from './context/ProjectContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/UI/ToastProvider';

/**
 * Writing feature routes.
 * Mounted at /writing/* in the main router.
 * Providers required by WritingStudioPage and its children.
 */
export default function WritingRoutes() {
    return (
        <ThemeProvider>
            <ToastProvider>
                <ProjectProvider>
                    <Routes>
                        <Route index element={<WritingStudioPage />} />
                        <Route path=":docId" element={<WritingStudioPage />} />
                        <Route path="*" element={<WritingStudioPage />} />
                    </Routes>
                </ProjectProvider>
            </ToastProvider>
        </ThemeProvider>
    );
}
