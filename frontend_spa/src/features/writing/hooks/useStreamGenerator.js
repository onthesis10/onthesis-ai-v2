import { useState, useRef, useCallback } from 'react';
import { useToast } from '../components/UI/ToastProvider';

const DEFAULT_ENDPOINT = '/api/agent/run';
const STREAM_PHASES = {
    IDLE: 'idle',
    PLANNING: 'planning',
    EXECUTING: 'executing',
    REVIEWING: 'reviewing',
    EVALUATING: 'evaluating',
    REVISING: 'revising',
    DONE: 'done',
};

const LEGACY_TASK_PROMPTS = {
    general: 'Buatkan draft akademik yang relevan dengan konteks tesis dan editor saat ini.',
    chat: 'Jawab pertanyaan pengguna berdasarkan konteks tesis saat ini.',
    continue: 'Lanjutkan paragraf akademik berikut dengan tetap konsisten terhadap konteks tesis.',
    improve: 'Perbaiki paragraf berikut agar lebih akademik, koheren, dan rapi.',
    paraphrase: 'Parafrase teks berikut tanpa mengubah makna akademiknya.',
    literature_review: 'Susun literature review untuk Bab 2 berdasarkan konteks tesis dan referensi yang tersedia.',
    bab1_part_ideal: 'Tulis paragraf kondisi ideal pada latar belakang Bab 1.',
    bab1_part_factual: 'Tulis paragraf kondisi faktual pada latar belakang Bab 1.',
    bab1_part_gap: 'Formulasikan research gap yang jelas untuk Bab 1.',
    bab1_part_solution: 'Tulis paragraf solusi atau arah penelitian untuk Bab 1.',
    bab1_rumusan: 'Susun rumusan masalah penelitian yang tajam untuk Bab 1.',
    bab1_tujuan: 'Susun tujuan penelitian yang selaras dengan rumusan masalah.',
    bab2_part_x: 'Jelaskan kajian teori untuk variabel X pada Bab 2.',
    bab2_part_y: 'Jelaskan kajian teori untuk variabel Y pada Bab 2.',
    bab2_part_context: 'Jelaskan konteks penelitian yang relevan untuk Bab 2.',
    bab2_part_relation: 'Jelaskan hubungan antar variabel atau konsep pada Bab 2.',
    bab2_part_framework: 'Susun kerangka pemikiran penelitian untuk Bab 2.',
    bab2_part_hypothesis: 'Susun hipotesis penelitian yang logis untuk Bab 2.',
    bab3_part_approach: 'Jelaskan pendekatan penelitian pada Bab 3.',
    bab3_part_loc: 'Jelaskan lokasi penelitian pada Bab 3.',
    bab3_part_pop: 'Jelaskan populasi dan sampel penelitian pada Bab 3.',
    bab3_part_var: 'Jelaskan definisi variabel penelitian pada Bab 3.',
    bab3_part_inst: 'Jelaskan instrumen penelitian pada Bab 3.',
    bab3_part_val: 'Jelaskan uji validitas dan reliabilitas pada Bab 3.',
    bab3_part_ana: 'Jelaskan teknik analisis data pada Bab 3.',
    bab3_part_proc: 'Jelaskan prosedur penelitian pada Bab 3.',
    bab4_part_descriptive: 'Tulis analisis statistik deskriptif untuk Bab 4.',
    bab4_part_discussion: 'Tulis pembahasan hasil penelitian untuk Bab 4.',
    bab4_part_implication: 'Tulis implikasi hasil penelitian untuk Bab 4.',
    bab4_part_object: 'Jelaskan objek atau temuan utama penelitian pada Bab 4.',
    bab4_part_qualitative: 'Tulis interpretasi hasil kualitatif untuk Bab 4.',
    bab4_part_prerequisite: 'Tulis hasil uji prasyarat analisis untuk Bab 4.',
    bab4_part_hypothesis: 'Tulis hasil uji hipotesis untuk Bab 4.',
    bab5_part_conclusion: 'Tulis kesimpulan penelitian untuk Bab 5.',
    bab5_part_implication: 'Tulis implikasi penelitian untuk Bab 5.',
    bab5_part_suggestion: 'Tulis saran penelitian untuk Bab 5.',
    validate_citations: 'Periksa seluruh sitasi pada draft ini dan jelaskan masalah sitasi yang perlu diperbaiki.',
};

const LEGACY_TASK_CHAPTERS = {
    bab1_part_ideal: 'bab1',
    bab1_part_factual: 'bab1',
    bab1_part_gap: 'bab1',
    bab1_part_solution: 'bab1',
    bab1_rumusan: 'bab1',
    bab1_tujuan: 'bab1',
    bab2_part_x: 'bab2',
    bab2_part_y: 'bab2',
    bab2_part_context: 'bab2',
    bab2_part_relation: 'bab2',
    bab2_part_framework: 'bab2',
    bab2_part_hypothesis: 'bab2',
    bab3_part_approach: 'bab3',
    bab3_part_loc: 'bab3',
    bab3_part_pop: 'bab3',
    bab3_part_var: 'bab3',
    bab3_part_inst: 'bab3',
    bab3_part_val: 'bab3',
    bab3_part_ana: 'bab3',
    bab3_part_proc: 'bab3',
    bab4_part_descriptive: 'bab4',
    bab4_part_discussion: 'bab4',
    bab4_part_implication: 'bab4',
    bab4_part_object: 'bab4',
    bab4_part_qualitative: 'bab4',
    bab4_part_prerequisite: 'bab4',
    bab4_part_hypothesis: 'bab4',
    bab5_part_conclusion: 'bab5',
    bab5_part_implication: 'bab5',
    bab5_part_suggestion: 'bab5',
};

const LEGACY_INLINE_INPUT_TASKS = new Set(['chat', 'continue', 'improve', 'paraphrase']);

const formatReferenceLine = (ref = {}) => {
    const title = ref.title || ref.name || 'Untitled';
    const authors = ref.authors || ref.author || 'Unknown';
    const year = ref.year || 'n.d.';
    return `${authors} (${year}). ${title}`;
};

const buildReferencesText = (references) => {
    if (!Array.isArray(references) || references.length === 0) return '';
    return references
        .slice(0, 12)
        .map((ref, index) => `[${index + 1}] ${formatReferenceLine(ref)}`)
        .join('\n');
};

const buildLegacyTaskPrompt = (payload) => {
    const taskType = payload?.task || 'general';
    const inputText = payload?.input_text || '';
    const title = payload?.context_title || '';
    const problem = payload?.context_problem || '';
    const variableName = payload?.variable_name || '';

    let instruction = LEGACY_TASK_PROMPTS[taskType] || `Bantu tulis bagian tesis untuk ${LEGACY_TASK_CHAPTERS[taskType] || 'project'} berdasarkan konteks proyek saat ini.`;
    if (variableName && (taskType === 'bab2_part_x' || taskType === 'bab2_part_y')) {
        instruction = instruction.replace('variabel X', variableName).replace('variabel Y', variableName);
    }

    const contextLines = [];
    if (title) contextLines.push(`Judul: ${title}`);
    if (problem) contextLines.push(`Masalah: ${problem}`);
    if (inputText) {
        if (LEGACY_INLINE_INPUT_TASKS.has(taskType)) {
            contextLines.push(inputText);
        } else {
            contextLines.push(`Catatan pengguna: ${inputText}`);
        }
    }
    if (payload?.chapter1_problem) contextLines.push(`Rumusan masalah Bab 1:\n${payload.chapter1_problem}`);
    if (payload?.chapter2_summary) contextLines.push(`Ringkasan Bab 2:\n${payload.chapter2_summary}`);
    if (payload?.chapter4_summary) contextLines.push(`Ringkasan Bab 4:\n${payload.chapter4_summary}`);

    if (!contextLines.length) return instruction;
    return `${instruction}\n\n${contextLines.join('\n')}`;
};

const isLegacyGeneratorPayload = (payload) => {
    if (!payload || typeof payload !== 'object' || payload.context) return false;
    const taskType = payload.task || '';
    return Boolean(
        payload.context_title ||
        payload.context_problem ||
        payload.input_text ||
        payload.references ||
        payload.word_count ||
        payload.variable_name ||
        payload.chapter1_problem ||
        payload.chapter2_summary ||
        payload.chapter4_summary ||
        taskType.startsWith('bab')
    );
};

const normalizeAgentPayload = (payload) => {
    if (!isLegacyGeneratorPayload(payload)) {
        return payload || {};
    }

    const referencesRaw = Array.isArray(payload.references) ? payload.references : [];
    const inputText = payload.input_text || '';
    const targetChapter = LEGACY_TASK_CHAPTERS[payload.task] || '';

    return {
        task: buildLegacyTaskPrompt(payload),
        projectId: payload.projectId,
        chapterId: payload.chapterId || '',
        model: payload.model || 'llama-70b',
        mode: payload.mode || 'planning',
        messages: payload.messages || [],
        context: {
            context_title: payload.context_title || '',
            context_problem: payload.context_problem || '',
            context_method: payload.context_method || '',
            context_objectives: payload.context_objectives || '',
            context_hypothesis: payload.context_hypothesis || '',
            context_framework: payload.context_framework || '',
            references_text: buildReferencesText(referencesRaw),
            references_raw: referencesRaw,
            active_paragraphs: inputText ? [{ paraId: 'generator-input', content: inputText }] : [],
            generator_task_type: payload.task || '',
            target_chapter: targetChapter,
            requested_word_count: payload.word_count || '',
            requested_length_mode: payload.length_mode || payload.depth_level || '',
            method_mode: payload.method_mode || '',
            variable_name: payload.variable_name || '',
            chapter1_problem: payload.chapter1_problem || '',
            chapter2_summary: payload.chapter2_summary || '',
            chapter4_summary: payload.chapter4_summary || '',
        }
    };
};

const useStreamGenerator = () => {
    const [streamData, setStreamData] = useState('');
    const [status, setStatus] = useState('idle'); // idle | streaming | error
    const [error, setError] = useState(null);
    const [phase, setPhase] = useState(STREAM_PHASES.IDLE);
    const abortControllerRef = useRef(null);

    // Safety check kalau ToastProvider belum ready
    const toastHook = useToast ? useToast() : { triggerToast: console.log };
    const { triggerToast } = toastHook || { triggerToast: console.log };

    const stop = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setStatus('idle');
            setPhase(STREAM_PHASES.IDLE);
        }
    }, []);

    const handleStreamEvent = useCallback((event) => {
        if (!event || typeof event !== 'object') return false;

        switch (event.type) {
            case 'TEXT_DELTA':
                setStreamData(prev => prev + (event.delta || ''));
                return true;
            case 'STEP':
                setPhase(event.step || STREAM_PHASES.EXECUTING);
                return true;
            case 'ERROR':
                setError(event.message || 'Gagal generate konten');
                setStatus('error');
                setPhase(STREAM_PHASES.IDLE);
                return true;
            case 'DONE':
                setStatus('idle');
                setPhase(STREAM_PHASES.DONE);
                return true;
            case 'TOOL_CALL':
            case 'TOOL_RESULT':
            case 'PENDING_DIFF':
            case 'CITATION_FLAG':
            case 'INCOHERENCE_WARNING':
                return true;
            default:
                return false;
        }
    }, []);

    const generate = useCallback(async (endpointOrPayload, payloadMaybe) => {
        const endpoint = typeof endpointOrPayload === 'string' ? endpointOrPayload : DEFAULT_ENDPOINT;
        const rawPayload = typeof endpointOrPayload === 'string' ? payloadMaybe : endpointOrPayload;
        const payload = endpoint === DEFAULT_ENDPOINT ? normalizeAgentPayload(rawPayload) : (rawPayload || {});

        setStatus('streaming');
        setError(null);
        setStreamData('');
        setPhase(STREAM_PHASES.PLANNING);

        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch(endpoint || DEFAULT_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload || {}),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                let message = 'Gagal generate konten';
                try {
                    const errData = await response.json();
                    message = errData.message || errData.error || message;
                } catch (_) { /* ignore */ }
                throw new Error(message);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let buffer = '';
            let streamFailed = false;

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                const parts = buffer.split('\n\n');
                buffer = parts.pop() || '';

                parts.forEach(part => {
                    const trimmed = part.trim();
                    if (!trimmed) return;

                    const dataLine = trimmed.startsWith('data:') ? trimmed.replace(/^data:\s*/, '') : trimmed;
                    if (!dataLine || dataLine === '[DONE]') return;

                    try {
                        const parsed = JSON.parse(dataLine);
                        if (parsed?.type === 'ERROR') {
                            streamFailed = true;
                        }
                        const wasHandled = handleStreamEvent(parsed);
                        if (!wasHandled) {
                            setStreamData(prev => prev + dataLine);
                        }
                    } catch (_) {
                        setStreamData(prev => prev + dataLine);
                    }
                });
            }

            const finalChunk = buffer.trim();
            if (finalChunk) {
                const dataLine = finalChunk.startsWith('data:') ? finalChunk.replace(/^data:\s*/, '') : finalChunk;
                if (dataLine && dataLine !== '[DONE]') {
                    try {
                        const parsed = JSON.parse(dataLine);
                        if (parsed?.type === 'ERROR') {
                            streamFailed = true;
                        }
                        const wasHandled = handleStreamEvent(parsed);
                        if (!wasHandled) {
                            setStreamData(prev => prev + dataLine);
                        }
                    } catch (_) {
                        setStreamData(prev => prev + dataLine);
                    }
                }
            }

            if (!streamFailed) {
                setStatus('idle');
                setPhase((prev) => (prev === STREAM_PHASES.IDLE ? STREAM_PHASES.IDLE : STREAM_PHASES.DONE));
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                setPhase(STREAM_PHASES.IDLE);
                if (triggerToast) triggerToast('info', 'Generasi dihentikan.');
            } else {
                console.error('Stream Error:', err);
                setError(err.message);
                setStatus('error');
                setPhase(STREAM_PHASES.IDLE);
                if (triggerToast) triggerToast('error', `Error: ${err.message}`);
            }
        } finally {
            abortControllerRef.current = null;
        }
    }, [handleStreamEvent, triggerToast]);

    // --- AUTO-SNAPSHOT: trigger after generation completes ---
    const triggerSnapshot = useCallback(async (projectId, chapterId, sections) => {
        if (!projectId || !chapterId) return;

        // Build sections content from output fields
        const sectionsContent = {};
        Object.keys(sections || {}).forEach(key => {
            if (sections[key]?.output) {
                sectionsContent[key] = sections[key].output;
            }
        });

        // Only trigger if there's substantial content
        const totalLength = Object.values(sectionsContent).join('').length;
        if (totalLength < 100) return;

        try {
            await fetch(`/api/thesis-brain/graph/${projectId}/chapters/${chapterId}/auto-snapshot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sections: sectionsContent })
            });
        } catch (err) {
            console.warn('Snapshot update failed (non-critical):', err.message);
        }
    }, []);

    // Backward compatibility surface for existing components
    const generatedContent = streamData;
    const isGenerating = status === 'streaming';
    const generateStream = generate;
    const stopGeneration = stop;

    return {
        // new API
        streamData,
        status,
        error,
        phase,
        generate,
        stop,
        // legacy aliases
        generatedContent,
        isGenerating,
        generateStream,
        stopGeneration,
        triggerSnapshot
    };
};

// Support Named Import
export { useStreamGenerator };
export { STREAM_PHASES };
// Support Default Import
export default useStreamGenerator;
