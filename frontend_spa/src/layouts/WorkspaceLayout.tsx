import { Outlet } from 'react-router-dom';

/**
 * WorkspaceLayout — Full-screen layout for Writing & Analysis.
 * No sidebar, maximum screen real estate.
 */
export function WorkspaceLayout() {
    return (
        <div className="h-screen w-screen overflow-hidden bg-background">
            <Outlet />
        </div>
    );
}
