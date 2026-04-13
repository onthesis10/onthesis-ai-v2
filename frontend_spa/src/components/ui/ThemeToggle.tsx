import { Moon, Sun, Sparkles } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';

export function ThemeToggle() {
    const { theme, cycleTheme } = useThemeStore();

    return (
        <button
            onClick={cycleTheme}
            className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-border/50 bg-background/50 backdrop-blur-md transition-all hover:bg-muted/80 hover:scale-105"
            aria-label="Toggle theme"
            title="Toggle theme"
        >
            <div className="relative z-10 flex items-center justify-center transition-transform duration-300">
                {theme === 'light' && <Sun size={18} className="text-amber-500 transition-all drop-shadow-sm" />}
                {theme === 'dark' && <Moon size={18} className="text-sky-400 transition-all drop-shadow-sm" />}
                {theme === 'happy' && <Sparkles size={18} className="text-emerald-500 transition-all drop-shadow-sm" />}
            </div>
            
            {/* aesthetic glowing effect on hover */}
            <span 
                className="absolute inset-0 z-0 rounded-full opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100" 
                style={{
                    background: theme === 'light' 
                        ? 'var(--amber-500, #F59E0B)' 
                        : theme === 'dark' 
                            ? 'var(--sky-400, #38BDF8)' 
                            : 'var(--emerald-500, #10B981)'
                }} 
            />
        </button>
    );
}
