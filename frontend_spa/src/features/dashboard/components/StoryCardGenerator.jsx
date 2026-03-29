import React, { useRef, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Download, X } from 'lucide-react';

// <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

const FONT = '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif';

// ── Luxury Palette ──────────────────────────────────────────────────────────
const GOLD = {
    600: '#B45309',
    500: '#D97706',
    400: '#F5A524',
    300: '#FCD34D',
    200: '#FDE68A',
    100: '#FEF3C7',
};
const CREAM = {
    100: '#FFFBF5',
    200: '#FFF1DC',
    300: '#FDDCAE',
};
const NAVY = {
    950: '#03070F',
    900: '#060D1A',
    800: '#0A1628',
    700: '#0F2040',
    600: '#163258',
    500: '#1D4F7C',
    400: '#2B72B0',
    300: '#4A9FD4',
    200: '#BAE6FD',
};
const CLAY = {
    orange: 'rgba(245,165,36,0.13)',
    blue: 'rgba(45,114,176,0.13)',
    purple: 'rgba(139,92,246,0.10)',
    teal: 'rgba(20,184,166,0.10)',
    neutral: 'rgba(255,255,255,0.07)',
};

export function StoryCardGenerator({ data, isOpen, onClose }) {
    const canvasRef = useRef(null);
    const [rendering, setRendering] = useState(false);

    const streak = typeof data?.streak === 'object' ? (data.streak.count ?? 0) : (data?.streak ?? 7);
    const levelName = typeof data?.level === 'object' ? (data.level.name ?? data.level.title ?? 'Junior Researcher') : (data?.level ?? 'Junior Researcher');
    const totalHours = typeof data?.totalHours === 'object' ? (data.totalHours.value ?? 0) : (data?.totalHours ?? 42);
    const references = typeof data?.references === 'object' ? (data.references.total ?? 0) : (data?.references ?? 18);

    // ── Rounded-rect path helper ────────────────────────────────────────────
    const rr = (ctx, x, y, w, h, r) => {
        const rad = Array.isArray(r) ? r : [r, r, r, r];
        ctx.beginPath();
        if (ctx.roundRect) { ctx.roundRect(x, y, w, h, rad); return; }
        ctx.moveTo(x + rad[0], y);
        ctx.lineTo(x + w - rad[1], y); ctx.quadraticCurveTo(x + w, y, x + w, y + rad[1]);
        ctx.lineTo(x + w, y + h - rad[2]); ctx.quadraticCurveTo(x + w, y + h, x + w - rad[2], y + h);
        ctx.lineTo(x + rad[3], y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - rad[3]);
        ctx.lineTo(x, y + rad[0]); ctx.quadraticCurveTo(x, y, x + rad[0], y);
        ctx.closePath();
    };

    // ── Clay Card ─────────────────────────────────────────────────────────────
    // Simulates soft 3-D clay with: depth shadow → base fill → inner glow → top sheen → rim
    const clayCard = (ctx, x, y, w, h, rad = 32, tint = CLAY.neutral, opts = {}) => {
        const { glowColor = 'rgba(255,255,255,0)', depthColor = 'rgba(0,0,0,0.55)', intensity = 1 } = opts;

        // 1. Outer depth shadow (bottom-right offset, simulates lift)
        ctx.save();
        ctx.shadowColor = depthColor;
        ctx.shadowBlur = 40 * intensity;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 14 * intensity;
        rr(ctx, x + 4, y + 8, w - 8, h - 4, rad);
        ctx.fillStyle = 'rgba(0,0,0,0.01)'; ctx.fill();
        ctx.restore();

        // 2. Ambient glow underneath (colour specific)
        if (glowColor !== 'rgba(255,255,255,0)') {
            ctx.save();
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 60 * intensity;
            rr(ctx, x + 20, y + 20, w - 40, h - 20, rad);
            ctx.fillStyle = 'rgba(0,0,0,0.01)'; ctx.fill();
            ctx.restore();
        }

        // 3. Base clay fill — rich gradient giving the puffy body
        rr(ctx, x, y, w, h, rad);
        const gBase = ctx.createLinearGradient(x, y, x, y + h);
        gBase.addColorStop(0, tint.replace('0.13', '0.18').replace('0.07', '0.11'));
        gBase.addColorStop(0.4, tint);
        gBase.addColorStop(1, 'rgba(0,0,0,0.14)');
        ctx.fillStyle = gBase; ctx.fill();

        // 4. Inner top glow (concave light catch — the "clay puff")
        ctx.save();
        rr(ctx, x, y, w, h, rad); ctx.clip();
        const gInner = ctx.createRadialGradient(x + w * 0.38, y + h * 0.18, 0, x + w * 0.38, y + h * 0.18, w * 0.72);
        gInner.addColorStop(0, 'rgba(255,255,255,0.16)');
        gInner.addColorStop(0.6, 'rgba(255,255,255,0.04)');
        gInner.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gInner; ctx.fillRect(x, y, w, h);
        ctx.restore();

        // 5. Top-edge specular sheen (the brightest highlight, thin strip)
        ctx.save();
        rr(ctx, x, y, w, h, rad); ctx.clip();
        const gSheen = ctx.createLinearGradient(x, y, x, y + h * 0.22);
        gSheen.addColorStop(0, 'rgba(255,255,255,0.28)');
        gSheen.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gSheen;
        ctx.fillRect(x, y, w, h * 0.22);
        ctx.restore();

        // 6. Bottom inner shadow (depth at base of clay)
        ctx.save();
        rr(ctx, x, y, w, h, rad); ctx.clip();
        const gBot = ctx.createLinearGradient(x, y + h * 0.72, x, y + h);
        gBot.addColorStop(0, 'rgba(0,0,0,0)');
        gBot.addColorStop(1, 'rgba(0,0,0,0.22)');
        ctx.fillStyle = gBot;
        ctx.fillRect(x, y + h * 0.72, w, h * 0.28);
        ctx.restore();

        // 7. Rim — delicate gradient border
        rr(ctx, x, y, w, h, rad);
        const gRim = ctx.createLinearGradient(x, y, x, y + h);
        gRim.addColorStop(0, 'rgba(255,255,255,0.30)');
        gRim.addColorStop(0.45, 'rgba(255,255,255,0.10)');
        gRim.addColorStop(1, 'rgba(255,255,255,0.18)');
        ctx.strokeStyle = gRim; ctx.lineWidth = 1.2; ctx.stroke();
    };

    // ── Text width ──────────────────────────────────────────────────────────
    const tw = (ctx, text, font) => {
        ctx.save(); ctx.font = font;
        const m = ctx.measureText(text).width;
        ctx.restore(); return m;
    };

    // ── Sparkle ──────────────────────────────────────────────────────────────
    const sparkle = (ctx, x, y, r, color, alpha = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.fillStyle = color; ctx.globalAlpha = alpha;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4;
            const ro = i % 2 === 0 ? r : r * 0.38;
            if (i === 0) ctx.moveTo(Math.cos(a) * ro, Math.sin(a) * ro);
            else ctx.lineTo(Math.cos(a) * ro, Math.sin(a) * ro);
        }
        ctx.closePath(); ctx.fill(); ctx.restore();
    };

    // ── Clay Mascot ───────────────────────────────────────────────────────────
    const drawMascot = (ctx, cx, cy, size) => {
        const s = size / 200;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.rotate(0.04);

        // Soft drop shadow
        const shad = ctx.createRadialGradient(0, 220, 0, 0, 220, 90);
        shad.addColorStop(0, 'rgba(29,79,124,0.22)'); shad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = shad;
        ctx.beginPath(); ctx.ellipse(0, 224, 78, 24, 0, 0, Math.PI * 2); ctx.fill();

        // Body clay — warm cream base with gold gradient
        const gBody = ctx.createLinearGradient(-44, 78, 44, 175);
        gBody.addColorStop(0, '#FCD34D'); gBody.addColorStop(0.5, '#F5A524'); gBody.addColorStop(1, '#D97706');
        ctx.save();
        ctx.shadowColor = 'rgba(180,83,9,0.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
        rr(ctx, -44, 78, 88, 82, 28); ctx.fillStyle = gBody; ctx.fill();
        ctx.restore();
        // body top sheen
        ctx.save(); rr(ctx, -44, 78, 88, 82, 28); ctx.clip();
        const gBodySheen = ctx.createLinearGradient(-44, 78, 44, 78 + 40);
        gBodySheen.addColorStop(0, 'rgba(255,255,255,0.28)'); gBodySheen.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gBodySheen; ctx.fillRect(-44, 78, 88, 40); ctx.restore();

        // Tiny book (clay navy)
        ctx.save(); ctx.shadowColor = 'rgba(3,7,15,0.4)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
        rr(ctx, -40, 112, 34, 44, 7); ctx.fillStyle = NAVY[700]; ctx.fill();
        ctx.restore();
        rr(ctx, -36, 116, 26, 36, 5); ctx.fillStyle = CREAM[100]; ctx.fill();
        ctx.strokeStyle = NAVY[400]; ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath(); ctx.moveTo(-33, 122 + i * 6); ctx.lineTo(-13, 122 + i * 6); ctx.stroke();
        }
        sparkle(ctx, 26, 104, 11, GOLD[300], 0.9);

        // Neck
        ctx.fillStyle = '#FDDCAE'; ctx.fillRect(-14, 62, 28, 22);

        // Head — clay round with soft shadow
        ctx.save();
        ctx.shadowColor = 'rgba(180,83,9,0.18)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8;
        ctx.fillStyle = '#FDDCAE';
        ctx.beginPath(); ctx.ellipse(0, 18, 68, 65, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        // head sheen
        ctx.save();
        ctx.beginPath(); ctx.ellipse(0, 18, 68, 65, 0, 0, Math.PI * 2); ctx.clip();
        const gHead = ctx.createRadialGradient(-22, -28, 0, -22, -28, 80);
        gHead.addColorStop(0, 'rgba(255,255,255,0.26)'); gHead.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gHead; ctx.fillRect(-68, -48, 136, 130); ctx.restore();

        // Cheek blush (soft diffuse)
        [[-46, 42], [46, 42]].forEach(([bx, by]) => {
            const bg = ctx.createRadialGradient(bx, by, 0, bx, by, 24);
            bg.addColorStop(0, 'rgba(251,113,133,0.48)'); bg.addColorStop(1, 'rgba(251,113,133,0)');
            ctx.fillStyle = bg;
            ctx.beginPath(); ctx.ellipse(bx, by, 22, 15, 0, 0, Math.PI * 2); ctx.fill();
        });

        // Eye whites with clay depth
        [[-26, 17], [26, 17]].forEach(([ex, ey]) => {
            ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
            ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(ex, ey, 20, 22, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });
        // Irises — deep navy with shimmer
        [[-26, 19], [26, 19]].forEach(([ex, ey]) => {
            const gEye = ctx.createRadialGradient(ex - 4, ey - 5, 0, ex, ey, 13);
            gEye.addColorStop(0, NAVY[400]); gEye.addColorStop(1, NAVY[800]);
            ctx.fillStyle = gEye; ctx.beginPath(); ctx.ellipse(ex, ey, 13, 15, 0, 0, Math.PI * 2); ctx.fill();
        });
        // Pupils
        [[-26, 20], [26, 20]].forEach(([ex, ey]) => {
            ctx.fillStyle = NAVY[950]; ctx.beginPath(); ctx.ellipse(ex, ey, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
        });
        // Eye shine highlights
        ctx.fillStyle = '#FFFFFF';
        [[-21, 14], [31, 14]].forEach(([hx, hy]) => { ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, Math.PI * 2); ctx.fill(); });
        [[-31, 22], [21, 22]].forEach(([hx, hy]) => { ctx.beginPath(); ctx.arc(hx, hy, 2, 0, Math.PI * 2); ctx.fill(); });

        // Smile
        ctx.strokeStyle = '#B45309'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-18, 50); ctx.quadraticCurveTo(0, 66, 18, 50); ctx.stroke();

        // Graduation cap — clay navy with gold sheen
        ctx.save();
        ctx.shadowColor = 'rgba(3,7,15,0.45)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6;
        const gCap = ctx.createLinearGradient(0, -92, 0, -32);
        gCap.addColorStop(0, NAVY[500]); gCap.addColorStop(1, NAVY[900]);
        ctx.fillStyle = gCap;
        ctx.beginPath();
        ctx.moveTo(0, -92); ctx.lineTo(58, -50); ctx.lineTo(0, -34); ctx.lineTo(-58, -50); ctx.closePath();
        ctx.fill(); ctx.restore();
        // cap sheen
        ctx.save();
        ctx.beginPath(); ctx.moveTo(0, -92); ctx.lineTo(58, -50); ctx.lineTo(0, -34); ctx.lineTo(-58, -50); ctx.closePath(); ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.beginPath(); ctx.moveTo(0, -92); ctx.lineTo(58, -50); ctx.lineTo(0, -74); ctx.closePath(); ctx.fill();
        ctx.restore();
        // Brim
        ctx.save(); ctx.shadowColor = 'rgba(3,7,15,0.4)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
        rr(ctx, -60, -60, 120, 20, 6); ctx.fillStyle = NAVY[900]; ctx.fill(); ctx.restore();
        // Tassel (gold)
        ctx.strokeStyle = GOLD[300]; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(56, -58); ctx.lineTo(56, -18); ctx.stroke();
        ctx.save(); ctx.shadowColor = 'rgba(245,165,36,0.5)'; ctx.shadowBlur = 12;
        ctx.fillStyle = GOLD[400]; ctx.beginPath(); ctx.arc(56, -12, 10, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Floating sparkles
        sparkle(ctx, -86, -64, 10, GOLD[300], 0.85);
        sparkle(ctx, 84, -30, 8, NAVY[300], 0.8);
        sparkle(ctx, -80, 38, 6, GOLD[200], 0.7);
        sparkle(ctx, 82, 64, 7, NAVY[300], 0.75);
        sparkle(ctx, -6, -114, 9, GOLD[300], 0.8);

        ctx.restore();
    };

    // ── Stat Icon ─────────────────────────────────────────────────────────────
    const drawIcon = (ctx, icon, x, y, size, color) => {
        const s = size / 40;
        ctx.save(); ctx.translate(x + size / 2, y + size / 2); ctx.scale(s, s);

        if (icon === 'fire') {
            const gF = ctx.createLinearGradient(0, 22, 0, -22);
            gF.addColorStop(0, '#DC2626'); gF.addColorStop(0.45, GOLD[400]); gF.addColorStop(1, GOLD[200]);
            ctx.save(); ctx.shadowColor = 'rgba(245,165,36,0.55)'; ctx.shadowBlur = 16;
            ctx.fillStyle = gF;
            ctx.beginPath();
            ctx.moveTo(0, 22);
            ctx.bezierCurveTo(20, 22, 27, 8, 18, -2);
            ctx.bezierCurveTo(16, 8, 10, 4, 12, -8);
            ctx.bezierCurveTo(4, -2, -2, 10, 2, 16);
            ctx.bezierCurveTo(-4, 8, -6, 2, 0, -10);
            ctx.bezierCurveTo(-14, 2, -22, 14, -16, 22);
            ctx.closePath(); ctx.fill(); ctx.restore();
            ctx.fillStyle = 'rgba(253,230,138,0.6)';
            ctx.beginPath(); ctx.ellipse(0, 12, 7, 10, 0, 0, Math.PI * 2); ctx.fill();

        } else if (icon === 'books') {
            [[NAVY[400], -10, 0], [NAVY[600], 6, 4]].forEach(([c, ox, oy]) => {
                ctx.save(); ctx.shadowColor = 'rgba(3,7,15,0.4)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
                ctx.fillStyle = c;
                rr(ctx, ox - 14, oy - 20, 28, 36, 5); ctx.fill(); ctx.restore();
                ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(ox - 14, oy - 20, 5, 36);
            });
            ctx.fillStyle = GOLD[300];
            ctx.beginPath();
            ctx.moveTo(14, -20); ctx.lineTo(20, -20); ctx.lineTo(20, -6); ctx.lineTo(17, -10); ctx.lineTo(14, -6);
            ctx.closePath(); ctx.fill();

        } else if (icon === 'cap') {
            ctx.save(); ctx.shadowColor = 'rgba(29,79,124,0.5)'; ctx.shadowBlur = 12;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(0, -20); ctx.lineTo(22, -8); ctx.lineTo(0, 4); ctx.lineTo(-22, -8); ctx.closePath();
            ctx.fill(); ctx.restore();
            rr(ctx, -20, -4, 40, 8, 2); ctx.fillStyle = NAVY[700]; ctx.fill();
            ctx.strokeStyle = GOLD[300]; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(20, -8); ctx.lineTo(20, 14); ctx.stroke();
            ctx.fillStyle = GOLD[400]; ctx.beginPath(); ctx.arc(20, 18, 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    };

    // ── MAIN DRAW ─────────────────────────────────────────────────────────────
    const draw = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        setRendering(true);
        try {
            await document.fonts.load(`800 80px ${FONT}`);
            await document.fonts.load(`700 80px "Caveat"`);
        } catch (_) { }

        const W = 1080, H = 1920, P = 72;
        ctx.clearRect(0, 0, W, H);

        // ── BACKGROUND — deep midnight ────────────────────────────────────────
        ctx.fillStyle = NAVY[950]; ctx.fillRect(0, 0, W, H);

        // Warm gold bloom — top-right
        const gGold = ctx.createRadialGradient(W * 0.88, -60, 0, W * 0.88, -60, 1000);
        gGold.addColorStop(0, 'rgba(245,165,36,0.22)');
        gGold.addColorStop(0.4, 'rgba(217,119,6,0.08)');
        gGold.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gGold; ctx.fillRect(0, 0, W, H);

        // Ocean blue bloom — bottom-left
        const gOcean = ctx.createRadialGradient(0, H, 0, 0, H, 1200);
        gOcean.addColorStop(0, 'rgba(29,79,124,0.32)');
        gOcean.addColorStop(0.45, 'rgba(10,22,40,0.12)');
        gOcean.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gOcean; ctx.fillRect(0, 0, W, H);

        // Subtle centre luminescence
        const gCentre = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, 720);
        gCentre.addColorStop(0, 'rgba(29,79,124,0.06)');
        gCentre.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gCentre; ctx.fillRect(0, 0, W, H);

        // ── BRANDING HELPER ───────────────────────────────────────────────────
        const drawOnThesisLogo = (ix, iy, h, text = 'OnThesis', isCenter = false, stacked = false) => {
            const s = h / 140;
            const rects = [
                { x: 40, y: 42, w: 40, h: 8 },
                { x: 30, y: 56, w: 60, h: 8 },
                { x: 26, y: 70, w: 68, h: 8 },
                { x: 30, y: 84, w: 60, h: 8 },
                { x: 40, y: 98, w: 40, h: 8 },
            ];
            const textSize = 44 * s;
            ctx.save();
            ctx.font = `700 ${textSize}px ${FONT}`;
            const textWidth = ctx.measureText(text).width;
            const iconW = 110 * s;
            const textX = 118 * s;
            let startX = ix;
            let drawIconY = iy;
            let drawTextX = startX + textX;
            let drawTextY = iy;

            if (stacked) {
                if (isCenter) startX = (W / 2) - (iconW / 2);
                drawIconY = iy - (textSize / 2) - 10;
                drawTextX = isCenter ? W / 2 : ix + (iconW / 2);
                drawTextY = iy + (iconW / 2) + (textSize / 2) - 5;
                ctx.textAlign = isCenter ? 'center' : 'left';
            } else {
                if (isCenter) {
                    const totalW = textX + textWidth;
                    startX = (W / 2) - (totalW / 2);
                    drawTextX = startX + textX;
                }
                ctx.textAlign = 'left';
            }

            ctx.save(); ctx.translate(startX, drawIconY); ctx.scale(s, s); ctx.translate(0, -70);
            const grad = ctx.createLinearGradient(26, 0, 94, 0);
            grad.addColorStop(0, NAVY[300]); grad.addColorStop(1, '#06B6D4');
            ctx.fillStyle = grad;
            rects.forEach(r => { rr(ctx, r.x, r.y, r.w, r.h, 4); ctx.fill(); });
            ctx.restore();

            ctx.fillStyle = '#FFFFFF';
            if (text.includes('.ai')) ctx.globalAlpha = 0.50;
            ctx.font = `700 ${textSize}px ${FONT}`;
            ctx.textBaseline = 'middle';
            ctx.fillText(text, drawTextX, drawTextY);
            ctx.globalAlpha = 1; ctx.restore();
        };

        // ── HEADER: BRANDING (Minimalist - No Pill) ──────────────────────────
        let y = 100;
        const iconH = 50; 
        ctx.textBaseline = 'middle';
        drawOnThesisLogo(P, y, iconH, 'OnThesis');

        // ── TITLE ─────────────────────────────────────────────────────────────
        y = 282;
        const projectTitle = data.projectTitle || 'My Thesis Journey';
        let fontSize = 140;
        if (projectTitle.length > 25) fontSize = 110;
        if (projectTitle.length > 45) fontSize = 85;
        if (projectTitle.length > 70) fontSize = 60;
        if (projectTitle.length > 100) fontSize = 50;

        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.font = `700 ${fontSize}px "Caveat", cursive`;

        const words = projectTitle.split(' ');
        let lines = [];
        let currentLine = '';
        words.forEach((word) => {
            const isFirstLines = lines.length < 2;
            const currentMaxW = isFirstLines ? (W - P * 2 - 350) : (W - P * 2);
            const testLine = currentLine + word + ' ';
            if (ctx.measureText(testLine).width > currentMaxW && currentLine !== '') {
                lines.push(currentLine.trim()); currentLine = word + ' ';
            } else { currentLine = testLine; }
        });
        lines.push(currentLine.trim());

        lines.forEach((l, i) => {
            const ly = y + i * (fontSize * 0.95);
            // Gold text shimmer
            const gTitle = ctx.createLinearGradient(P, ly - fontSize, P + W * 0.7, ly);
            gTitle.addColorStop(0, CREAM[100]);
            gTitle.addColorStop(0.4, GOLD[200]);
            gTitle.addColorStop(0.7, CREAM[100]);
            gTitle.addColorStop(1, GOLD[300]);
            ctx.shadowBlur = 22; ctx.shadowColor = 'rgba(245,165,36,0.28)';
            ctx.fillStyle = gTitle;
            ctx.fillText(l, P, ly);
            ctx.shadowBlur = 0;
        });

        // ── MASCOT ────────────────────────────────────────────────────────────
        drawMascot(ctx, W - 268, 170, 236);

        // ── HOURS CLAY CARD ───────────────────────────────────────────────────
        const titleBottomY = y + (lines.length - 1) * (fontSize * 0.95);
        y = Math.max(455, titleBottomY + 105);

        const cX = P, cY_card = y, cW = W - P * 2, cH = 232;
        clayCard(ctx, cX, cY_card, cW, cH, 32, CLAY.orange, {
            glowColor: 'rgba(245,165,36,0.22)', depthColor: 'rgba(0,0,0,0.6)', intensity: 1.1,
        });

        // Accent bar (gold→navy gradient, left edge)
        rr(ctx, cX, cY_card, 7, cH, [4, 0, 0, 4]);
        const gAcc = ctx.createLinearGradient(0, cY_card, 0, cY_card + cH);
        gAcc.addColorStop(0, GOLD[400]); gAcc.addColorStop(1, NAVY[400]);
        ctx.fillStyle = gAcc; ctx.fill();

        // Inner radial warmth
        const gInW = ctx.createRadialGradient(cX + 200, cY_card + cH / 2, 0, cX + 200, cY_card + cH / 2, 380);
        gInW.addColorStop(0, 'rgba(245,165,36,0.10)'); gInW.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gInW; rr(ctx, cX, cY_card, cW, cH, 32); ctx.fill();

        // Hours number — gold shimmer
        const gNum = ctx.createLinearGradient(cX + 56, cY_card + 60, cX + 56, cY_card + 188);
        gNum.addColorStop(0, CREAM[100]); gNum.addColorStop(0.5, GOLD[200]); gNum.addColorStop(1, GOLD[400]);
        ctx.save(); ctx.shadowColor = 'rgba(245,165,36,0.35)'; ctx.shadowBlur = 18;
        ctx.fillStyle = gNum; ctx.font = `800 126px ${FONT}`; ctx.textAlign = 'left';
        ctx.fillText(totalHours.toString(), cX + 56, cY_card + 170);
        ctx.restore();

        const nW = tw(ctx, totalHours.toString(), `800 126px ${FONT}`);
        const lX = cX + 56 + nW + 34;
        ctx.fillStyle = CREAM[100]; ctx.font = `700 42px ${FONT}`;
        ctx.fillText('HOURS', lX, cY_card + 108);
        ctx.fillStyle = 'rgba(255,255,255,0.42)'; ctx.font = `400 28px ${FONT}`;
        ctx.fillText('Writing This Month', lX, cY_card + 160);

        // ── THREE STAT CLAY CARDS ─────────────────────────────────────────────
        y = cY_card + cH + 46;
        const sW = (W - P * 2 - 28) / 3, sH = 222, sG = 14;
        const lvl = levelName.trim().split(' ');

        const statDefs = [
            { icon: 'fire', val: `${streak}`, sub: 'Day Streak', tint: CLAY.orange, glow: 'rgba(245,165,36,0.22)', iconClr: GOLD[400] },
            { icon: 'books', val: references.toString(), sub: 'References', tint: CLAY.blue, glow: 'rgba(45,114,176,0.22)', iconClr: NAVY[300] },
            { icon: 'cap', val: lvl[0] ?? 'Junior', sub: lvl.slice(1).join(' ') || 'Researcher', tint: CLAY.purple, glow: 'rgba(139,92,246,0.18)', iconClr: NAVY[300] },
        ];

        statDefs.forEach((sd, i) => {
            const sx = P + i * (sW + sG);
            clayCard(ctx, sx, y, sW, sH, 26, sd.tint, {
                glowColor: sd.glow, depthColor: 'rgba(0,0,0,0.55)', intensity: 0.9,
            });
            drawIcon(ctx, sd.icon, sx + 28, y + 30, 52, sd.iconClr);

            const gVal = ctx.createLinearGradient(sx + 28, y + 90, sx + 28, y + 158);
            gVal.addColorStop(0, CREAM[100]); gVal.addColorStop(1, GOLD[200]);
            ctx.save(); ctx.shadowColor = sd.glow; ctx.shadowBlur = 12;
            ctx.fillStyle = gVal; ctx.font = `700 56px ${FONT}`;
            ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
            ctx.fillText(sd.val, sx + 28, y + 152);
            ctx.restore();

            ctx.fillStyle = 'rgba(255,255,255,0.40)'; ctx.font = `400 24px ${FONT}`;
            ctx.fillText(sd.sub, sx + 28, y + 196);
        });

        // ── PRODUCTIVITY FLOW ─────────────────────────────────────────────────
        y += sH + 64;
        ctx.fillStyle = CREAM[100]; ctx.font = `700 36px ${FONT}`;
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('Productivity Flow', P, y);

        const hSz = 28, hGp = 10;
        const nCols = Math.floor((W - P * 2 + hGp) / (hSz + hGp));
        const heatmapData = data.heatmap || [];
        const nDays = nCols * 7;
        const relevantData = heatmapData.slice(-nDays);

        ctx.fillStyle = 'rgba(255,255,255,0.36)'; ctx.font = `500 22px ${FONT}`;
        let lastMonth = '';
        for (let col = 0; col < nCols; col++) {
            const dataIdx = col * 7;
            if (relevantData[dataIdx]) {
                const date = new Date(relevantData[dataIdx].date);
                const month = format(date, 'MMM').toUpperCase();
                if (month !== lastMonth) {
                    ctx.fillText(month, P + col * (hSz + hGp), y + 40); lastMonth = month;
                }
            }
        }

        y += 60;
        for (let col = 0; col < nCols; col++) {
            for (let row = 0; row < 7; row++) {
                const point = relevantData[(col * 7) + row];
                const count = point?.count || 0;

                // Clay dot fill + subtle glow on active
                let fillColor, shadowColor = null;
                if (count === 0) { fillColor = 'rgba(255,255,255,0.05)'; }
                else if (count <= 30) { fillColor = 'rgba(245,165,36,0.28)'; shadowColor = 'rgba(245,165,36,0.25)'; }
                else if (count <= 60) { fillColor = 'rgba(245,165,36,0.54)'; shadowColor = 'rgba(245,165,36,0.35)'; }
                else if (count <= 120) { fillColor = 'rgba(45,114,176,0.65)'; shadowColor = 'rgba(45,114,176,0.40)'; }
                else { fillColor = NAVY[300]; shadowColor = 'rgba(74,159,212,0.45)'; }

                if (shadowColor) {
                    ctx.save();
                    ctx.shadowColor = shadowColor; ctx.shadowBlur = 8;
                    rr(ctx, P + col * (hSz + hGp), y + row * (hSz + hGp), hSz, hSz, 6);
                    ctx.fillStyle = fillColor; ctx.fill();
                    ctx.restore();
                } else {
                    rr(ctx, P + col * (hSz + hGp), y + row * (hSz + hGp), hSz, hSz, 6);
                    ctx.fillStyle = fillColor; ctx.fill();
                }
            }
        }

        // ── APPRECIATION TEXT ─────────────────────────────────────────────────
        y += 7 * (hSz + hGp) + 128;
        const userName = data.userName || 'Champion';

        // Decorative underline sparkle row
        [-3, -1, 1, 3].forEach((offset, idx) => {
            sparkle(ctx, W / 2 + offset * 60, y - 28, 5 + idx % 2, idx % 2 === 0 ? GOLD[300] : NAVY[300], 0.55);
        });

        ctx.textAlign = 'center';
        const gAppr = ctx.createLinearGradient(W / 2 - 300, y, W / 2 + 300, y);
        gAppr.addColorStop(0, GOLD[300]); gAppr.addColorStop(0.5, CREAM[100]); gAppr.addColorStop(1, GOLD[300]);
        ctx.save(); ctx.shadowBlur = 20; ctx.shadowColor = 'rgba(245,165,36,0.30)';
        ctx.fillStyle = gAppr; ctx.font = `700 84px "Caveat", cursive`;
        ctx.fillText(`Good Job! ${userName}`, W / 2, y); ctx.restore();

        ctx.fillStyle = 'rgba(255,255,255,0.40)'; ctx.font = `400 25px ${FONT}`;
        ctx.fillText('You are making incredible progress on your thesis voyage.', W / 2, y + 66);

        // ── FOOTER ────────────────────────────────────────────────────────────
        const fY = H - 162;
        const gLine = ctx.createLinearGradient(P, fY, W - P, fY);
        gLine.addColorStop(0, 'rgba(255,255,255,0)');
        gLine.addColorStop(0.5, 'rgba(255,255,255,0.07)');
        gLine.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath(); ctx.moveTo(P, fY); ctx.lineTo(W - P, fY);
        ctx.strokeStyle = gLine; ctx.lineWidth = 1.2; ctx.stroke();

        // Logo clearance
        const footW = 288;
        ctx.fillStyle = NAVY[950]; ctx.fillRect(W / 2 - footW / 2, fY - 22, footW, 44);
        drawOnThesisLogo(W / 2, fY, 28, 'onthesis.ai', true, false);

        // ── VIGNETTE ──────────────────────────────────────────────────────────
        const vign = ctx.createRadialGradient(W / 2, H / 2, 480, W / 2, H / 2, 1200);
        vign.addColorStop(0, 'rgba(0,0,0,0)');
        vign.addColorStop(1, 'rgba(0,0,0,0.20)');
        ctx.fillStyle = vign; ctx.fillRect(0, 0, W, H);

        setRendering(false);
    };

    useEffect(() => {
        if (!isOpen) return;
        const t = setTimeout(draw, 200);
        return () => clearTimeout(t);
    }, [isOpen, data]);

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const a = document.createElement('a');
        a.download = `onthesis-story-${format(new Date(), 'yyyyMMdd')}.png`;
        a.href = canvas.toDataURL('image/png', 1.0);
        a.click();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/20 p-4 overflow-y-auto pt-24">
            <div className="relative max-w-lg w-full flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-5 duration-500 pb-20">

                <button onClick={onClose}
                    className="absolute -top-10 right-4 md:-right-10 p-2 text-white/60 hover:text-white transition-colors z-50">
                    <X size={32} />
                </button>

                <div className="rounded-[32px] overflow-hidden relative shrink-0"
                    style={{
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
                    }}>
                    <canvas
                        ref={canvasRef}
                        width={1080} height={1920}
                        className="w-[220px] h-[391px] md:w-[260px] md:h-[462px] object-contain"
                        style={{ background: '#03070F' }}
                    />
                    {rendering && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                            <div className="w-8 h-8 border-[3px] border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3 w-full max-w-[360px]">
                    <button
                        onClick={handleDownload}
                        disabled={rendering}
                        className="w-full flex items-center justify-center gap-3 py-5 rounded-[28px] font-black text-base uppercase tracking-widest text-white transition-all active:scale-95 disabled:opacity-40 hover:brightness-110"
                        style={{
                            background: 'linear-gradient(100deg, #D97706 0%, #F5A524 35%, #FCD34D 60%, #4A9FD4 100%)',
                            boxShadow: '0 8px 32px rgba(245,165,36,0.28), 0 2px 8px rgba(0,0,0,0.3)',
                        }}
                    >
                        <Download size={22} strokeWidth={2.5} />
                        Download Story
                    </button>
                    <p className="text-white/25 text-[10px] text-center uppercase tracking-[0.25em]">
                        Ready to share on Instagram &amp; TikTok
                    </p>
                </div>
            </div>
        </div>
    );
}