import { Routes, Route } from 'react-router-dom';
import { DataAnalysisPage } from './pages/DataAnalysisPage';

/**
 * Analysis feature routes.
 * Mounted at /analysis/* in the main router.
 */
export default function AnalysisRoutes() {
    return (
        <Routes>
            <Route index element={<DataAnalysisPage />} />
            <Route path="*" element={<DataAnalysisPage />} />
        </Routes>
    );
}
