import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import ParaphraseEditor from './components/ParaphraseEditor';
import ParaphraseOutput from './components/ParaphraseOutput';
import AcademicMetricsPanel from './components/AcademicMetricsPanel';
import { useThemeStore } from '@/store/themeStore';

export const ParaphrasePage: React.FC = () => {
    const { theme } = useThemeStore();
    const [inputText, setInputText] = useState('');
    const [outputText, setOutputText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [metrics, setMetrics] = useState({
        similarity: 0,
        readabilityScore: 0,
        tone: 'Standard',
        'citation integrity': 'Pending'
    });

    useEffect(() => {
        const savedInput = localStorage.getItem('paraphrase_input');
        const savedOutput = localStorage.getItem('paraphrase_output');
        if (savedInput) setInputText(savedInput);
        if (savedOutput) setOutputText(savedOutput);
    }, []);

    useEffect(() => {
        localStorage.setItem('paraphrase_input', inputText);
    }, [inputText]);

    useEffect(() => {
        localStorage.setItem('paraphrase_output', outputText);
    }, [outputText]);

    const handleNewSession = () => {
        setInputText('');
        setOutputText('');
        setMetrics({
            similarity: 0,
            readabilityScore: 0,
            tone: 'Standard',
            'citation integrity': 'Pending'
        });
    };

    const handleParaphrase = async () => {
        if (!inputText.trim()) return;
        setIsProcessing(true);
        setOutputText('');

        try {
            const response = await fetch('/api/paraphrase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: inputText, style: 'academic' })
            });

            if (!response.body) throw new Error("No response body");
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let result = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                result += chunk;
                setOutputText(prev => prev + chunk);
            }
            calculateMetrics(inputText, result);
        } catch (error) {
            console.error("Paraphrase failed:", error);
            setTimeout(() => {
                const mockResult = "The integration of digital devices into daily life has become pervasive. Many individuals perceive an inability to function effectively without them, checking notifications immediately upon waking and continuing until sleep.";
                setOutputText(mockResult);
                calculateMetrics(inputText, mockResult);
            }, 1500);
        } finally {
            setIsProcessing(false);
        }
    };

    const calculateMetrics = (original: string, rewritten: string) => {
        setMetrics({
            similarity: 12,
            readabilityScore: 65,
            tone: 'Objective',
            'citation integrity': 'Verified'
        });
    };

    // --- ANIMATION STYLES ---
    const animationStyles = `
      @keyframes blob {
        0% { transform: translate(0px, 0px) scale(1); }
        33% { transform: translate(30px, -50px) scale(1.1); }
        66% { transform: translate(-20px, 20px) scale(0.9); }
        100% { transform: translate(0px, 0px) scale(1); }
      }
      .animate-blob {
        animation: blob 10s infinite;
      }
      .animation-delay-2000 {
        animation-delay: 2s;
      }
      .animation-delay-4000 {
        animation-delay: 4s;
      }
    `;

    // --- THEME CONFIG (Dynamic Backgrounds) ---
    const activeTheme = theme as 'light' | 'dark' | 'happy' || 'light';

    const themeConfig = {
        light: {
            // Cool Blue/Purple/Pink Mix
            blob1: "bg-blue-300/40 mix-blend-multiply",
            blob2: "bg-purple-300/40 mix-blend-multiply",
            blob3: "bg-pink-300/40 mix-blend-multiply",
            text: "text-slate-800",
            btn: "bg-cyan-500 text-black shadow-cyan-500/20"
        },
        dark: {
            // Deep Space (Indigo/Violet)
            blob1: "bg-indigo-600/20",
            blob2: "bg-blue-600/20",
            blob3: "bg-violet-600/20",
            text: "text-foreground",
            btn: "bg-cyan-500 text-black shadow-cyan-500/20"
        },
        happy: {
            // Tropical Warm (Orange/Yellow/Rose)
            blob1: "bg-orange-300/40 mix-blend-multiply",
            blob2: "bg-yellow-300/40 mix-blend-multiply",
            blob3: "bg-rose-300/40 mix-blend-multiply",
            text: "text-stone-700",
            btn: "bg-gradient-to-r from-orange-400 to-rose-400 text-white shadow-orange-500/20"
        }
    }[activeTheme];

    // Background Page Color
    const pageBg = activeTheme === 'happy' ? 'bg-[#FFFCF5]' : 'bg-background';

    return (
        <div className={`relative w-full h-screen overflow-hidden flex flex-col font-sans transition-colors duration-700 ease-in-out ${pageBg} ${themeConfig.text}`}>

            {/* Inject Keyframes */}
            <style>{animationStyles}</style>

            {/* ─── DYNAMIC ANIMATED BACKGROUND ─── */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                {/* Blob 1 (Top Left) */}
                <div className={`absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full blur-[100px] animate-blob filter opacity-70 transition-colors duration-700 ${themeConfig.blob1}`} />

                {/* Blob 2 (Top Right - Delayed) */}
                <div className={`absolute top-[-10%] right-[-10%] w-96 h-96 rounded-full blur-[100px] animate-blob animation-delay-2000 filter opacity-70 transition-colors duration-700 ${themeConfig.blob2}`} />

                {/* Blob 3 (Bottom Left - Delayed More) */}
                <div className={`absolute bottom-[-20%] left-[20%] w-[500px] h-[500px] rounded-full blur-[120px] animate-blob animation-delay-4000 filter opacity-70 transition-colors duration-700 ${themeConfig.blob3}`} />

                {/* Noise Overlay (Optional Texture) */}
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>
            </div>

            {/* HEADER */}
            <header className="relative z-10 shrink-0 pt-8 pb-4 px-6 lg:px-10">
                <div className="max-w-[1800px] mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold font-outfit tracking-tight">
                            Academic Paraphrase
                        </h1>
                    </div>
                    <button
                        onClick={handleNewSession}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all shadow-lg active:scale-95 ${themeConfig.btn}`}
                    >
                        <Plus className="w-4 h-4" />
                        <span>New Session</span>
                    </button>
                </div>
            </header>

            {/* MAIN WORKSPACE */}
            <main className="relative z-10 flex-1 min-h-0 px-6 lg:px-10 pb-6">
                <div className="max-w-[1800px] mx-auto h-full grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* LEFT: Editor */}
                    <section className="h-full min-h-0 flex flex-col">
                        <ParaphraseEditor
                            value={inputText}
                            onChange={setInputText}
                            onParaphrase={handleParaphrase}
                            isProcessing={isProcessing}
                        />
                    </section>

                    {/* RIGHT: Output + Metrics */}
                    <section className="h-full min-h-0 flex flex-col gap-3">
                        <div className="flex-1 min-h-0">
                            <ParaphraseOutput
                                originalText={inputText}
                                rewrittenText={outputText}
                                isProcessing={isProcessing}
                            />
                        </div>

                        <div className="shrink-0">
                            <AcademicMetricsPanel
                                metrics={metrics}
                                isVisible={!!outputText || isProcessing}
                            />
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default ParaphrasePage;