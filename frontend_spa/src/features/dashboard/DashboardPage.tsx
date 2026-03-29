import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { HeroSection } from './components/HeroSection';
import { StatsGrid } from './components/StatsGrid';
import { InsightPanel } from './components/InsightPanel';
import { ProductivityChart } from './components/ProductivityChart';
import { AcademicNews } from './components/AcademicNews';
import { Share2 } from 'lucide-react';
import { StoryCardGenerator } from './components/StoryCardGenerator';

import { JourneyTracker } from './components/productivity/JourneyTracker';

/* ─── Types ─── */
interface DashboardStats {
    projects: number;
    references: number;
    isPro: boolean;
    productivity?: any; // Add this
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
    const [chartData, setChartData] = useState<{ labels: string[], data: number[] }>({ labels: [], data: [] });
    const [activeProject, setActiveProject] = useState<any>(null); // Store full active project object
    const [allProjects, setAllProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isStoryOpen, setIsStoryOpen] = useState(false);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                setLoading(true);

                // 1. Fetch General Dashboard Stats
                const statsRes = await fetch('/api/dashboard-stats').then(r => r.json()).catch(() => ({ stats: {} }));
                
                // 2. Fetch Productivity Stats (Level, Streak, Total Hours)
                const prodRes = await fetch('/api/productivity/stats').then(r => r.json()).catch(() => null);
                
                // 3. Fetch Heatmap Data
                const heatmapRes = await fetch('/api/productivity/heatmap').then(r => r.json()).catch(() => []);

                // 4. Fetch User Projects
                const projectsRes = await fetch('/api/projects').then(r => r.json()).catch(() => ({ projects: [] }));
                const myProjects = projectsRes.projects || [];

                // 5. Update Local State
                if (prodRes) {
                    setStats({
                        projects: statsRes.stats?.projects ?? myProjects.length,
                        references: statsRes.stats?.references ?? 0,
                        isPro: user?.isPro || false,
                        productivity: prodRes // Inject new prod stats
                    });
                } else {
                    setStats({
                        projects: statsRes.stats?.projects ?? myProjects.length,
                        references: statsRes.stats?.references ?? 0,
                        isPro: user?.isPro || false
                    });
                }

                if (heatmapRes.length > 0) {
                    // Adapt heatmap to chart data format if needed, 
                    // or pass raw heatmapRes if ProductivityChart handles it
                    setChartData({
                        labels: heatmapRes.map(d => d.date),
                        data: heatmapRes.map(d => d.count)
                    });
                }

                setAllProjects(myProjects);
                if (myProjects.length > 0) setActiveProject(myProjects[0]);

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
            <div className="relative">
                <HeroSection
                    userName={firstName}
                    activeProject={activeProject}
                    allProjects={allProjects}
                    onProjectSelect={(project) => setActiveProject(project)}
                />
                <button 
                    onClick={() => setIsStoryOpen(true)}
                    className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-2 group transition-all"
                >
                    <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-semibold hidden md:block">Share Story</span>
                </button>
            </div>

            {/* 2. STATS & TRACKER ROW ... */}
            {/* sisanya sama tapi perlu modal di paling bawah */}
            
            <StoryCardGenerator 
                isOpen={isStoryOpen} 
                onClose={() => setIsStoryOpen(false)}
                data={{
                    level: stats.productivity?.level || 'Junior Researcher',
                    streak: stats.productivity?.streak || 1,
                    totalHours: Math.floor((stats.productivity?.total_duration_seconds || 0) / 3600),
                    references: stats.references,
                    heatmap: chartData.labels.map((label, i) => ({
                        date: label,
                        count: chartData.data[i] || 0
                    })),
                    userName: firstName,
                    projectTitle: activeProject?.title || 'Thesis Journey'
                }}
            />
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Timer Card */}
                <JourneyTracker
                    referencesCount={stats.references}
                    projectCount={stats.projects}
                    productivity={stats.productivity}
                />

                {/* Other Stats */}
                <div className="xl:col-span-3">
                    <StatsGrid stats={stats} loading={loading} />
                </div>
            </div>

            {/* 3. CHART & NEWS */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-[400px]">
                <div className="xl:col-span-8 h-full">
                    <ProductivityChart chartData={chartData} />
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
