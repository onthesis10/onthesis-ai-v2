import { useEffect, useRef, useState } from 'react';
import { OnThesisLogo } from '@/components/ui/OnThesisLogo';

const STYLES = `
  .had-canvas {
    width: 1200px; height: 750px; position: relative;
    background: radial-gradient(ellipse 80% 60% at 20% 40%, #0C2A4A 0%, transparent 60%),
                radial-gradient(ellipse 60% 50% at 85% 20%, #0B1E35 0%, transparent 55%),
                radial-gradient(ellipse 50% 40% at 50% 90%, #051525 0%, transparent 50%), #03080F;
    border-radius: 32px; overflow: hidden;
    border: 1px solid rgba(125,211,252,0.08);
  }

  .had-grid {
    position: absolute; inset: 0;
    background-image: linear-gradient(rgba(56,189,248,0.04) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(56,189,248,0.04) 1px, transparent 1px);
    background-size: 80px 80px;
  }

  .had-orb { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; }
  .had-orb-1 { width:480px;height:320px;background:rgba(14,165,233,0.18);top:-80px;left:-60px;animation:had-pulse1 6s ease-in-out infinite; }
  .had-orb-2 { width:360px;height:260px;background:rgba(99,102,241,0.12);bottom:-40px;right:80px;animation:had-pulse2 8s ease-in-out infinite; }
  .had-orb-3 { width:240px;height:180px;background:rgba(94,234,212,0.1);top:50%;left:50%;transform:translate(-50%,-50%);animation:had-pulse3 5s ease-in-out infinite; }

  @keyframes had-pulse1 { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
  @keyframes had-pulse2 { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:0.8;transform:scale(1.08)} }
  @keyframes had-pulse3 { 0%,100%{opacity:0.4} 50%{opacity:0.7} }

  .had-main-card {
    position: absolute; top:50px;left:50px;right:50px;bottom:50px;
    background: linear-gradient(135deg,rgba(11,30,51,0.85) 0%,rgba(7,18,32,0.75) 100%);
    border-radius: 24px; border: 1px solid rgba(103,232,249,0.15);
    backdrop-filter: blur(20px);
    box-shadow: 0 40px 120px rgba(0,0,0,0.6), inset 0 1px 0 rgba(125,211,252,0.12);
    animation: had-fadeUp 0.8s ease-out both;
  }

  .had-left-panel { position:absolute;top:0;left:0;bottom:0;width:460px;padding:52px 48px;display:flex;flex-direction:column;justify-content:space-between; }

  .had-headline { font-family:'Instrument Serif',serif;font-size:56px;line-height:1.08;color:#F0F9FF;margin-bottom:20px;letter-spacing:-0.02em; }
  .had-headline em { font-style:italic;color:#67E8F9; }

  .had-subtext { font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:400;color:rgba(186,230,255,0.65);line-height:1.7;max-width:330px;margin-bottom:36px; }

  .had-cta-row { display:flex;align-items:center;gap:16px; }
  .had-btn-primary { font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;color:#03080F;background:linear-gradient(135deg,#67E8F9,#38BDF8);border:none;border-radius:100px;padding:12px 28px;cursor:pointer;box-shadow:0 0 24px rgba(56,189,248,0.35); }
  .had-btn-ghost { font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:500;color:rgba(125,211,252,0.8);display:flex;align-items:center;gap:6px; cursor:pointer; }

  .had-stats-row { display:flex;gap:32px;padding-top:36px;border-top:1px solid rgba(56,189,248,0.08); }
  .had-stat-item { display:flex;flex-direction:column;gap:4px; }
  .had-stat-num { font-family:'Instrument Serif',serif;font-size:28px;color:#E0F2FE; }
  .had-stat-label { font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:500;color:rgba(125,211,252,0.45);letter-spacing:0.06em;text-transform:uppercase; }

  .had-divider { position:absolute;top:40px;bottom:40px;left:460px;width:1px;background:linear-gradient(to bottom,transparent,rgba(103,232,249,0.12) 30%,rgba(103,232,249,0.12) 70%,transparent); }

  .had-right-panel { position:absolute;top:0;right:0;bottom:0;left:460px;padding:40px 44px;display:flex;flex-direction:column;gap:18px; }

  .had-topbar { display:flex;align-items:center;justify-content:space-between;margin-bottom:4px; }
  .had-topbar-tabs { display:flex;gap:4px; }
  .had-tab { font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:500;padding:6px 14px;border-radius:8px;color:rgba(125,211,252,0.4); }
  .had-tab.active { background:rgba(56,189,248,0.1);color:#7DD3FC;border:1px solid rgba(56,189,248,0.2); }
  .had-topbar-actions { display:flex;gap:6px; }
  .had-action-dot { width:8px;height:8px;border-radius:50%; }
  .had-action-dot:nth-child(1){background:#34D399} .had-action-dot:nth-child(2){background:#FBBF24} .had-action-dot:nth-child(3){background:#F87171}

  .had-editor-card { background:rgba(6,16,28,0.8);border:1px solid rgba(56,189,248,0.1);border-radius:16px;padding:22px 24px;flex:1;position:relative;overflow:hidden; }
  .had-editor-card::before { content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(103,232,249,0.3),transparent); }

  .had-editor-label { font-family:'Plus Jakarta Sans',sans-serif;font-size:10px;font-weight:600;color:rgba(103,232,249,0.4);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:14px;display:flex;align-items:center;gap:8px; }
  .had-editor-label::before { content:'';width:16px;height:1px;background:rgba(103,232,249,0.3); }

  .had-text-line { height:8px;border-radius:4px;background:rgba(186,230,255,0.12);margin-bottom:10px; }
  .had-text-line.bright{background:rgba(186,230,255,0.28)} .had-text-line.accent{background:linear-gradient(90deg,rgba(56,189,248,0.4),rgba(56,189,248,0.1))}
  .had-text-line.short{width:45%} .had-text-line.med{width:72%} .had-text-line.full{width:95%} .had-text-line.w60{width:60%} .had-text-line.w80{width:80%}

  .had-ai-suggestion { margin-top:16px;background:rgba(56,189,248,0.05);border:1px solid rgba(56,189,248,0.15);border-left:2px solid #38BDF8;border-radius:8px;padding:12px 14px;display:flex;gap:10px;align-items:flex-start; }
  .had-ai-icon { width:20px;height:20px;border-radius:6px;background:linear-gradient(135deg,#38BDF8,#6366F1);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;color:white; }
  .had-ai-lines { flex:1;display:flex;flex-direction:column;gap:6px; }
  .had-ai-line { height:6px;border-radius:3px;background:rgba(125,211,252,0.2); }

  .had-bottom-row { display:flex;gap:14px; }
  .had-mini-card { flex:1;background:rgba(6,16,28,0.7);border:1px solid rgba(56,189,248,0.08);border-radius:14px;padding:16px 18px; }
  .had-mini-card-title { font-family:'Plus Jakarta Sans',sans-serif;font-size:10px;font-weight:600;color:rgba(103,232,249,0.45);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:10px; }

  .had-chart-bars { display:flex;align-items:flex-end;gap:5px;height:40px; }
  .had-bar { flex:1;border-radius:3px 3px 0 0;background:linear-gradient(to top,#0284C7,#5EEAD4);opacity:0.7; }
  .had-bar:nth-child(1){height:55%} .had-bar:nth-child(2){height:80%} .had-bar:nth-child(3){height:65%} .had-bar:nth-child(4){height:95%;opacity:1;box-shadow:0 0 10px rgba(94,234,212,0.4)} .had-bar:nth-child(5){height:70%} .had-bar:nth-child(6){height:88%}

  .had-progress-list { display:flex;flex-direction:column;gap:8px; }
  .had-progress-item { display:flex;align-items:center;gap:8px; }
  .had-progress-dot { width:5px;height:5px;border-radius:50%;background:#38BDF8;flex-shrink:0; }
  .had-progress-dot.done{background:#34D399} .had-progress-dot.warn{background:#FBBF24}
  .had-progress-bar-wrap { flex:1;height:4px;background:rgba(56,189,248,0.08);border-radius:2px; }
  .had-progress-fill { height:100%;border-radius:2px;background:linear-gradient(90deg,#38BDF8,#5EEAD4); }

  .had-score-display { display:flex;flex-direction:column;align-items:center;justify-content:center;height:60px; }
  .had-score-num { font-family:'Instrument Serif',serif;font-size:36px;color:#67E8F9;line-height:1; }
  .had-score-label { font-family:'Plus Jakarta Sans',sans-serif;font-size:9px;font-weight:600;color:rgba(103,232,249,0.4);letter-spacing:0.08em;text-transform:uppercase;margin-top:4px; }

  .had-cite-tag { position:absolute;right:16px;top:60px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:8px;padding:8px 12px;display:flex;flex-direction:column;gap:4px;min-width:120px; }
  .had-cite-tag-title { font-family:'Plus Jakarta Sans',sans-serif;font-size:9px;font-weight:600;color:#A78BFA;letter-spacing:0.08em;text-transform:uppercase; }
  .had-cite-tag-line { height:5px;border-radius:3px;background:rgba(167,139,250,0.2); }

  .had-cursor { position:absolute;width:2px;height:16px;background:#38BDF8;border-radius:1px;animation:had-cursor-blink 1.1s ease-in-out infinite; }
  @keyframes had-cursor-blink { 0%,100%{opacity:1} 50%{opacity:0} }

  .had-corner-accent { position:absolute;top:0;right:0;width:200px;height:200px;background:radial-gradient(circle at top right,rgba(56,189,248,0.06),transparent 70%);pointer-events:none; }

  @keyframes had-fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes had-fadeIn { from{opacity:0} to{opacity:1} }
`;

export function HeroArtworkDynamic() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const observer = new ResizeObserver((entries) => {
            if (!entries.length) return;
            const { width } = entries[0].contentRect;
            setScale(width / 1200);
        });

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // Polished text to match the serious product tone
    return (
        <div 
            ref={containerRef} 
            className="w-full relative overflow-hidden" 
            style={{ aspectRatio: '16/10', borderRadius: '26px' }}
        >
            <style>{STYLES}</style>
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 1200, height: 750, position: 'absolute', top: 0, left: 0 }}>
                <div className="had-canvas" style={{ transform: 'none', transformOrigin: 'unset' }}>
                    <div className="had-grid"></div>
                    <div className="had-orb had-orb-1"></div>
                    <div className="had-orb had-orb-2"></div>
                    <div className="had-orb had-orb-3"></div>

                    <div className="had-main-card">
                        <div className="had-corner-accent"></div>
                        <div className="had-left-panel">
                            <div>
                                <div style={{ marginBottom: '28px' }}>
                                    <OnThesisLogo variant="animated" className="h-8 w-auto grayscale brightness-200 contrast-100" />
                                </div>

                                <div className="had-headline">Tulis skripsi<br/>Anda dengan<br/><em>lebih presisi.</em></div>
                                <div className="had-subtext">OnThesis mendampingi Anda di setiap bab — dari menyusun tinjauan pustaka hingga interpretasi akhir — menggunakan panduan AI akademik, validasi sitasi, dan evaluasi real-time.</div>
                                <div className="had-cta-row">
                                    <button className="had-btn-primary">Mulai Proyek</button>
                                    <span className="had-btn-ghost">Validasi Dokumen &nbsp;→</span>
                                </div>
                            </div>
                            <div className="had-stats-row">
                                <div className="had-stat-item"><span className="had-stat-num">570k+</span><span className="had-stat-label">Sitasi Dianalisis</span></div>
                                <div className="had-stat-item"><span className="had-stat-num">12k+</span><span className="had-stat-label">Dokumen Aktif</span></div>
                                <div className="had-stat-item"><span className="had-stat-num">98%</span><span className="had-stat-label">Akreditasi AI</span></div>
                            </div>
                        </div>

                        <div className="had-divider"></div>

                        <div className="had-right-panel">
                            <div className="had-topbar">
                                <div className="had-topbar-tabs">
                                    <div className="had-tab active">Writing Studio</div>
                                    <div className="had-tab">Manajer Referensi</div>
                                    <div className="had-tab">Data Analisis</div>
                                </div>
                                <div className="had-topbar-actions">
                                    <div className="had-action-dot"></div><div className="had-action-dot"></div><div className="had-action-dot"></div>
                                </div>
                            </div>

                            <div className="had-editor-card">
                                <div className="had-editor-label">BAB IV — Hasil dan Pembahasan</div>
                                <div className="had-text-line bright full"></div>
                                <div className="had-text-line w80"></div>
                                <div className="had-text-line accent w60"></div>
                                <div style={{ height: '8px' }}></div>
                                <div className="had-text-line full"></div>
                                <div className="had-text-line med"></div>
                                <div className="had-text-line full"></div>
                                <div className="had-text-line short" style={{ position: 'relative' }}>
                                    <div className="had-cursor" style={{ left: 'calc(45% + 4px)', top: '-4px' }}></div>
                                </div>
                                <div className="had-ai-suggestion">
                                    <div className="had-ai-icon">✦</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '9px', fontWeight: 600, color: 'rgba(56,189,248,0.6)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>Saran Agensi Akademik</div>
                                        <div className="had-ai-lines">
                                            <div className="had-ai-line"></div>
                                            <div className="had-ai-line" style={{ width: '70%' }}></div>
                                            <div className="had-ai-line" style={{ width: '50%' }}></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="had-cite-tag">
                                    <div className="had-cite-tag-title">Validasi Sitasi Aktif</div>
                                    <div className="had-cite-tag-line" style={{ width: '90%' }}></div>
                                    <div className="had-cite-tag-line" style={{ width: '65%' }}></div>
                                </div>
                            </div>

                            <div className="had-bottom-row">
                                <div className="had-mini-card">
                                    <div className="had-mini-card-title">Struktur Bab</div>
                                    <div className="had-chart-bars">
                                        <div className="had-bar"></div><div className="had-bar"></div><div className="had-bar"></div>
                                        <div className="had-bar"></div><div className="had-bar"></div><div className="had-bar"></div>
                                    </div>
                                </div>
                                <div className="had-mini-card">
                                    <div className="had-mini-card-title">Integritas Dokumen</div>
                                    <div className="had-progress-list">
                                        <div className="had-progress-item"><div className="had-progress-dot done"></div><div className="had-progress-bar-wrap"><div className="had-progress-fill" style={{ width: '100%', background: 'linear-gradient(90deg,#34D399,#10B981)' }}></div></div></div>
                                        <div className="had-progress-item"><div className="had-progress-dot done"></div><div className="had-progress-bar-wrap"><div className="had-progress-fill" style={{ width: '85%' }}></div></div></div>
                                        <div className="had-progress-item"><div className="had-progress-dot"></div><div className="had-progress-bar-wrap"><div className="had-progress-fill" style={{ width: '52%' }}></div></div></div>
                                        <div className="had-progress-item"><div className="had-progress-dot warn"></div><div className="had-progress-bar-wrap"><div className="had-progress-fill" style={{ width: '20%', background: 'linear-gradient(90deg,#FBBF24,#F59E0B)' }}></div></div></div>
                                    </div>
                                </div>
                                <div className="had-mini-card" style={{ flex: 0.7, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <div className="had-mini-card-title" style={{ textAlign: 'center' }}>Similarity</div>
                                    <div className="had-score-display">
                                        <div className="had-score-num">3.2%</div>
                                        <div className="had-score-label">Lulus Uji ✓</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
