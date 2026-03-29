import { useThemeStore } from "@/store/themeStore";
import { cn } from "@/lib/utils";
import { ArrowUpRight, BookOpen, GraduationCap, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface NewsItem {
    id: string;
    title: string;
    source: string;
    tag: string;
    icon: any;
    link: string;
}

export function AcademicNews() {
    const { theme } = useThemeStore();
    const [news, setNews] = useState<NewsItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const config = {
        light: { card: "card-scholar" },
        dark: { card: "card-research" },
        happy: { card: "card-creative" },
    }[theme];

    useEffect(() => {
        const fetchNews = async () => {
            try {
                setIsLoading(true);
                // Fallback direct since free API RSS to JSON frequently hits 500 error / CORS limit 
                setNews([
                    {
                        id: 'fallback-1',
                        title: "New Citation Style Update: APA 7th Edition rules changed",
                        source: "Academic Daily",
                        tag: "Library",
                        icon: BookOpen,
                        link: "#"
                    },
                    {
                        id: 'fallback-2',
                        title: "Tips for preparing your thesis defense presentation",
                        source: "University Guide",
                        tag: "Defense",
                        icon: GraduationCap,
                        link: "#"
                    },
                    {
                        id: 'fallback-3',
                        title: "How AI is transforming academic research methodologies",
                        source: "Tech & Education",
                        tag: "Research",
                        icon: BookOpen,
                        link: "#"
                    }
                ]);
            } catch (error) {
                console.error("Error fetching news:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNews();
    }, []);

    return (
        <div className={cn("p-6 h-full flex flex-col", config.card)}>
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold tracking-tight">Academic News</h3>
                <button className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    View All
                </button>
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                    </div>
                ) : (
                    news.map((item) => (
                        <a
                            key={item.id}
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative flex gap-4 p-3 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer"
                        >
                            <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                theme === 'dark' ? "bg-white/5" : "bg-primary/5 text-primary"
                            )}>
                                <item.icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0 pr-6">
                                <h4 className="text-sm font-semibold leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-2">
                                    {item.title}
                                </h4>
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                    <span className="truncate">{item.source}</span>
                                    <span className="w-1 h-1 rounded-full bg-current opacity-50 shrink-0" />
                                    <span>{item.tag}</span>
                                </div>
                            </div>
                            <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary absolute top-3 right-3" />
                        </a>
                    ))
                )}
            </div>

            <div className="mt-auto pt-4">
                <div className="p-3 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/10">
                    <p className="text-xs font-medium text-primary mb-1">Upcoming Deadline</p>
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-bold">Chapter 3 Submission</span>
                        <span className="text-xs font-mono bg-white/20 px-2 py-0.5 rounded">2 Days</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
