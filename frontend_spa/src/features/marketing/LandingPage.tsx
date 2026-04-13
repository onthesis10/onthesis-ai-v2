import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    BarChart3,
    BookOpen,
    Bot,
    CheckCircle2,
    ChevronRight,
    Database,
    FileSpreadsheet,
    Files,
    GraduationCap,
    LineChart,
    Menu,
    PanelRight,
    PenTool,
    ShieldCheck,
    Sparkles,
    Workflow,
    X,
    type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { OnThesisLogo } from '@/components/ui/OnThesisLogo';
import { cn } from '@/lib/utils';
import heroArtwork from './assets/hero-cyber-student.png';

type FeatureItem = {
    title: string;
    description: string;
    icon: LucideIcon;
};

type StepItem = {
    index: string;
    title: string;
    description: string;
};

type PricingTier = {
    name: string;
    price: string;
    detail: string;
    summary: string;
    emphasized?: boolean;
};

const differentiators: FeatureItem[] = [
    {
        title: 'Context-aware thesis workflow',
        description:
            'OnThesis bekerja di atas project, chapter, referensi, dan target keluaran yang saling terhubung, jadi bukan AI yang memulai dari nol setiap kali.',
        icon: Workflow,
    },
    {
        title: 'AI yang paham ritme skripsi Indonesia',
        description:
            'Dari drafting, revisi, validasi sitasi, sampai interpretasi hasil analisis, alurnya dirancang untuk mahasiswa akhir yang benar-benar sedang mengerjakan naskah.',
        icon: ShieldCheck,
    },
    {
        title: 'Writing dan analysis dalam satu permukaan',
        description:
            'Narasi, tabel, chart, insight, dan bukti kerja tidak tercecer di banyak tools. Semua bergerak dalam satu workspace premium yang rapi.',
        icon: PanelRight,
    },
];

const writingSignals: FeatureItem[] = [
    {
        title: 'Writing Studio yang agent-first',
        description:
            'Drafting, revisi, lanjutan paragraf, dan evaluasi struktur berlangsung lewat agent yang membaca konteks proyek sebelum menulis.',
        icon: Bot,
    },
    {
        title: 'Generator Bab 1 sampai Bab 5',
        description:
            'Setiap chapter diarahkan mengikuti logika skripsi, bukan template prompt generik yang sulit dipertanggungjawabkan.',
        icon: BookOpen,
    },
    {
        title: 'Citation validation dan review diff',
        description:
            'Perubahan agent divisualkan sebagai diff dan sitasi diaudit sebelum masuk ke draft final, sehingga progres terasa aman dan terukur.',
        icon: CheckCircle2,
    },
];

const analysisSignals: FeatureItem[] = [
    {
        title: 'Data grid bergaya SPSS modern',
        description:
            'Upload dataset, jelajahi variable view, baca output, dan pindahkan insight ke pembahasan tanpa keluar dari flow kerja.',
        icon: Database,
    },
    {
        title: 'Menu statistik yang nyata',
        description:
            'Descriptive, frequency, normality, t-test, ANOVA, correlation, regression, reliability, validity, dan non-parametric sudah diposisikan sebagai workflow akademik.',
        icon: LineChart,
    },
    {
        title: 'Insight siap bawa ke naskah',
        description:
            'Chart, tabel, ringkasan, dan narasi interpretatif diproduksi agar langsung bisa diinsert ke Writing Studio dengan konteks yang tetap utuh.',
        icon: FileSpreadsheet,
    },
];

const ecosystemCards: FeatureItem[] = [
    {
        title: 'Citation Manager',
        description:
            'Kelola referensi lintas proyek, telusuri sumber, lalu rapikan daftar pustaka tanpa perlu berpindah ekosistem.',
        icon: Files,
    },
    {
        title: 'Academic Paraphrase',
        description:
            'Parafrase akademik dilengkapi kontrol similarity, readability, tone, dan citation integrity agar output tetap bertanggung jawab.',
        icon: PenTool,
    },
    {
        title: 'History yang tidak tercecer',
        description:
            'Project writing, analysis session, histori perubahan, dan progress kerja tetap tersimpan sehingga pengerjaan panjang terasa lebih tenang.',
        icon: Workflow,
    },
    {
        title: 'Planner dan defense prep',
        description:
            'Thesis graph, logic audit, dan simulasi sidang membantu Anda menjaga naskah tetap koheren sampai tahap akhir.',
        icon: GraduationCap,
    },
];

const journeySteps: StepItem[] = [
    {
        index: '01',
        title: 'Masukkan konteks riset yang sebenarnya',
        description:
            'Bawa judul, bab aktif, referensi, dan dataset supaya agent bekerja di atas realitas proyek Anda, bukan asumsi generik.',
    },
    {
        index: '02',
        title: 'Bekerja di workspace yang spesifik tugas',
        description:
            'Gunakan Writing Agent untuk membangun naskah dan Data Analysis Agent untuk membaca angka, chart, serta interpretasi akademik.',
    },
    {
        index: '03',
        title: 'Ubah output menjadi progres yang bisa dikirim',
        description:
            'Masukkan insight ke editor, cek sitasi, rapikan argumen, dan lanjutkan sampai draft terasa siap dibimbing, diuji, dan diserahkan.',
    },
];

const pricingTiers: PricingTier[] = [
    {
        name: 'Rookie',
        price: 'Gratis',
        detail: 'Masuk tanpa komitmen',
        summary: 'Untuk mengenal workspace, memulai satu proyek, dan mencoba ritme kerja OnThesis.',
    },
    {
        name: 'Grinder',
        price: 'Rp 49.000/bulan',
        detail: 'Untuk progres yang konsisten',
        summary: 'Project unlimited, paraphrase, sitasi, planner, dan export dasar untuk ritme pengerjaan mingguan.',
    },
    {
        name: 'Scholar',
        price: 'Rp 99.000/bulan',
        detail: 'Untuk pengerjaan yang benar-benar serius',
        summary: 'Membuka Data Analysis Suite dan kapabilitas akademik yang lebih lengkap untuk fase riset intensif.',
        emphasized: true,
    },
];

const heroProofs = [
    'Writing Studio dengan agent runtime',
    'Data Analysis Suite untuk statistik akademik',
    'Citation, paraphrase, dan thesis graph dalam satu flow',
];

const analysisTags = [
    'Descriptive',
    'Frequency',
    'Normality',
    'T-Test',
    'ANOVA',
    'Correlation',
    'Regression',
    'Reliability',
    'Validity',
    'Non-Parametric',
];

const GLOBAL_CSS = `
:root {
    --otlp-display: 'Space Grotesk', 'Plus Jakarta Sans', system-ui, sans-serif;
    --otlp-sans: 'Plus Jakarta Sans', Inter, system-ui, sans-serif;
    --otlp-mono: 'IBM Plex Mono', 'JetBrains Mono', monospace;
}

[data-ot-reveal] {
    opacity: 0;
    transform: translateY(28px) scale(.985);
    transition:
        opacity .7s cubic-bezier(.22, 1, .36, 1),
        transform .7s cubic-bezier(.22, 1, .36, 1);
}

[data-ot-reveal][data-visible='true'] {
    opacity: 1;
    transform: none;
}

.otlp-root {
    position: relative;
    isolation: isolate;
    background:
        radial-gradient(circle at 12% 18%, hsl(var(--primary) / .12), transparent 30%),
        radial-gradient(circle at 88% 16%, hsl(var(--primary) / .09), transparent 26%),
        radial-gradient(circle at 50% 100%, hsl(var(--primary) / .08), transparent 42%),
        linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)) 48%, hsl(var(--card) / .45) 100%);
}

.otlp-root::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: -2;
    opacity: .24;
    background-image:
        linear-gradient(hsl(var(--border) / .18) 1px, transparent 1px),
        linear-gradient(90deg, hsl(var(--border) / .18) 1px, transparent 1px);
    background-size: 72px 72px;
    mask-image: linear-gradient(180deg, rgba(0, 0, 0, .85), transparent 96%);
}

.otlp-root::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: -1;
    opacity: .05;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)' opacity='.9'/%3E%3C/svg%3E");
    background-size: 200px 200px;
}

.otlp-display {
    font-family: var(--otlp-display);
    letter-spacing: -.045em;
}

.otlp-mono {
    font-family: var(--otlp-mono);
    letter-spacing: .08em;
}

.otlp-kicker {
    display: inline-flex;
    align-items: center;
    gap: .625rem;
    padding: .55rem 1rem;
    border-radius: 999px;
    border: 1px solid hsl(var(--primary) / .2);
    background: linear-gradient(180deg, hsl(var(--card) / .86), hsl(var(--card) / .58));
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, .08),
        0 12px 30px hsl(var(--primary) / .08);
    color: hsl(var(--primary));
    font: 600 .7rem/1 var(--otlp-mono);
    text-transform: uppercase;
}

.otlp-panel {
    background:
        linear-gradient(180deg, hsl(var(--card) / .92), hsl(var(--card) / .68));
    border: 1px solid hsl(var(--border) / .72);
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, .06),
        0 18px 60px rgba(2, 6, 23, .08),
        0 0 0 1px hsl(var(--primary) / .04);
    backdrop-filter: blur(18px) saturate(140%);
}

.dark .otlp-panel {
    background:
        linear-gradient(180deg, rgba(11, 17, 32, .9), rgba(11, 17, 32, .72));
    border-color: rgba(125, 211, 252, .14);
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, .04),
        0 24px 80px rgba(2, 8, 23, .48),
        0 0 0 1px rgba(14, 165, 233, .08);
}

.happy .otlp-panel {
    background:
        linear-gradient(180deg, rgba(255, 255, 255, .92), rgba(255, 252, 245, .76));
}

.otlp-panel-strong {
    position: relative;
    overflow: hidden;
}

.otlp-panel-strong::before {
    content: '';
    position: absolute;
    inset: -1px;
    background:
        linear-gradient(120deg, transparent 0%, hsl(var(--primary) / .24) 18%, transparent 42%, transparent 58%, hsl(var(--primary) / .18) 82%, transparent 100%);
    opacity: .7;
    pointer-events: none;
    animation: otlp-sweep 8s linear infinite;
}

.otlp-chip {
    border-radius: 999px;
    border: 1px solid hsl(var(--border) / .75);
    background: hsl(var(--card) / .75);
    color: hsl(var(--muted-foreground));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .04);
}

.otlp-grid-card {
    position: relative;
    overflow: hidden;
    border-radius: 1.75rem;
}

.otlp-grid-card::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: inherit;
    background: linear-gradient(180deg, rgba(255, 255, 255, .06), transparent 28%, transparent 72%, rgba(14, 165, 233, .1));
}

.otlp-card-hover {
    transition:
        transform .35s cubic-bezier(.22, 1, .36, 1),
        border-color .25s ease,
        box-shadow .35s ease,
        background .25s ease;
}

.otlp-card-hover:hover {
    transform: translateY(-6px);
    border-color: hsl(var(--primary) / .25);
    box-shadow:
        0 26px 70px hsl(var(--primary) / .1),
        inset 0 1px 0 rgba(255, 255, 255, .08);
}

.otlp-section-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, hsl(var(--border) / .95), transparent);
}

.otlp-ring {
    position: absolute;
    border-radius: 999px;
    border: 1px solid hsl(var(--primary) / .22);
    animation: otlp-drift 12s ease-in-out infinite;
}

.otlp-orb {
    position: absolute;
    border-radius: 999px;
    background: radial-gradient(circle, hsl(var(--primary) / .32), transparent 70%);
    filter: blur(10px);
    animation: otlp-pulse 5s ease-in-out infinite;
}

.otlp-hero-art {
    position: relative;
    overflow: hidden;
}

.otlp-hero-art img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.otlp-hero-art::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
        linear-gradient(180deg, rgba(3, 7, 18, .02), rgba(3, 7, 18, .24)),
        radial-gradient(circle at 80% 18%, rgba(56, 189, 248, .26), transparent 26%);
    pointer-events: none;
}

.otlp-nav-link {
    position: relative;
    color: hsl(var(--muted-foreground));
    transition: color .2s ease;
}

.otlp-nav-link::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: -.4rem;
    height: 1px;
    background: linear-gradient(90deg, transparent, hsl(var(--primary)), transparent);
    transform: scaleX(0);
    transform-origin: center;
    transition: transform .25s cubic-bezier(.22, 1, .36, 1);
}

.otlp-nav-link:hover {
    color: hsl(var(--foreground));
}

.otlp-nav-link:hover::after {
    transform: scaleX(1);
}

.otlp-number {
    font-family: var(--otlp-display);
    font-size: clamp(3rem, 8vw, 5rem);
    line-height: .9;
    color: hsl(var(--primary) / .14);
}

.otlp-mobile-menu {
    transform-origin: top center;
    transition:
        opacity .25s ease,
        transform .25s ease,
        visibility .25s ease;
}

.otlp-mobile-menu[data-open='false'] {
    opacity: 0;
    transform: translateY(-10px) scale(.98);
    visibility: hidden;
    pointer-events: none;
}

.otlp-mobile-menu[data-open='true'] {
    opacity: 1;
    transform: translateY(0) scale(1);
    visibility: visible;
}

@keyframes otlp-pulse {
    0%, 100% { transform: scale(1); opacity: .75; }
    50% { transform: scale(1.08); opacity: 1; }
}

@keyframes otlp-drift {
    0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
    50% { transform: translate3d(0, -10px, 0) rotate(4deg); }
}

@keyframes otlp-sweep {
    0% { transform: translateX(-45%); opacity: 0; }
    12% { opacity: .7; }
    50% { opacity: .32; }
    100% { transform: translateX(45%); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
    [data-ot-reveal] {
        opacity: 1;
        transform: none;
        transition: none;
    }

    .otlp-ring,
    .otlp-orb,
    .otlp-panel-strong::before,
    .otlp-card-hover {
        animation: none !important;
        transition: none !important;
    }
}
`;

function usePremiumFonts() {
    useEffect(() => {
        if (document.getElementById('otlp-fonts')) return;
        const link = document.createElement('link');
        link.id = 'otlp-fonts';
        link.rel = 'stylesheet';
        link.href =
            'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap';
        document.head.appendChild(link);
    }, []);
}

function useReveal(ref: React.RefObject<HTMLElement | null>) {
    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            element.dataset.visible = 'true';
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    element.dataset.visible = 'true';
                    observer.unobserve(element);
                }
            },
            { threshold: 0.12, rootMargin: '0px 0px -72px 0px' },
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, [ref]);
}

function Reveal({
    children,
    className,
    delay = 0,
}: {
    children: ReactNode;
    className?: string;
    delay?: number;
}) {
    const ref = useRef<HTMLDivElement>(null);
    useReveal(ref);

    return (
        <div
            ref={ref}
            data-ot-reveal
            className={className}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
}

function GlobalStyles() {
    useEffect(() => {
        if (document.getElementById('otlp-global-styles')) return;
        const style = document.createElement('style');
        style.id = 'otlp-global-styles';
        style.textContent = GLOBAL_CSS;
        document.head.appendChild(style);
    }, []);

    return null;
}

function SectionIntro({
    eyebrow,
    title,
    description,
    align = 'left',
}: {
    eyebrow: string;
    title: ReactNode;
    description: string;
    align?: 'left' | 'center';
}) {
    const centered = align === 'center';

    return (
        <div className={cn('space-y-5', centered && 'mx-auto max-w-3xl text-center')}>
            <Reveal>
                <span className="otlp-kicker">
                    <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_18px_hsl(var(--primary)/.8)]" />
                    {eyebrow}
                </span>
            </Reveal>
            <Reveal delay={70}>
                <h2 className="otlp-display text-4xl font-semibold tracking-[-0.05em] text-foreground sm:text-5xl">
                    {title}
                </h2>
            </Reveal>
            <Reveal delay={130}>
                <p className={cn('text-[15px] leading-8 text-muted-foreground sm:text-base', centered && 'mx-auto max-w-2xl')}>
                    {description}
                </p>
            </Reveal>
        </div>
    );
}

function FeatureCard({ item, delay = 0 }: { item: FeatureItem; delay?: number }) {
    const Icon = item.icon;

    return (
        <Reveal delay={delay}>
            <article className="otlp-panel otlp-grid-card otlp-card-hover h-full rounded-[28px] p-6 sm:p-7">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[0_0_40px_hsl(var(--primary)/.18)]">
                    <Icon size={18} />
                </div>
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
                    {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {item.description}
                </p>
            </article>
        </Reveal>
    );
}

function FlagshipPanel({
    eyebrow,
    title,
    description,
    highlights,
    tags,
    reverse = false,
    visual,
}: {
    eyebrow: string;
    title: ReactNode;
    description: string;
    highlights: FeatureItem[];
    tags: string[];
    reverse?: boolean;
    visual: ReactNode;
}) {
    return (
        <section
            className={cn(
                'grid items-center gap-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-12',
                reverse && 'lg:grid-cols-[.95fr_1.05fr]',
            )}
        >
            <div className={cn('space-y-7', reverse && 'lg:order-2')}>
                <SectionIntro eyebrow={eyebrow} title={title} description={description} />
                <Reveal delay={180}>
                    <div className="flex flex-wrap gap-2.5">
                        {tags.map((tag) => (
                            <span
                                key={tag}
                                className="otlp-chip px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em]"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </Reveal>
                <div className="grid gap-4">
                    {highlights.map((item, index) => (
                        <FeatureCard key={item.title} item={item} delay={220 + index * 80} />
                    ))}
                </div>
            </div>
            <Reveal delay={140} className={cn(reverse && 'lg:order-1')}>
                {visual}
            </Reveal>
        </section>
    );
}

function Navbar() {
    const [open, setOpen] = useState(false);

    const navItems = [
        { href: '#value', label: 'Why OnThesis' },
        { href: '#writing-agent', label: 'Writing Agent' },
        { href: '#data-analysis', label: 'Data Analysis' },
        { href: '#workflow', label: 'Workflow' },
        { href: '#pricing', label: 'Pricing' },
    ];

    return (
        <header className="sticky top-0 z-50 border-b border-border/40 bg-background/72 backdrop-blur-xl">
            <div className="container py-4">
                <div className="otlp-panel flex items-center justify-between rounded-full px-4 py-3 sm:px-5">
                    <a href="#top" className="flex items-center">
                        <OnThesisLogo variant="animated" className="h-9 w-auto" />
                    </a>

                    <nav className="hidden items-center gap-7 lg:flex">
                        {navItems.map((item) => (
                            <a
                                key={item.href}
                                href={item.href}
                                className="otlp-nav-link text-sm font-medium"
                            >
                                {item.label}
                            </a>
                        ))}
                    </nav>

                    <div className="hidden items-center gap-2 sm:flex">
                        <Button asChild variant="ghost" className="rounded-full px-5">
                            <Link to="/login">Login</Link>
                        </Button>
                        <Button asChild className="rounded-full px-5 shadow-lg shadow-primary/25">
                            <Link to="/register">
                                Mulai Gratis
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setOpen((value) => !value)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-background/80 text-foreground lg:hidden"
                        aria-label={open ? 'Tutup menu' : 'Buka menu'}
                        aria-expanded={open}
                    >
                        {open ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>

                <div
                    data-open={open}
                    className="otlp-mobile-menu otlp-panel mt-3 rounded-[28px] p-4 lg:hidden"
                >
                    <div className="flex flex-col gap-3">
                        {navItems.map((item) => (
                            <a
                                key={item.href}
                                href={item.href}
                                className="rounded-2xl px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
                                onClick={() => setOpen(false)}
                            >
                                {item.label}
                            </a>
                        ))}
                    </div>
                    <div className="mt-4 grid gap-2 sm:hidden">
                        <Button asChild variant="ghost" className="rounded-full">
                            <Link to="/login">Login</Link>
                        </Button>
                        <Button asChild className="rounded-full shadow-lg shadow-primary/25">
                            <Link to="/register">
                                Mulai Gratis
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
}

function Hero() {
    return (
        <section id="top" className="relative overflow-hidden pb-16 pt-10 sm:pb-24 sm:pt-16">
            <div className="otlp-orb left-[6%] top-12 h-40 w-40 sm:h-56 sm:w-56" />
            <div className="otlp-orb bottom-8 right-[8%] h-44 w-44 sm:h-60 sm:w-60" />
            <div className="otlp-ring left-[10%] top-24 h-52 w-52" />
            <div className="otlp-ring bottom-12 right-[6%] h-72 w-72 [animation-delay:2s]" />

            <div className="container">
                <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_.98fr] xl:gap-16">
                    <div className="max-w-3xl">
                        <Reveal>
                            <span className="otlp-kicker">
                                <Sparkles size={13} />
                                Thesis workflow, not generic AI
                            </span>
                        </Reveal>
                        <Reveal delay={70}>
                            <h1 className="otlp-display mt-6 text-5xl font-semibold leading-[0.94] text-foreground sm:text-6xl xl:text-7xl">
                                Studio AI untuk skripsi yang terasa{' '}
                                <span className="bg-gradient-to-r from-primary via-sky-300 to-primary bg-clip-text text-transparent">
                                    mahal, fokus, dan siap dipakai
                                </span>{' '}
                                dari draft sampai pembahasan.
                            </h1>
                        </Reveal>
                        <Reveal delay={130}>
                            <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                                OnThesis menyatukan Writing Agent, Data Analysis Agent, sitasi,
                                paraphrase, dan thesis graph ke dalam satu workspace modern untuk
                                mahasiswa Indonesia yang ingin bergerak cepat tanpa kehilangan
                                kedalaman akademik.
                            </p>
                        </Reveal>

                        <Reveal delay={190}>
                            <div className="mt-8 flex flex-wrap gap-3">
                                <Button asChild size="lg" className="rounded-full px-7 shadow-xl shadow-primary/30">
                                    <Link to="/register">
                                        Mulai Gratis
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    size="lg"
                                    variant="outline"
                                    className="rounded-full border-border/70 bg-background/70 px-6 backdrop-blur-md"
                                >
                                    <a href="#workflow">
                                        Lihat Cara Kerja
                                        <ChevronRight className="ml-1.5 h-4 w-4" />
                                    </a>
                                </Button>
                            </div>
                        </Reveal>

                        <Reveal delay={240}>
                            <div className="mt-8 flex flex-wrap gap-3">
                                {heroProofs.map((proof) => (
                                    <span
                                        key={proof}
                                        className="otlp-chip inline-flex items-center gap-2 px-4 py-2.5 text-sm"
                                    >
                                        <CheckCircle2 size={14} className="text-primary" />
                                        {proof}
                                    </span>
                                ))}
                            </div>
                        </Reveal>

                        <Reveal delay={300}>
                            <div className="mt-10 grid gap-3 sm:grid-cols-3">
                                {[
                                    { label: 'Live workspace', value: 'Chapter-aware drafting' },
                                    { label: 'Statistical flow', value: 'Chart, tabel, narasi' },
                                    { label: 'Academic control', value: 'Citation + review state' },
                                ].map((item) => (
                                    <div
                                        key={item.label}
                                        className="otlp-panel rounded-[24px] px-5 py-4"
                                    >
                                        <p className="otlp-mono text-[10px] uppercase text-primary">
                                            {item.label}
                                        </p>
                                        <p className="mt-2 text-sm font-semibold text-foreground">
                                            {item.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </Reveal>
                    </div>

                    <Reveal delay={140}>
                        <div className="relative mx-auto w-full max-w-[720px]">
                            <div className="otlp-panel otlp-grid-card otlp-panel-strong rounded-[32px] p-3 sm:p-4">
                                <div className="otlp-hero-art rounded-[26px] border border-white/10 bg-slate-950/90">
                                    <img
                                        src={heroArtwork}
                                        alt="Mahasiswa Indonesia di workspace riset futuristik"
                                        className="aspect-[16/11]"
                                        loading="eager"
                                    />
                                </div>
                            </div>

                            <div className="otlp-panel absolute -left-4 top-6 hidden max-w-[220px] rounded-[24px] p-4 shadow-2xl lg:block">
                                <p className="otlp-mono text-[10px] uppercase text-primary">
                                    Writing agent live
                                </p>
                                <p className="mt-3 text-sm font-semibold text-foreground">
                                    Bab 4 - Pembahasan
                                </p>
                                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                                    Korelasi signifikan sudah diterjemahkan menjadi narasi akademik
                                    yang siap direvisi.
                                </p>
                                <div className="mt-4 flex gap-2">
                                    {['B1', 'B2', 'B3', 'B4'].map((chapter, index) => (
                                        <span
                                            key={chapter}
                                            className={cn(
                                                'rounded-full px-2.5 py-1 text-[10px] font-semibold',
                                                index < 3
                                                    ? 'bg-primary/15 text-primary'
                                                    : 'bg-emerald-500/15 text-emerald-400',
                                            )}
                                        >
                                            {chapter}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="otlp-panel absolute -bottom-6 right-0 w-[86%] rounded-[26px] p-4 sm:w-[72%]">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="otlp-mono text-[10px] uppercase text-primary">
                                            Data analysis suite
                                        </p>
                                        <p className="mt-2 text-sm font-semibold text-foreground">
                                            Regression output to ready-to-insert insight
                                        </p>
                                    </div>
                                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
                                        Live sync
                                    </span>
                                </div>
                                <div className="mt-4 grid grid-cols-7 gap-2">
                                    {[34, 48, 42, 66, 58, 82, 72].map((height, index) => (
                                        <div
                                            key={`${height}-${index}`}
                                            className="rounded-t-full bg-primary/20"
                                            style={{
                                                height,
                                                background:
                                                    index === 5
                                                        ? 'hsl(var(--primary))'
                                                        : 'hsl(var(--primary) / .22)',
                                            }}
                                        />
                                    ))}
                                </div>
                                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                                    {[
                                        'R² 0.81',
                                        'p < 0.001',
                                        'Narasi siap diinsert',
                                    ].map((item) => (
                                        <div
                                            key={item}
                                            className="rounded-2xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground"
                                        >
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}

function ValueSection() {
    return (
        <section id="value" className="py-20 sm:py-28">
            <div className="container">
                <div className="grid gap-10 lg:grid-cols-[.92fr_1.08fr] xl:gap-16">
                    <div className="space-y-6">
                        <SectionIntro
                            eyebrow="Why OnThesis"
                            title={
                                <>
                                    Bukan chatbot yang kebetulan bisa menulis, melainkan{' '}
                                    <span className="text-primary">sistem kerja skripsi</span>.
                                </>
                            }
                            description="OnThesis dibangun untuk problem yang benar-benar dihadapi mahasiswa akhir: naskah yang harus konsisten, sitasi yang harus aman, data yang harus terbaca, dan progres yang harus terus terasa bergerak."
                        />
                        <Reveal delay={180}>
                            <div className="otlp-panel rounded-[30px] p-6 sm:p-7">
                                <p className="otlp-mono text-[10px] uppercase text-primary">
                                    Product surface yang dipromosikan
                                </p>
                                <div className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                                    {[
                                        'Writing Studio + agent runtime',
                                        'Data Analysis Suite',
                                        'Citation & paraphrase tools',
                                        'Planner, logic audit, defense prep',
                                    ].map((item) => (
                                        <div
                                            key={item}
                                            className="rounded-[22px] border border-border/65 bg-background/45 px-4 py-4"
                                        >
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Reveal>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {differentiators.map((item, index) => (
                            <FeatureCard key={item.title} item={item} delay={index * 90} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

function WritingVisual() {
    return (
        <div className="otlp-panel otlp-grid-card rounded-[32px] p-5 sm:p-6">
            <div className="grid gap-4">
                <div className="otlp-panel rounded-[24px] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-foreground">
                                Writing Studio
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Project-aware drafting and review state
                            </p>
                        </div>
                        <span className="rounded-full border border-primary/25 bg-primary/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                            Agent active
                        </span>
                    </div>
                    <div className="mt-4 rounded-[22px] border border-border/70 bg-background/45 p-4">
                        <p className="text-sm leading-7 text-muted-foreground">
                            Temuan penelitian menunjukkan hubungan signifikan antara variabel X
                            dan Y, lalu agent menyusun argumen pembahasan berdasarkan teori yang
                            sudah tersimpan di project.
                        </p>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-5">
                        {['Bab 1', 'Bab 2', 'Bab 3', 'Bab 4', 'Bab 5'].map((chapter, index) => (
                            <span
                                key={chapter}
                                className={cn(
                                    'rounded-full px-3 py-2 text-center text-xs font-medium',
                                    index === 3
                                        ? 'border border-primary/30 bg-primary/15 text-primary'
                                        : 'border border-border/65 bg-background/45 text-muted-foreground',
                                )}
                            >
                                {chapter}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[1.2fr_.8fr]">
                    <div className="otlp-panel rounded-[24px] p-4">
                        <p className="otlp-mono text-[10px] uppercase text-primary">
                            Review diff
                        </p>
                        <div className="mt-4 space-y-3 text-sm">
                            <div className="rounded-[18px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-400">
                                + Narasi pembahasan konsisten dengan hasil uji regresi
                            </div>
                            <div className="rounded-[18px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-amber-300">
                                ! Periksa ulang 1 sitasi sebelum finalisasi
                            </div>
                        </div>
                    </div>
                    <div className="otlp-panel rounded-[24px] p-4">
                        <p className="otlp-mono text-[10px] uppercase text-primary">
                            Context stack
                        </p>
                        <div className="mt-4 space-y-2">
                            {['Judul penelitian', 'Teori utama', 'Referensi aktif', 'Catatan pembimbing'].map((item) => (
                                <div
                                    key={item}
                                    className="rounded-2xl border border-border/65 bg-background/45 px-3 py-2 text-xs text-muted-foreground"
                                >
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AnalysisVisual() {
    return (
        <div className="otlp-panel otlp-grid-card rounded-[32px] p-5 sm:p-6">
            <div className="grid gap-4">
                <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
                    <div className="otlp-panel rounded-[24px] p-4">
                        <p className="text-sm font-semibold text-foreground">Analysis menu</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {analysisTags.map((tag) => (
                                <span
                                    key={tag}
                                    className="rounded-full border border-border/65 bg-background/45 px-3 py-1.5 text-[11px] text-muted-foreground"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="otlp-panel rounded-[24px] p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-foreground">
                                    Regression output
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Dari angka ke insight yang siap dipakai
                                </p>
                            </div>
                            <BarChart3 className="text-primary" size={18} />
                        </div>
                        <div className="mt-5 flex h-40 items-end gap-2 rounded-[22px] border border-border/60 bg-background/40 px-4 pb-4 pt-6">
                            {[30, 52, 44, 74, 60, 92, 70, 86].map((height, index) => (
                                <div
                                    key={`${height}-${index}`}
                                    className="flex-1 rounded-t-[18px]"
                                    style={{
                                        height,
                                        background:
                                            index > 5
                                                ? 'linear-gradient(180deg, hsl(var(--primary)), hsl(var(--primary) / .45))'
                                                : 'linear-gradient(180deg, hsl(var(--primary) / .34), hsl(var(--primary) / .12))',
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {[
                        'R² = 0.81',
                        'Signifikansi p < 0.001',
                        'Narasi siap masuk ke editor',
                    ].map((item) => (
                        <div
                            key={item}
                            className="otlp-panel rounded-[22px] px-4 py-4 text-sm font-medium text-foreground"
                        >
                            {item}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function FlagshipSections() {
    return (
        <section className="space-y-24 py-20 sm:space-y-28 sm:py-28">
            <div className="container">
                <FlagshipPanel
                    eyebrow="Writing Agent"
                    title={
                        <>
                            Menulis di workspace yang membaca{' '}
                            <span className="text-primary">konteks proyek</span>, bukan sekadar
                            prompt.
                        </>
                    }
                    description="Writing Studio OnThesis dirancang agar agent memahami chapter aktif, referensi, status revisi, dan arah argumen sebelum ikut membantu menulis."
                    highlights={writingSignals}
                    tags={[
                        'Context builder',
                        'Diff approval',
                        'Chapter-aware generation',
                    ]}
                    visual={<WritingVisual />}
                />
            </div>

            <div id="data-analysis" className="container">
                <FlagshipPanel
                    eyebrow="Data Analysis Agent"
                    title={
                        <>
                            Dari dataset ke pembahasan dalam{' '}
                            <span className="text-primary">satu flow modern</span>.
                        </>
                    }
                    description="Data Analysis OnThesis menggabungkan data view, variable view, output, assistant, dan visualisasi agar proses dari angka ke narasi terasa jauh lebih singkat."
                    highlights={analysisSignals}
                    tags={[
                        'Data grid',
                        'Output renderer',
                        'Chart + narrative sync',
                    ]}
                    reverse
                    visual={<AnalysisVisual />}
                />
            </div>
        </section>
    );
}

function EcosystemSection() {
    return (
        <section className="py-20 sm:py-28">
            <div className="container space-y-12">
                <SectionIntro
                    eyebrow="Ecosystem"
                    title={
                        <>
                            Semua yang biasanya tercecer kini{' '}
                            <span className="text-primary">terkunci dalam ekosistem yang sama</span>.
                        </>
                    }
                    description="Citation manager, paraphrase, thesis graph, history project, dan evidence of work tetap hadir sebagai bagian dari perjalanan akademik yang sama, bukan add-on yang berdiri sendiri."
                    align="center"
                />

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {ecosystemCards.map((item, index) => (
                        <FeatureCard key={item.title} item={item} delay={index * 80} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function WorkflowSection() {
    return (
        <section id="workflow" className="py-20 sm:py-28">
            <div className="container space-y-12">
                <SectionIntro
                    eyebrow="Workflow"
                    title={
                        <>
                            Mulai cepat, tetap rapi saat proyek{' '}
                            <span className="text-primary">makin kompleks</span>.
                        </>
                    }
                    description="Masuk dengan konteks yang benar, pilih workspace yang sesuai, lalu ubah output agent menjadi progres yang memang bisa dipakai untuk bimbingan dan penyelesaian."
                    align="center"
                />

                <div className="relative grid gap-4 lg:grid-cols-3">
                    <div className="pointer-events-none absolute left-[16%] right-[16%] top-8 hidden h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent lg:block" />
                    {journeySteps.map((step, index) => (
                        <Reveal key={step.index} delay={index * 100}>
                            <article className="otlp-panel otlp-grid-card otlp-card-hover relative rounded-[30px] p-6 sm:p-7">
                                <div className="otlp-number absolute right-5 top-5">
                                    {step.index}
                                </div>
                                <div className="relative z-10">
                                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[18px] border border-primary/25 bg-background/70 text-lg font-semibold text-primary shadow-[0_0_30px_hsl(var(--primary)/.14)]">
                                        {step.index}
                                    </div>
                                    <p className="otlp-mono text-[10px] uppercase text-primary">
                                        Step {step.index}
                                    </p>
                                    <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-foreground">
                                        {step.title}
                                    </h3>
                                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                                        {step.description}
                                    </p>
                                </div>
                            </article>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

function PricingSection() {
    return (
        <section id="pricing" className="py-20 sm:py-28">
            <div className="container space-y-12">
                <SectionIntro
                    eyebrow="Pricing teaser"
                    title={
                        <>
                            Masuk ringan, naik saat ritme riset{' '}
                            <span className="text-primary">makin serius</span>.
                        </>
                    }
                    description="Pricing dibuat tetap ringkas di landing page. Struktur paket dipertahankan agar pengunjung bisa cepat membaca momentum upgrade tanpa kehilangan konteks produk."
                    align="center"
                />

                <div className="grid gap-4 lg:grid-cols-3">
                    {pricingTiers.map((tier, index) => (
                        <Reveal key={tier.name} delay={index * 90}>
                            <article
                                className={cn(
                                    'otlp-panel otlp-grid-card otlp-card-hover relative h-full rounded-[30px] p-7',
                                    tier.emphasized && 'border-primary/30 shadow-[0_24px_80px_hsl(var(--primary)/.18)]',
                                )}
                            >
                                {tier.emphasized && (
                                    <div className="absolute inset-x-0 top-0 flex justify-center">
                                        <span className="rounded-b-2xl bg-primary px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground">
                                            Recommended
                                        </span>
                                    </div>
                                )}
                                <div className={cn(tier.emphasized && 'pt-6')}>
                                    <p className="text-sm font-medium text-primary">
                                        {tier.detail}
                                    </p>
                                    <h3 className="otlp-display mt-4 text-3xl font-semibold text-foreground">
                                        {tier.name}
                                    </h3>
                                    <p
                                        className={cn(
                                            'otlp-display mt-3 text-4xl font-semibold tracking-[-0.05em]',
                                            tier.emphasized ? 'text-primary' : 'text-foreground',
                                        )}
                                    >
                                        {tier.price}
                                    </p>
                                    <div className="otlp-section-divider my-6" />
                                    <p className="text-sm leading-7 text-muted-foreground">
                                        {tier.summary}
                                    </p>
                                    <Button
                                        asChild
                                        variant={tier.emphasized ? 'default' : 'outline'}
                                        className={cn(
                                            'mt-8 w-full rounded-full',
                                            tier.emphasized && 'shadow-lg shadow-primary/25',
                                        )}
                                    >
                                        <Link to="/register">
                                            {tier.name === 'Rookie' ? 'Mulai Gratis' : 'Pilih Paket'}
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            </article>
                        </Reveal>
                    ))}
                </div>

                <div className="flex justify-center">
                    <Button asChild variant="ghost" className="rounded-full px-5">
                        <Link to="/pricing">
                            Lihat Pricing Lengkap
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}

function CTASection() {
    return (
        <section className="pb-20 pt-10 sm:pb-24">
            <div className="container">
                <Reveal>
                    <div className="otlp-panel otlp-grid-card otlp-panel-strong rounded-[34px] px-6 py-10 text-center sm:px-10 sm:py-14">
                        <span className="otlp-kicker">
                            <Sparkles size={13} />
                            Siap untuk memulai?
                        </span>
                        <h2 className="otlp-display mx-auto mt-6 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-foreground sm:text-5xl">
                            Bawa skripsimu ke level yang lebih tenang, lebih tajam, dan lebih{' '}
                            <span className="text-primary">siap dipertanggungjawabkan</span>.
                        </h2>
                        <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-muted-foreground sm:text-base">
                            Mulai gratis hari ini dan rasakan workspace AI yang menyatukan drafting,
                            statistik, sitasi, dan evidence of work dalam satu permukaan premium.
                        </p>
                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            <Button asChild size="lg" className="rounded-full px-8 shadow-xl shadow-primary/30">
                                <Link to="/register">
                                    Mulai Gratis Sekarang
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button
                                asChild
                                size="lg"
                                variant="outline"
                                className="rounded-full border-border/70 bg-background/70 px-8 backdrop-blur-md"
                            >
                                <Link to="/pricing">Lihat Semua Fitur</Link>
                            </Button>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}

function Footer() {
    return (
        <footer className="border-t border-border/60 py-10">
            <div className="container">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-md">
                        <OnThesisLogo variant="static" className="h-9 w-auto" />
                        <p className="mt-4 text-sm leading-8 text-muted-foreground">
                            Workspace AI untuk mahasiswa Indonesia yang ingin menyelesaikan skripsi
                            dan tesis dengan ritme kerja yang lebih modern, lebih elegan, dan lebih
                            terarah.
                        </p>
                    </div>

                    <div className="grid gap-8 sm:grid-cols-3">
                        <div>
                            <p className="otlp-mono text-[10px] uppercase text-primary">
                                Product
                            </p>
                            <div className="mt-3 grid gap-3 text-sm text-muted-foreground">
                                <a href="#writing-agent" className="transition-colors hover:text-foreground">
                                    Writing Agent
                                </a>
                                <a href="#data-analysis" className="transition-colors hover:text-foreground">
                                    Data Analysis
                                </a>
                                <a href="#pricing" className="transition-colors hover:text-foreground">
                                    Pricing
                                </a>
                            </div>
                        </div>
                        <div>
                            <p className="otlp-mono text-[10px] uppercase text-primary">
                                Access
                            </p>
                            <div className="mt-3 grid gap-3 text-sm text-muted-foreground">
                                <Link to="/login" className="transition-colors hover:text-foreground">
                                    Login
                                </Link>
                                <Link to="/register" className="transition-colors hover:text-foreground">
                                    Register
                                </Link>
                                <Link to="/pricing" className="transition-colors hover:text-foreground">
                                    Full pricing
                                </Link>
                            </div>
                        </div>
                        <div>
                            <p className="otlp-mono text-[10px] uppercase text-primary">
                                Built for
                            </p>
                            <div className="mt-3 grid gap-3 text-sm text-muted-foreground">
                                <span>Mahasiswa Indonesia</span>
                                <span>Writing + analysis workflow</span>
                                <span>Academic-ready delivery</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="otlp-section-divider my-8" />

                <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <p>© 2025 OnThesis. Dibuat untuk mahasiswa Indonesia.</p>
                    <p>Tasikmalaya, West Java</p>
                </div>
            </div>
        </footer>
    );
}

export default function LandingPage() {
    usePremiumFonts();

    return (
        <>
            <GlobalStyles />
            <div className="otlp-root min-h-screen overflow-x-hidden text-foreground">
                <Navbar />
                <main>
                    <Hero />
                    <ValueSection />
                    <div id="writing-agent">
                        <FlagshipSections />
                    </div>
                    <EcosystemSection />
                    <WorkflowSection />
                    <PricingSection />
                    <CTASection />
                </main>
                <Footer />
            </div>
        </>
    );
}
