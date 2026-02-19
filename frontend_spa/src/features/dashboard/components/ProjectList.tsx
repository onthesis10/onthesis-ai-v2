import { FolderOpen, MoreVertical } from 'lucide-react';

export function ProjectList() {
    const projects = [
        { title: "Climate Change Thesis", progress: 52, lastEdited: "2 hours ago" },
        { title: "Blockchain Impact Study", progress: 14, lastEdited: "4 days ago" },
        { title: "AI in Healthcare", progress: 88, lastEdited: "1 week ago" }
    ];

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Your Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {projects.map((project, i) => (
                    <div key={i} className="group relative bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl p-5 hover:shadow-lg hover:border-ocean-primary/30 transition-all duration-300">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                <FolderOpen size={20} />
                            </div>
                            <button className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-muted-foreground">
                                <MoreVertical size={16} />
                            </button>
                        </div>

                        <h3 className="font-bold text-foreground text-lg mb-1 group-hover:text-ocean-primary transition-colors">{project.title}</h3>
                        <p className="text-xs text-muted-foreground font-medium mb-4">Last edited {project.lastEdited}</p>

                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
                                <span>Progress</span>
                                <span>{project.progress}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full"
                                    style={{ width: `${project.progress}%` }}
                                />
                            </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <span className="text-[11px] font-medium text-muted-foreground">thesis_v1.docx</span>
                            <button className="text-xs font-bold text-ocean-primary hover:underline">Open &rarr;</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
