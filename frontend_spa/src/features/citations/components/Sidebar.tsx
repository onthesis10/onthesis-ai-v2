import React from 'react';
import { Project } from '../services/citationService';
import { Plus, Trash2, FolderOpen, Folder, ChevronRight } from 'lucide-react';

interface SidebarProps {
    projects: Project[];
    activeProjectId: string | null;
    totalReferences: number;
    onSelectProject: (id: string) => void;
    onCreateProject: () => void;
    onDeleteProject: (e: React.MouseEvent, id: string) => void;
}

export function Sidebar({
    projects,
    activeProjectId,
    totalReferences,
    onSelectProject,
    onCreateProject,
    onDeleteProject
}: SidebarProps) {
    return (
        <div className="w-[260px] flex flex-col h-full pt-6 pb-4">
            {/* Header */}
            <div className="px-5 mb-6 flex justify-between items-center">
                <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Library</h2>
                <button
                    onClick={onCreateProject}
                    className="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary text-muted-foreground transition-all duration-300"
                    title="New Project"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {/* Project List */}
            <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scroll">
                {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground/50 gap-2">
                        <FolderOpen className="w-8 h-8 stroke-1" />
                        <span className="text-xs">No projects</span>
                    </div>
                ) : (
                    projects.map(p => {
                        const isActive = activeProjectId === p.id;
                        return (
                            <div
                                key={p.id}
                                onClick={() => onSelectProject(p.id)}
                                className={`
                                    group relative px-3 py-2.5 rounded-xl cursor-pointer flex justify-between items-center text-sm font-medium transition-all duration-200 border border-transparent
                                    ${isActive
                                        ? 'bg-primary/10 text-primary border-primary/10 shadow-sm'
                                        : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground hover:translate-x-1'}
                                `}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <Folder className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'fill-current' : ''}`} />
                                    <span className="truncate">{p.title}</span>
                                </div>

                                {isActive && <ChevronRight className="w-3 h-3 opacity-50" />}

                                <button
                                    onClick={(e) => onDeleteProject(e, p.id)}
                                    className={`absolute right-2 p-1.5 rounded-md hover:bg-red-500/10 hover:text-red-500 transition-all ${isActive ? 'opacity-0 group-hover:opacity-100' : 'hidden group-hover:block'}`}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer Stat */}
            <div className="px-5 mt-auto">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-secondary/50 to-background border border-border/40 backdrop-blur-sm">
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Total Citations</div>
                    <div className="text-2xl font-outfit font-bold text-foreground">{totalReferences}</div>
                </div>
            </div>
        </div>
    );
}