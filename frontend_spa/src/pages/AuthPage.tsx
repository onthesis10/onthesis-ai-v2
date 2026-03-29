import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { OnThesisLogo } from '@/components/ui/OnThesisLogo';

/* ═══════════════════════════════════════════════════════
   GLOBAL STYLES
═══════════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.ot-root {
  font-family: 'Sora', sans-serif;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
  overflow: hidden;
  position: relative;
  background: #020c18;
}

/* ── Animated Aurora Background ── */
.ot-bg {
  position: fixed; inset: 0; z-index: 0; overflow: hidden;
}
.ot-aurora-1, .ot-aurora-2, .ot-aurora-3, .ot-aurora-4 {
  position: absolute; border-radius: 50%; filter: blur(90px);
  mix-blend-mode: screen; pointer-events: none;
}
.ot-aurora-1 {
  width: 70vw; height: 70vw; top: -20%; left: -15%;
  background: radial-gradient(ellipse, rgba(0,90,160,0.55) 0%, rgba(0,40,100,0.2) 50%, transparent 70%);
  animation: aurora1 18s ease-in-out infinite alternate;
}
.ot-aurora-2 {
  width: 60vw; height: 60vw; bottom: -20%; right: -15%;
  background: radial-gradient(ellipse, rgba(0,160,200,0.4) 0%, rgba(0,80,140,0.15) 50%, transparent 70%);
  animation: aurora2 22s ease-in-out infinite alternate;
}
.ot-aurora-3 {
  width: 45vw; height: 45vw; top: 30%; left: 30%;
  background: radial-gradient(ellipse, rgba(0,200,220,0.18) 0%, rgba(0,120,180,0.08) 50%, transparent 70%);
  animation: aurora3 14s ease-in-out infinite alternate;
}
.ot-aurora-4 {
  width: 50vw; height: 50vw; top: -10%; right: 20%;
  background: radial-gradient(ellipse, rgba(10,50,130,0.45) 0%, transparent 65%);
  animation: aurora4 26s ease-in-out infinite alternate;
}

@keyframes aurora1 {
  0%   { transform: translate(0,0) scale(1); }
  33%  { transform: translate(5vw, 8vh) scale(1.12); }
  66%  { transform: translate(-4vw, 3vh) scale(0.95); }
  100% { transform: translate(3vw, -5vh) scale(1.06); }
}
@keyframes aurora2 {
  0%   { transform: translate(0,0) scale(1); }
  40%  { transform: translate(-6vw,-5vh) scale(1.1); }
  80%  { transform: translate(4vw,8vh) scale(0.92); }
  100% { transform: translate(-2vw,2vh) scale(1.05); }
}
@keyframes aurora3 {
  0%   { transform: translate(0,0) scale(1) rotate(0deg); }
  50%  { transform: translate(-8vw,-6vh) scale(1.2) rotate(45deg); }
  100% { transform: translate(5vw,4vh) scale(0.9) rotate(-20deg); }
}
@keyframes aurora4 {
  0%   { transform: translate(0,0) scale(1); }
  60%  { transform: translate(6vw,10vh) scale(1.15); }
  100% { transform: translate(-3vw,-4vh) scale(0.9); }
}

/* Subtle grid */
.ot-grid {
  position: fixed; inset: 0; z-index: 1; pointer-events: none;
  background-image:
    linear-gradient(rgba(0,180,216,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,180,216,0.04) 1px, transparent 1px);
  background-size: 60px 60px;
}

/* Scanline shimmer */
.ot-scanline {
  position: fixed; inset: 0; z-index: 1; pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0,0,0,0.04) 2px,
    rgba(0,0,0,0.04) 4px
  );
}

/* ── Layout ── */
.ot-layout {
  position: relative; z-index: 2;
  width: 100vw; min-height: 100vh;
  display: flex; overflow: hidden;
}

/* Panels — physically swappable via 'left: any' */
.ot-panel {
  position: absolute;
  top: 0; height: 100%;
  width: 50%;
  transition: left 0.8s cubic-bezier(0.65, 0, 0.35, 1);
  will-change: left;
}
.ot-panel-illus { }
.ot-panel-form  { }

/* Login: illus left, form right */
.ot-layout[data-view="login"] .ot-panel-illus { left: 0; }
.ot-layout[data-view="login"] .ot-panel-form  { left: 50%; }

/* Register: form left, illus right */
.ot-layout[data-view="register"] .ot-panel-illus { left: 50%; }
.ot-layout[data-view="register"] .ot-panel-form  { left: 0; }

/* ── Illustration Panel ── */
.ot-illus-inner {
  width: 100%; height: 100%; display: flex;
  flex-direction: column; align-items: center; justify-content: center;
  padding: 60px 48px;
  position: relative;
}

/* ── Form Panel ── */
.ot-form-inner {
  width: 100%; height: 100%; display: flex;
  align-items: center; justify-content: center;
  padding: 48px 32px;
}

/* Glass card */
.ot-card {
  width: 100%; max-width: 420px;
  background: rgba(2, 18, 40, 0.72);
  border: 1px solid rgba(0, 180, 216, 0.15);
  border-radius: 24px;
  padding: 44px 40px 40px;
  backdrop-filter: blur(32px) saturate(180%);
  -webkit-backdrop-filter: blur(32px) saturate(180%);
  box-shadow:
    0 0 0 1px rgba(0,200,255,0.04),
    0 32px 80px rgba(0,0,0,0.6),
    0 0 60px rgba(0,100,180,0.08),
    inset 0 1px 0 rgba(0,200,255,0.08);
  position: relative; overflow: hidden;
}
/* Card top specular */
.ot-card::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(0,200,255,0.3) 30%,
    rgba(0,220,255,0.5) 50%,
    rgba(0,200,255,0.3) 70%,
    transparent 100%
  );
}
/* Card corner glow */
.ot-card::after {
  content: '';
  position: absolute; top: -80px; right: -80px;
  width: 200px; height: 200px; border-radius: 50%;
  background: radial-gradient(circle, rgba(0,180,216,0.08) 0%, transparent 70%);
  pointer-events: none;
}

/* ── Input ── */
.ot-input {
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-family: 'Sora', sans-serif;
  background: rgba(0,30,70,0.5);
  border: 1px solid rgba(0,150,200,0.2);
  color: rgba(220,240,255,0.9);
  outline: none;
  transition: all 0.25s ease;
  letter-spacing: 0.01em;
}
.ot-input::placeholder { color: rgba(100,160,210,0.4); }
.ot-input:focus {
  border-color: rgba(0,180,216,0.6);
  background: rgba(0,40,90,0.6);
  box-shadow: 0 0 0 3px rgba(0,180,216,0.12), 0 0 20px rgba(0,180,216,0.06);
}

/* ── Primary button ── */
.ot-btn {
  width: 100%; padding: 13px 0;
  border-radius: 12px; border: none; cursor: pointer;
  font-family: 'Sora', sans-serif; font-size: 14.5px; font-weight: 600;
  color: #fff; position: relative; overflow: hidden;
  background: linear-gradient(135deg, #0077b6 0%, #023e8a 50%, #0096c7 100%);
  background-size: 200% 200%;
  box-shadow: 0 4px 24px rgba(0,120,190,0.5), inset 0 1px 0 rgba(255,255,255,0.1);
  transition: all 0.25s ease;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  animation: btn-gradient 6s ease infinite;
}
@keyframes btn-gradient {
  0%,100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
.ot-btn::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%);
  background-size: 200% 100%; opacity: 0; transition: opacity 0.3s;
}
.ot-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,150,200,0.55), inset 0 1px 0 rgba(255,255,255,0.15); }
.ot-btn:hover::after { opacity: 1; animation: shimmer 0.6s ease forwards; }
.ot-btn:active { transform: translateY(0); }
@keyframes shimmer { from{background-position:-200% center} to{background-position:200% center} }

/* ── Google btn ── */
.ot-btn-google {
  width: 100%; padding: 12px 0;
  border-radius: 12px; border: 1px solid rgba(0,150,200,0.2);
  background: rgba(0,30,70,0.4); cursor: pointer;
  font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 500;
  color: rgba(180,220,255,0.85);
  display: flex; align-items: center; justify-content: center; gap: 9px;
  transition: all 0.22s ease;
}
.ot-btn-google:hover {
  background: rgba(0,50,100,0.5);
  border-color: rgba(0,180,216,0.35);
  box-shadow: 0 4px 20px rgba(0,120,180,0.15);
  transform: translateY(-1px);
}

/* ── Stagger animations ── */
@keyframes ot-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
.ot-a1 { animation: ot-up 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
.ot-a2 { animation: ot-up 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s both; }
.ot-a3 { animation: ot-up 0.6s cubic-bezier(0.16,1,0.3,1) 0.3s both; }
.ot-a4 { animation: ot-up 0.6s cubic-bezier(0.16,1,0.3,1) 0.4s both; }
.ot-a5 { animation: ot-up 0.6s cubic-bezier(0.16,1,0.3,1) 0.5s both; }
.ot-a6 { animation: ot-up 0.6s cubic-bezier(0.16,1,0.3,1) 0.6s both; }

/* ── Form content cross-fade ── */
@keyframes ot-fade-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
.ot-form-body { animation: ot-fade-in 0.4s cubic-bezier(0.16,1,0.3,1) both; }

/* ── SVG float animations ── */
@keyframes fl1 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
@keyframes fl2 { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-16px) rotate(5deg)} }
@keyframes fl3 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes fl-ring { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
@keyframes fl-pulse { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.05)} }

.fl-a { animation: fl1 4.2s ease-in-out infinite; }
.fl-b { animation: fl2 5.8s ease-in-out 0.5s infinite; }
.fl-c { animation: fl3 3.8s ease-in-out 1.2s infinite; }
.fl-d { animation: fl1 6.5s ease-in-out 2s infinite; }
.fl-ring { animation: fl-ring 20s linear infinite; }
.fl-pulse { animation: fl-pulse 3s ease-in-out infinite; }

/* ── Glowing orb behind illus ── */
.ot-orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

/* ── Error ── */
@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
.ot-error-anim { animation: shake 0.35s ease; }

/* ── Label ── */
.ot-label {
  display: block; font-size: 12.5px; font-weight: 500;
  color: rgba(100,180,220,0.7); margin-bottom: 7px;
  letter-spacing: 0.04em; text-transform: uppercase;
}

/* ── Divider ── */
.ot-divider {
  display: flex; align-items: center; gap: 12px; margin: 20px 0;
}
.ot-divider-line { flex: 1; height: 1px; background: rgba(0,150,200,0.12); }
.ot-divider-text { font-size: 11.5px; color: rgba(80,160,200,0.5); letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; }

/* ── Checkbox ── */
.ot-checkbox { accent-color: #0096c7; width: 14px; height: 14px; cursor: pointer; }

/* ── Scrollbar ── */
::-webkit-scrollbar { display: none; }

/* ── Responsive ── */
@media (max-width: 768px) {
  .ot-panel { position: relative; width: 100%; left: 0 !important; }
  .ot-panel-illus { display: none !important; }
  .ot-layout { flex-direction: column; }
  .ot-form-inner { padding: 32px 20px; }
  .ot-card { padding: 32px 24px; }
}
`;

/* ═══════════════════════════════════════════════════════
   ACADEMIC ILLUSTRATION — Ocean / Futuristic Style
═══════════════════════════════════════════════════════ */
function AcademicScene() {
    return (
        <div style={{ position: 'relative', width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            {/* Background glow orbs */}
            <div className="ot-orb fl-pulse" style={{
                width: 280, height: 280, top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
                background: 'radial-gradient(circle, rgba(0,150,200,0.15) 0%, transparent 70%)',
                position: 'absolute',
            }} />

            <svg viewBox="0 0 440 480" fill="none" xmlns="http://www.w3.org/2000/svg"
                style={{ width: '100%', position: 'relative', zIndex: 1 }}>
                <defs>
                    <linearGradient id="blueGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0096c7" />
                        <stop offset="100%" stopColor="#023e8a" />
                    </linearGradient>
                    <linearGradient id="blueGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#48cae4" />
                        <stop offset="100%" stopColor="#0077b6" />
                    </linearGradient>
                    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffd166" />
                        <stop offset="100%" stopColor="#f4a261" />
                    </linearGradient>
                    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(0,80,140,0.9)" />
                        <stop offset="100%" stopColor="rgba(0,30,70,0.95)" />
                    </linearGradient>
                    <linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#021d3d" />
                        <stop offset="100%" stopColor="#010e20" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <filter id="softglow">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* ── Floating orbital ring ── */}
                <g className="fl-ring" style={{ transformOrigin: '220px 200px' }}>
                    <ellipse cx="220" cy="200" rx="160" ry="50"
                        stroke="rgba(0,180,216,0.12)" strokeWidth="1.5" fill="none"
                        strokeDasharray="8 6" />
                    <circle cx="378" cy="206" r="5" fill="#0096c7" opacity="0.7" />
                </g>
                <g style={{ transform: 'rotate(-30deg)', transformOrigin: '220px 200px' }}>
                    <ellipse cx="220" cy="200" rx="130" ry="40"
                        stroke="rgba(0,150,200,0.08)" strokeWidth="1" fill="none"
                        strokeDasharray="6 8" />
                </g>

                {/* ── Floating UI cards (top left) ── */}
                <g className="fl-b" style={{ transformOrigin: '80px 90px' }}>
                    <rect x="30" y="62" width="100" height="56" rx="10" fill="url(#cardGrad)"
                        stroke="rgba(0,180,216,0.25)" strokeWidth="1" />
                    <rect x="40" y="74" width="44" height="4" rx="2" fill="#48cae4" opacity="0.8" />
                    <rect x="40" y="82" width="70" height="3" rx="1.5" fill="rgba(100,200,255,0.3)" />
                    <rect x="40" y="89" width="55" height="3" rx="1.5" fill="rgba(100,200,255,0.2)" />
                    <rect x="40" y="96" width="63" height="3" rx="1.5" fill="rgba(100,200,255,0.2)" />
                    <rect x="40" y="104" width="32" height="8" rx="4" fill="url(#blueGrad1)" opacity="0.9" />
                    <text x="56" y="111" textAnchor="middle" fill="white" fontSize="7" fontFamily="Sora, sans-serif" fontWeight="600">Analisis</text>
                    {/* Corner dot */}
                    <circle cx="121" cy="70" r="3.5" fill="#48cae4" opacity="0.8" />
                </g>

                {/* ── Floating data card (top right) ── */}
                <g className="fl-a" style={{ transformOrigin: '360px 80px' }}>
                    <rect x="310" y="50" width="100" height="60" rx="10" fill="url(#cardGrad)"
                        stroke="rgba(0,180,216,0.2)" strokeWidth="1" />
                    {/* Mini chart bars */}
                    <rect x="320" y="84" width="8" height="16" rx="2" fill="#0096c7" opacity="0.7" />
                    <rect x="332" y="74" width="8" height="26" rx="2" fill="#48cae4" opacity="0.85" />
                    <rect x="344" y="80" width="8" height="20" rx="2" fill="#0077b6" opacity="0.7" />
                    <rect x="356" y="70" width="8" height="30" rx="2" fill="#48cae4" opacity="0.9" />
                    <rect x="368" y="76" width="8" height="24" rx="2" fill="#0096c7" opacity="0.75" />
                    {/* chart line */}
                    <polyline points="324,82 336,72 348,78 360,68 372,74"
                        stroke="#ffd166" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    <text x="360" y="64" textAnchor="middle" fill="rgba(180,230,255,0.7)" fontSize="7.5" fontFamily="Sora, sans-serif">Progress</text>
                    <line x1="320" y1="100" x2="388" y2="100" stroke="rgba(0,150,200,0.2)" strokeWidth="1" />
                </g>

                {/* ── Floating badge bottom left ── */}
                <g className="fl-c" style={{ transformOrigin: '60px 380px' }}>
                    <rect x="18" y="358" width="86" height="28" rx="14"
                        fill="rgba(0,50,100,0.8)" stroke="rgba(0,200,220,0.3)" strokeWidth="1" />
                    <circle cx="34" cy="372" r="6" fill="url(#blueGrad2)" />
                    <text x="34" y="376" textAnchor="middle" fill="white" fontSize="7" fontFamily="Sora, sans-serif" fontWeight="700">✓</text>
                    <text x="72" y="376" textAnchor="middle" fill="rgba(150,220,255,0.85)" fontSize="9" fontFamily="Sora, sans-serif" fontWeight="500">Terverifikasi</text>
                </g>

                {/* ── Floating tag top center ── */}
                <g className="fl-d" style={{ transformOrigin: '220px 38px' }}>
                    <rect x="158" y="24" width="124" height="28" rx="14"
                        fill="rgba(0,30,70,0.85)" stroke="rgba(255,209,102,0.35)" strokeWidth="1" />
                    <text x="220" y="42" textAnchor="middle" fill="#ffd166" fontSize="10" fontFamily="Sora, sans-serif" fontWeight="600">
                        Riset Akademik 🎓
                    </text>
                </g>

                {/* ── Main character — seated researcher ── */}

                {/* Desk */}
                <rect x="80" y="350" width="280" height="14" rx="5" fill="rgba(0,60,120,0.6)" />
                <rect x="80" y="358" width="280" height="6" rx="3" fill="rgba(0,40,90,0.5)" />

                {/* Book stack */}
                <rect x="90" y="314" width="52" height="8" rx="3" fill="#0096c7" opacity="0.85" />
                <rect x="93" y="305" width="48" height="10" rx="3" fill="#023e8a" opacity="0.9" />
                <rect x="96" y="297" width="44" height="10" rx="3" fill="#0077b6" opacity="0.8" />
                {/* Book spine details */}
                <line x1="93" y1="305" x2="93" y2="315" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                <line x1="96" y1="297" x2="96" y2="307" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

                {/* Laptop */}
                <rect x="150" y="306" width="140" height="44" rx="5" fill="#010e20" />
                <rect x="155" y="310" width="130" height="36" rx="3" fill="url(#screenGrad)" />
                {/* Screen content */}
                <rect x="162" y="316" width="60" height="5" rx="2.5" fill="#48cae4" opacity="0.8" />
                <rect x="162" y="325" width="108" height="3" rx="1.5" fill="rgba(100,200,255,0.25)" />
                <rect x="162" y="331" width="85" height="3" rx="1.5" fill="rgba(100,200,255,0.18)" />
                <rect x="162" y="337" width="95" height="3" rx="1.5" fill="rgba(100,200,255,0.18)" />
                <rect x="245" y="315" width="38" height="12" rx="3" fill="rgba(0,150,200,0.3)" />
                <text x="264" y="324" textAnchor="middle" fill="#48cae4" fontSize="7" fontFamily="Sora" fontWeight="600">OnThesis</text>
                {/* Laptop base */}
                <rect x="138" y="349" width="164" height="5" rx="2.5" fill="#010e20" />
                {/* Screen glow */}
                <rect x="155" y="310" width="130" height="36" rx="3"
                    fill="none" stroke="rgba(0,200,255,0.1)" strokeWidth="1" />

                {/* Mug */}
                <rect x="312" y="322" width="30" height="28" rx="5" fill="rgba(0,40,90,0.8)"
                    stroke="rgba(0,150,200,0.25)" strokeWidth="1" />
                <ellipse cx="327" cy="322" rx="15" ry="4.5" fill="rgba(0,60,120,0.9)" />
                <path d="M342 330 Q352 330 352 336 Q352 342 342 342"
                    stroke="rgba(0,150,200,0.4)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                {/* Steam */}
                <path d="M321 317 Q319 310 321 303" stroke="rgba(0,200,240,0.25)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <path d="M327 315 Q325 308 327 301" stroke="rgba(0,200,240,0.2)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <path d="M333 317 Q331 310 333 303" stroke="rgba(0,200,240,0.25)" strokeWidth="1.5" fill="none" strokeLinecap="round" />

                {/* ── Character ── */}
                {/* Left arm */}
                <path d="M188 272 Q160 282 150 304"
                    stroke="#0077b6" strokeWidth="18" fill="none" strokeLinecap="round" />
                {/* Right arm */}
                <path d="M242 272 Q268 282 278 304"
                    stroke="#0077b6" strokeWidth="18" fill="none" strokeLinecap="round" />
                {/* Hands */}
                <ellipse cx="150" cy="305" rx="11" ry="8" fill="#aed9e0" />
                <ellipse cx="278" cy="305" rx="11" ry="8" fill="#aed9e0" />

                {/* Torso */}
                <rect x="186" y="242" width="68" height="68" rx="18"
                    fill="url(#blueGrad1)" />
                {/* Hoodie detail */}
                <path d="M205 242 L220 260 L235 242" fill="rgba(0,40,100,0.4)" />
                {/* Logo on chest */}
                <circle cx="220" cy="280" r="8" fill="rgba(0,0,0,0.2)" />
                <text x="220" y="284" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="8" fontFamily="Sora" fontWeight="700">OT</text>

                {/* Neck */}
                <rect x="208" y="224" width="24" height="22" rx="8" fill="#aed9e0" />

                {/* Head */}
                <ellipse cx="220" cy="208" rx="42" ry="44" fill="#c8e8f0" />

                {/* Hair — dark blue/black academic */}
                <path d="M178 195 Q180 158 220 154 Q260 158 262 195 Q255 174 246 170 Q232 161 208 170 Q194 175 178 195Z"
                    fill="#0a192f" />
                <path d="M178 195 Q173 207 178 218 Q176 206 181 199Z" fill="#0a192f" />
                <path d="M262 195 Q267 207 262 218 Q264 206 259 199Z" fill="#0a192f" />

                {/* Glasses — modern thin frame */}
                <rect x="196" y="200" width="22" height="15" rx="6"
                    fill="none" stroke="#0a192f" strokeWidth="2.5" />
                <rect x="222" y="200" width="22" height="15" rx="6"
                    fill="none" stroke="#0a192f" strokeWidth="2.5" />
                {/* Lens tint */}
                <rect x="196" y="200" width="22" height="15" rx="6"
                    fill="rgba(0,100,180,0.12)" />
                <rect x="222" y="200" width="22" height="15" rx="6"
                    fill="rgba(0,100,180,0.12)" />
                {/* Bridge + temples */}
                <line x1="218" y1="207" x2="222" y2="207" stroke="#0a192f" strokeWidth="2.2" />
                <line x1="194" y1="207" x2="196" y2="207" stroke="#0a192f" strokeWidth="2.2" />
                <line x1="244" y1="207" x2="247" y2="207" stroke="#0a192f" strokeWidth="2.2" />

                {/* Eyes */}
                <ellipse cx="207" cy="207" rx="4" ry="4.5" fill="#0a192f" />
                <ellipse cx="233" cy="207" rx="4" ry="4.5" fill="#0a192f" />
                <circle cx="209.5" cy="205" r="1.2" fill="white" />
                <circle cx="235.5" cy="205" r="1.2" fill="white" />

                {/* Nose */}
                <path d="M217 215 Q220 221 223 215" stroke="#9ac5d0" strokeWidth="1.8" fill="none" strokeLinecap="round" />

                {/* Smile */}
                <path d="M210 225 Q220 233 230 225" stroke="#9ac5d0" strokeWidth="2" fill="none" strokeLinecap="round" />

                {/* Ears */}
                <ellipse cx="178" cy="211" rx="6" ry="8" fill="#c8e8f0" />
                <ellipse cx="262" cy="211" rx="6" ry="8" fill="#c8e8f0" />

                {/* Earring (left ear) */}
                <circle cx="178" cy="220" r="2" fill="#ffd166" />

                {/* Headphones */}
                <path d="M180 193 Q220 165 260 193"
                    stroke="#021d3d" strokeWidth="6" fill="none" strokeLinecap="round" />
                <rect x="173" y="191" width="12" height="16" rx="6" fill="#021d3d" />
                <rect x="255" y="191" width="12" height="16" rx="6" fill="#021d3d" />
                {/* Headphone glow */}
                <rect x="174" y="192" width="10" height="14" rx="5" fill="rgba(0,180,216,0.2)" />
                <rect x="256" y="192" width="10" height="14" rx="5" fill="rgba(0,180,216,0.2)" />

                {/* ── Floating glowing dots ── */}
                <circle cx="140" cy="160" r="3" fill="#48cae4" opacity="0.6" />
                <circle cx="302" cy="155" r="2" fill="#ffd166" opacity="0.7" />
                <circle cx="72" cy="300" r="2.5" fill="#0096c7" opacity="0.55" />
                <circle cx="370" cy="310" r="2" fill="#48cae4" opacity="0.5" />
                <circle cx="108" cy="400" r="1.5" fill="#48cae4" opacity="0.4" />
                <circle cx="340" cy="400" r="2" fill="#ffd166" opacity="0.4" />
            </svg>

            {/* Text below illustration */}
            <div style={{ textAlign: 'center', marginTop: 8, padding: '0 24px' }}>
                <h2 style={{
                    fontFamily: 'DM Serif Display, serif',
                    fontStyle: 'italic',
                    fontSize: 28, fontWeight: 400,
                    color: 'rgba(200,240,255,0.92)',
                    lineHeight: 1.25, marginBottom: 12,
                    letterSpacing: '-0.3px',
                }}>
                    Riset yang lebih cerdas,<br />hasil yang lebih baik.
                </h2>
                <p style={{
                    fontSize: 13.5, lineHeight: 1.7,
                    color: 'rgba(100,180,220,0.55)',
                    maxWidth: 320, margin: '0 auto',
                }}>
                    Platform manajemen riset akademik untuk skripsi, tesis, dan disertasi Anda.
                </p>
                {/* Dot indicators */}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 24 }}>
                    {[1, 0, 0].map((a, i) => (
                        <div key={i} style={{
                            height: 3, width: a ? 22 : 7, borderRadius: 3,
                            background: a
                                ? 'linear-gradient(90deg,#0096c7,#48cae4)'
                                : 'rgba(0,150,200,0.2)',
                            transition: 'all 0.3s',
                        }} />
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
export default function AuthPage() {
    const navigate = useNavigate();
    const [view, setView] = useState<'login' | 'register'>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [errorKey, setErrorKey] = useState(0);
    const [formKey, setFormKey] = useState(0);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        const id = 'ot-auth-style';
        if (!document.getElementById(id)) {
            const s = document.createElement('style');
            s.id = id; s.textContent = CSS;
            document.head.appendChild(s);
        }
    }, []);

    const showError = (msg: string) => {
        setErrorMsg(msg); setErrorKey(k => k + 1);
        setTimeout(() => setErrorMsg(''), 4500);
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (view === 'register' && password !== confirmPassword)
            return showError('Konfirmasi kata sandi tidak cocok.');
        setIsLoading(true);
        try {
            let userCredential;
            if (view === 'login') userCredential = await signInWithEmailAndPassword(auth, email, password);
            else userCredential = await createUserWithEmailAndPassword(auth, email, password);

            const idToken = await userCredential.user.getIdToken();
            const res = await fetch('/api/verify-email-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: idToken })
            });

            if (res.ok) {
                navigate('/dashboard');
            } else {
                throw new Error('Gagal menyinkronkan sesi dengan server.');
            }
        } catch (err: any) {
            const m: Record<string, string> = {
                'auth/email-already-in-use': 'Email sudah terdaftar.',
                'auth/weak-password': 'Kata sandi minimal 6 karakter.',
                'auth/invalid-credential': 'Email atau kata sandi tidak valid.',
            };
            showError(m[err.code] ?? 'Terjadi kesalahan. Silakan coba lagi.');
        } finally { setIsLoading(false); }
    };

    const handleGoogle = async () => {
        setIsLoading(true);
        try {
            const userCredential = await signInWithPopup(auth, new GoogleAuthProvider());
            const idToken = await userCredential.user.getIdToken();
            const res = await fetch('/api/verify-email-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: idToken })
            });
            if (res.ok) {
                navigate('/dashboard');
            } else {
                throw new Error('Gagal menyinkronkan sesi Google.');
            }
        }
        catch (err: any) { showError('Gagal masuk dengan Google.'); }
        finally { setIsLoading(false); }
    };

    const switchView = (v: 'login' | 'register') => {
        setView(v);
        setErrorMsg('');
        setFormKey(k => k + 1);
    };

    /* ── Shared field component ── */
    const Field = ({
        label, type, value, onChange, placeholder, right, showToggle, onToggle, showVal,
    }: {
        label: string; type: string; value: string;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        placeholder: string; right?: React.ReactNode;
        showToggle?: boolean; onToggle?: () => void; showVal?: boolean;
    }) => (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="ot-label">{label}</label>
                {right}
            </div>
            <div style={{ position: 'relative' }}>
                <input
                    type={showToggle ? (showVal ? 'text' : 'password') : type}
                    required value={value} onChange={onChange}
                    className="ot-input" placeholder={placeholder}
                    style={showToggle ? { paddingRight: 44 } : {}}
                />
                {showToggle && (
                    <button type="button" onClick={onToggle} style={{
                        position: 'absolute', right: 13, top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'rgba(80,160,200,0.6)', lineHeight: 0, padding: 0,
                    }}>
                        {showVal ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="ot-root">
            {/* ── Animated background ── */}
            <div className="ot-bg">
                <div className="ot-aurora-1" />
                <div className="ot-aurora-2" />
                <div className="ot-aurora-3" />
                <div className="ot-aurora-4" />
            </div>
            <div className="ot-grid" />
            <div className="ot-scanline" />

            {/* ── Layout with swapping panels ── */}
            <div className="ot-layout" data-view={view} style={{ minHeight: '100vh' }}>

                {/* ── ILLUSTRATION PANEL ── */}
                <div className="ot-panel ot-panel-illus">
                    <div className="ot-illus-inner">
                        {/* Logo top */}
                        <div className="ot-a1" style={{ position: 'absolute', top: 36, left: 48, zIndex: 10 }}>
                            <OnThesisLogo style={{ height: 34, width: 'auto' }} />
                        </div>

                        {/* Illustration */}
                        <AcademicScene />
                    </div>
                </div>

                {/* ── FORM PANEL ── */}
                <div className="ot-panel ot-panel-form">
                    <div className="ot-form-inner">
                        <div className="ot-card ot-a2">

                            {/* Card header */}
                            <div style={{ marginBottom: 32 }}>
                                <div style={{ marginBottom: 20 }}>
                                    {/* Tiny pill badge */}
                                    <div style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        padding: '4px 12px', borderRadius: 20,
                                        background: 'rgba(0,150,200,0.12)',
                                        border: '1px solid rgba(0,180,216,0.2)',
                                        marginBottom: 16,
                                    }}>
                                        <div style={{
                                            width: 6, height: 6, borderRadius: '50%',
                                            background: '#48cae4',
                                            boxShadow: '0 0 8px rgba(72,202,228,0.8)',
                                        }} />
                                        <span style={{ fontSize: 11, color: '#48cae4', fontWeight: 600, letterSpacing: '0.06em' }}>
                                            {view === 'login' ? 'MASUK AKUN' : 'DAFTAR AKUN'}
                                        </span>
                                    </div>
                                </div>

                                <h1 style={{
                                    fontFamily: 'DM Serif Display, serif',
                                    fontSize: 30, fontWeight: 400,
                                    fontStyle: 'italic',
                                    color: 'rgba(200,240,255,0.95)',
                                    margin: '0 0 8px',
                                    lineHeight: 1.2,
                                    letterSpacing: '-0.3px',
                                }}>
                                    {view === 'login' ? 'Selamat datang kembali' : 'Mulai perjalanan riset'}
                                </h1>
                                <p style={{ fontSize: 13.5, color: 'rgba(80,160,210,0.6)', margin: 0, lineHeight: 1.5 }}>
                                    {view === 'login'
                                        ? 'Masuk ke akun OnThesis Anda'
                                        : 'Buat akun dan mulai kelola riset Anda'}
                                </p>
                            </div>

                            {/* Error */}
                            {errorMsg && (
                                <div key={errorKey} className="ot-error-anim" style={{
                                    marginBottom: 20, padding: '10px 14px', borderRadius: 10,
                                    background: 'rgba(255,60,60,0.08)',
                                    border: '1px solid rgba(255,80,80,0.2)',
                                    color: 'rgba(255,140,140,0.9)',
                                    fontSize: 13, fontWeight: 500,
                                    display: 'flex', alignItems: 'center', gap: 8,
                                }}>
                                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff5050', flexShrink: 0, boxShadow: '0 0 6px rgba(255,80,80,0.7)' }} />
                                    {errorMsg}
                                </div>
                            )}

                            {/* Form */}
                            <form key={formKey} className="ot-form-body" onSubmit={handleEmailAuth}
                                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                                <Field
                                    label="Email" type="email"
                                    value={email} onChange={e => setEmail(e.target.value)}
                                    placeholder="nama@kampus.ac.id"
                                />

                                <Field
                                    label="Kata Sandi" type="password"
                                    value={password} onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    showToggle onToggle={() => setShowPass(v => !v)} showVal={showPass}
                                    right={
                                        view === 'login' ? (
                                            <a href="#" style={{
                                                fontSize: 12, color: 'rgba(0,180,216,0.7)',
                                                textDecoration: 'none', fontWeight: 500,
                                                transition: 'color 0.15s',
                                            }}
                                                onMouseEnter={e => (e.currentTarget.style.color = '#48cae4')}
                                                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,180,216,0.7)')}
                                            >Lupa sandi?</a>
                                        ) : undefined
                                    }
                                />

                                {view === 'register' && (
                                    <Field
                                        label="Konfirmasi Kata Sandi" type="password"
                                        value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        showToggle onToggle={() => setShowConfirm(v => !v)} showVal={showConfirm}
                                    />
                                )}

                                {view === 'login' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <input type="checkbox" id="rem" checked={rememberMe}
                                            onChange={e => setRememberMe(e.target.checked)}
                                            className="ot-checkbox" />
                                        <label htmlFor="rem" style={{
                                            fontSize: 12.5, color: 'rgba(80,160,210,0.6)',
                                            cursor: 'pointer', userSelect: 'none',
                                        }}>Ingat saya</label>
                                    </div>
                                )}

                                <button type="submit" disabled={isLoading} className="ot-btn" style={{ marginTop: 6 }}>
                                    {isLoading
                                        ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                                        : <>
                                            {view === 'login' ? 'Masuk' : 'Buat Akun'}
                                            <ArrowRight size={16} />
                                        </>
                                    }
                                </button>
                            </form>

                            {/* Divider */}
                            <div className="ot-divider">
                                <div className="ot-divider-line" />
                                <span className="ot-divider-text">atau</span>
                                <div className="ot-divider-line" />
                            </div>

                            {/* Google */}
                            <button type="button" onClick={handleGoogle}
                                disabled={isLoading} className="ot-btn-google">
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg"
                                    alt="G" style={{ width: 18, height: 18, opacity: 0.85 }} />
                                Lanjutkan dengan Google
                            </button>

                            {/* Footer */}
                            <p style={{
                                marginTop: 28, textAlign: 'center',
                                fontSize: 13.5, color: 'rgba(80,150,200,0.55)',
                            }}>
                                {view === 'login' ? 'Belum punya akun? ' : 'Sudah punya akun? '}
                                <button
                                    onClick={() => switchView(view === 'login' ? 'register' : 'login')}
                                    style={{
                                        background: 'none', border: 'none', padding: 0,
                                        color: '#48cae4', fontWeight: 600,
                                        cursor: 'pointer', fontFamily: 'inherit',
                                        fontSize: 'inherit',
                                        textDecoration: 'underline',
                                        textDecorationColor: 'rgba(72,202,228,0.3)',
                                        textUnderlineOffset: '3px',
                                    }}
                                >
                                    {view === 'login' ? 'Daftar sekarang' : 'Masuk di sini'}
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}