// ─── ContextBuilder — Rich Context for AI Calls ───
// Principle: "Context is King" — every AI call MUST carry full context.
// Assembles project metadata, chapters, golden thread, active paragraph, and references.

/**
 * Build a compact references string for AI context.
 * @param {Array} references
 * @returns {string}
 */
function buildReferencesText(references = []) {
    if (!Array.isArray(references) || references.length === 0) return '';
    return references
        .slice(0, 25) // Cap to avoid token overflow
        .map(
            (ref, idx) =>
                `[${idx + 1}] ${ref.title || ref.citation || ref.id || 'Referensi'} — ${ref.author || ref.authors || ''} (${ref.year || ''})`
        )
        .join('\n');
}

/**
 * Build all-chapters summary for cross-chapter awareness.
 * Sprint 2: Prefers per-chapter AI summaries from chapterSummaries map.
 * @param {Array} chapters - [{id, title, wordCount, aiSummary}]
 * @param {Object} chapterSummaries - { chapterId: summaryString } from Sprint 2
 * @returns {Array<{id, title, summary, wordCount}>}
 */
function buildChaptersSummary(chapters = [], chapterSummaries = {}) {
    return chapters.map((ch) => ({
        id: ch.id,
        title: ch.title,
        summary: chapterSummaries[ch.id] || ch.aiSummary || ch.summary || 'Belum dirangkum',
        wordCount: ch.wordCount || 0,
    }));
}

// ─── Cache Management ───
const _contextCache = new Map();
const CACHE_TTL_MS = 30_000; // 30 seconds

function resolveScopeIds({ project, projectId, activeChapterId, chapterId }) {
    const resolvedProjectId = projectId || project?.id || null;
    const resolvedChapterId = chapterId || activeChapterId || null;
    return { resolvedProjectId, resolvedChapterId };
}

function getCacheKey({ project, projectId, activeChapterId, chapterId }) {
    const { resolvedProjectId, resolvedChapterId } = resolveScopeIds({
        project,
        projectId,
        activeChapterId,
        chapterId,
    });

    if (!resolvedProjectId || !resolvedChapterId) {
        console.warn(
            '[ContextBuilder] Missing projectId/chapterId while building context. Skipping cache.',
            { projectId: resolvedProjectId, chapterId: resolvedChapterId }
        );
        return null;
    }

    return `ctx:${resolvedProjectId}:${resolvedChapterId}`;
}

function getCachedContext(cacheKey) {
    if (!cacheKey) return null;

    const cached = _contextCache.get(cacheKey);
    if (!cached) return null;

    if ((Date.now() - cached.timestamp) >= CACHE_TTL_MS) {
        _contextCache.delete(cacheKey);
        return null;
    }

    return cached.context;
}

function setCachedContext(cacheKey, context) {
    if (!cacheKey) return;
    _contextCache.set(cacheKey, {
        context,
        timestamp: Date.now(),
    });
}

function invalidateCache(scope = null) {
    if (!scope) {
        _contextCache.clear();
        return;
    }

    const cacheKey = getCacheKey(scope);
    if (!cacheKey) return;
    _contextCache.delete(cacheKey);
}

/**
 * Build the full rich context for any AI call.
 * Implements TTL cache (30s) to avoid rebuilding on every call.
 * 
 * Sprint 2: 3-Layer Memory Model
 *   LONG-TERM (Firestore) → WORKING (chapterSummaries ~100 tok/ch) → ACTIVE (in-prompt)
 *   Token budget: project (~200) + summaries (~500) + active chapter (~4000)
 *                 + references (~400) + tool schemas (~800) + system (~500) = ~6400
 *
 * @param {Object} params
 * @param {Object} params.project - Project metadata from ProjectContext
 * @param {Array}  params.chapters - Chapter list [{id, title, ...}]
 * @param {string} params.activeChapterId - Currently active chapter ID
 * @param {string} params.chapterHtml - HTML content of active chapter
 * @param {Array}  params.references - Reference list
 * @param {string} params.selectionHtml - Currently selected text
 * @param {Object} params.activeNodeContext - From editorRef.getActiveNodeContext()
 * @param {Object} params.goldenThread - Golden thread object
 * @param {Object} params.chapterSummaries - Sprint 2: {chapterId: summaryString}
 * @param {Object} params.editorRef - Sprint 2: ref with getParagraphsWithIds()
 * @param {boolean} params.forceRefresh - Bypass cache
 * @returns {Object} Full context payload for AI
 */
export function buildFullContext({
    project,
    projectId,
    chapters = [],
    activeChapterId,
    chapterId,
    chapterHtml,
    references = [],
    selectionHtml = '',
    activeNodeContext = null,
    goldenThread = null,
    chapterSummaries = {},  // Sprint 2
    editorRef = null,        // Sprint 2
    forceRefresh = false,
}) {
    const { resolvedProjectId, resolvedChapterId } = resolveScopeIds({
        project,
        projectId,
        activeChapterId,
        chapterId,
    });
    const cacheKey = getCacheKey({
        project,
        projectId: resolvedProjectId,
        activeChapterId,
        chapterId: resolvedChapterId,
    });

    // Check cache (unless forced)
    const cachedContext = !forceRefresh ? getCachedContext(cacheKey) : null;
    if (cachedContext) {
        // Update only the fast-changing fields
        return {
            ...cachedContext,
            selection_html: selectionHtml,
            active_node: activeNodeContext,
            chapter_html: chapterHtml,
            timestamp: new Date().toISOString(),
        };
    }

    const meta = project || {};

    // Sprint 2: Get active paragraphs with stable IDs (from Sprint 1)
    const activeParagraphs = editorRef?.current?.getParagraphsWithIds?.() || [];

    const ctx = {
        // ── Project Metadata (~200 tokens) ──
        projectId: resolvedProjectId,
        context_title: meta.title || '',
        context_problem: meta.problem_statement || '',
        context_objectives: meta.research_objectives || '',
        context_significance: meta.significance || '',
        context_framework: meta.theoretical_framework || '',
        context_method: meta.methodology || '',
        context_variables: meta.variables_indicators || meta.variables || '',
        context_population: meta.population_sample || '',
        context_analysis: meta.data_analysis || '',

        // ── Golden Thread (Research Coherence) ──
        golden_thread: goldenThread || meta.golden_thread || {
            researchQuestion: meta.problem_statement || '',
            hypothesis: meta.theoretical_framework || '',
            methodology: meta.methodology || '',
            findings: '',
            conclusion: '',
        },

        // ── Chapters Summary (~100 tok/chapter — NOT full text) ──
        chapters_summary: buildChaptersSummary(chapters, chapterSummaries),
        active_chapter_id: resolvedChapterId,

        // ── Active Chapter Content (full — ~4000 tokens) ──
        chapter_html: chapterHtml || '',
        selection_html: selectionHtml || '',

        // ── Sprint 2: Active Paragraphs with Stable IDs ──
        active_paragraphs: activeParagraphs,

        // ── Active Node Context (paragraph-level) ──
        active_node: activeNodeContext,

        // ── References (~400 tokens — top 10) ──
        references_text: buildReferencesText(references),
        references_count: references?.length || 0,

        // ── Meta ──
        timestamp: new Date().toISOString(),
    };

    // Save to cache
    setCachedContext(cacheKey, ctx);

    return ctx;
}

/**
 * Backward-compatible alias for existing code.
 * Wraps buildFullContext with the old parameter names.
 */
export function buildAIContext({
    project,
    projectId,
    chapterHtml,
    references,
    selectionHtml,
    goldenThread,
    chapters,
    activeChapterId,
    chapterId,
    activeNodeContext,
}) {
    return buildFullContext({
        project,
        projectId,
        chapters,
        activeChapterId,
        chapterId,
        chapterHtml,
        references,
        selectionHtml,
        activeNodeContext,
        goldenThread,
    });
}

// Expose cache invalidation for use on save/chapter-change
export { invalidateCache };

export default { buildFullContext, buildAIContext, invalidateCache };
