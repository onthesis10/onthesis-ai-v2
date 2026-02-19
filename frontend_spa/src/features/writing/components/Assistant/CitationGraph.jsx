// FILE: src/components/Assistant/CitationGraph.jsx

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Maximize2, Minimize2, Info, MousePointer2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';
import * as d3 from 'd3-force'; 

export default function CitationGraph({ references = [], theme: propTheme }) {
    const { theme: contextTheme } = useTheme(); 
    const currentTheme = propTheme || contextTheme;

    const graphRef = useRef();
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ w: 400, h: 300 });
    const [highlightNodes, setHighlightNodes] = useState(new Set());
    const [highlightLinks, setHighlightLinks] = useState(new Set());
    const [hoverNode, setHoverNode] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);

    // ==========================================
    // 0. OCEAN BLUE THEME CONFIG 🌊
    // ==========================================
    const themeConfig = useMemo(() => ({
        // Background: Putih Bersih atau Hitam Elegan
        bg: currentTheme === 'dark' ? '#171515' : '#FFFFFF', 

        // Node Paper: Stroke/Border
        nodePaperStroke: currentTheme === 'dark' ? '#1E293B' : '#CBD5E1', 
        
        // Topic Node: Pusat Cluster
        nodeTopicFill: currentTheme === 'dark' ? '#F8FAFC' : '#0F172A',
        
        // Links
        linkDefault: currentTheme === 'dark' ? '#334155' : '#E2E8F0', 
        linkHighlight: currentTheme === 'dark' ? '#38BDF8' : '#0284C7', 
        
        // Labels
        labelBg: currentTheme === 'dark' ? '#020617' : '#FFFFFF',
        labelText: currentTheme === 'dark' ? '#F0F9FF' : '#171515',
        labelBorder: currentTheme === 'dark' ? '#1E293B' : '#E0F2FE',
        
        // OCEAN PALETTE
        palette: [
            '#0EA5E9', '#2563EB', '#06B6D4', '#3B82F6', '#0891B2', '#6366F1'
        ]
    }), [currentTheme]);

    // ==========================================
    // 1. DATA PROCESSOR
    // ==========================================
    const graphData = useMemo(() => {
        if (!references || references.length === 0) return { nodes: [], links: [] };

        const nodes = [];
        const links = [];
        const topics = {};
        
        const sortedRefs = [...references].sort((a, b) => (a.year || 0) - (b.year || 0));

        sortedRefs.forEach((ref, idx) => {
            const refId = `ref-${idx}`;
            
            // PAPER NODE
            nodes.push({
                id: refId,
                name: ref.title,
                author: ref.author,
                year: ref.year,
                val: ref.year ? (ref.year - 2000) * 0.5 + 5 : 5, 
                type: 'paper',
                colorIndex: idx % themeConfig.palette.length 
            });

            // TOPIC CLUSTERING
            const words = ref.title
                .toLowerCase()
                .replace(/[^\w\s]/gi, '')
                .split(' ')
                .filter(w => w.length > 5 && !['analysis', 'method', 'study', 'research', 'using', 'system'].includes(w))
                .slice(0, 1);

            words.forEach((word) => {
                const topicId = `topic-${word}`;
                if (!topics[word]) {
                    topics[word] = { 
                        id: topicId, name: word.toUpperCase(), 
                        val: 12, // Induk lebih besar
                        type: 'topic'
                    };
                    nodes.push(topics[word]);
                }
                links.push({ source: refId, target: topicId });
            });
            
            if (idx > 0) {
                 links.push({ source: `ref-${idx}`, target: `ref-${idx-1}` });
            }
        });

        return { nodes, links };
    }, [references]); 

    // ==========================================
    // 2. RESIZE HANDLER
    // ==========================================
    useEffect(() => {
        const updateSize = () => {
            if (isExpanded) {
                setDimensions({ w: window.innerWidth, h: window.innerHeight });
            } else if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                setDimensions({ w: width, h: height });
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [isExpanded]);

    // ==========================================
    // 3. PHYSICS (SPIDER WEB LOGIC) 🕸️
    // ==========================================
    useEffect(() => {
        if (graphRef.current) {
            // --- INI BAGIAN PENTING YANG DIUBAH BRO ---
            
            // A. CHARGE (Tolak Menolak Dinamis)
            // Topik (-1500) sangat benci tetangga, jadi dia lari ke ujung.
            // Paper (-100) biasa aja, jadi nurut ditarik Topik.
            graphRef.current.d3Force('charge').strength(node => node.type === 'topic' ? -1500 : -100); 
            
            // B. LINK DISTANCE (Panjang Tali Dinamis)
            // Tali Topik <-> Paper = Panjang (120px) biar ngebentuk jari-jari jaring.
            // Tali Paper <-> Paper = Pendek (40px) biar ngebentuk simpul rapat.
            graphRef.current.d3Force('link').distance(link => {
                const isTopicLink = link.source.type === 'topic' || link.target.type === 'topic';
                return isTopicLink ? 120 : 40;
            });

            // C. COLLIDE (Ruang Lega)
            // Kasih padding +15 biar gak dempet.
            graphRef.current.d3Force('collide', d3.forceCollide(node => node.val + 15).strength(0.6));
            
            // D. CENTER (Lemah)
            // Biar grafik bebas menyebar luas
            graphRef.current.d3Force('center').strength(0.02); 

            // E. Reheat
            graphRef.current.d3ReheatSimulation();
        }
    }, [graphData, isExpanded]); 

    // ==========================================
    // 4. INTERACTION
    // ==========================================
    const handleNodeHover = useCallback((node) => {
        if ((!node && !hoverNode) || (node && hoverNode && node.id === hoverNode.id)) return;

        const newHighlights = new Set();
        const newLinkHighlights = new Set();

        if (node) {
            newHighlights.add(node);
            graphData.links.forEach(link => {
                if (link.source.id === node.id || link.target.id === node.id) {
                    newLinkHighlights.add(link);
                    newHighlights.add(link.source);
                    newHighlights.add(link.target);
                }
            });
        }
        setHoverNode(node || null);
        setHighlightNodes(newHighlights);
        setHighlightLinks(newLinkHighlights);
    }, [graphData, hoverNode]);

    // ==========================================
    // 5. RENDERER (OCEAN STYLE + BREATHING)
    // ==========================================
    const paintNode = useCallback((node, ctx, globalScale) => {
        const isHover = node === hoverNode;
        const isNeighbor = highlightNodes.has(node);
        const isDimmed = hoverNode && !isHover && !isNeighbor;

        // Colors
        const fillColor = node.type === 'topic' 
            ? themeConfig.nodeTopicFill 
            : themeConfig.palette[node.colorIndex];
        
        const strokeColor = node.type === 'topic' 
            ? 'transparent' 
            : themeConfig.nodePaperStroke;

        // Breathing Animation
        const time = Date.now();
        const pulse = (Math.sin(time / 600) + 1) / 2;
        const baseSize = node.val; 
        const animatedSize = isHover ? baseSize * 1.3 : baseSize + (node.type === 'topic' ? pulse * 2 : 0);
        
        // Draw Ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, animatedSize + (isHover ? 2 : 1.2), 0, 2 * Math.PI, false);
        ctx.fillStyle = isDimmed ? (currentTheme === 'dark' ? '#1E293B' : '#F1F5F9') : strokeColor;
        ctx.fill();

        // Draw Inner Circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, animatedSize, 0, 2 * Math.PI, false);
        ctx.fillStyle = isDimmed ? (currentTheme === 'dark' ? '#171515' : '#FFFFFF') : fillColor;
        ctx.fill();

        // Ocean Glow
        if (!isDimmed) {
            ctx.shadowColor = themeConfig.linkHighlight;
            ctx.shadowBlur = isHover ? 25 : (10 * pulse);
            ctx.stroke(); 
            ctx.shadowBlur = 0;
        }

        // Label
        const shouldShowLabel = isHover || (isNeighbor && globalScale > 1.5) || node.type === 'topic';

        if (shouldShowLabel && !isDimmed) {
            const label = node.name.length > 20 && !isHover ? node.name.substring(0, 18) + '..' : node.name;
            const fontSize = isHover ? 12/globalScale : 10/globalScale;
            
            ctx.font = `600 ${Math.max(fontSize, 3)}px "Inter", sans-serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth + (8/globalScale), fontSize + (5/globalScale)]; 
            const xPos = node.x; 
            const yPos = node.y - animatedSize - (5/globalScale);

            ctx.fillStyle = themeConfig.labelBg;
            ctx.strokeStyle = themeConfig.labelBorder;
            ctx.lineWidth = 0.8 / globalScale;
            
            ctx.beginPath();
            ctx.roundRect(xPos - bckgDimensions[0]/2, yPos - bckgDimensions[1], bckgDimensions[0], bckgDimensions[1], 3/globalScale);
            ctx.fill();
            ctx.stroke();

            // Panah
            ctx.beginPath();
            ctx.moveTo(xPos, yPos);
            ctx.lineTo(xPos - 3/globalScale, yPos - 3/globalScale);
            ctx.lineTo(xPos + 3/globalScale, yPos - 3/globalScale);
            ctx.fill();

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = themeConfig.labelText;
            ctx.fillText(label, xPos, yPos - bckgDimensions[1]/2);
            
            if (node.year && node.type === 'paper' && globalScale > 1.8) {
                ctx.fillStyle = '#FFFFFF';
                ctx.font = `bold ${Math.max(fontSize * 0.9, 2)}px sans-serif`;
                ctx.fillText(node.year, node.x, node.y);
            }
        }
    }, [hoverNode, highlightNodes, themeConfig, currentTheme]);

    if (references.length === 0) {
        return (
            <div className={`h-full flex flex-col items-center justify-center border border-dashed rounded-xl opacity-50 ${currentTheme === 'dark' ? 'border-slate-800 bg-[#0F172A]/50 text-slate-500' : 'border-slate-300 bg-slate-50 text-slate-400'}`}>
                <Info size={24} className="mb-2 opacity-50"/>
                <p className="text-xs">No references found.</p>
            </div>
        );
    }

    const GraphCanvas = (
        <ForceGraph2D
            ref={graphRef}
            width={dimensions.w}
            height={dimensions.h}
            graphData={graphData}
            backgroundColor={themeConfig.bg}
            
            // Link Style
            linkColor={link => highlightLinks.has(link) ? themeConfig.linkHighlight : themeConfig.linkDefault}
            linkWidth={link => highlightLinks.has(link) ? 2 : 1}
            linkDirectionalParticles={2} 
            linkDirectionalParticleWidth={1.5}
            linkDirectionalParticleSpeed={0.003}
            
            // Render
            nodeLabel="" 
            nodeCanvasObject={paintNode}
            
            // Interaction
            onNodeHover={handleNodeHover}
            onNodeClick={node => {
                graphRef.current.centerAt(node.x, node.y, 800);
                graphRef.current.zoom(4, 800);
            }}
            
            // Stabilizer
            d3AlphaDecay={0.05} 
            d3VelocityDecay={0.4} 
            cooldownTicks={150}
        />
    );

    if (isExpanded) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171515]/90 backdrop-blur-md animate-in fade-in duration-200">
                <div className={`relative w-[95vw] h-[95vh] rounded-xl overflow-hidden shadow-2xl border ${currentTheme === 'dark' ? 'bg-[#171515] border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/10 backdrop-blur-md border border-slate-500/20">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Citation Ocean View</span>
                    </div>
                    <div className="absolute top-4 right-4 z-20">
                        <button 
                            onClick={() => setIsExpanded(false)}
                            className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-200 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-lg hover:scale-110"
                        >
                            <Minimize2 size={20} />
                        </button>
                    </div>
                    {GraphCanvas}
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="w-full h-full relative group overflow-hidden">
            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button 
                    onClick={() => setIsExpanded(true)} 
                    className={`p-1.5 rounded-md border shadow-sm transition-colors ${currentTheme === 'dark' ? 'bg-[#1E293B] text-slate-400 hover:text-white border-white/10 hover:bg-[#0EA5E9]' : 'bg-white text-slate-500 hover:text-blue-600 border-slate-200 hover:bg-blue-50'}`}
                >
                    <Maximize2 size={14}/>
                </button>
            </div>
            
            {GraphCanvas}

            <div className="absolute bottom-2 left-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                 <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border backdrop-blur-sm text-[9px] ${currentTheme === 'dark' ? 'bg-black/40 border-white/10 text-slate-400' : 'bg-white/80 border-black/5 text-slate-600'}`}>
                    <MousePointer2 size={10}/> Interactive
                 </div>
            </div>
        </div>
    );
}