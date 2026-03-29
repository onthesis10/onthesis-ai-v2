// frontend_spa/src/features/paraphrase/utils/metrics.ts

/**
 * Calculates Jaccard Similarity (word-level overlap) between original and rewritten text.
 * Returns a percentage 0-100 indicating how similar the rewritten text is to the original.
 * Lower means it was restructured/rewritten more significantly.
 */
export function calculateSimilarity(original: string, rewritten: string): number {
    if (!original.trim() || !rewritten.trim()) return 0;

    const tokenize = (text: string) => text.toLowerCase().match(/\b\w+\b/g) || [];

    const origTokens = tokenize(original);
    const rewritTokens = tokenize(rewritten);

    if (origTokens.length < 2 || rewritTokens.length < 2) {
        const origSet = new Set(origTokens);
        let intersection = 0;
        for (const token of rewritTokens) {
            if (origSet.has(token)) intersection++;
        }
        return Math.round((intersection / Math.max(origTokens.length, rewritTokens.length)) * 100) || 0;
    }

    const getBigrams = (tokens: string[]) => {
        const bigrams = [];
        for (let i = 0; i < tokens.length - 1; i++) {
            bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
        }
        return bigrams;
    };

    const origBigrams = getBigrams(origTokens);
    const rewritBigrams = getBigrams(rewritTokens);

    let intersection = 0;
    const rewritCopy = [...rewritBigrams];

    for (const bigram of origBigrams) {
        const idx = rewritCopy.indexOf(bigram);
        if (idx !== -1) {
            intersection++;
            rewritCopy.splice(idx, 1);
        }
    }

    return Math.round((intersection / origBigrams.length) * 100);
}

/**
 * Basic Syllable Counter for Flesch Reading Ease algorithm
 */
function countSyllables(word: string): number {
    word = word.toLowerCase();
    const match = word.match(/[aiueo]/gi);
    return match ? match.length : 1;
}

/**
 * Calculates Flesch Reading Ease Score (0-100).
 * Higher score = easier to read. Lower = more complex (academic).
 */
export function calculateReadability(text: string): number {
    if (!text.trim()) return 0;

    const sentences = text.split(/[.!?]+/).filter(Boolean).length || 1;
    const wordsMatch = text.match(/\b\w+\b/g);
    const words = wordsMatch ? wordsMatch.length : 1;

    if (!wordsMatch) return 0;

    let syllables = 0;
    for (const word of wordsMatch) {
        syllables += countSyllables(word);
    }

    // Flesch Reading Ease Formula - Calibrated for Indonesian (Lower syllable weight from 45.0 -> 25.0)
    // Indonesian words inherently have more vowels/syllables per word compared to English.
    const score = 206.835 - (1.015 * (words / sentences)) - (25.0 * (syllables / words));

    // Clamp to 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Determine Tone based on user selected style
 */
export function determineTone(style: string): string {
    const toneMap: Record<string, string> = {
        'academic': 'Objective',
        'academic_kritis': 'Critical',
        'anti_plagiarisme': 'Neutral',
        'filosofis': 'Conceptual',
        'deskriptif': 'Factual',
        'persuasif': 'Persuasive',
        'eksak': 'Logical',
        'puitis': 'Aesthetic',
        'jurnalistis': 'Popular',
        'formal': 'Professional',
        'simple': 'Accessible',
        'creative': 'Imaginative'
    };
    return toneMap[style] || 'Objective';
}

/**
 * Checks for citation integrity between original and rewritten text.
 * Finds inline citations like (Name, Year) or [1], checks if rewritten contains them.
 */
export function checkCitations(original: string, rewritten: string): 'N/A' | 'Protected' | 'Warning' | 'Failed' {
    if (!original.trim()) return 'N/A';

    // Regex for APA (Smith, 2020), (Smith & Doe, 2020), (Smith et al., 2020)
    // Regex for IEEE [1], [1, 2]
    const citationRegex = /(\([A-Za-z\s&.,]+,\s\d{4}[a-z]?\))|(\[[0-9,\s\-]+\])/g;

    const originalCitations = original.match(citationRegex) || [];

    if (originalCitations.length === 0) {
        return 'N/A';
    }

    let kept = 0;
    for (const citation of originalCitations) {
        if (rewritten.includes(citation)) {
            kept++;
        }
    }

    if (kept === originalCitations.length) {
        return 'Protected';
    } else if (kept > 0) {
        return 'Warning';
    } else {
        return 'Failed';
    }
}
