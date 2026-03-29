// ─── Phase 3.3: Voice Scorer — Client-side Academic Voice Analysis ───
// Zero API calls for basic scoring. Uses regex + wordlists for Indonesian.
// Returns overall score 0-100 + per-category breakdown.

// ── Indonesian Informal/Colloquial Wordlist ──
const INFORMAL_WORDS = new Set([
    // Common informal words
    'kayaknya', 'kayanya', 'aja', 'cuma', 'banget', 'bgt', 'nih',
    'sih', 'dong', 'deh', 'kek', 'gitu', 'gini', 'gimana',
    'nggak', 'gak', 'ga', 'ngga', 'enggak', 'tak', 'gpp',
    'udah', 'udh', 'dah', 'uda', 'trus', 'terus', 'abis',
    'bisa', 'emang', 'emng', 'bener', 'bener-bener',
    'pengen', 'pingin', 'mau', 'tau', 'tahu',
    'ngomong', 'ngomongin', 'nyari', 'nanya', 'nyoba',
    'dll', 'dsb', 'dst', 'yg', 'dgn', 'utk', 'krn', 'krna',
    'jd', 'jdi', 'tp', 'tpi', 'sbg', 'spy', 'stlh',
    'kayak', 'kyk', 'bkn', 'blm', 'sdh', 'lg', 'sm',
    // Chat-style
    'hehe', 'wkwk', 'lol', 'btw', 'fyi', 'asap',
    'literally', 'basically', 'guys',
    // Informal verbs
    'ngeliat', 'ngerjain', 'bikin', 'kerjain', 'ngerti',
    'ngelakuin', 'nyebutin', 'ngasih', 'nemuin',
]);

// ── Hedging Words (Indonesian) ──
const HEDGING_WORDS = [
    'mungkin', 'sepertinya', 'tampaknya', 'agaknya', 'barangkali',
    'kiranya', 'seolah-olah', 'seakan-akan', 'kelihatannya',
    'cenderung', 'relatif', 'kemungkinan', 'diperkirakan',
    'diduga', 'diasumsikan', 'dimungkinkan',
    'may', 'might', 'could', 'perhaps', 'possibly', 'likely',
    'tend to', 'appear to', 'seem to', 'suggest',
];

// ── Passive Voice Indonesian Indicators ──
const PASSIVE_INDICATORS = [
    /\bdi\w+kan\b/gi,   // digunakan, dilakukan, dianalisis
    /\bdi\w+i\b/gi,     // dipelajari, diteliti
    /\bter\w+\b/gi,     // terlihat, terbukti, terdapat
    /\bse\w+nya\b/gi,   // seharusnya, sebaiknya
];

/**
 * Score academic voice quality of a text.
 * All client-side, zero API calls.
 * 
 * @param {string} text - The text to analyze
 * @returns {{ overall, passive, hedging, formality, colloquial, details }}
 */
export function scoreVoice(text) {
    if (!text || text.length < 20) {
        return {
            overall: 0, passive: 0, hedging: 0, formality: 0, colloquial: 0,
            details: { passiveCount: 0, hedgingCount: 0, informalCount: 0, sentenceCount: 0 }
        };
    }

    // Clean HTML tags
    const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = cleanText.split(/\s+/);
    const wordCount = words.length;
    const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 5);
    const sentenceCount = Math.max(sentences.length, 1);

    // ── 1. Passive Voice Score ──
    let passiveCount = 0;
    for (const pattern of PASSIVE_INDICATORS) {
        const matches = cleanText.match(pattern);
        passiveCount += matches ? matches.length : 0;
    }
    const passiveRatio = passiveCount / sentenceCount;
    // Ideal: 30-60% passive in academic Indonesian → score 80-100
    // Too much passive (>80%) or too little (<10%) → lower score
    let passiveScore;
    if (passiveRatio >= 0.3 && passiveRatio <= 0.6) {
        passiveScore = 90 + Math.round((0.6 - Math.abs(passiveRatio - 0.45)) * 50);
    } else if (passiveRatio > 0.6) {
        passiveScore = Math.max(40, 90 - Math.round((passiveRatio - 0.6) * 200));
    } else {
        passiveScore = Math.max(50, 60 + Math.round(passiveRatio * 100));
    }
    passiveScore = Math.min(100, Math.max(0, passiveScore));

    // ── 2. Hedging Score ──
    let hedgingCount = 0;
    const lowerText = cleanText.toLowerCase();
    for (const word of HEDGING_WORDS) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = lowerText.match(regex);
        hedgingCount += matches ? matches.length : 0;
    }
    const hedgingRatio = hedgingCount / sentenceCount;
    // Ideal: some hedging (0.1-0.3 per sentence) → good academic caution
    let hedgingScore;
    if (hedgingRatio >= 0.05 && hedgingRatio <= 0.3) {
        hedgingScore = 85 + Math.round((0.3 - Math.abs(hedgingRatio - 0.15)) * 80);
    } else if (hedgingRatio > 0.3) {
        hedgingScore = Math.max(30, 85 - Math.round((hedgingRatio - 0.3) * 200));
    } else {
        hedgingScore = Math.max(50, 70 + Math.round(hedgingRatio * 300));
    }
    hedgingScore = Math.min(100, Math.max(0, hedgingScore));

    // ── 3. Colloquial Score (higher = fewer informal words) ──
    let informalCount = 0;
    for (const word of words) {
        if (INFORMAL_WORDS.has(word.toLowerCase())) {
            informalCount++;
        }
    }
    const informalRatio = informalCount / wordCount;
    const colloquialScore = Math.min(100, Math.max(0, Math.round((1 - informalRatio * 10) * 100)));

    // ── 4. Formality Score ──
    // Based on: sentence length, word complexity, and structure
    let formalityScore = 70; // baseline

    // Long sentences (avg > 15 words) = more formal
    const avgSentenceLen = wordCount / sentenceCount;
    if (avgSentenceLen >= 15 && avgSentenceLen <= 30) {
        formalityScore += 15;
    } else if (avgSentenceLen > 30) {
        formalityScore += 5; // too long = slightly less clear
    }

    // Presence of academic markers
    const academicMarkers = [
        'berdasarkan', 'menunjukkan', 'disimpulkan', 'diperoleh',
        'menganalisis', 'mengevaluasi', 'mengidentifikasi',
        'signifikan', 'korelasi', 'variabel', 'hipotesis',
        'sampel', 'populasi', 'instrumen', 'reliabilitas',
        'validitas', 'metodologi', 'sistematik', 'empiris',
        'furthermore', 'moreover', 'consequently', 'therefore',
        'thus', 'hence', 'accordingly', 'nevertheless',
    ];
    let academicCount = 0;
    for (const marker of academicMarkers) {
        if (lowerText.includes(marker)) academicCount++;
    }
    formalityScore += Math.min(15, academicCount * 3);

    // Deduct for informal
    formalityScore -= informalCount * 5;
    formalityScore = Math.min(100, Math.max(0, formalityScore));

    // ── Overall Score ──
    const overall = Math.round(
        passiveScore * 0.2 +
        hedgingScore * 0.2 +
        formalityScore * 0.35 +
        colloquialScore * 0.25
    );

    return {
        overall: Math.min(100, Math.max(0, overall)),
        passive: passiveScore,
        hedging: hedgingScore,
        formality: formalityScore,
        colloquial: colloquialScore,
        details: {
            passiveCount,
            hedgingCount,
            informalCount,
            sentenceCount,
            wordCount,
            avgSentenceLen: Math.round(avgSentenceLen),
        },
    };
}
