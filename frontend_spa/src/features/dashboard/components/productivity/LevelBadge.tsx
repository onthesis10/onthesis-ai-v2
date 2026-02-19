import React from 'react';
import { cn } from '@/lib/utils';
import { Trophy, Star, Award, GraduationCap } from 'lucide-react';

interface LevelBadgeProps {
    level: {
        current_level: string;
        icon: string;
        progress_percent: number;
        hours_to_next: number;
        next_level: string | null;
    };
}

export function LevelBadge({ level }: LevelBadgeProps) {
    const getIcon = (iconChar: string) => {
        switch (iconChar) {
            case '🥉': return Trophy;
            case '🥈': return Star;
            case '🥇': return Award;
            case '🎓': return GraduationCap;
            default: return Trophy;
        }
    };

    const Icon = getIcon(level.icon);

    return (
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100">{level.current_level}</h4>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {level.progress_percent}% to {level.next_level || 'Max'}
                    </span>
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${level.progress_percent}%` }}
                    />
                </div>
                {level.next_level && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {level.hours_to_next}h more to unlock {level.next_level}
                    </p>
                )}
            </div>
        </div>
    );
}
