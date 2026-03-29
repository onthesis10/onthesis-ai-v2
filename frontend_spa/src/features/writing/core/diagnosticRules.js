// ─── Diagnostic Rules — Client-side Academic Writing Linter ───
// No API needed. Rules run entirely in the browser for instant feedback.

/**
 * @typedef {Object} Diagnostic
 * @property {string} type - Rule ID
 * @property {'error'|'warning'|'info'} severity
 * @property {string} message - Human-readable explanation
 * @property {number} paragraphIndex - Index of the paragraph in the document
 * @property {string} excerpt - The offending text snippet
 * @property {string} [quickFixLabel] - Optional quick-fix button label
 */

// ── Informal words (Bahasa Indonesia) ──
const INFORMAL_WORDS = [
    'kayak', 'kayaknya', 'banget', 'emang', 'gak', 'nggak', 'udah', 'udahan',
    'gimana', 'gitu', 'aja', 'doang', 'cuma', 'sih', 'dong', 'deh', 'nih',
    'bgt', 'yg', 'dgn', 'krn', 'tdk', 'blm', 'sdh', 'dr', 'dlm', 'utk',
    'jd', 'bs', 'hrs', 'tsb', 'dll', 'dsb', 'dkk', 'sbg', 'pd', 'thd',
    'kalo', 'soalnya', 'pokoknya', 'trus', 'terus', 'So', 'btw', 'fyi',
];

const INFORMAL_REGEX = new RegExp(
    `\\b(${INFORMAL_WORDS.join('|')})\\b`,
    'gi'
);

// ── Claim indicators (should have citation nearby) ──
const CLAIM_PATTERNS = [
    /menunjukkan bahwa/gi,
    /terbukti bahwa/gi,
    /berdasarkan penelitian/gi,
    /menurut .{3,30},/gi,
    /hasil penelitian/gi,
    /data menunjukkan/gi,
    /studi menunjukkan/gi,
    /telah dibuktikan/gi,
    /ditemukan bahwa/gi,
    /membuktikan bahwa/gi,
];

// ── Citation patterns to detect nearby citations ──
const CITATION_PATTERNS = [
    /\([^)]*\d{4}[^)]*\)/g,         // (Author, 2024)
    /\[\d+\]/g,                       // [1], [2,3]
    /\((?:dalam|in)\s+[^)]+\)/gi,    // (dalam Author, 2024)
];

/**
 * Check if a sentence has a citation nearby.
 */
function hasCitationNearby(sentence) {
    return CITATION_PATTERNS.some((p) => p.test(sentence));
}

/**
 * Split text into sentences (basic Indonesian/English splitter).
 */
function splitSentences(text) {
    return text
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}

/**
 * Run all diagnostic rules on a list of paragraphs.
 * @param {Array<{index: number, text: string}>} paragraphs
 * @returns {Diagnostic[]}
 */
export function runDiagnostics(paragraphs) {
    const diagnostics = [];

    paragraphs.forEach(({ index, text }) => {
        if (!text || text.trim().length < 10) return;

        const sentences = splitSentences(text);

        sentences.forEach((sentence) => {
            const wordCount = sentence.trim().split(/\s+/).length;

            // ── Rule 1: Sentence too long (>40 words) ──
            if (wordCount > 40) {
                diagnostics.push({
                    type: 'SENTENCE_TOO_LONG',
                    severity: 'warning',
                    message: `Kalimat terlalu panjang (${wordCount} kata). Idealnya < 25 kata untuk clarity akademik.`,
                    paragraphIndex: index,
                    excerpt: sentence.slice(0, 80) + '...',
                    quickFixLabel: 'Pecah kalimat dengan AI',
                });
            }

            // ── Rule 2: Informal language ──
            const informalMatch = sentence.match(INFORMAL_REGEX);
            if (informalMatch) {
                diagnostics.push({
                    type: 'INFORMAL_LANGUAGE',
                    severity: 'error',
                    message: `Bahasa informal terdeteksi: "${informalMatch[0]}". Gunakan bahasa formal akademik.`,
                    paragraphIndex: index,
                    excerpt: sentence.slice(0, 80),
                    quickFixLabel: 'Formalkan dengan AI',
                });
            }

            // ── Rule 3: Uncited claim ──
            const hasClaim = CLAIM_PATTERNS.some((p) => p.test(sentence));
            if (hasClaim && !hasCitationNearby(sentence)) {
                diagnostics.push({
                    type: 'UNCITED_CLAIM',
                    severity: 'warning',
                    message: 'Klaim akademik tanpa sitasi. Tambahkan referensi untuk mendukung pernyataan ini.',
                    paragraphIndex: index,
                    excerpt: sentence.slice(0, 80),
                    quickFixLabel: 'Sisipkan sitasi',
                });
            }
        });

        // ── Rule 4: Passive voice overuse (3+ consecutive passive sentences) ──
        const passivePattern = /\b(di\w+kan|ter\w+)\b/gi;
        let consecutivePassive = 0;
        sentences.forEach((sentence) => {
            const passiveMatches = sentence.match(passivePattern);
            if (passiveMatches && passiveMatches.length >= 2) {
                consecutivePassive++;
            } else {
                consecutivePassive = 0;
            }
            if (consecutivePassive >= 3) {
                diagnostics.push({
                    type: 'PASSIVE_OVERUSE',
                    severity: 'info',
                    message: '3+ kalimat pasif berturut-turut. Variasikan dengan kalimat aktif untuk readability.',
                    paragraphIndex: index,
                    excerpt: sentence.slice(0, 80),
                });
                consecutivePassive = 0;
            }
        });
    });

    // ── Rule 5: Duplicate Arguments (cross-paragraph) ──
    // Detect repeated key phrases (3+ word n-grams) across paragraphs
    if (paragraphs.length >= 2 && paragraphs.length <= 200) {
        const phraseMap = new Map(); // phrase → [paragraphIndex, ...]

        paragraphs.forEach(({ index, text }) => {
            if (!text || text.trim().length < 20) return;

            const words = text.toLowerCase().replace(/[^a-zA-Z\u00C0-\u024F\u1E00-\u1EFF ]/g, ' ').split(/\s+/).filter(w => w.length > 3);

            // Extract 4-word n-grams  
            for (let i = 0; i <= words.length - 4; i++) {
                const ngram = words.slice(i, i + 4).join(' ');
                if (ngram.length < 15) continue; // Skip very short ngrams

                if (!phraseMap.has(ngram)) {
                    phraseMap.set(ngram, new Set());
                }
                phraseMap.get(ngram).add(index);
            }
        });

        // Flag n-grams that appear in 2+ different paragraphs
        const flagged = new Set(); // Avoid duplicate reports per paragraph
        phraseMap.forEach((indices, phrase) => {
            if (indices.size >= 2) {
                const indexArr = Array.from(indices);
                // Only report on second occurrence onwards
                for (let i = 1; i < indexArr.length; i++) {
                    const pIdx = indexArr[i];
                    const key = `${pIdx}-duplicate`;
                    if (flagged.has(key)) continue;
                    flagged.add(key);

                    diagnostics.push({
                        type: 'DUPLICATE_ARGUMENT',
                        severity: 'info',
                        message: `Argumen serupa ditemukan di paragraf lain: "${phrase}". Variasikan penyampaian.`,
                        paragraphIndex: pIdx,
                        excerpt: phrase,
                        quickFixLabel: 'Parafrase dengan AI',
                    });
                }
            }
        });
    }

    return diagnostics;
}

export default { runDiagnostics };

