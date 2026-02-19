import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { HeroSection } from './components/HeroSection';
import { StatsGrid } from './components/StatsGrid';
import { InsightPanel } from './components/InsightPanel';
import { ProductivityChart } from './components/ProductivityChart';
import { AcademicNews } from './components/AcademicNews';

import { JourneyTracker } from './components/productivity/JourneyTracker';

/* ─── Types ─── */
interface DashboardStats {
    projects: number;
    references: number;
    isPro: boolean;
}

interface UserInfo {
    email: string;
    displayName: string;
    photoURL: string | null;
    isPro: boolean;
}

/* ─── Main ─── */
export default function DashboardPage() {
    const context = useOutletContext<{ user: UserInfo | null }>();
    const user = context?.user;
    const [stats, setStats] = useState<DashboardStats>({ projects: 0, references: 0, isPro: false });
    const [activeProject, setActiveProject] = useState<any>(null); // Store full active project object
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                setLoading(true);

                // 1. Fetch Dashboard Stats (PRIMARY source for counts)
                const statsRes = await fetch('/api/dashboard-stats').then(r => r.json()).catch(() => ({ stats: {} }));
                const realStats = statsRes.stats || {};

                // 2. Fetch User Projects (For Active Project display)
                const projectsRes = await fetch('/api/projects').then(r => r.json()).catch(() => ({ projects: [] }));
                const myProjects = projectsRes.projects || [];

                // 3. Set Stats using Backend Data
                setStats({
                    projects: realStats.projects ?? myProjects.length,
                    references: realStats.references ?? 0, // Trust the backend count!
                    isPro: realStats.isPro ?? (user?.isPro || false)
                });

                // Update Active Project for Hero Section
                if (myProjects.length > 0) {
                    setActiveProject(myProjects[0]);
                }

            } catch (err) {
                console.error("Failed to load dashboard data", err);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            loadDashboardData();
        }
    }, [user]);

    const firstName = user?.displayName?.split(' ')[0] || 'Researcher';

    return (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700 pb-10">
            {/* 1. HERO SECTION */}
            <HeroSection
                userName={firstName}
                thesisTitle={activeProject?.title || "Mulai Tesis Baru"}
                progress={activeProject ? 65 : 0} // Placeholder progress logic (could be calculated from chapters)
            />

            {/* 2. STATS & TRACKER ROW */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Timer Card */}
                <JourneyTracker
                    referencesCount={stats.references}
                    projectCount={stats.projects}
                />

                {/* Other Stats */}
                <div className="xl:col-span-3">
                    <StatsGrid stats={stats} loading={loading} />
                </div>
            </div>

            {/* 3. CHART & NEWS */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-[400px]">
                <div className="xl:col-span-8 h-full">
                    <ProductivityChart />
                </div>
                <div className="xl:col-span-4 h-full">
                    <AcademicNews />
                </div>
            </div>

            {/* 4. AI INSIGHT */}
            <InsightPanel />
        </div>
    );
}
