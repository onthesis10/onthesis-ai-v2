import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Construction, ArrowLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface PlaceholderPageProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
}

export default function PlaceholderPage({ title, description, icon: Icon = Construction }: PlaceholderPageProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
            <div className="glass-card p-10 flex flex-col items-center text-center max-w-md">
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                    <Icon className="w-8 h-8 text-primary" />
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold mb-2">{title}</h1>

                {/* Description */}
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                    {description || 'This feature is under development and will be available soon. Stay tuned for updates!'}
                </p>

                {/* Badge */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Coming Soon
                </span>

                {/* Back */}
                <Link
                    to="/dashboard"
                    className="btn-ghost text-[13px]"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </Link>
            </div>
        </div>
    );
}
