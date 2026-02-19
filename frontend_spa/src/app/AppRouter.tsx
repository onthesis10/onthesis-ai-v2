import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/layouts/AppShell';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { WorkspaceLayout } from '@/layouts/WorkspaceLayout';
import {
    FolderKanban, MessageCircle, CalendarDays, BarChart3, Users,
    BookMarked, BookOpen, FileText, Map, GraduationCap,
    Settings, HelpCircle, Zap,
} from 'lucide-react';

// Lazy load heavy feature modules
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const ProjectsPage = lazy(() => import('@/features/projects/ProjectsPage'));
const AnalysisRoutes = lazy(() => import('@/features/analysis/routes'));
const WritingRoutes = lazy(() => import('@/features/writing/routes'));
const ChatWorkspacePage = lazy(() => import('@/features/chat_workspace/ChatWorkspacePage'));
const CitationPage = lazy(() => import('@/features/citations/CitationPage'));
const ParaphrasePage = lazy(() => import('@/features/paraphrase/ParaphrasePage'));
const PlaceholderPage = lazy(() => import('@/features/placeholder/PlaceholderPage'));

function SuspenseFallback() {
    return (
        <div className="flex items-center justify-center h-screen w-full bg-background">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground font-medium">Loading...</p>
            </div>
        </div>
    );
}

export function AppRouter() {
    return (
        <Suspense fallback={<SuspenseFallback />}>
            <Routes>
                <Route element={<AppShell />}>
                    {/* Dashboard — with sidebar */}
                    <Route element={<DashboardLayout />}>
                        <Route path="/dashboard" element={<DashboardPage />} />

                        {/* Placeholder pages for all features */}
                        <Route path="/projects" element={<ProjectsPage />} />
                        <Route path="/chat" element={<ChatWorkspacePage />} />
                        {/* <Route path="/chat" element={<PlaceholderPage title="AI Chat" description="Brainstorm and discuss ideas with your AI assistant." icon={MessageCircle} />} /> */}
                        <Route path="/calendar" element={<PlaceholderPage title="Calendar" description="Track deadlines, meetings, and milestones." icon={CalendarDays} />} />
                        <Route path="/analytics" element={<PlaceholderPage title="Analytics" description="View detailed analytics on your progress and productivity." icon={BarChart3} />} />
                        <Route path="/team" element={<PlaceholderPage title="Team" description="Collaborate with your thesis team and advisors." icon={Users} />} />
                        <Route path="/citations" element={<CitationPage />} />
                        <Route path="/kajian-teori" element={<PlaceholderPage title="Kajian Teori Generator" description="Auto-generate literature review sections with AI." icon={BookOpen} />} />
                        <Route path="/paraphrase" element={<ParaphrasePage />} />
                        <Route path="/analysis/*" element={<AnalysisRoutes />} />
                        <Route path="/research-map" element={<PlaceholderPage title="Research Map" description="Visualize connections between your research concepts." icon={Map} />} />
                        <Route path="/thesis-defense" element={<PlaceholderPage title="Defense Prep" description="Prepare for your thesis defense with AI-powered simulations." icon={GraduationCap} />} />
                        <Route path="/settings" element={<PlaceholderPage title="Settings" description="Manage your account, preferences, and integrations." icon={Settings} />} />
                        <Route path="/help" element={<PlaceholderPage title="Help Center" description="Get support and learn how to use OnThesis effectively." icon={HelpCircle} />} />
                        <Route path="/upgrade" element={<PlaceholderPage title="Upgrade to Pro" description="Unlock the full power of AI for your thesis journey." icon={Zap} />} />
                    </Route>

                    {/* Workspace — full screen */}
                    <Route element={<WorkspaceLayout />}>
                        <Route path="/writing/*" element={<WritingRoutes />} />
                    </Route>
                </Route>

                {/* Redirects */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </Suspense>
    );
}
