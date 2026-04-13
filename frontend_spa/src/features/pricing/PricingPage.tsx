import React, { useState, useEffect } from 'react';
import { Zap, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '@/store/themeStore';
import { cn } from '@/lib/utils';

// ─── Custom SVG Tier Icons ─────────────────────────────────────────────────

const IconRookie = () => (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 44, height: 44 }}>
        <defs>
            <linearGradient id="cap-body" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
            <linearGradient id="cap-brim" x1="0" y1="40" x2="64" y2="56" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#93C5FD" />
                <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            <linearGradient id="cap-shine" x1="10" y1="10" x2="32" y2="28" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="white" stopOpacity="0.35" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <filter id="shadow-cap">
                <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#1D4ED8" floodOpacity="0.5" />
            </filter>
        </defs>
        <path d="M10 34 C10 18 22 10 32 10 C42 10 54 18 54 34 L10 34Z" fill="url(#cap-body)" filter="url(#shadow-cap)" />
        <path d="M32 10 L32 34" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
        <path d="M21 12 C18 18 17 26 17 34" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
        <path d="M43 12 C46 18 47 26 47 34" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
        <path d="M8 34 Q8 40 16 40 L52 40 Q58 40 56 34 L8 34Z" fill="url(#cap-brim)" />
        <path d="M8 34 Q8 37 16 37 L52 37 Q57 37 56 34" stroke="rgba(255,255,255,0.3)" strokeWidth="0.7" fill="none" />
        <circle cx="32" cy="10" r="2.5" fill="#93C5FD" />
        <circle cx="32" cy="10" r="1.2" fill="white" opacity="0.6" />
        <path d="M14 16 C18 12 26 10 32 10 C38 10 44 12 48 16 C44 13 38 11.5 32 11.5 C26 11.5 18 13 14 16Z" fill="url(#cap-shine)" />
    </svg>
);

const IconGrinder = () => (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 48, height: 48 }}>
        <defs>
            <linearGradient id="bar-grad" x1="0" y1="28" x2="64" y2="36" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#7DD3FC" />
                <stop offset="50%" stopColor="#2563EB" />
                <stop offset="100%" stopColor="#7DD3FC" />
            </linearGradient>
            <linearGradient id="plate-l" x1="4" y1="20" x2="20" y2="44" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#1E40AF" />
            </linearGradient>
            <linearGradient id="plate-r" x1="44" y1="20" x2="60" y2="44" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#1E40AF" />
            </linearGradient>
            <linearGradient id="plate-shine-g" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
                <stop offset="0%" stopColor="white" stopOpacity="0.25" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <filter id="shadow-db">
                <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#1D4ED8" floodOpacity="0.6" />
            </filter>
        </defs>
        <g filter="url(#shadow-db)">
            <rect x="4" y="20" width="14" height="24" rx="4" fill="url(#plate-l)" />
            <rect x="4" y="20" width="14" height="24" rx="4" fill="url(#plate-shine-g)" />
            <rect x="18" y="25" width="6" height="14" rx="2" fill="#3B82F6" />
            <rect x="24" y="29" width="16" height="6" rx="3" fill="url(#bar-grad)" />
            <rect x="40" y="25" width="6" height="14" rx="2" fill="#3B82F6" />
            <rect x="46" y="20" width="14" height="24" rx="4" fill="url(#plate-r)" />
            <rect x="46" y="20" width="14" height="24" rx="4" fill="url(#plate-shine-g)" />
        </g>
        <rect x="4" y="20" width="14" height="3" rx="2" fill="rgba(255,255,255,0.3)" />
        <rect x="46" y="20" width="14" height="3" rx="2" fill="rgba(255,255,255,0.3)" />
        <rect x="26" y="30" width="12" height="2" rx="1" fill="rgba(255,255,255,0.4)" />
    </svg>
);

const IconScholar = () => (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 46, height: 46 }}>
        <defs>
            <linearGradient id="book1-s" x1="10" y1="30" x2="54" y2="52" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#0369A1" />
            </linearGradient>
            <linearGradient id="book2-s" x1="10" y1="26" x2="54" y2="46" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
            <linearGradient id="tassel-s" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
                <stop offset="0%" stopColor="#FCD34D" />
                <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <filter id="shadow-sc">
                <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0EA5E9" floodOpacity="0.5" />
            </filter>
        </defs>
        <g filter="url(#shadow-sc)">
            <rect x="10" y="40" width="44" height="10" rx="3" fill="url(#book1-s)" />
            <rect x="12" y="30" width="40" height="10" rx="3" fill="url(#book2-s)" />
            <rect x="10" y="40" width="4" height="10" rx="2" fill="rgba(255,255,255,0.15)" />
            <rect x="12" y="30" width="4" height="10" rx="2" fill="rgba(255,255,255,0.15)" />
        </g>
        <rect x="12" y="18" width="40" height="7" rx="2" fill="#0F172A" />
        <rect x="12" y="18" width="40" height="2.5" rx="2" fill="rgba(255,255,255,0.08)" />
        <path d="M32 10 L52 17 L32 24 L12 17 Z" fill="#1E293B" />
        <path d="M32 10 L52 17 L32 18.5 L12 17 Z" fill="rgba(255,255,255,0.1)" />
        <line x1="52" y1="17" x2="52" y2="28" stroke="#FCD34D" strokeWidth="1.5" />
        <line x1="52" y1="28" x2="56" y2="33" stroke="#FCD34D" strokeWidth="1.5" />
        <rect x="53.5" y="33" width="5" height="8" rx="1.5" fill="url(#tassel-s)" />
        <rect x="10" y="40" width="44" height="2" rx="1.5" fill="rgba(255,255,255,0.2)" />
        <rect x="12" y="30" width="40" height="2" rx="1.5" fill="rgba(255,255,255,0.2)" />
    </svg>
);

const IconLegend = () => (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 46, height: 46 }}>
        <defs>
            <linearGradient id="crown-gold-l" x1="8" y1="14" x2="56" y2="46" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FDE68A" />
                <stop offset="40%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
            <linearGradient id="crown-base-l" x1="8" y1="40" x2="56" y2="50" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FCD34D" />
                <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <filter id="shadow-cr">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#F59E0B" floodOpacity="0.5" />
            </filter>
        </defs>
        <g filter="url(#shadow-cr)">
            <path d="M8 42 L12 22 L22 34 L32 14 L42 34 L52 22 L56 42 Z" fill="url(#crown-gold-l)" />
            <rect x="8" y="42" width="48" height="8" rx="3" fill="url(#crown-base-l)" />
        </g>
        <path d="M8 42 L12 22 L22 34 L32 14 L42 34 L52 22 L56 42 Z" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
        <rect x="8" y="42" width="48" height="2.5" rx="2" fill="rgba(255,255,255,0.3)" />
        {/* Center gem - pink */}
        <circle cx="32" cy="38" r="4.5" fill="#EC4899" />
        <circle cx="30.5" cy="36.5" r="1.5" fill="rgba(255,255,255,0.6)" />
        {/* Left gem - cyan */}
        <circle cx="18" cy="40" r="3.2" fill="#06B6D4" />
        <circle cx="17" cy="38.8" r="1" fill="rgba(255,255,255,0.5)" />
        {/* Right gem - emerald */}
        <circle cx="46" cy="40" r="3.2" fill="#10B981" />
        <circle cx="45" cy="38.8" r="1" fill="rgba(255,255,255,0.5)" />
        {/* Sparkles */}
        <path d="M32 6 L33.2 9.8 L37 11 L33.2 12.2 L32 16 L30.8 12.2 L27 11 L30.8 9.8 Z" fill="#FDE68A" opacity="0.95" />
        <path d="M6 18 L6.8 20.5 L9.5 21.2 L6.8 22 L6 24.5 L5.2 22 L2.5 21.2 L5.2 20.5 Z" fill="#FDE68A" opacity="0.7" />
        <path d="M58 18 L58.8 20.5 L61.5 21.2 L58.8 22 L58 24.5 L57.2 22 L54.5 21.2 L57.2 20.5 Z" fill="#FDE68A" opacity="0.7" />
    </svg>
);

// ─── Tier Data ──────────────────────────────────────────────────────────────

const TIERS = [
    {
        id: 'rookie',
        name: 'Rookie',
        price: 'Gratis',
        period: null,
        desc: 'Langkah pertama dalam perjalanan akademikmu.',
        Icon: IconRookie,
        features: ['1 Proyek Skripsi', 'Chat AI Reguler', 'Akses Editor Standar'],
        buttonLabel: 'Paket Anda Saat Ini',
        popular: false,
        disabled: true,
        accentColor: '#64748B',
        accentRgb: '100,116,139',
        glowColor: 'rgba(100,116,139,0.15)',
    },
    {
        id: 'grinder',
        name: 'Grinder',
        price: 'Rp 49.000',
        period: '/ bulan',
        desc: 'Untuk mahasiswa yang serius mengejar progres.',
        Icon: IconGrinder,
        features: ['Proyek Unlimited', 'Paraphrase AI Standard', 'Manajemen Sitasi', 'Thesis Planner Mapping', 'Export PDF & Word'],
        buttonLabel: 'Mulai Grinder',
        popular: false,
        disabled: false,
        accentColor: '#38BDF8',
        accentRgb: '56,189,248',
        glowColor: 'rgba(56,189,248,0.15)',
    },
    {
        id: 'scholar',
        name: 'Scholar',
        price: 'Rp 99.000',
        period: '/ bulan',
        desc: 'Presisi akademis untuk hasil yang tak tertandingi.',
        Icon: IconScholar,
        features: ['Semua fitur Grinder', 'Anti-Plagiasi Paraphrase', 'Data Analysis Suite', 'Simulasi Sidang Basic'],
        buttonLabel: 'Pilih Scholar',
        popular: true,
        disabled: false,
        accentColor: '#06B6D4',
        accentRgb: '6,182,212',
        glowColor: 'rgba(6,182,212,0.25)',
    },
    {
        id: 'legend',
        name: 'Legend',
        price: 'Rp 199.000',
        period: '/ bulan',
        desc: 'Senjata rahasia untuk lulus cumlaude.',
        Icon: IconLegend,
        features: ['Semua fitur Scholar', 'Model AI Premium', 'Simulasi Sidang Unlimited', '24/7 Priority Support'],
        buttonLabel: 'Become Legend',
        popular: false,
        disabled: false,
        accentColor: '#A78BFA',
        accentRgb: '167,139,250',
        glowColor: 'rgba(167,139,250,0.2)',
    },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function PricingPage() {
    const navigate = useNavigate();
    const { theme } = useThemeStore();
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedTier, setSelectedTier] = useState<(typeof TIERS)[number] | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);

    useEffect(() => {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        return () => { document.head.removeChild(link); };
    }, []);

    const handleSelectTier = (tier: (typeof TIERS)[number]) => {
        if (tier.disabled) return;
        setSelectedTier(tier);
        setPaymentModalOpen(true);
    };

    const handleProcessPayment = () => {
        setIsProcessing(true);
        setTimeout(() => {
            setIsProcessing(false);
            setPaymentModalOpen(false);
            alert(`Pembayaran berhasil untuk paket ${selectedTier?.name}!`);
            navigate('/dashboard');
        }, 2000);
    };

    return (
        <>
            <style>{`
                .pricing-root { font-family:'DM Sans',sans-serif; min-height:100vh; background:#040d1a; color:#e2e8f0; position:relative; overflow-x:hidden; }
                .pricing-bg { position:fixed; inset:0; z-index:0; pointer-events:none; }
                .pricing-bg::before { content:''; position:absolute; inset:0; background: radial-gradient(ellipse 80% 60% at 10% -10%,rgba(6,74,130,0.45) 0%,transparent 60%), radial-gradient(ellipse 60% 50% at 90% 10%,rgba(14,116,144,0.3) 0%,transparent 55%), radial-gradient(ellipse 50% 40% at 50% 100%,rgba(3,52,110,0.4) 0%,transparent 60%); }
                .pricing-bg::after { content:''; position:absolute; inset:0; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); opacity:0.5; }
                .orb { position:fixed; border-radius:50%; filter:blur(80px); pointer-events:none; z-index:0; animation:floatOrb 12s ease-in-out infinite; }
                .orb-1 { width:500px; height:500px; top:-200px; left:-150px; background:radial-gradient(circle,rgba(14,116,144,0.2),transparent 70%); }
                .orb-2 { width:400px; height:400px; top:30%; right:-100px; background:radial-gradient(circle,rgba(6,182,212,0.12),transparent 70%); animation-delay:-4s; }
                .orb-3 { width:350px; height:350px; bottom:10%; left:30%; background:radial-gradient(circle,rgba(56,189,248,0.1),transparent 70%); animation-delay:-8s; }
                @keyframes floatOrb { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-30px) scale(1.05)} }
                .pricing-grid-lines { position:fixed; inset:0; z-index:0; pointer-events:none; background-image:linear-gradient(rgba(56,189,248,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.03) 1px,transparent 1px); background-size:60px 60px; mask-image:radial-gradient(ellipse at center,rgba(0,0,0,0.3) 0%,transparent 70%); }

                .back-btn { position:fixed; top:28px; left:28px; z-index:100; display:flex; align-items:center; gap:7px; padding:9px 16px; border-radius:10px; border:1px solid rgba(56,189,248,0.15); color:rgba(100,116,139,0.9); font-size:0.825rem; font-weight:500; background:rgba(4,13,26,0.6); backdrop-filter:blur(12px); cursor:pointer; transition:all 0.2s ease; font-family:'DM Sans',sans-serif; }
                .back-btn:hover { border-color:rgba(56,189,248,0.35); color:#38BDF8; background:rgba(56,189,248,0.06); transform:translateX(-2px); }

                .pricing-scroll { position:relative; z-index:1; padding:90px 1.5rem 80px; }
                .pricing-hero { text-align:center; max-width:700px; margin:0 auto 48px; animation:fadeSlideUp 0.8s cubic-bezier(0.16,1,0.3,1) both; }
                @keyframes fadeSlideUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
                .hero-desc { font-size:1rem; color:#64748B; line-height:1.7; }

                .tiers-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; max-width:1200px; margin:0 auto; align-items:start; }
                @media(max-width:1100px){.tiers-grid{grid-template-columns:repeat(2,1fr)}}
                @media(max-width:640px){.tiers-grid{grid-template-columns:1fr}}

                .pricing-card { position:relative; border-radius:24px; border:1px solid rgba(56,189,248,0.1); background:rgba(8,20,40,0.7); backdrop-filter:blur(20px); padding:32px 28px; display:flex; flex-direction:column; transition:all 0.4s cubic-bezier(0.16,1,0.3,1); overflow:hidden; animation:cardReveal 0.7s cubic-bezier(0.16,1,0.3,1) both; }
                .pricing-card:hover { border-color:rgba(56,189,248,0.25); transform:translateY(-6px); }
                @keyframes cardReveal { from{opacity:0;transform:translateY(40px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
                .pricing-card.popular { border-color:rgba(6,182,212,0.4); background:rgba(6,26,52,0.9); transform:translateY(-8px); box-shadow:0 0 0 1px rgba(6,182,212,0.2),0 30px 60px -20px rgba(6,182,212,0.25),0 0 80px -20px rgba(6,182,212,0.1) inset; }
                .pricing-card.popular:hover { transform:translateY(-14px); }

                .card-top-line { position:absolute; top:0; left:20%; right:20%; height:1px; opacity:0.6; }
                .popular .card-top-line { opacity:1; left:10%; right:10%; }
                .card-badge { position:absolute; top:-1px; right:24px; padding:5px 14px; border-radius:0 0 12px 12px; font-size:0.7rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; background:linear-gradient(135deg,#06B6D4,#0EA5E9); color:#fff; box-shadow:0 4px 20px rgba(6,182,212,0.4); }

                .card-icon-wrap { width:72px; height:72px; border-radius:20px; display:flex; align-items:center; justify-content:center; margin-bottom:22px; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.05); transition:transform 0.35s cubic-bezier(0.16,1,0.3,1); }
                .pricing-card:hover .card-icon-wrap { transform:scale(1.1) translateY(-3px); }

                .card-name { font-family:'Cormorant Garamond',Georgia,serif; font-size:2rem; font-weight:700; color:#f1f5f9; letter-spacing:-0.01em; margin-bottom:4px; line-height:1; }
                .card-price-wrap { display:flex; align-items:baseline; gap:5px; margin:12px 0 10px; }
                .card-price { font-size:1.9rem; font-weight:700; color:#f1f5f9; letter-spacing:-0.02em; }
                .card-period { font-size:0.85rem; color:#475569; }
                .card-desc { font-size:0.875rem; color:#475569; line-height:1.6; min-height:44px; margin-bottom:24px; }
                .card-divider { height:1px; background:linear-gradient(90deg,transparent,rgba(56,189,248,0.15),transparent); margin-bottom:22px; }

                .card-features { list-style:none; padding:0; margin:0 0 28px; display:flex; flex-direction:column; gap:11px; flex:1; }
                .card-feature { display:flex; align-items:flex-start; gap:10px; font-size:0.875rem; color:#94A3B8; line-height:1.4; }
                .feature-check { width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; }

                .card-btn { width:100%; padding:14px 20px; border-radius:14px; font-size:0.9rem; font-weight:600; font-family:'DM Sans',sans-serif; cursor:pointer; transition:all 0.25s cubic-bezier(0.16,1,0.3,1); border:none; position:relative; overflow:hidden; }
                .card-btn::after { content:''; position:absolute; inset:0; background:linear-gradient(180deg,rgba(255,255,255,0.08) 0%,transparent 100%); opacity:0; transition:opacity 0.2s; }
                .card-btn:hover::after { opacity:1; }
                .card-btn:active { transform:scale(0.98); }
                .btn-outline { background:transparent; border:1px solid rgba(56,189,248,0.12); color:#475569; cursor:not-allowed; opacity:0.45; }
                .btn-ghost { background:rgba(56,189,248,0.07); border:1px solid rgba(56,189,248,0.18); color:#38BDF8; }
                .btn-ghost:hover { background:rgba(56,189,248,0.14); border-color:rgba(56,189,248,0.35); transform:translateY(-1px); box-shadow:0 8px 25px -8px rgba(56,189,248,0.3); }
                .btn-primary { background:linear-gradient(135deg,#0EA5E9,#06B6D4); color:#fff; box-shadow:0 4px 24px -6px rgba(6,182,212,0.5); }
                .btn-primary:hover { transform:translateY(-2px); box-shadow:0 12px 32px -6px rgba(6,182,212,0.6); }
                .btn-premium { background:linear-gradient(135deg,#7C3AED,#A78BFA); color:#fff; box-shadow:0 4px 24px -6px rgba(167,139,250,0.4); }
                .btn-premium:hover { transform:translateY(-2px); box-shadow:0 12px 32px -6px rgba(167,139,250,0.55); }

                .pricing-footer { text-align:center; margin-top:56px; font-size:0.85rem; color:#334155; }
                .pricing-footer span { color:#38BDF8; font-weight:500; }

                .modal-overlay { position:fixed; inset:0; z-index:200; display:flex; align-items:center; justify-content:center; padding:20px; background:rgba(2,8,18,0.8); backdrop-filter:blur(12px); animation:fadeIn 0.2s ease both; }
                @keyframes fadeIn { from{opacity:0} to{opacity:1} }
                .modal-box { width:100%; max-width:440px; border-radius:28px; border:1px solid rgba(56,189,248,0.15); background:rgba(8,20,40,0.98); backdrop-filter:blur(30px); padding:36px; box-shadow:0 40px 80px -20px rgba(0,0,0,0.7); animation:modalIn 0.3s cubic-bezier(0.16,1,0.3,1) both; }
                @keyframes modalIn { from{opacity:0;transform:scale(0.95) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
                .modal-title { font-family:'Cormorant Garamond',Georgia,serif; font-size:1.8rem; font-weight:700; color:#f1f5f9; margin-bottom:6px; }
                .modal-subtitle { font-size:0.875rem; color:#475569; margin-bottom:28px; line-height:1.5; }
                .modal-summary { background:rgba(56,189,248,0.04); border:1px solid rgba(56,189,248,0.1); border-radius:16px; padding:20px; margin-bottom:28px; }
                .modal-row { display:flex; justify-content:space-between; font-size:0.875rem; color:#64748B; margin-bottom:10px; }
                .modal-row:last-child { margin-bottom:0; }
                .modal-row .val { font-weight:600; color:#94A3B8; }
                .modal-row .val.accent { color:#38BDF8; }
                .modal-actions { display:flex; gap:12px; }
                .modal-btn-cancel { flex:1; padding:13px; border-radius:14px; border:1px solid rgba(56,189,248,0.15); background:transparent; color:#64748B; font-size:0.9rem; font-weight:600; font-family:'DM Sans',sans-serif; cursor:pointer; transition:all 0.2s; }
                .modal-btn-cancel:hover { border-color:rgba(56,189,248,0.3); color:#94A3B8; }
                .modal-btn-pay { flex:1; padding:13px; border-radius:14px; border:none; background:linear-gradient(135deg,#0EA5E9,#06B6D4); color:#fff; font-size:0.9rem; font-weight:700; font-family:'DM Sans',sans-serif; cursor:pointer; transition:all 0.25s; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 4px 20px -6px rgba(6,182,212,0.5); }
                .modal-btn-pay:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 28px -6px rgba(6,182,212,0.6); }
                .modal-btn-pay:disabled { opacity:0.8; cursor:not-allowed; }
                @keyframes spin { to{transform:rotate(360deg)} }
            `}</style>

            <div className="pricing-root">
                <div className="pricing-bg" />
                <div className="pricing-grid-lines" />
                <div className="orb orb-1" />
                <div className="orb orb-2" />
                <div className="orb orb-3" />

                <button className="back-btn" onClick={() => navigate('/')}>
                    <ArrowLeft size={14} />
                    Kembali
                </button>

                <main className="pricing-scroll">
                    <div className="pricing-hero">
                        <p className="hero-desc">
                            Dirancang untuk mahasiswa yang serius. Mulai gratis, tingkatkan sesuai kebutuhan akademikmu.
                        </p>
                    </div>

                    <div className="tiers-grid">
                        {TIERS.map((tier, idx) => {
                            const isHovered = hoveredCard === tier.id;
                            const btnClass =
                                tier.disabled ? 'btn-outline' :
                                    tier.id === 'legend' ? 'btn-premium' :
                                        tier.popular ? 'btn-primary' :
                                            'btn-ghost';

                            return (
                                <div
                                    key={tier.id}
                                    className={`pricing-card${tier.popular ? ' popular' : ''}`}
                                    style={{
                                        animationDelay: `${idx * 120}ms`,
                                        boxShadow: tier.popular
                                            ? `0 0 0 1px rgba(6,182,212,0.25),0 30px 60px -20px ${tier.glowColor}`
                                            : isHovered ? `0 20px 50px -15px ${tier.glowColor}` : 'none'
                                    }}
                                    onMouseEnter={() => setHoveredCard(tier.id)}
                                    onMouseLeave={() => setHoveredCard(null)}
                                >
                                    <div className="card-top-line" style={{ background: `linear-gradient(90deg,transparent,${tier.accentColor},transparent)` }} />
                                    {tier.popular && <div className="card-badge">Paling Populer</div>}

                                    <div className="card-icon-wrap">
                                        <tier.Icon />
                                    </div>

                                    <div className="card-name">{tier.name}</div>
                                    <div className="card-price-wrap">
                                        <span className="card-price" style={{ color: tier.disabled ? '#475569' : '#f1f5f9' }}>{tier.price}</span>
                                        {tier.period && <span className="card-period">{tier.period}</span>}
                                    </div>
                                    <p className="card-desc">{tier.desc}</p>
                                    <div className="card-divider" />

                                    <ul className="card-features">
                                        {tier.features.map(feat => (
                                            <li key={feat} className="card-feature">
                                                <div className="feature-check" style={{ background: `rgba(${tier.accentRgb},0.12)` }}>
                                                    <svg viewBox="0 0 12 12" fill="none" width="11" height="11">
                                                        <path d="M2 6l3 3 5-5" stroke={tier.accentColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                                {feat}
                                            </li>
                                        ))}
                                    </ul>

                                    <button className={`card-btn ${btnClass}`} onClick={() => handleSelectTier(tier)} disabled={tier.disabled}>
                                        {tier.buttonLabel}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <div className="pricing-footer">
                        <p>Semua harga dalam IDR. Batalkan kapan saja. <span>Tidak ada biaya tersembunyi.</span></p>
                    </div>
                </main>
            </div>

            {isPaymentModalOpen && selectedTier && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !isProcessing && setPaymentModalOpen(false)}>
                    <div className="modal-box">
                        <h2 className="modal-title">Konfirmasi Paket</h2>
                        <p className="modal-subtitle">
                            Kamu akan mengaktifkan paket <strong style={{ color: selectedTier.accentColor }}>{selectedTier.name}</strong>. Payment gateway segera hadir — ini adalah simulasi.
                        </p>
                        <div className="modal-summary">
                            <div className="modal-row"><span>Paket</span><span className="val">{selectedTier.name}</span></div>
                            <div className="modal-row"><span>Periode</span><span className="val">1 Bulan</span></div>
                            <div className="modal-row"><span>Total</span><span className="val accent">{selectedTier.price}{selectedTier.period}</span></div>
                        </div>
                        <div className="modal-actions">
                            <button className="modal-btn-cancel" onClick={() => !isProcessing && setPaymentModalOpen(false)} disabled={isProcessing}>Batal</button>
                            <button className="modal-btn-pay" onClick={handleProcessPayment} disabled={isProcessing}>
                                {isProcessing
                                    ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                                    : <><Zap size={15} />Bayar Sekarang</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
